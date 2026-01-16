"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import {
    type AutoApprovalPolicy,
} from "@/types/workflow/auto-approval-policy";
import {
    parseAutoApprovalPolicy,
    createDefaultPolicy,
} from "@/lib/utils/auto-approval-policy";
import { Prisma } from "@prisma/client";

/**
 * Retrieves the current auto-approval policy for the company.
 * 
 * @returns {Promise<Object>} The policy and company info or error.
 */
export async function getAutoApprovalPolicy(): Promise<
    | { error: string }
    | {
        policy: AutoApprovalPolicy;
        companyCurrency: string;
        companyCountry: string | null;
        companySlug: string;
    }
> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId || session.user.role !== "COMPANY_ADMIN") {
        return { error: "Unauthorized" };
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: {
                policyThreshold: true,
                currency: true,
                country: true,
                slug: true,
            },
        });

        if (!company) {
            return { error: "Company not found" };
        }

        // Parse existing policy or create default
        let policy = parseAutoApprovalPolicy(company.policyThreshold);

        if (!policy) {
            policy = createDefaultPolicy();
        }

        return {
            policy,
            companyCurrency: company.currency,
            companyCountry: company.country,
            companySlug: company.slug,
        };
    } catch (e) {
        console.error("Failed to fetch auto-approval policy:", e);
        return { error: "Failed to fetch policy" };
    }
}

/**
 * Updates the auto-approval policy for the company.
 * 
 * @param {AutoApprovalPolicy} policy - The new policy configuration.
 * @returns {Promise<Object>} Success or error result.
 */
export async function updateAutoApprovalPolicy(
    policy: AutoApprovalPolicy
): Promise<{ error: string } | { success: true }> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId || session.user.role !== "COMPANY_ADMIN") {
        return { error: "Unauthorized" };
    }

    try {
        // Add timestamp
        const updatedPolicy = {
            ...policy,
            updatedAt: new Date().toISOString(),
        };

        // Update the company's policy
        await prisma.company.update({
            where: { id: session.user.companyId },
            data: {
                policyThreshold: updatedPolicy as unknown as Prisma.InputJsonValue,
            },
        });

        // Log the activity
        await prisma.activityLog.create({
            data: {
                companyId: session.user.companyId,
                actorId: session.user.id,
                action: "POLICY_UPDATED",
                description: `Auto-approval policy ${policy.enabled ? "enabled" : "disabled"} with ${policy.rules.length} rule(s)`,
                metadata: {
                    rulesCount: policy.rules.length,
                    enabled: policy.enabled,
                },
            },
        });

        revalidatePath(`/company/${session.user.companySlug}/admin/settings/auto-approval`);

        return { success: true };
    } catch (e) {
        console.error("Failed to update auto-approval policy:", e);
        return { error: "Failed to update policy" };
    }
}
