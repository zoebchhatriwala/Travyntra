
/**
 * Money type definition for consistent currency handling across the application.
 */
export interface Money {
    /** Amount in smallest currency unit (e.g., cents) */
    amount: number;
    /** ISO 4217 currency code (e.g., "USD", "EUR", "INR") */
    currencyCode: string;
    /** Multiplier used to convert from the base unit to the decimal value (default 100) */
    multiplier: number;
}
