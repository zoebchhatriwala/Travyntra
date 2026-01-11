"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ApprovalType } from "@prisma/client";

export async function getCompanyUsers(companySlug: string) {
    const company = await prisma.company.findUnique({
        where: { slug: companySlug },
        select: { id: true }
    });

    if (!company) throw new Error("Company not found");

    return prisma.user.findMany({
        where: {
            companyId: company.id,
            isActive: true
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            tags: true
        }
    });
}

export async function getWorkflowConfig(companySlug: string) {
    const company = await prisma.company.findUnique({
        where: { slug: companySlug },
        select: { id: true }
    });

    if (!company) throw new Error("Company not found");

    const workflow = await prisma.approvalWorkflow.findUnique({
        where: { companyId: company.id },
        include: {
            steps: {
                where: { deletedAt: null },
                orderBy: { order: "asc" },
                include: {
                    approvers: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            }
        }
    });

    return workflow;
}

export async function saveWorkflowConfig(
    companySlug: string,
    steps: {
        name: string;
        order: number;
        type: ApprovalType;
        approverIds: string[];
        approverTags: string[];
    }[]
) {
    const company = await prisma.company.findUnique({
        where: { slug: companySlug },
        select: { id: true }
    });

    if (!company) throw new Error("Company not found");

    // Start a transaction to update the workflow
    await prisma.$transaction(async (tx) => {
        // Find or create workflow
        let workflow = await tx.approvalWorkflow.findUnique({
            where: { companyId: company.id }
        });

        if (!workflow) {
            workflow = await tx.approvalWorkflow.create({
                data: {
                    name: "Standard Approval Workflow",
                    companyId: company.id
                }
            });
        }

        // Soft delete existing steps
        await tx.workflowStep.updateMany({
            where: { workflowId: workflow.id },
            data: { deletedAt: new Date() }
        });

        // Create new steps
        for (const step of steps) {
            await tx.workflowStep.create({
                data: {
                    workflowId: workflow.id,
                    name: step.name,
                    order: step.order,
                    type: step.type,
                    approverTags: step.approverTags,
                    approvers: {
                        connect: step.approverIds.map(id => ({ id }))
                    }
                }
            });
        }
    });

    revalidatePath(`/company/${companySlug}/admin/workflow`);
    return { success: true };
}
