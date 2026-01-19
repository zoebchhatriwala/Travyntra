
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    submitBid,
    updateBid,
    approveBid,
    unapproveBid,
    removeBid,
    withdrawBid,
    getConversionPreview,
    type BidTax
} from '@/app/agent/bids/[requestId]/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { BidStatus, CompanyType, RequestStatus, SubscriptionPlan, UserRole, NotificationType, Prisma } from '@prisma/client';
import { AutoApprovalRuleType } from '@/types/workflow/auto-approval-policy';
import { AutoApprovalEngine } from '@/lib/auto-approval-engine';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { createNotification } from '@/lib/notifications';
import { convertMoney } from '@/lib/services/currency';
import { ActivityLogAction } from '@/types/common/enums';

// Mocks
vi.mock('next-auth');
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('@/lib/auto-approval-engine', () => ({
    AutoApprovalEngine: {
        evaluateRequest: vi.fn(),
    }
}));
vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        completeAgentQuotation: vi.fn(),
    }
}));
vi.mock('@/lib/services/currency', () => ({
    convertMoney: vi.fn(),
}));

describe('Bidding Actions', () => {
    const mockAgentSession = {
        user: {
            id: 'agent-1',
            companyId: 'agency-1',
            role: 'TRAVEL_AGENT',
            name: 'Agent',
            email: 'agent@test.com'
        }
    };

    const mockAdminSession = {
        user: {
            id: 'admin-1',
            companyId: 'company-1',
            companySlug: 'comp',
            role: 'COMPANY_ADMIN',
            name: 'Admin',
            email: 'admin@test.com'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock PlanGuard requirements
        prismaMock.company.findUnique.mockResolvedValue({
            id: 'agency-1',
            plan: SubscriptionPlan.ENTERPRISE,
            type: CompanyType.AGENT,
            timezone: 'UTC'
        } as any);
    });

    describe('getConversionPreview', () => {
        it('should return formatted amount without conversion if same currency', async () => {
            const result = await getConversionPreview(100, 'USD', 'USD');
            expect(result).toBe('$100');
        });

        it('should convert if currencies differ', async () => {
            (convertMoney as Mock).mockResolvedValue({ amount: 9000, currencyCode: 'EUR', multiplier: 100 });
            const result = await getConversionPreview(100, 'USD', 'EUR');
            expect(result).toBe('€90');
        });
    });

    describe('submitBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            (convertMoney as Mock).mockImplementation((money) => Promise.resolve(money));
        });

        it('should return error if unauthenticated', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await submitBid('req-1', 100, 'Msg');
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });

        it('should return error if role is not TRAVEL_AGENT', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'agency-1', role: 'EMPLOYEE' } });
            const result = await submitBid('req-1', 100, 'Msg');
            expect(result.error).toBe("Unauthorized");
        });

        it('should submit bid successfully', async () => {
            const mockRequest = {
                id: 'req-1',
                company: { currency: 'USD', slug: 'comp' },
                approvalSteps: [],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any); // admins

            const result = await submitBid('req-1', 100, 'Proposal', 'USD', []);

            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    amount: expect.objectContaining({ amount: 10000 }), // 100 * 100 multiplier
                    status: BidStatus.PENDING
                })
            }));
            expect(createNotification).toHaveBeenCalled();
        });

        it('should handle taxes in submitBid', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'USD' },
                approvalSteps: [],
                bids: []
            } as any);

            const taxes = [
                { label: 'VAT', value: 10, type: 'PERCENTAGE' },
                { label: 'Fee', value: 5, type: 'FIXED' }
            ];

            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);

            const result = await submitBid('req-1', 100, 'Proposal', 'USD', taxes as any);

            expect(result.success).toBe(true);
            expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    content: expect.stringContaining('VAT: 10%')
                })
            }));
        });

        it('should handle currency conversion in submitBid', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'EUR' },
                approvalSteps: [],
                bids: []
            } as any);

            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            (convertMoney as Mock).mockResolvedValue({ amount: 9000, currencyCode: 'EUR' });

            const result = await submitBid('req-1', 100, 'Proposal', 'USD');

            expect(result.success).toBe(true);
            expect(convertMoney).toHaveBeenCalled();
        });

        it('should handle database error in submitBid', async () => {
            prismaMock.tripRequest.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await submitBid('req-1', 100, 'Msg');
            expect(result.error).toBe('DB Error');
        });

        it('should auto-reject if another bid is already accepted', async () => {
            const mockRequest = {
                id: 'req-1',
                company: { currency: 'USD' },
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                approvalSteps: [{
                    metadata: { autoApproved: true, ruleType: 'BUDGET_THRESHOLD', ruleConfig: { amount: 200 } }
                }],
                bids: [{ status: BidStatus.ACCEPTED }]
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);

            const result = await submitBid('req-1', 100, 'Msg');

            expect(result.success).toBe(true);
            expect(result.message).toContain('rejected');
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: { status: BidStatus.REJECTED }
            }));
        });

        it('should validate budget threshold fail', async () => {
            const mockRequest = {
                id: 'req-1',
                budget: { amount: 5000, currencyCode: 'USD', multiplier: 100 }, // $50 budget
                company: { currency: 'USD' },
                approvalSteps: [{
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        ruleConfig: { threshold: 5000 }
                    }
                }],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            // Bid $100
            const result = await submitBid('req-1', 100, 'Msg');

            expect(result.error).toContain('exceeds the requested budget');
        });

        it('should handle auto-approval evaluation if no steps exist', async () => {
            const mockRequest = {
                id: 'req-1',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD, config: { threshold: 20000 } }
            });

            // approveBidInternal mocks
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                taxes: [{ label: 'VAT', value: 10, type: 'PERCENTAGE' }],
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-1' }] as any);

            const result = await submitBid('req-1', 100, 'Msg');
            expect(result.success).toBe(true);
            expect(AutoApprovalEngine.evaluateRequest).toHaveBeenCalled();
        });

        it('should handle COMBINED rule in auto-approval evaluation', async () => {
            const mockRequest = {
                id: 'req-2',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-2' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.COMBINED, config: { budget: { threshold: 20000 } } }
            });

            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-2',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-2' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([]);

            const result = await submitBid('req-2', 100, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle currency conversion in auto-approval threshold check', async () => {
            const mockRequest = {
                id: 'req-currency',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 10000, currencyCode: 'EUR', multiplier: 100 }, // €100 budget
                company: { currency: 'EUR' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-curr' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            (convertMoney as Mock).mockResolvedValue({ amount: 11000, currencyCode: 'EUR', multiplier: 100 }); // $100 -> €110

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD, config: { threshold: 20000 } }
            });

            const result = await submitBid('req-currency', 100, 'Msg', 'USD');
            expect(result.error).toContain('exceeds the requested budget');
        });

        it('should handle currency conversion text in submitBid result', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'EUR' },
                approvalSteps: [],
                bids: []
            } as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            (convertMoney as Mock).mockResolvedValue({ amount: 9000, currencyCode: 'EUR', multiplier: 100 });

            const result = await submitBid('req-1', 100, 'Proposal', 'USD');
            expect(result.success).toBe(true);
            expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    content: expect.stringContaining('Approx. Total')
                })
            }));
        });

        it('should handle COMBINED rule in existing approval steps for submitBid', async () => {
            const mockRequest = {
                id: 'req-combined-step',
                company: { currency: 'USD' },
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                approvalSteps: [{
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.COMBINED,
                        ruleConfig: { budget: { threshold: 200 }, hotel: {} }
                    }
                }],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-combined' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-combined',
                agencyId: 'agency-1',
                amount: { amount: 100, currencyCode: 'USD', multiplier: 100 }, // Matches threshold
                taxes: [],
                agency: { users: [] },
                request: mockRequest
            } as any);
            // mock internal approve
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-combined' } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await submitBid('req-combined-step', 100, 'Msg', 'USD');

            expect(result.success).toBe(true);
        });
    });

    describe('updateBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            (convertMoney as Mock).mockImplementation((money) => Promise.resolve(money));
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await updateBid('bid-1', 'req-1', 200, 'New Msg');
            expect(result.error).toBe('Unauthorized');
        });

        it('should update bid successfully', async () => {
            const mockRequest = {
                id: 'req-1',
                company: { currency: 'USD', slug: 'comp' },
                approvalSteps: [],
                bids: []
            };
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({ shouldAutoApprove: false });
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            const result = await updateBid('bid-1', 'req-1', 200, 'New Msg', 'USD', []);

            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: expect.objectContaining({ message: 'New Msg' })
            }));
            expect(createNotification).toHaveBeenCalled();
        });

        it('should handle taxes and conversion in updateBid', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'EUR' },
                approvalSteps: [],
                bids: []
            } as any);

            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            (convertMoney as Mock).mockResolvedValue({ amount: 18000, currencyCode: 'EUR' });

            const taxes = [{ label: 'VAT', value: 10, type: 'PERCENTAGE' }];
            const result = await updateBid('bid-1', 'req-1', 200, 'Update', 'USD', taxes as any);

            expect(result.success).toBe(true);
            expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    content: expect.stringContaining('VAT: 10%')
                })
            }));
        });

        it('should handle database error in updateBid', async () => {
            prismaMock.agentBid.update.mockRejectedValue(new Error('Update failed'));
            const result = await updateBid('bid-1', 'req-1', 200, 'Update');
            expect(result.error).toBe('Failed to update bid');
        });

        it('should trigger auto-approval if new amount is within threshold', async () => {
            const mockRequest = {
                id: 'req-1',
                company: { currency: 'USD' },
                companyId: 'comp-1',
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                approvalSteps: [{
                    metadata: { autoApproved: true, ruleType: 'BUDGET_THRESHOLD', ruleConfig: { amount: 200 } }
                }],
                bids: []
            };
            const mockBid = {
                id: 'bid-1',
                agencyId: 'agency-1',
                request: mockRequest,
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                agency: { users: [] }
            };

            prismaMock.agentBid.update.mockResolvedValue(mockBid as any);
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            // findUnique for approveBidInternal
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            // Update with 100, which is < 200
            const result = await updateBid('bid-1', 'req-1', 100, 'Update');

            expect(result.success).toBe(true);
            // Should call approveBidInternal logic, which calls agentBid.update status=ACCEPTED
            // Wait, approveBidInternal does the update. 
            // In the test, we need to verify if the status update to ACCEPTED happened.
            // But verify calls:
            // 1. updateBid calls agentBid.update (message/amount)
            // 2. approveBidInternal calls agentBid.update (status=ACCEPTED)
            expect(prismaMock.agentBid.update).toHaveBeenCalledTimes(2);
            expect(prismaMock.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'BID_APPROVED'
                })
            }));
        });

        it('should error if update exceeds budget threshold', async () => {
            const mockRequest = {
                id: 'req-1',
                budget: { amount: 5000, currencyCode: 'USD', multiplier: 100 }, // $50 budget
                company: { currency: 'USD' },
                approvalSteps: [{
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        ruleConfig: { threshold: 5000 }
                    }
                }],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);

            const result = await updateBid('bid-1', 'req-1', 100, 'Update');
            expect(result.error).toContain('exceeds the requested budget');
        });

        it('should handle currency conversion for budget threshold in updateBid', async () => {
            const mockRequest = {
                id: 'req-1',
                budget: { amount: 10000, currencyCode: 'EUR', multiplier: 100 }, // €100 budget
                company: { currency: 'EUR' },
                approvalSteps: [{
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        ruleConfig: { threshold: 10000 }
                    }
                }],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([]); // Added missing mock
            prismaMock.tripRequest.update.mockResolvedValue({} as any); // Added missing mock
            // createNotification is not expected to be called on error path, so no mock needed
            (convertMoney as Mock).mockResolvedValue({ amount: 11000, currencyCode: 'EUR', multiplier: 100 }); // $100 -> €110

            const result = await updateBid('bid-1', 'req-1', 100, 'Update', 'USD');
            expect(result.error).toContain('exceeds the requested budget');
        });

        it('should handle fixed taxes in updateBid', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'USD' },
                approvalSteps: [],
                bids: []
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.message.create.mockResolvedValue({} as any);

            const taxes = [{ label: 'Fee', value: 5, type: 'FIXED' }];
            const result = await updateBid('bid-1', 'req-1', 200, 'Update', 'USD', taxes as any);

            expect(result.success).toBe(true);
        });

        it('should handle auto-approval evaluation in updateBid', async () => {
            const mockRequest = {
                id: 'req-1',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.message.create.mockResolvedValue({} as any);

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD, config: { threshold: 20000 } }
            });

            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                taxes: [],
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            const result = await updateBid('bid-1', 'req-1', 100, 'Update');
            expect(result.success).toBe(true);
        });

        it('should handle COMBINED rule in updateBid auto-approval', async () => {
            const mockRequest = {
                id: 'req-3',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-3' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.COMBINED, config: { budget: { threshold: 20000 } } }
            });

            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-3',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                taxes: [{ label: 'Fee', value: 5, type: 'FIXED' }],
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            const result = await updateBid('bid-3', 'req-3', 100, 'Update');
            expect(result.success).toBe(true);
        });

        it('should handle currency conversion in auto-approval approveBidInternal', async () => {
            const mockRequest = {
                id: 'req-4',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'EUR', multiplier: 100 },
                company: { currency: 'EUR' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-4' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            (convertMoney as Mock).mockResolvedValue({ amount: 9000, currencyCode: 'EUR', multiplier: 100 });

            const { AutoApprovalEngine } = await import('@/lib/auto-approval-engine');
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD, config: { threshold: 200000 } }
            });

            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-4',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);

            const result = await updateBid('bid-4', 'req-4', 100, 'Update', 'USD');
            expect(result.success).toBe(true);
        });
    });

    describe('approveBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            (convertMoney as Mock).mockImplementation((money) => Promise.resolve(money));
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await approveBid('bid-1', 'req-1');
            expect(result.error).toBe('Unauthorized');
        });

        it('should handle taxes and currency conversion in approveBid', async () => {
            const mockBid = {
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD' },
                taxes: [{ label: 'VAT', value: 10, type: 'PERCENTAGE' }],
                agencyId: 'agency-1',
                agency: { users: [] },
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    status: RequestStatus.APPROVED,
                    company: { currency: 'EUR', slug: 'comp' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            (convertMoney as Mock).mockResolvedValue({ amount: 11000, currencyCode: 'EUR', multiplier: 100 });

            const result = await approveBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(convertMoney).toHaveBeenCalled();
        });

        it('should handle fixed taxes in approveBid', async () => {
            const mockBid = {
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD' },
                taxes: [{ label: 'Fee', value: 5, type: 'FIXED' }],
                agencyId: 'agency-1',
                agency: { users: [] },
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    status: RequestStatus.APPROVED,
                    company: { currency: 'USD', slug: 'comp' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await approveBid('bid-1', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should handle database error in approveBid', async () => {
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await approveBid('bid-1', 'req-1');
            expect(result.error).toBe('DB Error');
        });

        it('should approve bid and update request', async () => {
            const mockBid = {
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD' },
                agencyId: 'agency-1',
                agency: { users: [] },
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    status: RequestStatus.APPROVED, // Ordinary approval flow
                    company: { currency: 'USD', slug: 'comp' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await approveBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: { status: BidStatus.ACCEPTED }
            }));
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: expect.objectContaining({ status: 'IN_PROGRESS' })
            }));
        });

        it('should handle PENDING_QUOTATION flow', async () => {
            const mockBid = {
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD' },
                agencyId: 'agency-1',
                agency: { users: [] },
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    status: RequestStatus.PENDING_QUOTATION,
                    company: { currency: 'USD', slug: 'comp' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await approveBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            // Should call WorkflowEngine for transition
            expect(WorkflowEngine.completeAgentQuotation).toHaveBeenCalledWith('req-1', 'admin-1');
        });

        it('should handle notifications for agency users in approveBidInternal', async () => {
            const mockBid = {
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                agencyId: 'agency-1',
                agency: { users: [{ id: 'user-1', name: 'User' }] },
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    status: RequestStatus.APPROVED,
                    company: { currency: 'USD', slug: 'comp' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-1' }] as any);

            const result = await approveBid('bid-1', 'req-1');
            expect(result.success).toBe(true);
            expect(createNotification).toHaveBeenCalled();
        });

        it('should return error if bid not found', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue(null);
            const result = await approveBid('bid-1', 'req-1');
            expect(result.error).toBe('Bid not found');
        });

        it('should handle internal errors in approveBidInternal', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: { company: { currency: 'USD' } }
            } as any);
            prismaMock.agentBid.update.mockRejectedValue(new Error('Internal Failure'));

            const result = await approveBid('bid-1', 'req-1');
            expect(result.error).toBeDefined();
        });
    });

    describe('unapproveBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
        });

        it('should error if request has progressed', async () => {
            const mockBid = {
                id: 'bid-1',
                request: {
                    status: RequestStatus.PENDING_COMPANY_APPROVAL
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await unapproveBid('bid-1', 'req-1');
            expect(result.error).toContain('Cannot unapprove');
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await unapproveBid('bid-1', 'req-1');
            expect(result.error).toBe('Unauthorized');
        });

        it('should handle database error', async () => {
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await unapproveBid('bid-1', 'req-1');
            expect(result.error).toBe('Failed to unapprove bid');
        });

        it('should reset request state', async () => {
            const mockBid = {
                id: 'bid-1',
                request: {
                    title: 'Trip',
                    status: RequestStatus.IN_PROGRESS,
                    company: { slug: 'comp' }
                },
                agency: { users: [] }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await unapproveBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: BidStatus.PENDING }
            }));
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: RequestStatus.APPROVED, agencyId: null })
            }));
        });

        it('should return error if bid not found', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue(null);
            const result = await unapproveBid('bid-1', 'req-1');
            expect(result.error).toBe('Bid not found');
        });

        it('should handle database error', async () => {
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await unapproveBid('bid-1', 'req-1');
            expect(result.error).toBe('Failed to unapprove bid');
        });
    });

    describe('removeBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
        });

        it('should reset request if accepted bid removed', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue({ id: 'bid-1', status: BidStatus.ACCEPTED } as any);

            const result = await removeBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalled(); // Resets status
            expect(prismaMock.agentBid.delete).toHaveBeenCalled();
        });

        it('should remove a pending bid without resetting request', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue({ id: 'bid-1', status: BidStatus.PENDING } as any);
            const result = await removeBid('bid-1', 'req-1');
            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
            expect(prismaMock.agentBid.delete).toHaveBeenCalled();
        });

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await removeBid('bid-1', 'req-1');
            expect(result.error).toBe('Unauthorized');
        });

        it('should handle database error', async () => {
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('DB Error'));
            const result = await removeBid('bid-1', 'req-1');
            expect(result.error).toBe('Failed to remove bid');
        });

        it('should return error if bid not found', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue(null);
            const result = await removeBid('bid-1', 'req-1');
            expect(result.error).toBe('Bid not found');
        });
    });

    describe('Edge Cases for Coverage', () => {
        it('should handle approveBid with same currency', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                taxes: [],
                agency: { users: [{ id: 'u1' }] },
                request: {
                    status: RequestStatus.IN_PROGRESS,
                    company: { currency: 'USD', id: 'c1', slug: 's' }
                }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-1' }] as any);

            const result = await approveBid('bid-1', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should handle submitBid auto-approval with PENDING_QUOTATION', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'req-pq',
                status: RequestStatus.PENDING_QUOTATION,
                approvalSteps: [{
                    id: 'step-1',
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        ruleConfig: { threshold: 20000 }
                    }
                }],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD', id: 'c1' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-pq' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD, config: { threshold: 20000 } }
            });

            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-pq',
                agencyId: 'agency-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                taxes: [],
                agency: { users: [{ id: 'agent-1' }] },
                request: mockRequest
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            (WorkflowEngine.completeAgentQuotation as Mock).mockResolvedValue({ success: true });

            const result = await submitBid('req-pq', 100, 'Msg');
            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: BidStatus.ACCEPTED }
            }));
            expect(WorkflowEngine.completeAgentQuotation).toHaveBeenCalled();
        });

        it('should handle FIXED taxes in submitBid and updateBid for coverage', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'r1',
                company: { id: 'c1', currency: 'USD' },
                bids: [],
                approvalSteps: []
            } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'b1' } as any);

            // submitBid with FIXED
            await submitBid('r1', 100, 'Msg', 'USD', [{ label: 'Fee', value: 5, type: 'FIXED' }]);

            // updateBid with FIXED
            prismaMock.agentBid.findUnique.mockResolvedValue({ id: 'b1', amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 }, request: { company: { currency: 'USD' } } } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            await updateBid('b1', 'r1', 110, 'Msg', 'USD', [{ label: 'Fee', value: 5, type: 'FIXED' }]);

            expect(prismaMock.user.findMany).toHaveBeenCalled();
        });

        it('should handle submitBid with DOMESTIC_TRIP auto-approval', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r-dom',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.DOMESTIC_TRIP }
            });
            prismaMock.agentBid.create.mockResolvedValue({ id: 'b-dom' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            const result = await submitBid('r-dom', 100, 'Msg');
            expect(result.success).toBe(true);
            // In this case autoApprovalApplied should be false because isWithinThreshold is false for DOMESTIC_TRIP
            expect(prismaMock.agentBid.update).not.toHaveBeenCalled();
        });

        it('should handle updateBid when a bid is already accepted', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: [{ status: BidStatus.ACCEPTED }]
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({ shouldAutoApprove: false });
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: { company: { currency: 'USD' } }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid when a bid is already accepted and auto-approval matches', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [{
                    id: 's1',
                    isCompleted: false,
                    metadata: { autoApproved: true, ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD }
                }],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: [{ status: BidStatus.ACCEPTED }]
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.BUDGET_THRESHOLD }
            });
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: { company: { currency: 'USD' } }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid with COMBINED rule but missing budget config for coverage', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [{
                    id: 's1',
                    isCompleted: false,
                    metadata: { autoApproved: true, ruleType: AutoApprovalRuleType.COMBINED, ruleConfig: {} }
                }],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.COMBINED, config: { budget: { maxAmount: 1000, currencyCode: 'USD' } } }
            });
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                agencyId: 'company-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: {
                    id: 'r1',
                    title: 'Title',
                    status: RequestStatus.APPROVED,
                    company: { id: 'c1', currency: 'USD' }
                },
                agency: { users: [{ id: 'agent-1' }] }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 } as any);
            prismaMock.tripRequest.update.mockResolvedValue({ id: 'r1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            // Using mixed taxes to cover both percentage and fixed branches
            const taxes: BidTax[] = [
                { label: 'P', value: 10, type: 'PERCENTAGE' },
                { label: 'F', value: 5, type: 'FIXED' }
            ];
            const result = await updateBid('b1', 'r1', 110, 'Msg', 'USD', taxes);
            expect(result.success).toBe(true);
        });

        it('should handle updateBid with autoApprovedStep existing', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [{
                    id: 's1',
                    isCompleted: false,
                    metadata: { autoApproved: true, ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD }
                }],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                agencyId: 'company-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: {
                    id: 'r1',
                    title: 'Title',
                    status: RequestStatus.APPROVED,
                    company: { id: 'c1', currency: 'USD' }
                },
                agency: { users: [{ id: 'agent-1' }] }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 } as any);
            prismaMock.tripRequest.update.mockResolvedValue({ id: 'r1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid evaluation fallback when matchedRule is missing', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: null // Hits fallback at 442
            });
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                agencyId: 'company-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: {
                    id: 'r1',
                    title: 'Title',
                    status: RequestStatus.APPROVED,
                    company: { id: 'c1', currency: 'USD' }
                },
                agency: { users: [{ id: 'agent-1' }] }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 } as any);
            prismaMock.tripRequest.update.mockResolvedValue({ id: 'r1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid when request is not found', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);
            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.error).toBe("Request not found");
        });

        it('should handle updateBid with DOMESTIC_TRIP rule and fallbacks', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { id: 'c1', currency: null }, // Fallback at 405
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: true,
                matchedRule: { type: AutoApprovalRuleType.DOMESTIC_TRIP } // Covers 450 being false
            });
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                agencyId: 'company-1',
                amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 },
                request: {
                    id: 'r1',
                    title: 'Title',
                    status: RequestStatus.APPROVED,
                    company: { id: 'c1', currency: null } // Fallback at 298
                },
                agency: { users: [{ id: 'agent-1' }] }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 } as any);
            prismaMock.tripRequest.update.mockResolvedValue({ id: 'r1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const taxes: BidTax[] = [{ label: 'T', value: 0, type: 'PERCENTAGE' }]; // Covers 412 with value 0
            const result = await updateBid('b1', 'r1', 110, 'Msg', 'USD', taxes);
            expect(result.success).toBe(true);
        });

        it('should handle approveBidInternal taxes and currency fallbacks', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                agencyId: 'agency-1',
                amount: { amount: 10000 /* no currencyCode */, multiplier: 100 },
                taxes: [
                    { label: 'P', value: 10, type: 'PERCENTAGE' },
                    { label: 'F', value: 5, type: 'FIXED' }
                ],
                agency: { users: [{ id: 'u1' }] },
                request: {
                    status: RequestStatus.IN_PROGRESS,
                    company: { currency: null /* no currency */, id: 'c1', slug: 's' }
                }
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'agent-1' }] as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);

            const result = await approveBid('bid-1', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should handle approveBid with non-Error object caught in catch block', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockRejectedValue('String Error');
            const result = await approveBid('bid-1', 'req-1');
            expect(result.error).toBe('Failed to approve bid');
        });

        it('should handle submitBid with non-Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockRejectedValue('String Error');
            const result = await submitBid('r1', 100, 'Msg');
            expect(result.error).toBe('Failed to submit bid');
        });

        it('should handle submitBid with Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockRejectedValue(new Error('Specific Error'));
            const result = await submitBid('r1', 100, 'Msg');
            expect(result.error).toBe('Specific Error');
        });

        it('should handle unapproveBid with non-Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockRejectedValue('String Error');
            const result = await unapproveBid('b1', 'r1');
            expect(result.error).toBe('Failed to unapprove bid');
        });

        it('should handle removeBid with non-Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockRejectedValue('String Error');
            const result = await removeBid('b1', 'r1');
            expect(result.error).toBe('Failed to remove bid');
        });

        it('should return error if unapproving a progressed request', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'b1',
                request: { status: RequestStatus.PENDING_COMPANY_APPROVAL }
            } as any);
            const result = await unapproveBid('b1', 'r1');
            expect(result.error).toContain('moved to a subsequent approval step');
        });

        it('should handle taxes with zero value for branch coverage', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: null }, // Fallback to USD
                approvalSteps: [],
                bids: []
            } as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

            const taxes: BidTax[] = [
                { label: 'P', value: 0, type: 'PERCENTAGE' },
                { label: 'F', value: 0, type: 'FIXED' }
            ];

            const result = await submitBid('req-1', 100, 'Proposal', 'USD', taxes);
            expect(result.success).toBe(true);
        });

        it('should handle updateBid with both tax types for coverage', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'r1',
                company: { id: 'c1', currency: 'USD' },
                approvalSteps: [],
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'b1' } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const taxes: BidTax[] = [
                { label: 'P', value: 10, type: 'PERCENTAGE' },
                { label: 'F', value: 5, type: 'FIXED' }
            ];
            const result = await updateBid('b1', 'r1', 110, 'Msg', 'USD', taxes);
            expect(result.success).toBe(true);
        });

        it('should handle missing tax values (fallbacks) in submitBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'USD' },
                approvalSteps: [],
                bids: []
            } as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.message.create.mockResolvedValue({} as any);

            // Mock taxes with missing values to hit || 0
            const taxes = [
                { label: 'P', type: 'PERCENTAGE', value: undefined },
                { label: 'F', type: 'FIXED', value: null }
            ];

            const result = await submitBid('req-1', 100, 'Msg', 'USD', taxes as any);
            expect(result.success).toBe(true);
        });

        it('should handle missing tax values (fallbacks) in updateBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                company: { currency: 'USD' },
                approvalSteps: [],
                bids: []
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.message.create.mockResolvedValue({} as any);

            const taxes = [
                { label: 'P', type: 'PERCENTAGE', value: undefined },
                { label: 'F', type: 'FIXED', value: null }
            ];

            const result = await updateBid('bid-1', 'req-1', 100, 'Msg', 'USD', taxes as any);
            expect(result.success).toBe(true);
        });

        it('should handle missing tax values (fallbacks) in approveBidInternal via approveBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            const mockBid = {
                id: 'bid-tax',
                amount: { amount: 10000, currencyCode: 'USD' },
                // Missing values in stored bid taxes
                taxes: [
                    { label: 'P', type: 'PERCENTAGE', value: null },
                    { label: 'F', type: 'FIXED', value: undefined }
                ],
                agencyId: 'agency-1',
                agency: { users: [] },
                request: {
                    id: 'req-1',
                    company: { currency: 'USD' },
                    status: RequestStatus.APPROVED
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);

            const result = await approveBid('bid-tax', 'req-1');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid with Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.agentBid.update.mockRejectedValue(new Error('Update failed'));
            const result = await updateBid('b1', 'r1', 110, 'Msg');
            expect(result.error).toBe('Failed to update bid');
        });

        it('should handle unapproveBid with Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('Unapprove failed'));
            const result = await unapproveBid('b1', 'r1');
            expect(result.error).toBe('Failed to unapprove bid');
        });

        it('should handle removeBid with Error object in catch', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('Remove failed'));
            const result = await removeBid('b1', 'r1');
            expect(result.error).toBe('Failed to remove bid');
        });

        it('should return error if request not found in submitBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);

            const result = await submitBid('req-missing', 100, 'Msg');
            expect(result.error).toBe('Request not found');
        });

        it('should handle auto-approval evaluation false in submitBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'req-eval-false',
                status: RequestStatus.APPROVED,
                approvalSteps: [],
                budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                company: { currency: 'USD' },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as any);
            prismaMock.user.findMany.mockResolvedValue([]);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({
                shouldAutoApprove: false
                // matchedRule missing or doesn't matter
            });

            const result = await submitBid('req-eval-false', 100, 'Msg');
            expect(result.success).toBe(true);
            // Verify isWithinThreshold was false (implied by success and no auto-accept)
            expect(prismaMock.agentBid.create).toHaveBeenCalled();
        });

        it('should handle missing rule config (null/undefined) in submitBid', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            const mockRequest = {
                id: 'req-bad-config',
                company: { currency: 'USD' },
                approvalSteps: [{
                    metadata: {
                        autoApproved: true,
                        ruleType: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        ruleConfig: null // Malformed
                    }
                }],
                budget: { amount: 100, currencyCode: 'USD', multiplier: 100 },
                bids: []
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as any);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-bad' } as any);

            // Mock findUnique for approveBidInternal which is triggered by auto-approval logic
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-bad',
                agencyId: 'agency-1',
                amount: { amount: 100, currencyCode: 'USD', multiplier: 100 },
                taxes: [],
                agency: { users: [] },
                request: mockRequest
            } as any);
            prismaMock.agentBid.update.mockResolvedValue({ id: 'bid-bad' } as any);
            prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            prismaMock.user.findMany.mockResolvedValue([]);
            prismaMock.message.create.mockResolvedValue({} as any);

            const result = await submitBid('req-bad-config', 100, 'Msg');
            expect(result.success).toBe(true);
        });

        it('should handle updateBid when request not found', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);

            const result = await updateBid('b1', 'req-missing-upd', 100, 'Msg');
            expect(result.error).toBe('Request not found');
        });
    });

    it('should notify agent users when unapproving a bid', async () => {
        (getServerSession as Mock).mockResolvedValue(mockAdminSession);
        const mockBid = {
            id: 'bid-unapprove-notify',
            request: {
                id: 'req-1',
                title: 'Trip',
                status: RequestStatus.IN_PROGRESS,
                company: { slug: 'comp' }
            },
            agency: {
                users: [
                    { id: 'agent-u1', email: 'agent1@test.com' },
                    { id: 'agent-u2', email: 'agent2@test.com' }
                ]
            }
        };
        prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
        prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.tripRequest.update.mockResolvedValue({} as any);
        prismaMock.message.create.mockResolvedValue({} as any);
        prismaMock.activityLog.create.mockResolvedValue({} as any);

        const result = await unapproveBid('bid-unapprove-notify', 'req-1');

        expect(result.success).toBe(true);
        expect(createNotification).toHaveBeenCalledTimes(2); // Once for each agent user
        expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'agent-u1',
            type: 'WARNING', // NotificationType.WARNING
            title: 'Bid Status Update'
        }));
    });

    it('should handle unapproveBid when agency users are undefined (coverage)', async () => {
        (getServerSession as Mock).mockResolvedValue(mockAdminSession);
        const mockBid = {
            id: 'bid-no-users',
            request: {
                id: 'req-1',
                title: 'Trip',
                status: RequestStatus.IN_PROGRESS,
                company: { slug: 'comp' }
            },
            agency: {} // users is undefined
        };
        prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
        prismaMock.agentBid.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.tripRequest.update.mockResolvedValue({} as any);
        prismaMock.message.create.mockResolvedValue({} as any);
        prismaMock.activityLog.create.mockResolvedValue({} as any);

        const result = await unapproveBid('bid-no-users', 'req-1');

        expect(result.success).toBe(true);
        // Should not crash, and not call createNotification
        const { createNotification } = await import('@/lib/notifications');
        expect(createNotification).not.toHaveBeenCalled();
    });

    describe('withdrawBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
        });

        it('should return error if unauthorized (no session)', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toBe("Unauthorized");
        });

        it('should return error if wrong role', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: UserRole.EMPLOYEE } });
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toBe("Unauthorized");
        });

        it('should return error if bid not found', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue(null);
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toBe("Bid not found");
        });

        it('should return error if not bid owner', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue({ agencyId: 'other-agency' } as any);
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toBe("You can only withdraw your own agency's bids");
        });

        it('should return error if trip completed or cancelled', async () => {
            prismaMock.agentBid.findUnique.mockResolvedValue({
                agencyId: 'agency-1',
                request: { status: RequestStatus.COMPLETED }
            } as any);
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toContain("completed");

            prismaMock.agentBid.findUnique.mockResolvedValue({
                agencyId: 'agency-1',
                request: { status: RequestStatus.CANCELLED }
            } as any);
            const result2 = await withdrawBid('bid-1', 'req-1');
            expect(result2.error).toContain("cancelled");
        });

        it('should withdraw accepted bid and reset request', async () => {
            const mockBid = {
                id: 'bid-1',
                agencyId: 'agency-1',
                status: BidStatus.ACCEPTED,
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    companyId: 'co-1',
                    company: { slug: 'co' },
                    userId: 'u1',
                    user: { id: 'u1' } // Added to trigger notification branch
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any); // company admins
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            const result = await withdrawBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'req-1' },
                data: expect.objectContaining({
                    status: RequestStatus.APPROVED,
                    agencyId: null,
                    cost: Prisma.JsonNull
                })
            }));
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: { status: BidStatus.PENDING }
            }));
            expect(createNotification).toHaveBeenCalledTimes(2); // Admin + Creator
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                type: NotificationType.WARNING
            }));
            expect(prismaMock.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: ActivityLogAction.BID_REMOVED })
            }));
        });

        it('should skip creator notification if creator is an admin', async () => {
            const mockBid = {
                id: 'bid-1',
                agencyId: 'agency-1',
                status: BidStatus.ACCEPTED,
                request: {
                    id: 'req-1',
                    title: 'Trip',
                    companyId: 'co-1',
                    company: { slug: 'co' },
                    userId: 'admin-1',
                    user: { id: 'admin-1' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);
            prismaMock.tripRequest.update.mockResolvedValue({} as any);
            prismaMock.agentBid.update.mockResolvedValue({} as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.activityLog.create.mockResolvedValue({} as any);

            await withdrawBid('bid-1', 'req-1');

            expect(createNotification).toHaveBeenCalledTimes(1); // Only Admin
        });

        it('should withdraw pending bid without resetting request', async () => {
            const mockBid = {
                id: 'bid-1',
                agencyId: 'agency-1',
                status: BidStatus.PENDING,
                request: {
                    id: 'req-1',
                    company: { slug: 'co' }
                }
            };
            prismaMock.agentBid.findUnique.mockResolvedValue(mockBid as any);

            const result = await withdrawBid('bid-1', 'req-1');

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: { status: BidStatus.PENDING }
            }));
        });

        it('should handle catch block error', async () => {
            prismaMock.agentBid.findUnique.mockRejectedValue(new Error('Catch Error'));
            const result = await withdrawBid('bid-1', 'req-1');
            expect(result.error).toBe("Failed to withdraw bid");
        });
    });
});
