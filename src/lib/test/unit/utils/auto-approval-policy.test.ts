
import { describe, it, expect } from 'vitest';
import { parseAutoApprovalPolicy, createDefaultPolicy } from '@/lib/utils/auto-approval-policy';

describe('AutoApprovalPolicy Utils', () => {

    describe('parseAutoApprovalPolicy', () => {
        it('should return null for null/undefined input', () => {
            expect(parseAutoApprovalPolicy(null)).toBeNull();
            expect(parseAutoApprovalPolicy(undefined)).toBeNull();
        });

        it('should return null for non-object input', () => {
            expect(parseAutoApprovalPolicy('string')).toBeNull();
            expect(parseAutoApprovalPolicy(123)).toBeNull();
        });

        it('should return null if enabled is missing or invalid', () => {
            expect(parseAutoApprovalPolicy({ rules: [] })).toBeNull(); // enabled missing
            expect(parseAutoApprovalPolicy({ enabled: 'true', rules: [] })).toBeNull(); // enabled not boolean
        });

        it('should return null if rules is missing or not array', () => {
            expect(parseAutoApprovalPolicy({ enabled: true })).toBeNull(); // rules missing
            expect(parseAutoApprovalPolicy({ enabled: true, rules: {} })).toBeNull(); // rules not array
        });

        it('should parse valid policy', () => {
            const valid = {
                enabled: true,
                rules: [{ id: '1', type: 'BUDGET', value: 100 }],
                updatedAt: '2023-01-01'
            };
            const result = parseAutoApprovalPolicy(valid);
            expect(result).toEqual({ ...valid });
        });

        it('should parse valid policy without updatedAt', () => {
            const valid = {
                enabled: false,
                rules: []
            };
            const result = parseAutoApprovalPolicy(valid);
            expect(result).toEqual({
                enabled: false,
                rules: [],
                updatedAt: undefined
            });
        });
    });

    describe('createDefaultPolicy', () => {
        it('should create default policy', () => {
            const policy = createDefaultPolicy();
            expect(policy.enabled).toBe(false);
            expect(policy.rules).toEqual([]);
            expect(policy.updatedAt).toBeDefined();
        });
    });
});
