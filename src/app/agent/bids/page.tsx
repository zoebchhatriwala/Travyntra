
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RequestStatus, IntegrationStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export default async function BidsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) redirect("/");

    const agencyId = session.user.companyId;

    // Fetch all opportunities
    // 1. Requests that are APPROVED and not assigned
    // 2. Requests where we have a PENDING bid (status might vary)
    const requests = await prisma.tripRequest.findMany({
        where: {
            // Must be from a company that has integrated with us
            company: {
                integrationsAsClient: {
                    some: {
                        agencyId: agencyId,
                        status: IntegrationStatus.ACTIVE
                    }
                }
            },
            OR: [
                {
                    status: RequestStatus.APPROVED,
                    assignedAgentId: null,
                },
                {
                    bids: {
                        some: {
                            agentId: agencyId
                        }
                    }
                }
            ]
        },
        include: {
            company: { select: { name: true, logoUrl: true } },
            user: { select: { name: true } },
            bids: {
                where: { agentId: agencyId },
                select: { amount: true, status: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Bid Management</h1>
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-lg border border-dashed text-gray-500">
                        No requests available for bidding.
                    </div>
                ) : (
                    requests.map((req) => {
                        const myBid = req.bids[0];
                        const isBidSubmitted = !!myBid;

                        return (
                            <Link key={req.id} href={`/agent/bids/${req.id}`} className="block">
                                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                        {req.title}
                                                    </h3>
                                                    {isBidSubmitted ? (
                                                        <Badge variant={myBid.status === 'PENDING' ? 'secondary' : 'default'} className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                                            Bid Submitted: ${myBid.amount?.toString()}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                                            Open for Bidding
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={14} />
                                                        {req.destination}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={14} />
                                                        {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={14} />
                                                        {req.user.name} ({req.company.name})
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {req.budget && (
                                                    <div className="text-right">
                                                        <span className="text-xs text-gray-400 uppercase tracking-wide block">Client Budget</span>
                                                        <span className="font-medium text-gray-900 flex items-center justify-end gap-1">
                                                            <DollarSign size={14} />
                                                            {Number(req.budget).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
