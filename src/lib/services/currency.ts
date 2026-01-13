
import { Money, createMoney } from "../types/money";

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface FXResponse {
    success: boolean;
    base: string;
    timestamp: number;
    rates: Record<string, number>;
}

let memoryCache: {
    rates: Record<string, number>;
    timestamp: number;
} | null = null;

/**
 * Fetches the latest exchange rates with a 1-hour in-memory cache.
 * Uses USD as the base currency.
 * 
 * @returns {Promise<Record<string, number>>} A map of currency codes to their exchange rates relative to USD.
 */
async function getRates(): Promise<Record<string, number>> {
    const now = Date.now();

    if (memoryCache && (now - memoryCache.timestamp) < CACHE_DURATION) {
        return memoryCache.rates;
    }

    try {
        const response = await fetch("https://api.fxratesapi.com/latest");
        const data: FXResponse = await response.json();

        if (data.success && data.rates) {
            memoryCache = {
                rates: data.rates,
                timestamp: now
            };
            return data.rates;
        }
    } catch (error) {
        console.error("FX Rates Fetch Error:", error);
    }

    // Fallback to memory cache if fetch fails, or return empty if nothing
    return memoryCache?.rates || { "USD": 1 };
}

/**
 * Converts a numeric amount from one currency to another using the latest cached rates.
 * If a rate is missing, it falls back to a 1:1 conversion and logs a warning.
 * 
 * @param {number} amount - The numeric value to convert.
 * @param {string} fromCurrency - The ISO 4217 code of the source currency.
 * @param {string} toCurrency - The ISO 4217 code of the target currency.
 * @returns {Promise<number>} The converted amount.
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const rates = await getRates();

    // All rates are relative to USD (base: USD)
    // To convert from A to B: (amount / rateA) * rateB
    const rateA = rates[fromCurrency.toUpperCase()];
    const rateB = rates[toCurrency.toUpperCase()];

    if (!rateA || !rateB) {
        console.warn(`Missing exchange rate for ${!rateA ? fromCurrency : toCurrency}`);
        return amount; // Fallback to 1:1 if rate missing
    }

    return (amount / rateA) * rateB;
}

/**
 * Converts a Money object to a different target currency.
 * 
 * @param {Money} money - The source Money object containing amount and currency code.
 * @param {string} toCurrency - The ISO 4217 code of the target currency.
 * @returns {Promise<Money>} A new Money object in the target currency.
 */
export async function convertMoney(
    money: Money,
    toCurrency: string
): Promise<Money> {
    const decimalAmount = money.amount / (money.multiplier || 100);
    const convertedDecimal = await convertCurrency(decimalAmount, money.currencyCode, toCurrency);

    return createMoney(convertedDecimal, toCurrency, money.multiplier);
}
