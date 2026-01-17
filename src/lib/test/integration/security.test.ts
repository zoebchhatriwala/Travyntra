
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getTripRequest } from '@/app/company/[slug]/(dashboard)/dashboard/actions';
import { prismaMock } from '../helpers/prisma';
import { getServerSession } from 'next-auth';
import { TripRequest } from '@prisma/client';

// Mock dependencies
vi.mock('next-auth');

describe('Security Integration Tests', () => {
    const mockSession = {
        user: {
            id: 'user-1',
            companyId: 'company-a',
            role: 'EMPLOYEE',
            name: 'User A',
            email: 'user-a@company-a.com'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (getServerSession as Mock).mockResolvedValue(mockSession);
    });

    describe('getTripRequest (Multi-tenancy)', () => {
        it('should return null if user belongs to a different company', async () => {
            // Request belongs to Company B
            const mockRequest = {
                id: 'req-1',
                companyId: 'company-b',
                userId: 'user-2',
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await getTripRequest('req-1');

            expect(result).toBeNull();
        });

        it('should return request if user belongs to the same company and is owner', async () => {
            const mockRequest = {
                id: 'req-1',
                companyId: 'company-a', // Matches session
                userId: 'user-1',       // Matches session (Owner)
                company: { currency: 'USD' },
                destination: { city: 'Paris', country: 'France' },
                bids: [],
                approvalSteps: [],
                collaborators: [],
                messages: [],
                documents: [],
                childTrips: [],
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await getTripRequest('req-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
        });

        it('should return null if employee is accessing another employees request without being collaborator/approver', async () => {
            const mockRequest = {
                id: 'req-2',
                companyId: 'company-a', // Same company
                userId: 'user-2',       // Different user
                collaborators: [],
                approvalSteps: [],
                company: { currency: 'USD' },
                destination: { city: 'Paris', country: 'France' },
                bids: [],
                messages: [],
                documents: [],
                childTrips: [],
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await getTripRequest('req-2');

            expect(result).toBeNull();
        });

        it('should return request if employee is a collaborator', async () => {
            const mockRequest = {
                id: 'req-2',
                companyId: 'company-a',
                userId: 'user-2',
                collaborators: [{ id: 'user-1' }], // User is collaborator
                approvalSteps: [],
                company: { currency: 'USD' },
                destination: { city: 'London', country: 'UK' },
                bids: [],
                messages: [],
                documents: [],
                childTrips: [],
            };

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await getTripRequest('req-2');

            expect(result).not.toBeNull();
        });
    });
});
