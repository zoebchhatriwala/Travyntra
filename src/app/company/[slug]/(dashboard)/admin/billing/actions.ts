"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createNotification } from "@/lib/notifications";

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
                subtotal: Number((inv as any)?.subtotal || 0),
                taxes: (inv as any).taxes as any[],
                currency: inv.currency || company.currency || "USD",
                date: inv.createdAt,
                status: inv.status,
                description: `Trip: ${inv.request.title}`,
                recipient: inv.agency.name,
                requestId: inv.requestId,
                pdfUrl: inv.pdfUrl
            })),
            currency: company.currency
        };
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        return { invoices: [], currency: "USD" };
    }
}

export async function voidInvoice(invoiceId: string, slug: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "COMPANY_ADMIN") {
        return { error: "Unauthorized" };
    }

    try {
        const invoice = await prisma.invoice.update({
            where: {
                id: invoiceId,
                companyId: session.user.companyId
            },
            data: { status: InvoiceStatus.VOID },
            include: {
                agency: { select: { name: true } }, // Corrected select
                company: { select: { slug: true } },
                request: { select: { title: true } }
            }
        });

        // Notify agency admins
        const agencyAdmins = await prisma.user.findMany({
            where: {
                companyId: invoice.agencyId,
                role: "TRAVEL_AGENT",
                isActive: true
            }
        });

        for (const admin of agencyAdmins) {
            await createNotification({
                userId: admin.id,
                title: "Invoice Voided by Client",
                message: `The invoice for trip "${invoice.request.title}" has been voided by ${session.user.name} from ${invoice.agency.name}.`,
                type: "WARNING",
                link: `/agent/invoices`,
                sendEmail: true
            });
        }

        revalidatePath(`/company/${slug}/admin/billing`);
        revalidatePath(`/agent/invoices`);
        return { success: true };
    } catch (error) {
        console.error("Failed to void invoice:", error);
        return { error: "Failed to void invoice" };
    }
}
