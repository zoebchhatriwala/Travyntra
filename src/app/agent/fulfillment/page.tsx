
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, FileCheck, Upload, Clock } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { PaginationControls } from "@/components/ui/pagination-controls";

import { BidStatus, Prisma, RequestStatus } from "@prisma/client";
import { parseMoney, formatMoney } from "@/lib/utils/money";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { formatStatus, getStatusColor } from "@/lib/utils";
import { type LocationDisplay as Location } from "@/types/common/location";

interface PageProps {
    searchParams: Promise<{
        query?: string;
        status?: string;
        page?: string;
    }>;
}

export default async function FulfillmentPage({ searchParams }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) redirect("/");

    const agencyId = session.user.companyId;
    const params = await searchParams;
    const query = params.query || "";
    const status = params.status || "";
    const page = Number(params.page) || 1;
    const PAGE_SIZE = 10;

    // Fulfillment Console shows requests where this agency has won the bid
    // i.e., the request is assigned to this agency
    const whereCondition: Prisma.TripRequestWhereInput = {
        agencyId: agencyId,
        // Only show requests that are in progress, booked, or completed
        status: {
            in: [RequestStatus.IN_PROGRESS, RequestStatus.BOOKED, RequestStatus.COMPLETED]
        }
    };

    // Apply status filter
    if (status) {
        whereCondition.status = status as RequestStatus;
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

    const [requests, totalCount, stats] = await Promise.all([
        prisma.tripRequest.findMany({
            where: whereCondition,
            include: {
                company: { select: { name: true, logoUrl: true, currency: true } },
                user: { select: { name: true, email: true } },
                bids: {
                    where: { agencyId: agencyId, status: BidStatus.ACCEPTED },
                    select: { amount: true }
                },
                documents: {
                    where: { type: { in: ["TICKET", "VISA"] } },
                    select: { id: true, type: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.tripRequest.count({ where: whereCondition }),
        // Stats for the dashboard
        prisma.tripRequest.groupBy({
            by: ['status'],
            where: { agencyId: agencyId },
            _count: true
        })
    ]);

    const inProgressCount = stats.find(s => s.status === 'IN_PROGRESS')?._count || 0;
    const bookedCount = stats.find(s => s.status === 'BOOKED')?._count || 0;
    const completedCount = stats.find(s => s.status === 'COMPLETED')?._count || 0;

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fulfillment Console</h1>
                        <p className="text-gray-500 font-medium">Manage won requests, upload tickets and visas.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-corner-lg border border-amber-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-corner-md">
                                <Clock size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">In Progress</p>
                                <p className="text-2xl font-black text-amber-800">{inProgressCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-corner-lg border border-blue-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-corner-md">
                                <Upload size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Booked</p>
                                <p className="text-2xl font-black text-blue-800">{bookedCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-corner-lg border border-emerald-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-corner-md">
                                <FileCheck size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                                <p className="text-2xl font-black text-emerald-800">{completedCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 border-b border-gray-100 pb-6">
                    <SearchInput placeholder="Search requests..." />
                    <div className="flex gap-2">
                        <Link
                            href="/agent/fulfillment"
                            className={`px-4 py-2 flex items-center text-sm font-semibold rounded-corner-md transition-all ${!status ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </Link>
                        <Link
                            href="/agent/fulfillment?status=IN_PROGRESS"
                            className={`px-4 py-2 flex items-center text-sm font-semibold rounded-corner-md transition-all ${status === 'IN_PROGRESS' ? 'bg-amber-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            In Progress
                        </Link>
                        <Link
                            href="/agent/fulfillment?status=BOOKED"
                            className={`px-4 py-2 flex items-center text-sm font-semibold rounded-corner-md transition-all ${status === 'BOOKED' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Booked
                        </Link>
                        <Link
                            href="/agent/fulfillment?status=COMPLETED"
                            className={`px-4 py-2 flex items-center text-sm font-semibold rounded-corner-md transition-all ${status === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Completed
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-corner-xl border border-dashed border-gray-200 text-gray-500">
                        <div className="w-16 h-16 bg-indigo-100 rounded-corner-lg flex items-center justify-center mx-auto mb-4">
                            <FileCheck size={28} className="text-indigo-600" />
                        </div>
                        <p className="font-semibold text-gray-900">No requests in fulfillment</p>
                        <p className="text-sm mt-1">Win some bids to see requests here!</p>
                    </div>
                ) : (
                    requests.map((req) => {
                        const myBid = req.bids[0];
                        const hasTicket = req.documents.some(d => d.type === 'TICKET');
                        const hasVisa = req.documents.some(d => d.type === 'VISA');

                        return (
                            <Link key={req.id} href={`/agent/fulfillment/${req.id}`} className="block group">
                                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-lg hover:shadow-md hover:ring-indigo-100 transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-3 min-w-0 flex-1">
                                                <div className="flex items-center gap-4 flex-wrap">
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
                                                    <Badge variant={getStatusColor(req.status)}>
                                                        {formatStatus(req.status)}
                                                    </Badge>
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

                                                {/* Document Status */}
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hasTicket ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {hasTicket ? '✓ Ticket Uploaded' : '○ Ticket Needed'}
                                                    </div>
                                                    <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${hasVisa ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {hasVisa ? '✓ Visa Uploaded' : '○ Visa Needed'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center md:flex-col md:items-end gap-2 pl-4 md:border-l border-gray-100 min-w-[140px]">
                                                {myBid && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1">Won Bid</span>
                                                        <span className="text-xl font-black text-emerald-600 flex items-center justify-end gap-1">
                                                            {formatMoney(parseMoney(myBid.amount))}
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
