
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { AgentBidStatus, ActivityLogAction } from "@/lib/enums";
import { createMoney, formatMoney, parseMoney, moneyToDecimal } from "@/lib/types/money";
import { convertMoney } from "@/lib/services/currency";
import { createNotification } from "@/lib/notifications";

// --- Agent Actions ---

/**
 * Generates a formatted string representing the conversion from one currency to another.
 * Used for live previews in the bidding form.
 * 
 * @param {number} amount - The numeric amount to convert.
 * @param {string} fromCurrency - Source currency code.
 * @param {string} toCurrency - Target currency code.
 * @returns {Promise<string>} Formatted currency string (e.g., "$100.00").
 */

export async function getConversionPreview(amount: number, fromCurrency: string, toCurrency: string) {
    if (fromCurrency === toCurrency) {
        return formatMoney(createMoney(amount, fromCurrency));
    }
    const money = createMoney(amount, fromCurrency);
    const converted = await convertMoney(money, toCurrency);
    return formatMoney(converted);
}
/**
 * Submits a new bid for a trip request.
 * Notifies the company via a system message in the discussion thread.
 * 
 * @param {string} requestId - The ID of the trip request.
 * @param {number} amount - The numeric bid amount.
 * @param {string} message - The proposal details/message.
 * @param {string} currency - The ISO 4217 currency code of the bid.
 * @param {any[]} taxes - Optional taxes to include in the bid.
 * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
 */

export async function submitBid(requestId: string, amount: number, message: string, currency: string = "USD", taxes: any[] = []) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "TRAVEL_AGENT") {
        return { error: "Unauthorized" };
    }

    const agentId = session.user.companyId;
    const bidAmount = createMoney(amount, currency);

    try {
        // Create the bid
        await prisma.agentBid.create({
            data: {
                requestId,
                agentId,
                amount: bidAmount as unknown as Prisma.InputJsonValue,
                taxes: taxes as unknown as Prisma.InputJsonValue,
                message,
                status: AgentBidStatus.PENDING
            } as any
        });

        // Get converted value for the message if company currency is different
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: { company: true }
        });
        const companyCurrency = request?.company.currency || "USD";
        let conversionText = "";

        let totalWithTaxes = amount;
        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (t.type === 'PERCENTAGE') {
                    totalWithTaxes += (amount * (t.value || 0)) / 100;
                } else {
                    totalWithTaxes += (t.value || 0);
                }
            });
        }

        const totalMoney = createMoney(totalWithTaxes, currency);

        if (currency !== companyCurrency) {
            const converted = await convertMoney(totalMoney, companyCurrency);
            conversionText = ` (Approx. Total ${formatMoney(converted)})`;
        }

        // 1. Link to Discussion: Post a system message in the request discussion
        let taxDetails = "";
        if (taxes && taxes.length > 0) {
            taxDetails = "**Taxes**:\n" + taxes.map(t => `- ${t.label}: ${t.type === 'PERCENTAGE' ? `${t.value}%` : formatMoney(createMoney(t.value, currency))}`).join('\n');
        }

        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**New Bid Submitted**: Proposed base amount ${formatMoney(bidAmount)}. Total Amount: ${formatMoney(totalMoney)}${conversionText}.\n${taxDetails}\n\n**Proposal Details**:\n${message}`
            }
        });

        revalidatePath(`/agent/bids/${requestId}`);
        revalidatePath(`/agent/bids`);

        // Revalidate company view so they see the new bid/message
        // Ideally we'd know the company slug here, but we can't easily get it without a DB query.
        // The UI will refresh on next visit anyway.

        return { success: true };
    } catch (e) {
        console.error("Failed to submit bid:", e);
        return { error: "Failed to submit bid" };
    }
}
/**
 * Updates an existing bid.
 * Reflects the change in the request's discussion thread.
 * 
 * @param {string} bidId - The ID of the bid to update.
 * @param {string} requestId - The associated trip request ID.
 * @param {number} amount - The new numeric bid amount.
 * @param {string} message - The updated proposal message.
 * @param {string} currency - The currency code of the bid.
 * @param {any[]} taxes - Optional taxes to include in the bid.
 * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
 */

export async function updateBid(bidId: string, requestId: string, amount: number, message: string, currency: string = "USD", taxes: any[] = []) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return { error: "Unauthorized" };

    const bidAmount = createMoney(amount, currency);

    try {
        await prisma.agentBid.update({
            where: { id: bidId },
            data: {
                amount: bidAmount as unknown as Prisma.InputJsonValue,
                taxes: taxes as unknown as Prisma.InputJsonValue,
                message,
                updatedAt: new Date()
            } as any
        });

        // Post update to discussion
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: { company: true }
        });
        const companyCurrency = request?.company.currency || "USD";
        let conversionText = "";

        let totalWithTaxes = amount;
        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (t.type === 'PERCENTAGE') {
                    totalWithTaxes += (amount * (t.value || 0)) / 100;
                } else {
                    totalWithTaxes += (t.value || 0);
                }
            });
        }

        const totalMoney = createMoney(totalWithTaxes, currency);

        if (currency !== companyCurrency) {
            const converted = await convertMoney(totalMoney, companyCurrency);
            conversionText = ` (Approx. Total ${formatMoney(converted)})`;
        }

        let taxDetails = "";
        if (taxes && taxes.length > 0) {
            taxDetails = "**Taxes**:\n" + taxes.map(t => `- ${t.label}: ${t.type === 'PERCENTAGE' ? `${t.value}%` : formatMoney(createMoney(t.value, currency))}`).join('\n');
        }

        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Bid Updated**: New base amount ${formatMoney(bidAmount)}. Total Amount: ${formatMoney(totalMoney)}${conversionText}.\n${taxDetails}\n\n**Updated Proposal**:\n${message}`
            }
        });

        revalidatePath(`/agent/bids/${requestId}`);
        revalidatePath(`/agent/bids`);
        return { success: true };
    } catch {
        return { error: "Failed to update bid" };
    }
}

