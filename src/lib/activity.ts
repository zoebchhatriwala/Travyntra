import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity({
    companyId,
    actorId,
    targetId,
    action,
    description,
    metadata
}: {
    companyId: string;
    actorId?: string;
    targetId?: string;
    action: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
}) {
    try {
        await prisma.activityLog.create({
            data: {
                companyId,
                actorId,
                targetId,
                action,
                description,
                metadata,
            }
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw, we don't want to break the main flow if logging fails
    }
}
