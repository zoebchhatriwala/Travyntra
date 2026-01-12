
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const DATA_DIR = path.join(process.cwd(), 'src/lib/data');

export async function updateLocationData() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };

    // --- Airports ---
    try {
        log('Downloading Airports...');
        const response = await fetch('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json');
        if (!response.ok) throw new Error(`Failed to fetch airports: ${response.statusText}`);

        const data = await response.json();
        const airports = Object.values(data).map((a: any) => ({
            code: a.iata,
            name: a.name,
            city: a.city,
            country: a.country,
            tz: a.tz
        })).filter((a: any) => a.code);

        fs.writeFileSync(path.join(DATA_DIR, 'airports.json'), JSON.stringify(airports, null, 2));
        log(`Saved ${airports.length} airports.`);
    } catch (e: any) {
        log(`Error updating airports: ${e.message}`);
    }

    // --- Stations ---
    try {
        log('Downloading Stations...');
        let allStations: any[] = [];

        // 1. India
        try {
            log('Fetching Indian Stations...');
            const resIndia = await fetch('https://raw.githubusercontent.com/datameet/railways/master/stations.json');
            if (resIndia.ok) {
                const dataIndia = await resIndia.json();
                const indianStations = dataIndia.features.map((f: any) => ({
                    code: f.properties.code,
                    name: f.properties.name,
                    city: f.properties.name,
                    country: "India"
                }));
                allStations = [...allStations, ...indianStations];
                log(`Added ${indianStations.length} Indian stations.`);
            }
        } catch (e) {
            log(`Failed Indian stations: ${e}`);
        }

        // 2. Europe
        try {
            log('Fetching European Stations...');
            const resEu = await fetch('https://raw.githubusercontent.com/trainline-eu/stations/master/stations.csv');
            if (resEu.ok) {
                const csvText = await resEu.text();
                const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

                const euStations = parsed.data
                    .filter((s: any) => s.is_suggestable === 't' || s.is_main_station === 't')
                    .map((s: any) => ({
                        code: s.uic || s.id,
                        name: s.name,
                        city: s.name,
                        country: s.country
                    }));

                allStations = [...allStations, ...euStations];
                log(`Added ${euStations.length} European stations.`);
            }
        } catch (e) {
            log(`Failed European stations: ${e}`);
        }

        fs.writeFileSync(path.join(DATA_DIR, 'stations.json'), JSON.stringify(allStations, null, 2));
        log(`Saved total ${allStations.length} stations.`);

    } catch (e: any) {
        log(`Error updating stations: ${e.message}`);
    }

    return logs;
}
