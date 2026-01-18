
"use server";

import { IS_DEVELOPMENT } from "@/lib/constants/enviroment";
import { prisma } from "@/lib/prisma";

/**
 * Interface representing a simplified user object for development-mode impersonation.
 */
export interface DevUser {
    /** The unique identifier for the user */
    id: string;
    /** The display name of the user */
    name: string | null;
    /** The email address of the user */
    email: string | null;
    /** The system role assigned to the user */
    role: string;
    /** The name of the company associated with the user */
    companyName?: string;
    /** The unique URL slug for the user's company */
    companySlug?: string | null;
}

/**
 * Fetches a list of up to 100 users for quick account switching during development.
 * This function returns an empty list in production environments.
 * 
 * @returns {Promise<DevUser[]>} A list of users available for selection.
 */
export async function getDevUsers(): Promise<DevUser[]> {
    // Check if the current environment is strictly development
    const isNotDevelopmentEnv = !IS_DEVELOPMENT

    // Block the action if not in development mode
    if (isNotDevelopmentEnv) {
        // Initialize an empty collection
        const emptyResult: DevUser[] = [];
        // Return the empty list
        return emptyResult;
    }

    try {
        // Configuration for the Prisma findMany query
        const findOptions = {
            take: 100,
            include: {
                company: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: {
                role: 'asc' as const
            }
        };

        // Retrieve users from the database using defined options
        const userRecordsFromDb = await prisma.user.findMany(findOptions);

        /**
         * Transforms a database user record into a simplified developer user object.
         * 
         * @param {any} u - The database user record.
         * @returns {DevUser} The simplified developer user structure.
         */
        const transformToDevUser = (u: (typeof userRecordsFromDb)[number]) => {
            // Retrieve associated company details
            const userCompanyInfo = u.company;
            // Get the name of the company
            const companyNameValue = userCompanyInfo?.name;
            // Get the unique slug of the company
            const companySlugValue = userCompanyInfo?.slug;

            // Define the simple user object
            const devUserObj = {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                companyName: companyNameValue,
                companySlug: companySlugValue
            };

            // Return the constructed object
            return devUserObj;
        };

        // Map the collection of records into the developer user format
        const finalDevUsersCollection = userRecordsFromDb.map(transformToDevUser);

        // Return the successfully mapped collection
        return finalDevUsersCollection;
    } catch (error) {
        // define error message label
        const errorContextLabel = "Failed to fetch dev users:";
        // Log the exception to the console
        console.error(errorContextLabel, error);

        // Initialize a fallback empty list
        const fallbackList: DevUser[] = [];
        // Return the fallback collection
        return fallbackList;
    }
}
