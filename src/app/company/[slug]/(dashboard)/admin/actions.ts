"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, ApprovalStatus, RequestStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function getCompanyDashboardStats(slug: string, userId?: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.companySlug !== slug)) {
        throw new Error("Unauthorized");
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            plan: true,
            currency: true,
            _count: {
                select: {
                    users: true,
                    requests: true,
                }
            }
        }
    });

    if (!company) return null;

    const pendingStaff = await prisma.user.count({
        where: {
            companyId: company.id,
            isActive: false
        }
    });

    const activeRequests = await prisma.tripRequest.count({
        where: {
            companyId: company.id,
            status: {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED', 'DRAFT']
            }
        }
    });

    // Count pending trip approvals for the CURRENT user
    let pendingApprovalsCount = 0;
    if (userId) {
        pendingApprovalsCount = await prisma.requestApprovalStep.count({
            where: {
                status: ApprovalStatus.PENDING,
                step: {
                    approvers: {
                        some: { id: userId }
                    }
                }
            }
        });
    }

    const totalSpend = await prisma.tripRequest.aggregate({
        where: {
            companyId: company.id,
            status: 'COMPLETED'
        },
        _sum: {
            budget: true
        }
    });

    const recentRequests = await prisma.tripRequest.findMany({
        where: { companyId: company.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { name: true, email: true, avatarUrl: true }
            }
        }
    });

    return {
        companyName: company.name,
        companyPlan: company.plan,
        currency: company.currency || "USD",
        totalStaff: company._count.users,
        pendingStaff,
        activeRequests,
        pendingApprovalsCount,
        totalSpend: Number(totalSpend._sum.budget || 0),
        recentRequests: recentRequests.map(req => ({
            id: req.id,
            title: req.title,
            userName: req.user.name || req.user.email || "Unknown",
            userAvatar: req.user.avatarUrl,
            status: req.status,
            createdAt: req.createdAt,
            budget: Number(req.budget || 0)
        }))
    };
}


interface Location {
    city?: string;
    formatted?: string;
}

export async function getCompanyRequests(slug: string, options: {
    page?: number;
    limit?: number;
    query?: string;
    status?: string | string[];
    startDate?: Date;
    endDate?: Date;
}) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.companySlug !== slug)) {
        throw new Error("Unauthorized");
    }

    const { page = 1, limit = 10, query, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, currency: true }
    });

    if (!company) return { requests: [], total: 0, totalPages: 0, currency: "USD" };

    const where: Prisma.TripRequestWhereInput = {
        companyId: company.id,
    };

    if (query) {
        where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } },
            { user: { email: { contains: query, mode: 'insensitive' } } },
        ];
    }

    if (status) {
        if (Array.isArray(status)) {
            where.status = { in: status as RequestStatus[] }; // Status is string[] but prisma expects RequestStatus[]
        } else if (status !== 'ALL') {
            where.status = status as RequestStatus;
        }
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [total, requests] = await prisma.$transaction([
        prisma.tripRequest.count({ where }),
        prisma.tripRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true, avatarUrl: true }
                }
            }
        })
    ]);

    return {
        requests: requests.map(req => ({
            id: req.id,
            title: req.title,
            userName: req.user.name || req.user.email || "Unknown",
            userAvatar: req.user.avatarUrl,
            status: req.status,
            createdAt: req.createdAt,
            budget: Number(req.budget || 0),
            destination: (req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown",
            startDate: req.startDate,
            endDate: req.endDate
        })),
        total,
        totalPages: Math.ceil(total / limit),
        currency: company.currency || "USD"
    };
}

export async function bulkProcessRequests(ids: string[], action: 'APPROVE' | 'REJECT', comment?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    try {
        // Multi-tenant check: ensure all IDs belong to the user's company
        if (session.user.role !== "SUPER_ADMIN") {
            const requestCount = await prisma.tripRequest.count({
                where: {
                    id: { in: ids },
                    companyId: session.user.companyId as string
                }
            });

            if (requestCount !== ids.length) {
                throw new Error("Unauthorized: Some requests do not belong to your company");
            }
        }

        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const approvalStatus = action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

        // 1. Update TripRequests
        await prisma.tripRequest.updateMany({
            where: { id: { in: ids } },
            data: { status }
        });

        // 2. Update all pending approval steps for these requests
        await prisma.requestApprovalStep.updateMany({
            where: {
                requestId: { in: ids },
                status: ApprovalStatus.PENDING
            },
            data: { status: approvalStatus }
        });

        // 3. Create Activity Logs & Notifications (Iterative for detailed logging)
        const requests = await prisma.tripRequest.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, userId: true, companyId: true }
        });

        const logs = requests.map(req => ({
            companyId: req.companyId,
            actorId: session.user.id,
            action: action === 'APPROVE' ? 'ADMIN_BULK_APPROVE' : 'ADMIN_BULK_REJECT',
            description: `Admin ${action.toLowerCase()}d request "${req.title}" via bulk action`,
            metadata: { comment }
        }));

        await prisma.activityLog.createMany({ data: logs });

        // 4. Notifications
        for (const req of requests) {
            await createNotification({
                userId: req.userId,
                title: action === 'APPROVE' ? "Request Approved" : "Request Rejected",
                message: `An administrator has ${action.toLowerCase()}d your request "${req.title}"`,
                type: action === 'APPROVE' ? "SUCCESS" : "ERROR",
            });
        }

        const company = await prisma.company.findFirst({
            where: { id: requests[0]?.companyId },
            select: { slug: true }
        });

        if (company) {
            revalidatePath(`/company/${company.slug}/admin/requests`);
        }

        return { count: ids.length };
    } catch (error) {
        console.error("[BULK_PROCESS_ERROR]", error);
        throw new Error("Failed to process requests");
    }
}


