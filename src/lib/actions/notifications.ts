
"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import {
    getNotifications as getDbNotifications,
    getNotificationsPaged as getNotificationsPagedDb,
    markNotificationAsRead as markDbRead,
    markAllNotificationsAsRead as markAllDbRead
} from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Notification } from "@prisma/client";

/**
 * Fetches the most recent notifications for the currently authenticated user.
 * 
 * @param {number} [limit] - The maximum number of notifications to retrieve.
 * @returns {Promise<Notification[]>} A collection of notification objects or an empty array if not authenticated.
 */
export async function getNotifications(limit?: number): Promise<Notification[]> {
    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Skip processing if the user is not authenticated with an email
    const currentUserEmailStr = authSession?.user?.email;
    const isUnauthenticated = !currentUserEmailStr;
    if (isUnauthenticated) {
        return [];
    }

    // Retrieve the specific user record from the database using their email
    const searchOptions = {
        where: {
            email: currentUserEmailStr
        },
        select: {
            id: true
        }
    };
    const targetUserRecord = await prisma.user.findUnique(searchOptions);

    // Skip processing if no matching user record is found
    const targetUserId = targetUserRecord?.id;
    const userNotFound = !targetUserId;
    if (userNotFound) {
        return [];
    }

    // fetch notifications for the identified user from the database
    const rawNotificationsList = await getDbNotifications(targetUserId, limit);

    // Convert the result to a JSON-safe format to handle complex types like Dates during serialization
    const serializedResult = JSON.stringify(rawNotificationsList);
    const finalizedNotifications = JSON.parse(serializedResult);

    // Return the processed notification list
    return finalizedNotifications;
}

/**
 * Interface representing the parameters for paged notification retrieval.
 */
interface PagedParams {
    /** The page index to retrieve */
    page?: number;
    /** The number of items per page */
    limit?: number;
    /** An optional search filter query */
    search?: string;
}

/**
 * Fetches notifications for the currently authenticated user with pagination and optional search.
 * 
 * @param {PagedParams} params - The pagination and search configuration parameters.
 * @returns {Promise<Object>} A paginated result object containing notifications and metadata.
 */
export async function getNotificationsPaged(params: PagedParams): Promise<{ notifications: Notification[]; total: number; pages: number; }> {
    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Construct a default empty result structure
    const defaultResult = {
        notifications: [],
        total: 0,
        pages: 0
    };

    // Skip processing if the user is not authenticated with an email
    const currentUserEmailStr = authSession?.user?.email;
    const isUnauthenticated = !currentUserEmailStr;
    if (isUnauthenticated) {
        return defaultResult;
    }

    // Retrieve the specific user identifier from the database
    const userSearchQuery = {
        where: {
            email: currentUserEmailStr
        },
        select: {
            id: true
        }
    };
    const targetUserRecord = await prisma.user.findUnique(userSearchQuery);

    // Skip processing if no matching user record is found
    const targetUserId = targetUserRecord?.id;
    const userNotFound = !targetUserId;
    if (userNotFound) {
        return defaultResult;
    }

    // Combine the user identifier with the provided pagination parameters
    const queryParams = {
        userId: targetUserId,
        ...params
    };

    // fetch the paginated results from the underlying database service
    const rawPagedResults = await getNotificationsPagedDb(queryParams);

    // Serialize the results to a string to normalize complex objects like Date
    const serializedResultsStr = JSON.stringify(rawPagedResults);
    // Parse the normalized results back into an object
    const finalPagedResultsObj = JSON.parse(serializedResultsStr);

    // Return the paginated notifications object
    return finalPagedResultsObj;
}

/**
 * Marks a specific notification as read by its unique identifier.
 * Triggers a path revalidation to update the user interface.
 * 
 * @param {string} notificationId - The unique ID of the notification to mark as read.
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId: string): Promise<void> {
    // Execute the database update to mark the notification as read
    await markDbRead(notificationId);

    // Define the path to revalidate
    const rootPath = "/";
    // Trigger a cache purge and revalidation for the root application path
    revalidatePath(rootPath);
}

/**
 * Marks all notifications as read for the currently authenticated user.
 * Triggers a path revalidation to update the user interface across the application.
 * 
 * @returns {Promise<void>}
 */
export async function markAllAsRead(): Promise<void> {
    // Retrieve the current user's authentication session
    const authSession = await getServerSession(authOptions);

    // Skip processing if the user is not authenticated with an email
    const currentUserEmailStr = authSession?.user?.email;
    const isUnauthenticated = !currentUserEmailStr;
    if (isUnauthenticated) {
        return;
    }

    // Retrieve the user identifier for the authenticated email
    const idSearchOptions = {
        where: {
            email: currentUserEmailStr
        },
        select: {
            id: true
        }
    };
    const targetUserRecord = await prisma.user.findUnique(idSearchOptions);

    // Skip processing if no user record is found
    const targetUserId = targetUserRecord?.id;
    const userNotFound = !targetUserId;
    if (userNotFound) {
        return;
    }

    // Execute the bulk update in the database to mark all user notifications as read
    await markAllDbRead(targetUserId);

    // Define the path to revalidate
    const rootPath = "/";
    // Force a revalidation of the root path to update global unread counters
    revalidatePath(rootPath);
}
