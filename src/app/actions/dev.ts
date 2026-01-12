"use server";

import { prisma } from "@/lib/prisma";

export async function getDevUsers() {
    if (process.env.NODE_ENV !== 'development') {
        return [];
    }

    try {
        const users = await prisma.user.findMany({
            take: 100,
            include: {
                company: {
                    select: { name: true, slug: true }
                }
            },
            orderBy: {
                role: 'asc'
            }
        });

        return users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            companyName: u.company?.name,
            companySlug: u.company?.slug
        }));
    } catch (error) {
        console.error("Failed to fetch dev users:", error);
        return [];
    }
}
