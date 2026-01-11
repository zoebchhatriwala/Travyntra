"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function changePassword(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { success: false, error: "Unauthorized" };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { success: false, error: "All fields are required" };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: "New passwords do not match" };
    }

    if (newPassword.length < 6) {
        return { success: false, error: "New password must be at least 6 characters" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const isPasswordValid = await compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return { success: false, error: "Incorrect current password" };
        }

        const hashedPassword = await hash(newPassword, 10);
        await prisma.user.update({
            where: { email: session.user.email },
            data: { password: hashedPassword },
        });

        await createNotification({
            userId: user.id,
            title: "Security Update",
            message: "Your account password has been successfully updated.",
            type: "SUCCESS"
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to change password:", error);
        return { success: false, error: "Failed to update password" };
    }
}

export async function updateProfile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { success: false, error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const avatar = formData.get("avatar") as File | null;

    try {
        let avatarUrl: string | undefined;

        if (avatar && avatar.size > 0) {
            const { uploadFile } = await import("@/lib/storage");
            avatarUrl = await uploadFile(avatar, "avatars");
        }

        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: {
                ...(name && { name }),
                ...(avatarUrl && { avatarUrl }),
            },
        });

        await createNotification({
            userId: user.id,
            title: "Profile Updated",
            message: "Your profile information has been successfully updated.",
            type: "SUCCESS"
        });

        revalidatePath("/settings");
        return { success: true, avatarUrl: user.avatarUrl };
    } catch (error) {
        console.error("Failed to update profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
}
