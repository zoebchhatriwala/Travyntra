"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

import {
    Search,
    MoreHorizontal,
    Ship,
    Download,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCompanyRequests, bulkProcessRequests, exportCompanyRequests } from "../../actions";

interface Request {
    id: string;
    title: string;
    userName: string;
    userAvatar: string | null;
    status: string;
    createdAt: Date;
    budget: number;
    cost?: number | null;
    currency: string;
    destination: string;
    startDate: Date;
    endDate: Date;
}

interface RequestsTableProps {
    slug: string;
    initialRequests: Request[];
    total: number;
    totalPages: number;
}

export function RequestsTable({ slug, initialRequests, total: initialTotal, totalPages: initialTotalPages }: RequestsTableProps) {
    const router = useRouter();
    const [requests, setRequests] = useState<Request[]>(initialRequests);
    const [total, setTotal] = useState(initialTotal);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getCompanyRequests(slug, {
                page,
                query: search,
                status: statusFilter
            });
            setRequests(result.requests as Request[]);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch {
            toast.error("Failed to fetch requests");
        } finally {
            setIsLoading(false);
        }
    }, [slug, page, search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRequests();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchRequests]);

    const toggleSelectAll = () => {
        if (selectedIds.length === requests.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(requests.map(r => r.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkAction = async (action: 'APPROVE' | 'REJECT') => {
        if (selectedIds.length === 0) return;

        const promise = bulkProcessRequests(selectedIds, action);
        toast.promise(promise, {
            loading: `Processing ${selectedIds.length} requests...`,
            success: (data: { count: number }) => {
                setSelectedIds([]);
                setPage(1); // Reset to first page to see updates
                return `Successfully processed ${data.count} requests`;
            },
            error: (err: { message?: string }) => err.message || "Failed to process requests"
        });
    };

    const handleRowAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        const promise = bulkProcessRequests([id], action);
        toast.promise(promise, {
            loading: `Processing request...`,
            success: () => {
                fetchRequests();
                return `Request ${action.toLowerCase()}d successfully`;
            },
            error: (err: { message?: string }) => err.message || "Failed to process request"
        });
    };

    const handleExport = async () => {
        const toastId = toast.loading("Generating export...");
        try {
            const result = await exportCompanyRequests(slug);
            const blob = new Blob([result.csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Download started", { id: toastId });
        } catch {
            toast.error("Export failed", { id: toastId });
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
            case 'CANCELLED': return 'bg-slate-50 text-slate-700 ring-1 ring-slate-100';
            case 'PENDING_COMPANY_APPROVAL': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
            case 'APPROVED': return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100';
            case 'PENDING_AGENT_ACTION': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 animate-pulse-subtle';
            default: return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm ring-1 ring-gray-100/50">
                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            placeholder="Search requests or employees..."
                            className="pl-12 h-12 rounded-2xl border-gray-100 focus:ring-indigo-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-12 px-4 rounded-2xl border-gray-100 bg-gray-50 text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING_COMPANY_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                            <Button
                                onClick={() => handleBulkAction('APPROVE')}
                                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 font-black uppercase tracking-widest text-xs"
                            >
                                Approve ({selectedIds.length})
                            </Button>
                            <Button
                                onClick={() => handleBulkAction('REJECT')}
                                variant="outline"
                                className="h-12 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl px-6 font-black uppercase tracking-widest text-xs"
                            >
                                Reject
                            </Button>
                        </div>
                    )}
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="h-12 w-12 rounded-2xl border-gray-100 p-0 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                        <Download size={18} />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden ring-1 ring-gray-100/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="p-6 w-14">
                                    <Checkbox
                                        checked={selectedIds.length === requests.length && requests.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        className="rounded-md border-gray-300"
                                    />
                                </th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Details</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Budget</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={32} />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading data...</p>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Ship size={32} className="text-gray-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">No requests found</h3>
                                        <p className="text-gray-400 text-sm italic">Try adjusting your filters or search terms.</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr
                                        key={req.id}
                                        className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/company/${slug}/dashboard/requests/${req.id}`)}
                                    >
                                        <td className="p-6" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(req.id)}
                                                onCheckedChange={() => toggleSelect(req.id)}
                                                className="rounded-md border-gray-300"
                                            />
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform overflow-hidden ring-2 ring-white">
                                                    {req.userAvatar ? (
                                                        <Image src={req.userAvatar} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-black text-lg">{req.userName[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{req.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{req.userName}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{req.destination}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <Badge className={cn(
                                                "rounded-full px-3 py-1 font-black text-[9px] border-none shadow-sm uppercase tracking-widest",
                                                getStatusStyles(req.status)
                                            )}>
                                                {req.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-6 text-right">
                                            {req.cost ? (
                                                <>
                                                    <p className="font-black text-gray-900">{req.currency} {req.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total Cost</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-black text-gray-900">{req.currency} {req.budget.toLocaleString()}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Est. Spend</p>
                                                </>
                                            )}
                                        </td>
                                        <td className="p-6 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="icon" variant="ghost" asChild className="rounded-xl hover:bg-indigo-50 hover:text-indigo-600">
                                                    <Link href={`/company/${slug}/dashboard/requests/${req.id}`}>
                                                        <Eye size={18} />
                                                    </Link>
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="rounded-xl">
                                                            <MoreHorizontal size={18} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl ring-1 ring-gray-100">
                                                        <DropdownMenuLabel className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Quick Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleRowAction(req.id, 'APPROVE')}
                                                            className="rounded-xl focus:bg-indigo-50 focus:text-indigo-600 px-3 py-2 font-bold text-sm cursor-pointer"
                                                        >
                                                            Quick Approve
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleRowAction(req.id, 'REJECT')}
                                                            className="rounded-xl focus:bg-rose-50 focus:text-rose-600 px-3 py-2 font-bold text-sm cursor-pointer border-t border-gray-50 mt-1"
                                                        >
                                                            Reject Request
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400">
                        Showing <span className="text-gray-900">{requests.length}</span> of <span className="text-gray-900">{total}</span> total requests
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page === 1 || isLoading}
                            onClick={() => setPage(page - 1)}
                            className="rounded-xl h-10 w-10 border-gray-100"
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <Button
                                        key={p}
                                        variant={page === p ? "default" : "outline"}
                                        onClick={() => setPage(p)}
                                        className={`h-10 w-10 rounded-xl font-bold text-xs ${page === p ? 'bg-indigo-600 shadow-lg shadow-indigo-200 border-none' : 'border-gray-100'}`}
                                    >
                                        {p}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page === totalPages || isLoading}
                            onClick={() => setPage(page + 1)}
                            className="rounded-xl h-10 w-10 border-gray-100"
                        >
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
