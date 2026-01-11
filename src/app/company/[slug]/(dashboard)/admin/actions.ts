"use server";

import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function getCompanyDashboardStats(slug: string, userId?: string) {
    const company = await prisma.company.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            plan: true,
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


export async function getCompanyRequests(slug: string, options: {
    page?: number;
    limit?: number;
    query?: string;
    status?: string | string[];
    startDate?: Date;
    endDate?: Date;
}) {
    const { page = 1, limit = 10, query, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true }
    });

    if (!company) return { requests: [], total: 0, totalPages: 0 };

    const where: any = {
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
            where.status = { in: status };
        } else if (status !== 'ALL') {
            where.status = status;
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
            destination: req.destination,
            startDate: req.startDate,
            endDate: req.endDate
        })),
        total,
        totalPages: Math.ceil(total / limit)
    };
}

export async function bulkProcessRequests(ids: string[], action: 'APPROVE' | 'REJECT', comment?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
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
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true }
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
    const budgetByMonth = await prisma.$queryRaw`
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
    const topDestinations = await prisma.tripRequest.groupBy({
        by: ['destination'],
        where: { companyId: company.id },
        _count: {
            id: true
        },
        orderBy: {
            _count: {
                id: 'desc'
            }
        },
        take: 5
    });

    return {
        avgApprovalTime: avgApprovalTimeDays.toFixed(1),
        mtdBudget: Number(mtdBudget._sum.budget || 0).toLocaleString(),
        violations,
        budgetByMonth: budgetByMonth as any[],
        topDestinations: topDestinations.map(d => ({
            name: d.destination,
            count: d._count.id
        }))
    };
}

export async function exportCompanyRequests(slug: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role === 'EMPLOYEE') {
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
        req.destination,
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
