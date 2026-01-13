
import { NextResponse } from 'next/server';
import { updateLocationData } from '@/lib/services/location-updater';

/**
 * Ensures the route is always executed dynamically and prevents static caching.
 */
export const dynamic = 'force-dynamic';

/**
 * Sets the maximum execution duration for the function (e.g., on Vercel).
 */
export const maxDuration = 300;

/**
 * Handles the GET request for the location update cron job.
 * Verifies authorization and triggers the location data update service.
 * 
 * @param {Request} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} A JSON response indicating the status of the update process.
 */
export async function GET(request: Request): Promise<NextResponse> {
    try {
        // Retrieve the Authorization header from the incoming request
        const requestHeaders = request.headers;
        const authHeaderValue = requestHeaders.get('authorization');

        // Retrieve the expected CRON_SECRET from environment variables
        const environmentSecretValue = process.env.CRON_SECRET;

        // Check for the configuration of a CRON_SECRET
        const isSecretConfigured = !!environmentSecretValue;

        // Verify authorization if a secret is configured in the environment
        if (isSecretConfigured) {
            // Construct the expected bearer token string
            const expectedBearerToken = `Bearer ${environmentSecretValue}`;

            // check if the provided authorization header matches the expected token
            const matchesSecret = authHeaderValue === expectedBearerToken;

            // If the token does not match
            if (!matchesSecret) {
                // Retrieve the user agent string 
                const currentUserAgent = requestHeaders.get('vercel-user-agent');
                // Check if the request originated from Vercel's internal cron service
                const isVercelCronSource = currentUserAgent === 'vercel-cron/1.0';

                // If not a valid Vercel Cron request
                if (!isVercelCronSource) {
                    // Define the unauthorized response body
                    const unauthorizedErrorBody = {
                        error: 'Unauthorized'
                    };
                    // Define the status options
                    const unauthorizedOptions = {
                        status: 401
                    };
                    // Return a 401 Unauthorized response
                    const unauthorizedResponseResult = NextResponse.json(unauthorizedErrorBody, unauthorizedOptions);
                    return unauthorizedResponseResult;
                }
            }
        }

        // Trigger the service function to update location data across the system
        const updateExecutionLogs = await updateLocationData();

        // Define the success message details
        const successMessageText = 'Location data updated successfully';
        // Construct the successful result payload
        const successResultPayload = {
            success: true,
            message: successMessageText,
            logs: updateExecutionLogs
        };

        // Generate and return the successful JSON response
        const finalSuccessResponse = NextResponse.json(successResultPayload);
        return finalSuccessResponse;

    } catch (caughtError) {
        // define specific error log label
        const cronErrorLabel = "Cron job failed:";
        // Log the failure to the console for observability
        console.error(cronErrorLabel, caughtError);

        // check if the caught error is a standard Error instance
        const hasStandardError = caughtError instanceof Error;
        // Determine the descriptive error string
        const finalErrorMessage = hasStandardError ? caughtError.message : "Unknown error";

        // Construct the failure notification payload
        const failureResponsePayload = {
            success: false,
            error: finalErrorMessage
        };

        // define the internal error status options
        const internalErrorResponseOptions = {
            status: 500
        };
        // Generate and return a 500 Internal Server Error response
        const finalErrorResponseResult = NextResponse.json(failureResponsePayload, internalErrorResponseOptions);
        return finalErrorResponseResult;
    }
}
