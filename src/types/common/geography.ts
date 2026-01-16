/**
 * Represents a world currency.
 */
export interface Currency {
    code: string;
    name: string;
    symbol?: string;
}

/**
 * Represents a country (ISO standard).
 */
export interface Country {
    code: string;
    name: string;
    emoji?: string;
    currency?: string;
    phone?: string;
}
