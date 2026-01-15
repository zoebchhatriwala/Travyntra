"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { Prisma, RequestStatus, InvoiceStatus, UserRole } from "@prisma/client";
import { ActivityLogAction } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";
import { parseMoney, moneyToDecimal } from "@/lib/types/money";
import { convertCurrency } from "@/lib/services/currency";
import { uploadFile } from "@/lib/storage";

interface BidTax {
    label: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
}

interface InvoiceTax extends BidTax {
    calculatedAmount: number;
}

/**
 * Generate an invoice for a completed trip request
 */
export async function generateInvoice(requestId: string, pdfUrl?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        return { error: "Unauthorized" };
    }

    const agencyId = session.user.companyId;

    try {
        // Find the request and ensure it's completed and belongs to this agency
        const request = await prisma.tripRequest.findFirst({
            where: {
                id: requestId,
                assignedAgentId: agencyId,
                status: RequestStatus.COMPLETED
            },
            include: {
                company: { select: { id: true, slug: true, name: true, currency: true } },
                bids: {
                    where: { agentId: agencyId, status: "ACCEPTED" },
                    select: { amount: true }
                },
                invoice: true
            }
        });

        if (!request) {
            return { error: "Request not found or not in COMPLETED status" };
        }

        if (request.invoice && request.invoice.status === InvoiceStatus.PAID) {
            return { error: "Invoice for this request has already been paid and cannot be regenerated." };
        }

        const acceptedBid = await prisma.agentBid.findFirst({
            where: { requestId, agentId: agencyId, status: "ACCEPTED" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            select: { amount: true, taxes: true } as any
        });

        if (!acceptedBid || !acceptedBid.amount) {
            return { error: "No accepted bid found for this request to determine amount" };
        }

        const money = parseMoney(acceptedBid.amount);
        if (!money) {
            return { error: "Failed to parse bid amount currency details" };
        }

        const companyCurrency = request.company.currency || "USD";
        const bidCurrency = money.currencyCode;
        const bidSubtotal = moneyToDecimal(money);

        // Convert base amount to Company Currency
        const convertedSubtotal = await convertCurrency(bidSubtotal, bidCurrency, companyCurrency);
        const subtotal = Number(convertedSubtotal.toFixed(2));
        const invoiceCurrency = companyCurrency;

        // Calculate total with taxes
        let totalAmount = subtotal;
        const bidTaxes = (acceptedBid.taxes as unknown as BidTax[]) || [];
        const invoiceTaxes: InvoiceTax[] = [];

        for (const tax of bidTaxes) {
            let taxValue = 0;
            if (tax.type === "PERCENTAGE") {
                taxValue = (subtotal * tax.value) / 100;
            } else {
                // Fixed taxes need conversion to company currency
                taxValue = await convertCurrency(tax.value, bidCurrency, companyCurrency);
            }
            // Round tax value to 2 decimals
            taxValue = Number(taxValue.toFixed(2));

            totalAmount += taxValue;
            invoiceTaxes.push({
                ...tax,
                calculatedAmount: taxValue
            });
        }

        // Final rounding of total amount to handle cumulative floating point errors
        totalAmount = Number(totalAmount.toFixed(2));

        let invoice;

        if (request.invoice) {
            // Update existing invoice
            invoice = await prisma.invoice.update({
                where: { id: request.invoice.id },
                data: {
                    amount: totalAmount,
                    subtotal: subtotal,
                    taxes: invoiceTaxes as unknown as Prisma.InputJsonArray,
                    currency: invoiceCurrency,
                    pdfUrl: pdfUrl || undefined
                    // We don't change status if updating, unless it was something else? Keep it as is or reset to PENDING?
                    // User said "if bid updated", likely implies new negotiation, so maybe reset?
                    // But if it was already SENT/PENDING, it just updates amounts.
                } as any
            });
        } else {
            // Create the invoice
            invoice = await prisma.invoice.create({
                data: {
                    requestId,
                    companyId: request.company.id,
                    agencyId: agencyId,
                    amount: totalAmount,
                    subtotal: subtotal,
                    taxes: invoiceTaxes as unknown as Prisma.InputJsonArray,
                    currency: invoiceCurrency,
                    status: InvoiceStatus.PENDING,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                    pdfUrl: pdfUrl || null
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
            });
        }

        // Add a system message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Invoice ${request.invoice ? 'Updated' : 'Generated'}**: An invoice for ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${invoiceCurrency} has been ${request.invoice ? 'updated' : 'generated'} (based on ${bidSubtotal.toLocaleString()} ${bidCurrency}).`
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.company.id,
                actorId: session.user.id,
                action: ActivityLogAction.INVOICE_GENERATED,
                description: `Generated invoice for request: ${request.title}`,
                metadata: {
                    requestId,
                    invoiceId: invoice.id,
                    amount: totalAmount,
                    currency: invoiceCurrency,
                    originalAmount: subtotal,
                    originalCurrency: invoiceCurrency
                }
            }
        });

        // Notify company admin
        // Find company admins
        const admins = await prisma.user.findMany({
            where: {
                companyId: request.company.id,
                role: UserRole.COMPANY_ADMIN,
                isActive: true
            }
        });

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                title: "New Invoice Received",
                message: `A new invoice has been generated for trip "${request.title}" by ${session.user.name}.`,
                type: "INFO",
                link: `/company/${request.company.slug}/admin/billing#invoice_${invoice.id}`,
                sendEmail: true
            });
        }

        revalidatePath(`/agent/fulfillment/${requestId}`);
        revalidatePath(`/agent/invoices`);
        revalidatePath(`/company/${request.company.slug}/admin/billing`);

        return {
            success: true,
            invoice: {
                ...invoice,
                amount: Number(invoice.amount),
                subtotal: Number(invoice.subtotal)
            }
        };
    } catch (e) {
        console.error("Generate invoice error:", e);
        return { error: "Failed to generate invoice" };
    }
}

