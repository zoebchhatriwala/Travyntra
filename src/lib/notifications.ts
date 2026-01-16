
import { Notification, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendUserEmail } from "@/lib/email";
import { getGeneralNotificationTemplate } from "@/lib/email-templates";

/**
 * Defines the available types for notifications to categorize them by severity or intent.
 */
// NotificationType is now imported from @prisma/client

/**
 * Creates a new notification for a specific user and optionally sends an email alert.
 * 
 * @param {Object} params - The parameters for creating a notification.
 * @param {string} params.userId - The ID of the user who will receive the notification.
 * @param {string} params.title - The headline for the notification.
 * @param {string} params.message - The detailed content of the notification.
 * @param {NotificationType} [params.type="INFO"] - The category of the notification.
 * @param {string} [params.link] - An optional URL to redirect the user when they click the notification.
 * @param {boolean} [params.sendEmail=false] - Whether to also send an email notification.
 * @returns {Promise<Notification>} The created notification object.
 */
export async function createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
    sendEmail?: boolean;
}) {
    // Extract userId from parameters
    const userId = params.userId;

    // Extract title from parameters
    const title = params.title;

    // Extract message from parameters
    const message = params.message;

    // Extract type from parameters or default to "INFO"
    const type = params.type || NotificationType.INFO;

    // Extract link from parameters
    const link = params.link;

    // Extract sendEmail flag from parameters or default to false
    const shouldSendEmail = params.sendEmail || false;

    // Define the data for the new notification record
    const notificationData = {
        userId: userId,
        title: title,
        message: message,
        type: type,
        link: link,
    };

    // Create the notification in the database using Prisma
    const notification = await prisma.notification.create({
        data: notificationData,
    });

    // Check if an email notification is required
    if (shouldSendEmail) {
        // Define the button text for the email template
        const buttonText = "View in Portal";

        // Generate the HTML content for the notification email
        const emailHtml = getGeneralNotificationTemplate(title, message, link, buttonText);

        // Initiate the email sending process without awaiting (to run in background)
        const emailPromise = sendUserEmail(userId, title, emailHtml);

        /**
         * Error handler for the background email process.
         */
        const handleEmailError = (error: unknown) => {
            // Construct the error message
            const errorMsg = "Failed to send notification email:";
            // Log the error to the console
            console.error(errorMsg, error);
        };

        // Attach the error handler to the email promise
        emailPromise.catch(handleEmailError);
    }

    // Return the created notification object
    return notification;
}

/**
 * Fetches a list of notifications for a user, prioritizing unread ones.
 * 
 * @param {string} userId - The ID of the user whose notifications are being fetched.
 * @param {number} [limit=20] - The maximum total number of notifications to return.
 * @returns {Promise<Notification[]>} An array of notifications.
 */
export async function getNotifications(userId: string, limit: number = 20) {
    // Define the search criteria for unread notifications
    const unreadCriteria = {
        userId: userId,
        read: false
    };

    // Define the sort order for notifications
    const sortOrder = {
        createdAt: "desc" as const
    };

    // Fetch all unread notifications for the user
    const unreads = await prisma.notification.findMany({
        where: unreadCriteria,
        orderBy: sortOrder,
    });

    // Calculate how many read notifications are needed to reach the limit
    const unreadCount = unreads.length;

    // Determine the number of additional read notifications to fetch
    const readsToFetch = Math.max(0, limit - unreadCount);

    // Initialize an empty array to store read notifications
    let reads: Notification[] = [];

    // Check if more notifications are needed to fulfill the limit
    const needsMore = readsToFetch > 0;

    // If more notifications are required
    if (needsMore) {
        // Define the search criteria for read notifications
        const readCriteria = {
            userId: userId,
            read: true
        };

        // Fetch the required number of read notifications
        reads = await prisma.notification.findMany({
            where: readCriteria,
            orderBy: sortOrder,
            take: readsToFetch,
        });
    }

    // Combine unread and read notifications into a single array
    const combinedNotifications = [...unreads, ...reads];

    // Return the combined list of notifications
    return combinedNotifications;
}

/**
 * Fetches a paginated and searchable list of notifications for a user.
 * 
 * @param {Object} params - Pagination and search parameters.
 * @param {string} params.userId - The ID of the user.
 * @param {number} [params.page=1] - The page number to fetch.
 * @param {number} [params.limit=10] - The number of notifications per page.
 * @param {string} [params.search=""] - An optional search term to filter notifications.
 * @returns {Promise<{notifications: Notification[], total: number, pages: number}>} Paginated result.
 */
export async function getNotificationsPaged(params: {
    userId: string;
    page?: number;
    limit?: number;
    search?: string;
}) {
    // Extract userId from parameters
    const userId = params.userId;

    // Extract page number or default to 1
    const page = params.page || 1;

    // Extract page limit or default to 10
    const limit = params.limit || 10;

    // Extract search term or default to an empty string
    const search = params.search || "";

    // Calculate the number of records to skip for pagination
    const skipCount = (page - 1) * limit;

    // Determine the case-insensitive mode for search
    const searchMode = 'insensitive' as const;

    // Construct the search filter for title or message content
    const searchFilter = search ? [
        { title: { contains: search, mode: searchMode } },
        { message: { contains: search, mode: searchMode } },
    ] : undefined;

    // Define the base query criteria
    const baseWhere = {
        userId: userId,
        OR: searchFilter,
    };

    // Define the sort order for notifications
    const orderBy = {
        createdAt: "desc" as const
    };

    // Execute both the data fetch and the count operation concurrently
    const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
            where: baseWhere,
            orderBy: orderBy,
            take: limit,
            skip: skipCount,
        }),
        prisma.notification.count({
            where: baseWhere
        }),
    ]);

    // Calculate the total number of pages available
    const totalPages = Math.ceil(totalCount / limit);

    // Construct the final result object
    const result = {
        notifications: notifications,
        total: totalCount,
        pages: totalPages,
    };

    // Return the paginated result
    return result;
}

/**
 * Marks a single notification as read.
 * 
 * @param {string} id - The unique ID of the notification.
 * @returns {Promise<Notification>} The updated notification record.
 */
export async function markNotificationAsRead(id: string) {
    // Define the identification criteria for the notification
    const findCriteria = {
        id: id
    };

    // Define the update data to mark the notification as read
    const updateData = {
        read: true
    };

    // Execute the update operation in the database
    const updatedNotification = await prisma.notification.update({
        where: findCriteria,
        data: updateData,
    });

    // Return the updated notification
    return updatedNotification;
}

/**
 * Marks all unread notifications for a specific user as read.
 * 
 * @param {string} userId - The ID of the user.
 * @returns {Promise<any>} The result of the batch update operation.
 */
export async function markAllNotificationsAsRead(userId: string) {
    // Define the criteria for unread notifications belonging to the user
    const bulkCriteria = {
        userId: userId,
        read: false
    };

    // Define the update data to mark notifications as read
    const bulkUpdateData = {
        read: true
    };

    // Execute the batch update operation in the database
    const updateResult = await prisma.notification.updateMany({
        where: bulkCriteria,
        data: bulkUpdateData,
    });

    // Return the result of the update operation
    return updateResult;
}
