
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

/**
 * Creates a Money object from a decimal amount.
 * 
 * @param {number} amount - The decimal amount (e.g., 5.50 for $5.50).
 * @param {string} [currencyCode="USD"] - ISO 4217 currency code.
 * @param {number} [multiplier=100] - Multiplier for smallest unit.
 * @returns {Money} A new Money object.
 */
export function createMoney(
    amount: number,
    currencyCode: string = "USD",
    multiplier: number = 100
): Money {
    // Calculate the integer representative by multiplying the decimal by the multiplier
    const scaledAmount = amount * multiplier;

    // Round the scaled amount to the nearest integer to ensure precision in the smallest unit
    const roundedAmount = Math.round(scaledAmount);

    // Construct the Money object with the calculated values
    const moneyObject = {
        amount: roundedAmount,
        currencyCode: currencyCode,
        multiplier: multiplier,
    };

    // Return the completed Money object
    return moneyObject;
}

/**
 * Converts a Money object to its decimal amount representation.
 * 
 * @param {Money | null | undefined} money - The Money object to convert.
 * @returns {number} The decimal amount (e.g., 5.50). Returns 0 if money is null or undefined.
 */
export function moneyToDecimal(money: Money | null | undefined): number {
    // Check if the money object exists
    const hasMoney = !!money;

    // If the money object is missing
    if (!hasMoney) {
        // Return 0 as the default decimal value
        return 0;
    }

    // Explicitly cast to Money since availability is confirmed
    const activeMoney = money as Money;

    // Extract the integer amount from the money object
    const integerAmount = activeMoney.amount;

    // Extract the multiplier from the money object
    const multiplier = activeMoney.multiplier;

    // Calculate the decimal amount by dividing the integer amount by the multiplier
    const decimalValue = integerAmount / multiplier;

    // Return the calculated decimal value
    return decimalValue;
}

/**
 * Formats a Money object as a localized currency string.
 * 
 * @param {Money | null | undefined} money - The Money object to format.
 * @param {string} [locale="en-US"] - The locale for formatting defaults to 'en-US'.
 * @returns {string} The formatted currency string.
 */
export function formatMoney(
    money: Money | null | undefined,
    locale: string = "en-US"
): string {
    // Check if the money object exists
    const hasMoney = !!money;

    // If the money object is missing
    if (!hasMoney) {
        // Set the default options for the number formatter
        const defaultOptions: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: 'USD',
        };

        // Create a currency formatter for the given locale
        const defaultFormatter = new Intl.NumberFormat(locale, defaultOptions);

        // Format the value 0 as a localized currency string
        const formattedZero = defaultFormatter.format(0);

        // Return the formatted zero string
        return formattedZero;
    }

    // Explicitly cast to Money since availability is confirmed
    const activeMoney = money as Money;

    // Convert the Money object to its decimal representation
    const decimalAmount = moneyToDecimal(activeMoney);

    // Retrieve the currency code from the Money object
    const currencyCode = activeMoney.currencyCode;

    // Configuration for the localized number formatter
    const formatOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    // Initialize the Internationalized number formatter
    const formatter = new Intl.NumberFormat(locale, formatOptions);

    // Format the decimal amount according to the specified options
    const formattedResult = formatter.format(decimalAmount);

    // Return the formatted currency string
    return formattedResult;
}

/**
 * Parses a Money object from an unknown JSON structure, typically for Prisma Json fields.
 * 
 * @param {unknown} json - The unknown data to parse.
 * @returns {Money | null} The parsed Money object or null if parsing fails.
 */
export function parseMoney(json: unknown): Money | null {
    // Check if the input exists
    const exists = !!json;
    // Check if the input is of type object
    const isObject = typeof json === 'object' && json !== null;

    // If the input is invalid or not an object
    if (!exists || !isObject) {
        // Return null
        return null;
    }

    // Cast the input to a generic record for easier property access
    const obj = json as Record<string, unknown>;

    // Type check the amount property
    const isAmountValid = typeof obj.amount === 'number';
    // Type check the currencyCode property
    const isCurrencyValid = typeof obj.currencyCode === 'string';
    // Type check the multiplier property
    const isMultiplierValid = typeof obj.multiplier === 'number';

    // Verify all mandatory properties are present and correctly typed
    const isValidMoney = isAmountValid && isCurrencyValid && isMultiplierValid;

    // If the structure is valid
    if (isValidMoney) {
        // Construct the Money object
        const money: Money = {
            amount: obj.amount as number,
            currencyCode: obj.currencyCode as string,
            multiplier: obj.multiplier as number,
        };

        // Return the valid Money object
        return money;
    }

    // Return null if validation failed
    return null;
}