/**
 * Get all invoices for the current agency
 */
export async function getAgencyInvoices(
    options: {
        page?: number;
        pageSize?: number;
        query?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    } = {}
) {
    const {
        page = 1,
        pageSize = 10,
        query = "",
        status,
        startDate,
        endDate
    } = options;

    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        return {
            agencyCurrency: "USD",
            invoices: [],
            stats: { totalBilled: 0, pendingAmount: 0 },
            metadata: { totalCount: 0, totalPages: 0, currentPage: 1 }
        };
    }

    const agencyId = session.user.companyId;
    const agency = await prisma.company.findUnique({
        where: { id: agencyId },
        select: { currency: true }
    });

    try {
        const where: any = { agencyId };

        if (status && status !== "ALL") {
            where.status = status;
        }

        if (query) {
            where.OR = [
                { request: { title: { contains: query, mode: 'insensitive' } } },
                { company: { name: { contains: query, mode: 'insensitive' } } }
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const statsWhere: any = { agencyId };
        if (startDate || endDate) {
            statsWhere.createdAt = {};
            if (startDate) statsWhere.createdAt.gte = new Date(startDate);
            if (endDate) statsWhere.createdAt.lte = new Date(endDate);
        }

        const [invoices, totalCount, statsGroup] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    company: { select: { name: true, slug: true } },
                    request: { select: { title: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.invoice.count({ where }),
            prisma.invoice.groupBy({
                by: ['status'],
                where: statsWhere,
                _sum: { amount: true }
            })
        ]);

        // Calculate stats in agency currency
        const totalBilled = await Promise.all(
            statsGroup
                .filter(g => g.status === "PAID")
                .map(async g => {
                    // For simplicity, assuming all invoices are in agency currency or need conversion
                    return Number(g._sum.amount || 0);
                })
        ).then(amounts => amounts.reduce((sum, amt) => sum + amt, 0));

        const pendingAmount = await Promise.all(
            statsGroup
                .filter(g => g.status === "PENDING" || g.status === "OVERDUE")
                .map(async g => Number(g._sum.amount || 0))
        ).then(amounts => amounts.reduce((sum, amt) => sum + amt, 0));

        return {
            agencyCurrency: agency?.currency || "USD",
            invoices: await Promise.all(invoices.map(async inv => ({
                id: inv.id,
                amount: Number(inv.amount),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                subtotal: Number((inv as any)?.subtotal || 0),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                taxes: ((inv as any).taxes || []) as InvoiceTax[],
                currency: inv.currency,
                // Convert for statistics
                convertedAmount: await convertCurrency(Number(inv.amount), inv.currency, agency?.currency || "USD"),
                status: inv.status,
                dueDate: inv.dueDate,
                createdAt: inv.createdAt,
                companyName: inv.company.name,
                requestTitle: inv.request.title,
                requestId: inv.requestId,
                pdfUrl: inv.pdfUrl
            }))),
            stats: {
                totalBilled,
                pendingAmount
            },
            metadata: {
                totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                currentPage: page
            }
        };
    } catch (e) {
        console.error("Get agency invoices error:", e);
        return {
            agencyCurrency: agency?.currency || "USD",
            invoices: [],
            stats: { totalBilled: 0, pendingAmount: 0 },
            metadata: { totalCount: 0, totalPages: 0, currentPage: 1 }
        };
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        return { error: "Unauthorized" };
    }

    try {
        const invoice = await prisma.invoice.update({
            where: {
                id: invoiceId,
                agencyId: session.user.companyId
            },
            data: { status },
            include: {
                company: { select: { id: true, name: true, slug: true } },
                request: { select: { title: true } }
            }
        });

        // Notify company admins
        const admins = await prisma.user.findMany({
            where: {
                companyId: invoice.companyId,
                role: UserRole.COMPANY_ADMIN,
                isActive: true
            }
        });

        const statusLabel = status === InvoiceStatus.PAID ? "Paid" : "Voided";
        const messageHeader = status === InvoiceStatus.PAID ? "Payment Confirmed" : "Invoice Voided";

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                title: messageHeader,
                message: `Invoice for trip "${invoice.request.title}" has been marked as ${statusLabel.toLowerCase()} by ${session.user.name}.`,
                type: status === InvoiceStatus.PAID ? "SUCCESS" : "INFO",
                link: `/company/${invoice.company.slug}/admin/billing`,
                sendEmail: true
            });
        }

        revalidatePath(`/agent/invoices`);
        revalidatePath(`/agent/fulfillment/${invoice.requestId}`);
        revalidatePath(`/company/${invoice.company.slug}/admin/billing`);

        return { success: true };
    } catch (e) {
        console.error("Update invoice status error:", e);
        return { error: "Failed to update status" };
    }
}


export async function uploadInvoicePdf(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        return { error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const invoiceId = formData.get("invoiceId") as string;

    if (!file || !invoiceId) {
        return { error: "Missing file or invoice ID" };
    }

    try {
        const url = await uploadFile(file, "invoices");

        await prisma.invoice.update({
            where: {
                id: invoiceId,
                agencyId: session.user.companyId
            },
            data: {
                pdfUrl: url
            }
        });

        revalidatePath("/agent/invoices");
        return { success: true, url };
    } catch (e) {
        console.error("Upload invoice PDF error:", e);
        return { error: "Failed to upload invoice PDF" };
    }
}

export async function uploadInvoiceAttachment(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        return { error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { error: "Missing file" };
    }

    try {
        const url = await uploadFile(file, "invoices");
        return { success: true, url };
    } catch (e) {
        console.error("Upload invoice attachment error:", e);
        return { error: "Failed to upload file" };
    }
}
