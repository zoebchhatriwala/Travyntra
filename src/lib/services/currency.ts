
import { Money } from "@/types/finance/money";
import { createMoney } from "@/lib/utils/money";

// The duration for which the exchange rates are cached in memory (1 hour in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Interface defining the structure of the response from the FX rates API
 */
interface FXResponse {
    // Indicates if the API request was successful
    success: boolean;
    // The base currency for the exchange rates
    base: string;
    // The timestamp when the rates were last updated
    timestamp: number;
    // A record of currency codes and their corresponding exchange rates
    rates: Record<string, number>;
}

// In-memory cache to store the latest exchange rates and the time they were fetched
let memoryCache: {
    // The cached exchange rates
    rates: Record<string, number>;
    // The timestamp when the rates were cached
    timestamp: number;
} | null = null;

/**
 * Fetches the latest exchange rates with a 1-hour in-memory cache.
 * Uses USD as the base currency.
 * 
 * @returns {Promise<Record<string, number>>} A map of currency codes to their exchange rates relative to USD.
 */
async function getRates(): Promise<Record<string, number>> {
    // Get the current timestamp in milliseconds
    const now = Date.now();

    // Check if the memory cache exists
    if (memoryCache) {
        // Calculate the elapsed time since the cache was last updated
        const elapsedTime = now - memoryCache.timestamp;

        // Check if the elapsed time is less than the allowed cache duration
        const isCacheValid = elapsedTime < CACHE_DURATION;

        // If the cache is still valid
        if (isCacheValid) {
            // Return the cached exchange rates
            return memoryCache.rates;
        }
    }

    try {
        // The URL for the exchange rates API
        const apiUrl = "https://api.fxratesapi.com/latest";

        // Fetch the latest exchange rates from the external API
        const response = await fetch(apiUrl);

        // Parse the response body as a JSON object
        const data = await response.json();

        // Cast the data to the FXResponse interface
        const fxData = data as FXResponse;

        // Check if the API response indicates a successful operation
        if (fxData.success) {
            // Check if the exchange rates are included in the response
            if (fxData.rates) {
                // Update the memory cache with the new rates and the current timestamp
                memoryCache = {
                    rates: fxData.rates,
                    timestamp: now
                };

                // Return the newly fetched exchange rates
                return fxData.rates;
            }
        }
    } catch (error) {
        // Log the error to the console if the fetch operation fails
        console.error("FX Rates Fetch Error:", error);
    }

    // Attempt to access the rates from the memory cache if it exists
    const fallbackRates = memoryCache?.rates;

    // Use a default value if fallback rates are not available
    const defaultRates = { "USD": 1 };

    // Return the fallback rates or the default rates
    const result = fallbackRates || defaultRates;

    // Return the final rates
    return result;
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
    // Check if the source and target currencies are identical
    const isSameCurrency = fromCurrency === toCurrency;

    // If the currencies are the same
    if (isSameCurrency) {
        // Return the original amount without any conversion
        return amount;
    }

    // Retrieve the latest exchange rates
    const rates = await getRates();

    // Convert the source currency code to uppercase for consistency
    const upperFrom = fromCurrency.toUpperCase();

    // Retrieve the exchange rate for the source currency
    const rateA = rates[upperFrom];

    // Convert the target currency code to uppercase for consistency
    const upperTo = toCurrency.toUpperCase();

    // Retrieve the exchange rate for the target currency
    const rateB = rates[upperTo];

    // Check if the exchange rate for the source currency is missing
    if (!rateA) {
        // Construct a warning message for the missing source rate
        const warning = `Missing exchange rate for ${fromCurrency}`;

        // Log the warning to the console
        console.warn(warning);

        // Return the original amount as a fallback
        return amount;
    }

    // Check if the exchange rate for the target currency is missing
    if (!rateB) {
        // Construct a warning message for the missing target rate
        const warning = `Missing exchange rate for ${toCurrency}`;

        // Log the warning to the console
        console.warn(warning);

        // Return the original amount as a fallback
        return amount;
    }

    // Calculate the amount in the base currency (USD)
    const amountInBase = amount / rateA;

    // Convert the base currency amount to the target currency
    const convertedAmount = amountInBase * rateB;

    // Return the converted numeric amount
    return convertedAmount;
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
    // Retrieve the multiplier from the money object
    const moneyMultiplier = money.multiplier;

    // Use a default multiplier of 100 if none is provided
    const defaultMultiplier = 100;

    // Determine the active multiplier for calculation
    const multiplier = moneyMultiplier || defaultMultiplier;

    // Retrieve the raw integer amount from the money object
    const rawAmount = money.amount;

    // Calculate the decimal representation of the amount
    const decimalAmount = rawAmount / multiplier;

    // Retrieve the source currency code from the money object
    const fromCurrency = money.currencyCode;

    // Perform the currency conversion on the decimal amount
    const convertedDecimal = await convertCurrency(decimalAmount, fromCurrency, toCurrency);

    // Create a new Money object with the converted values
    const result = createMoney(convertedDecimal, toCurrency, multiplier);

    // Return the newly created Money object
    return result;
}
