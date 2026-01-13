
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Logs an activity to the database for auditing and tracking purposes.
 * 
 * @param {Object} params - The details of the activity to log.
 * @param {string} params.companyId - The ID of the company associated with the activity.
 * @param {string} [params.actorId] - The ID of the user or system performing the action.
 * @param {string} [params.targetId] - The ID of the primary object being acted upon.
 * @param {string} params.action - A string identifier for the action taken.
 * @param {string} params.description - A human-readable summary of the action.
 * @param {Prisma.InputJsonValue} [params.metadata] - Additional structured data related to the activity.
 * @returns {Promise<void>}
 */
export async function logActivity(params: {
    companyId: string;
    actorId?: string;
    targetId?: string;
    action: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
}) {
    // Extract companyId from parameters
    const companyId = params.companyId;

    // Extract actorId from parameters
    const actorId = params.actorId;

    // Extract targetId from parameters
    const targetId = params.targetId;

    // Extract action from parameters
    const action = params.action;

    // Extract description from parameters
    const description = params.description;

    // Extract metadata from parameters
    const metadata = params.metadata;

    // Define the data for the new activity log entry
    const activityData = {
        companyId: companyId,
        actorId: actorId,
        targetId: targetId,
        action: action,
        description: description,
        metadata: metadata,
    };

    try {
        // Create the activity log entry in the database
        await prisma.activityLog.create({
            data: activityData,
        });
    } catch (error) {
        // Construct the error message
        const errorMessage = "Failed to log activity:";

        // Log the failure to the console instead of throwing to prevent breaking the main application flow
        console.error(errorMessage, error);
    }
}
