
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RequestStatus, IntegrationStatus } from "@prisma/client";
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
    if (!session?.user?.companyId) redirect("/");

    const agencyId = session.user.companyId;
    const params = await searchParams;
    const query = params.query || "";
    const companyId = params.companyId;
    const startDate = params.startDate;
    const endDate = params.endDate;
    const page = Number(params.page) || 1;
    const PAGE_SIZE = 10;

    const integratedCompanies = await getIntegratedCompanies();

    // Base filter: Must be from integrated company AND (Approved OR Bid Submitted)
    const whereCondition: any = {
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
                    { destination: { contains: query, mode: "insensitive" } },
                ]
            }
        ];
    }

    // Apply Date Filter (Trip Start Date)
    if (startDate || endDate) {
        whereCondition.startDate = {};
        if (startDate) whereCondition.startDate.gte = new Date(startDate);
        if (endDate) whereCondition.startDate.lte = new Date(endDate);
    }

    const [requests, totalCount] = await Promise.all([
        prisma.tripRequest.findMany({
            where: whereCondition,
            include: {
                company: { select: { name: true, logoUrl: true } },
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
        <div className="space-y-6 animate-in fade-in duration-500">
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
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 text-gray-500">
                        <p className="font-semibold text-gray-900">No requests found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    requests.map((req) => {
                        const myBid = req.bids[0];
                        const isBidSubmitted = !!myBid;

                        return (
                            <Link key={req.id} href={`/agent/bids/${req.id}`} className="block group">
                                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-2xl hover:shadow-md hover:ring-indigo-100 transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                        {req.title}
                                                    </h3>
                                                    {isBidSubmitted ? (
                                                        <Badge variant="secondary" className={`
                                                            ${myBid.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : ''}
                                                            ${myBid.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : ''}
                                                            ${myBid.status === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                                                            font-bold
                                                        `}>
                                                            {myBid.status === 'PENDING' && `Bid: $${Number(myBid.amount).toLocaleString()}`}
                                                            {myBid.status === 'ACCEPTED' && `Won: $${Number(myBid.amount).toLocaleString()}`}
                                                            {myBid.status === 'REJECTED' && 'Bid Rejected'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 font-bold">
                                                            Open Opportunity
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-100 rounded-md text-gray-500">
                                                            <MapPin size={14} />
                                                        </div>
                                                        {req.destination}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-100 rounded-md text-gray-500">
                                                            <Calendar size={14} />
                                                        </div>
                                                        {format(new Date(req.startDate), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-100 rounded-md text-gray-500">
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
                                                            {Number(req.budget).toLocaleString()}
                                                            <span className="text-sm font-bold text-gray-400">USD</span>
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
