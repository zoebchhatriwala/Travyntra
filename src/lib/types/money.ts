// Money type definition for consistent currency handling across the application
export interface Money {
    amount: number;        // Amount in smallest currency unit (e.g., cents)
    currencyCode: string;  // ISO 4217 currency code (e.g., "USD", "EUR", "INR")
    multiplier: number;    // Default 100 (e.g., $5.00 = 500 cents)
}

/**
 * Create a Money object from a decimal amount
 * @param amount - The decimal amount (e.g., 5.50 for $5.50)
 * @param currencyCode - ISO 4217 currency code
 * @param multiplier - Multiplier for smallest unit (default: 100)
 */
export function createMoney(
    amount: number,
    currencyCode: string = "USD",
    multiplier: number = 100
): Money {
    return {
        amount: Math.round(amount * multiplier),
        currencyCode,
        multiplier,
    };
}

/**
 * Convert Money object to decimal amount
 * @param money - Money object
 * @returns Decimal amount
 */
export function moneyToDecimal(money: Money | null | undefined): number {
    if (!money) return 0;
    return money.amount / money.multiplier;
}

/**
 * Format Money object as currency string
 * @param money - Money object
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatMoney(
    money: Money | null | undefined,
    locale: string = "en-US"
): string {
    if (!money) return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
    }).format(0);

    const decimalAmount = moneyToDecimal(money);
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(decimalAmount);
}

/**
 * Parse Money from JSON (for Prisma Json fields)
 */
export function parseMoney(json: unknown): Money | null {
    if (!json || typeof json !== 'object') return null;

    const obj = json as Record<string, unknown>;

    if (
        typeof obj.amount === 'number' &&
        typeof obj.currencyCode === 'string' &&
        typeof obj.multiplier === 'number'
    ) {
        return {
            amount: obj.amount,
            currencyCode: obj.currencyCode,
            multiplier: obj.multiplier,
        };
    }

    return null;
}
