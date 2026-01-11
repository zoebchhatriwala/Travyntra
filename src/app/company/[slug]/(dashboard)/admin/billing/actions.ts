"use server";

import { prisma } from "@/lib/prisma";

export async function getCompanyInvoices(slug: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { slug },
            select: {
                id: true,
                currency: true
            }
        });

        if (!company) return { invoices: [], currency: "USD" };

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

        return {
            invoices: invoices.map((inv) => ({
                id: inv.id,
                amount: Number(inv.amount),
                date: inv.createdAt,
                status: inv.status,
                description: `Trip: ${inv.request.title}`,
                recipient: inv.agency.name
            })),
            currency: company.currency
        };
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        return { invoices: [], currency: "USD" };
    }
}
