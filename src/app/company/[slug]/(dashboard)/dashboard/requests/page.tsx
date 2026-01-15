
import { getEmployeeRequests } from "../actions";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Plane, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn, getStatusColor } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default async function RequestsPage({
    params,
    searchParams,
}: {
    params: { slug: string };
    searchParams?: { query?: string; page?: string };
}) {
    const { slug } = await params;
    const query = (await searchParams)?.query || "";
    const currentPage = Number((await searchParams)?.page) || 1;

    // Fetch data
    const { requests, totalPages } = await getEmployeeRequests({
        page: currentPage,
        query,
        limit: 10,
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header with Search and Create Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">My Requests</h1>
                    <p className="text-gray-500 font-medium">
                        Manage and track your travel journeys.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <SearchInput placeholder="Search requests..." />
                    <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200" asChild>
                        <Link href={`/company/${slug}/dashboard/requests/new`}>
                            <Plus size={20} />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Content */}
            {requests.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Plane size={24} className="text-gray-300" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">
                        {query ? "No matching requests" : "No requests yet"}
                    </h3>
                    <p className="text-gray-400 text-xs max-w-xs mx-auto mb-6">
                        {query ? "Try adjusting your search terms." : "Start your first journey by creating a request."}
                    </p>
                    {!query && (
                        <Button className="bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200" asChild>
                            <Link href={`/company/${slug}/dashboard/requests/new`}>Create Request</Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req) => (
                        <Link key={req.id} href={`/company/${slug}/dashboard/requests/${req.id}`}>
                            <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group">
                                <div className="flex items-center gap-6 min-w-0 flex-1 mr-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                        <Plane size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors break-all">{req.title}</h4>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{req.title}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                            <Clock size={12} />
                                            <span>Submitted on {format(new Date(req.createdAt), "MMM dd, yyyy")}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                    {req.isCollaborator && (
                                        <Badge variant="outline" className="rounded-xl px-3 py-1 font-bold text-[10px] border-indigo-100 bg-indigo-50/50 text-indigo-600">
                                            Shared with me
                                        </Badge>
                                    )}
                                    <div className="text-right hidden sm:block space-y-1">
                                        {req.cost ? (
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{req.currency} {req.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Total Cost</p>
                                            </div>
                                        ) : (
                                            req.budget > 0 && (
                                                <div>
                                                    <p className="text-sm font-black text-gray-400">{req.currency} {req.budget.toLocaleString()}</p>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Est. Budget</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <Badge className={cn("rounded-xl px-3 py-1 font-bold text-[10px] border-none", getStatusColor(req.status))}>
                                        {req.status}
                                    </Badge>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn("rounded-xl w-10 h-10", currentPage <= 1 && "pointer-events-none opacity-50")}
                        asChild
                    >
                        <Link href={`?query=${query}&page=${currentPage - 1}`} aria-disabled={currentPage <= 1}>
                            <ChevronLeft size={16} />
                        </Link>
                    </Button>
                    <span className="text-sm font-bold text-gray-600 px-4">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn("rounded-xl w-10 h-10", currentPage >= totalPages && "pointer-events-none opacity-50")}
                        asChild
                    >
                        <Link href={`?query=${query}&page=${currentPage + 1}`} aria-disabled={currentPage >= totalPages}>
                            <ChevronRight size={16} />
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
