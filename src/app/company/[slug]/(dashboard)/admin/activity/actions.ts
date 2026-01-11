"use server";

import { prisma } from "@/lib/prisma";

export type ActivityLogFilter = {
    days?: number;
    type?: string;
    search?: string;
};

export async function getCompanyActivities(slug: string, filter?: ActivityLogFilter) {
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true }
    });

    if (!company) {
        throw new Error("Company not found");
    }

    const where: any = {
        companyId: company.id,
    };

    if (filter?.days) {
        const date = new Date();
        date.setDate(date.getDate() - filter.days);
        where.createdAt = {
            gte: date
        };
    }

    if (filter?.type) {
        where.action = filter.type;
    }

    if (filter?.search) {
        where.OR = [
            { description: { contains: filter.search, mode: 'insensitive' } },
            { user: { name: { contains: filter.search, mode: 'insensitive' } } }
        ];
    }

    const activities = await prisma.activityLog.findMany({
        where,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            user: {
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
