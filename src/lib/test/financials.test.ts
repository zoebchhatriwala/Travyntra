import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createMoney, moneyToDecimal, formatMoney, parseMoney } from '../utils/money';
import { calculateInvoiceDetails } from '../utils/invoice';
import { type Money } from '@/types/finance/money';

let convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => Promise<number>;
let convertMoney: (money: Money, toCurrency: string) => Promise<Money>;

describe('Financial Utils', () => {
    describe('createMoney', () => {
        it('should create a money object correctly', () => {
            const money = createMoney(10.5, 'USD', 100);
            expect(money).toEqual({
                amount: 1050,
                currencyCode: 'USD',
                multiplier: 100
            });
        });

        it('should round to the nearest integer', () => {
            const money = createMoney(10.555, 'USD', 100);
            expect(money.amount).toBe(1056);
        });
    });

    describe('moneyToDecimal', () => {
        it('should convert money to decimal correctly', () => {
            const money = { amount: 1050, currencyCode: 'USD', multiplier: 100 };
            expect(moneyToDecimal(money)).toBe(10.5);
        });

        it('should return 0 for null/undefined', () => {
            expect(moneyToDecimal(null)).toBe(0);
            expect(moneyToDecimal(undefined)).toBe(0);
        });

        it('should handle zero multiplier gracefully', () => {
            const money = { amount: 100, currencyCode: 'USD', multiplier: 0 };
            expect(moneyToDecimal(money as unknown as Money)).toBe(0);
        });
    });

    describe('formatMoney', () => {
        it('should format money correctly', () => {
            const money = { amount: 1050, currencyCode: 'USD', multiplier: 100 };
            const formatted = formatMoney(money, 'en-US');
            expect(formatted).toContain('$');
            expect(formatted).toContain('10.5');
        });

        it('should format null money as default zero with default locale', () => {
            const formatted = formatMoney(null);
            // Default locale is en-US and currency USD, so expectation matches
            expect(formatted).toContain('$0.00');
        });
    });

    describe('parseMoney', () => {
        it('should return null for invalid inputs', () => {
            expect(parseMoney(null)).toBeNull();
            expect(parseMoney(undefined)).toBeNull();
            expect(parseMoney('string')).toBeNull();
            expect(parseMoney({ amount: '100' })).toBeNull(); // Invalid type
            expect(parseMoney({})).toBeNull();
        });

        it('should parse valid money object', () => {
            const input = { amount: 1000, currencyCode: 'USD', multiplier: 100 };
            const result = parseMoney(input);
            expect(result).toEqual(input);
        });
    });
});

