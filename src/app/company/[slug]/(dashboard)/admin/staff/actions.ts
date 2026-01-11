"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function getCompanyStaff(slug: string) {
    try {
        const company = await prisma.company.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!company) return [];

        const staff = await prisma.user.findMany({
            where: {
                companyId: company.id,
                role: {
                    in: [UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN]
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return staff;
    } catch (error) {
        console.error("Failed to fetch staff:", error);
        return [];
    }
}

export async function approveStaff(staffId: string, slug: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { isActive: true }
        });

        await createNotification({
            userId: staffId,
            title: "Account Approved",
            message: "Your account has been approved by the company administrator. You can now access all features.",
            type: "SUCCESS",
            link: `/company/${slug}/dashboard`
        });

        revalidatePath(`/company/${slug}/admin/staff`);
        return { success: true };
    } catch (error) {
        console.error("Failed to approve staff:", error);
        return { success: false, error: "Failed to approve staff" };
    }
}

export async function toggleStaffBlock(staffId: string, isBlocked: boolean, slug: string) {
    try {
        if (isBlocked) {
            const user = await prisma.user.findUnique({
                where: { id: staffId },
                select: { role: true, companyId: true }
            });

            if (user?.role === UserRole.COMPANY_ADMIN) {
                const adminCount = await prisma.user.count({
                    where: {
                        companyId: user.companyId,
                        role: UserRole.COMPANY_ADMIN,
                        isActive: true,
                        isBlocked: false
                    }
                });

                if (adminCount <= 1) {
                    return {
                        success: false,
                        error: "Critical security protocol: Cannot block the last active administrator."
                    };
                }
            }
        }

        await prisma.user.update({
            where: { id: staffId },
            data: { isBlocked }
        });

        await createNotification({
            userId: staffId,
            title: isBlocked ? "Account Blocked" : "Account Unblocked",
            message: isBlocked
                ? "Your account has been blocked. Please contact your company administrator for more information."
                : "Your account has been unblocked. You can now access your account again.",
            type: isBlocked ? "ERROR" : "INFO"
        });

        revalidatePath(`/company/${slug}/admin/staff`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff status:", error);
        return { success: false, error: "Failed to update staff status" };
    }
}

export async function updateStaffRole(staffId: string, role: UserRole, slug: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: staffId },
            select: { role: true, companyId: true }
        });

        if (!user) return { success: false, error: "User not found" };

        // Safety check: Don't allow demoting the last active administrator
        if (user.role === UserRole.COMPANY_ADMIN && role === UserRole.EMPLOYEE) {
            const adminCount = await prisma.user.count({
                where: {
                    companyId: user.companyId,
                    role: UserRole.COMPANY_ADMIN,
                    isActive: true,
                    isBlocked: false
                }
            });

            if (adminCount <= 1) {
                return {
                    success: false,
                    error: "Critical security protocol: Cannot demote the last active administrator. Please promote another member first."
                };
            }
        }

        await prisma.user.update({
            where: { id: staffId },
            data: { role }
        });
        revalidatePath(`/company/${slug}/admin/staff`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff role:", error);
        return { success: false, error: "Failed to update staff role" };
    }
}

export async function updateStaffTags(staffId: string, tags: string[], slug: string) {
    try {
        await prisma.user.update({
            where: { id: staffId },
            data: { tags }
        });
        revalidatePath(`/company/${slug}/admin/staff`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff tags:", error);
        return { success: false, error: "Failed to update staff tags" };
    }
}
