
import { countries } from "countries-list";

import { type Currency } from "@/types/common/geography";

function initializeCurrenciesList(): Currency[] {
    const currencyCodes = new Set<string>();

    // Extract all currencies from countries
    Object.values(countries).forEach((country) => {
        if (country.currency) {
            const rawCurrency = country.currency as unknown;
            const currencyList = Array.isArray(rawCurrency)
                ? (rawCurrency as string[])
                : (rawCurrency as string).split(",");

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
