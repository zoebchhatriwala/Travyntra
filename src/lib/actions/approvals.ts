
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ApprovalStatus, RequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { type ApprovalStepMetadata } from "@/types/workflow/auto-approval-policy";
import { WorkflowEngine } from "@/lib/workflow-engine";

/**
 * Interface representing a geographic location.
 */
import { type LocationDisplay as Location } from "@/types/common/location";

/**
 * Interface representing the structure of a pending approval result.
 */
export interface PendingApprovalResult {
    /** Unique identifier for the approval step */
    id: string;
    /** Unique identifier for the associated trip request */
    requestId: string;
    /** The title of the trip request */
    requestTitle: string;
    /** The destination of the trip */
    requestDestination: string;
    /** The scheduled start date of the trip */
    requestStartDate: Date;
    /** The scheduled end date of the trip */
    requestEndDate: Date;
    /** The estimated cost of the trip */
    requestBudget: number;
    /** The name of the user who made the request */
    requesterName: string | null;
    /** The email address of the requester */
    requesterEmail: string | null;
    /** The URL to the requester's avatar image */
    requesterAvatar: string | null;
    /** The name of the company the requester belongs to */
    companyName: string;
    /** The unique URL slug for the company */
    companySlug: string | null;
    /** The name of the current approval step */
    stepName: string;
    /** The sequential order of this step in the workflow */
    stepOrder: number;
    /** The timestamp when the approval step was created */
    createdAt: Date;
    /** The current user's specific approval status for this step */
    myApprovalStatus: ApprovalStatus;
}

/**
 * Retrieves all trip requests pending approval for the currently authenticated user.
 * 
 * @returns {Promise<PendingApprovalResult[]>} A list of pending approvals or an empty array.
 */
