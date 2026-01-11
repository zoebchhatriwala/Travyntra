
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { AgentBidStatus, ActivityLogAction } from "@/lib/enums";

// --- Agent Actions ---

export async function submitBid(requestId: string, amount: number, message: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "TRAVEL_AGENT") {
        return { error: "Unauthorized" };
    }

    const agentId = session.user.companyId;

    try {
        // Create the bid
        await prisma.agentBid.create({
            data: {
                requestId,
                agentId,
                amount,
                message,
                status: AgentBidStatus.PENDING
            }
        });

        // 1. Link to Discussion: Post a system message in the request discussion
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**New Bid Submitted**: Proposed amount $${amount}.\n\n**Proposal Details**:\n${message}`
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

export async function updateBid(bidId: string, requestId: string, amount: number, message: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return { error: "Unauthorized" };

    try {
        await prisma.agentBid.update({
            where: { id: bidId },
            data: {
                amount,
                message,
                updatedAt: new Date()
            }
        });

        // Post update to discussion
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Bid Updated**: New amount $${amount}.\n\n**Updated Proposal**:\n${message}`
            }
        });

        revalidatePath(`/agent/bids/${requestId}`);
        revalidatePath(`/agent/bids`);
        return { success: true };
    } catch (e) {
        return { error: "Failed to update bid" };
    }
}

// --- Admin Actions (Company Side) ---

export async function approveBid(bidId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    // Only company admins or super admins can approve bids
    if (!session?.user || (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
        return { error: "Unauthorized" };
    }

    try {
        const bid = await prisma.agentBid.findUnique({ where: { id: bidId } });
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

        // 3. Update Request: Assign Agent, Set Cost, Update Status
        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                assignedAgentId: bid.agentId,
                status: "IN_PROGRESS", // Or BOOKED, depending on workflow. usually IN_PROGRESS means fulfillment started.
                cost: bid.amount
            }
        });

        // 4. Log Activity
        await prisma.activityLog.create({
            data: {
                companyId: session.user.companyId!,
                actorId: session.user.id,
                action: ActivityLogAction.BID_APPROVED,
                description: `Approved bid of $${bid.amount} from agent.`,
                metadata: { requestId, bidId }
            }
        });

        // 5. System Message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Bid Accepted**: $${bid.amount}. Agency has been assigned.`
            }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);
        return { success: true };

    } catch (e) {
        console.error("Failed to approve bid:", e);
        return { error: "Failed to approve bid" };
    }
}

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
                    cost: null
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