// --- Admin Actions (Company Side) ---

/**
 * Approves a specific bid, assigning the agent to the request and rejecting all other bids.
 * Updates the trip request status to IN_PROGRESS and sets the finalized cost.
 * 
 * @param {string} bidId - The ID of the bid to approve.
 * @param {string} requestId - The ID of the trip request.
 * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
 */

export async function approveBid(bidId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    // Only company admins or super admins can approve bids
    if (!session?.user || (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" };
    }

    try {
        const bid = await prisma.agentBid.findUnique({
            where: { id: bidId },
            include: {
                agent: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
                request: { include: { company: true } }
            }
        });
        if (!bid) return { error: "Bid not found" };

        // 1. Update Bid Status
        await prisma.agentBid.update({
            where: { id: bidId },
            data: { status: AgentBidStatus.ACCEPTED }
        });

        // 2. Reject other bids? Optional, but often good practice. 
        // For now, let's keep them pending or explicitly reject if desired, but business logic implies one winner.
        // Let's set others to REJECTED for clarity.
        await prisma.agentBid.updateMany({
            where: {
                requestId,
                id: { not: bidId }
            },
            data: { status: AgentBidStatus.REJECTED }
        });

        // Calculate total amount with taxes
        const amount = moneyToDecimal(parseMoney(bid.amount));
        let totalWithTaxes = amount;
        const taxes = ((bid as any).taxes as any[]) || [];

        if (taxes.length > 0) {
            taxes.forEach(t => {
                if (t.type === 'PERCENTAGE') {
                    totalWithTaxes += (amount * (t.value || 0)) / 100;
                } else {
                    totalWithTaxes += (t.value || 0);
                }
            });
        }

        // Create full money object for the total cost
        // We use the currency of the bid itself
        const bidCurrency = (bid.amount as any)?.currencyCode || "USD";
        let totalMoney = createMoney(totalWithTaxes, bidCurrency);
        const companyCurrency = bid.request.company.currency || "USD";

        // If currencies differ, convert the total cost to the company's currency before saving
        if (bidCurrency !== companyCurrency) {
            totalMoney = await convertMoney(totalMoney, companyCurrency);
        }

        const formattedTotal = formatMoney(totalMoney);

        // 3. Update Request: Assign Agent, Set Cost, Update Status
        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                assignedAgentId: bid.agentId,
                status: "IN_PROGRESS", // Or BOOKED, depending on workflow. usually IN_PROGRESS means fulfillment started.
                cost: totalMoney as unknown as Prisma.InputJsonValue
            }
        });

        // 4. Log Activity
        await prisma.activityLog.create({
            data: {
                companyId: session.user.companyId!,
                actorId: session.user.id,
                action: ActivityLogAction.BID_APPROVED,
                description: `Approved bid of ${formattedTotal} from agent.`,
                metadata: { requestId, bidId }
            }
        });

        // 5. System Message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Bid Accepted**: ${formattedTotal}. Agency has been assigned.`
            }
        });

        // 6. Notify the Agent's users
        const agentUsers = bid.agent.users.map(u => u.id);
        await Promise.all(agentUsers.map(userId =>
            createNotification({
                userId,
                title: "Bid Approved!",
                message: `Your bid for "${bid.request.title}" has been accepted by the company.`,
                type: "SUCCESS",
                link: `/agent/fulfillment/${requestId}`,
                sendEmail: true
            })
        ));

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);
        revalidatePath(`/agent/bids/${requestId}`);
        revalidatePath(`/agent/bids`);
        return { success: true };

    } catch (e) {
        console.error("Failed to approve bid:", e);
        return { error: "Failed to approve bid" };
    }
}
/**
 * Reverses a previously approved bid. 
 * Reopens the request for bidding and notifies the agent of the change.
 * 
 * @param {string} bidId - The ID of the bid to unapprove.
 * @param {string} requestId - The ID of the trip request.
 * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
 */

