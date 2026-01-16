"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { parseMoney, moneyToDecimal, createMoney } from "@/lib/utils/money";
import { convertMoney } from "@/lib/services/currency";

export async function getAnalyticsData() {
    try {
        const [
            totalRequests,
            statusDistribution,
            companyCount,
            agentCount,
            employeeCount,
            allBudgets,
            monthlyRequests,
            allExpenses
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

            // Financials (Trip Budgets)
            prisma.tripRequest.findMany({
                select: { budget: true }
            }),

            // Monthly volume
            prisma.$queryRaw<{ month: string, count: bigint }[]>`
                SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*) as count 
                FROM "TripRequest" 
                GROUP BY month 
                ORDER BY MIN("createdAt")
            `,

            // All Expenses for category breakdown
            prisma.expense.findMany({
                select: { amount: true, currency: true, category: true }
            })
        ]);

        // Aggregate category spending with currency conversion
        const categoryGroups: Record<string, number> = {};
        for (const exp of allExpenses) {
            // Expenses are Decimals, but we need Money for convertMoney
            const expenseMoney = createMoney(Number(exp.amount), exp.currency);
            const converted = await convertMoney(expenseMoney, "USD");
            const decimal = moneyToDecimal(converted);
            categoryGroups[exp.category] = (categoryGroups[exp.category] || 0) + decimal;
        }

        let totalBudgetUSD = 0;
        for (const req of allBudgets) {
            const money = parseMoney(req.budget);
            if (money) {
                const converted = await convertMoney(money, "USD");
                totalBudgetUSD += moneyToDecimal(converted);
            } else if (typeof req.budget === 'number') {
                totalBudgetUSD += req.budget;
            }
        }

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
                totalBudget: totalBudgetUSD
            },
            monthlyRequests: monthlyRequests.map(m => ({
                month: m.month,
                count: Number(m.count)
            })),
            categorySpending: Object.entries(categoryGroups).map(([category, amount]) => ({
                category,
                amount
            }))
        };
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return null;
    }
}
