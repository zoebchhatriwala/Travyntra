import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { prismaMock } from '@/lib/test/helpers/prisma';
import {
    createMockTripRequest,
    createMockCompany
} from '@/lib/test/helpers/factories';
import {
    RequestStatus,
    ApprovalStatus,
    type TripRequest
} from '@prisma/client';
import { AutoApprovalEngine } from '@/lib/auto-approval-engine';

// Mock dependencies
vi.mock('@/lib/auto-approval-engine', () => ({
    AutoApprovalEngine: {
        evaluateRequest: vi.fn(),
    },
}));

vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));

describe('WorkflowEngine Coverage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('moveToNextStep', () => {
        it('should NOT transition to IN_PROGRESS if agency is linked but NO accepted bid found', async () => {
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

            // Mock no accepted bid found
            prismaMock.agentBid.findFirst.mockResolvedValue(null);

            await WorkflowEngine.moveToNextStep('req-1', 5, 'actor-1');

            // Verify we did NOT transition to IN_PROGRESS
            // The second update call should NOT happen (or at least not with IN_PROGRESS)
            // Actually, we only expect ONE update call (to APPROVED)
            expect(prismaMock.tripRequest.update).toHaveBeenCalledTimes(1);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: RequestStatus.APPROVED }
            }));
        });

        it('should handle case where nextRequestStepRecord is not found', async () => {
            // Line 631 coverage
            const mockStepNext = { id: 'step-next', order: 6 };
            prismaMock.workflowStep.findFirst.mockResolvedValue(mockStepNext as any);

            // Mock findUnique to return NULL for the request approval step
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(null);

            await WorkflowEngine.moveToNextStep('req-1', 5, 'actor-1');

            // Should simply do nothing (no updates to request or step)
            expect(prismaMock.requestApprovalStep.update).not.toHaveBeenCalled();
        });
    });

    describe('startWorkflow', () => {
        it('should handle case where initialized step is not found after creation', async () => {
            // Line 206 coverage
            const requestId = 'req-1';
            const mockRequest = createMockTripRequest({
                id: requestId,
                company: createMockCompany({
                    workflow: {
                        steps: [{ id: 'step-1', order: 1 } as any]
                    } as any
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            (AutoApprovalEngine.evaluateRequest as unknown as any).mockResolvedValue({ shouldAutoApprove: false });

            // Step creation succeeds
            prismaMock.requestApprovalStep.create.mockResolvedValue({} as any);

            // But finding it fails
            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(null);

            await WorkflowEngine.startWorkflow(requestId);

            // Should just finish without error but also without moving to next state logic
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
                data: { status: RequestStatus.PENDING_COMPANY_APPROVAL }
            }));
        });
    });

    describe('processUserApproval', () => {
        it('should use fallback message if rejection comment is missing', async () => {
            // Line 467 coverage
            const requestId = 'req-1';
            const userId = 'user-1';

            const mockStep = { id: 'step-1', order: 1, type: 'ANY' };
            const mockUserApproval = { id: 'ua-1', userId, status: ApprovalStatus.PENDING };

            const activeStep = {
                id: 'as-1',
                step: mockStep,
                approvals: [mockUserApproval]
            };

            prismaMock.requestApprovalStep.findFirst.mockResolvedValue(activeStep as any);
            prismaMock.userApproval.update.mockResolvedValue({} as any);
            // Return rejected status to trigger completion
            prismaMock.userApproval.findMany.mockResolvedValue([
                { ...mockUserApproval, status: ApprovalStatus.REJECTED } as any
            ]);

            await WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.REJECTED, undefined);

            expect(prismaMock.workflowAction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'REJECTED',
                    comment: "Request rejected by internal approver."
                })
            }));
        });
    });

    describe('notifyAgentsForOpportunity', () => {
        it('should return early if request not found', async () => {
            // Line 537 coverage
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);
            await WorkflowEngine.notifyAgentsForOpportunity('req-1');
            expect(prismaMock.agencyIntegration.findMany).not.toHaveBeenCalled();
        });
    });

    describe('handleRequestUpdate', () => {
        it('should return early if request is not found', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);

            await WorkflowEngine.handleRequestUpdate('req-1', 'user-1');

            // Should not call evaluateRequest
            expect(AutoApprovalEngine.evaluateRequest).not.toHaveBeenCalled();
            // Should not update anything
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
        });
    });
});
