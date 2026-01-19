
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { PlanGuardService, PlanFeature, withPlanGuard, PlanGuard } from '@/lib/services/plan-guard';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { getServerSession } from 'next-auth';
import { PLAN_CONFIG } from '@/lib/constants/plans';

vi.mock('next-auth');

describe('PlanGuardService', () => {
    const mockCompanyId = 'company-123';
    const mockCompany = {
        id: mockCompanyId,
        plan: 'FREE',
        type: 'COMPANY',
        timezone: 'UTC'
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('checkUsage', () => {
        it('should throw error if company not found', async () => {
            prismaMock.company.findUnique.mockResolvedValue(null);
            await expect(PlanGuardService.checkUsage(mockCompanyId, PlanFeature.CREATE_REQUEST))
                .rejects.toThrow(`Company not found: ${mockCompanyId}`);
        });

        it('should return allowed: true if limit is Infinity', async () => {
            prismaMock.company.findUnique.mockResolvedValue({
                ...mockCompany,
                plan: 'ENTERPRISE',
                type: 'AGENT'
            } as any);

            // Test for multiple features that have Infinity in Enterprise
            const features = [
                PlanFeature.CREATE_REQUEST,
                PlanFeature.ADD_INTEGRATION,
                PlanFeature.ADD_TAX_TEMPLATE,
                PlanFeature.MAX_ACTIVE_BIDS,
                PlanFeature.FULFILLMENTS_PER_MONTH
            ];

            for (const feature of features) {
                const result = await PlanGuardService.checkUsage(mockCompanyId, feature);
                expect(result.allowed).toBe(true);
                expect(result.limit).toBe(Infinity);
            }
        });

        it('should enforce monthly limits for CREATE_REQUEST', async () => {
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);
            const limit = PLAN_CONFIG.FREE.allowedRequestsPerMonth;

            // Case 1: Below limit
            prismaMock.tripRequest.count.mockResolvedValue(limit - 1);
            let result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.CREATE_REQUEST);
            expect(result.allowed).toBe(true);
            expect(result.usage).toBe(limit - 1);

            // Case 2: At limit
            prismaMock.tripRequest.count.mockResolvedValue(limit);
            result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.CREATE_REQUEST);
            expect(result.allowed).toBe(false);
            expect(result.usage).toBe(limit);
        });

        it('should enforce limits for ADD_INTEGRATION', async () => {
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);
            const limit = PLAN_CONFIG.FREE.allowedIntegrations;

            prismaMock.agencyIntegration.count.mockResolvedValue(limit);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.ADD_INTEGRATION);
            expect(result.allowed).toBe(false);
        });

        it('should restrict ADD_TAX_TEMPLATE to Agent accounts', async () => {
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any); // Type IS 'COMPANY'
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.ADD_TAX_TEMPLATE);
            expect(result.allowed).toBe(false);
            expect(result.message).toContain('Agency accounts');
        });

        it('should enforce limits for ADD_TAX_TEMPLATE for Agents', async () => {
            prismaMock.company.findUnique.mockResolvedValue({
                ...mockCompany,
                type: 'AGENT'
            } as any);
            const limit = PLAN_CONFIG.FREE.allowedTaxTemplates;

            prismaMock.taxTemplate.count.mockResolvedValue(limit);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.ADD_TAX_TEMPLATE);
            expect(result.allowed).toBe(false);
        });

        it('should restrict MAX_ACTIVE_BIDS to Agent accounts', async () => {
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.MAX_ACTIVE_BIDS);
            expect(result.allowed).toBe(false);
            expect(result.message).toContain('Agency accounts');
        });

        it('should enforce limits for MAX_ACTIVE_BIDS for Agents', async () => {
            prismaMock.company.findUnique.mockResolvedValue({
                ...mockCompany,
                type: 'AGENT'
            } as any);
            const limit = PLAN_CONFIG.FREE.allowedActiveBids;

            prismaMock.agentBid.count.mockResolvedValue(limit);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.MAX_ACTIVE_BIDS);
            expect(result.allowed).toBe(false);
        });

        it('should restrict FULFILLMENTS_PER_MONTH to Agent accounts', async () => {
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.FULFILLMENTS_PER_MONTH);
            expect(result.allowed).toBe(false);
        });

        it('should enforce limits for FULFILLMENTS_PER_MONTH for Agents', async () => {
            prismaMock.company.findUnique.mockResolvedValue({
                ...mockCompany,
                type: 'AGENT'
            } as any);
            const limit = PLAN_CONFIG.FREE.allowedFullfillmentsPerMonth;

            prismaMock.agentBid.count.mockResolvedValue(limit);
            const result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.FULFILLMENTS_PER_MONTH);
            expect(result.allowed).toBe(false);
        });

        it('should handle ACCESS_ANALYTICS feature gating', async () => {
            // Free plan cannot access analytics
            prismaMock.company.findUnique.mockResolvedValue(mockCompany as any);
            let result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.ACCESS_ANALYTICS);
            expect(result.allowed).toBe(false);

            // Business plan can access analytics
            prismaMock.company.findUnique.mockResolvedValue({
                ...mockCompany,
                plan: 'STARTER'
            } as any);
            result = await PlanGuardService.checkUsage(mockCompanyId, PlanFeature.ACCESS_ANALYTICS);
            expect(result.allowed).toBe(true);
        });
    });

    describe('enforce', () => {
        it('should throw error if checkUsage is not allowed', async () => {
            vi.spyOn(PlanGuardService, 'checkUsage').mockResolvedValue({
                allowed: false,
                message: 'Limit reached',
                limit: 10,
                usage: 10,
                planName: 'Free'
            });

            await expect(PlanGuardService.enforce(mockCompanyId, PlanFeature.CREATE_REQUEST))
                .rejects.toThrow('Limit reached');
        });

        it('should not throw if checkUsage is allowed', async () => {
            vi.spyOn(PlanGuardService, 'checkUsage').mockResolvedValue({
                allowed: true,
                limit: 10,
                usage: 5,
                planName: 'Free'
            });

            await expect(PlanGuardService.enforce(mockCompanyId, PlanFeature.CREATE_REQUEST))
                .resolves.not.toThrow();
        });

        it('should use fallback error message if result.message is missing', async () => {
            vi.spyOn(PlanGuardService, 'checkUsage').mockResolvedValue({
                allowed: false,
                limit: 10,
                usage: 10,
                planName: 'Free'
                // message is undefined
            });

            await expect(PlanGuardService.enforce(mockCompanyId, PlanFeature.CREATE_REQUEST))
                .rejects.toThrow(`Plan limit reached for ${PlanFeature.CREATE_REQUEST}`);
        });
    });
});

