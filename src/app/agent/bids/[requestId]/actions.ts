
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

interface BidTax {
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

export async function submitBid(requestId: string, amount: number, message: string, currency: string = "USD", taxes: BidTax[] = []) {
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
                    ruleType: evaluation.matchedRule?.type || AutoApprovalRuleType.BUDGET_THRESHOLD,
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
                await approveBidInternal(newBid.id, requestId, session.user.id);
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
                content: `**New Bid Submitted**: Proposed base amount ${formatMoney(bidAmount)}. Total Amount: ${formatMoney(totalMoney)}${conversionText}.\n\n${taxDetails}\n\n**Proposal Details**:\n${message}`
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
async function approveBidInternal(bidId: string, requestId: string, actorId: string) {
    const bid = await prisma.agentBid.findUnique({
        where: { id: bidId },
        include: {
            agency: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
            request: { include: { company: true } }
        }
    });

    if (!bid) throw new Error("Bid not found");

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

    if (taxes.length > 0) {
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
    await prisma.tripRequest.update({
        where: { id: requestId },
        data: {
            agencyId: bid.agencyId,
            status: "IN_PROGRESS",
            cost: totalMoney as unknown as Prisma.InputJsonValue
        }
    });

    // 4. Log Activity
    await prisma.activityLog.create({
        data: {
            companyId: bid.request.companyId,
            actorId: actorId,
            action: ActivityLogAction.BID_APPROVED,
            description: `Auto-approved bid of ${formattedTotal} based on auto-approval policy.`,
            metadata: { requestId, bidId, autoApproved: true }
        }
    });

    // 5. System Message
    await prisma.message.create({
        data: {
            requestId,
            senderId: actorId,
            content: `✅ **Bid Auto-Accepted**: ${formattedTotal}. This request was auto-approved and the first matching bid has been accepted automatically.`
        }
    });

    // 6. Notify the Agent's users
    const agentUsers = bid.agency.users.map(u => u.id);
    await Promise.all(agentUsers.map(userId =>
        createNotification({
            userId,
            title: "Bid Auto-Approved!",
            message: `Your bid for "${bid.request.title}" was auto-accepted based on the company's policy.`,
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

export async function updateBid(bidId: string, requestId: string, amount: number, message: string, currency: string = "USD", taxes: BidTax[] = []) {
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
                    ruleType: evaluation.matchedRule?.type || AutoApprovalRuleType.BUDGET_THRESHOLD,
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
                await approveBidInternal(bidId, requestId, session.user.id);
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

export async function approveBid(bidId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    // Only company admins or super admins can approve bids
    if (!session?.user || (session.user.role !== UserRole.COMPANY_ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized" };
    }

    try {
        const bid = await prisma.agentBid.findUnique({
            where: { id: bidId },
            include: {
                agency: { include: { users: { where: { role: 'TRAVEL_AGENT' } } } },
                request: { include: { company: true } }
            }
        });
        if (!bid) return { error: "Bid not found" };

        // 1. Update Bid Status
        await prisma.agentBid.update({
            where: { id: bidId },
            data: { status: BidStatus.ACCEPTED }
        });

        // 2. Reject other bids? Optional, but often good practice. 
        // For now, let's keep them pending or explicitly reject if desired, but business logic implies one winner.
        // Let's set others to REJECTED for clarity.
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
        const bidCurrency = (bid.amount as unknown as { currencyCode: string })?.currencyCode || "USD";
        let totalMoney = createMoney(totalWithTaxes, bidCurrency);
        const companyCurrency = bid.request.company.currency || "USD";

        // If currencies differ, convert the total cost to the company's currency before saving
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
            await WorkflowEngine.completeAgentQuotation(requestId, session.user.id);
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
        const agentUsers = bid.agency.users.map(u => u.id);
        await Promise.all(agentUsers.map(userId =>
            createNotification({
                userId,
                title: "Bid Approved!",
                message: `Your bid for "${bid.request.title}" has been accepted by the company.`,
                type: NotificationType.SUCCESS,
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
    if (!session?.user || (session.user.role !== UserRole.COMPANY_ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized" };
    }

    try {
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
        const agentEmails = bid.agency.users.map(u => u.id);
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
