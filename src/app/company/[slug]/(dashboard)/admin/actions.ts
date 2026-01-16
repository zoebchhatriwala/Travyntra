"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, ApprovalStatus, RequestStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { parseMoney, moneyToDecimal } from "@/lib/utils/money";
import { convertMoney } from "@/lib/services/currency";
import { formatStatus } from "@/lib/utils";

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

    // Fetch completed requests and sum their budgets manually (can't use aggregate on JSON fields)
    const completedRequests = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: 'COMPLETED'
        },
        select: {
            budget: true
        }
    });

    const targetCurrency = company.currency || "USD";
    const spendResults = await Promise.all(completedRequests.map(async (req) => {
        if (req.budget) {
            const money = parseMoney(req.budget);
            if (money) {
                const converted = await convertMoney(money, targetCurrency);
                return moneyToDecimal(converted);
            }
        }
        return 0;
    }));
    const totalSpend = spendResults.reduce((sum, val) => sum + val, 0);

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
        totalSpend: totalSpend,
        recentRequests: recentRequests.map(req => {
            const money = req.budget ? parseMoney(req.budget) : null;
            const budgetValue = money ? moneyToDecimal(money) : 0;
            return {
                id: req.id,
                title: req.title,
                userName: req.user.name || req.user.email || "Unknown",
                userAvatar: req.user.avatarUrl,
                status: req.status,
                createdAt: req.createdAt,
                budget: budgetValue,
                currency: money?.currencyCode || company.currency || "USD"
            };
        })
    };
}


import { type LocationDisplay as Location } from "@/types/common/location";

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
        requests: requests.map(req => {
            const money = req.budget ? parseMoney(req.budget) : null;
            const budgetValue = money ? moneyToDecimal(money) : 0;
            return {
                id: req.id,
                title: req.title,
                userName: req.user.name || req.user.email || "Unknown",
                userAvatar: req.user.avatarUrl,
                status: req.status,
                createdAt: req.createdAt,
                budget: budgetValue,
                cost: req.cost ? moneyToDecimal(parseMoney(req.cost)) : null,
                currency: (req.cost ? parseMoney(req.cost)?.currencyCode : money?.currencyCode) || company?.currency || "USD",
                destination: (req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown",
                startDate: req.startDate,
                endDate: req.endDate
            };
        }),
        total,
        totalPages: Math.ceil(total / limit),
        currency: company.currency || "USD"
    };
}

