"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
                createdAt: true
            }
        });
        return company;
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
}

export async function updateCompanySettings(id: string, data: { name: string, logoUrl?: string, domain?: string }) {
    try {
        const updated = await prisma.company.update({
            where: { id },
            data: {
                name: data.name,
                logoUrl: data.logoUrl,
                domain: data.domain
            }
        });
        revalidatePath(`/company/${updated.slug}/admin/settings`);
        return { success: true, company: updated };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
