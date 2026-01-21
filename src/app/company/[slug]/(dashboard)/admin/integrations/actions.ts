
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { CompanyType, CompanyStatus, IntegrationStatus, UserRole, NotificationType } from "@prisma/client";
import { PlanFeature, withPlanGuard } from "@/lib/services/plan-guard";
import { createNotification } from "@/lib/notifications";

export async function searchAgencies(query: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return [];

    const agencies = await prisma.company.findMany({
        where: {
            type: CompanyType.AGENT,
            name: {
                contains: query,
                mode: "insensitive",
            },
            status: CompanyStatus.ACTIVE, // Only show approved/active agencies
            NOT: {
                id: session.user.companyId // Should not happen if caller is not an agent, but good safety
            }
        },
        select: {
            id: true,
            name: true,
            logoUrl: true,
            integrationsAsAgency: {
                where: {
                    companyId: session.user.companyId
                },
                select: {
                    status: true
                }
            }
        },
        take: 10
    });

    return agencies.map(agency => ({
        ...agency,
        isIntegrated: agency.integrationsAsAgency.length > 0 && agency.integrationsAsAgency[0].status === IntegrationStatus.ACTIVE
    }));
}

async function toggleIntegrationInternal(agencyId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return { error: "Unauthorized" };

    const companyId = session.user.companyId;

    try {
        const existing = await prisma.agencyIntegration.findUnique({
            where: {
                companyId_agencyId: {
                    companyId,
                    agencyId
                }
            }
        });

        if (existing) {
            // Toggle status or DELETE? Requirement says "integrated", usually implies on/off.
            // Let's delete for "remove" behavior or toggle status. 
            // For now, let's delete to "disconnect".
            const integration = await prisma.agencyIntegration.delete({
                where: {
                    id: existing.id
                },
                include: {
                    company: {
                        select: { name: true }
                    },
                    agency: {
                        include: {
                            users: {
                                where: {
                                    role: UserRole.TRAVEL_AGENT
                                },
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            // Inform agency admins
            for (const admin of integration.agency.users) {
                await createNotification({
                    userId: admin.id,
                    title: "Integration Removed",
                    message: `${integration.company.name} has disconnected from your agency.`,
                    type: NotificationType.INFO,
                    link: "/agent/dashboard",
                    sendEmail: true
                });
            }

            revalidatePath(`/company/${session.user.companyId}/dashboard/admin/integrations`);
            return { status: "removed" };
        } else {
            const integration = await prisma.agencyIntegration.create({
                data: {
                    companyId,
                    agencyId,
                    status: IntegrationStatus.ACTIVE
                },
                include: {
                    company: {
                        select: { name: true }
                    },
                    agency: {
                        include: {
                            users: {
                                where: {
                                    role: UserRole.TRAVEL_AGENT
                                },
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            // Inform agency admins (TRAVEL_AGENT role)
            for (const admin of integration.agency.users) {
                await createNotification({
                    userId: admin.id,
                    title: "New Integration",
                    message: `${integration.company.name} has integrated with your agency. You will now receive trip requests from them.`,
                    type: NotificationType.SUCCESS,
                    link: "/agent/dashboard",
                    sendEmail: true
                });
            }

            revalidatePath(`/company/${session.user.companyId}/dashboard/admin/integrations`);
            return { status: "added" };
        }
    } catch (error) {
        console.error("Integration toggle error:", error);
        return { error: "Failed to update integration" };
    }
}

/**
 * Toggles an agency integration.
 * Wrapped with PlanGuard to enforce integration limits.
 */
export const toggleIntegration = withPlanGuard(PlanFeature.ADD_INTEGRATION, toggleIntegrationInternal);

export async function getIntegratedAgencies() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return [];

    const integrations = await prisma.agencyIntegration.findMany({
        where: {
            companyId: session.user.companyId,
            status: IntegrationStatus.ACTIVE
        },
        include: {
            agency: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    country: true
                }
            }
        }
    });

    return integrations;
}
