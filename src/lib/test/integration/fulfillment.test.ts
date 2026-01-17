import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { addFulfillmentItem, markAsCompleted } from '../../../app/agent/fulfillment/actions';
import { prismaMock } from '../helpers/prisma';
import { getServerSession } from 'next-auth';
import { createMockTripRequest, createMockCompany } from '../helpers/factories';
import { RequestStatus, UserRole, TripRequest, FulfillmentItem, User } from '@prisma/client';

vi.mock('next-auth');
vi.mock('../../notifications', () => ({
    createNotification: vi.fn().mockResolvedValue({}),
}));

describe('Fulfillment Integration (Server Actions)', () => {
    const userId = 'agent-1';
    const agencyId = 'agency-1';
    const requestId = 'request-1';

    beforeEach(() => {
        vi.clearAllMocks();
        (getServerSession as Mock).mockResolvedValue({
            user: { id: userId, companyId: agencyId, role: UserRole.TRAVEL_AGENT, name: 'Agent User' }
        });
    });

    describe('addFulfillmentItem', () => {
        it('should successfully add an item to the checklist', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                agencyId,
                fulfillmentItems: []
            });

            prismaMock.tripRequest.findFirst.mockResolvedValue(mockRequest as unknown as TripRequest);
            prismaMock.fulfillmentItem.create.mockResolvedValue({ id: 'item-1', order: 0 } as unknown as FulfillmentItem);

            const result = await addFulfillmentItem(requestId, 'Flight Ticket');

            expect(result.success).toBe(true);
            expect(prismaMock.fulfillmentItem.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    requestId,
                    title: 'Flight Ticket',
                    order: 0
                })
            }));
        });

        it('should fail if request is not assigned to the agency', async () => {
            prismaMock.tripRequest.findFirst.mockResolvedValue(null);

            const result = await addFulfillmentItem(requestId, 'Flight Ticket');

            expect(result.error).toBe("Request not found or not assigned to your agency");
        });
    });

    describe('markAsCompleted', () => {
        it('should successfully complete if all items are checked', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                agencyId,
                status: RequestStatus.BOOKED,
                company: createMockCompany({ slug: 'test-co' }),
                fulfillmentItems: [
                    { id: 'item-1', isCompleted: true },
                    { id: 'item-2', isCompleted: true }
                ]
            });

            prismaMock.tripRequest.findFirst.mockResolvedValue(mockRequest as unknown as TripRequest);
            prismaMock.user.findMany.mockResolvedValue([] as unknown as User[]); // For notifications

            const result = await markAsCompleted(requestId);

            expect(result.success).toBe(true);
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith({
                where: { id: requestId },
                data: { status: RequestStatus.COMPLETED }
            });
        });

        it('should fail if some items are incomplete', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                agencyId,
                status: RequestStatus.BOOKED,
                fulfillmentItems: [
                    { id: 'item-1', isCompleted: true },
                    { id: 'item-2', isCompleted: false }
                ]
            });

            prismaMock.tripRequest.findFirst.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await markAsCompleted(requestId);

            expect(result.error).toBe("1 checklist item(s) are still incomplete");
            expect(prismaMock.tripRequest.update).not.toHaveBeenCalled();
        });

        it('should fail if no fulfillment items exist', async () => {
            const mockRequest = createMockTripRequest({
                id: requestId,
                agencyId,
                status: RequestStatus.BOOKED,
                fulfillmentItems: []
            });

            prismaMock.tripRequest.findFirst.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await markAsCompleted(requestId);

            expect(result.error).toBe("Please add at least one fulfillment item before completing");
        });
    });
});
