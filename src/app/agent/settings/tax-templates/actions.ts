"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface TaxItem {
    label: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
}

export async function getTaxTemplates() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return [];
        }

        const templates = await prisma.taxTemplate.findMany({
            where: { agencyId: session.user.companyId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return templates.map(t => ({
            ...t,
            taxes: t.taxes as unknown as TaxItem[]
        }));
    } catch (error) {
        console.error("Failed to fetch tax templates:", error);
        return [];
    }
}

export async function createTaxTemplate(data: {
    name: string;
    description?: string;
    taxes: TaxItem[];
    isDefault?: boolean;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // If this is set as default, unset other defaults
        if (data.isDefault) {
            await prisma.taxTemplate.updateMany({
                where: {
                    agencyId: session.user.companyId,
                    isDefault: true
                },
                data: { isDefault: false }
            });
        }

        await prisma.taxTemplate.create({
            data: {
                agencyId: session.user.companyId,
                name: data.name,
                description: data.description,
                taxes: data.taxes as unknown as any,
                isDefault: data.isDefault || false
            }
        });

        revalidatePath("/agent/settings/tax-templates");
        return { success: true };
    } catch (error) {
        console.error("Failed to create tax template:", error);
        return { success: false, error: "Failed to create tax template" };
    }
}

export async function updateTaxTemplate(id: string, data: {
    name: string;
    description?: string;
    taxes: TaxItem[];
    isDefault?: boolean;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify template belongs to agency
        const template = await prisma.taxTemplate.findUnique({
            where: { id }
        });

        if (!template || template.agencyId !== session.user.companyId) {
            return { success: false, error: "Template not found" };
        }

        // If this is set as default, unset other defaults
        if (data.isDefault) {
            await prisma.taxTemplate.updateMany({
                where: {
                    agencyId: session.user.companyId,
                    isDefault: true,
                    id: { not: id }
                },
                data: { isDefault: false }
            });
        }

        await prisma.taxTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                taxes: data.taxes as unknown as any,
                isDefault: data.isDefault || false
            }
        });

        revalidatePath("/agent/settings/tax-templates");
        return { success: true };
    } catch (error) {
        console.error("Failed to update tax template:", error);
        return { success: false, error: "Failed to update tax template" };
    }
}

export async function deleteTaxTemplate(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify template belongs to agency
        const template = await prisma.taxTemplate.findUnique({
            where: { id }
        });

        if (!template || template.agencyId !== session.user.companyId) {
            return { success: false, error: "Template not found" };
        }

        await prisma.taxTemplate.delete({
            where: { id }
        });

        revalidatePath("/agent/settings/tax-templates");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete tax template:", error);
        return { success: false, error: "Failed to delete tax template" };
    }
}

export async function setDefaultTemplate(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify template belongs to agency
        const template = await prisma.taxTemplate.findUnique({
            where: { id }
        });

        if (!template || template.agencyId !== session.user.companyId) {
            return { success: false, error: "Template not found" };
        }

        // Unset all defaults
        await prisma.taxTemplate.updateMany({
            where: {
                agencyId: session.user.companyId,
                isDefault: true
            },
            data: { isDefault: false }
        });

        // Set this one as default
        await prisma.taxTemplate.update({
            where: { id },
            data: { isDefault: true }
        });

        revalidatePath("/agent/settings/tax-templates");
        return { success: true };
    } catch (error) {
        console.error("Failed to set default template:", error);
        return { success: false, error: "Failed to set default template" };
    }
}
