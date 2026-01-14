
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

/**
 * Definition for the directory where external location data is stored.
 */
const DATA_DIR = path.join(process.cwd(), 'src/lib/data');

/**
 * Interface representing the structure of an airport from the external JSON source.
 */
interface ExternalAirport {
    /** The IATA code of the airport */
    iata: string;
    /** The full name of the airport */
    name: string;
    /** The city the airport serves */
    city: string;
    /** The country the airport is located in */
    country: string;
    /** The timezone identifier for the airport */
    tz: string;
}

/**
 * Interface representing the structure of Indian station data from the external source.
 */
interface IndiaStation {
    /** A collection of geospatial features */
    features: Array<{
        /** Properties associated with the feature */
        properties: {
            /** The station code */
            code: string;
            /** The station name */
            name: string;
        }
    }>;
}

/**
 * Interface representing the structure of European station data from the external CSV source.
 */
interface EuropeanStation {
    /** Flag indicating if the station should be suggested in search */
    is_suggestable: string;
    /** Flag indicating if the station is a major hub */
    is_main_station: string;
    /** The International Union of Railways code */
    uic?: string;
    /** Internal identifier */
    id?: string;
    /** The station name */
    name: string;
    /** The ISO country code */
    country: string;
}

/**
 * Standardized interface for a transportation station.
 */
interface Station {
    /** The unique code identifier for the station */
    code: string;
    /** The full name of the station */
    name: string;
    /** The city where the station is located */
    city: string;
    /** The country where the station is located */
    country: string;
}

/**
 * Fetches and updates airport and train station data from external sources.
 * Stores the results as JSON files in the project's data directory.
 * 
 * @returns {Promise<string[]>} A list of log messages describing the update process.
 */
