import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { prismaMock } from '@/lib/test/helpers/prisma';
import {
    createMockTripRequest,
    createMockCompany,
    createMockWorkflow,
    createMockWorkflowStep,
    createMockUser,
    createMockRequestApprovalStep,
    createMockUserApproval
} from '@/lib/test/helpers/factories';
import {
    RequestStatus,
    ApprovalStatus,
    WorkflowActionType,
    NotificationType,
    WorkflowStepKind,
    UserRole,
    ApprovalType,
    type TripRequest,
    type RequestApprovalStep,
    type WorkflowStep,
    type User,
    type AgentBid,
    type WorkflowAction,
    type Message,
    type AgencyIntegration,
    type UserApproval,
    Prisma
} from '@prisma/client';
import { AutoApprovalEngine } from '@/lib/auto-approval-engine';
import { createNotification } from '@/lib/notifications';

// Mock dependencies
vi.mock('@/lib/auto-approval-engine', () => ({
    AutoApprovalEngine: {
        evaluateRequest: vi.fn(),
    },
}));

vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));

describe('WorkflowEngine', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('startWorkflow', () => {
        it('should initialize the workflow correctly for a request with manual approval steps', async () => {
            // Setup mock data
            const companyId = 'company-1';
            const userId = 'user-1';
            const requestId = 'request-1';
            const workflowId = 'workflow-1';

            const mockApprover = createMockUser({ id: 'approver-1' });
            const mockStep1 = createMockWorkflowStep({
                id: 'step-1',
                workflowId,
                order: 1,
                name: 'Manager Approval',
                approvers: [mockApprover]
            });
            const mockStep2 = createMockWorkflowStep({
                id: 'step-2',
                workflowId,
                order: 2,
                name: 'Finance Approval'
            });

            const mockWorkflow = createMockWorkflow({
                id: workflowId,
                companyId,
                steps: [mockStep1, mockStep2]
            });

            const mockCompany = createMockCompany({
                id: companyId,
                workflow: mockWorkflow
            });

            const mockRequest = createMockTripRequest({
                id: requestId,
                userId,
                companyId,
                title: 'Test Trip',
                company: mockCompany
            });

            // Mock Prisma calls
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            // Mock AutoApprovalEngine
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });

            const mockRequestStep1 = createMockRequestApprovalStep({ id: 'req-step-1', requestId, stepId: 'step-1' });
            prismaMock.requestApprovalStep.create.mockResolvedValueOnce(mockRequestStep1);
            prismaMock.requestApprovalStep.create.mockResolvedValueOnce(createMockRequestApprovalStep({ id: 'req-step-2', requestId, stepId: 'step-2' }));

            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockRequestStep1);

            // Execute
            await WorkflowEngine.startWorkflow(requestId);

            // Verifications

            // 1. Verify steps are created with correct initial statuses
            expect(prismaMock.requestApprovalStep.create).toHaveBeenCalledTimes(2);
            expect(prismaMock.requestApprovalStep.create).toHaveBeenNthCalledWith(1, {
                data: {
                    requestId,
                    stepId: 'step-1',
                    status: ApprovalStatus.PENDING
                }
            });
            expect(prismaMock.requestApprovalStep.create).toHaveBeenNthCalledWith(2, {
                data: {
                    requestId,
                    stepId: 'step-2',
                    status: ApprovalStatus.WAITING
                }
            });

            // 2. Verify user approvals are created for the first step
            expect(prismaMock.userApproval.createMany).toHaveBeenCalledWith({
                data: [
                    {
                        requestApprovalStepId: 'req-step-1',
                        userId: 'approver-1',
                        status: ApprovalStatus.PENDING
                    }
                ]
            });

            // 3. Verify request status is updated
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: { status: RequestStatus.PENDING_COMPANY_APPROVAL }
            });

            // 4. Verify workflow action is logged
            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith({
                data: {
                    requestId,
                    actorId: userId,
                    action: WorkflowActionType.SUBMITTED,
                    comment: "Request submitted for approval."
                }
            });

            // 5. Verify notification is sent
            expect(createNotification).toHaveBeenCalledWith({
                userId: 'approver-1',
                title: "New Approval Request",
                message: expect.stringContaining('Manager Approval'),
                type: NotificationType.INFO,
                link: expect.stringContaining(requestId),
                sendEmail: true
            });
        });

        it('should auto-approve the request if the policy engine says so', async () => {
            const requestId = 'request-1';
            const mockRequest = createMockTripRequest({ id: requestId, userId: 'user-1' });
            const mockStep = createMockWorkflowStep({ id: 'step-1' });
            const mockWorkflow = createMockWorkflow({ steps: [mockStep] });
            const mockCompany = createMockCompany({ workflow: mockWorkflow });
            (mockRequest as unknown as Record<string, unknown>).company = mockCompany;

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                reason: 'Under budget limit',
                matchedRule: { type: 'BUDGET_THRESHOLD', config: { limit: 50000 } }
            });

            await WorkflowEngine.startWorkflow(requestId);

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: { status: RequestStatus.APPROVED }
            });

            expect(prismaMock.requestApprovalStep.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: ApprovalStatus.APPROVED,
                    metadata: expect.objectContaining({
                        autoApproved: true,
                        reason: 'Under budget limit'
                    })
                })
            }));

            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: WorkflowActionType.AUTO_APPROVED
                })
            }));
        });

        it('should throw error if request not found', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);

            await expect(WorkflowEngine.startWorkflow('non-existent')).rejects.toThrow('Request not found');
        });

        it('should create user approvals if the first step has approvers', async () => {
            const workflowId = 'workflow-1';
            const companyId = 'company-1';
            const requestId = 'request-2';
            const approverId = 'approver-1';

            const mockApprovers = [{ id: approverId }];
            const mockStep1 = {
                id: 'step-1',
                order: 1,
                kind: WorkflowStepKind.INTERNAL_APPROVAL,
                approvers: mockApprovers
            };

            const mockRequest = createMockTripRequest({
                id: requestId,
                company: createMockCompany({
                    id: companyId,
                    workflow: {
                        id: workflowId,
                        steps: [mockStep1]
                    }
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });
            prismaMock.requestApprovalStep.create.mockResolvedValue({ id: 'req-step-1' } as unknown as RequestApprovalStep);
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue({ id: 'req-step-1', stepId: 'step-1' } as unknown as RequestApprovalStep);
            prismaMock.userApproval.createMany.mockResolvedValue({ count: 1 });

            await WorkflowEngine.startWorkflow(requestId);

            expect(prismaMock.userApproval.createMany).toHaveBeenCalledWith({
                data: [expect.objectContaining({ userId: approverId })]
            });
        });

        it('should approve immediately if no workflow is found', async () => {
            const requestId = 'request-no-workflow';
            const mockRequest = createMockTripRequest({
                id: requestId,
                company: createMockCompany({ workflow: null }) // No workflow
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });

            await WorkflowEngine.startWorkflow(requestId);

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: requestId },
                data: { status: RequestStatus.APPROVED }
            }));
            expect(prismaMock.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: 'REQUEST_CREATED' })
            }));
        });

        it('should move to PENDING_QUOTATION if the first step is AGENT_QUOTATION', async () => {
            const requestId = 'request-quotation';
            const mockStep = {
                id: 'step-quotation',
                order: 1,
                kind: WorkflowStepKind.AGENT_QUOTATION,
                approvers: []
            };

            const mockRequest = createMockTripRequest({
                id: requestId,
                company: createMockCompany({
                    workflow: { id: 'w1', steps: [mockStep] }
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });
            prismaMock.requestApprovalStep.create.mockResolvedValue({ id: 'req-step-1' } as unknown as RequestApprovalStep);
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue({ id: 'req-step-1', stepId: 'step-quotation' } as unknown as RequestApprovalStep);

            // Mock notifyAgentsForOpportunity dependencies
            prismaMock.agencyIntegration.findMany.mockResolvedValue([]);

            await WorkflowEngine.startWorkflow(requestId);

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: requestId },
                data: { status: RequestStatus.PENDING_QUOTATION }
            }));
            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: WorkflowActionType.SUBMITTED })
            }));
        });
    });

    describe('processUserApproval', () => {
        const requestId = 'request-1';
        const userId = 'user-1';

        it('should approve the step and move to next if approval type is ANY', async () => {
            const mockStep = createMockWorkflowStep({ order: 1, type: 'ANY' });
            const mockUserApproval = createMockUserApproval({ userId, status: ApprovalStatus.PENDING });
            const mockActiveStep = createMockRequestApprovalStep({
                id: 'active-step-1',
                requestId,
                step: mockStep as unknown as RequestApprovalStep,
                approvals: [mockUserApproval]
            });
            // Injective approvals into the mock object for findFirst result
            (mockActiveStep as unknown as Record<string, unknown>).approvals = [mockUserApproval];

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockActiveStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.update.mockResolvedValue(mockUserApproval);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { ...mockUserApproval, status: ApprovalStatus.APPROVED }
            ]);

            // Mock moveToNextStep
            const moveToNextStepSpy = vi.spyOn(WorkflowEngine, 'moveToNextStep').mockResolvedValue(undefined);

            await WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.APPROVED, 'Looks good');

            expect(prismaMock.userApproval.update).toHaveBeenCalledWith({
                where: { id: mockUserApproval.id },
                data: { status: ApprovalStatus.APPROVED, comment: 'Looks good' }
            });

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith({
                where: { id: 'active-step-1' },
                data: { status: ApprovalStatus.APPROVED }
            });

            expect(moveToNextStepSpy).toHaveBeenCalledWith(requestId, 1, userId);
        });

        it('should reject the step and request immediately on rejection', async () => {
            const mockStep = createMockWorkflowStep({ order: 1, type: 'ALL' });
            const mockUserApproval = createMockUserApproval({ userId, status: ApprovalStatus.PENDING });
            const mockActiveStep = createMockRequestApprovalStep({
                id: 'active-step-1',
                requestId,
                step: mockStep as unknown as RequestApprovalStep
            });
            (mockActiveStep as unknown as Record<string, unknown>).approvals = [mockUserApproval];

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockActiveStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.update.mockResolvedValue(mockUserApproval);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { ...mockUserApproval, status: ApprovalStatus.REJECTED }
            ]);

            await WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.REJECTED, 'Too expensive');

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith({
                where: { id: 'active-step-1' },
                data: { status: ApprovalStatus.REJECTED }
            });

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: { status: RequestStatus.REJECTED }
            });

            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: WorkflowActionType.REJECTED,
                    comment: 'Too expensive'
                })
            }));
        });

        it('should NOT approve the step if type is ALL and others are still pending', async () => {
            const mockStep = createMockWorkflowStep({ order: 1, type: 'ALL' });
            const mockUserApproval1 = createMockUserApproval({ userId: 'user-1', status: ApprovalStatus.PENDING });
            const mockUserApproval2 = createMockUserApproval({ userId: 'user-2', status: ApprovalStatus.PENDING });
            const mockActiveStep = createMockRequestApprovalStep({ id: 'active-step-1', requestId, step: mockStep as unknown as RequestApprovalStep });
            (mockActiveStep as unknown as Record<string, unknown>).approvals = [mockUserApproval1, mockUserApproval2];

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockActiveStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.update.mockResolvedValue(mockUserApproval1);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { ...mockUserApproval1, status: ApprovalStatus.APPROVED },
                mockUserApproval2
            ]);

            const moveToNextStepSpy = vi.spyOn(WorkflowEngine, 'moveToNextStep');

            await WorkflowEngine.processUserApproval(requestId, 'user-1', ApprovalStatus.APPROVED);

            expect(prismaMock.requestApprovalStep.update).not.toHaveBeenCalled();
            expect(moveToNextStepSpy).not.toHaveBeenCalled();
        });

        it('should approve the step if type is ALL and everyone has approved', async () => {
            const stepId = 'step-all';
            const mockStep = createMockWorkflowStep({ id: stepId, type: ApprovalType.ALL, order: 1 });

            const userId2 = 'user-2';
            const mockUserApproval1 = createMockUserApproval({ userId: 'user-1', status: ApprovalStatus.PENDING });
            const mockUserApproval2 = createMockUserApproval({ userId: userId2, status: ApprovalStatus.APPROVED });

            const mockReqStep = createMockRequestApprovalStep({
                id: 'req-step-all',
                requestId,
                step: mockStep,
                approvals: [mockUserApproval1, mockUserApproval2]
            });

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockReqStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.update.mockResolvedValue(mockUserApproval1);

            // Mock findMany for the "ALL" check - now both are approved
            prismaMock.userApproval.findMany.mockResolvedValue([
                { ...mockUserApproval1, status: ApprovalStatus.APPROVED },
                mockUserApproval2
            ]);

            // Mock moveToNextStep
            const moveToNextStepSpy = vi.spyOn(WorkflowEngine, 'moveToNextStep').mockResolvedValue(undefined);

            await WorkflowEngine.processUserApproval(requestId, 'user-1', ApprovalStatus.APPROVED);

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-step-all' },
                data: { status: ApprovalStatus.APPROVED }
            }));
            expect(moveToNextStepSpy).toHaveBeenCalledWith(requestId, 1, 'user-1');
        });

        it('should throw error if user is not an authorized approver', async () => {
            const mockActiveStep = createMockRequestApprovalStep({ requestId });
            (mockActiveStep as unknown as Record<string, unknown>).approvals = [{ userId: 'other-user' }];

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockActiveStep as unknown as RequestApprovalStep);

            await expect(WorkflowEngine.processUserApproval(requestId, 'user-1', ApprovalStatus.APPROVED))
                .rejects.toThrow('User is not an authorized approver');
        });

        it('should throw error if request has no active step', async () => {
            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(null);
            await expect(WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.APPROVED))
                .rejects.toThrow('No active approval step found for this request.');
        });

        it('should throw error if user has already acted', async () => {
            const mockStep = createMockWorkflowStep({ order: 1 });
            const mockUserApproval = createMockUserApproval({ userId, status: ApprovalStatus.APPROVED }); // Already approved
            const mockActiveStep = createMockRequestApprovalStep({ id: 'active-step-1', requestId, step: mockStep as unknown as WorkflowStep });
            (mockActiveStep as unknown as { approvals: UserApproval[] }).approvals = [mockUserApproval];

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockActiveStep as unknown as RequestApprovalStep);

            await expect(WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.APPROVED))
                .rejects.toThrow('User has already acted on this request.');
        });
    });

    describe('handleRequestUpdate', () => {
        const requestId = 'request-1';
        const userId = 'user-1';

        it('should revoke approval if request was auto-approved but no longer qualifies', async () => {
            const mockStep1 = createMockWorkflowStep({ id: 'step-1', order: 1, approvers: [{ id: 'approver-1' }] });
            const mockWorkflow = createMockWorkflow({ steps: [mockStep1] });
            const mockCompany = createMockCompany({ workflow: mockWorkflow, slug: 'test-co' });

            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                agencyId: 'agency-1',
                approvalSteps: [
                    {
                        id: 'req-step-1',
                        stepId: 'step-1',
                        metadata: { autoApproved: true }
                    }
                ],
                company: mockCompany
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false,
                reason: 'Budget changed'
            });

            prismaMock.workflowStep.findUnique.mockResolvedValue(mockStep1 as unknown as WorkflowStep);
            prismaMock.agentBid.findMany.mockResolvedValue([]);
            prismaMock.requestApprovalStep.upsert.mockResolvedValue({ id: 'req-step-1' } as unknown as RequestApprovalStep);

            await WorkflowEngine.handleRequestUpdate(requestId, userId);

            // Verify revocation
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: expect.objectContaining({
                    status: RequestStatus.PENDING_COMPANY_APPROVAL,
                    agencyId: null
                })
            });

            expect(prismaMock.requestApprovalStep.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { requestId_stepId: { requestId, stepId: 'step-1' } },
                update: expect.objectContaining({ status: ApprovalStatus.PENDING })
            }));

            expect(prismaMock.userApproval.createMany).toHaveBeenCalled();
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                title: "Approval Required"
            }));
        });

        it('should revoke approval and reset accepted bids when request is modified', async () => {
            const mockStep1 = createMockWorkflowStep({ id: 'step-1', order: 1, approvers: [{ id: 'approver-1' }] });
            const mockStep2 = createMockWorkflowStep({ id: 'step-2', order: 2, approvers: [] });
            const mockWorkflow = createMockWorkflow({ steps: [mockStep1, mockStep2] });
            const mockCompany = createMockCompany({ workflow: mockWorkflow, slug: 'test-co' });

            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                agencyId: 'agency-1',
                approvalSteps: [
                    { id: 'req-step-1', stepId: 'step-1', status: ApprovalStatus.APPROVED, metadata: { autoApproved: true }, step: { order: 1 } },
                    { id: 'req-step-2', stepId: 'step-2', status: ApprovalStatus.APPROVED, step: { order: 2 } }
                ],
                company: mockCompany
            });

            const mockBid = { id: 'bid-1', agencyId: 'agency-1', status: 'ACCEPTED' };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false,
                reason: 'Budget increased'
            });

            prismaMock.workflowStep.findUnique.mockImplementation((async ({ where }: Prisma.WorkflowStepFindUniqueArgs) => {
                if (where.id === 'step-1') return { ...mockStep1, approvers: [{ id: 'approver-1' }] } as unknown as WorkflowStep;
                if (where.id === 'step-2') return { ...mockStep2, approvers: [] } as unknown as WorkflowStep;
                return null;
            }) as any);

            prismaMock.agentBid.findMany.mockResolvedValue([mockBid] as unknown as AgentBid[]);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-admin-1', email: 'agent@test.com' }] as unknown as User[]);

            prismaMock.requestApprovalStep.upsert.mockImplementation((async ({ where }: Prisma.RequestApprovalStepUpsertArgs) => {
                if (where.requestId_stepId?.stepId === 'step-1') return { id: 'req-step-1' } as unknown as RequestApprovalStep;
                if (where.requestId_stepId?.stepId === 'step-2') return { id: 'req-step-2' } as unknown as RequestApprovalStep;
                return { id: 'req-step-unknown' } as unknown as RequestApprovalStep;
            }) as any);

            prismaMock.userApproval.deleteMany.mockResolvedValue({ count: 1 });

            await WorkflowEngine.handleRequestUpdate(requestId, userId);

            // Verify bid revocation logic
            expect(prismaMock.agentBid.findMany).toHaveBeenCalledWith({
                where: { requestId, status: 'ACCEPTED' }
            });

            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'agent-admin-1',
                title: "Bid Approval Revoked"
            }));

            expect(prismaMock.agentBid.updateMany).toHaveBeenCalledWith({
                where: { requestId, status: 'ACCEPTED' },
                data: { status: 'PENDING' }
            });

            // Verify non-first step cleanup
            expect(prismaMock.userApproval.deleteMany).toHaveBeenCalledWith({
                where: { requestApprovalStepId: 'req-step-2' }
            });
        });

        it('should revoke manual approval if destination changed', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                approvalSteps: [], // No auto-approval metadata
                company: createMockCompany({ slug: 'test-co' })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });
            prismaMock.agentBid.findMany.mockResolvedValue([]);
            prismaMock.workflowAction.create.mockResolvedValue({} as unknown as WorkflowAction);
            prismaMock.message.create.mockResolvedValue({} as unknown as Message);
            prismaMock.workflowStep.findUnique.mockResolvedValue(null); // No steps return

            await WorkflowEngine.handleRequestUpdate(requestId, userId, { destinationChanged: true });

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: RequestStatus.PENDING_COMPANY_APPROVAL })
            }));
        });

        it('should apply auto-approval if request now qualifies and is pending', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.PENDING_COMPANY_APPROVAL,
                approvalSteps: [],
                company: createMockCompany({ slug: 'test-co' })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                reason: 'Budget reduced',
                matchedRule: { type: 'BUDGET', config: {} }
            });

            await WorkflowEngine.handleRequestUpdate(requestId, userId);

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: RequestStatus.APPROVED })
            }));
            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: WorkflowActionType.AUTO_APPROVED })
            }));
        });

        it('should handle race condition where request is missing during revocation', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                company: createMockCompany({ slug: 'test-co' })
            });

            // First findUnique returns request
            prismaMock.tripRequest.findUnique.mockResolvedValueOnce(mockRequest as unknown as TripRequest);

            // Auto Approval fails
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({
                shouldAutoApprove: false
            });

            // Second findUnique (inside revokeApproval) returns null
            prismaMock.tripRequest.findUnique.mockResolvedValueOnce(null);

            await WorkflowEngine.handleRequestUpdate(requestId, userId, { destinationChanged: true });

            // Should return early, so no update to existing request
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
        });

        it('should revoke approval but skip user approval creation if step has no approvers', async () => {
            // Mock a workflow where step 1 has NO approvers provided in the generic findUnique call done by revoke
            const mockStep1 = createMockWorkflowStep({ id: 'step-1', order: 1 });
            const mockWorkflow = createMockWorkflow({ steps: [mockStep1] });
            const mockCompany = createMockCompany({ workflow: mockWorkflow, slug: 'test-co' });

            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                company: mockCompany
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({ shouldAutoApprove: false });

            // Make sure the step finding in revokeApproval returns a step with empty approvers
            prismaMock.workflowStep.findUnique.mockResolvedValue({
                ...mockStep1,
                approvers: [] // No approvers
            } as unknown as WorkflowStep);

            // Mock upsert for request step during revocation
            prismaMock.requestApprovalStep.upsert.mockResolvedValue({ id: 'req-step-1' } as unknown as RequestApprovalStep);
            prismaMock.agentBid.findMany.mockResolvedValue([]);

            await WorkflowEngine.handleRequestUpdate(requestId, userId, { destinationChanged: true });

            // Verify status reverted
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: RequestStatus.PENDING_COMPANY_APPROVAL })
            }));

            // Verify no user approvals created
            expect(prismaMock.userApproval.createMany).not.toHaveBeenCalled();
        });

        it('should NOT revoke manual approval if destination did not change', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                approvalSteps: [], // Manual approval (no auto-approval metadata)
                company: createMockCompany({ slug: 'test-co' })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({ shouldAutoApprove: false });

            // destinationChanged is FALSE or undefined
            await WorkflowEngine.handleRequestUpdate(requestId, userId, { destinationChanged: false });

            // Should NOT revoke
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
            expect(prismaMock.message.create).not.toHaveBeenCalled();
        });

        it('should NOT revoke auto-approval if request still qualifies', async () => {
            // Mock request approved via auto-approval
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.APPROVED,
                approvalSteps: [
                    createMockRequestApprovalStep({
                        step: createMockWorkflowStep({ order: 1 }),
                        metadata: { autoApproved: true } as unknown as Prisma.JsonObject
                    })
                ],
                company: createMockCompany({ slug: 'test-co' })
            });
            // Ensure find returns the array
            (mockRequest as unknown as { approvalSteps: unknown[] }).approvalSteps = (mockRequest as unknown as { approvalSteps: unknown[] }).approvalSteps;

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            // Still qualifies
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({ shouldAutoApprove: true });

            await WorkflowEngine.handleRequestUpdate(requestId, userId, { destinationChanged: true });

            // Should NOT revoke
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
        });

        it('should NOT apply auto-approval if request does not qualify', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                status: RequestStatus.PENDING_COMPANY_APPROVAL,
                approvalSteps: [],
                company: createMockCompany({ slug: 'test-co' })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            // Does NOT qualify
            (AutoApprovalEngine.evaluateRequest as unknown as Mock).mockResolvedValue({ shouldAutoApprove: false });

            await WorkflowEngine.handleRequestUpdate(requestId, userId);

            // Should NOT approve
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: RequestStatus.APPROVED })
            }));
        });
    });

    describe('moveToNextStep', () => {
        it('should move to the second step if the first step is approved', async () => {
            const approver = { id: 'approver-2', email: 'approver2@test.com' };
            const step2 = createMockWorkflowStep({
                id: 'step-2',
                order: 2,
                approvers: [approver]
            });
            prismaMock.workflowStep.findFirst.mockResolvedValue(step2 as unknown as WorkflowStep);
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue({ id: 'req-step-2' } as unknown as RequestApprovalStep);
            prismaMock.requestApprovalStep.update.mockResolvedValue({ id: 'req-step-2' } as unknown as RequestApprovalStep);

            // Mock tripRequest.update for the internal approval case
            prismaMock.tripRequest.update.mockResolvedValue({
                id: 'req-1',
                company: { slug: 'test-co' }
            } as unknown as TripRequest);

            prismaMock.userApproval.createMany.mockResolvedValue({ count: 1 });

            await WorkflowEngine.moveToNextStep('req-1', 1, 'actor-1');

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-step-2' },
                data: { status: ApprovalStatus.PENDING }
            }));

            expect(prismaMock.userApproval.createMany).toHaveBeenCalledWith(expect.objectContaining({
                data: [expect.objectContaining({ userId: 'approver-2' })]
            }));

            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'approver-2',
                title: 'New Approval Request'
            }));
        });

        it('should transition to APPROVED after the final step', async () => {
            const mockRequest = createMockTripRequest({ id: 'req-1', status: RequestStatus.PENDING_COMPANY_APPROVAL });

            prismaMock.workflowStep.findFirst.mockResolvedValue(null);
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            prismaMock.tripRequest.update.mockResolvedValue({
                ...mockRequest,
                status: RequestStatus.APPROVED,
                company: { slug: 'test-co' }
            } as unknown as TripRequest);

            await WorkflowEngine.moveToNextStep('req-1', 5, 'actor-1');

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: RequestStatus.APPROVED }
            }));
        });

        it('should transition to IN_PROGRESS after final step if agency is linked with approved bid', async () => {
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                status: RequestStatus.PENDING_COMPANY_APPROVAL,
                agencyId: 'agency-1'
            });

            prismaMock.workflowStep.findFirst.mockResolvedValue(null);
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            // First update to APPROVED
            prismaMock.tripRequest.update.mockResolvedValueOnce({
                ...mockRequest,
                status: RequestStatus.APPROVED,
                company: { slug: 'test-co' },
                agencyId: 'agency-1'
            } as unknown as TripRequest);

            prismaMock.agentBid.findFirst.mockResolvedValue({ id: 'bid-1', status: 'ACCEPTED' } as unknown as AgentBid);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-1' }] as unknown as User[]);

            // Second update to IN_PROGRESS
            prismaMock.tripRequest.update.mockResolvedValueOnce({} as unknown as TripRequest);

            await WorkflowEngine.moveToNextStep('req-1', 5, 'actor-1');

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: RequestStatus.IN_PROGRESS }
            }));
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'agent-1',
                title: "Request Fully Approved!"
            }));
        });

        it('should transition to PENDING_QUOTATION if next step is AGENT_QUOTATION', async () => {
            const step2 = createMockWorkflowStep({ id: 'step-2', order: 2, kind: 'AGENT_QUOTATION' });

            prismaMock.workflowStep.findFirst.mockResolvedValue(step2 as unknown as WorkflowStep);
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue({ id: 'req-step-2' } as unknown as RequestApprovalStep);
            prismaMock.requestApprovalStep.update.mockResolvedValue({ id: 'req-step-2' } as unknown as RequestApprovalStep);

            // Mock for notifyAgentsForOpportunity
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { name: 'Test Co' }
            } as unknown as TripRequest);
            prismaMock.agencyIntegration.findMany.mockResolvedValue([]);

            // Mock tripRequest.update
            prismaMock.tripRequest.update.mockResolvedValue({} as unknown as TripRequest);

            await WorkflowEngine.moveToNextStep('req-1', 1, 'actor-1');

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: RequestStatus.PENDING_QUOTATION }
            }));
        });
    });

    describe('completeAgentQuotation', () => {
        it('should successfully complete quotation step and move to next', async () => {
            const requestId = 'req-1';
            const actorId = 'actor-1';
            const mockStep = createMockRequestApprovalStep({
                id: 'active-step-1',
                step: createMockWorkflowStep({ kind: WorkflowStepKind.AGENT_QUOTATION, order: 2 })
            });

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(mockStep as unknown as RequestApprovalStep);
            prismaMock.requestApprovalStep.update.mockResolvedValue({} as unknown as RequestApprovalStep);
            prismaMock.workflowAction.create.mockResolvedValue({} as unknown as WorkflowAction);

            // Spy on moveToNextStep
            const moveToNextStepSpy = vi.spyOn(WorkflowEngine, 'moveToNextStep').mockResolvedValue();

            await WorkflowEngine.completeAgentQuotation(requestId, actorId);

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith({
                where: { id: 'active-step-1' },
                data: { status: ApprovalStatus.APPROVED }
            });
            expect(moveToNextStepSpy).toHaveBeenCalledWith(requestId, 2, actorId);
        });

        it('should throw error if no active quotation step found', async () => {
            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(null);
            await expect(WorkflowEngine.completeAgentQuotation('req-1', 'actor-1')).rejects.toThrow("No active Agent Quotation step found.");
        });
    });

    describe('notifyAgentsForOpportunity', () => {
        it('should send notifications to travel agents of active integrated agencies', async () => {
            const requestId = 'req-1';
            const companyId = 'co-1';
            const agencyId = 'agency-1';

            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: requestId,
                companyId,
                title: 'Business Trip',
                company: { name: 'Test Corp' }
            } as unknown as TripRequest);

            prismaMock.agencyIntegration.findMany.mockResolvedValue([
                { agencyId, status: 'ACTIVE' }
            ] as unknown as AgencyIntegration[]);

            prismaMock.user.findMany.mockResolvedValue([
                { id: 'agent-1', role: UserRole.TRAVEL_AGENT }
            ] as unknown as User[]);

            await WorkflowEngine.notifyAgentsForOpportunity(requestId);

            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'agent-1',
                title: 'New Opportunity'
            }));
        });
    });
});
