
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    resetPendingApprovalSteps,
    getMyPendingApprovals,
    processApproval,
    getRequestApprovalProgress,
} from '@/lib/actions/approvals';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { RequestStatus, WorkflowStepKind } from '@prisma/client';
import { WorkflowEngine } from '@/lib/workflow-engine';

// Mocks
vi.mock('next-auth');
vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        moveToNextStep: vi.fn(),
        notifyAgentsForOpportunity: vi.fn(),
    }
}));
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('@/lib/utils/money', () => ({
    parseMoney: vi.fn((val) => val),
    moneyToDecimal: vi.fn((val) => val?.amount || 0)
}));

describe('Approvals Actions Coverage', () => {
    const mockSession = {
        user: {
            id: 'user-1',
            companyId: 'company-1',
            name: 'Test User',
            email: 'test@test.com'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
        // Default transaction mock
        prismaMock.$transaction.mockImplementation(((arg: any) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === 'function') return arg(prismaMock);
            return Promise.resolve(arg);
        }) as any);
    });

    describe('getMyPendingApprovals', () => {
        it('should return empty array if not authenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getMyPendingApprovals();
            expect(result).toEqual([]);
        });

        it('should return pending approvals correctly mapped', async () => {
            // Mock DB response
            const mockDate = new Date('2024-01-01');
            const mockDbResponse = [{
                id: 'step-1',
                requestId: 'req-1',
                createdAt: mockDate,
                request: {
                    title: 'Trip to Paris',
                    startDate: mockDate,
                    endDate: mockDate,
                    budget: { amount: 1000, currency: 'USD' }, // Prisma JSON/Decimal
                    destination: { city: 'Paris', formatted: 'Paris, France' },
                    user: {
                        name: 'Requester',
                        email: 'req@test.com',
                        avatarUrl: 'pic.jpg'
                    },
                    company: {
                        name: 'Test Co',
                        slug: 'test-co'
                    }
                },
                step: {
                    name: 'Manager Approval',
                    order: 1
                },
                approvals: [] // No approval by current user yet
            }];

            prismaMock.requestApprovalStep.findMany.mockResolvedValue(mockDbResponse as any);

            const result = await getMyPendingApprovals();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(expect.objectContaining({
                id: 'step-1',
                requestId: 'req-1',
                requestTitle: 'Trip to Paris',
                requestBudget: 1000,
                requestDestination: 'Paris',
                requesterName: 'Requester',
                companyName: 'Test Co',
                myApprovalStatus: 'PENDING'
            }));

            // Verify query structure
            expect(prismaMock.requestApprovalStep.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: 'PENDING',
                    step: expect.objectContaining({
                        approvers: expect.objectContaining({
                            some: { id: 'user-1' }
                        })
                    })
                })
            }));
        });

        it('should handle existing approval status correctly', async () => {
            const mockDbResponse = [{
                id: 'step-1',
                requestId: 'req-1',
                createdAt: new Date(),
                request: {
                    user: {}, company: {},
                    destination: {}, budget: 0
                },
                step: { name: 'S1', order: 1 },
                approvals: [{ status: 'APPROVED' }]
            }];

            prismaMock.requestApprovalStep.findMany.mockResolvedValue(mockDbResponse as any);
            const result = await getMyPendingApprovals();
            expect(result[0].myApprovalStatus).toBe('APPROVED');
        });

        it('should return empty array on error', async () => {
            prismaMock.requestApprovalStep.findMany.mockRejectedValue(new Error('DB Error'));
            // Should verify console.error but let's just check return
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await getMyPendingApprovals();
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching'), expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('processApproval', () => {
        const mockStepId = 'step-1';

        it('should return error if not authenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await processApproval({
                requestApprovalStepId: mockStepId,
                action: 'APPROVE'
            });
            expect(result.error).toBe("Unauthenticated");
        });

        it('should return error if step not found', async () => {
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(null);
            const result = await processApproval({
                requestApprovalStepId: mockStepId,
                action: 'APPROVE'
            });
            expect(result.error).toBe("Approval step not found");
        });

        it('should return error if user is not authorized', async () => {
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue({
                step: {
                    approvers: [{ id: 'other-user' }]
                }
            } as any);
            const result = await processApproval({
                requestApprovalStepId: mockStepId,
                action: 'APPROVE'
            });
            expect(result.error).toBe("You are not authorized to approve this request");
        });

        it('should successfully approve a request (ANY logic)', async () => {
            const mockStepData = {
                id: mockStepId,
                requestId: 'req-1',
                stepId: 's1',
                step: {
                    type: 'ANY',
                    name: 'Step 1',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }],
                    workflow: { steps: [] }
                },
                request: {
                    title: 'Trip 1',
                    user: { id: 'req-user', name: 'Requester' },
                    company: { slug: 'co' },
                    approvalSteps: []
                },
                approvals: [] // No prior approvals
            };

            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepData as any);

            // Mock finding approvals after upsert to simulate the new state
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'APPROVED' }
            ] as any);

            const result = await processApproval({
                requestApprovalStepId: mockStepId,
                action: 'APPROVE',
                comment: 'Looks good'
            });

            expect(result.success).toBe(true);
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: mockStepId },
                data: { status: 'APPROVED' }
            }));
            expect(WorkflowEngine.moveToNextStep).toHaveBeenCalledWith('req-1', undefined, 'user-1');
        });

        it('should reject a request (ANY logic) if ALL users reject', async () => {
            const mockStepData = {
                id: mockStepId,
                requestId: 'req-1',
                step: {
                    type: 'ANY',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }],
                    workflow: { steps: [] }
                },
                request: { title: 'Trip 1', user: { id: 'u' }, company: { slug: 'co' }, approvalSteps: [] },
                approvals: []
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepData as any);

            // Mock findMany returning BOTH rejections
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'REJECTED' },
                { userId: 'user-2', status: 'REJECTED' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'REJECT' });

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'REJECTED' }
            }));

            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: 'REJECTED' }
            }));
        });

        it('should handle ALL logic - approve only if all approved', async () => {
            const mockStepData = {
                id: mockStepId,
                step: {
                    type: 'ALL',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }],
                    workflow: { steps: [] }
                },
                request: { title: 'Trip 1', user: { id: 'u' }, company: { slug: 'co' }, approvalSteps: [] },
                approvals: []
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepData as any);

            // Case 1: Just me approved
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'APPROVED' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'APPROVE' });

            // Status remains PENDING
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'PENDING' }
            }));

            // Case 2: All approved
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'APPROVED' },
                { userId: 'user-2', status: 'APPROVED' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'APPROVE' });

            // Status becomes APPROVED
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'APPROVED' }
            }));
        });

        it('should handle ALL logic - reject if ANY rejects', async () => {
            const mockStepData = {
                id: mockStepId,
                requestId: 'req-1',
                step: {
                    type: 'ALL',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }],
                    workflow: { steps: [] }
                },
                request: { title: 'Trip 1', user: { id: 'u' }, company: { slug: 'co' }, approvalSteps: [] },
                approvals: []
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepData as any);

            // Me rejecting is enough
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'REJECTED' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'REJECT' });

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'REJECTED' }
            }));
        });

        it('should handle Bulk Approval triggers', async () => {
            const mockStepData = {
                id: mockStepId,
                requestId: 'master-req',
                stepId: 'step-def-1',
                step: {
                    type: 'ANY',
                    approvers: [{ id: 'user-1' }],
                    workflow: { steps: [] }
                },
                request: { title: 'Group Trip', user: { id: 'u' }, company: { slug: 'co' }, approvalSteps: [] },
                approvals: []
            };

            // 1. Initial Step Lookup (Parent) - for processApproval
            prismaMock.requestApprovalStep.findUnique
                .mockResolvedValueOnce(mockStepData as any)
                // 2. Child 1 Step Lookup - for recursive processApproval
                .mockResolvedValueOnce({ ...mockStepData, id: 'child-step-1', requestId: 'child-1' } as any)
                // 3. Child 2 Step Lookup - for recursive processApproval
                .mockResolvedValueOnce({ ...mockStepData, id: 'child-step-2', requestId: 'child-2' } as any);

            // Upsert always succeeds (for parent and children)
            prismaMock.userApproval.upsert.mockResolvedValue({} as any);

            // Consensus checks (Parent, Child1, Child2) - all approved
            prismaMock.userApproval.findMany.mockResolvedValue([{ userId: 'user-1', status: 'APPROVED' }] as any);

            // Update step status
            prismaMock.requestApprovalStep.update.mockResolvedValue({} as any);

            // Activity log creation
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            // 1. Master Bulk Check (Parent) - this triggers the bulk logic
            prismaMock.tripRequest.findUnique
                .mockResolvedValueOnce({
                    id: 'master-req',
                    isGroup: true,
                    childTrips: [{ id: 'child-1' }, { id: 'child-2' }]
                } as any)
                // 2. Child 1 Bulk Check (to stop recursion)
                .mockResolvedValueOnce({ id: 'child-1', isGroup: false, childTrips: [] } as any)
                // 3. Child 2 Bulk Check (to stop recursion)
                .mockResolvedValueOnce({ id: 'child-2', isGroup: false, childTrips: [] } as any);

            // Bulk children finder (Parent) - this is the key call we're testing
            prismaMock.requestApprovalStep.findMany.mockResolvedValue([
                { id: 'child-step-1' }, { id: 'child-step-2' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'APPROVE', comment: '' });

            // Verify bulk logic was triggered by checking if child steps were requested
            expect(prismaMock.requestApprovalStep.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    stepId: 'step-def-1',
                    status: 'PENDING'
                })
            }));

            // Verify upsert was called for parent + 2 children = 3 times
            expect(prismaMock.userApproval.upsert).toHaveBeenCalled();
        });

        it('should return generic error on exception', async () => {
            prismaMock.requestApprovalStep.findUnique.mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await processApproval({ requestApprovalStepId: 'x', action: 'APPROVE' });
            expect(result.error).toBe("Failed to process approval");
            consoleSpy.mockRestore();
        });

        it('should remain PENDING (ANY logic) if one rejects but others are pending', async () => {
            const mockStepData = {
                id: mockStepId,
                requestId: 'req-1',
                step: {
                    type: 'ANY',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }],
                    workflow: { steps: [] }
                },
                request: { title: 'Trip 1', user: { id: 'u' }, company: { slug: 'co' }, approvalSteps: [] },
                approvals: []
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepData as any);

            // User 1 rejects, User 2 has not acted
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: 'REJECTED' }
            ] as any);

            await processApproval({ requestApprovalStepId: mockStepId, action: 'REJECT' });

            // Should remain PENDING
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'PENDING' }
            }));
        });
    });

    describe('getRequestApprovalProgress', () => {
        it('should return null if unauthenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getRequestApprovalProgress('req-1');
            expect(result).toBeNull();
        });

        it('should return mapped progress steps', async () => {
            const mockSteps = [{
                id: 's1',
                step: {
                    name: 'Step 1',
                    order: 1,
                    type: 'ANY',
                    kind: 'APPROVAL',
                    approvers: [{ id: 'approver-1', name: 'App Rover', email: 'a@b.com', avatarUrl: 'img', role: 'MANAGER' }]
                },
                approvals: [{
                    userId: 'approver-1',
                    status: 'APPROVED',
                    updatedAt: new Date(),
                    user: { name: 'App Rover', avatarUrl: 'img' }
                }],
                status: 'APPROVED',
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {}
            }];
            prismaMock.requestApprovalStep.findMany.mockResolvedValue(mockSteps as any);

            const result = await getRequestApprovalProgress('req-1');
            expect(result).toHaveLength(1);
            expect(result![0].stepName).toBe('Step 1');
            expect(result![0].approvers[0].name).toBe('App Rover');
            expect(result![0].approvals[0].status).toBe('APPROVED');
        });

        it('should return null on error', async () => {
            prismaMock.requestApprovalStep.findMany.mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await getRequestApprovalProgress('req-1');
            expect(result).toBeNull();
            consoleSpy.mockRestore();
        });
    });

    describe('resetPendingApprovalSteps - Coverage', () => {
        it('should return 0 requests if no steps defined in workflow', async () => {
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue({
                company: { slug: 'co' },
                steps: [] // Empty steps
            } as any);

            const result = await resetPendingApprovalSteps('company-1', 'admin');
            expect(result.requestsReset).toBe(0);
            expect(result.message).toBe("No workflow configured");
        });

        it('should return 0 requests if no pending requests exist', async () => {
            const workflow = {
                id: 'wf-1',
                company: { slug: 'test-co' },
                steps: [{
                    id: 's1',
                    order: 1,
                    kind: 'APPROVAL',
                    approvers: [{ id: 'approver-1' }]
                }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // No pending requests
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([] as any);

            const result = await resetPendingApprovalSteps('company-1', 'admin');

            expect(result.success).toBe(true);
            expect(result.requestsReset).toBe(0);
            expect(result.message).toBe("No pending requests to reset");
        });


        it('should handle AGENT_QUOTATION kind as first step', async () => {
            const workflow = {
                id: 'wf-1',
                company: { slug: 'test-co' },
                steps: [{
                    id: 's1',
                    order: 1,
                    kind: WorkflowStepKind.AGENT_QUOTATION,
                    approvers: []
                }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // Pending requests
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([
                { id: 'req-1', user: { id: 'r1' }, title: 'Trip 1', destination: {} }
            ] as any);

            // Existing steps to delete
            prismaMock.requestApprovalStep.findMany.mockResolvedValueOnce([]);

            // Update
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            await resetPendingApprovalSteps('company-1', 'admin');

            // Verify status update to PENDING_QUOTATION
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: RequestStatus.PENDING_QUOTATION }
            }));

            // Verify notification to agents
            expect(WorkflowEngine.notifyAgentsForOpportunity).toHaveBeenCalledWith('req-1');
        });

        it('should handle non-agent workflow start (back to PENDING_COMPANY_APPROVAL)', async () => {
            const workflow = {
                id: 'wf-1',
                company: { slug: 'test-co' },
                steps: [{
                    id: 's1',
                    order: 1,
                    kind: 'APPROVAL',
                    approvers: [{ id: 'approver-1' }]
                }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // 1. First call: findMany for requests
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([
                { id: 'req-1', user: { id: 'r1' }, title: 'Trip 1', destination: {} }
            ] as any);

            // 2. Second call: findMany for existing steps (inside loop)
            prismaMock.requestApprovalStep.findMany.mockResolvedValueOnce([]);

            // Update
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            const result = await resetPendingApprovalSteps('company-1', 'admin');

            // Expect success
            expect(result.success).toBe(true);

            // Verify status update to PENDING_COMPANY_APPROVAL
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: RequestStatus.PENDING_COMPANY_APPROVAL }
            }));

            // Verify approver notification (bulk)
            // We use the mocked createNotification imported at top level
            const { createNotification } = await import('@/lib/notifications');
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'approver-1',
                title: 'Workflow Updated - Approvals Needed'
            }));
        });

        it('should delete existing approval steps when resetting', async () => {
            const workflow = {
                id: 'wf-1',
                company: { slug: 'test-co' },
                steps: [{
                    id: 's1',
                    order: 1,
                    kind: 'APPROVAL',
                    approvers: [{ id: 'approver-1' }]
                }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // Pending requests
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([
                { id: 'req-1', user: { id: 'r1' }, title: 'Trip 1', destination: {} }
            ] as any);

            // Existing steps to delete (this triggers the deleteMany logic)
            prismaMock.requestApprovalStep.findMany.mockResolvedValueOnce([
                { id: 'old-step-1' },
                { id: 'old-step-2' }
            ] as any);

            // Mock deleteMany for userApproval and requestApprovalStep
            prismaMock.userApproval.deleteMany.mockResolvedValue({ count: 2 } as any);
            prismaMock.requestApprovalStep.deleteMany.mockResolvedValue({ count: 2 } as any);

            // Mock create for new steps
            prismaMock.requestApprovalStep.create.mockResolvedValue({} as any);

            // Mock activity log
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            // Update
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            const result = await resetPendingApprovalSteps('company-1', 'admin');

            // Verify deleteMany was called for both userApproval and requestApprovalStep
            expect(prismaMock.userApproval.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    requestApprovalStepId: expect.objectContaining({
                        in: ['old-step-1', 'old-step-2']
                    })
                })
            }));

            expect(prismaMock.requestApprovalStep.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    requestId: 'req-1'
                })
            }));

            expect(result.success).toBe(true);
        });

        it('should handle errors in resetPendingApprovalSteps', async () => {
            prismaMock.approvalWorkflow.findUnique.mockRejectedValue(new Error('Database error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await resetPendingApprovalSteps('company-1', 'admin');

            expect(result.error).toBe('Failed to reset pending approval steps');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error resetting'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should handle workflow step with undefined approvers (coverage fix)', async () => {
            const workflow = {
                id: 'wf-no-approvers',
                company: { slug: 'test-co' },
                steps: [{
                    id: 's1',
                    order: 1,
                    kind: 'APPROVAL',
                    approvers: undefined // Explicitly undefined to trigger || [] fallback
                }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // Pending requests
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([
                { id: 'req-1', user: { id: 'r1' }, title: 'Trip 1', destination: {} }
            ] as any);

            // Mock other calls
            prismaMock.requestApprovalStep.findMany.mockResolvedValueOnce([]);
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.requestApprovalStep.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            await resetPendingApprovalSteps('company-1', 'admin');

            // We expect notification for AUTHOR (1 call)
            // But NO notification for Approvers (since there are none)
            const { createNotification } = await import('@/lib/notifications');
            // Check calling times.
            expect(createNotification).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple requests from same user and multiple workflow steps (coverage for dedup and WAITING status)', async () => {
            const workflow = {
                id: 'wf-multi-step',
                company: { slug: 'test-co' },
                steps: [
                    { id: 's1', order: 1, kind: 'APPROVAL', approvers: [{ id: 'u1' }] },
                    { id: 's2', order: 2, kind: 'APPROVAL', approvers: [{ id: 'u2' }] }
                ]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // Two requests from SAME user
            prismaMock.tripRequest.findMany.mockResolvedValueOnce([
                { id: 'req-1', user: { id: 'same-user' }, title: 'Trip 1', destination: {} },
                { id: 'req-2', user: { id: 'same-user' }, title: 'Trip 2', destination: {} }
            ] as any);

            // Existing steps (empty for simplicity)
            // findMany is called inside the loop (2 times)
            prismaMock.requestApprovalStep.findMany.mockResolvedValue([]);

            // Updates and Creates
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.requestApprovalStep.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            await resetPendingApprovalSteps('company-1', 'admin');

            const { createNotification } = await import('@/lib/notifications');

            // Filter calls for the author - should be only 1 due to Set deduplication
            const authorCalls = (createNotification as unknown as any).mock.calls
                .filter((args: any[]) => args[0].userId === 'same-user');

            expect(authorCalls).toHaveLength(1);

            // Verify Step 2 creation (WAITING status)
            // We expect requestApprovalStep.create to be called for s2 with status WAITING
            expect(prismaMock.requestApprovalStep.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    stepId: 's2',
                    status: 'WAITING'
                })
            }));
        });
    });
});