export async function getCompanyAnalytics(slug: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.companySlug !== slug)) {
        throw new Error("Unauthorized");
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, currency: true }
    });

    if (!company) return null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Avg. Approval Time (Difference between createdAt and final status change)
    const requestsWithTime = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: { in: ['COMPLETED', 'REJECTED', 'APPROVED'] }
        },
        select: {
            createdAt: true,
            updatedAt: true
        }
    });

    let avgApprovalTimeDays = 0;
    if (requestsWithTime.length > 0) {
        const totalDurationMs = requestsWithTime.reduce((acc, req) => {
            return acc + (req.updatedAt.getTime() - req.createdAt.getTime());
        }, 0);
        // Minimum 0.1 days to avoid 0.0
        avgApprovalTimeDays = Math.max(0.1, (totalDurationMs / requestsWithTime.length) / (1000 * 60 * 60 * 24));
    }

    // 2. Total Budget (MTD)
    const mtdBudget = await prisma.tripRequest.aggregate({
        where: {
            companyId: company.id,
            createdAt: { gte: startOfMonth },
            status: { not: 'CANCELLED' }
        },
        _sum: {
            budget: true
        }
    });

    // 3. Policy Violations (Placeholder: requests where budget > 5000)
    const violations = await prisma.tripRequest.count({
        where: {
            companyId: company.id,
            budget: { gt: 5000 }
        }
    });

    // 4. Budget trends (by month)
    const budgetByMonth: { month: string; total: number | bigint }[] = await prisma.$queryRaw`
        SELECT 
            TO_CHAR("createdAt", 'Mon YYYY') as month,
            SUM(budget) as total
        FROM "TripRequest"
        WHERE "companyId" = ${company.id} AND status = 'COMPLETED'
        GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
        LIMIT 6
    `;

    // 5. Top destinations
    const topDestinationsRaw: { name: string; count: bigint }[] = await prisma.$queryRaw`
        SELECT destination->>'city' as name, COUNT(*) as count
        FROM "TripRequest"
        WHERE "companyId" = ${company.id}
        GROUP BY destination->>'city'
        ORDER BY count DESC
        LIMIT 5
    `;

    const topDestinations = topDestinationsRaw.map(d => ({
        name: d.name || "Unknown",
        count: Number(d.count)
    }));

    return {
        avgApprovalTime: avgApprovalTimeDays.toFixed(1),
        mtdBudget: Number(mtdBudget._sum.budget || 0).toLocaleString(),
        violations,
        budgetByMonth,
        topDestinations: topDestinations.map(d => ({
            name: d.name,
            count: d.count
        })),
        currency: company.currency || "USD"
    };
}

export async function exportCompanyRequests(slug: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.companySlug !== slug)) {
        throw new Error("Unauthorized");
    }

    if (session.user.role === 'EMPLOYEE') {
        throw new Error("Unauthorized");
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true }
    });

    if (!company) throw new Error("Company not found");

    const requests = await prisma.tripRequest.findMany({
        where: { companyId: company.id },
        include: {
            user: {
                select: { name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Generate CSV
    const headers = ["ID", "Title", "Requester", "Email", "Destination", "Status", "Budget", "Created At"];
    const rows = requests.map(req => [
        req.id,
        req.title,
        req.user.name || "Unknown",
        req.user.email,
        (req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown",
        req.status,
        req.budget?.toString() || "0",
        req.createdAt.toISOString()
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell ? cell.toString().replace(/"/g, '""') : ""}"`).join(","))
    ].join("\n");

    return {
        csv: csvContent,
        filename: `requests_export_${slug}_${new Date().toISOString().split('T')[0]}.csv`
    };
}