describe('PlanGuard High-Order Functions & Decorators', () => {
    let mockAction: any;

    beforeEach(() => {
        vi.resetAllMocks();
        mockAction = vi.fn().mockResolvedValue({ success: true });
    });

    describe('withPlanGuard', () => {
        it('should return error if session is missing companyId', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const guardedAction = withPlanGuard(PlanFeature.CREATE_REQUEST, mockAction);
            const result = await guardedAction();
            expect(result).toEqual({ error: "Unauthenticated or not associated with a company." });
            expect(mockAction).not.toHaveBeenCalled();
        });

        it('should return error if plan enforcement fails', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockRejectedValue(new Error('Plan limit reached'));

            const guardedAction = withPlanGuard(PlanFeature.CREATE_REQUEST, mockAction);
            const result = await guardedAction();

            expect(result).toEqual({ error: 'Plan limit reached' });
            expect(mockAction).not.toHaveBeenCalled();
        });

        it('should call original action if allowed', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockResolvedValue(undefined);

            const guardedAction = withPlanGuard(PlanFeature.CREATE_REQUEST, mockAction);
            const result = await guardedAction('test-arg');

            expect(result).toEqual({ success: true });
            expect(mockAction).toHaveBeenCalledWith('test-arg');
        });

        it('should handle non-Error catch cases in enforcement', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockRejectedValue('String Error');

            const guardedAction = withPlanGuard(PlanFeature.CREATE_REQUEST, mockAction);
            const result = await guardedAction();

            expect(result).toEqual({ error: 'Plan limit reached' });
        });
    });

    describe('PlanGuard Decorator', () => {
        class TestActions {
            @PlanGuard(PlanFeature.MAX_ACTIVE_BIDS)
            static async submitBid(bid: string) {
                return { bid };
            }
        }

        it('should return error if session missing companyId', async () => {
            (getServerSession as Mock).mockResolvedValue(null);
            const result = await TestActions.submitBid('123');
            expect(result).toEqual({ error: "Unauthenticated or not associated with a company." });
        });

        it('should return error if enforcement fails', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockRejectedValue(new Error('Decorator limit reached'));

            const result = await TestActions.submitBid('123');
            expect(result).toEqual({ error: 'Decorator limit reached' });
        });

        it('should call original method if allowed', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockResolvedValue(undefined);

            const result = await TestActions.submitBid('123');
            expect(result).toEqual({ bid: '123' });
        });

        it('should handle non-Error catch cases in enforcement', async () => {
            (getServerSession as Mock).mockResolvedValue({ user: { companyId: 'c1' } });
            vi.spyOn(PlanGuardService, 'enforce').mockRejectedValue('String Error');

            const result = await TestActions.submitBid('123');
            expect(result).toEqual({ error: 'Plan limit reached' });
        });
    });
});
