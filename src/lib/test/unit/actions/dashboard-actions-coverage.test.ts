
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    createTripRequest,
    getTripRequest,
    postTripMessage,
    updateEmployeeProfile
} from '@/app/company/[slug]/(dashboard)/dashboard/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { TripPreferencesSchema } from '@/lib/schemas/trip-preferences';

// Mock dependencies
vi.mock('next-auth');
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));
vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        startWorkflow: vi.fn(),
    }
}));
vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn(),
}));

// Mock TripPreferencesSchema to control validation
vi.mock('@/lib/schemas/trip-preferences', () => ({
    TripPreferencesSchema: {
        safeParse: vi.fn()
    }
}));

vi.mock('@/lib/services/plan-guard', () => ({
    PlanFeature: {
        CREATE_REQUEST: 'CREATE_REQUEST',
        ADD_INTEGRATION: 'ADD_INTEGRATION',
        ADD_TAX_TEMPLATE: 'ADD_TAX_TEMPLATE',
        MAX_ACTIVE_BIDS: 'MAX_ACTIVE_BIDS',
        ACCESS_ANALYTICS: 'ACCESS_ANALYTICS',
        FULFILLMENTS_PER_MONTH: 'FULFILLMENTS_PER_MONTH'
    },
    PlanGuardService: {
        checkUsage: vi.fn().mockResolvedValue({ allowed: true, limit: 10, usage: 0, planName: 'Free' }),
        enforce: vi.fn().mockResolvedValue(undefined)
    },
    withPlanGuard: vi.fn((_feature, action) => action),
    PlanGuard: vi.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor)
}));