export async function updateLocationData(): Promise<string[]> {
    // Check if the target data directory exists
    const directoryExists = fs.existsSync(DATA_DIR);

    // If the directory is missing
    if (!directoryExists) {
        // define options for directory creation
        const mkdirOptions = { recursive: true };
        // Create the directory recursively
        fs.mkdirSync(DATA_DIR, mkdirOptions);
    }

    // Initialize an array to store execution logs
    const logs: string[] = [];

    /**
     * Helper function to log messages to the console and the logs array.
     * 
     * @param {string} msg - The message to log.
     */
    const log = (msg: string) => {
        // Output message to console
        console.log(msg);
        // Append message to logs collection
        logs.push(msg);
    };

    // --- Airports ---
    try {
        // Log the start of the airport download process
        const airportStartLog = 'Downloading Airports...';
        log(airportStartLog);

        // Define the external airport data URL
        const airportUrl = 'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json';

        // Fetch the airport data
        const response = await fetch(airportUrl);

        // check if response is successful
        const isResponseValid = response.ok;

        // Check if the HTTP request failed
        if (!isResponseValid) {
            // Retrieve the error status text
            const statusTextValue = response.statusText;
            // Construct the error message
            const fetchErrorMsg = `Failed to fetch airports: ${statusTextValue}`;
            // Raise an error
            throw new Error(fetchErrorMsg);
        }

        // Parse the response body as a JSON object record
        const responseData = await response.json();
        // Cast data to expected record type
        const castedData = responseData as Record<string, ExternalAirport>;

        // Retrieve the values from the data object
        const rawAirportDataValues = Object.values(castedData);

        // Transform the raw data into the standardized airport format
        const transformedAirports = rawAirportDataValues.map((a) => {
            const airportCode = a.iata;
            const airportName = a.name;
            const airportCity = a.city;
            const airportCountryCode = a.country;
            const airportTz = a.tz;

            return {
                code: airportCode,
                name: airportName,
                city: airportCity,
                country: airportCountryCode,
                tz: airportTz
            };
        });

        /**
         * Filter to remove airports without a valid code.
         */
        const airportFilter = (a: { code: string }) => {
            const codeExists = !!a.code;
            return codeExists;
        };

        // Filter out airports without a valid IATA code
        const validAirportsList = transformedAirports.filter(airportFilter);

        // Define the path for the airport JSON file
        const airportFileName = 'airports.json';
        const airportFilePath = path.join(DATA_DIR, airportFileName);
        // Convert the airports array to a formatted JSON string
        const airportJsonContent = JSON.stringify(validAirportsList, null, 2);

        // Write the airport data to the filesystem
        fs.writeFileSync(airportFilePath, airportJsonContent);

        // Log the completion of the airport update
        const finalAirportCount = validAirportsList.length;
        const completionLog = `Saved ${finalAirportCount} airports.`;
        log(completionLog);
    } catch (e) {
        // Cast the caught error to an Error object
        const caughtError = e as Error;
        // Construct the error message
        const airportErrorMessage = `Error updating airports: ${caughtError.message}`;
        // Log the error
        log(airportErrorMessage);
    }

    // --- Stations ---
    try {
        // Log the start of the station download process
        const stationsStartLog = 'Downloading Stations...';
        log(stationsStartLog);

        // Initialize an array to store all gathered stations
        let allStationsCollection: Station[] = [];

        // 1. India
        try {
            // Log the start of the Indian station fetch
            const indianStationLog = 'Fetching Indian Stations...';
            log(indianStationLog);

            // Define the external Indian station data URL
            const indianStationsUrl = 'https://raw.githubusercontent.com/datameet/railways/master/stations.json';

            // Fetch the Indian station data
            const resIndiaData = await fetch(indianStationsUrl);

            // check if response is successful
            const isIndiaResOk = resIndiaData.ok;

            // If the response is successful
            if (isIndiaResOk) {
                // Parse the response body as JSON
                const rawIndiaJson = await resIndiaData.json();
                const dataIndiaObj = rawIndiaJson as IndiaStation;

                // Extract features from the JSON data
                const indiaStationsFeatures = dataIndiaObj.features;

                // Map features to standardized station format
                const mappedIndianStations = indiaStationsFeatures.map((f) => {
                    const featureProps = f.properties;
                    const propCode = featureProps.code;
                    const propName = featureProps.name;

                    return {
                        code: propCode,
                        name: propName,
                        city: propName,
                        country: "India"
                    };
                });

                // Update the master stations list
                allStationsCollection = [...allStationsCollection, ...mappedIndianStations];

                // Log the number of Indian stations added
                const indianStationsCount = mappedIndianStations.length;
                const indiaAddedLog = `Added ${indianStationsCount} Indian stations.`;
                log(indiaAddedLog);
            }
        } catch (e) {
            // Log the failure to fetch Indian stations
            const indiaFailureLog = `Failed Indian stations: ${e}`;
            log(indiaFailureLog);
        }

        // 2. Europe
        try {
            // Log the start of the European station fetch
            const euStationLog = 'Fetching European Stations...';
            log(euStationLog);

            // Define the external European station data URL
            const europeanStationsUrl = 'https://raw.githubusercontent.com/trainline-eu/stations/master/stations.csv';

            // Fetch the CSV data
            const resEuData = await fetch(europeanStationsUrl);

            // check if response is successful
            const isEuResOk = resEuData.ok;

            // If the response is successful
            if (isEuResOk) {
                // Get the raw CSV text
                const rawCsvText = await resEuData.text();

                // Define configuration for Papa Parse
                const parseOptions = {
                    header: true,
                    skipEmptyLines: true
                };

                // Parse the CSV text into objects
                const parsedResult = Papa.parse<EuropeanStation>(rawCsvText, parseOptions);

                // Retrieve the parsed data array
                const rawEuropeanDataRows = parsedResult.data;

                /**
                 * Filter for suggestable or main stations.
                 */
                const euStationFilter = (s: EuropeanStation) => {
                    const isSuggestableVal = s.is_suggestable === 't';
                    const isMainStationVal = s.is_main_station === 't';
                    const isMatch = isSuggestableVal || isMainStationVal;
                    return isMatch;
                };

                // Filter for suggestable or main stations
                const filteredEuRows = rawEuropeanDataRows.filter(euStationFilter);

                // Map the filtered European data to the standardized format
                const mappedEuStations = filteredEuRows.map((s) => {
                    const uicVal = s.uic;
                    const idVal = s.id;
                    const fallbackCode = '';
                    const finalCode = uicVal || idVal || fallbackCode;

                    const stationNameVal = s.name;
                    const stationCountryVal = s.country;

                    return {
                        code: finalCode,
                        name: stationNameVal,
                        city: stationNameVal,
                        country: stationCountryVal
                    };
                });

                // Update the master stations list
                allStationsCollection = [...allStationsCollection, ...mappedEuStations];

                // Log the number of European stations added
                const euStationsCount = mappedEuStations.length;
                const euAddedLog = `Added ${euStationsCount} European stations.`;
                log(euAddedLog);
            }
        } catch (e) {
            // Log the failure to fetch European stations
            const euFailureLog = `Failed European stations: ${e}`;
            log(euFailureLog);
        }

        // Define the path for the stations JSON file
        const stationsFileName = 'stations.json';
        const stationFilePathValue = path.join(DATA_DIR, stationsFileName);
        // Convert the collection to a formatted JSON string
        const stationJsonContentValue = JSON.stringify(allStationsCollection, null, 2);

        // Write the station data to the filesystem
        fs.writeFileSync(stationFilePathValue, stationJsonContentValue);

        // Log the final count of all stations saved
        const totalSavedCount = allStationsCollection.length;
        const totalSavedLog = `Saved total ${totalSavedCount} stations.`;
        log(totalSavedLog);

    } catch (e) {
        // Cast the caught error
        const stationErrorObj = e as Error;
        // Construct the error summary message
        const stationSummaryError = `Error updating stations: ${stationErrorObj.message}`;
        // Log the error
        log(stationSummaryError);
    }

    // Return the collected execution logs
    return logs;
}