describe('Currency Service', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        vi.resetModules();
        const currencyService = await import('../services/currency');
        convertCurrency = currencyService.convertCurrency;
        convertMoney = currencyService.convertMoney;
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should convert currency correctly using mock rates', async () => {
        const mockRates = {
            success: true,
            rates: {
                'USD': 1,
                'EUR': 0.85,
                'INR': 75
            }
        };

        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => mockRates
        });

        const result = await convertCurrency(100, 'USD', 'EUR');
        expect(result).toBe(85);

        const result2 = await convertCurrency(100, 'EUR', 'INR');
        expect(result2).toBeCloseTo(8823.53, 2);
    });

    it('should fallback to 1:1 if rates are missing', async () => {
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => ({ success: true, rates: { 'USD': 1 } })
        });

        const result = await convertCurrency(100, 'USD', 'XYZ');
        expect(result).toBe(100);
    });

    it('should convert Money objects correctly', async () => {
        const mockRates = {
            success: true,
            rates: {
                'USD': 1,
                'GBP': 0.75
            }
        };

        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => mockRates
        });

        const money = { amount: 10000, currencyCode: 'USD', multiplier: 100 }; // $100
        const result = await convertMoney(money, 'GBP');

        expect(result.currencyCode).toBe('GBP');
        expect(result.amount).toBe(7500); // 100 * 0.75 * 100
    });

    it('should use default multiplier in convertMoney if not provided', async () => {
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => ({ success: true, rates: { 'USD': 1, 'EUR': 0.85 } })
        });
        const money = { amount: 500, currencyCode: 'USD' } as Money; // $5.00
        const result = await convertMoney(money, 'EUR');
        // 5.00 * 0.85 = 4.25 EUR -> 425 cents
        expect(result.amount).toBe(425);
        expect(result.multiplier).toBe(100);
    });

    it('should handle API failure in getRates', async () => {
        (global.fetch as unknown as Mock).mockRejectedValue(new Error('Network error'));
        const result = await convertCurrency(100, 'USD', 'EUR');
        expect(result).toBe(100);
    });

    it('should return original amount if currencies are the same', async () => {
        const result = await convertCurrency(100, 'USD', 'USD');
        expect(result).toBe(100);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return original amount if source rate is missing', async () => {
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => ({ success: true, rates: { 'USD': 1 } })
        });
        const result = await convertCurrency(100, 'XYZ', 'USD');
        expect(result).toBe(100);
    });

    it('should refresh cache if expired', async () => {
        const mockRates1 = { success: true, rates: { 'USD': 1, 'EUR': 0.85 } };
        const mockRates2 = { success: true, rates: { 'USD': 1, 'EUR': 0.90 } };

        const fetchMock = global.fetch as unknown as Mock;
        fetchMock.mockResolvedValueOnce({
            json: async () => mockRates1
        });

        // First call
        await convertCurrency(100, 'USD', 'EUR');

        // Fast forward time > 1 hour (3600000 ms)
        vi.setSystemTime(new Date(Date.now() + 3600000 + 1000));

        fetchMock.mockResolvedValueOnce({
            json: async () => mockRates2
        });

        // Second call should fetch again
        const result = await convertCurrency(100, 'USD', 'EUR');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        // 100 * 0.90 = 90
        expect(result).toBe(90);
    });

    it('should handle API success true but missing rates', async () => {
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => ({ success: true, rates: null }) // Valid response structure but no rates
        });
        const result = await convertCurrency(100, 'USD', 'EUR');
        expect(result).toBe(100); // Fallback
    });

    it('should handle API success false', async () => {
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => ({ success: false, rates: null })
        });
        const result = await convertCurrency(100, 'USD', 'EUR');
        expect(result).toBe(100); // Fallback
    });

    it('should use cache on subsequent calls', async () => {
        const mockRates = { success: true, rates: { 'USD': 1, 'EUR': 0.85 } };
        (global.fetch as unknown as Mock).mockResolvedValue({
            json: async () => mockRates
        });

        // First call triggers fetch
        await convertCurrency(100, 'USD', 'EUR');

        // Second call should use cache
        await convertCurrency(100, 'USD', 'EUR');

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    describe('calculateInvoiceDetails', () => {
        it('should calculate total with percentage and fixed taxes', async () => {
            const mockRates = {
                success: true,
                rates: { 'USD': 1, 'EUR': 0.85 }
            };
            (global.fetch as unknown as Mock).mockResolvedValue({
                json: async () => mockRates
            });

            const subtotal = 1000; // in EUR
            const taxes = [
                { label: 'VAT', value: 10, type: 'PERCENTAGE' as const },
                { label: 'Service Fee', value: 50, type: 'FIXED' as const } // 50 USD
            ];

            const result = await calculateInvoiceDetails(subtotal, taxes, 'USD', 'EUR');

            expect(result.totalAmount).toBe(1142.5);
            expect(result.invoiceTaxes).toHaveLength(2);
            expect(result.invoiceTaxes[0].calculatedAmount).toBe(100);
            expect(result.invoiceTaxes[1].calculatedAmount).toBe(42.5);
        });

        it('should handle zero taxes', async () => {
            const result = await calculateInvoiceDetails(100, [], 'USD', 'USD');
            expect(result.totalAmount).toBe(100);
            expect(result.invoiceTaxes).toHaveLength(0);
        });
    });
});