describe('Dashboard Actions Coverage', () => {
    const mockSession = {
        user: {
            id: 'user-1',
            companyId: 'company-1',
            companySlug: 'test-co',
            name: 'Test User',
            email: 'test@test.com',
            role: 'EMPLOYEE'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
    });

    describe('createTripRequest', () => {
        it('should handle invalid preferences gracefully', async () => {
            // Mock schema validation failure
            (TripPreferencesSchema.safeParse as Mock).mockReturnValue({
                success: false,
                error: { message: 'Invalid format' }
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            prismaMock.tripRequest.create.mockResolvedValue({
                id: 'req-1',
                company: { slug: 'co' }
            } as any);
            prismaMock.message.create.mockResolvedValue({} as any);

            const result = await createTripRequest({
                title: 'Trip',
                destination: { formatted: 'Paris' },
                startDate: new Date(),
                endDate: new Date(),
                preferences: { hotel: 'invalid' } as any
            } as any);

            expect(result.success).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid preferences format:", expect.anything());
            consoleSpy.mockRestore();
        });

        it('should return error if session is missing companyId', async () => {
            (getServerSession as Mock).mockResolvedValue({
                user: { id: 'user-1' } // Missing companyId
            });

            const result = await createTripRequest({ title: 'Trip' } as any);
            expect(result.error).toBe("Unauthenticated or not associated with a company.");
        });
    });

    describe('getTripRequest', () => {
        it('should return null if request does not exist', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);
            const result = await getTripRequest('non-existent');
            expect(result).toBeNull();
        });

        it('should return null if request belongs to another company', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'other-company',
                userId: 'user-1'
            } as any);
            const result = await getTripRequest('req-1');
            expect(result).toBeNull();
        });

        it('should return null for employee if not owner/collaborator/approver', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'company-1',
                userId: 'other-user',
                collaborators: [],
                approvalSteps: [{ approvals: [] }],
                company: { currency: 'USD' }
            } as any);

            const result = await getTripRequest('req-1');
            expect(result).toBeNull();
        });

        it('should return request for approver even if not owner', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'company-1',
                userId: 'other-user',
                collaborators: [],
                approvalSteps: [{
                    approvals: [{ userId: 'user-1' }] // Current user is approver
                }],
                company: { currency: 'USD' },
                bids: [],
                messages: [],
                documents: [],
                childTrips: [],
                // destination must be compatible
                destination: { formatted: 'Place' }
            } as any);

            const result = await getTripRequest('req-1');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
        });

        it('should return request for ADMIN even if not owner', async () => {
            (getServerSession as Mock).mockResolvedValue({
                user: { ...mockSession.user, role: 'COMPANY_ADMIN' }
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'company-1',
                userId: 'other-user',
                collaborators: [],
                approvalSteps: [],
                company: { currency: 'USD' },
                bids: [],
                messages: [],
                documents: [],
                childTrips: [],
                destination: { formatted: 'Place' }
            } as any);

            const result = await getTripRequest('req-1');
            expect(result).not.toBeNull();
        });

        it('should handle bids with taxes and currency conversion', async () => {
            // Mock complex bids
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                companyId: 'company-1',
                userId: 'user-1',
                collaborators: [],
                approvalSteps: [],
                company: { currency: 'EUR' },
                bids: [
                    {
                        id: 'bid-1',
                        amount: { amount: 10000, currencyCode: 'USD', multiplier: 100 }, // 100 USD
                        taxes: [
                            { type: 'PERCENTAGE', value: 10 }, // +10% = 110 USD
                            { type: 'FIXED', value: 5 } // +5 = 115 USD
                        ]
                    }
                ],
                messages: [],
                documents: [],
                childTrips: [],
                destination: { formatted: 'Place' }
            } as any);

            global.fetch = vi.fn().mockResolvedValue({
                json: async () => ({ success: true, rates: { 'USD': 1, 'EUR': 0.9 } })
            });

            const result = await getTripRequest('req-1');
            expect(result?.bids[0].totalAmount?.amount).toBeCloseTo(11500, -2); // 115 USD
            // 115 * 0.9 = 103.5 EUR
            expect(result?.bids[0].convertedAmount?.amount).toBeCloseTo(10350, -2);
        });

        it('should handle fetch errors gracefully', async () => {
            prismaMock.tripRequest.findUnique.mockRejectedValue(new Error('DB Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await getTripRequest('req-1');
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith("Error fetching request:", expect.anything());
            consoleSpy.mockRestore();
        });
    });

    describe('postTripMessage', () => {
        it('should return error if message is empty', async () => {
            const result = await postTripMessage('req-1', '   ');
            expect(result.error).toBe("Message cannot be empty");
        });

        it('should return error if request not found', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);
            const result = await postTripMessage('req-1', 'msg');
            expect(result.error).toBe("Request not found");
        });

        it('should handle mentions and add collaborators', async () => {
            const mockReq = {
                id: 'req-1',
                title: 'Trip',
                userId: 'owner',
                collaborators: [{ id: 'existing' }],
                company: { slug: 'co' }
            };
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockReq as any);
            prismaMock.message.create.mockResolvedValue({} as any);

            prismaMock.user.findMany.mockResolvedValue([
                { id: 'user-2', name: 'Alice' },
                { id: 'user-3', name: 'Bob' }
            ] as any);

            const result = await postTripMessage('req-1', 'Hi @Alice and @Bob');

            expect(result.success).toBe(true);

            // Should add user-2 and user-3 as collaborators
            expect(prismaMock.tripRequest.update).toHaveBeenCalledWith(expect.objectContaining({
                data: {
                    collaborators: {
                        connect: expect.arrayContaining([{ id: 'user-2' }, { id: 'user-3' }])
                    }
                }
            }));
        });

        it('should not notify creator if they are the sender', async () => {
            // Session user is 'user-1'
            // Request owner is 'user-1'
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                title: 'Trip',
                userId: 'user-1',
                collaborators: [],
                company: { slug: 'co' }
            } as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([]); // No mentionable users

            await postTripMessage('req-1', 'Self comment');

            // notifications should NOT be called for owner
            const { createNotification } = await import('@/lib/notifications');
            expect(createNotification).not.toHaveBeenCalled();
        });

        it('should notify creator if they are NOT the sender', async () => {
            // Session user is 'user-1'
            // Request owner is 'owner'
            prismaMock.tripRequest.findUnique.mockResolvedValue({
                id: 'req-1',
                title: 'Trip',
                userId: 'owner',
                collaborators: [],
                company: { slug: 'co' }
            } as any);
            prismaMock.message.create.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([]);

            await postTripMessage('req-1', 'Comment');

            const { createNotification } = await import('@/lib/notifications');
            expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'owner',
                title: 'New message on your request'
            }));
        });
    });

    describe('updateEmployeeProfile', () => {
        it('should return error if name is too short', async () => {
            const formData = new FormData();
            formData.append('name', 'A');
            const result = await updateEmployeeProfile(formData);
            expect(result.error).toBe("Name must be at least 2 characters.");
        });

        it('should handle db error', async () => {
            const formData = new FormData();
            formData.append('name', 'Valid');
            prismaMock.user.update.mockRejectedValue(new Error('DB Error'));

            const result = await updateEmployeeProfile(formData);
            expect(result.error).toBe("Failed to update profile.");
        });
    });
});