export async function getMyPendingApprovals(): Promise<PendingApprovalResult[]> {
    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Skip processing if the user is not authenticated
    const currentUserId = authSession?.user?.id;
    const isUnauthenticated = !currentUserId;
    if (isUnauthenticated) {
        return [];
    }

    try {
        // Find all approval steps where this user is an approver and the step is currently active
        const pendingApprovalsQuery = {
            where: {
                status: ApprovalStatus.PENDING,
                step: {
                    approvers: {
                        some: {
                            id: currentUserId
                        }
                    }
                },
                // identify if this specific user has already processed this step
                approvals: {
                    none: {
                        userId: currentUserId,
                        status: {
                            in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]
                        }
                    }
                }
            },
            include: {
                request: {
                    include: {
                        user: {
                            select: { name: true, email: true, avatarUrl: true }
                        },
                        company: {
                            select: { name: true, slug: true }
                        }
                    }
                },
                step: {
                    select: { name: true, order: true }
                },
                approvals: {
                    where: {
                        userId: currentUserId
                    },
                    select: {
                        status: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' as const
            }
        };

        // Execute the database retrieval for pending approval steps
        const pendingStepRecords = await prisma.requestApprovalStep.findMany(pendingApprovalsQuery);

        /**
         * Transforms a raw database approval record into a standardized PendingApprovalResult.
         * 
         * @param {any} approval - The raw database record.
         * @returns {PendingApprovalResult} The transformed result object.
         */
        const mapToPendingApproval = (approval: (typeof pendingStepRecords)[number]): PendingApprovalResult => {
            // Retrieve the request object from the approval record
            const tripRequestObj = approval.request;
            // Retrieve the requester (user) details
            const requesterObj = tripRequestObj.user;
            // Retrieve the company details
            const companyObj = tripRequestObj.company;
            // Retrieve the associated step metadata
            const stepObj = approval.step;

            // cast the destination JSON field to the Location interface
            const destinationLoc = tripRequestObj.destination as unknown as Location;
            // retrieve the city or formatted string for the destination
            const cityVal = destinationLoc?.city;
            const formattedVal = destinationLoc?.formatted;
            const finalDestinationStr = cityVal || formattedVal || "Unknown";

            // identify the requester's personal details
            const nameVal = requesterObj.name;
            const emailVal = requesterObj.email;
            const avatarVal = requesterObj.avatarUrl;

            // identify the company's organizational details
            const compNameVal = companyObj.name;
            const compSlugVal = companyObj.slug;

            // identify the current step's workflow details
            const sNameVal = stepObj.name;
            const sOrderVal = stepObj.order;

            // retrieve the first matching user approval status or fallback to PENDING
            const myPrevApproval = approval.approvals[0];
            const myCalculatedStatus = myPrevApproval?.status || ApprovalStatus.PENDING;

            // Retrieve the numeric budget and ensure it is treated as a number
            const budgetVal = parseMoney(tripRequestObj.budget);
            const budgetNum = moneyToDecimal(budgetVal);

            // Construct and return the finalized object
            const result: PendingApprovalResult = {
                id: approval.id,
                requestId: approval.requestId,
                requestTitle: tripRequestObj.title,
                requestDestination: finalDestinationStr,
                requestStartDate: tripRequestObj.startDate,
                requestEndDate: tripRequestObj.endDate,
                requestBudget: budgetNum,
                requesterName: nameVal,
                requesterEmail: emailVal,
                requesterAvatar: avatarVal,
                companyName: compNameVal,
                companySlug: compSlugVal,
                stepName: sNameVal,
                stepOrder: sOrderVal,
                createdAt: approval.createdAt,
                myApprovalStatus: myCalculatedStatus
            };

            return result;
        };

        // Process all retrieved records through the mapper
        const finalizedApprovalsList = pendingStepRecords.map(mapToPendingApproval);

        // Return the mapped list
        return finalizedApprovalsList;
    } catch (error) {
        // define error message label
        const errorLabel = "Error fetching pending approvals:";
        // Log the exception for system observability
        console.error(errorLabel, error);

        // Initialize empty collection
        const emptyList: PendingApprovalResult[] = [];
        // Return the empty list fallback
        return emptyList;
    }
}

/**
 * Parameters for processing an approval or rejection decision.
 */
interface ProcessApprovalParams {
    /** The unique identifier for the request approval step being processed */
    requestApprovalStepId: string;
    /** The action to perform (APPROVE or REJECT) */
    action: 'APPROVE' | 'REJECT';
    /** An optional text comment explaining the decision */
    comment?: string;
}

/**
 * Approves or rejects a specific trip request approval step for the current user.
 * 
 * @param {ProcessApprovalParams} params - The data required to process the approval.
 * @returns {Promise<Object>} A success or error object.
 */
export async function processApproval(params: ProcessApprovalParams): Promise<{ success?: boolean; error?: string }> {
    // Extract parameters
    const requestApprovalStepId = params.requestApprovalStepId;
    const action = params.action;
    const comment = params.comment;

    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Block the action if the user is not authenticated
    const activeUserId = authSession?.user?.id;
    const isUnauthenticated = !activeUserId;
    if (isUnauthenticated) {
        return { error: "Unauthenticated" };
    }

    try {
        // retrieve the targeted approval step with its hierarchical context
        const stepContextQuery = {
            where: {
                id: requestApprovalStepId
            },
            include: {
                step: {
                    include: {
                        approvers: {
                            select: {
                                id: true
                            }
                        },
                        workflow: {
                            include: {
                                steps: {
                                    orderBy: {
                                        order: 'asc' as const
                                    }
                                }
                            }
                        }
                    }
                },
                request: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        company: {
                            select: {
                                id: true,
                                slug: true
                            }
                        },
                        approvalSteps: {
                            include: {
                                step: true
                            },
                            orderBy: {
                                step: {
                                    order: 'asc' as const
                                }
                            }
                        }
                    }
                },
                approvals: true
            }
        };

        // execute step context retrieval
        const approvalStepRecord = await prisma.requestApprovalStep.findUnique(stepContextQuery);

        // reject if the approval step record does not exist
        if (!approvalStepRecord) {
            return { error: "Approval step not found" };
        }

        // identify the user's role in this step
        const authorizedApprovers = approvalStepRecord.step.approvers;
        const checkUserIdMatch = (a: { id: string }) => a.id === activeUserId;
        const isUserAuthorized = authorizedApprovers.some(checkUserIdMatch);

        // reject the action if the user is not an authorized approver for this step
        if (!isUserAuthorized) {
            return { error: "You are not authorized to approve this request" };
        }

        // determine the new status based on the selected action
        let targetStatus: ApprovalStatus = ApprovalStatus.REJECTED;
        const isApprovalAction = action === 'APPROVE';
        if (isApprovalAction) {
            targetStatus = ApprovalStatus.APPROVED;
        }

        // identify composite key criteria for upserting the user's decision
        const upsertWhereClause = {
            requestApprovalStepId_userId: {
                requestApprovalStepId: requestApprovalStepId,
                userId: activeUserId
            }
        };

        // identify creation payload
        const upsertCreatePayload = {
            requestApprovalStepId: requestApprovalStepId,
            userId: activeUserId,
            status: targetStatus,
            comment: comment
        };

        // identify update payload
        const now = new Date();
        const upsertUpdatePayload = {
            status: targetStatus,
            comment: comment,
            updatedAt: now
        };

        // Register the individual approver's decision (UPSERT)
        await prisma.userApproval.upsert({
            where: upsertWhereClause,
            create: upsertCreatePayload,
            update: upsertUpdatePayload
        });

        // retrieve all historical decisions for the current step to evaluate aggregate status
        const stepDecisionsQuery = {
            where: {
                requestApprovalStepId
            }
        };
        const allMemberApprovals = await prisma.userApproval.findMany(stepDecisionsQuery);

        // retrieve the configured logic type for this step (ANY vs ALL)
        const logicalStepType = approvalStepRecord.step.type;
        // initialize the resulting status for the aggregate step
        let aggregateStepStatus: ApprovalStatus = ApprovalStatus.PENDING;

        // identify if the step requires consensus
        const isAllType = logicalStepType === 'ALL';

        if (isAllType) {
            /** 
             * logic for ALL type: every assigned approver must provide an APPROVED signal.
             */
            const checkIfApproved = (approver: { id: string }) => {
                const searchPredicate = (a: { userId: string, status: ApprovalStatus }) => {
                    const idMatches = a.userId === approver.id;
                    const statusIsApproved = a.status === ApprovalStatus.APPROVED;
                    return idMatches && statusIsApproved;
                };
                return allMemberApprovals.some(searchPredicate);
            };
            // Check if all designated approvers have submitted approvals
            const totalConsensusReached = authorizedApprovers.every(checkIfApproved);

            /** 
             * identify if any individual has submitted a REJECTED signal.
             */
            const rejectionPredicate = (a: { status: ApprovalStatus }) => a.status === ApprovalStatus.REJECTED;
            const hasAnyMemberRejected = allMemberApprovals.some(rejectionPredicate);

            // update status accordingly
            if (hasAnyMemberRejected) {
                aggregateStepStatus = ApprovalStatus.REJECTED;
            } else if (totalConsensusReached) {
                aggregateStepStatus = ApprovalStatus.APPROVED;
            }
        } else {
            /** 
             * logic for ANY type: a single APPROVED signal is sufficient.
             */
            const approvalPredicate = (a: { status: ApprovalStatus }) => a.status === ApprovalStatus.APPROVED;
            const anyMemberHasApproved = allMemberApprovals.some(approvalPredicate);

            /** 
             * logic for rejection: if ALL assigned approvers reject, the step is rejected.
             */
            const checkIfRejected = (approver: { id: string }) => {
                const searchPredicate = (a: { userId: string, status: ApprovalStatus }) => {
                    const idMatches = a.userId === approver.id;
                    const statusIsRejected = a.status === ApprovalStatus.REJECTED;
                    return idMatches && statusIsRejected;
                };
                return allMemberApprovals.some(searchPredicate);
            };
            const unanimityInRejection = authorizedApprovers.every(checkIfRejected);

            // update status
            if (anyMemberHasApproved) {
                aggregateStepStatus = ApprovalStatus.APPROVED;
            } else if (unanimityInRejection) {
                aggregateStepStatus = ApprovalStatus.REJECTED;
            }
        }

        // Apply any status change to the underlying request approval step
        await prisma.requestApprovalStep.update({
            where: {
                id: requestApprovalStepId
            },
            data: {
                status: aggregateStepStatus
            }
        });

        // Retrieve the company identifier from the session
        const actorCompanyId = authSession.user.companyId;

        // determine the action label for the activity log
        let logActionString: "REQUEST_APPROVED" | "REQUEST_REJECTED" = "REQUEST_REJECTED";
        if (isApprovalAction) {
            logActionString = "REQUEST_APPROVED";
        }

        // identify the textual description for the log
        const actorName = authSession.user.name;
        const actionVerb = isApprovalAction ? 'approved' : 'rejected';
        const requestTitle = approvalStepRecord.request.title;
        const currentStepName = approvalStepRecord.step.name;
        const logDescription = `${actorName} ${actionVerb} "${requestTitle}" at step "${currentStepName}"`;

        // Record the event in the central activity log
        await prisma.activityLog.create({
            data: {
                companyId: actorCompanyId!,
                actorId: activeUserId,
                action: logActionString,
                description: logDescription,
                metadata: {
                    requestId: approvalStepRecord.requestId,
                    stepId: approvalStepRecord.stepId,
                    comment: comment
                }
            }
        });

        // define properties for the requester notification
        const requesterUserId = approvalStepRecord.request.user.id;
        const notificationTitle = isApprovalAction ? "Request Approved" : "Request Rejected";
        const notificationMessage = `${actorName} ${actionVerb} your request "${requestTitle}"`;
        const notificationType = isApprovalAction ? "SUCCESS" as const : "ERROR" as const;
        const companySlugValue = approvalStepRecord.request.company.slug;
        const requestRelativeLink = `/company/${companySlugValue}/dashboard/requests/${approvalStepRecord.requestId}`;

        // define the notification payload
        const requesterNotificationPayload = {
            userId: requesterUserId,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: requestRelativeLink,
            sendEmail: true
        };

        // Notify the author of the trip request
        await createNotification(requesterNotificationPayload);

        // retrieve the final step status value
        const currentAggregateStatus = aggregateStepStatus;

        /**
         * Handle forward progression if the current step has been successfully APPROVED.
         */
        if (currentAggregateStatus === ApprovalStatus.APPROVED) {
            // Identify the order of the completed step
            const currentStepOrderValue = approvalStepRecord.step.order;

            // Delegate workflow transition (next step calculation, notifications, status updates)
            // to the centralized Workflow Engine.
            await WorkflowEngine.moveToNextStep(
                approvalStepRecord.requestId,
                currentStepOrderValue,
                activeUserId
            );

            return { success: true };

        } else if (currentAggregateStatus === ApprovalStatus.REJECTED) {
            /** 
             * Handle rejection: Rejection at any step halts the workflow and terminates the request.
             */
            await prisma.tripRequest.update({
                where: {
                    id: approvalStepRecord.requestId
                },
                data: {
                    status: 'REJECTED'
                }
            });
        }

        // define paths to refresh in the application cache
        const dashboardBasePath = `/company/${companySlugValue}/dashboard`;
        const requestDetailPath = `${dashboardBasePath}/requests/${approvalStepRecord.requestId}`;
        const approvalsListPagePath = `${dashboardBasePath}/approvals`;

        // apply revalidation to ensure fresh data in the UI
        revalidatePath(dashboardBasePath);
        revalidatePath(requestDetailPath);
        revalidatePath(approvalsListPagePath);

        // BULK APPROVAL LOGIC: recursively apply decisions to child trips if it is a GROUP trip
        const bulkCheckQuery = {
            where: {
                id: approvalStepRecord.requestId
            },
            select: {
                isGroup: true,
                childTrips: {
                    select: {
                        id: true
                    }
                }
            }
        };
        const groupRequestDetails = await prisma.tripRequest.findUnique(bulkCheckQuery);

        // identify if group logic should trigger
        const isGroupMaster = !!groupRequestDetails?.isGroup;
        const hasChildren = (groupRequestDetails?.childTrips?.length || 0) > 0;

        if (isGroupMaster && hasChildren) {
            // retrieve IDs of all child trips
            const childTripsList = groupRequestDetails!.childTrips;
            const childTripIdsArr = childTripsList.map((c: { id: string }) => c.id);

            // Fetch matching pending steps for the children that correspond to the same workflow definition
            const childStepsQuery = {
                where: {
                    requestId: {
                        in: childTripIdsArr
                    },
                    stepId: approvalStepRecord.stepId,
                    status: ApprovalStatus.PENDING
                },
                select: {
                    id: true
                }
            };
            const childStepRecordsToProcess = await prisma.requestApprovalStep.findMany(childStepsQuery);

            // retrieve common comment modifier
            const baseComment = comment || "";
            const bulkSuffix = " (Bulk action from group trip)";
            const automatedCommentText = `${baseComment}${bulkSuffix}`.trim();

            /** 
             * define function to process a single child step in the background.
             */
            const processChildStepEntry = (child: { id: string }) => {
                const childParams: ProcessApprovalParams = {
                    requestApprovalStepId: child.id,
                    action: action,
                    comment: automatedCommentText
                };
                // call processApproval recursively for each child trip
                return processApproval(childParams);
            };

            // execute bulk processing for all children
            await Promise.all(childStepRecordsToProcess.map(processChildStepEntry));
        }

        // Return the final success indicator
        return { success: true };
    } catch (operationError) {
        // define error context label
        const processingErrorLabel = "Error processing approval:";
        // Log the failure to the console
        console.error(processingErrorLabel, operationError);

        // Return a generic error message to the UI
        return { error: "Failed to process approval" };
    }
}

