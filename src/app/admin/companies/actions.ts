"use server";

import { prisma } from "@/lib/prisma";
import { CompanyStatus, SubscriptionPlan, UserRole, CompanyType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

import { Company } from "./_components/company-list";

export async function getCompanies(type: CompanyType = CompanyType.ENTERPRISE): Promise<Company[]> {
    try {
        const companies = await prisma.company.findMany({
            where: { type },
            include: {
                users: {
                    where: {
                        role: UserRole.COMPANY_ADMIN
                    }
                },
                _count: {
                    select: {
                        users: true,
                        requests: true,
                        agencyRequests: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return companies;
    } catch (error) {
        console.error("Failed to fetch companies:", error);
        return [];
    }
}

export async function updateCompanyStatus(companyId: string, status: CompanyStatus) {
    try {
        const company = await prisma.company.update({
            where: { id: companyId },
            data: { status },
            include: { users: { where: { role: UserRole.COMPANY_ADMIN } } }
        });

        for (const admin of company.users) {
            await createNotification({
                userId: admin.id,
                title: "Company Status Updated",
                message: `Your company's status has been updated to ${status}.`,
                type: status === "ACTIVE" ? "SUCCESS" : "WARNING"
            });
        }

        revalidatePath("/admin/companies");
        return { success: true };
    } catch (error) {
        console.error("Failed to update company status:", error);
        return { success: false, error: "Failed to update company status" };
    }
}

export async function updateCompanySubscription(
    companyId: string,
    plan: SubscriptionPlan,
    expiresAt?: Date | null
) {
    try {
        const company = await prisma.company.update({
            where: { id: companyId },
            data: {
                plan,
                subscriptionExpiresAt: expiresAt
            },
            include: { users: { where: { role: UserRole.COMPANY_ADMIN } } }
        });

        for (const admin of company.users) {
            await createNotification({
                userId: admin.id,
                title: "Subscription Updated",
                message: `Your company's subscription plan has been updated to ${plan}.`,
                type: "SUCCESS"
            });
        }

        revalidatePath("/admin/companies");
        return { success: true };
    } catch (error) {
        console.error("Failed to update subscription:", error);
        return { success: false, error: "Failed to update subscription" };
    }
}

export async function toggleUserBlock(userId: string, isBlocked: boolean) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isBlocked }
        });
        revalidatePath("/admin/companies");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle user block:", error);
        return { success: false, error: "Failed to update user status" };
    }
}
