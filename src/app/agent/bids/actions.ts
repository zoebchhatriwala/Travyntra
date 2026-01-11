"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { IntegrationStatus } from "@prisma/client";

export async function getIntegratedCompanies() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return [];

    const agencyId = session.user.companyId;

    const integrations = await prisma.agencyIntegration.findMany({
        where: {
            agencyId: agencyId,
            status: IntegrationStatus.ACTIVE
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            }
        }
    });

    return integrations.map(i => i.company);
}
