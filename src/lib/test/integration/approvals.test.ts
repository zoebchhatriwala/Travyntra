import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processApproval } from '../../actions/approvals';
import { prismaMock } from '../helpers/prisma';
import { getServerSession } from 'next-auth';
import { createMockRequestApprovalStep, createMockWorkflowStep, createMockTripRequest, createMockCompany } from '../helpers/factories';
import { ApprovalStatus, RequestStatus } from '@prisma/client';
import { WorkflowEngine } from '../../workflow-engine';
import { type RequestApprovalStep, type UserApproval } from '@prisma/client';

vi.mock('next-auth');
vi.mock('../../workflow-engine');
vi.mock('../../notifications', () => ({
    createNotification: vi.fn().mockResolvedValue({}),
}));

describe('Approvals Integration (Server Actions)', () => {
    const userId = 'approver-1';
    const companyId = 'company-1';
    const requestId = 'request-1';
    const stepId = 'step-1';

    beforeEach(() => {
        vi.clearAllMocks();
        (getServerSession as Mock).mockResolvedValue({
            user: { id: userId, companyId, role: 'COMPANY_ADMIN', name: 'Approver User' }
        });
    });

    describe('processApproval', () => {
        it('should successfully approve a step and move to next', async () => {
            const mockStep = createMockWorkflowStep({
                id: stepId,
                type: 'ANY',
                approvers: [{ id: userId }]
            });
            const mockRequest = createMockTripRequest({
                id: requestId,
                title: 'Test Trip',
                company: createMockCompany({ slug: 'test-co' }),
                user: { id: 'requester-1', name: 'Requester' }
            });

            const mockApprovalStep = createMockRequestApprovalStep({
                id: 'req-step-1',
                requestId,
                stepId,
                step: mockStep,
                request: mockRequest,
                approvals: []
            });

            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockApprovalStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.upsert.mockResolvedValue({} as unknown as UserApproval);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId, status: ApprovalStatus.APPROVED }
            ] as unknown as UserApproval[]);
            prismaMock.requestApprovalStep.update.mockResolvedValue({ ...mockApprovalStep, status: ApprovalStatus.APPROVED } as unknown as RequestApprovalStep);

            const result = await processApproval({
                requestApprovalStepId: 'req-step-1',
                action: 'APPROVE',
                comment: 'Looks good'
            });

            expect(result.success).toBe(true);
            expect(prismaMock.userApproval.upsert).toHaveBeenCalled();
            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith({
                where: { id: 'req-step-1' },
                data: { status: ApprovalStatus.APPROVED }
            });
            expect(WorkflowEngine.moveToNextStep).toHaveBeenCalledWith(requestId, mockStep.order, userId);
        });

        it('should fail if user is not an authorized approver', async () => {
            const mockStep = createMockWorkflowStep({
                id: stepId,
                approvers: [{ id: 'other-user' }]
            });
            const mockApprovalStep = createMockRequestApprovalStep({
                id: 'req-step-1',
                step: mockStep
            });

            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockApprovalStep as unknown as RequestApprovalStep);

            const result = await processApproval({
                requestApprovalStepId: 'req-step-1',
                action: 'APPROVE'
            });

            expect(result.error).toBe("You are not authorized to approve this request");
        });

        it('should reject the request if step status becomes REJECTED', async () => {
            const mockStep = createMockWorkflowStep({
                id: stepId,
                type: 'ALL',
                approvers: [{ id: userId }]
            });
            const mockRequest = createMockTripRequest({
                id: requestId,
                title: 'Test Trip',
                company: createMockCompany({ slug: 'test-co' }),
                user: { id: 'requester-1', name: 'Requester' }
            });
            const mockApprovalStep = createMockRequestApprovalStep({
                id: 'req-step-1',
                requestId,
                step: mockStep,
                request: mockRequest
            });

            prismaMock.requestApprovalStep.findUnique.mockResolvedValue(mockApprovalStep as unknown as RequestApprovalStep);
            prismaMock.userApproval.upsert.mockResolvedValue({} as unknown as UserApproval);
            prismaMock.userApproval.findMany.mockResolvedValue([
                { userId, status: ApprovalStatus.REJECTED }
            ] as unknown as UserApproval[]);

            await processApproval({
                requestApprovalStepId: 'req-step-1',
                action: 'REJECT',
                comment: 'Too pricey'
            });

            expect(prismaMock.requestApprovalStep.update).toHaveBeenCalledWith({
                where: { id: 'req-step-1' },
                data: { status: ApprovalStatus.REJECTED }
            });
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: { status: RequestStatus.REJECTED }
            });
        });
    });
});
