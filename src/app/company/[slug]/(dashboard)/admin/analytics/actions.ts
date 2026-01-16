
"use server";

import { prisma } from "@/lib/prisma";
import { format, subMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";

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
    // This ensures that "This Month" refers to the month in the Company's timezone,
    // protecting against month-end cutoff issues (e.g. 1st Jan UTC is still 31st Dec EST).
    const zonedEndDate = toZonedTime(now, timeZone);
    // const zonedStartDate = subMonths(startOfMonth(zonedEndDate), 11); // Last 12 months in company time

    // Calculate the UTC start date for database query (approximation to ensure we cover enough range)
    // We can just use the startDate (Date object) as it represents a timestamp effectively for Prisma
    // But to be precise for "last 12 months in this timezone", we should query sufficiently wide range.
    // Using a simple 13 months ago UTC is safe enough to fetch data, then filter/group in JS.
    const queryStartDate = subMonths(new Date(), 13);

    // 1. Fetch Invoices (Actual Spend)
    const invoices = await prisma.invoice.groupBy({
        by: ['status'],
        where: {
            companyId: company.id,
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: queryStartDate }
        },
        _sum: {
            amount: true
        }
    });

    const totalSpend = invoices.reduce((acc: number, curr: { _sum: { amount: unknown } }) => acc + (Number(curr._sum.amount) || 0), 0);

    // 2. Fetch Monthly Spend Trend
    // improved aggregation for charting
    const monthlyInvoices = await prisma.invoice.findMany({
        where: {
            companyId: company.id,
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: queryStartDate }
        },
        select: {
            amount: true,
            createdAt: true,
            status: true
        }
    });

    // 3. Fetch Trip Requests (Estimated Budget)
    const requests = await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: { not: 'DRAFT' },
            createdAt: { gte: queryStartDate }
        },
        select: {
            budget: true,
            createdAt: true,
            status: true
        }
    });

    // Process data for charts
    const monthlyData = new Map<string, { month: string; actual: number; budget: number }>();

    // Initialize all months
    for (let i = 0; i < 12; i++) {
        const d = subMonths(zonedEndDate, i);
        const key = format(d, 'yyyy-MM');
        monthlyData.set(key, {
            month: format(d, 'MMM yyyy'),
            actual: 0,
            budget: 0
        });
    }

    // Fill Actual Spend
    monthlyInvoices.forEach((inv: { createdAt: Date, amount: unknown }) => {
        // Convert the record's UTC creation time to Company Local Time
        // so it falls into the correct monthly bucket (e.g. Dec vs Jan)
        const zonedDate = toZonedTime(inv.createdAt, timeZone);
        const key = format(zonedDate, 'yyyy-MM');
        if (monthlyData.has(key)) {
            const entry = monthlyData.get(key)!;
            entry.actual += Number(inv.amount);
        }
    });

    // Fill Estimated Budget
    // Need to parse Json budget
    interface Money {
        amount: number;
        currencyCode: string;
        multiplier?: number;
    }

    requests.forEach((req: { budget: unknown, createdAt: Date }) => {
        if (!req.budget) return;
        // Same logic: Convert Request UTC time to Company Local Time
        const zonedDate = toZonedTime(req.createdAt, timeZone);
        const key = format(zonedDate, 'yyyy-MM');
        if (monthlyData.has(key)) {
            const entry = monthlyData.get(key)!;
            // Best effort extraction - assuming base currency or ignore conversion for now as spec mentions Use USD as pivot but that's complex without FX rates
            // For now assume same currency or raw sum as per early phase
            const budgetData = req.budget as unknown as Money;
            if (budgetData && typeof budgetData.amount === 'number') {
                const multiplier = budgetData.multiplier || 100;
                entry.budget += (budgetData.amount / multiplier);
            }
        }
    });

    const chartData = Array.from(monthlyData.values()).reverse();

    // 4. Calculate Average Trip Cost
    const completedTripsCount = requests.filter((r: { status: string }) => r.status === 'COMPLETED' || r.status === 'BOOKED').length;
    // Use total spend for average calculation
    const avgTripCost = completedTripsCount > 0 ? totalSpend / completedTripsCount : 0;

    return {
        currency: company.currency,
        totalSpend,
        avgTripCost,
        chartData
    };
}
