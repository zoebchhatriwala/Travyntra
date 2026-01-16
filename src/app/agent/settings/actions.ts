"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { logActivity } from "@/lib/activity";

import { ActivityLogAction } from "@/types/common/enums";

export async function getAgencySettings() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId) return null;

        const company = await prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: {
                id: true,
                name: true,
                slug: true,
                domain: true,
                logoUrl: true,
                status: true,
                plan: true,
                type: true,
                currency: true,
                timezone: true,
                country: true,
                createdAt: true
            }
        });
        return company;
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
}

export async function updateAgencySettings(
    id: string,
    data: {
        name: string,
        logoUrl?: string,
        domain?: string,
        currency?: string,
        timezone?: string,
        country?: string
    }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.companyId !== id) {
            return { success: false, error: "Unauthorized" };
        }

        const actor = session.user;

        const updated = await prisma.company.update({
            where: { id },
            data: {
                name: data.name,
                logoUrl: data.logoUrl,
                domain: data.domain,
                currency: data.currency,
                timezone: data.timezone,
                country: data.country
            }
        });

        // Log the activity
        await logActivity({
            companyId: id,
            actorId: actor.id,
            action: ActivityLogAction.SETTINGS_CHANGE,
            description: "Updated agency settings",
            metadata: {
                changes: Object.keys(data).filter(k => k !== 'name') // rough approximation
            }
        });

        revalidatePath(`/agent/settings`);
        return { success: true, company: updated };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
