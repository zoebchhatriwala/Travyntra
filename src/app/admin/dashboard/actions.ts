"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getPendingEntities() {
    try {
        const agents = await prisma.user.findMany({
            where: {
                role: UserRole.TRAVEL_AGENT,
                isActive: false,
            },
            orderBy: { createdAt: "desc" },
        });

        const companies = await prisma.user.findMany({
            where: {
                role: UserRole.COMPANY_ADMIN,
                isActive: false,
            },
            include: {
                company: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return { agents, companies };
    } catch (error) {
        console.error("Failed to fetch pending entities:", error);
        return { agents: [], companies: [] };
    }
}

export async function approveUser(userId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
        });
        revalidatePath("/admin/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to approve user:", error);
        return { success: false, error: "Failed to approve user" };
    }
}

export async function rejectUser(userId: string) {
    try {
        // For now, we'll just delete the user. 
        // In a real app, we might want to keep a record or send an email.
        await prisma.user.delete({
            where: { id: userId },
        });
        revalidatePath("/admin/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to reject user:", error);
        return { success: false, error: "Failed to reject user" };
    }
}
