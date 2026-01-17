
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    submitBid,
    updateBid,
    approveBid,
    unapproveBid,
    removeBid,
    getConversionPreview
} from '@/app/agent/bids/[requestId]/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { BidStatus, RequestStatus } from '@prisma/client';
import { AutoApprovalRuleType } from '@/types/workflow/auto-approval-policy';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { createNotification } from '@/lib/notifications';
import { convertMoney } from '@/lib/services/currency';

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

        it('should return error if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await submitBid('req-1', 100, 'Msg');
            expect(result.error).toBe('Unauthorized');
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
                prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as any);

                const result = await updateBid('bid-1', 'req-1', 200, 'New Msg', 'USD', []);

                expect(result.success).toBe(true);
                expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                    where: { id: 'bid-1' },
                    data: expect.objectContaining({ message: 'New Msg' })
                }));
                expect(createNotification).toHaveBeenCalled();
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
        });
    });

    describe('approveBid', () => {
        beforeEach(() => {
            (getServerSession as Mock).mockResolvedValue(mockAdminSession);
            (convertMoney as Mock).mockImplementation((money) => Promise.resolve(money));
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
    });
});
