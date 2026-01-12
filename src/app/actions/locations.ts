"use server";

import fs from 'fs';
import path from 'path';

// Define types for our location data
export interface LocationItem {
    code: string;
    name: string;
    city: string;
    country: string;
}

// Caching mechanism to avoid reading files on every request
let AIRPORTS_CACHE: LocationItem[] | null = null;
let STATIONS_CACHE: LocationItem[] | null = null;

const DATA_DIR = path.join(process.cwd(), 'src/lib/data');

function loadAirports(): LocationItem[] {
    if (AIRPORTS_CACHE) return AIRPORTS_CACHE;
    try {
        const filePath = path.join(DATA_DIR, 'airports.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            AIRPORTS_CACHE = JSON.parse(data);
            return AIRPORTS_CACHE!;
        }
    } catch (e) {
        console.error("Failed to load airports:", e);
    }
    return [];
}

function loadStations(): LocationItem[] {
    if (STATIONS_CACHE) return STATIONS_CACHE;
    try {
        const filePath = path.join(DATA_DIR, 'stations.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            STATIONS_CACHE = JSON.parse(data);
            return STATIONS_CACHE!;
        }
    } catch (e) {
        console.error("Failed to load stations:", e);
    }
    return [];
}

export async function searchLocations(query: string, type: 'flight' | 'train'): Promise<LocationItem[]> {
    if (!query || query.length < 2) return [];

    const data = type === 'flight' ? loadAirports() : loadStations();
    const cleanQuery = query.toLowerCase().trim();

    // Limit to 50 results for performance
    const results: LocationItem[] = [];
    let count = 0;

    for (const item of data) {
        if (count >= 50) break;

        const matchCode = item.code?.toLowerCase().includes(cleanQuery);
        const matchName = item.name?.toLowerCase().includes(cleanQuery);
        const matchCity = item.city?.toLowerCase().includes(cleanQuery);
        const matchCountry = item.country?.toLowerCase().includes(cleanQuery);

        if (matchCode || matchName || matchCity || matchCountry) {
            results.push(item);
            count++;
        }
    }

    return results;
}
