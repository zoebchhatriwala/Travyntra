
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getIntegratedCompanies } from '@/app/agent/bids/actions';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { IntegrationStatus } from '@prisma/client';

// Mocks
vi.mock('next-auth');

describe('Agent Bids Actions - getIntegratedCompanies', () => {
    const mockSession = {
        user: {
            id: 'agent-1',
            companyId: 'agency-1',
            role: 'TRAVEL_AGENT'
        }
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return empty array if unauthorized', async () => {
        (getServerSession as Mock).mockResolvedValue(null);
        const result = await getIntegratedCompanies();
        expect(result).toEqual([]);
    });

    it('should return empty array if no companyId', async () => {
        (getServerSession as Mock).mockResolvedValue({ user: { id: 'user-no-company' } });
        const result = await getIntegratedCompanies();
        expect(result).toEqual([]);
    });

    it('should return mapped companies from active integrations', async () => {
        (getServerSession as Mock).mockResolvedValue(mockSession);

        const mockIntegrations = [
            {
                id: 'int-1',
                company: { id: 'c1', name: 'Company 1', slug: 'comp1' }
            },
            {
                id: 'int-2',
                company: { id: 'c2', name: 'Company 2', slug: 'comp2' }
            }
        ];

        prismaMock.agencyIntegration.findMany.mockResolvedValue(mockIntegrations as any);

        const result = await getIntegratedCompanies();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(mockIntegrations[0].company);
        expect(result[1]).toEqual(mockIntegrations[1].company);

        expect(prismaMock.agencyIntegration.findMany).toHaveBeenCalledWith({
            where: {
                agencyId: 'agency-1',
                status: IntegrationStatus.ACTIVE
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });
    });

    it('should return empty array if no active integrations found', async () => {
        (getServerSession as Mock).mockResolvedValue(mockSession);
        prismaMock.agencyIntegration.findMany.mockResolvedValue([]);

        const result = await getIntegratedCompanies();
        expect(result).toEqual([]);
    });
});
