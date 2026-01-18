
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getAgencyStats, getRecentOpportunities } from '@/app/agent/dashboard/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { RequestStatus } from '@prisma/client';

// Mocks
vi.mock('next-auth');

describe('Agent Dashboard Actions', () => {
    const mockAgentSession = {
        user: {
            id: 'agent-1',
            companyId: 'agency-1',
            role: 'TRAVEL_AGENT',
            name: 'Agent User'
        }
    };

    const mockEmployeeSession = {
        user: {
            id: 'employee-1',
            companyId: 'agency-1',
            role: 'AGENCY_EMPLOYEE',
            name: 'Employee User'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getAgencyStats', () => {
        it('should return zero stats if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getAgencyStats();
            expect(result).toEqual({
                openOpportunities: 0,
                activeBids: 0,
                pendingFulfillment: 0,
                totalRevenue: 0,
                currency: "USD"
            });
        });

        it('should return zero stats if role is invalid', async () => {
            (getServerSession as Mock).mockResolvedValue({
                user: {
                    id: 'user-1',
                    companyId: 'company-1',
                    role: 'EMPLOYEE' // Not an agent role
                }
            });
            const result = await getAgencyStats();
            expect(result.openOpportunities).toBe(0);
        });

        it('should return full stats for TRAVEL_AGENT', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);

            // Mock concurrent counts
            // Order: openOpportunities, activeBids, pendingFulfillment
            prismaMock.tripRequest.count.mockResolvedValueOnce(5); // opportunities
            prismaMock.agentBid.count.mockResolvedValueOnce(3); // active bids
            prismaMock.tripRequest.count.mockResolvedValueOnce(2); // fulfillment

            prismaMock.company.findUnique.mockResolvedValue({ currency: 'EUR' } as any);

            const result = await getAgencyStats();

            expect(result).toEqual({
                openOpportunities: 5,
                activeBids: 3,
                pendingFulfillment: 2,
                totalRevenue: 0,
                currency: 'EUR'
            });

            // Verify query structure for opportunities
            expect(prismaMock.tripRequest.count).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: { in: [RequestStatus.APPROVED, RequestStatus.PENDING_QUOTATION] },
                    agencyId: null
                })
            }));
        });

        it('should return specific stats for AGENCY_EMPLOYEE', async () => {
            (getServerSession as Mock).mockResolvedValue(mockEmployeeSession);

            // For employee, it only counts pending fulfillment.
            // openOpportunities and activeBids initialize to 0.
            prismaMock.tripRequest.count.mockResolvedValue(4); // fulfilment count
            prismaMock.company.findUnique.mockResolvedValue({ currency: 'GBP' } as any);

            const result = await getAgencyStats();

            // Employee logic initializes open & active to 0 and only updates pendingFulfillment
            // Wait, looking at code:
            // if (isAgent) { ... } else { pendingFulfillment = ... }
            // So for employee: open=0, active=0, pending=4
            expect(result.openOpportunities).toBe(0);
            expect(result.activeBids).toBe(0);
            expect(result.pendingFulfillment).toBe(4);
            expect(result.currency).toBe('GBP');
        });

        it('should handle missing currency fallback', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);
            prismaMock.tripRequest.count.mockResolvedValue(0);
            prismaMock.agentBid.count.mockResolvedValue(0);
            prismaMock.company.findUnique.mockResolvedValue({ currency: null } as any);

            const result = await getAgencyStats();
            expect(result.currency).toBe('USD');
        });
    });

    describe('getRecentOpportunities', () => {
        it('should return empty array if unauthorized', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await getRecentOpportunities();
            expect(result).toEqual([]);
        });

        it('should return empty array if unauthorized role', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'EMPLOYEE' } });
            const result = await getRecentOpportunities();
            expect(result).toEqual([]);
        });

        it('should return empty array if user has no companyId', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { role: 'TRAVEL_AGENT', companyId: null } });
            const result = await getRecentOpportunities();
            expect(result).toEqual([]);
        });

        it('should return recent opportunities', async () => {
            (getServerSession as Mock).mockResolvedValue(mockAgentSession);

            const mockRequests = [
                { id: 'r1', title: 'Trip 1' },
                { id: 'r2', title: 'Trip 2' }
            ];
            prismaMock.tripRequest.findMany.mockResolvedValue(mockRequests as any);

            const result = await getRecentOpportunities();

            expect(result).toHaveLength(2);
            expect(result).toEqual(mockRequests);
            expect(prismaMock.tripRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                where: expect.objectContaining({
                    status: { in: [RequestStatus.APPROVED, RequestStatus.PENDING_QUOTATION] }
                })
            }));
        });
    });
});
