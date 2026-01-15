"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function getCompanySettings(slug: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { slug },
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
                createdAt: true,
                policyThreshold: true
            }
        });
        return company;
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
}

export async function updateCompanySettings(
    id: string,
    data: {
        name: string,
        logoUrl?: string,
        domain?: string,
        currency?: string,
        timezone?: string,
        country?: string,
        policyThreshold?: Prisma.InputJsonValue
    }
) {
    try {
        const session = await getServerSession(authOptions);
        const actor = session?.user;

        const updated = await prisma.company.update({
            where: { id },
            data: {
                name: data.name,
                logoUrl: data.logoUrl,
                domain: data.domain,
                currency: data.currency,
                timezone: data.timezone,
                country: data.country,
                policyThreshold: data.policyThreshold
            }
        });

        // Log the activity
        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            companyId: id,
            actorId: actor?.id,
            action: "SETTINGS_CHANGE",
            description: "Updated company settings",
            metadata: {
                changes: Object.keys(data).filter(k => k !== 'name') // rough approximation
            }
        });

        revalidatePath(`/company/${updated.slug}/admin/settings`);
        return { success: true, company: updated };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
