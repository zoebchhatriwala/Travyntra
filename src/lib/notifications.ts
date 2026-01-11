import { prisma } from "@/lib/prisma";

import { sendUserEmail } from "@/lib/email";
import { getGeneralNotificationTemplate } from "@/lib/email-templates";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export async function createNotification({
    userId,
    title,
    message,
    type = "INFO",
    link,
    sendEmail = false,
}: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
    sendEmail?: boolean;
}) {
    // 1. Create in-app notification
    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            link,
        },
    });

    // 2. Send email if requested
    if (sendEmail) {
        // Run in background (don't await) to speed up response
        const emailHtml = getGeneralNotificationTemplate(title, message, link, "View in Portal");
        sendUserEmail(userId, title, emailHtml).catch(err => {
            console.error("Failed to send notification email:", err);
        });
    }

    return notification;
}

export async function getNotifications(userId: string, limit: number = 20) {
    const unreads = await prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: "desc" },
    });

    const readsToFetch = Math.max(0, limit - unreads.length);

    let reads: any[] = [];
    if (readsToFetch > 0) {
        reads = await prisma.notification.findMany({
            where: { userId, read: true },
            orderBy: { createdAt: "desc" },
            take: readsToFetch,
        });
    }

    return [...unreads, ...reads];
}

export async function getNotificationsPaged({
    userId,
    page = 1,
    limit = 10,
    search = "",
}: {
    userId: string;
    page?: number;
    limit?: number;
    search?: string;
}) {
    const skip = (page - 1) * limit;

    const where = {
        userId,
        OR: search ? [
            { title: { contains: search, mode: 'insensitive' as const } },
            { message: { contains: search, mode: 'insensitive' as const } },
        ] : undefined,
    };

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
        }),
        prisma.notification.count({ where }),
    ]);

    return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
    };
}

export async function markNotificationAsRead(id: string) {
    return await prisma.notification.update({
        where: { id },
        data: { read: true },
    });
}

export async function markAllNotificationsAsRead(userId: string) {
    return await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });
}
