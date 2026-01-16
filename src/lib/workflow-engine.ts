import { prisma } from "./prisma";
import { RequestStatus, ApprovalType, ApprovalStatus, Prisma, WorkflowActionType, NotificationType, UserRole } from "@prisma/client";
import { AutoApprovalEngine } from "./auto-approval-engine";
import { type ApprovalStepMetadata, type AutoApprovalEvaluation } from "@/types/workflow/auto-approval-policy";
import { createNotification } from "./notifications";


/**
 * Engine responsible for managing the lifecycle and state transitions of the trip request approval workflow.
 */
export class WorkflowEngine {
    /**
     * Initializes the approval workflow for a new trip request.
     * Sets up the necessary approval steps based on the company's defined workflow.
     * 
     * @param {string} requestId - The unique identifier of the trip request to start the workflow for.
     * @returns {Promise<void>}
     * @throws {Error} If the request is not found in the database.
     */
    static async startWorkflow(requestId: string): Promise<void> {
        // Define the query criteria for the specific trip request
        const queryWhere = {
            id: requestId
        };

        // Define the configuration for fetching the steps in ascending order
        const stepsOrderBy = {
            order: "asc" as const
        };

        // Define the nested include structure to retrieve company workflow and steps
        const includeConfig = {
            company: {
                include: {
                    workflow: {
                        include: {
                            steps: {
                                orderBy: stepsOrderBy,
                                include: {
                                    approvers: true
                                }
                            }
                        }
                    }
                }
            }
        };

        // Fetch the trip request with all necessary relations
        const request = await prisma.tripRequest.findUnique({
            where: queryWhere,
            include: includeConfig
        });

        // Verify that the request exists
        if (!request) {
            // Define the missing request error message
            const errorMsg = "Request not found";
            // Throw a descriptive error if the request is missing
            throw new Error(errorMsg);
        }

        // Retrieve the company workflow from the request object
        const companyData = request.company;
        const workflow = companyData.workflow;
        const workflowSteps = workflow?.steps || [];

        // Check if the request qualifies for auto-approval
        const autoApprovalEval = await AutoApprovalEngine.evaluateRequest(requestId);

        if (autoApprovalEval.shouldAutoApprove && workflowSteps.length > 0) {
            // Define the auto-approved status
            const autoApprovedStatus = RequestStatus.APPROVED;

            // Update the request status to auto-approved
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: { status: autoApprovedStatus }
            });

            // Create all workflow steps as APPROVED for the audit trail
            for (const step of workflowSteps) {
                const metadata: ApprovalStepMetadata = {
                    autoApproved: true,
                    ruleType: autoApprovalEval.matchedRule?.type,
                    ruleConfig: autoApprovalEval.matchedRule?.config,
                    reason: autoApprovalEval.reason
                };

                await prisma.requestApprovalStep.create({
                    data: {
                        requestId: requestId,
                        stepId: step.id,
                        status: ApprovalStatus.APPROVED,
                        metadata: metadata as unknown as Prisma.InputJsonValue
                    }
                });
            }

            // Log the auto-approval event
            const autoApprovalComment = `✅ Auto-approved: ${autoApprovalEval.reason}`;

            await prisma.workflowAction.create({
                data: {
                    requestId: requestId,
                    actorId: request.userId,
                    action: WorkflowActionType.AUTO_APPROVED,
                    comment: autoApprovalComment
                }
            });

            // Create a system message in the discussion thread
            await prisma.message.create({
                data: {
                    requestId: requestId,
                    senderId: request.userId,
                    content: `✅ **Auto-Approved**: ${autoApprovalEval.reason}\n\nThis request met the criteria for automatic approval and has been sent directly to the agency for fulfillment.`
                }
            });

