import { prisma } from "@/lib/prisma";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export async function createNotification({
    userId,
    title,
    message,
    type = "INFO",
    link,
}: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
}) {
    return await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            link,
        },
    });
}

export async function getNotifications(userId: string) {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
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
