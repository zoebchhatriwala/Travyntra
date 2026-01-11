"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

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
        const actor = await getCurrentUser();
        const user = await prisma.user.update({
            where: { id: staffId },
            data: { isActive: true },
            select: { companyId: true }
        });

        await createNotification({
            userId: staffId,
            title: "Account Approved",
            message: "Your account has been approved by the company administrator. You can now access all features.",
            type: "SUCCESS",
            link: `/company/${slug}/dashboard`
        });

        const { logActivity } = await import("@/lib/activity");

        await logActivity({
            companyId: user.companyId || "", // Should exist if we found the user
            actorId: actor?.id,
            targetId: staffId,
            action: "USER_REGISTERED",
            description: "New staff member approved",
            metadata: { approved: true }
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
        const actor = await getCurrentUser();
        let companyId = "";
        if (isBlocked) {
            const user = await prisma.user.findUnique({
                where: { id: staffId },
                select: { role: true, companyId: true }
            });
            companyId = user?.companyId || "";

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
        } else {
            const user = await prisma.user.findUnique({
                where: { id: staffId },
                select: { companyId: true }
            });
            companyId = user?.companyId || "";
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

        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            companyId: companyId,
            actorId: actor?.id,
            targetId: staffId,
            action: isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
            description: isBlocked ? "User account blocked" : "User account unblocked",
            metadata: { isBlocked }
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
        const actor = await getCurrentUser();
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

        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            companyId: user.companyId || "",
            actorId: actor?.id,
            targetId: staffId,
            action: "SETTINGS_CHANGE",
            description: `User role updated to ${role}`,
            metadata: { oldRole: user.role, newRole: role }
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
        const actor = await getCurrentUser();
        const user = await prisma.user.update({
            where: { id: staffId },
            data: { tags },
            select: { companyId: true }
        });

        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            companyId: user.companyId || "",
            actorId: actor?.id,
            targetId: staffId,
            action: "SETTINGS_CHANGE",
            description: "User tags updated",
            metadata: { tags }
        });

        revalidatePath(`/company/${slug}/admin/staff`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff tags:", error);
        return { success: false, error: "Failed to update staff tags" };
    }
}
