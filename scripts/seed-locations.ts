
import { updateLocationData } from '@/lib/services/location-updater';

/**
 * Main execution function for manually seeding location data into the system.
 */
async function main(): Promise<void> {
    // Define the start message
    const startMsg = "Starting manual location data seed...";

    // Log the initiation of the manual location data seed process
    console.log(startMsg);

    // Call the service function to update location data and capture execution logs
    const executionLogs = await updateLocationData();

    // Define the summary header message
    const summaryHeader = "--- Summary ---";

    // Log the initiation of the summary section
    console.log(summaryHeader);

    /**
     * Prints an individual log message to the console.
     * 
     * @param {string} logMessage - The individual log message to print.
     */
    const printLog = (logMessage: string) => {
        // Output the log message
        console.log(logMessage);
    };

    // Execute the printing process for each log entry
    executionLogs.forEach(printLog);
}

// Execute the main seeding function
main();
