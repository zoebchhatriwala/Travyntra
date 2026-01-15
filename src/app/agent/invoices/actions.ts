"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { Prisma, RequestStatus, InvoiceStatus } from "@prisma/client";
import { ActivityLogAction } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";
import { parseMoney, moneyToDecimal } from "@/lib/types/money";
import { convertCurrency } from "@/lib/services/currency";

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
export async function generateInvoice(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "TRAVEL_AGENT") {
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
                role: "COMPANY_ADMIN",
                isActive: true
            }
        });

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                title: "New Invoice Received",
                message: `A new invoice has been generated for trip "${request.title}" by ${session.user.name}.`,
                type: "INFO",
                link: `/company/${request.company.slug}/admin/billing`,
                sendEmail: true
            });
        }

        revalidatePath(`/agent/fulfillment/${requestId}`);
        revalidatePath(`/agent/invoices`);
        revalidatePath(`/company/${request.company.slug}/admin/billing`);

        return { success: true, invoice };
    } catch (e) {
        console.error("Generate invoice error:", e);
        return { error: "Failed to generate invoice" };
    }
}

/**
 * Get all invoices for the current agency
 */
export async function getAgencyInvoices() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return { agencyCurrency: "USD", invoices: [] };

    const agencyId = session.user.companyId;
    const agency = await prisma.company.findUnique({
        where: { id: agencyId },
        select: { currency: true }
    });

    try {
        const invoices = await prisma.invoice.findMany({
            where: { agencyId },
            include: {
                company: { select: { name: true, slug: true } },
                request: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

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
                requestId: inv.requestId
            })))
        };
    } catch (e) {
        console.error("Get agency invoices error:", e);
        return { agencyCurrency: "USD", invoices: [] };
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== "TRAVEL_AGENT" && session.user.role !== "AGENCY_EMPLOYEE")) {
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
                role: "COMPANY_ADMIN",
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
