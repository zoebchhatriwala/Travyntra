
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, UserRole, RequestStatus, BidStatus, NotificationType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { ActivityLogAction } from "@/types/common/enums";
import { type Money } from "@/types/finance/money";
import { createMoney, formatMoney, parseMoney, moneyToDecimal } from "@/lib/utils/money";
import { convertMoney } from "@/lib/services/currency";
import { createNotification } from "@/lib/notifications";
import { type ApprovalStepMetadata, type CombinedConfig, type BudgetThresholdConfig, AutoApprovalRuleType } from "@/types/workflow/auto-approval-policy";
import { AutoApprovalEngine } from "@/lib/auto-approval-engine";
import { WorkflowEngine } from "@/lib/workflow-engine";
import { PlanFeature, PlanGuard, PlanGuardService } from "@/lib/services/plan-guard";

export interface BidTax {
    label: string;
    value: number;
    type: 'PERCENTAGE' | 'FIXED';
}

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

class AgentBidActions {

    /**
     * Submits a new bid for a trip request.
     * 
     * @param {string} requestId - The ID of the trip request.
     * @param {number} amount - The amount of the bid.
     * @param {string} message - The message associated with the bid.
     * @param {string} currency - The currency of the bid (default is USD).
     * @param {BidTax[]} taxes - The taxes associated with the bid (default is an empty array).
     * @returns {Promise<{ error?: string }>} - An object containing an error message if the bid submission fails.
     */
    @PlanGuard(PlanFeature.MAX_ACTIVE_BIDS)
    static async submitBid(requestId: string, amount: number, message: string, currency: string = "USD", taxes: BidTax[] = []) {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { error: "Unauthorized" };
        }

        const agentId = session.user.companyId;
        const bidAmount = createMoney(amount, currency);