export async function unapproveBid(bidId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" };
    }

    try {
        const bid = await prisma.agentBid.findUnique({
            where: { id: bidId },
            include: {
                agent: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
                request: { include: { company: true } }
            }
        });
        if (!bid) return { error: "Bid not found" };

        // 1. Reset all bids for this request to PENDING
        await prisma.agentBid.updateMany({
            where: { requestId },
            data: { status: AgentBidStatus.PENDING }
        });

        // 2. Clear Request assignment
        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                assignedAgentId: null,
                status: "APPROVED",
                cost: Prisma.JsonNull
            }
        });

        // 3. System Message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Bid Unapproved**: The previously accepted bid has been reversed. The request is now open for bidding again.`
            }
        });

        // 4. Activity Log
        await prisma.activityLog.create({
            data: {
                companyId: session.user.companyId!,
                actorId: session.user.id,
                action: ActivityLogAction.BID_REMOVED, // Using BID_REMOVED for unapproval
                description: `Unapproved bid from agent. Request is open again.`,
                metadata: { requestId, bidId }
            }
        });

        // 5. Notify the Agent's users
        const agentEmails = bid.agent.users.map(u => u.id);
        await Promise.all(agentEmails.map(userId =>
            createNotification({
                userId,
                title: "Bid Status Update",
                message: `The approval of your bid for "${bid.request.title}" has been reversed by the company admin.`,
                type: "WARNING",
                link: `/agent/bids/${requestId}`,
                sendEmail: true
            })
        ));

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);
        return { success: true };
    } catch (e) {
        console.error("Failed to unapprove bid:", e);
        return { error: "Failed to unapprove bid" };
    }
}
/**
 * Removes a bid from the system.
 * If the bid was already accepted, it resets the request to an open/approved state.
 * 
 * @param {string} bidId - The ID of the bid to delete.
 * @param {string} requestId - The ID of the trip request.
 * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
 */

export async function removeBid(bidId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    // Only company admins or super admins can remove bids
    if (!session?.user || (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" };
    }

    try {
        const bid = await prisma.agentBid.findUnique({ where: { id: bidId } });
        if (!bid) return { error: "Bid not found" };

        if (bid.status === AgentBidStatus.ACCEPTED) {
            // If removing an accepted bid, we need to reset the request state
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: {
                    assignedAgentId: null,
                    status: "APPROVED", // Back to approved/open for bidding
                    cost: Prisma.JsonNull
                }
            });

            // System Message about reversion
            await prisma.message.create({
                data: {
                    requestId,
                    senderId: session.user.id,
                    content: `Mod **Bid Removed**: The accepted bid was removed. Request is open for bidding again.`
                }
            });
        }

        await prisma.agentBid.delete({
            where: { id: bidId }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);
        return { success: true };

    } catch (e) {
        console.error("Failed to remove bid:", e);
        return { error: "Failed to remove bid" };
    }
}