/**
 * Bulk process requests with quick approval/rejection.
 * This bypasses the normal approval workflow and creates discussion entries.
 * 
 * @param ids - Array of request IDs to process
 * @param action - Action to perform (APPROVE or REJECT)
 * @param comment - Optional comment explaining the quick action
 * @returns Count of processed requests
 */
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

        const status: RequestStatus = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
        const approvalStatus: ApprovalStatus = action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

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
            description: `Admin ${action.toLowerCase()}'d request "${req.title}" via quick action (approval workflow bypassed)`,
            metadata: { comment, quickAction: true }
        }));

        await prisma.activityLog.createMany({ data: logs });

        // 4. Create Discussion Entries for each request
        const actionVerb = action === 'APPROVE' ? 'approved' : 'rejected';
        const systemMessage = `🚀 **Quick ${action === 'APPROVE' ? 'Approval' : 'Rejection'}** by ${session.user.name || 'Administrator'}\n\n` +
            `⚠️ **Notice:** This action bypassed the normal approval workflow.\n\n` +
            (comment ? `**Reason:** ${comment}` : `No additional comments provided.`);

        const messages = requests.map(req => ({
            requestId: req.id,
            senderId: session.user.id!,
            content: systemMessage
        }));

        await prisma.message.createMany({ data: messages });

        // 5. Notifications
        for (const req of requests) {
            await createNotification({
                userId: req.userId,
                title: action === 'APPROVE' ? "Request Approved (Quick Action)" : "Request Rejected (Quick Action)",
                message: `An administrator has ${actionVerb} your request "${req.title}" via quick action, bypassing the approval workflow.`,
                type: action === 'APPROVE' ? "SUCCESS" : "ERROR",
                sendEmail: true
            });
        }

        const company = await prisma.company.findFirst({
            where: { id: requests[0]?.companyId },
            select: { slug: true }
        });

        if (company) {
            revalidatePath(`/company/${company.slug}/admin/requests`);
            revalidatePath(`/company/${company.slug}/dashboard/requests`);
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
        select: { id: true, currency: true, policyThreshold: true }
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

    // 2. Total Budget (MTD) - Sum up all Money objects
    const mtdRequests = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            createdAt: { gte: startOfMonth },
            status: { not: 'CANCELLED' }
        },
        select: {
            budget: true,
            cost: true
        }
    });

    const targetCurrency = company.currency || "USD";
    const mtdResults = await Promise.all(mtdRequests.map(async (req) => {
        if (req.budget) {
            const money = parseMoney(req.budget);
            if (money) {
                const converted = await convertMoney(money, targetCurrency);
                return moneyToDecimal(converted);
            }
        }
        return 0;
    }));
    const mtdBudget = mtdResults.reduce((sum, val) => sum + val, 0);

    // Calculate MTD Cost
    const mtdCostResults = await Promise.all(mtdRequests.map(async (req) => {
        if (req.cost) {
            const money = parseMoney(req.cost);
            if (money) {
                // Cost should already be in company currency, but safe to convert if ever needed
                const converted = await convertMoney(money, targetCurrency);
                return moneyToDecimal(converted);
            }
        }
        return 0;
    }));
    const mtdCost = mtdCostResults.reduce((sum, val) => sum + val, 0);


    // 3. Policy Violations (based on company threshold)
    const thresholdMoney = parseMoney(company.policyThreshold);
    const thresholdUSD = thresholdMoney ? moneyToDecimal(await convertMoney(thresholdMoney, "USD")) : 5000;

    const allRequestsSummary = await prisma.tripRequest.findMany({
        where: { companyId: company.id },
        select: { budget: true }
    });

    const violationsResults = await Promise.all(allRequestsSummary.map(async (req) => {
        if (!req.budget) return false;
        const money = parseMoney(req.budget);
        if (!money) return (typeof req.budget === 'number' ? req.budget : 0) > thresholdUSD;

        // Always check normalization against USD for consistent policy enforcement
        const converted = await convertMoney(money, "USD");
        return moneyToDecimal(converted) > thresholdUSD;
    }));
    const violations = violationsResults.filter(Boolean).length;

    // 4. Budget trends (by month) with currency conversion
    const requestsForTrends = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: 'COMPLETED',
            createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
        },
        select: {
            budget: true,
            createdAt: true
        }
    });

    const monthlyGroups: Record<string, number> = {};
    const trendResults = await Promise.all(requestsForTrends.map(async (req) => {
        const money = parseMoney(req.budget);
        if (money) {
            const converted = await convertMoney(money, targetCurrency);
            return {
                monthYear: new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                amount: moneyToDecimal(converted)
            };
        }
        return null;
    }));

    trendResults.forEach(res => {
        if (res) {
            monthlyGroups[res.monthYear] = (monthlyGroups[res.monthYear] || 0) + res.amount;
        }
    });

    const budgetByMonth = Object.entries(monthlyGroups)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

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
        mtdBudget: mtdBudget,
        mtdCost: mtdCost,
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
    const headers = ["ID", "Title", "Requester", "Email", "Destination", "Status", "Budget", "Cost", "Created At"];
    const rows = requests.map(req => [
        req.id,
        req.title,
        req.user.name || "Unknown",
        req.user.email,
        (req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown",
        formatStatus(req.status),
        req.budget ? moneyToDecimal(parseMoney(req.budget)) : "0",
        req.cost ? moneyToDecimal(parseMoney(req.cost)) : "0",
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

export async function getExportData(slug: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.companySlug !== slug)) {
        throw new Error("Unauthorized");
    }

    if (session.user.role === 'EMPLOYEE') {
        throw new Error("Unauthorized");
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, currency: true }
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

    return requests.map(req => [
        req.id,
        req.title,
        req.user.name || "Unknown",
        req.user.email,
        (req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown",
        formatStatus(req.status),
        req.budget ? moneyToDecimal(parseMoney(req.budget)) : "0",
        req.cost ? moneyToDecimal(parseMoney(req.cost)) : "0",
        req.createdAt.toLocaleDateString()
    ]);
}
