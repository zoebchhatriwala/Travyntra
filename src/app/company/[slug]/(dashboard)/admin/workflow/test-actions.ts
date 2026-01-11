"use server";

import { prisma } from "@/lib/prisma";
import { WorkflowEngine } from "@/lib/workflow-engine";
import { revalidatePath } from "next/cache";
import { ApprovalStatus, RequestStatus } from "@prisma/client";

export async function createTestRequest(companySlug: string, userId: string) {
    const company = await prisma.company.findUnique({
        where: { slug: companySlug },
        select: { id: true }
    });

    if (!company) throw new Error("Company not found");

    const request = await prisma.tripRequest.create({
        data: {
            title: "Internal Sandbox Request",
            destination: "London, UK",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 3),
            purpose: "Training & Development",
            budget: 2500,
            companyId: company.id,
            userId: userId,
            status: RequestStatus.DRAFT
        }
    });

    // Start the workflow
    await WorkflowEngine.startWorkflow(request.id);

    revalidatePath(`/company/${companySlug}/admin/workflow`);
    return { success: true, requestId: request.id };
}

export async function approveTestStep(requestId: string, userId: string, slug: string) {
    await WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.APPROVED, "Automated test approval via Admin Sandbox.");
    revalidatePath(`/company/${slug}/admin/workflow`);
    return { success: true };
}

export async function rejectTestStep(requestId: string, userId: string, slug: string) {
    await WorkflowEngine.processUserApproval(requestId, userId, ApprovalStatus.REJECTED, "Automated test rejection via Admin Sandbox.");
    revalidatePath(`/company/${slug}/admin/workflow`);
    return { success: true };
}
