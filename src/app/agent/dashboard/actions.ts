
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RequestStatus, IntegrationStatus, UserRole, BidStatus } from "@prisma/client";

export async function getAgencyStats() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !["TRAVEL_AGENT", "AGENCY_EMPLOYEE"].includes(session.user.role)) {
        return {
            openOpportunities: 0,
            activeBids: 0,
            pendingFulfillment: 0,
            totalRevenue: 0,
            currency: "USD"
        };
    }

    const agencyId = session.user.companyId;

    const isAgent = session.user.role === UserRole.TRAVEL_AGENT;

    let openOpportunities = 0;
    let activeBids = 0;
     
    let pendingFulfillment = 0;

    if (isAgent) {
        const stats = await Promise.all([
            // Requests that are APPROVED (by company) but not yet assigned to anyone
            prisma.tripRequest.count({
                where: {
                    status: RequestStatus.APPROVED,
                    assignedAgentId: null,
                    company: {
                        integrationsAsClient: {
                            some: {
                                agencyId: agencyId,
                                status: IntegrationStatus.ACTIVE
                            }
                        }
                    },
                    bids: {
                        none: {
                            agentId: agencyId
                        }
                    }
                }
            }),
            // Bids we've made that are still pending
            prisma.agentBid.count({
                where: {
                    agentId: agencyId,
                    status: BidStatus.PENDING,
                    request: {
                        assignedAgentId: null
                    }
                }
            }),
            // Fulfillment
            prisma.tripRequest.count({
                where: {
                    assignedAgentId: agencyId,
                    status: {
                        in: [RequestStatus.APPROVED, RequestStatus.BOOKED, RequestStatus.IN_PROGRESS]
                    }
                }
            })
        ]);
        openOpportunities = stats[0];
        activeBids = stats[1];
        pendingFulfillment = stats[2];
    } else {
        // Agency Employee only sees fulfillment
        pendingFulfillment = await prisma.tripRequest.count({
            where: {
                assignedAgentId: agencyId,
                status: {
                    in: [RequestStatus.APPROVED, RequestStatus.BOOKED, RequestStatus.IN_PROGRESS]
                }
            }
        });
    }

    // Fetch agency currency
    const agency = await prisma.company.findUnique({
        where: { id: agencyId },
        select: { currency: true }
    });

    return {
        openOpportunities,
        activeBids,
        pendingFulfillment,
        totalRevenue: 0, // Placeholder until invoices are implemented
        currency: agency?.currency || "USD"
    };
}

export async function getRecentOpportunities() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) return [];

    const agencyId = session.user.companyId;

    // Fetch latest 5 approved requests that don't have a bid from us yet
    // Filter: Must be from integrated companies
    return await prisma.tripRequest.findMany({
        where: {
            status: RequestStatus.APPROVED,
            assignedAgentId: null,
            company: {
                integrationsAsClient: {
                    some: {
                        agencyId: agencyId,
                        status: IntegrationStatus.ACTIVE
                    }
                }
            },
            bids: {
                none: {
                    agentId: agencyId
                }
            }
        },
        include: {
            company: {
                select: {
                    name: true,
                    logoUrl: true
                }
            },
            user: {
                select: {
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 5
    });
}
