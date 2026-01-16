
"use server";

import fs from 'fs';
import path from 'path';

import { type LocationItem } from "@/types/common/location";

/**
 * In-memory cache for airport location items to avoid redundant file operations.
 */
let AIRPORTS_CACHE: LocationItem[] | null = null;

/**
 * In-memory cache for train station location items to avoid redundant file operations.
 */
let STATIONS_CACHE: LocationItem[] | null = null;

/**
 * The system directory containing the location data JSON files.
 */
const DATA_DIR = path.join(process.cwd(), 'src/lib/data');

/**
 * Loads airport location data from a local JSON file or returns the cached version.
 * 
 * @returns {LocationItem[]} A collection of airport location items.
 */
function loadAirports(): LocationItem[] {
    // Check if the source data is already cached
    const hasCachedAirports = !!AIRPORTS_CACHE;

    // If cache exists
    if (hasCachedAirports) {
        // Return the cached data
        const cachedResults = AIRPORTS_CACHE as LocationItem[];
        return cachedResults;
    }

    try {
        // Define the name of the airports file
        const airportFileNameStr = 'airports.json';
        // Define the full path for the airports JSON file
        const airportFilePath = path.join(DATA_DIR, airportFileNameStr);

        // check if the file exists on the filesystem
        const airportFileExists = fs.existsSync(airportFilePath);

        // If the file exists
        if (airportFileExists) {
            // Read the file content as a UTF-8 string
            const airportFileData = fs.readFileSync(airportFilePath, 'utf-8');

            // Parse the string content as JSON
            const parsedAirports = JSON.parse(airportFileData);

            // Update the global cache
            AIRPORTS_CACHE = parsedAirports;

            // Return the parsed collection
            const freshResults = AIRPORTS_CACHE as LocationItem[];
            return freshResults;
        }
    } catch (e) {
        // Define the error logging label
        const loadErrorLabel = "Failed to load airports:";
        // Log an error if the file operations or parsing fails
        console.error(loadErrorLabel, e);
    }

    // Define the default empty collection
    const emptyAirports: LocationItem[] = [];
    // Return an empty array as a fallback
    return emptyAirports;
}

/**
 * Loads station location data from a local JSON file or returns the cached version.
 * 
 * @returns {LocationItem[]} A collection of station location items.
 */
function loadStations(): LocationItem[] {
    // Check if the source data is already cached
    const hasCachedStations = !!STATIONS_CACHE;

    // If cache exists
    if (hasCachedStations) {
        // Return the cached data
        const cachedResults = STATIONS_CACHE as LocationItem[];
        return cachedResults;
    }

    try {
        // Define the name of the stations file
        const stationFileNameStr = 'stations.json';
        // Define the full path for the stations JSON file
        const stationFilePath = path.join(DATA_DIR, stationFileNameStr);

        // check if the file exists on the filesystem
        const stationFileExists = fs.existsSync(stationFilePath);

        // If the file exists
        if (stationFileExists) {
            // Read the file content as a UTF-8 string
            const stationFileData = fs.readFileSync(stationFilePath, 'utf-8');

            // Parse the string content as JSON
            const parsedStations = JSON.parse(stationFileData);

            // Update the global cache
            STATIONS_CACHE = parsedStations;

            // Return the parsed collection
            const freshResults = STATIONS_CACHE as LocationItem[];
            return freshResults;
        }
    } catch (e) {
        // Define the error logging label
        const loadErrorLabel = "Failed to load stations:";
        // Log an error if the file operations or parsing fails
        console.error(loadErrorLabel, e);
    }

    // Define the default empty collection
    const emptyStations: LocationItem[] = [];
    // Return an empty array as a fallback
    return emptyStations;
}

/**
 * Searches for locations matching a query string and transport type.
 * 
 * @param {string} query - The search term provided by the user.
 * @param {'flight' | 'train'} type - The type of transport to search for.
 * @returns {Promise<LocationItem[]>} A filtered list of location items.
 */
export async function searchLocations(query: string, type: 'flight' | 'train'): Promise<LocationItem[]> {
    // Check if the query is strictly valid
    const isQueryValid = !!query;

    // Check query length
    const queryStrLength = query?.length || 0;
    const isSearchAllowed = queryStrLength >= 2;

    // Reject searches with insufficient data
    if (!isQueryValid) {
        return [];
    }
    if (!isSearchAllowed) {
        return [];
    }

    // identify the transport type requested
    const isRequestForFlight = type === 'flight';

    // retrieve the appropriate data set
    let locationDataSetByTransport: LocationItem[];
    if (isRequestForFlight) {
        locationDataSetByTransport = loadAirports();
    } else {
        locationDataSetByTransport = loadStations();
    }

    // Convert query to lower case
    const queryLower = query.toLowerCase();
    // Sanitize the search query by trimming whitespace
    const sanitizedSearchQuery = queryLower.trim();

    // Initialize an array to store matching results
    const matchingResultsList: LocationItem[] = [];

    // Track the number of results found to enforce the limit
    let currentMatchCount = 0;

    // Iterate through the selected location data set
    for (const locationItemEntry of locationDataSetByTransport) {
        // identify if the results limit has been reached
        const searchLimitReached = currentMatchCount >= 50;

        // Stop searching if the limit of 50 results is reached
        if (searchLimitReached) {
            break;
        }

        // extract code field
        const itemCodeField = locationItemEntry.code;
        // check for matches in the location code
        const hasCodeMatch = itemCodeField?.toLowerCase().includes(sanitizedSearchQuery);

        // extract name field
        const itemNameField = locationItemEntry.name;
        // check for matches in the location name
        const hasNameMatch = itemNameField?.toLowerCase().includes(sanitizedSearchQuery);

        // extract city field
        const itemCityField = locationItemEntry.city;
        // check for matches in the city name
        const hasCityMatch = itemCityField?.toLowerCase().includes(sanitizedSearchQuery);

        // extract country field
        const itemCountryField = locationItemEntry.country;
        // check for matches in the country name
        const hasCountryMatch = itemCountryField?.toLowerCase().includes(sanitizedSearchQuery);

        // determine if any field matches the sanitized search criteria
        const isQualifiedResult = hasCodeMatch || hasNameMatch || hasCityMatch || hasCountryMatch;

        // If a match is found
        if (isQualifiedResult) {
            // Append the item to the results array
            matchingResultsList.push(locationItemEntry);
            // Increment the match counter by one
            currentMatchCount = currentMatchCount + 1;
        }
    }

    // Return the collected results to the caller
    return matchingResultsList;
}