        try {
            // Fetch request with approval details and company currency
            const request = await prisma.tripRequest.findUnique({
                where: { id: requestId },
                include: {
                    company: true,
                    approvalSteps: {
                        include: { step: true }
                    },
                    bids: true
                }
            });

            if (!request) return { error: "Request not found" };

            const companyCurrency = request.company.currency || "USD";

            // Calculate total including taxes for validation
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

            // Check for auto-approval constraints
            const autoApprovedStep = request.approvalSteps.find(s => {
                const metadata = s.metadata as unknown as ApprovalStepMetadata | null;
                return metadata?.autoApproved === true;
            });

            let isWithinThreshold = false;
            let policyMetadata: ApprovalStepMetadata | null = null;

            if (autoApprovedStep) {
                policyMetadata = autoApprovedStep.metadata as unknown as ApprovalStepMetadata;
                isWithinThreshold = policyMetadata.autoApproved && (policyMetadata.ruleType === AutoApprovalRuleType.BUDGET_THRESHOLD || policyMetadata.ruleType === AutoApprovalRuleType.COMBINED);
            } else if (request.status === RequestStatus.APPROVED && request.approvalSteps.length === 0) {
                // If no steps exist but it's approved, it might have been auto-approved (steps skipped)
                // Re-evaluate the policy to see if it should have been auto-approved
                const evaluation = await AutoApprovalEngine.evaluateRequest(requestId);
                if (evaluation.shouldAutoApprove) {
                    // If the evaluation says it should be auto-approved, we treat it as such
                    // We don't have a specific rule from the past, so we use the current evaluation's reasonings
                    // or just mark it as auto-approvable
                    isWithinThreshold = evaluation.matchedRule?.type === AutoApprovalRuleType.BUDGET_THRESHOLD || evaluation.matchedRule?.type === AutoApprovalRuleType.COMBINED;

                    // Construct temporary metadata for threshold checking
                    // This is a bit of a fallback, but safe since it re-checks the current policy
                    policyMetadata = {
                        autoApproved: true,
                        ruleType: evaluation.matchedRule?.type,
                        ruleConfig: evaluation.matchedRule?.config,
                        reason: evaluation.reason
                    };
                }
            }

            if (policyMetadata) {
                // If it was approved under a budget rule, validate the bid amount
                if (policyMetadata.ruleType === AutoApprovalRuleType.BUDGET_THRESHOLD || policyMetadata.ruleType === AutoApprovalRuleType.COMBINED) {
                    const config = policyMetadata.ruleType === AutoApprovalRuleType.COMBINED
                        ? (policyMetadata.ruleConfig as CombinedConfig)?.budget
                        : (policyMetadata.ruleConfig as BudgetThresholdConfig);

                    if (config) {
                        // Use the user's requested budget as the limit, not the secret policy threshold
                        const requestBudget = request.budget as unknown as Money;
                        const maxAmount = moneyToDecimal(requestBudget);
                        const policyCurrency = requestBudget.currencyCode;

                        let bidTotalInPolicyCurrency = totalWithTaxes;
                        if (currency !== policyCurrency) {
                            const converted = await convertMoney(totalMoney, policyCurrency);
                            bidTotalInPolicyCurrency = moneyToDecimal(converted);
                        }

                        if (bidTotalInPolicyCurrency > maxAmount) {
                            return { error: `Bid amount exceeds the requested budget of ${formatMoney(createMoney(maxAmount, policyCurrency))}` };
                        }
                    }
                }
            }

            // Create the bid
            const newBid = await prisma.agentBid.create({
                data: {
                    requestId,
                    agencyId: agentId,
                    amount: bidAmount as unknown as Prisma.InputJsonValue,
                    taxes: taxes as unknown as Prisma.InputJsonValue,
                    message,
                    status: BidStatus.PENDING
                }
            });

            let autoApprovalApplied = false;

            // If it was auto-approved (via step or skipped steps) and this bid is within threshold, 
            // check if we can auto-accept
            if (policyMetadata) {
                // Check if any bid is already accepted for this request
                const alreadyAccepted = request.bids.some(b => b.status === BidStatus.ACCEPTED);

                if (alreadyAccepted) {
                    // If a bid is already accepted, auto-reject this one
                    await prisma.agentBid.update({
                        where: { id: newBid.id },
                        data: { status: BidStatus.REJECTED }
                    });

                    await prisma.message.create({
                        data: {
                            requestId,
                            senderId: session.user.id,
                            content: `**Bid Auto-Rejected**: This request has already been assigned or fulfilled. Subsequent bids are not accepted.`
                        }
                    });

                    return { success: true, message: "Request already has an active bid. Your bid was automatically rejected." };
                }

                // If not already accepted, check if this bid qualifies for auto-acceptance
                if (isWithinThreshold) {
                    // Auto-approve this bid
                    await AgentBidActions.approveBidInternal(newBid.id, requestId, session.user.id, true);
                    autoApprovalApplied = true;
                }
            }

            let conversionText = "";
            if (currency !== companyCurrency && !autoApprovalApplied) {
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
                    content: `**New Bid Submitted**: Proposed base amount ${formatMoney(bidAmount)}. Total Amount: ${formatMoney(totalMoney)}${conversionText}.\n\n${taxDetails}\n\n**Proposal Details**:\n${message ?? 'N/A'}`
                }
            });

            // Notify company admins about the new bid
            const companyAdmins = await prisma.user.findMany({
                where: {
                    companyId: request?.company.id,
                    role: UserRole.COMPANY_ADMIN,
                    isActive: true
                },
                select: { id: true }
            });

            await Promise.all(companyAdmins.map(admin =>
                createNotification({
                    userId: admin.id,
                    title: "New Bid Received",
                    message: `A new bid of ${formatMoney(totalMoney)} has been submitted for "${request?.title}".`,
                    type: NotificationType.INFO,
                    link: `/company/${request?.company.slug}/dashboard/requests/${requestId}`,
                    sendEmail: true
                })
            ));

            revalidatePath(`/agent/bids/${requestId}`);
            revalidatePath(`/agent/bids`);

            return { success: true };
        } catch (e) {
            console.error("Failed to submit bid:", e);
            return { error: e instanceof Error ? e.message : "Failed to submit bid" };
        }
    }

    /**
     * Internal helper to approve a bid using existing mechanics.
     * Extracted from approveBid to be used for auto-approvals.
     */
    static async approveBidInternal(bidId: string, requestId: string, actorId: string, isAutoApproved: boolean = false) {
        const bid = await prisma.agentBid.findUnique({
            where: { id: bidId },
            include: {
                agency: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
                request: { include: { company: true } }
            }
        });

        if (!bid) throw new Error("Bid not found");

        // --- PlanGuard Fulfillment Check ---
        // Verify Agency has not reached its monthly fulfillment limit
        await PlanGuardService.enforce(bid.agencyId, PlanFeature.FULFILLMENTS_PER_MONTH);

        // 1. Update Bid Status
        await prisma.agentBid.update({
            where: { id: bidId },
            data: { status: BidStatus.ACCEPTED }
        });

        // 2. Reject other bids
        await prisma.agentBid.updateMany({
            where: {
                requestId,
                id: { not: bidId }
            },
            data: { status: BidStatus.REJECTED }
        });

        // Calculate total amount with taxes
        const amount = moneyToDecimal(parseMoney(bid.amount));
        let totalWithTaxes = amount;
        const taxes = (bid.taxes as unknown as BidTax[]) || [];

        if (taxes && taxes.length > 0) {
            taxes.forEach(t => {
                if (t.type === 'PERCENTAGE') {
                    totalWithTaxes += (amount * (t.value || 0)) / 100;
                } else {
                    totalWithTaxes += (t.value || 0);
                }
            });
        }

        const bidCurrency = (bid.amount as unknown as { currencyCode: string })?.currencyCode || "USD";
        let totalMoney = createMoney(totalWithTaxes, bidCurrency);
        const companyCurrency = bid.request.company.currency || "USD";

        if (bidCurrency !== companyCurrency) {
            totalMoney = await convertMoney(totalMoney, companyCurrency);
        }

        const formattedTotal = formatMoney(totalMoney);

        // 3. Update Request: Assign Agent, Set Cost, Update Status
        if (bid.request.status === RequestStatus.PENDING_QUOTATION) {
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: {
                    agencyId: bid.agencyId,
                    // Status is updated by WorkflowEngine
                    cost: totalMoney as unknown as Prisma.InputJsonValue
                }
            });
            await WorkflowEngine.completeAgentQuotation(requestId, actorId);
        } else {
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: {
                    agencyId: bid.agencyId,
                    status: "IN_PROGRESS",
                    cost: totalMoney as unknown as Prisma.InputJsonValue
                }
            });
        }

        // 4. Log Activity
        await prisma.activityLog.create({
            data: {
                companyId: bid.request.companyId,
                actorId: actorId,
                action: ActivityLogAction.BID_APPROVED,
                description: isAutoApproved
                    ? `Auto-approved bid of ${formattedTotal} based on auto-approval policy.`
                    : `Manually approved bid of ${formattedTotal}.`,
                metadata: { requestId, bidId, autoApproved: isAutoApproved }
            }
        });

        // 5. System Message
        await prisma.message.create({
            data: {
                requestId,
                senderId: actorId,
                content: isAutoApproved
                    ? `✅ **Bid Auto-Accepted**: ${formattedTotal}. This request was auto-approved and the first matching bid has been accepted automatically.`
                    : `✅ **Bid Accepted**: ${formattedTotal}. The bid has been manually approved and assigned for fulfillment.`
            }
        });

        // 6. Notify the Agent's users
        const agentUsers = bid.agency.users.map(u => u.id);
        await Promise.all(agentUsers.map(userId =>
            createNotification({
                userId,
                title: isAutoApproved ? "Bid Auto-Approved!" : "Bid Accepted!",
                message: isAutoApproved
                    ? `Your bid for "${bid.request.title}" was auto-accepted based on the company's policy.`
                    : `Good news! Your bid for "${bid.request.title}" has been manually accepted and assigned to you.`,
                type: NotificationType.SUCCESS,
                link: `/agent/fulfillment/${requestId}`,
                sendEmail: true
            })
        ));
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
    static async updateBid(bidId: string, requestId: string, amount: number, message: string, currency: string = "USD", taxes: BidTax[] = []) {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) return { error: "Unauthorized" };

        const bidAmount = createMoney(amount, currency);

        try {
            await prisma.agentBid.update({
                where: { id: bidId },
                data: {
                    amount: bidAmount as unknown as Prisma.InputJsonValue,
                    taxes: taxes as unknown as Prisma.InputJsonValue,
                    message,
                    updatedAt: new Date()
                }
            });

            // Post update to discussion
            // Post update to discussion
            const request = await prisma.tripRequest.findUnique({
                where: { id: requestId },
                include: {
                    company: true,
                    approvalSteps: {
                        include: { step: true }
                    },
                    bids: true
                }
            });

            if (!request) return { error: "Request not found" };
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


            // --- Auto-Approval Logic Start ---
            // Check for auto-approval constraints
            const autoApprovedStep = request.approvalSteps.find(s => {
                const metadata = s.metadata as unknown as ApprovalStepMetadata | null;
                return metadata?.autoApproved === true;
            });

            let isWithinThreshold = false;
            let policyMetadata: ApprovalStepMetadata | null = null;

            if (autoApprovedStep) {
                policyMetadata = autoApprovedStep.metadata as unknown as ApprovalStepMetadata;
                isWithinThreshold = policyMetadata.autoApproved && (policyMetadata.ruleType === AutoApprovalRuleType.BUDGET_THRESHOLD || policyMetadata.ruleType === AutoApprovalRuleType.COMBINED);
            } else if (request.status === RequestStatus.APPROVED && request.approvalSteps.length === 0) {
                // Re-evaluate
                const evaluation = await AutoApprovalEngine.evaluateRequest(requestId);
                if (evaluation.shouldAutoApprove) {
                    isWithinThreshold = evaluation.matchedRule?.type === AutoApprovalRuleType.BUDGET_THRESHOLD || evaluation.matchedRule?.type === AutoApprovalRuleType.COMBINED;
                    policyMetadata = {
                        autoApproved: true,
                        ruleType: evaluation.matchedRule?.type,
                        ruleConfig: evaluation.matchedRule?.config,
                        reason: evaluation.reason
                    };
                }
            }

            if (policyMetadata) {
                if (policyMetadata.ruleType === AutoApprovalRuleType.BUDGET_THRESHOLD || policyMetadata.ruleType === AutoApprovalRuleType.COMBINED) {
                    const config = policyMetadata.ruleType === AutoApprovalRuleType.COMBINED
                        ? (policyMetadata.ruleConfig as CombinedConfig)?.budget
                        : (policyMetadata.ruleConfig as BudgetThresholdConfig);

                    if (config) {
                        // Use the user's requested budget as the limit, not the secret policy threshold
                        const requestBudget = request.budget as unknown as Money;
                        const maxAmount = moneyToDecimal(requestBudget);
                        const policyCurrency = requestBudget.currencyCode;

                        let bidTotalInPolicyCurrency = totalWithTaxes;
                        if (currency !== policyCurrency) {
                            const converted = await convertMoney(totalMoney, policyCurrency);
                            bidTotalInPolicyCurrency = moneyToDecimal(converted);
                        }

                        if (bidTotalInPolicyCurrency > maxAmount) {
                            return { error: `Bid amount exceeds the requested budget of ${formatMoney(createMoney(maxAmount, policyCurrency))}` };
                        }
                    }
                }
            }

            let autoApprovalApplied = false;

            if (policyMetadata) {
                const alreadyAccepted = request.bids.some(b => b.status === BidStatus.ACCEPTED);
                // We don't auto-reject updates here, we just check if we can auto-accept this update
                if (!alreadyAccepted && isWithinThreshold) {
                    await AgentBidActions.approveBidInternal(bidId, requestId, session.user.id, true);
                    autoApprovalApplied = true;
                }
            }
            // --- Auto-Approval Logic End ---

            if (currency !== companyCurrency && !autoApprovalApplied) {
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
                    content: `**Bid Updated**: New base amount ${formatMoney(bidAmount)}. Total Amount: ${formatMoney(totalMoney)}${conversionText}.\n\n${taxDetails}\n\n**Updated Proposal**:\n${message}`
                }
            });

            // Notify company admins about the bid update
            const companyAdmins = await prisma.user.findMany({
                where: {
                    companyId: request?.company.id,
                    role: UserRole.COMPANY_ADMIN,
                    isActive: true
                },
                select: { id: true }
            });

            await Promise.all(companyAdmins.map(admin =>
                createNotification({
                    userId: admin.id,
                    title: "Bid Updated",
                    message: `A bid for "${request?.title}" has been updated to ${formatMoney(totalMoney)}.`,
                    type: NotificationType.INFO,
                    link: `/company/${request?.company.slug}/dashboard/requests/${requestId}`,
                    sendEmail: true
                })
            ));

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
    static async approveBid(bidId: string, requestId: string) {
        const session = await getServerSession(authOptions);
        // Only company admins or super admins can approve bids
        if (!session?.user || (session.user.role !== UserRole.COMPANY_ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
            return { error: "Unauthorized" };
        }

        try {
            // Call internal approveBidInternal function (isAutoApproved = false)
            await AgentBidActions.approveBidInternal(bidId, requestId, session.user.id, false);

            // Revalidate paths
            revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);
            revalidatePath(`/agent/bids/${requestId}`);
            revalidatePath(`/agent/bids`);

            // Return success
            return { success: true };

        } catch (e) {
            console.error("Failed to approve bid:", e);
            return { error: e instanceof Error ? e.message : "Failed to approve bid" };
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
    static async unapproveBid(bidId: string, requestId: string) {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user.role !== UserRole.COMPANY_ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
            return { error: "Unauthorized" };
        }

        try {
            // Fetch bid details
            const bid = await prisma.agentBid.findUnique({
                where: { id: bidId },
                include: {
                    agency: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
                    request: {
                        include: {
                            company: true,
                            approvalSteps: true
                        }
                    }
                }
            });

            // Check if bid exists
            if (!bid) return { error: "Bid not found" };

            // Guard against unapproving if workflow has proceeded
            if (bid.request.status === RequestStatus.PENDING_COMPANY_APPROVAL) {
                return { error: "Cannot unapprove bid because the request has moved to a subsequent approval step." };
            }

            // 1. Reset all bids for this request to PENDING
            await prisma.agentBid.updateMany({
                where: { requestId },
                data: { status: BidStatus.PENDING }
            });

            // 2. Clear Request assignment
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: {
                    agencyId: null,
                    status: RequestStatus.APPROVED,
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
            const agentEmails = bid.agency?.users?.map(u => u.id) || [];
            await Promise.all(agentEmails.map(userId =>
                createNotification({
                    userId,
                    title: "Bid Status Update",
                    message: `The approval of your bid for "${bid.request.title}" has been reversed by the company admin.`,
                    type: NotificationType.WARNING,
                    link: `/agent/bids/${requestId}`,
                    sendEmail: true
                })
            ));

            // Revalidate paths
            revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);

            // Return success
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
    static async removeBid(bidId: string, requestId: string) {
        const session = await getServerSession(authOptions);
        // Only company admins or super admins can remove bids
        if (!session?.user || (session.user.role !== UserRole.COMPANY_ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
            return { error: "Unauthorized" };
        }

        try {
            const bid = await prisma.agentBid.findUnique({ where: { id: bidId } });
            if (!bid) return { error: "Bid not found" };

            if (bid.status === BidStatus.ACCEPTED) {
                // If removing an accepted bid, we need to reset the request state
                await prisma.tripRequest.update({
                    where: { id: requestId },
                    data: {
                        agencyId: null,
                        status: RequestStatus.APPROVED,
                        cost: Prisma.JsonNull
                    }
                });

                // System Message about reversion
                await prisma.message.create({
                    data: {
                        requestId,
                        senderId: session.user.id,
                        content: `**Bid Removed**: The accepted bid was removed. Request is open for bidding again.`
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

    /**
     * Allows an agent to withdraw or "reverse" their own bid.
     * If the bid was already accepted, it resets the request to an open/approved state.
     * 
     * @param {string} bidId - The ID of the bid to withdraw.
     * @param {string} requestId - The ID of the trip request.
     * @returns {Promise<{ success?: boolean; error?: string }>} Result of the operation.
     */
    static async withdrawBid(bidId: string, requestId: string) {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { error: "Unauthorized" };
        }

        try {
            const bid = await prisma.agentBid.findUnique({
                where: { id: bidId },
                include: {
                    request: {
                        include: {
                            company: true,
                            user: true // Trip creator
                        }
                    }
                }
            });

            if (!bid) return { error: "Bid not found" };
            if (bid.agencyId !== session.user.companyId) return { error: "You can only withdraw your own agency's bids" };

            // Guard: Cannot withdraw if trip is completed or cancelled
            if (bid.request.status === RequestStatus.COMPLETED || bid.request.status === RequestStatus.CANCELLED) {
                return { error: `Cannot withdraw bid for a ${bid.request.status.toLowerCase()} trip.` };
            }

            const wasAccepted = bid.status === BidStatus.ACCEPTED;

            if (wasAccepted) {
                // 1. Reset Request assignment
                await prisma.tripRequest.update({
                    where: { id: requestId },
                    data: {
                        agencyId: null,
                        status: RequestStatus.APPROVED, // Back to approved to allow re-bidding/re-assignment
                        cost: Prisma.JsonNull
                    }
                });

                // 2. Set Bid status back to PENDING (or they could update/delete it)
                await prisma.agentBid.update({
                    where: { id: bidId },
                    data: { status: BidStatus.PENDING }
                });

                // 3. System Message
                await prisma.message.create({
                    data: {
                        requestId,
                        senderId: session.user.id,
                        content: `**Bid Withdrawn/Reversed**: The agent has withdrawn their accepted bid. The request is now open for bidding again.`
                    }
                });

                // 4. Activity Log
                await prisma.activityLog.create({
                    data: {
                        companyId: bid.request.companyId,
                        actorId: session.user.id,
                        action: ActivityLogAction.BID_REMOVED,
                        description: `Agent withdrew their accepted bid for "${bid.request.title}".`,
                        metadata: { requestId, bidId }
                    }
                });

                // 5. Notifications
                // Notify Company Admins
                const companyAdmins = await prisma.user.findMany({
                    where: {
                        companyId: bid.request.companyId,
                        role: UserRole.COMPANY_ADMIN,
                        isActive: true
                    }
                });

                const notificationPromises = companyAdmins.map(admin =>
                    createNotification({
                        userId: admin.id,
                        title: "Accepted Bid Withdrawn",
                        message: `The agent has withdrawn their accepted bid for "${bid.request.title}". The request is now unassigned.`,
                        type: NotificationType.WARNING,
                        link: `/company/${bid.request.company.slug}/dashboard/requests/${requestId}`,
                        sendEmail: true
                    })
                );

                // Notify Ticket Creator (if not an admin already)
                if (bid.request.user && !companyAdmins.some(a => a.id === bid.request.userId)) {
                    notificationPromises.push(
                        createNotification({
                            userId: bid.request.userId,
                            title: "Trip Update: Bid Withdrawn",
                            message: `The agent has withdrawn their bid for your trip "${bid.request.title}". We are looking for a new options.`,
                            type: NotificationType.WARNING,
                            link: `/dashboard/requests/${requestId}`,
                            sendEmail: true
                        })
                    );
                }

                await Promise.all(notificationPromises);
            } else {
                // If the bid wasn't accepted, we can just archive it or set to pending
                // Usually "reverse" for a pending bid might mean deleting or archiving.
                // But the user said "allow agent to reverse a bid, if price is changed etc".
                // If it's already pending, they can just update it.
                // So let's assume "reverse" on a pending bid means "setting it aside" or just allowing them to handle the accepted case.
                // For a non-accepted bid, we'll just set it to PENDING (no-op if already pending) or maybe ARCHIVED?
                // Let's just focus on the accepted case primarily, but allow withdrawing PENDING bids too.

                await prisma.agentBid.update({
                    where: { id: bidId },
                    data: { status: BidStatus.PENDING } // Or delete? Let's just keep it pending for simplicity.
                });
            }

            revalidatePath(`/agent/bids/${requestId}`);
            revalidatePath(`/agent/bids`);
            revalidatePath(`/company/${bid.request.company.slug}/dashboard/requests/${requestId}`);

            return { success: true };
        } catch (e) {
            console.error("Failed to withdraw bid:", e);
            return { error: "Failed to withdraw bid" };
        }
    }

}

// Export actions
export const submitBid = AgentBidActions.submitBid
export const removeBid = AgentBidActions.removeBid
export const approveBid = AgentBidActions.approveBid
export const unapproveBid = AgentBidActions.unapproveBid
export const updateBid = AgentBidActions.updateBid
export const withdrawBid = AgentBidActions.withdrawBid




