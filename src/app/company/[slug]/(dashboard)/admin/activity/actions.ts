"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export type ActivityLogFilter = {
    days?: number;
    type?: string;
    search?: string;
};

export async function getCompanyActivities(slug: string, filter?: ActivityLogFilter) {
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, timezone: true }
    });

    if (!company) {
        throw new Error("Company not found");
    }

    const where: Prisma.ActivityLogWhereInput = {
        companyId: company.id,
    };

    if (filter?.days) {
        const timeZone = company.timezone || 'UTC';
        // Calculate cutoff: Start of day, N days ago, in Company Time
        const nowZoned = toZonedTime(new Date(), timeZone);
        const cutoffZoned = startOfDay(subDays(nowZoned, filter.days));
        const cutoffUTC = fromZonedTime(cutoffZoned, timeZone);

        where.createdAt = {
            gte: cutoffUTC
        };
    }

    if (filter?.type) {
        where.action = filter.type;
    }

    if (filter?.search) {
        where.OR = [
            { description: { contains: filter.search, mode: 'insensitive' } },
            { actor: { name: { contains: filter.search, mode: 'insensitive' } } },
            { target: { name: { contains: filter.search, mode: 'insensitive' } } }
        ];
    }

    const activities = await prisma.activityLog.findMany({
        where,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            actor: {
                select: {
                    name: true,
                    email: true,
                    avatarUrl: true
                }
            },
            target: {
                select: {
                    name: true,
                    email: true,
                    avatarUrl: true
                }
            }
        }
    });

    return activities;
}
