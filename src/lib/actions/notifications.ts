"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import {
    getNotifications as getDbNotifications,
    markNotificationAsRead as markDbRead,
    markAllNotificationsAsRead as markAllDbRead
} from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getNotifications() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return [];

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
    });

    if (!user) return [];

    return await getDbNotifications(user.id);
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
