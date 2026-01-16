import { type PartialAddress } from "@/types/common/address";

/**
 * Train travel preferences.
 */
export interface TrainPreference {
    from?: string;
    to?: string;
    details?: string;
}

/**
 * Flight travel preferences.
 */
export interface FlightPreference {
    details?: string;
    from?: string;
    to?: string;
}

/**
 * Car rental or transport preferences.
 */
export interface CarPreference {
    details?: string;
    pickup?: string | PartialAddress;
    dropoff?: string | PartialAddress;
    pickupDetails?: PartialAddress;
    dropoffDetails?: PartialAddress;
}

/**
 * Master aggregation of all travel-related preferences.
 */
export interface TripPreferences {
    flight?: string | FlightPreference;
    hotel?: string;
    car?: string | CarPreference;
    train?: string | TrainPreference;
    other?: string;
    destinationDetails?: PartialAddress;
}
