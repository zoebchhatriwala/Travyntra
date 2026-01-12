
import { updateLocationData } from '@/lib/services/location-updater';

async function main() {
    console.log("Starting manual location data seed...");
    const logs = await updateLocationData();
    console.log("--- Summary ---");
    logs.forEach(l => console.log(l));
}

main();
