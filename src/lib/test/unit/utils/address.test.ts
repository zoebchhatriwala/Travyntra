
import { describe, it, expect } from 'vitest';
import {
    formatAddress,
    formatAddressShort,
    formatAddressFull,
    formatAddressWithStreet,
    getCountryFromAddress,
    isValidAddress,
    normalizeAddress,
    type PartialAddress
} from '@/lib/utils/address';

describe('Address Utils', () => {
    const mockAddress: PartialAddress = {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipcode: '12345',
        country: 'US',
        latitude: '40.7128',
        longitude: '-74.0060'
    };

    describe('formatAddress', () => {
        it('should return fallback if address is null/undefined', () => {
            expect(formatAddress(null)).toBe('Unknown Location');
            expect(formatAddress(undefined, { fallback: 'No Addr' })).toBe('No Addr');
        });

        it('should return already formatted string if options are default', () => {
            expect(formatAddress({ formatted: 'Pre-formatted', city: 'City' })).toBe('Pre-formatted');
        });

        it('should ignore formatted string if specific options are provided', () => {
            const addr = { formatted: 'Pre-formatted', street: 'Street' };
            expect(formatAddress(addr, { includeStreet: true })).toBe('Street');
        });

        it('should format full address correctly', () => {
            expect(formatAddress(mockAddress, {
                includeStreet: true,
                includeState: true,
                includeZipcode: true,
                includeCountry: true
            })).toContain('123 Test St');
        });

        it('should use United States for US code if available in countries', () => {
            // Assuming countries-list works, US should be United States
            expect(formatAddress({ country: 'US' }, { includeCountry: true })).toContain('United States');
        });

        it('should fallback to country code if country name not found', () => {
            expect(formatAddress({ country: 'XX' }, { includeCountry: true })).toContain('XX');
        });

        it('should return fallback if no parts are added', () => {
            expect(formatAddress(mockAddress, {
                includeStreet: false,
                includeCountry: false
                // city, state, zip skipped by default or boolean logic? 
                // city is added if available by logic: if (city) parts.push(city)
            })).toContain('Test City');

            expect(formatAddress({}, { fallback: 'Empty' })).toBe('Empty');
        });
    });

    describe('formatAddressShort', () => {
        it('should include only city and country', () => {
            const result = formatAddressShort(mockAddress);
            expect(result).toContain('Test City');
            expect(result).toContain('United States');
            expect(result).not.toContain('123 Test St');
        });
    });

    describe('formatAddressFull', () => {
        it('should include all fields', () => {
            const result = formatAddressFull(mockAddress);
            expect(result).toContain('123 Test St');
            expect(result).toContain('Test City');
            expect(result).toContain('Test State');
            expect(result).toContain('12345');
            expect(result).toContain('United States');
        });
    });

    describe('formatAddressWithStreet', () => {
        it('should include street, city and country', () => {
            const result = formatAddressWithStreet(mockAddress);
            expect(result).toContain('123 Test St');
            expect(result).toContain('Test City');
            expect(result).toContain('United States');
            expect(result).not.toContain('Test State');
        });
    });

    describe('getCountryFromAddress', () => {
        it('should return country code', () => {
            expect(getCountryFromAddress(mockAddress)).toBe('US');
        });
        it('should return null if missing', () => {
            expect(getCountryFromAddress({})).toBeNull();
            expect(getCountryFromAddress(null)).toBeNull();
        });
    });

    describe('isValidAddress', () => {
        it('should return true if city exists', () => {
            expect(isValidAddress({ city: 'City' })).toBe(true);
        });
        it('should return true if formatted exists', () => {
            expect(isValidAddress({ formatted: 'Full Address' })).toBe(true);
        });
        it('should return false if empty', () => {
            expect(isValidAddress({})).toBe(false);
            expect(isValidAddress(null)).toBe(false);
        });
    });

    describe('normalizeAddress', () => {
        it('should return null for null input', () => {
            expect(normalizeAddress(null)).toBeNull();
            expect(normalizeAddress(undefined)).toBeNull();
        });

        it('should normalize string input', () => {
            const result = normalizeAddress('Paris, France');
            expect(result).toEqual({ formatted: 'Paris, France', city: 'Paris, France' });
        });

        it('should normalize object input', () => {
            const input = {
                street: 'Street',
                city: 'City',
                state: 'State',
                country: 'Country',
                zipcode: 'Zip',
                latitude: '1.1',
                longitude: '2.2',
                formatted: 'Full',
                extra: 'ignored'
            };
            const result = normalizeAddress(input);
            expect(result).toEqual({
                street: 'Street',
                city: 'City',
                state: 'State',
                country: 'Country',
                zipcode: 'Zip',
                latitude: '1.1',
                longitude: '2.2',
                formatted: 'Full'
            });
        });

        it('should handle partial object input', () => {
            const result = normalizeAddress({});
            expect(result).toEqual({
                street: undefined,
                city: undefined,
                state: undefined,
                country: undefined,
                zipcode: undefined,
                latitude: undefined,
                longitude: undefined,
                formatted: undefined
            });
        });

        it('should return null for invalid types', () => {
            expect(normalizeAddress(123)).toBeNull(); // Number
            // normalizeAddress checks if object, and typeof number is not object.
            // Wait, logic says: typeof input === 'object'
        });
    });
});
