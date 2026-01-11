"use server";

import { prisma } from "@/lib/prisma";
import { UserRole, CompanyType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getPendingEntities() {
    try {
        // Broaden the search for agents to include those who might have defaulted to EMPLOYEE but have no company
        const agents = await prisma.user.findMany({
            where: {
                OR: [
                    { role: UserRole.TRAVEL_AGENT, isActive: false },
                    { role: UserRole.EMPLOYEE, isActive: false, companyId: null }
                ]
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
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // If a user was an 'orphaned' employee, promote them to Agent upon approval
        const updateData: { isActive: boolean; role?: UserRole } = { isActive: true };
        if (user?.role === UserRole.EMPLOYEE && !user.companyId) {
            updateData.role = UserRole.TRAVEL_AGENT;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
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

export async function getGlobalStats() {
    try {
        const [totalAgents, totalCompanies, totalRequests, totalEmployees] = await Promise.all([
            prisma.company.count({ where: { type: CompanyType.AGENT, status: 'ACTIVE' } }),
            prisma.company.count({ where: { type: CompanyType.ENTERPRISE, status: 'ACTIVE' } }),
            prisma.tripRequest.count(),
            prisma.user.count({ where: { role: UserRole.EMPLOYEE, isActive: true } }),
        ]);

        return {
            totalAgents,
            totalCompanies,
            totalRequests,
            totalEmployees,
            platformHealth: 99,
            status: "All Systems Operational"
        };
    } catch (error) {
        console.error("Failed to fetch global stats:", error);
        return null;
    }
}

