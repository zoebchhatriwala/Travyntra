import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { submitBid } from '../../../app/agent/bids/[requestId]/actions';
import { prismaMock } from '../prisma';
import { getServerSession } from 'next-auth';
import { createMockTripRequest, createMockCompany } from '../factories';
import { BidStatus, UserRole, TripRequest, AgentBid, User } from '@prisma/client';
import { AutoApprovalEngine } from '../../auto-approval-engine';

vi.mock('next-auth');
vi.mock('../../auto-approval-engine');
vi.mock('../../notifications', () => ({
    createNotification: vi.fn().mockResolvedValue({}),
}));

describe('Bidding Integration (Server Actions)', () => {
    const userId = 'agent-1';
    const agencyId = 'agency-1';
    const requestId = 'request-1';

    beforeEach(() => {
        vi.clearAllMocks();
        (getServerSession as Mock).mockResolvedValue({
            user: { id: userId, companyId: agencyId, role: UserRole.TRAVEL_AGENT, name: 'Agent User' }
        });
    });

    describe('submitBid', () => {
        it('should successfully submit a bid and create notification', async () => {
            const mockCompany = createMockCompany({ id: 'company-1', slug: 'test-co' });
            const mockRequest = createMockTripRequest({
                id: requestId,
                companyId: 'company-1',
                company: mockCompany,
                approvalSteps: [],
                bids: []
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1' } as unknown as AgentBid);
            prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }] as unknown as User[]);
            (AutoApprovalEngine.evaluateRequest as Mock).mockResolvedValue({ shouldAutoApprove: false });

            const result = await submitBid(requestId, 1000, 'Our best offer', 'USD');

            expect(result.success).toBe(true);
            expect(prismaMock.agentBid.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    amount: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
                    message: 'Our best offer'
                })
            }));
            expect(prismaMock.message.create).toHaveBeenCalled(); // System message
            expect(prismaMock.user.findMany).toHaveBeenCalled(); // Notify admins
        });

        it('should fail if user is not a travel agent', async () => {
            (getServerSession as Mock).mockResolvedValue({
                user: { id: 'user-1', role: UserRole.EMPLOYEE }
            });

            const result = await submitBid(requestId, 1000, 'Offer');

            expect(result.error).toBe("Unauthorized");
        });

        it('should auto-accept bid if request was auto-approved and bid is within threshold', async () => {
            const mockBudget = { amount: 2000, currencyCode: 'USD', multiplier: 1 };
            const mockCompany = createMockCompany({ id: 'company-1' });
            const mockRequest = createMockTripRequest({
                id: requestId,
                budget: mockBudget,
                company: mockCompany,
                approvalSteps: [
                    {
                        metadata: {
                            autoApproved: true,
                            ruleType: 'BUDGET_THRESHOLD',
                            ruleConfig: { limit: 5000 }
                        }
                    }
                ],
                bids: []
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);
            prismaMock.agentBid.create.mockResolvedValue({ id: 'bid-1', agencyId, request: mockRequest, agency: { users: [] } } as unknown as AgentBid);
            prismaMock.agentBid.findUnique.mockResolvedValue({
                id: 'bid-1',
                agencyId,
                amount: { amount: 1500, currencyCode: 'USD', multiplier: 1 },
                request: { ...mockRequest, company: mockCompany },
                agency: { users: [] }
            } as unknown as AgentBid);
            prismaMock.user.findMany.mockResolvedValue([]);

            const result = await submitBid(requestId, 1500, 'Low bid', 'USD');

            expect(result.success).toBe(true);
            // Verify auto-approval logic via side effects (internal helper calls)
            expect(prismaMock.agentBid.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'bid-1' },
                data: { status: BidStatus.ACCEPTED }
            }));
        });
    });
});
