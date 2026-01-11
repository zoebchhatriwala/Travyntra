"use server";

import { prisma } from "@/lib/prisma";

export async function getCompanyInvoices(slug: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!company) return [];

        const invoices = await prisma.invoice.findMany({
            where: {
                companyId: company.id
            },
            include: {
                request: {
                    select: { title: true }
                },
                agency: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return invoices.map((inv) => ({
            id: inv.id,
            amount: Number(inv.amount),
            date: inv.createdAt,
            status: inv.status,
            description: `Trip: ${inv.request.title}`,
            recipient: inv.agency.name
        }));
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        return [];
    }
}
