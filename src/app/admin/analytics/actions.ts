"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function getAnalyticsData() {
    try {
        const [
            totalRequests,
            statusDistribution,
            companyCount,
            agentCount,
            employeeCount,
            totalBudgetResult,
            monthlyRequests,
            categorySpending
        ] = await Promise.all([
            // Total volume
            prisma.tripRequest.count(),

            // Requests by status
            prisma.tripRequest.groupBy({
                by: ['status'],
                _count: { _all: true }
            }),

            // User growth
            prisma.company.count(),
            prisma.user.count({ where: { role: UserRole.TRAVEL_AGENT, isActive: true } }),
            prisma.user.count({ where: { role: UserRole.EMPLOYEE, isActive: true } }),

            // Financials
            prisma.tripRequest.aggregate({
                _sum: { budget: true }
            }),

            // Monthly volume (simplified for now as prisma doesn't support grouping by date part easily without raw queries in some versions, but we'll use a mocked trend or raw if needed)
            prisma.$queryRaw<{ month: string, count: bigint }[]>`
                SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*) as count 
                FROM "TripRequest" 
                GROUP BY month 
                ORDER BY MIN("createdAt")
            `,

            // Spending by category
            prisma.expense.groupBy({
                by: ['category'],
                _sum: { amount: true }
            })
        ]);

        return {
            totalRequests,
            statusDistribution: statusDistribution.map(d => ({
                status: d.status,
                count: d._count._all
            })),
            stats: {
                companies: companyCount,
                agents: agentCount,
                employees: employeeCount,
                totalBudget: Number(totalBudgetResult._sum.budget || 0)
            },
            monthlyRequests: monthlyRequests.map(m => ({
                month: m.month,
                count: Number(m.count)
            })),
            categorySpending: categorySpending.map(s => ({
                category: s.category,
                amount: Number(s._sum.amount || 0)
            }))
        };
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return null;
    }
}
