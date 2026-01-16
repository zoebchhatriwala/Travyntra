import { z } from "zod";

/**
 * Zod schema defining the structure for train travel preferences.
 */
export const TrainPreferenceSchema = z.object({
    /** The code or name of the departure station */
    from: z.string().optional(),
    /** The code or name of the arrival station */
    to: z.string().optional(),
    /** Additional textual details or requirements for the train journey */
    details: z.string().optional(),
});

/**
 * Zod schema defining the structure for flight travel preferences.
 */
export const FlightPreferenceSchema = z.object({
    /** Additional textual details or requirements for the flight */
    details: z.string().optional(),
    /** The IATA code or name of the departure airport */
    from: z.string().optional(),
    /** The IATA code or name of the arrival airport */
    to: z.string().optional(),
});

/**
 * Zod schema defining a geographic address structure, including coordinates and formatted strings.
 */
export const AddressSchema = z.object({
    /** The street number and name */
    street: z.string().optional(),
    /** The name of the city */
    city: z.string().optional(),
    /** The state, province, or region name */
    state: z.string().optional(),
    /** The name of the country */
    country: z.string().optional(),
    /** The postal or ZIP code */
    zipcode: z.string().optional(),
    /** The geographic latitude coordinate */
    latitude: z.any().optional(),
    /** The geographic longitude coordinate */
    longitude: z.any().optional(),
    /** A single pre-formatted address string */
    formatted: z.string().optional(),
});

/**
 * Zod schema defining the structure for car rental or transport preferences.
 */
export const CarPreferenceSchema = z.object({
    /** Additional textual details for the car rental */
    details: z.string().optional(),
    /** The pickup location, either as a string name or a structured address */
    pickup: z.union([z.string(), AddressSchema]).optional(),
    /** The drop-off location, either as a string name or a structured address */
    dropoff: z.union([z.string(), AddressSchema]).optional(),
    /** Detailed structured address for the pickup location */
    pickupDetails: AddressSchema.optional(),
    /** Detailed structured address for the drop-off location */
    dropoffDetails: AddressSchema.optional(),
});

/**
 * Master Zod schema aggregating all travel-related preferences for a trip request.
 */
export const TripPreferencesSchema = z.object({
    /** Flight-specific preferences or a simple text description */
    flight: z.union([z.string(), FlightPreferenceSchema]).optional(),
    /** Textual description for hotel or accommodation preferences */
    hotel: z.string().optional(),
    /** Car-specific preferences or a simple text description */
    car: z.union([z.string(), CarPreferenceSchema]).optional(),
    /** Train-specific preferences or a simple text description */
    train: z.union([z.string(), TrainPreferenceSchema]).optional(),
    /** Any other travel preferences not covered by specific categories */
    other: z.string().optional(),
    /** Detailed structured address for the primary trip destination */
    destinationDetails: AddressSchema.optional(),
});
