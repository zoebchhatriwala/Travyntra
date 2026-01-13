
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Handles the GET request for the health check endpoint.
 * Performs a heartbeat check on key system components like the API and database.
 * 
 * @returns {Promise<NextResponse>} A JSON response containing the health status of system components.
 */
export async function GET(): Promise<NextResponse> {
    // Create a new Date instance
    const currentTime = new Date();
    // Get the current ISO timestamp representing the time of the health check
    const currentIsoTimestamp = currentTime.toISOString();

    // Define the initial health status for system components
    const healthStats = {
        database: "down",
        api: "up",
        timestamp: currentIsoTimestamp,
    };

    try {
        // Define the heartbeat query for the database
        const heartbeatQuery = prisma.$queryRaw`SELECT 1`;

        // Execute the heartbeat query to verify database connectivity
        await heartbeatQuery;

        // update the database status indicator for the health report
        healthStats.database = "up";
    } catch (error) {
        // Define the error context label
        const errorLogPrefix = "Health check failed for database:";
        // Log the failure details to the console
        console.error(errorLogPrefix, error);
    }

    // generate the JSON response utilizing the captured health statistics
    const resultResponse = NextResponse.json(healthStats);

    // Return the finalized response object
    return resultResponse;
}
