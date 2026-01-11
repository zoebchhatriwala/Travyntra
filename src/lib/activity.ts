import { prisma } from "@/lib/prisma";

export async function logActivity({
    companyId,
    userId,
    action,
    description,
    metadata
}: {
    companyId: string;
    userId?: string;
    action: string;
    description: string;
    metadata?: any;
}) {
    try {
        await prisma.activityLog.create({
            data: {
                companyId,
                userId,
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
