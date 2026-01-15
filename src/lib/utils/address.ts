/**
 * Address formatting utilities for consistent address display across the application.
 */

import { countries } from "countries-list";

/**
 * Full address with all required fields (used for manual address entry)
 */
export interface Address {
    street: string;
    city: string;
    state: string;
    country: string;
    zipcode: string;
    latitude?: string;
    longitude?: string;
    formatted?: string;
}

/**
 * Partial address for flexible use (destination display, etc.)
 */
export type PartialAddress = Partial<Address>;

/**
 * Format options for address display
 */
export interface AddressFormatOptions {
    /** Include street address in the output */
    includeStreet?: boolean;
    /** Include state in the output */
    includeState?: boolean;
    /** Include zipcode in the output */
    includeZipcode?: boolean;
    /** Include country in the output */
    includeCountry?: boolean;
    /** Separator between address components (default: ", ") */
    separator?: string;
    /** Fallback text if address is empty or invalid */
    fallback?: string;
}

/**
 * Formats an address object into a human-readable string.
 * 
 * @param address - The address object to format
 * @param options - Formatting options
 * @returns Formatted address string
 * 
 * @example
 * ```typescript
 * const address = { street: "123 Main St", city: "London", country: "UK" };
 * formatAddress(address); // "London, UK"
 * formatAddress(address, { includeStreet: true }); // "123 Main St, London, UK"
 * ```
 */
export function formatAddress(
    address: PartialAddress | null | undefined,
    options: AddressFormatOptions = {}
): string {
    // Return fallback if address is null or undefined
    if (!address) {
        return options.fallback || "Unknown Location";
    }

    // If the address already has a formatted string and we're using default options, use it
    if (address.formatted && Object.keys(options).length === 0) {
        return address.formatted;
    }

    const {
        includeStreet = false,
        includeState = false,
        includeZipcode = false,
        includeCountry = true,
        separator = ", ",
        fallback = "Unknown Location"
    } = options;

    const parts: string[] = [];

    // Get trimmed address components
    const street = address.street?.trim();
    const city = address.city?.trim();
    const state = address.state?.trim();
    const zipcode = address.zipcode?.trim();
    const countryCode = address.country?.trim();

    // Add street if requested and available
    if (includeStreet && street) {
        parts.push(street);
    }

    // Always include city if available
    if (city) {
        parts.push(city);
    }

    // Add state if requested and available
    if (includeState && state) {
        parts.push(state);
    }

    // Add zipcode if requested and available
    if (includeZipcode && zipcode) {
        parts.push(zipcode);
    }

    // Add country if requested and available
    if (includeCountry && countryCode) {
        // Find the country name
        const country = countries[countryCode as unknown as keyof typeof countries];

        // Add the country name to the parts array
        parts.push(country?.name ?? countryCode);
    }

    // If no parts were added, return fallback
    if (parts.length === 0) {
        return fallback;
    }

    return parts.join(separator);
}

/**
 * Formats an address for short display (city, country only).
 * This is the most common format used in the UI.
 * 
 * @param address - The address object to format
 * @returns Short formatted address string (e.g., "London, UK")
 * 
 * @example
 * ```typescript
 * const address = { street: "123 Main St", city: "London", state: "England", country: "UK" };
 * formatAddressShort(address); // "London, UK"
 * ```
 */
export function formatAddressShort(address: PartialAddress | null | undefined): string {
    return formatAddress(address, {
        includeStreet: false,
        includeState: false,
        includeZipcode: false,
        includeCountry: true,
        fallback: "Unknown Destination"
    });
}

/**
 * Formats an address for full display (all available fields).
 * 
 * @param address - The address object to format
 * @returns Full formatted address string
 * 
 * @example
 * ```typescript
 * const address = { street: "123 Main St", city: "London", state: "England", country: "UK", zipcode: "SW1A 1AA" };
 * formatAddressFull(address); // "123 Main St, London, England, SW1A 1AA, UK"
 * ```
 */
export function formatAddressFull(address: PartialAddress | null | undefined): string {
    return formatAddress(address, {
        includeStreet: true,
        includeState: true,
        includeZipcode: true,
        includeCountry: true,
        fallback: "Unknown Location"
    });
}

/**
 * Formats an address for single-line display with street (street, city, country).
 * Useful for pickup/dropoff locations.
 * 
 * @param address - The address object to format
 * @returns Formatted address string with street
 * 
 * @example
 * ```typescript
 * const address = { street: "123 Main St", city: "London", country: "UK" };
 * formatAddressWithStreet(address); // "123 Main St, London, UK"
 * ```
 */
export function formatAddressWithStreet(address: PartialAddress | null | undefined): string {
    return formatAddress(address, {
        includeStreet: true,
        includeState: false,
        includeZipcode: false,
        includeCountry: true,
        fallback: "Unknown Location"
    });
}

/**
 * Extracts the country code from an address object.
 * 
 * @param address - The address object
 * @returns Country code or null if not available
 */
export function getCountryFromAddress(address: PartialAddress | null | undefined): string | null {
    return address?.country?.trim() || null;
}

/**
 * Checks if an address has minimum required information (city or formatted string).
 * 
 * @param address - The address object to validate
 * @returns True if address has minimum required information
 */
export function isValidAddress(address: PartialAddress | null | undefined): boolean {
    if (!address) return false;
    return !!(address.city?.trim() || address.formatted?.trim());
}

/**
 * Normalizes various address-like objects into a standard Address format.
 * Handles legacy formats and ensures consistency.
 * 
 * @param input - Various possible address formats
 * @returns Normalized Address object
 */
export function normalizeAddress(input: unknown): PartialAddress | null {
    if (!input) return null;

    // If it's already a string, treat it as formatted address
    if (typeof input === 'string') {
        return {
            formatted: input,
            city: input // Fallback
        };
    }

    // If it's an object, ensure it has the right structure
    if (typeof input === 'object') {
        const addr = input as Record<string, unknown>;
        return {
            street: typeof addr.street === 'string' ? addr.street : undefined,
            city: typeof addr.city === 'string' ? addr.city : undefined,
            state: typeof addr.state === 'string' ? addr.state : undefined,
            country: typeof addr.country === 'string' ? addr.country : undefined,
            zipcode: typeof addr.zipcode === 'string' ? addr.zipcode : undefined,
            latitude: typeof addr.latitude === 'string' ? addr.latitude : undefined,
            longitude: typeof addr.longitude === 'string' ? addr.longitude : undefined,
            formatted: typeof addr.formatted === 'string' ? addr.formatted : undefined,
        };
    }

    return null;
}
