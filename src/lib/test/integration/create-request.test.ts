
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createTripRequest } from '@/app/company/[slug]/(dashboard)/dashboard/actions';
import { prismaMock } from '../prisma';
import { getServerSession } from 'next-auth';
import { TripRequest, Message } from '@prisma/client';
import { WorkflowEngine } from '@/lib/workflow-engine';

// Mock dependencies
vi.mock('next-auth');
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock WorkflowEngine
// Note: The action uses dynamic import, but vi.mock should handle it 
// if we mock the module path.
vi.mock('@/lib/workflow-engine', () => ({
    WorkflowEngine: {
        startWorkflow: vi.fn(),
    }
}));

// Mock TripPreferencesSchema to pass validation
vi.mock('@/lib/schemas/trip-preferences', () => ({
    TripPreferencesSchema: {
        safeParse: () => ({ success: true })
    }
}));


describe('createTripRequest', () => {
    const mockSession = {
        user: {
            id: 'user-123',
            companyId: 'company-123',
            companySlug: 'test-co',
            name: 'Test User',
            email: 'test@test.com'
        }
    };

    const validRequestData = {
        title: 'Business Trip to NY',
        destination: { city: 'New York', country: 'US' },
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        purpose: 'Meeting',
        budget: { amount: 100000, currencyCode: 'USD', multiplier: 100 },
        preferences: { hotel: '4 star' }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
    });

    it('should retrieve company and user from session and create request', async () => {
        // Mock successful creation
        prismaMock.tripRequest.create.mockResolvedValue({
            id: 'req-new-1',
            userId: mockSession.user.id,
            companyId: mockSession.user.companyId,
            status: 'DRAFT',
            ...validRequestData
        } as unknown as TripRequest);

        prismaMock.message.create.mockResolvedValue({ id: 'msg-1' } as unknown as Message);

        const result = await createTripRequest(validRequestData);

        expect(result).toEqual({ success: true, requestId: 'req-new-1' });

        expect(prismaMock.tripRequest.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: mockSession.user.id,
                companyId: mockSession.user.companyId,
                title: validRequestData.title,
                status: 'DRAFT',
            })
        }));

        expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                requestId: 'req-new-1',
                senderId: mockSession.user.id,
            })
        }));

        // Verify WorkflowEngine.startWorkflow is called
        expect(WorkflowEngine.startWorkflow).toHaveBeenCalledWith('req-new-1');
    });

    it('should return error if not authenticated', async () => {
        (getServerSession as Mock).mockResolvedValue(null);
        const result = await createTripRequest(validRequestData);
        expect(result).toEqual({ error: "Unauthenticated or not associated with a company." });
    });

    it('should return error if database creation fails', async () => {
        prismaMock.tripRequest.create.mockRejectedValue(new Error('DB Error'));
        const result = await createTripRequest(validRequestData);
        expect(result).toEqual({ error: "Failed to create trip request." });
        expect(WorkflowEngine.startWorkflow).not.toHaveBeenCalled();
    });
});
