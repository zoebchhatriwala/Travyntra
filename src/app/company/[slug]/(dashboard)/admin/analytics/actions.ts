
"use server";

import { prisma } from "@/lib/prisma";
import { format, subMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Money } from "@/types/finance/money";
import { EmployeeSpendStats, RequestSpendStats } from "@/types/analytics";

import { convertCurrency } from "@/lib/services/currency";

export async function getBudgetAnalytics(slug: string) {
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, currency: true, timezone: true }
    });

    if (!company) throw new Error("Company not found");

    // Default to UTC if no timezone is configured for the company
    const timeZone = company.timezone || "UTC";
    const now = new Date();

    // Convert current server time (UTC) to Company's Local Time.
    const zonedEndDate = toZonedTime(now, timeZone);

    // Calculate the UTC start date for database query
    const queryStartDate = subMonths(new Date(), 13);
    const targetCurrency = company.currency || "USD";

    // 1. Fetch Invoices Grouped by Currency for Total Spend
    // We group by currency so we can convert each bucket's sum to the company currency
    const invoicesGrouped = await prisma.invoice.groupBy({
        by: ['status', 'currency'],
        where: {
            companyId: company.id,
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: queryStartDate }
        },
        _sum: {
            amount: true
        }
    });

    let totalSpend = 0;
    for (const group of invoicesGrouped) {
        if (!group._sum.amount) continue;
        const amount = Number(group._sum.amount);
        const converted = await convertCurrency(amount, group.currency, targetCurrency);
        totalSpend += converted;
    }

    // 2. Fetch Monthly Spend Trend (Detailed Invoices)
    const monthlyInvoices = await prisma.invoice.findMany({
        where: {
            companyId: company.id,
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: queryStartDate }
        },
        select: {
            amount: true,
            createdAt: true,
            status: true,
            currency: true
        }
    });

    // 3. Fetch Trip Requests
    const requests = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: { not: 'DRAFT' },
            createdAt: { gte: queryStartDate }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                }
            },
            invoice: {
                select: { amount: true, currency: true, status: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // 4. Initialize Chart Data Intervals
    const monthlyData = new Map<string, { month: string; actual: number; budget: number }>();
    for (let i = 0; i < 12; i++) {
        const d = subMonths(zonedEndDate, i);
        const key = format(d, 'yyyy-MM');
        monthlyData.set(key, {
            month: format(d, 'MMM yyyy'),
            actual: 0,
            budget: 0
        });
    }

    // 5. Process Invoices (Actual Spend Trend)
    // We process these in parallel for currency conversion
    await Promise.all(monthlyInvoices.map(async (inv) => {
        const zonedDate = toZonedTime(inv.createdAt, timeZone);
        const key = format(zonedDate, 'yyyy-MM');
        if (monthlyData.has(key)) {
            const entry = monthlyData.get(key)!;
            const amount = Number(inv.amount);
            const converted = await convertCurrency(amount, inv.currency, targetCurrency);
            entry.actual += converted;
        }
    }));

    // 6. Process Requests (Breakdowns & Budget Trend)
    const employeeMap = new Map<string, EmployeeSpendStats>();

    // Process requests in parallel
    const requestBreakdown: RequestSpendStats[] = await Promise.all(requests.map(async (req) => {
        // --- Calculate Actual Spend for this request ---
        let actualSpend = 0;
        if (req.invoice && ['PAID', 'PENDING'].includes(req.invoice.status)) {
            const parsed = Number(req.invoice.amount);
            actualSpend = await convertCurrency(parsed, req.invoice.currency, targetCurrency);
        }

        // --- Calculate Budget Amount ---
        let budgetAmount = 0;
        if (req.budget) {
            const b = req.budget as unknown as Money;
            if (b && typeof b.amount === 'number') {
                const multiplier = b.multiplier || 100;
                const rawVal = b.amount / multiplier;
                // Budget currency might differ from company currency
                budgetAmount = await convertCurrency(rawVal, b.currencyCode, targetCurrency);
            }
        }

        // --- Fill Monthly Budget Chart ---
        const zonedDate = toZonedTime(req.createdAt, timeZone);
        const key = format(zonedDate, 'yyyy-MM');
        if (monthlyData.has(key)) {
            const entry = monthlyData.get(key)!;
            entry.budget += budgetAmount;
        }

        // --- Aggregate Employee Stats (Side Effect) ---
        const userId = req.user.id;
        if (!employeeMap.has(userId)) {
            employeeMap.set(userId, {
                id: userId,
                name: req.user.name || "Unknown User",
                email: req.user.email,
                avatarUrl: req.user.avatarUrl,
                tripCount: 0,
                totalSpend: 0,
                avgCost: 0
            });
        }
        const emp = employeeMap.get(userId)!;
        emp.tripCount += 1;
        emp.totalSpend += actualSpend;

        return {
            id: req.id,
            title: req.title || "Untitled Trip",
            userName: req.user.name || "Unknown User",
            userAvatar: req.user.avatarUrl,
            date: req.createdAt,
            status: req.status,
            budget: budgetAmount,
            actual: actualSpend,
            variance: budgetAmount > 0 ? ((actualSpend - budgetAmount) / budgetAmount) * 100 : 0
        };
    }));

    // Finalize Employee Stats
    const employeeBreakdown = Array.from(employeeMap.values())
        .map(e => ({
            ...e,
            avgCost: e.tripCount > 0 ? e.totalSpend / e.tripCount : 0
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

    const chartData = Array.from(monthlyData.values()).reverse();

    // Average Trip Cost (based on converted total spend)
    const completedTripsCount = requests.filter((r) => r.status === 'COMPLETED' || r.status === 'BOOKED').length;
    const avgTripCost = completedTripsCount > 0 ? totalSpend / completedTripsCount : 0;

    return {
        currency: targetCurrency,
        totalSpend,
        avgTripCost,
        chartData,
        employeeBreakdown,
        requestBreakdown: requestBreakdown.slice(0, 50)
    };
}
