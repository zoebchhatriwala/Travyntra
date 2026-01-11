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

export async function getNotifications(limit?: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return [];

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    if (!user) return [];

    const result = await getDbNotifications(user.id, limit);
    return JSON.parse(JSON.stringify(result));
}

export async function getNotificationsPaged(params: {
    page?: number;
    limit?: number;
    search?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { notifications: [], total: 0, pages: 0 };

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    if (!user) return { notifications: [], total: 0, pages: 0 };

    const result = await getNotificationsPagedDb({
        userId: user.id,
        ...params
    });

    return JSON.parse(JSON.stringify(result)); // Handle Date serialization
}

export async function markAsRead(notificationId: string) {
    await markDbRead(notificationId);
    revalidatePath("/");
}

export async function markAllAsRead() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    if (!user) return;

    await markAllDbRead(user.id);
    revalidatePath("/");
}
