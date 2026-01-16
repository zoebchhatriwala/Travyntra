/**
 * Interface representing a location item (airport or station).
 * Used for search results and data storage.
 */
export interface LocationItem {
    /** The unique code identifying the location (IATA, Station Code, etc.) */
    code: string;
    /** The full name of the location */
    name: string;
    /** The city the location is in */
    city: string;
    /** The country the location is in */
    country: string;
}

/**
 * Interface used for displaying location information.
 * Often used when data comes from mixed sources or is partially available.
 */
export interface LocationDisplay {
    city?: string;
    formatted?: string;
    country?: string;
}
