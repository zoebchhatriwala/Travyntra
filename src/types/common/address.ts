/**
 * Full address structure with all fields.
 * Used for strict address validation and complete records.
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
 * Partial address for flexible use (preferences, search results, etc.).
 * Most common type used throughout the application as addresses are often incomplete.
 */
export type PartialAddress = Partial<Address>;