import { type WorkflowProgressStep } from "@/types/workflow/step";
import { moneyToDecimal, parseMoney } from "../utils/money";


/**
 * Interface representing the progress of an individual approval step.
 */
export type ApprovalProgressStep = WorkflowProgressStep;

/**
 * Gathers and formats the full approval workflow history and progress for a specific trip request.
 * 
 * @param {string} requestId - The ID of the trip request to inspect.
 * @returns {Promise<ApprovalProgressStep[] | null>} A list of step progress objects or null if unauthenticated.
 */
export async function getRequestApprovalProgress(requestId: string): Promise<ApprovalProgressStep[] | null> {
    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Skip if the user is not authenticated
    const currentUserId = authSession?.user?.id;
    const isUnauthenticated = !currentUserId;
    if (isUnauthenticated) {
        return null;
    }

    try {
        // retrieve all sequence-ordered approval steps for the request
        const progressStepsQuery = {
            where: {
                requestId
            },
            include: {
                step: {
                    include: {
                        approvers: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                                role: true
                            }
                        }
                    }
                },
                approvals: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                step: {
                    order: 'asc' as const
                }
            }
        };

        // Fetch step records from the database
        const rawStepsCollection = await prisma.requestApprovalStep.findMany(progressStepsQuery);

        /**
         * Maps a raw database step record to the standardized progress structure.
         */
        const mapToProgressStep = (step: (typeof rawStepsCollection)[number]): ApprovalProgressStep => {
            // retrieve definition properties
            const stepDefinition = step.step;
            const definitionApprovers = stepDefinition.approvers;

            // map raw individual approval records to simplified structures
            const individualDecisions = step.approvals.map((a) => {
                const decUser = a.user;
                return {
                    userId: a.userId,
                    userName: decUser.name,
                    userAvatar: decUser.avatarUrl,
                    status: a.status,
                    comment: a.comment || null, // ensure null if undefined
                    updatedAt: a.updatedAt
                };
            });

            // Map approvers to match UserProfile structure
            const mappedApprovers = definitionApprovers.map(a => ({
                id: a.id,
                name: a.name,
                email: a.email,
                avatarUrl: a.avatarUrl,
                role: a.role
            }));

            // construct the progress record
            const result: ApprovalProgressStep = {
                id: step.id,
                stepName: stepDefinition.name,
                stepOrder: stepDefinition.order,
                stepType: stepDefinition.type,
                kind: stepDefinition.kind,
                status: step.status,
                approvers: mappedApprovers,
                approvals: individualDecisions,
                createdAt: step.createdAt,
                updatedAt: step.updatedAt,
                metadata: (step.metadata as unknown as ApprovalStepMetadata) || undefined
            };

            return result;
        };

        // Process all retrieved records through the mapper
        const finalizedStepsList = rawStepsCollection.map(mapToProgressStep);

        // Return the mapped list
        return finalizedStepsList;
    } catch (error) {
        // define specific error log label
        const progressErrorLabel = "Error fetching approval progress:";
        // Log the exception
        console.error(progressErrorLabel, error);

        // Return null to signal a failure to retrieve progress
        return null;
    }
}

