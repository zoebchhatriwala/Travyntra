
import { countries, getEmojiFlag } from "countries-list";

/**
 * Interface representing a country with its name, ISO code, and emoji flag.
 */
export interface Country {
    /** The full name of the country */
    name: string;
    /** The ISO 3166-1 alpha-2 country code */
    code: string;
    /** The emoji character representing the country's flag */
    emoji: string;
}

/**
 * Transforms the raw data from the countries-list package into a standardized list of Country objects.
 * 
 * @returns {Country[]} A collection of sorted country objects.
 */
function initializeCountriesList(): Country[] {
    // Retrieve entries from the imported countries object
    const countriesEntries = Object.entries(countries);

    /**
     * Maps an individual country entry to a standardized Country object.
     * 
     * @param {[string, any]} entry - The raw country tuple [code, data].
     * @returns {Country} The standardized Country object.
     */
    const mapEntryToCountry = (entry: [string, { name: string }]): Country => {
        // Extract the country code from the entry
        const isoCode = entry[0];
        // Extract the country data from the entry
        const countryData = entry[1];
        // Retrieve the country name
        const countryName = countryData.name;

        // identify the code as any to satisfy the emoji flag function requirements
        const flagCodeTarget = isoCode;

        // Generate the emoji flag representation for the country code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countryFlagEmoji = getEmojiFlag(flagCodeTarget as any);

        // Combine fields into the final Country object
        const resultObject = {
            name: countryName,
            code: isoCode,
            emoji: countryFlagEmoji
        };

        // Return the standardized object
        return resultObject;
    };

    // Execute the mapping for all country entries
    const unsortedCountries = countriesEntries.map(mapEntryToCountry);

    /**
     * Comparator function for alphabetizing countries by name.
     * 
     * @param {Country} a - The first country for comparison.
     * @param {Country} b - The second country for comparison.
     * @returns {number} The sort order identifier.
     */
    const alphabetizeByName = (a: Country, b: Country): number => {
        // Extract names
        const aName = a.name;
        const bName = b.name;

        // Perform locale-aware comparison
        const comparisonValue = aName.localeCompare(bName);

        // Return the result
        return comparisonValue;
    };

    // Sort the list of countries alphabetically according to name
    const sortedCountriesResult = unsortedCountries.sort(alphabetizeByName);

    // Return the final sorted collection
    return sortedCountriesResult;
}

/**
 * A collection of world countries enriched with emoji flags and sorted alphabetically by name.
 */
export const COUNTRIES: Country[] = initializeCountriesList();
