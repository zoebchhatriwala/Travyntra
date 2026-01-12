
import { z } from "zod";

export const TrainPreferenceSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    details: z.string().optional(),
});

// Flight Preferences
export const FlightPreferenceSchema = z.object({
    details: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
});

export type FlightPreference = z.infer<typeof FlightPreferenceSchema>;

// Destination Details (Address)
export const AddressSchema = z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipcode: z.string().optional(),
    latitude: z.any().optional(),
    longitude: z.any().optional(),
    formatted: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

// Car Preferences
export const CarPreferenceSchema = z.object({
    details: z.string().optional(),
    pickup: z.union([z.string(), AddressSchema]).optional(),
    dropoff: z.union([z.string(), AddressSchema]).optional(),
    pickupDetails: AddressSchema.optional(),
    dropoffDetails: AddressSchema.optional(),
});



export type CarPreference = z.infer<typeof CarPreferenceSchema>;



export const TripPreferencesSchema = z.object({
    flight: z.union([z.string(), FlightPreferenceSchema]).optional(),
    hotel: z.string().optional(),
    car: z.union([z.string(), CarPreferenceSchema]).optional(),
    train: z.union([z.string(), TrainPreferenceSchema]).optional(),
    other: z.string().optional(),
    destinationDetails: AddressSchema.optional(),
});

export type TripPreferences = z.infer<typeof TripPreferencesSchema>;
