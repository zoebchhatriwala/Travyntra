
import { prisma } from "./prisma";
import { RequestStatus, ApprovalType, ApprovalStatus } from "@prisma/client";

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

        // Check if a workflow is defined
        const hasWorkflow = !!workflow;
        // Check for existence of steps
        const stepsExist = workflow?.steps;
        // Determine if there are executable steps
        const hasSteps = stepsExist && workflow.steps.length > 0;
        // Evaluate if the workflow should proceed
        const shouldExecuteWorkflow = hasWorkflow && hasSteps;

        // If no valid workflow is found
        if (!shouldExecuteWorkflow) {
            // Define the new status for the request
            const nextStatus = RequestStatus.PENDING_AGENT_ACTION;

            // Define the update data for the request
            const statusUpdateData = {
                status: nextStatus
            };

            // Update the request status directly to pending agent action
            await prisma.tripRequest.update({
                where: queryWhere,
                data: statusUpdateData
            });

            // Exit the function
            return;
        }

        // Get the list of workflow steps from the workflow object
        const workflowSteps = workflow.steps;

        // Iterate through each step in the workflow to initialize it for the request
        for (const step of workflowSteps) {
            // Extract the unique identifier for the step
            const currentStepId = step.id;

            // Define the data for the new request approval step record
            const approvalStepData = {
                requestId: request.id,
                stepId: currentStepId,
                status: ApprovalStatus.PENDING
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

            // Define the request update parameters
            const updateRequestParams = {
                status: companyApprovalStatus
            };

            // Update the main trip request status
            await prisma.tripRequest.update({
                where: queryWhere,
                data: updateRequestParams
            });

            // Define the workflow action logging data
            const logActorId = request.userId;
            const logRequestId = request.id;
            const logActionType = "SUBMITTED";
            const logCommentText = "Request submitted for approval.";

            const workflowActionData = {
                requestId: logRequestId,
                actorId: logActorId,
                action: logActionType,
                comment: logCommentText
            };

            // Record the submission event in the workflow action log
            await prisma.workflowAction.create({
                data: workflowActionData
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
                    action: "REJECTED",
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
                    action: "APPROVED_STEP",
                    comment: transitionLogComment
                };

                await prisma.workflowAction.create({
                    data: stepActionPayload
                });
            }
        } else {
            // Handle completion of the final approval step
            const finalRequestStatus = RequestStatus.PENDING_AGENT_ACTION;

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
                action: "APPROVED",
                comment: processCompleteComment
            };

            // Record the final approval event in the workflow log
            await prisma.workflowAction.create({
                data: finalActionPayload
            });
        }
    }
}
