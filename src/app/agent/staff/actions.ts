"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/email";
import { getStaffWelcomeTemplate } from "@/lib/email-templates";
import { createNotification } from "@/lib/notifications";

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

export async function getAgencyStaff() {
    try {
        const user = await getCurrentUser();

        if (!user || !user.companyId) {
            console.log("getAgencyStaff: No user or companyId");
            return [];
        }

        const staff = await prisma.user.findMany({
            where: {
                companyId: user.companyId,
                role: {
                    in: [UserRole.TRAVEL_AGENT, UserRole.AGENCY_EMPLOYEE]
                }
            },
            orderBy: { createdAt: "desc" }
        });

        console.log("getAgencyStaff: Found", staff.length, "staff members");
        return staff;
    } catch (error) {
        console.error("Failed to fetch agency staff:", error);
        return [];
    }
}

export async function createAgencyStaff(data: {
    name: string;
    email: string;
    password: string;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.companyId || currentUser.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            return { success: false, error: "User with this email already exists" };
        }

        // Hash the provided password
        const hashedPassword = await hash(data.password, 10);

        await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: UserRole.AGENCY_EMPLOYEE,
                companyId: currentUser.companyId,
                emailVerifiedAt: new Date(),
                isActive: true
            }
        });

        // Send welcome email
        const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
        const emailHtml = getStaffWelcomeTemplate(data.name, data.email, data.password, loginUrl);

        await sendEmail({
            to: data.email,
            subject: "Welcome to Travyntra Agency Portal",
            html: emailHtml
        });

        revalidatePath("/agent/staff");
        return { success: true };
    } catch (error) {
        console.error("Failed to create agency staff:", error);
        return { success: false, error: "Failed to create staff member" };
    }
}

export async function deleteAgencyStaff(staffId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.companyId || currentUser.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: staffId }
        });

        if (!targetUser || targetUser.companyId !== currentUser.companyId) {
            return { success: false, error: "User not found or unauthorized" };
        }

        if (targetUser.id === currentUser.id) {
            return { success: false, error: "Cannot delete yourself" };
        }

        await prisma.user.delete({
            where: { id: staffId }
        });

        revalidatePath("/agent/staff");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete agency staff:", error);
        return { success: false, error: "Failed to delete staff member" };
    }
}

export async function updateStaffStatus(staffId: string, isBlocked: boolean) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.companyId || currentUser.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify target user belongs to same agency
        const targetUser = await prisma.user.findUnique({
            where: { id: staffId }
        });

        if (!targetUser || targetUser.companyId !== currentUser.companyId) {
            return { success: false, error: "User not found or unauthorized" };
        }

        // Prevent blocking yourself
        if (targetUser.id === currentUser.id) {
            return { success: false, error: "Cannot block yourself" };
        }

        await prisma.user.update({
            where: { id: staffId },
            data: { isBlocked }
        });

        // Send notification to the staff member
        await createNotification({
            userId: staffId,
            title: isBlocked ? "Account Blocked" : "Account Unblocked",
            message: isBlocked
                ? `Your account has been blocked by ${currentUser.name}. Please contact your agency administrator for more information.`
                : `Your account has been unblocked by ${currentUser.name}. You can now access the system again.`,
            type: isBlocked ? "WARNING" : "SUCCESS",
            sendEmail: true
        });

        revalidatePath("/agent/staff");
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff status:", error);
        return { success: false, error: "Failed to update staff status" };
    }
}

export async function updateStaffRole(staffId: string, newRole: UserRole) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.companyId || currentUser.role !== UserRole.TRAVEL_AGENT) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify target user belongs to same agency
        const targetUser = await prisma.user.findUnique({
            where: { id: staffId }
        });

        if (!targetUser || targetUser.companyId !== currentUser.companyId) {
            return { success: false, error: "User not found or unauthorized" };
        }

        // Prevent modifying yourself
        if (targetUser.id === currentUser.id) {
            return { success: false, error: "Cannot modify your own role" };
        }

        if (newRole !== UserRole.TRAVEL_AGENT && newRole !== UserRole.AGENCY_EMPLOYEE) {
            return { success: false, error: "Invalid role" };
        }

        const oldRole = targetUser.role;

        await prisma.user.update({
            where: { id: staffId },
            data: { role: newRole }
        });

        // Send notification to the staff member
        const isPromotion = newRole === UserRole.TRAVEL_AGENT && oldRole === UserRole.AGENCY_EMPLOYEE;
        const isDemotion = newRole === UserRole.AGENCY_EMPLOYEE && oldRole === UserRole.TRAVEL_AGENT;

        if (isPromotion) {
            await createNotification({
                userId: staffId,
                title: "Role Updated - Promoted to Travel Agent",
                message: `Congratulations! You have been promoted to Travel Agent by ${currentUser.name}. You now have full access to all agency features including bidding and invoice management.`,
                type: "SUCCESS",
                sendEmail: true
            });
        } else if (isDemotion) {
            await createNotification({
                userId: staffId,
                title: "Role Updated - Changed to Agency Employee",
                message: `Your role has been updated to Agency Employee by ${currentUser.name}. Your access is now limited to the fulfillment center.`,
                type: "INFO",
                sendEmail: true
            });
        }

        revalidatePath("/agent/staff");
        return { success: true };
    } catch (error) {
        console.error("Failed to update staff role:", error);
        return { success: false, error: "Failed to update staff role" };
    }
}