            // Exit early - workflow steps are already processed
            return;
        }

        // Check if a workflow is defined
        const hasWorkflow = !!workflow;
        // Check for existence of steps
        const hasSteps = workflowSteps.length > 0;
        // Evaluate if the workflow should proceed
        const shouldExecuteWorkflow = hasWorkflow && hasSteps;

        // If no valid workflow is found
        if (!shouldExecuteWorkflow) {
            console.log(`[WorkflowEngine] No workflow found or no steps defined for company. Moving to Approved.`);
            // Define the new status for the request
            const nextStatus = RequestStatus.APPROVED;

            // Define the update data for the request
            const statusUpdateData = {
                status: nextStatus
            };

            // Update the request status directly to approved
            await prisma.tripRequest.update({
                where: queryWhere,
                data: statusUpdateData
            });

            // Log activity for immediate approval (no workflow)
            await prisma.activityLog.create({
                data: {
                    companyId: request.companyId,
                    actorId: request.userId,
                    action: 'REQUEST_CREATED',
                    description: `Trip request "${request.title}" created and ready for agency bidding`,
                    metadata: {
                        requestId: request.id,
                        workflowFound: false
                    }
                }
            });

            // Exit the function
            return;
        }

        // Iterate through each step in the workflow to initialize it for the request
        console.log(`[WorkflowEngine] Starting manual approval sequence for ${requestId}. Steps: ${workflowSteps.length}`);
        for (let i = 0; i < workflowSteps.length; i++) {
            const step = workflowSteps[i];
            const currentStepId = step.id;

            // Define the data for the new request approval step record
            // Only the first step starts as PENDING, others as WAITING
            const approvalStepData = {
                requestId: request.id,
                stepId: currentStepId,
                status: i === 0 ? ApprovalStatus.PENDING : ApprovalStatus.WAITING
            };

            // Create the record in the database
            await prisma.requestApprovalStep.create({
                data: approvalStepData
            });
        }

        // Retrieve the first step in the sequence
        const firstStep = workflowSteps[0];
        const firstStepId = firstStep.id;

        // Construct the composite identifier for the search
        const requestIdValue = request.id;
        const compositeKey = {
            requestId: requestIdValue,
            stepId: firstStepId
        };

        // Retrieve the initialized step record from the database
        const requestStep = await prisma.requestApprovalStep.findUnique({
            where: {
                requestId_stepId: compositeKey
            }
        });

        // Check if the request step was successfully retrieved
        if (requestStep) {
            // Get the list of approvers for the first step
            const firstStepApprovers = firstStep.approvers;

            // Transform the list into user approval data objects
            const userApprovalsData = firstStepApprovers.map((approver) => {
                const currentApproverId = approver.id;
                const currentRequestStepId = requestStep.id;

                return {
                    requestApprovalStepId: currentRequestStepId,
                    userId: currentApproverId,
                    status: ApprovalStatus.PENDING
                };
            });

            // Batch create the user approval records
            await prisma.userApproval.createMany({
                data: userApprovalsData
            });

            // Define the status for company approval
            const companyApprovalStatus = RequestStatus.PENDING_COMPANY_APPROVAL;

            // Update the main trip request status
            await prisma.tripRequest.update({
                where: queryWhere,
                data: { status: companyApprovalStatus }
            });

            // Record the submission event
            await prisma.workflowAction.create({
                data: {
                    requestId: request.id,
                    actorId: request.userId,
                    action: WorkflowActionType.SUBMITTED,
                    comment: "Request submitted for approval."
                }
            });

            // Notify Step 1 approvers
            await Promise.all(
                firstStepApprovers.map(approver =>
                    createNotification({
                        userId: approver.id,
                        title: "New Approval Request",
                        message: `"${request.title}" requires your approval (${firstStep.name})`,
                        type: NotificationType.INFO,
                        link: `/company/${request.company.slug}/dashboard/requests/${request.id}`,
                        sendEmail: true
                    })
                )
            );

            // Log activity for manual workflow creation
            await prisma.activityLog.create({
                data: {
                    companyId: request.companyId,
                    actorId: request.userId,
                    action: 'REQUEST_CREATED',
                    description: `Trip request "${request.title}" created and sent for approval`,
                    metadata: {
                        requestId: request.id,
                        workflowId: workflow.id,
                        stepsCount: workflowSteps.length
                    }
                }
            });
        }
    }

    /**
     * Processes a decision made by an individual approver.
     * Evaluates if the current step should be completed based on the decision and the workflow configuration.
     * 
     * @param {string} requestId - The ID of the trip request.
     * @param {string} userId - The ID of the user providing the approval decision.
     * @param {ApprovalStatus} approvalStatus - The decision result (e.g., APPROVED, REJECTED).
     * @param {string} [comment] - An optional feedback message from the approver.
     * @returns {Promise<void>}
     * @throws {Error} If no active step is found or the user is not authorized.
     */
    static async processUserApproval(
        requestId: string,
        userId: string,
        approvalStatus: ApprovalStatus,
        comment?: string
    ): Promise<void> {
        // Define the identifier for the search
        const searchRequestId = requestId;

        // Find the current active (PENDING) approval step for this request
        const activeStep = await prisma.requestApprovalStep.findFirst({
            where: {
                requestId: searchRequestId,
                status: ApprovalStatus.PENDING
            },
            include: {
                step: {
                    include: {
                        approvers: true
                    }
                },
                approvals: true
            },
            orderBy: {
                step: {
                    order: "asc"
                }
            }
        });

        // Verify if an active step found
        if (!activeStep) {
            // Build error message
            const noActiveStepMsg = "No active approval step found for this request.";
            // Raise error if the request has no pending steps
            throw new Error(noActiveStepMsg);
        }

        // Retrieve existing user approvals for this step
        const stepApprovalsList = activeStep.approvals;

        // Find the specific approval entry for the providing user
        const targetUserApproval = stepApprovalsList.find((a) => a.userId === userId);

        // Verify the user is an authorized approver for this step
        if (!targetUserApproval) {
            // Build error message
            const unauthorizedErrorMsg = "User is not an authorized approver for this step.";
            throw new Error(unauthorizedErrorMsg);
        }

        // Retrieve the current status of the user's approval
        const currentApprovalStatus = targetUserApproval.status;

        // Ensure the user hasn't already provided a decision for this step
        const isNotActed = currentApprovalStatus === ApprovalStatus.PENDING;
        if (!isNotActed) {
            // Build error message
            const alreadyActedMsg = "User has already acted on this request.";
            throw new Error(alreadyActedMsg);
        }

        // Define update data for user approval
        const userApprovalUpdateData = {
            status: approvalStatus,
            comment: comment
        };

        // Update the user's approval status record in the database
        await prisma.userApproval.update({
            where: {
                id: targetUserApproval.id
            },
            data: userApprovalUpdateData
        });

        // Fetch the refreshed list of user approvals for the current step
        const refreshedApprovals = await prisma.userApproval.findMany({
            where: {
                requestApprovalStepId: activeStep.id
            }
        });

        // Initialize variables to track step completion status
        let stepIsComplete = false;
        let stepFinalStatus: ApprovalStatus = ApprovalStatus.PENDING;

        // identify if a rejection was provided
        const checkStatus = approvalStatus;
        const isDecisionRejected = checkStatus === ApprovalStatus.REJECTED;

        // Process rejection logic
        if (isDecisionRejected) {
            // Immediate completion on any rejection
            stepIsComplete = true;
            stepFinalStatus = ApprovalStatus.REJECTED;
        } else {
            // Retrieve the step configuration
            const activeStepConfig = activeStep.step;
            const activeApprovalType = activeStepConfig.type;
            const isAnyTypeWorkflow = activeApprovalType === ApprovalType.ANY;

            // Handle "ANY" approval logic
            if (isAnyTypeWorkflow) {
                // completion on first approval
                stepIsComplete = true;
                stepFinalStatus = ApprovalStatus.APPROVED;
            } else {
                // Handle "ALL" approval logic
                const hasEveryoneApproved = refreshedApprovals.every((a) => {
                    const statusValue = a.status;
                    return statusValue === ApprovalStatus.APPROVED;
                });

                // Completion only if every member has approved
                if (hasEveryoneApproved) {
                    stepIsComplete = true;
                    stepFinalStatus = ApprovalStatus.APPROVED;
                }
            }
        }

        // finalize the step if the completion conditions are met
        if (stepIsComplete) {
            // Define update data for request approval step
            const stepUpdateParams = {
                status: stepFinalStatus
            };

            // Update the status of the request approval step
            await prisma.requestApprovalStep.update({
                where: {
                    id: activeStep.id
                },
                data: stepUpdateParams
            });

            // Handle the outcome of a rejected step
            const isStepRejectedOutcome = stepFinalStatus === ApprovalStatus.REJECTED;
            if (isStepRejectedOutcome) {
                // Define update data for trip request
                const tripRequestUpdateParams = {
                    status: RequestStatus.REJECTED
                };

                // Set the overall trip request status to REJECTED
                await prisma.tripRequest.update({
                    where: {
                        id: requestId
                    },
                    data: tripRequestUpdateParams
                });

                // Generate the log comment for the workflow action
                const fallbackMessage = "Request rejected by internal approver.";
                const finalLogComment = comment || fallbackMessage;

                // Define data for workflow action record
                const rejectionActionData = {
                    requestId: requestId,
                    actorId: userId,
                    action: WorkflowActionType.REJECTED,
                    comment: finalLogComment
                };

                // Log the rejection event
                await prisma.workflowAction.create({
                    data: rejectionActionData
                });
            } else {
                // Move the request forward to the next step or finalization
                const activeStepOrder = activeStep.step.order;
                await this.moveToNextStep(requestId, activeStepOrder, userId);
            }
        }
    }

    /**
     * Transitions a request to the next available workflow step or completes the approval process.
     * 
     * @param {string} requestId - The ID of the trip request.
     * @param {number} currentOrder - The sequence number of the just-completed step.
     * @param {string} lastActorId - The ID of the user who completed the previous step.
     * @returns {Promise<void>}
     */
    private static async moveToNextStep(requestId: string, currentOrder: number, lastActorId: string): Promise<void> {
        // Define the search criteria for the next step 
        const nextStepWhere = {
            workflow: {
                company: {
                    requests: {
                        some: {
                            id: requestId
                        }
                    }
                }
            },
            order: {
                gt: currentOrder
            }
        };

        // Define the sorting for step retrieval
        const nextStepOrderBy = {
            order: "asc" as const
        };

        // Find the adjacent step by sequence order
        const nextWorkflowStep = await prisma.workflowStep.findFirst({
            where: nextStepWhere,
            orderBy: nextStepOrderBy,
            include: {
                approvers: true
            }
        });

        // Check if a following step exists
        if (nextWorkflowStep) {
            // Retrieve the identifier for the succeeding step
            const nextWorkflowStepId = nextWorkflowStep.id;

            // Find the initialized record for this step specific to the trip request
            const nextRequestStepRecord = await prisma.requestApprovalStep.findUnique({
                where: {
                    requestId_stepId: {
                        requestId: requestId,
                        stepId: nextWorkflowStepId
                    }
                }
            });

            // If the specific step record was found
            if (nextRequestStepRecord) {
                // Get the list of approvers for the discovered step
                const nextStepApprovers = nextWorkflowStep.approvers;

                // Prepare approval entries for each designated approver in the next step
                const nextUserApprovalsPayload = nextStepApprovers.map((approver) => {
                    const nextApproverId = approver.id;
                    const nextRequestStepId = nextRequestStepRecord.id;

                    return {
                        requestApprovalStepId: nextRequestStepId,
                        userId: nextApproverId,
                        status: ApprovalStatus.PENDING
                    };
                });

                // Batch create the user approval records for the next stage
                await prisma.userApproval.createMany({
                    data: nextUserApprovalsPayload
                });

                // Log the transition event between workflow stages
                const resultingStepOrder = nextWorkflowStep.order;
                const transitionLogComment = `Step ${currentOrder} approved. Moving to step ${resultingStepOrder}.`;

                const stepActionPayload = {
                    requestId: requestId,
                    actorId: lastActorId,
                    action: WorkflowActionType.APPROVED_STEP,
                    comment: transitionLogComment
                };

                await prisma.workflowAction.create({
                    data: stepActionPayload
                });
            }
        } else {
            // Handle completion of the final approval step
            const finalRequestStatus = RequestStatus.APPROVED;

            // Define update parameters for final approval
            const finalUpdateParams = {
                status: finalRequestStatus
            };

            // Mark the trip request as approved and awaiting agent fulfillment
            await prisma.tripRequest.update({
                where: {
                    id: requestId
                },
                data: finalUpdateParams
            });

            // Define the log comment for overall approval
            const processCompleteComment = "Internal approval process complete. Pending agent action.";

            // Define the action payload for final approval
            const finalActionPayload = {
                requestId: requestId,
                actorId: lastActorId,
                action: WorkflowActionType.APPROVED,
                comment: processCompleteComment
            };

            // Record the final approval event in the workflow log
            await prisma.workflowAction.create({
                data: finalActionPayload
            });
        }
    }

    /**
     * Handles updates to a trip request, revalidating auto-approval if necessary.
     * 
     * @param {string} requestId - The ID of the updated trip request.
     * @param {string} actorId - The ID of the user who made the update.
     * @param {Object} [domainEvents] - Significant domain events that occurred during update.
     * @returns {Promise<void>}
     */
    static async handleRequestUpdate(
        requestId: string,
        actorId: string,
        domainEvents?: { destinationChanged?: boolean }
    ): Promise<void> {
        // Fetch the request to check its current status
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: {
                approvalSteps: {
                    include: {
                        step: true
                    },
                    orderBy: {
                        step: {
                            order: 'asc'
                        }
                    }
                }
            }
        });

        if (!request) return;

        // Any update to a request that was previously approved through an auto-approval step 
        // must trigger revalidation against the original auto-approval rules recorded in the approval steps.
        const autoApprovedStep = request.approvalSteps.find(s => {
            const metadata = s.metadata as unknown as ApprovalStepMetadata | null;
            return metadata?.autoApproved === true;
        });

        // Re-evaluate the request against the company's current policies
        const evaluation = await AutoApprovalEngine.evaluateRequest(requestId);

        if (autoApprovedStep) {
            // If it was already auto-approved but no longer qualifies, revoke it
            if (!evaluation.shouldAutoApprove) {
                await this.revokeApproval(requestId, actorId, evaluation.reason);
            }
        } else {
            // Check statuses that imply the request has already been approved
            const approvedStatuses: RequestStatus[] = [
                RequestStatus.APPROVED,
                RequestStatus.PENDING_AGENT_ACTION,
                RequestStatus.BOOKED,
                RequestStatus.IN_PROGRESS
            ];

            // If it was MANUALLY approved (no autoApprovedStep) but now changed
            if (approvedStatuses.includes(request.status)) {
                // Revoke approval ONLY if the destination changed (Critical for travel safety/risk)
                if (domainEvents?.destinationChanged) {
                    await this.revokeApproval(
                        requestId,
                        actorId,
                        "Destination changed after manual approval.",
                        "⚠️ Approval revoked: Destination was changed after approval.",
                        `⚠️ **Approval Revoked**: The destination was modified after approval.\n\nThe request has been reset to the standard approval workflow.`
                    );
                }
            } else {
                // If it wasn't approved yet, we can check if it NOW qualifies for auto-approval
                // Only if it's currently in PENDING_COMPANY_APPROVAL status
                if (evaluation.shouldAutoApprove && request.status === RequestStatus.PENDING_COMPANY_APPROVAL) {
                    await this.applyAutoApproval(requestId, actorId, evaluation);
                }
            }
        }
    }

    /**
     * Applies auto-approval to a request that is currently in the manual workflow.
     */
    private static async applyAutoApproval(
        requestId: string,
        actorId: string,
        evaluation: AutoApprovalEvaluation
    ): Promise<void> {
        // 1. Mark all approval steps as APPROVED with metadata
        const metadata: ApprovalStepMetadata = {
            autoApproved: true,
            ruleType: evaluation.matchedRule?.type,
            ruleConfig: evaluation.matchedRule?.config,
            reason: evaluation.reason
        };

        await prisma.requestApprovalStep.updateMany({
            where: { requestId },
            data: {
                status: ApprovalStatus.APPROVED,
                metadata: metadata as unknown as Prisma.InputJsonValue
            }
        });

        // 2. Clear all user approvals
        await prisma.userApproval.deleteMany({
            where: {
                requestApprovalStep: {
                    requestId
                }
            }
        });

        // 3. Update request status
        await prisma.tripRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.APPROVED }
        });

        // 4. Log action
        await prisma.workflowAction.create({
            data: {
                requestId,
                actorId,
                action: WorkflowActionType.AUTO_APPROVED,
                comment: `✅ Auto-approved after update: ${evaluation.reason}`
            }
        });

        // 5. Send message
        await prisma.message.create({
            data: {
                requestId,
                senderId: actorId,
                content: `✅ **Auto-Approved**: This request now qualifies for automatic approval based on the update.\n\nReason: ${evaluation.reason}`
            }
        });
    }

    /**
     * Revokes previous approval for a request and reverts it to the pending approval state.
     * 
     * @param {string} requestId - The ID of the trip request.
     * @param {string} actorId - The ID of the user revoking the approval.
     * @param {string} reason - The reason for revocation.
     * @param {string} [logComment] - Optional custom log comment.
     * @param {string} [systemMessage] - Optional custom system message content.
     * @returns {Promise<void>}
     */
    private static async revokeApproval(
        requestId: string,
        actorId: string,
        reason: string,
        logComment?: string,
        systemMessage?: string
    ): Promise<void> {
        // Fetch the request and its workflow steps
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: {
                company: {
                    include: {
                        workflow: {
                            include: {
                                steps: {
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    }
                },
                approvalSteps: true
            }
        });

        if (!request) return;

        // 1. Revert request status to pending company approval
        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.PENDING_COMPANY_APPROVAL,
                assignedAgentId: null, // Clear assignment if any
                cost: Prisma.JsonNull // Clear cost if any
            }
        });

        // 2. Reset approval steps
        // The first step becomes PENDING, others become WAITING
        const sortedSteps = request.company.workflow?.steps || [];

        for (const step of sortedSteps) {
            const isFirst = step.order === sortedSteps[0].order;

            // Use upsert to ensure the step link exists even if workflow definition changed
            const requestStep = await prisma.requestApprovalStep.upsert({
                where: {
                    requestId_stepId: {
                        requestId,
                        stepId: step.id
                    }
                },
                update: {
                    status: isFirst ? ApprovalStatus.PENDING : ApprovalStatus.WAITING,
                    metadata: Prisma.JsonNull
                },
                create: {
                    requestId,
                    stepId: step.id,
                    status: isFirst ? ApprovalStatus.PENDING : ApprovalStatus.WAITING
                }
            });

            // If it's the first step, we need to create/reset user approvals
            if (isFirst) {
                // Clear existing user approvals for this step
                await prisma.userApproval.deleteMany({
                    where: {
                        requestApprovalStepId: requestStep.id
                    }
                });

                // Re-fetch step with approvers
                const stepWithApprovers = await prisma.workflowStep.findUnique({
                    where: { id: step.id },
                    include: { approvers: true }
                });

                if (stepWithApprovers && stepWithApprovers.approvers.length > 0) {
                    await prisma.userApproval.createMany({
                        data: stepWithApprovers.approvers.map(approver => ({
                            requestApprovalStepId: requestStep.id,
                            userId: approver.id,
                            status: ApprovalStatus.PENDING
                        }))
                    });
                }
            } else {
                // Clear existing user approvals for non-first steps
                await prisma.userApproval.deleteMany({
                    where: {
                        requestApprovalStepId: requestStep.id
                    }
                });
            }
        } // End of loop over sortedSteps

        // 3. Reset any ACCEPTED bids to PENDING
        // If a request is modified significantly, previous bid acceptances are invalid.
        const acceptedBids = await prisma.agentBid.findMany({
            where: {
                requestId,
                status: 'ACCEPTED'
            }
        });

        if (acceptedBids.length > 0) {
            // Notify the Agents that their bid approval was reversed
            for (const bid of acceptedBids) {
                // Find users of the agent company to notify
                const agentAdmins = await prisma.user.findMany({
                    where: {
                        companyId: bid.agentId,
                        role: UserRole.TRAVEL_AGENT,
                        isActive: true
                    }
                });

                // Create notification for each agent user
                for (const user of agentAdmins) {
                    await createNotification({
                        userId: user.id,
                        title: "Bid Approval Revoked",
                        message: `The approval of your bid for "${request.title}" has been reversed because the request approval was revoked/updated.`,
                        type: NotificationType.WARNING,
                        link: `/agent/bids.ts`, // Assuming a general list or specific bid link if available in agent portal
                        sendEmail: true
                    });
                }
            }

            await prisma.agentBid.updateMany({
                where: {
                    requestId,
                    status: 'ACCEPTED'
                },
                data: {
                    status: 'PENDING'
                }
            });

            // Log the bid reset
            await prisma.workflowAction.create({
                data: {
                    requestId,
                    actorId,
                    action: WorkflowActionType.AUTO_APPROVAL_REVOKED,
                    comment: `⚠️ Bids reset: ${acceptedBids.length} accepted bid(s) reset to PENDING due to request changes.`
                }
            });
        }

        // 3. Log action
        await prisma.workflowAction.create({
            data: {
                requestId,
                actorId,
                action: WorkflowActionType.AUTO_APPROVAL_REVOKED,
                comment: logComment || `⚠️ Auto-approval revoked: Request update triggered re-evaluation. Reason: ${reason}`
            }
        });

        // 4. Send message to system
        await prisma.message.create({
            data: {
                requestId,
                senderId: actorId,
                content: systemMessage || `⚠️ **Approval Revoked**: This request no longer qualifies for automatic approval.\n\nReason: ${reason}\n\nThe request has been reset to the standard approval workflow.`
            }
        });

        // 5. Notify the approvers of the first step
        const firstStep = sortedSteps[0];
        if (firstStep) {
            const stepWithApprovers = await prisma.workflowStep.findUnique({
                where: { id: firstStep.id },
                include: { approvers: true }
            });

            if (stepWithApprovers && stepWithApprovers.approvers.length > 0) {
                await Promise.all(stepWithApprovers.approvers.map(approver =>
                    createNotification({
                        userId: approver.id,
                        title: "Approval Required",
                        message: `A request "${request.title}" has been updated and now requires your approval.`,
                        type: NotificationType.WARNING,
                        link: `/company/${request.company.slug}/dashboard/requests/${requestId}`,
                        sendEmail: true
                    })
                ));
            }
        }


    }
}

