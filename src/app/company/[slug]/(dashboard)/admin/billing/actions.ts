"use server";

import { prisma } from "@/lib/prisma";

export async function getCompanyInvoices(slug: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { slug },
            select: { id: true, plan: true }
        });

        if (!company) return [];

        // For now, we'll treat completed trip requests with a budget as "Invoices" 
        // since we don't have a dedicated Invoice model yet.
        const requests = await prisma.tripRequest.findMany({
            where: {
                companyId: company.id,
                status: 'COMPLETED',
                budget: { not: null }
            },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return requests.map(req => ({
            id: req.id,
            amount: Number(req.budget),
            date: req.updatedAt,
            status: 'PAID',
            description: `Trip: ${req.title}`,
            recipient: req.user.name || req.user.email
        }));
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        return [];
    }
}
