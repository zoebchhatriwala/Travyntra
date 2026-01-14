
import { countries } from "countries-list";

export interface Currency {
    code: string;
    name: string;
}

function initializeCurrenciesList(): Currency[] {
    const currencyCodes = new Set<string>();

    // Extract all currencies from countries
    Object.values(countries).forEach((country) => {
        if (country.currency) {
            const currencyList = Array.isArray(country.currency)
                ? country.currency
                : country.currency.split(",");

            currencyList.forEach((c: string) => {
                const code = c.trim();
                if (code) currencyCodes.add(code);
            });
        }
    });

    const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });

    return Array.from(currencyCodes)
        .map((code) => {
            let name = code;
            try {
                name = displayNames.of(code) || code;
            } catch {
                // Fallback if code is invalid
            }
            return { code, name };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export const CURRENCIES: Currency[] = initializeCurrenciesList();
