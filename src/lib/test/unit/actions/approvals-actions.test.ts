
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    getMyPendingApprovals,
    processApproval,
    getRequestApprovalProgress,
    resetPendingApprovalSteps
} from '@/lib/actions/approvals';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { ApprovalStatus } from '@prisma/client';
import { WorkflowEngine } from '@/lib/workflow-engine';


// Mocks
vi.mock('next-auth');
vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        moveToNextStep: vi.fn(),
    }
}));
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Approvals Actions', () => {
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
        // Default transaction mock for resetPendingApprovalSteps
        prismaMock.$transaction.mockImplementation(((arg: any) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === 'function') return arg(prismaMock);
            return Promise.resolve(arg);
        }) as any);
    });

    describe('getMyPendingApprovals', () => {
        it('should return empty list if unauthenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getMyPendingApprovals();
            expect(result).toHaveLength(0);
        });

        it('should return pending approvals mapped correctly', async () => {
            const mockStep = {
                id: 'step-1',
                requestId: 'req-1',
                createdAt: new Date(),
                request: {
                    title: 'Trip 1',
                    startDate: new Date(),
                    endDate: new Date(),
                    budget: { amount: 1000, currencyCode: 'USD', multiplier: 100 },
                    destination: { city: 'NY' },
                    user: { name: 'Requester', email: 'req@test.com' },
                    company: { name: 'Comp', slug: 'comp' }
                },
                step: { name: 'Step 1', order: 1 },
                approvals: []
            };

            prismaMock.requestApprovalStep.findMany.mockResolvedValue([mockStep] as any);

            const result = await getMyPendingApprovals();

            expect(result).toHaveLength(1);
            expect(result[0].requestId).toBe('req-1');
            expect(result[0].requestTitle).toBe('Trip 1');
            expect(result[0].myApprovalStatus).toBe(ApprovalStatus.PENDING);
        });
    });

    describe('processApproval', () => {
        const mockStepRecord = {
            id: 'step-1',
            requestId: 'req-1',
            stepId: 'def-1',
            step: {
                id: 'def-1',
                name: 'Approval 1',
                type: 'ANY',
                order: 1,
                approvers: [{ id: 'user-1' }]
            },
            request: {
                id: 'req-1',
                title: 'Trip 1',
                user: { id: 'requester-1' },
                company: { id: 'company-1', slug: 'comp' },
                approvalSteps: []
            }
        };

        it('should enforce authentication', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await processApproval({ requestApprovalStepId: '1', action: 'APPROVE' });
            expect(result.error).toBe('Unauthenticated');
        });

        it('should error if step not found', async () => {
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(null);
            const result = await processApproval({ requestApprovalStepId: '1', action: 'APPROVE' });
            expect(result.error).toBe('Approval step not found');
        });

        it('should error if user not authorized', async () => {
            const unauthorizedRecord = {
                ...mockStepRecord,
                step: { ...mockStepRecord.step, approvers: [{ id: 'other-user' }] }
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(unauthorizedRecord as any);

            const result = await processApproval({ requestApprovalStepId: '1', action: 'APPROVE' });
            expect(result.error).toContain('not authorized');
        });

        it('should approve step and move to next if type ANY', async () => {
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepRecord as any);
            prismaMock.userApproval.upsert.mockResolvedValue({} as any);
            // Mock findMany to return THIS usage approval indicating it's approved
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: ApprovalStatus.APPROVED } as any
            ]);

            const result = await processApproval({ requestApprovalStepId: 'step-1', action: 'APPROVE' });

            expect(result.success).toBe(true);
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'step-1' },
                data: { status: ApprovalStatus.APPROVED }
            }));
            expect(WorkflowEngine.moveToNextStep).toHaveBeenCalledWith('req-1', 1, 'user-1');
        });

        it('should wait for consensus if type ALL', async () => {
            const allRecord = {
                ...mockStepRecord,
                step: {
                    ...mockStepRecord.step,
                    type: 'ALL',
                    approvers: [{ id: 'user-1' }, { id: 'user-2' }]
                }
            };
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(allRecord as any);
            prismaMock.userApproval.upsert.mockResolvedValue({} as any);
            // Only user-1 approved so far
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: ApprovalStatus.APPROVED } as any
            ]);

            const result = await processApproval({ requestApprovalStepId: '1', action: 'APPROVE' });

            expect(result.success).toBe(true);
            // Should NOT update step status yet
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: ApprovalStatus.PENDING }
            }));
            expect(WorkflowEngine.moveToNextStep).not.toHaveBeenCalled();
        });

        it('should reject request if rejected', async () => {
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockStepRecord as any);
            prismaMock.userApproval.upsert.mockResolvedValue({} as any);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId: 'user-1', status: ApprovalStatus.REJECTED } as any
            ]);

            const result = await processApproval({ requestApprovalStepId: '1', action: 'REJECT' });

            expect(result.success).toBe(true);
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: ApprovalStatus.REJECTED }
            }));
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: { status: 'REJECTED' }
            }));
        });
    });

    describe('getRequestApprovalProgress', () => {
        it('should return null if unauthenticated', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getRequestApprovalProgress('req-1');
            expect(result).toBeNull();
        });

        it('should return progress steps', async () => {
            const mockStep = {
                id: 'step-1',
                step: { name: 'Step 1', order: 1, approvers: [] },
                approvals: []
            };
            prismaMock.requestApprovalStep.findMany.mockResolvedValue([mockStep] as any);

            const result = await getRequestApprovalProgress('req-1');
            expect(result).toHaveLength(1);
            expect(result?.[0].stepName).toBe('Step 1');
        });
    });

    describe('resetPendingApprovalSteps', () => {
        it('should return success if no workflow', async () => {
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(null);
            const result = await resetPendingApprovalSteps('company-1', 'user-1');
            expect(result.requestsReset).toBe(0);
        });

        it('should reset pending requests', async () => {
            const workflow = {
                id: 'wf-1',
                company: { slug: 'test-co' },
                steps: [{ id: 's1', order: 1, approvers: [{ id: 'u1' }] }]
            };
            prismaMock.approvalWorkflow.findUnique.mockResolvedValue(workflow as any);

            // Pending requests
            prismaMock.tripRequest.findMany.mockResolvedValue([
                { id: 'req-1', user: { id: 'r1' }, title: 'Trip 1', destination: {}, company: { slug: 'co' } }
            ] as any);

            // Mock created steps lookups
            prismaMock.requestApprovalStep.findMany.mockResolvedValue([{ id: 'new-step-1' }] as any);

            const result = await resetPendingApprovalSteps('company-1', 'user-1');

            expect(result.requestsReset).toBe(1);
            // Verify delete old steps
            expect(prismaMock.requestApprovalStep.deleteMany).toHaveBeenCalled();
            // Verify create new steps
            expect(prismaMock.requestApprovalStep.create).toHaveBeenCalled();
        });
    });
});