/**
 * Resets all pending approval steps for trip requests that are currently waiting for company approval.
 * This is typically triggered by an update to the company's global approval workflow configuration.
 * 
 * @param {string} companyId - The ID of the company whose requests should be reset.
 * @param {string} editorId - The ID of the user who initiated the workflow change.
 * @returns {Promise<Object>} A summary of the reset operation.
 */
export async function resetPendingApprovalSteps(companyId: string, editorId: string): Promise<{ success?: boolean; error?: string; message?: string; requestsReset?: number; notifiedUsers?: number; }> {
    try {
        // Retrieve the current active workflow definition for the specified company
        const workflowQuery = {
            where: {
                companyId
            },
            include: {
                steps: {
                    where: {
                        deletedAt: null
                    },
                    orderBy: {
                        order: 'asc' as const
                    },
                    include: {
                        approvers: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                company: {
                    select: {
                        slug: true
                    }
                }
            }
        };
        const activeWorkflowObj = await prisma.approvalWorkflow.findUnique(workflowQuery);

        // identify if a valid workflow exists
        const workflowMissing = !activeWorkflowObj;
        const noStepsDefined = activeWorkflowObj?.steps.length === 0;

        // Exit early if there is no workflow to apply
        if (workflowMissing || noStepsDefined) {
            const emptyNotice = {
                success: true,
                message: "No workflow configured",
                requestsReset: 0
            };
            return emptyNotice;
        }

        // identify the set of requests currently pending approval for this company
        const candidatesQuery = {
            where: {
                companyId: companyId,
                status: RequestStatus.PENDING_COMPANY_APPROVAL
            },
            select: {
                id: true,
                title: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        };
        const targetRequestsToReset = await prisma.tripRequest.findMany(candidatesQuery);

        // Check if there are any target requests
        const nothingToReset = targetRequestsToReset.length === 0;

        // If no requests matches the criteria
        if (nothingToReset) {
            const noPendingNotice = {
                success: true,
                message: "No pending requests to reset",
                requestsReset: 0
            };
            return noPendingNotice;
        }

        // track the number of successfully reset requests
        let totalResetCount = 0;
        // set to track users whom we have already notified about the reset
        const notifiedUserSet = new Set<string>();

        // extract workflow steps for reuse
        const newWorkflowStepsList = activeWorkflowObj!.steps;
        // retrieve the company slug for linking
        const companySlugValue = activeWorkflowObj!.company.slug;

        // Process each candidate request sequentially within localized transactions
        for (const targetRequestItem of targetRequestsToReset) {
            // retrieve essential request metadata
            const reqId = targetRequestItem.id;
            const reqAuthorId = targetRequestItem.user.id;
            const reqTitleText = targetRequestItem.title;

            // define transaction logic
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const executionTransaction = async (tx: any) => {
                // 1. CLEAR EXISTING APPROVAL DATA FOR THE REQUEST

                // retrieve current active step IDs for deletion
                const oldStepsQuery = {
                    where: {
                        requestId: reqId
                    },
                    select: {
                        id: true
                    }
                };
                const existingStepsToDelete = await tx.requestApprovalStep.findMany(oldStepsQuery);

                // If steps exist
                if (existingStepsToDelete.length > 0) {
                    // Extract IDs for bulk deletion of specific user decisions
                    const existingStepIdsArr = existingStepsToDelete.map((s: { id: string }) => s.id);
                    const decisionCleanupQuery = {
                        where: {
                            requestApprovalStepId: {
                                in: existingStepIdsArr
                            }
                        }
                    };
                    // Wipe all individual decisions recorded for the old steps
                    await tx.userApproval.deleteMany(decisionCleanupQuery);

                    // define cleanup query for the steps themselves
                    const stepsCleanupQuery = {
                        where: {
                            requestId: reqId
                        }
                    };
                    // Wipe the progressive approval step records for this request
                    await tx.requestApprovalStep.deleteMany(stepsCleanupQuery);
                }

                // 2. RECONSTRUCT APPROVAL STEPS ACCORDING TO THE UPDATED WORKFLOW

                for (let stepIdx = 0; stepIdx < newWorkflowStepsList.length; stepIdx++) {
                    // retrieve the specific step definition
                    const stepDefObj = newWorkflowStepsList[stepIdx];
                    // identify if this step should be immediately active (the first step)
                    const isTheFirstItem = stepIdx === 0;
                    let initialStepStatus: ApprovalStatus = ApprovalStatus.WAITING;
                    if (isTheFirstItem) {
                        initialStepStatus = ApprovalStatus.PENDING;
                    }

                    // define the data for the new request approval step record
                    const newStepRecordData = {
                        requestId: reqId,
                        stepId: stepDefObj.id,
                        status: initialStepStatus
                    };

                    // construct the new step record in the database
                    await tx.requestApprovalStep.create({
                        data: newStepRecordData
                    });
                }

                // 3. RECORD THE RESET ACTION IN THE ACTIVITY LOG
                const logLabel = 'WORKFLOW_UPDATED_APPROVALS_RESET';
                const logDescriptionText = `Approval workflow updated - "${reqTitleText}" approval steps reset`;

                // define log record payload
                const resetLogPayload = {
                    companyId: companyId,
                    actorId: editorId,
                    action: logLabel,
                    description: logDescriptionText,
                    metadata: {
                        requestId: reqId,
                        newStepsCount: newWorkflowStepsList.length
                    }
                };

                // append the entry to the activity log
                await tx.activityLog.create({
                    data: resetLogPayload
                });
            };

            // execute the encapsulated data modifications as a safe atomic transaction
            await prisma.$transaction(executionTransaction);

            // Increment the counter upon successful transaction completion
            totalResetCount = totalResetCount + 1;

            // 4. NOTIFY THE AUTHOR OF THE TRIP REQUEST

            // check if the author has been previously notified in this single session
            const authorAlreadyNotified = notifiedUserSet.has(reqAuthorId);

            // If the author needs notification
            if (!authorAlreadyNotified) {
                // define notification properties
                const userNoticeTitle = "Approval Workflow Updated";
                const userNoticeMsg = `The approval workflow has been updated. Your request "${reqTitleText}" will be reviewed under the new process.`;
                const userNoticeLink = `/company/${companySlugValue}/dashboard/requests/${reqId}`;

                // define full notification payload
                const userUpdateNotification = {
                    userId: reqAuthorId,
                    title: userNoticeTitle,
                    message: userNoticeMsg,
                    type: "INFO" as const,
                    link: userNoticeLink,
                    sendEmail: false
                };

                // Dispatch the notification task
                await createNotification(userUpdateNotification);

                // Register the user as notified
                notifiedUserSet.add(reqAuthorId);
            }
        }

        // 5. ALERT THE APPROVERS ASSIGNED TO THE FIRST STEP OF THE NEW WORKFLOW

        // identify the primary step definition
        const initialWorkflowStepDef = newWorkflowStepsList[0];
        // identify approvers for the primary step
        const initialApproversCollection = initialWorkflowStepDef?.approvers || [];
        // identify count of approvers
        const hasStartApprovers = initialApproversCollection.length > 0;

        // If approvers exist for the first stage
        if (hasStartApprovers) {
            // construct a comma-separated list of all reset request titles for the alert message
            const mapTitleToString = (r: { title: string }) => r.title;
            const titlesStringsArray = targetRequestsToReset.map(mapTitleToString);
            const concatenatedTitles = titlesStringsArray.join('", "');

            // define approver alert properties
            const approverAlertTitle = "Workflow Updated - Approvals Needed";
            const approverAlertMsg = `The approval workflow was updated. ${totalResetCount} request(s) need your review: "${concatenatedTitles}"`;
            const approverAlertLink = `/company/${companySlugValue}/dashboard/approvals`;

            /** 
             * define notification dispatch logic for an individual approver.
             */
            const dispatchApproverNotice = (approver: { id: string }) => {
                const approverIdValue = approver.id;
                // define notification payload
                const alertPayload = {
                    userId: approverIdValue,
                    title: approverAlertTitle,
                    message: approverAlertMsg,
                    type: "INFO" as const,
                    link: approverAlertLink,
                    sendEmail: true
                };
                // Dispatch
                return createNotification(alertPayload);
            };

            // bulk dispatch messages to all concerned approvers
            await Promise.all(initialApproversCollection.map(dispatchApproverNotice));
        }

        // define paths for cache clearance
        const approvalsDashboardPath = `/company/${companySlugValue}/dashboard/approvals`;
        const requestsDashboardPath = `/company/${companySlugValue}/dashboard/requests`;

        // apply path revalidation
        revalidatePath(approvalsDashboardPath);
        revalidatePath(requestsDashboardPath);

        // construct the final summary result object
        const finalResetSummary = {
            success: true,
            message: `Reset ${totalResetCount} pending request(s) with new workflow`,
            requestsReset: totalResetCount,
            notifiedUsers: notifiedUserSet.size
        };

        // return the summary
        return finalResetSummary;
    } catch (criticalError) {
        // define specific error log label
        const resetErrorLabel = "Error resetting pending approval steps:";
        // Log the exception for forensic analysis
        console.error(resetErrorLabel, criticalError);

        // Return a generic error notice
        const failureResponseObj = {
            error: "Failed to reset pending approval steps"
        };
        return failureResponseObj;
    }
}
