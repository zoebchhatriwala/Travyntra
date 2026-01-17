import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoApprovalEngine } from '@/lib/auto-approval-engine';
import { prismaMock } from '@/lib/test/helpers/prisma';
import { createMockTripRequest, createMockCompany } from '@/lib/test/helpers/factories';
import { type TripRequest } from '@prisma/client';
import { AutoApprovalRuleType } from '@/types/workflow/auto-approval-policy';

describe('AutoApprovalEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('evaluateRequest', () => {
        it('should return false if no policy is enabled for the company', async () => {
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                company: createMockCompany({ policyThreshold: null })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('not enabled');
        });

        it('should correctly evaluate BUDGET_THRESHOLD rule (Match)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        enabled: true,
                        config: { maxAmount: 5000, currencyCode: 'USD' }
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 3000, currencyCode: 'USD', multiplier: 1 },
                company: createMockCompany({
                    policyThreshold: policyThreshold,
                    country: 'US'
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(true);
            expect(result.reason).toContain('within company auto-approval limits');
        });

        it('should correctly evaluate BUDGET_THRESHOLD rule (Exceeded)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.BUDGET_THRESHOLD,
                        enabled: true,
                        config: { maxAmount: 5000, currencyCode: 'USD' }
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 6000, currencyCode: 'USD', multiplier: 1 },
                company: createMockCompany({
                    policyThreshold: policyThreshold
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should correctly evaluate DOMESTIC_TRIP rule (Match)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.DOMESTIC_TRIP,
                        enabled: true,
                        config: {}
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                destination: { country: 'IN' },
                company: createMockCompany({
                    policyThreshold,
                    country: 'IN'
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(true);
            expect(result.reason).toContain('Domestic trip');
        });

        it('should correctly evaluate DOMESTIC_TRIP rule (International - No Match)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.DOMESTIC_TRIP,
                        enabled: true,
                        config: {}
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                destination: { country: 'US' },
                company: createMockCompany({
                    policyThreshold,
                    country: 'IN'
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should correctly evaluate COMBINED rule (Match)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.COMBINED,
                        enabled: true,
                        config: {
                            budget: { maxAmount: 5000, currencyCode: 'USD' },
                            requireDomestic: true
                        }
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 3000, currencyCode: 'USD', multiplier: 1 },
                destination: { country: 'US' },
                company: createMockCompany({
                    policyThreshold,
                    country: 'US'
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(true);
            expect(result.reason).toContain('Domestic trip with budget within threshold');
        });

        it('should correctly evaluate COMBINED rule (International - Reject)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    {
                        id: 'rule-1',
                        type: AutoApprovalRuleType.COMBINED,
                        enabled: true,
                        config: {
                            budget: { maxAmount: 5000, currencyCode: 'USD' },
                            requireDomestic: true
                        }
                    }
                ]
            };

            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 3000, currencyCode: 'USD', multiplier: 1 },
                destination: { country: 'FR' },
                company: createMockCompany({
                    policyThreshold,
                    country: 'US'
                })
            });

            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should return false if destination country is missing for domestic rule', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{ id: 'rule-1', type: AutoApprovalRuleType.DOMESTIC_TRIP, enabled: true, config: {} }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                destination: { city: 'Unknown' }, // Missing country
                company: createMockCompany({ policyThreshold, country: 'US' })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should correctly evaluate COMBINED rule (Budget Fail)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{
                    id: 'rule-1',
                    type: AutoApprovalRuleType.COMBINED,
                    enabled: true,
                    config: { budget: { maxAmount: 1000, currencyCode: 'USD' }, requireDomestic: true }
                }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 2000, currencyCode: 'USD', multiplier: 1 },
                destination: { country: 'US' },
                company: createMockCompany({ policyThreshold, country: 'US' })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
        });

        it('should correctly evaluate COMBINED rule (No Domestic Required)', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{
                    id: 'rule-1',
                    type: AutoApprovalRuleType.COMBINED,
                    enabled: true,
                    config: { budget: { maxAmount: 5000, currencyCode: 'USD' }, requireDomestic: false }
                }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 3000, currencyCode: 'USD', multiplier: 1 },
                destination: { country: 'FR' }, // International
                company: createMockCompany({ policyThreshold, country: 'US' })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(true);
            expect(result.reason).toContain('within company auto-approval limits');
        });

        it('should return false if request is not found', async () => {
            prismaMock.tripRequest.findUnique.mockResolvedValue(null);
            const result = await AutoApprovalEngine.evaluateRequest('non-existent');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toBe('Request not found');
        });

        it('should return false if budget is missing for budget rule', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{ id: 'rule-1', type: AutoApprovalRuleType.BUDGET_THRESHOLD, enabled: true, config: { maxAmount: 1000, currencyCode: 'USD' } }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: null,
                company: createMockCompany({ policyThreshold })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should return false if currencies mismatch', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{ id: 'rule-1', type: AutoApprovalRuleType.BUDGET_THRESHOLD, enabled: true, config: { maxAmount: 1000, currencyCode: 'EUR' } }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                budget: { amount: 500, currencyCode: 'USD', multiplier: 1 },
                company: createMockCompany({ policyThreshold })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should return false if company country is missing for domestic rule', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [{ id: 'rule-1', type: AutoApprovalRuleType.DOMESTIC_TRIP, enabled: true, config: {} }]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                destination: { country: 'US' },
                company: createMockCompany({ policyThreshold, country: null })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });

        it('should return false if rules list is empty', async () => {
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                company: createMockCompany({
                    policyThreshold: { enabled: true, rules: [] }
                })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toBe('No auto-approval rules configured');
        });

        it('should skip disabled rules', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    { id: 'rule-1', type: AutoApprovalRuleType.DOMESTIC_TRIP, enabled: false, config: {} }
                ]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                destination: { city: 'Mumbai', country: 'IN' },
                company: createMockCompany({ policyThreshold, country: 'IN' })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            expect(result.reason).toBe('Request does not match any auto-approval criteria');
        });

        it('should return false for unknown rule types', async () => {
            const policyThreshold = {
                enabled: true,
                rules: [
                    { id: 'rule-1', type: 'UNKNOWN_TYPE' as unknown as AutoApprovalRuleType, enabled: true, config: {} }
                ]
            };
            const mockRequest = createMockTripRequest({
                id: 'req-1',
                company: createMockCompany({ policyThreshold })
            });
            prismaMock.tripRequest.findUnique.mockResolvedValue(mockRequest as unknown as TripRequest);

            const result = await AutoApprovalEngine.evaluateRequest('req-1');
            expect(result.shouldAutoApprove).toBe(false);
            // The engine generically reports no matching criteria if all rules (including unknown ones) fail to approve
            expect(result.reason).toContain('does not match any auto-approval criteria');
        });
    });
});
