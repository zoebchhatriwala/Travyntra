import { prisma } from "./prisma";
import { RequestStatus, ApprovalType, ApprovalStatus } from "@prisma/client";

export class WorkflowEngine {
    /**
     * Initializes the approval workflow for a new trip request.
     */
    static async startWorkflow(requestId: string) {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: { company: { include: { workflow: { include: { steps: { orderBy: { order: "asc" }, include: { approvers: true } } } } } } }
        });

        if (!request) throw new Error("Request not found");

        const workflow = request.company.workflow;

        // If no workflow is defined, skip directly to agent action
        if (!workflow || workflow.steps.length === 0) {
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: { status: RequestStatus.PENDING_AGENT_ACTION }
            });
            return;
        }

        // Initialize all steps for this request
        for (const step of workflow.steps) {
            await prisma.requestApprovalStep.create({
                data: {
                    requestId: request.id,
                    stepId: step.id,
                    status: ApprovalStatus.PENDING
                }
            });
        }

        // Activate the first step
        const firstStep = workflow.steps[0];
        const requestStep = await prisma.requestApprovalStep.findUnique({
            where: { requestId_stepId: { requestId: request.id, stepId: firstStep.id } }
        });

        if (requestStep) {
            // Create user approval entries for the first step's approvers
            await prisma.userApproval.createMany({
                data: firstStep.approvers.map(approver => ({
                    requestApprovalStepId: requestStep.id,
                    userId: approver.id,
                    status: ApprovalStatus.PENDING
                }))
            });

            await prisma.tripRequest.update({
                where: { id: requestId },
                data: { status: RequestStatus.PENDING_COMPANY_APPROVAL }
            });

            // Log action
            await prisma.workflowAction.create({
                data: {
                    requestId: request.id,
                    actorId: request.userId,
                    action: "SUBMITTED",
                    comment: "Request submitted for approval."
                }
            });
        }
    }

    /**
     * Processes a user's approval/rejection decision.
     */
    static async processUserApproval(
        requestId: string,
        userId: string,
        approvalStatus: ApprovalStatus,
        comment?: string
    ) {
        // Find the current active step and the user's approval entry
        const requestApprovalStep = await prisma.requestApprovalStep.findFirst({
            where: {
                requestId: requestId,
                status: ApprovalStatus.PENDING
            },
            include: {
                step: { include: { approvers: true } },
                approvals: true
            },
            orderBy: { step: { order: "asc" } }
        });

        if (!requestApprovalStep) throw new Error("No active approval step found for this request.");

        const userApproval = requestApprovalStep.approvals.find(a => a.userId === userId);
        if (!userApproval) throw new Error("User is not an authorized approver for this step.");
        if (userApproval.status !== ApprovalStatus.PENDING) throw new Error("User has already acted on this request.");

        // Update user's approval status
        await prisma.userApproval.update({
            where: { id: userApproval.id },
            data: {
                status: approvalStatus,
                comment
            }
        });

        // Check if the step status should change
        const updatedApprovals = await prisma.userApproval.findMany({
            where: { requestApprovalStepId: requestApprovalStep.id }
        });

        let stepIsComplete = false;
        let stepFinalStatus: ApprovalStatus = ApprovalStatus.PENDING;

        if (approvalStatus === ApprovalStatus.REJECTED) {
            // If anyone rejects, the step (and request) is rejected
            stepIsComplete = true;
            stepFinalStatus = ApprovalStatus.REJECTED;
        } else {
            // Check based on ANY vs ALL
            if (requestApprovalStep.step.type === ApprovalType.ANY) {
                // If ANY can approve, and we just got an approval
                stepIsComplete = true;
                stepFinalStatus = ApprovalStatus.APPROVED;
            } else {
                // If ALL must approve, check if everyone has approved
                const allApproved = updatedApprovals.every(a => a.status === ApprovalStatus.APPROVED);
                if (allApproved) {
                    stepIsComplete = true;
                    stepFinalStatus = ApprovalStatus.APPROVED;
                }
            }
        }

        if (stepIsComplete) {
            await prisma.requestApprovalStep.update({
                where: { id: requestApprovalStep.id },
                data: { status: stepFinalStatus }
            });

            if (stepFinalStatus === ApprovalStatus.REJECTED) {
                // Reject the whole request
                await prisma.tripRequest.update({
                    where: { id: requestId },
                    data: { status: RequestStatus.REJECTED }
                });

                await prisma.workflowAction.create({
                    data: {
                        requestId,
                        actorId: userId,
                        action: "REJECTED",
                        comment: comment || "Request rejected by internal approver."
                    }
                });
            } else {
                // Logic for moving to next step
                await this.moveToNextStep(requestId, requestApprovalStep.step.order, userId);
            }
        }
    }

    private static async moveToNextStep(requestId: string, currentOrder: number, lastActorId: string) {
        const nextStep = await prisma.workflowStep.findFirst({
            where: {
                workflow: { company: { requests: { some: { id: requestId } } } },
                order: { gt: currentOrder }
            },
            orderBy: { order: "asc" },
            include: { approvers: true }
        });

        if (nextStep) {
            const nextRequestStep = await prisma.requestApprovalStep.findUnique({
                where: { requestId_stepId: { requestId, stepId: nextStep.id } }
            });

            if (nextRequestStep) {
                // Create user approval entries for the next step's approvers
                await prisma.userApproval.createMany({
                    data: nextStep.approvers.map(approver => ({
                        requestApprovalStepId: nextRequestStep.id,
                        userId: approver.id,
                        status: ApprovalStatus.PENDING
                    }))
                });

                await prisma.workflowAction.create({
                    data: {
                        requestId,
                        actorId: lastActorId,
                        action: "APPROVED_STEP",
                        comment: `Step ${currentOrder} approved. Moving to step ${nextStep.order}.`
                    }
                });
            }
        } else {
            // No more steps! Final approval.
            await prisma.tripRequest.update({
                where: { id: requestId },
                data: { status: RequestStatus.PENDING_AGENT_ACTION }
            });

            await prisma.workflowAction.create({
                data: {
                    requestId,
                    actorId: lastActorId,
                    action: "APPROVED",
                    comment: "Internal approval process complete. Pending agent action."
                }
            });
        }
    }
}
