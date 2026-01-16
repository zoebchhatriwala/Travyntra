
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma, RequestStatus, IntegrationStatus, UserRole } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { BidsFilter } from "./_components/bids-filter";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getIntegratedCompanies } from "./actions";
import { parseMoney, formatMoney } from "@/lib/utils/money";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { type LocationDisplay as Location } from "@/types/common/location";

interface PageProps {
    searchParams: Promise<{
        query?: string;
        companyId?: string;
        startDate?: string;
        endDate?: string;
        page?: string;
    }>;
}

export default async function BidsPage({ searchParams }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) redirect("/");

    const agencyId = session.user.companyId as string;
    const params = await searchParams;
    const query = params.query || "";
    const companyId = params.companyId;
    const startDate = params.startDate;
    const endDate = params.endDate;
    const page = Number(params.page) || 1;
    const PAGE_SIZE = 10;

    const integratedCompanies = await getIntegratedCompanies();

    // Base filter: Must be from integrated company AND (Approved OR Has non-accepted bid)
    // Exclude requests where agency has already WON the bid (those go to Fulfillment Console)
    const whereCondition: Prisma.TripRequestWhereInput = {
        company: {
            integrationsAsClient: {
                some: {
                    agencyId: agencyId,
                    status: IntegrationStatus.ACTIVE
                }
            }
        },
        OR: [
            // Open opportunities - approved, no agent assigned yet
            {
                status: RequestStatus.APPROVED,
                assignedAgentId: null,
            },
            // Agency has a PENDING bid (not yet decided)
            {
                bids: {
                    some: {
                        agentId: agencyId,
                        status: "PENDING"
                    }
                }
            },
            // Agency has a REJECTED bid (keep for history/reference)
            {
                bids: {
                    some: {
                        agentId: agencyId,
                        status: "REJECTED"
                    }
                }
            }
        ],
        // Explicitly exclude requests where this agency has an ACCEPTED bid (won)
        NOT: {
            bids: {
                some: {
                    agentId: agencyId,
                    status: "ACCEPTED"
                }
            }
        }
    };

    // Apply specific company filter
    if (companyId) {
        whereCondition.companyId = companyId;
    }

    // Apply Text Search
    if (query) {
        whereCondition.AND = [
            {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                ]
            }
        ];
    }

    // Apply Date Filter (Trip Start Date)
    if (startDate || endDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        whereCondition.startDate = dateFilter;
    }

    const [requests, totalCount] = await Promise.all([
        prisma.tripRequest.findMany({
            where: whereCondition,
            include: {
                company: { select: { name: true, logoUrl: true, currency: true } },
                user: { select: { name: true } },
                bids: {
                    where: { agentId: agencyId },
                    select: { amount: true, status: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.tripRequest.count({ where: whereCondition })
    ]);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bid Management</h1>
                        <p className="text-gray-500 font-medium">Find and manage opportunities from your partner networks.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 border-b border-gray-100 pb-6">
                    <SearchInput placeholder="Search requests..." />
                    <BidsFilter companies={integratedCompanies} />
                </div>
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-corner-xl border border-dashed border-gray-200 text-gray-500">
                        <p className="font-semibold text-gray-900">No requests found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    requests.map((req) => {
                        const myBid = req.bids[0];
                        const isBidSubmitted = !!myBid;

                        return (
                            <Link key={req.id} href={`/agent/bids/${req.id}`} className="block group min-w-0">
                                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-lg hover:shadow-md hover:ring-indigo-100 transition-all duration-300 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-3 min-w-0 flex-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors truncate max-w-full">
                                                                {req.title}
                                                            </h3>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{req.title}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {isBidSubmitted ? (
                                                        <Badge variant="secondary" className={`
                                                            ${myBid.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : ''}
                                                            ${myBid.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : ''}
                                                            ${myBid.status === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                                                            font-bold shrink-0
                                                        `}>
                                                            {myBid.status === 'PENDING' && `Bid: ${formatMoney(parseMoney(myBid.amount))}`}
                                                            {myBid.status === 'ACCEPTED' && `Won: ${formatMoney(parseMoney(myBid.amount))}`}
                                                            {myBid.status === 'REJECTED' && 'Bid Rejected'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 font-bold shrink-0">
                                                            Open Opportunity
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                                                    <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
                                                        <div className="p-1.5 bg-gray-100 rounded-corner-sm text-gray-500 shrink-0">
                                                            <MapPin size={14} />
                                                        </div>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="truncate">
                                                                    {(req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown"}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{(req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown"}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-100 rounded-corner-sm text-gray-500">
                                                            <Calendar size={14} />
                                                        </div>
                                                        {format(new Date(req.startDate), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-100 rounded-corner-sm text-gray-500">
                                                            <User size={14} />
                                                        </div>
                                                        <span className="text-gray-900">{req.company.name}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span>{req.user.name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center md:flex-col md:items-end gap-2 pl-4 md:border-l border-gray-100 min-w-[140px]">
                                                {req.budget && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Budget</span>
                                                        <span className="text-xl font-black text-gray-900 flex items-center justify-end gap-1">
                                                            {formatMoney(parseMoney(req.budget))}
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

            <PaginationControls totalCount={totalCount} pageSize={PAGE_SIZE} />
        </div>
    );
}
