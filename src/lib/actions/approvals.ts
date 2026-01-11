"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

/**
 * Get all requests pending approval for the current user
 */
export async function getMyPendingApprovals() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    try {
        // Find all approval steps where this user is an approver and status is PENDING
        const pendingApprovals = await prisma.requestApprovalStep.findMany({
            where: {
                status: ApprovalStatus.PENDING,
                step: {
                    approvers: {
                        some: {
                            id: session.user.id
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
                    where: { userId: session.user.id },
                    select: { status: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return pendingApprovals.map(approval => ({
            id: approval.id,
            requestId: approval.requestId,
            requestTitle: approval.request.title,
            requestDestination: approval.request.destination,
            requestStartDate: approval.request.startDate,
            requestEndDate: approval.request.endDate,
            requestBudget: Number(approval.request.budget || 0),
            requesterName: approval.request.user.name,
            requesterEmail: approval.request.user.email,
            requesterAvatar: approval.request.user.avatarUrl,
            companyName: approval.request.company.name,
            companySlug: approval.request.company.slug,
            stepName: approval.step.name,
            stepOrder: approval.step.order,
            createdAt: approval.createdAt,
            myApprovalStatus: approval.approvals[0]?.status || ApprovalStatus.PENDING
        }));
    } catch (e) {
        console.error("Error fetching pending approvals:", e);
        return [];
    }
}

/**
 * Approve or reject a request approval step
 */
export async function processApproval({
    requestApprovalStepId,
    action,
    comment
}: {
    requestApprovalStepId: string;
    action: 'APPROVE' | 'REJECT';
    comment?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        // Get the approval step with all necessary data
        const approvalStep = await prisma.requestApprovalStep.findUnique({
            where: { id: requestApprovalStepId },
            include: {
                step: {
                    include: {
                        approvers: { select: { id: true } },
                        workflow: {
                            include: {
                                steps: {
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    }
                },
                request: {
                    include: {
                        user: { select: { id: true, name: true } },
                        company: { select: { slug: true } },
                        approvalSteps: {
                            include: {
                                step: true
                            },
                            orderBy: {
                                step: { order: 'asc' }
                            }
                        }
                    }
                },
                approvals: true
            }
        });

        if (!approvalStep) {
            return { error: "Approval step not found" };
        }

        // Verify user is an approver for this step
        const isApprover = approvalStep.step.approvers.some(a => a.id === session.user.id);
        if (!isApprover) {
            return { error: "You are not authorized to approve this request" };
        }

        // Create or update the user's approval
        const newStatus = action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

        await prisma.userApproval.upsert({
            where: {
                requestApprovalStepId_userId: {
                    requestApprovalStepId,
                    userId: session.user.id
                }
            },
            create: {
                requestApprovalStepId,
                userId: session.user.id,
                status: newStatus,
                comment
            },
            update: {
                status: newStatus,
                comment,
                updatedAt: new Date()
            }
        });

        // Check if all required approvals are met
        const allApprovals = await prisma.userApproval.findMany({
            where: { requestApprovalStepId }
        });

        const stepType = approvalStep.step.type;
        let stepStatus: ApprovalStatus = ApprovalStatus.PENDING;

        if (stepType === 'ALL') {
            // ALL approvers must approve
            const allApproved = approvalStep.step.approvers.every(approver =>
                allApprovals.some(a => a.userId === approver.id && a.status === ApprovalStatus.APPROVED)
            );
            const anyRejected = allApprovals.some(a => a.status === ApprovalStatus.REJECTED);

            if (anyRejected) {
                stepStatus = ApprovalStatus.REJECTED;
            } else if (allApproved) {
                stepStatus = ApprovalStatus.APPROVED;
            }
        } else {
            // ANY approver can approve
            const anyApproved = allApprovals.some(a => a.status === ApprovalStatus.APPROVED);
            const allRejected = approvalStep.step.approvers.every(approver =>
                allApprovals.some(a => a.userId === approver.id && a.status === ApprovalStatus.REJECTED)
            );

            if (anyApproved) {
                stepStatus = ApprovalStatus.APPROVED;
            } else if (allRejected) {
                stepStatus = ApprovalStatus.REJECTED;
            }
        }

        // Update the approval step status
        await prisma.requestApprovalStep.update({
            where: { id: requestApprovalStepId },
            data: { status: stepStatus }
        });

        // Create activity log
        await prisma.activityLog.create({
            data: {
                companyId: session.user.companyId!,
                actorId: session.user.id,
                action: action === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
                description: `${session.user.name} ${action === 'APPROVE' ? 'approved' : 'rejected'} "${approvalStep.request.title}" at step "${approvalStep.step.name}"`,
                metadata: {
                    requestId: approvalStep.requestId,
                    stepId: approvalStep.stepId,
                    comment
                }
            }
        });

        // Notify the requester
        await createNotification({
            userId: approvalStep.request.user.id,
            title: action === 'APPROVE' ? "Request Approved" : "Request Rejected",
            message: `${session.user.name} ${action === 'APPROVE' ? 'approved' : 'rejected'} your request "${approvalStep.request.title}"`,
            type: action === 'APPROVE' ? "SUCCESS" : "ERROR",
            link: `/company/${approvalStep.request.company.slug}/dashboard/requests/${approvalStep.requestId}`
        });

        // If step is completed, check if we need to move to next step or complete the request
        if (stepStatus === ApprovalStatus.APPROVED) {
            const currentStepOrder = approvalStep.step.order;
            const nextStep = approvalStep.request.approvalSteps.find(
                s => s.step.order === currentStepOrder + 1
            );

            if (!nextStep) {
                // No more steps, mark request as approved
                await prisma.tripRequest.update({
                    where: { id: approvalStep.requestId },
                    data: { status: 'APPROVED' }
                });

                await createNotification({
                    userId: approvalStep.request.user.id,
                    title: "Request Fully Approved!",
                    message: `Your request "${approvalStep.request.title}" has been fully approved and is ready for fulfillment`,
                    type: "SUCCESS",
                    link: `/company/${approvalStep.request.company.slug}/dashboard/requests/${approvalStep.requestId}`
                });
            } else {
                // Notify approvers of the next step
                const nextStepApprovers = await prisma.workflowStep.findUnique({
                    where: { id: nextStep.stepId },
                    include: { approvers: { select: { id: true, name: true } } }
                });

                if (nextStepApprovers) {
                    await Promise.all(
                        nextStepApprovers.approvers.map(approver =>
                            createNotification({
                                userId: approver.id,
                                title: "New Approval Request",
                                message: `"${approvalStep.request.title}" requires your approval`,
                                type: "INFO",
                                link: `/company/${approvalStep.request.company.slug}/dashboard/requests/${approvalStep.requestId}`
                            })
                        )
                    );
                }
            }
        } else if (stepStatus === ApprovalStatus.REJECTED) {
            // Rejection stops the workflow
            await prisma.tripRequest.update({
                where: { id: approvalStep.requestId },
                data: { status: 'REJECTED' }
            });
        }

        revalidatePath(`/company/${approvalStep.request.company.slug}/dashboard`);
        revalidatePath(`/company/${approvalStep.request.company.slug}/dashboard/requests/${approvalStep.requestId}`);
        revalidatePath(`/company/${approvalStep.request.company.slug}/dashboard/approvals`);

        // BULK APPROVAL LOGIC: If this is a group trip, apply the same action to child trips
        const requestDetails = await (prisma.tripRequest as any).findUnique({
            where: { id: approvalStep.requestId },
            select: { isGroup: true, childTrips: { select: { id: true } } }
        });

        if (requestDetails?.isGroup && requestDetails.childTrips.length > 0) {
            // Find matching approval steps for child trips
            const childStepIds = await (prisma.requestApprovalStep as any).findMany({
                where: {
                    requestId: { in: requestDetails.childTrips.map((c: any) => c.id) },
                    stepId: approvalStep.stepId,
                    status: ApprovalStatus.PENDING
                },
                select: { id: true }
            });

            // Process each child step
            // Note: We use a loop here but in a real-world high-scale app we might use a background job
            for (const childStep of childStepIds) {
                // To avoid infinite recursion and properly handle each child's specific workflow state, 
                // we call processApproval recursively but we MUST ensure we don't loop back.
                // Since child trips cannot be parents of their own parent, this is safe from infinite recursion.
                await processApproval({
                    requestApprovalStepId: childStep.id,
                    action,
                    comment: comment ? `${comment} (Bulk action from group trip)` : "(Bulk action from group trip)"
                });
            }
        }

        return { success: true };
    } catch (e) {
        console.error("Error processing approval:", e);
        return { error: "Failed to process approval" };
    }
}

/**
 * Get approval workflow progress for a specific request
 */
export async function getRequestApprovalProgress(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    try {
        const approvalSteps = await prisma.requestApprovalStep.findMany({
            where: { requestId },
            include: {
                step: {
                    include: {
                        approvers: {
                            select: { id: true, name: true, avatarUrl: true, role: true }
                        }
                    }
                },
                approvals: {
                    include: {
                        user: {
                            select: { name: true, avatarUrl: true }
                        }
                    }
                }
            },
            orderBy: {
                step: { order: 'asc' }
            }
        });

        return approvalSteps.map(step => ({
            id: step.id,
            stepName: step.step.name,
            stepOrder: step.step.order,
            stepType: step.step.type,
            status: step.status,
            approvers: step.step.approvers,
            approvals: step.approvals.map(a => ({
                userId: a.userId,
                userName: a.user.name,
                userAvatar: a.user.avatarUrl,
                status: a.status,
                comment: a.comment,
                updatedAt: a.updatedAt
            })),
            createdAt: step.createdAt,
            updatedAt: step.updatedAt
        }));
    } catch (e) {
        console.error("Error fetching approval progress:", e);
        return null;
    }
}
