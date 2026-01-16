"use client";

import {
    Activity,
    CheckCircle2,
    XCircle,
    UserPlus,
    FileText,
    Settings,
    ShieldAlert,
    Clock,
    Search,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/utils/export";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCompanyActivities } from "./actions";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icon mapping based on action type
const getActionIcon = (action: string) => {
    if (action.includes("APPROVED")) return { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" };
    if (action.includes("REJECTED")) return { icon: XCircle, color: "text-rose-600 bg-rose-50" };
    if (action.includes("REGISTERED") || action.includes("USER")) return { icon: UserPlus, color: "text-indigo-600 bg-indigo-50" };
    if (action.includes("POLICY")) return { icon: ShieldAlert, color: "text-amber-600 bg-amber-50" };
    if (action.includes("INVOICE") || action.includes("PAYMENT")) return { icon: FileText, color: "text-blue-600 bg-blue-50" };
    if (action.includes("SETTINGS")) return { icon: Settings, color: "text-gray-600 bg-gray-50" };
    return { icon: Activity, color: "text-gray-600 bg-gray-50" };
};

interface ActivityLog {
    id: string;
    action: string;
    description: string;
    createdAt: Date;
    actor?: {
        name: string | null;
        email: string;
    } | null;
    target?: {
        name: string | null;
        email: string;
    } | null;
    metadata?: unknown;
}

export default function ActivityLogPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDays, setFilterDays] = useState<number | undefined>(30); // Default to 30 days
    const [searchQuery, setSearchQuery] = useState("");

    const fetchActivities = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const data = await getCompanyActivities(slug, {
                days: filterDays,
                search: searchQuery
            });
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities:", error);
        } finally {
            setLoading(false);
        }
    }, [slug, filterDays, searchQuery]);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchActivities();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchActivities]);

    const handleExport = () => {
        if (!activities.length) return;

        const exportData = activities.map(act => ({
            'Date': format(new Date(act.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            'Action': act.action,
            'Description': act.description,
            'Actor': act.actor?.name || act.actor?.email || 'System',
            'Target': act.target?.name || act.target?.email || '-',
            'Metadata': act.metadata ? JSON.stringify(act.metadata) : ''
        }));

        exportToCSV(exportData, `audit_log_${slug}_${format(new Date(), 'yyyy-MM-dd')}`);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-600" size={32} />
                        Activity Log
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Comprehensive audit trail of all company events and actions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search activity..."
                            className="pl-9 h-10 w-64 rounded-corner-md border-gray-200"
                        />
                    </div>

                    <Button
                        variant="outline"
                        className="h-10 w-10 p-0 rounded-corner-md border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                        onClick={handleExport}
                        title="Export CSV"
                        disabled={loading || activities.length === 0}
                    >
                        <Download size={16} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={`h-10 rounded-corner-md border-gray-200 font-bold ${filterDays ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-gray-600'}`}>
                                <Clock size={16} className="mr-2" />
                                {filterDays ? `Last ${filterDays} Days` : 'All Time'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-corner-sm">
                            <DropdownMenuItem onClick={() => setFilterDays(7)}>Last 7 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterDays(30)}>Last 30 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterDays(90)}>Last 3 Months</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterDays(undefined)}>All Time</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-indigo-100/20 rounded-corner-xl overflow-hidden bg-white ring-1 ring-gray-100">
                <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-black text-gray-900 uppercase tracking-widest">Recent Events</CardTitle>
                        <Badge variant="secondary" className="bg-white text-gray-500 border border-gray-100 font-mono text-xs">
                            {loading ? "..." : activities.length} Events
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                        {activities.map((activity) => {
                            const { icon: Icon, color } = getActionIcon(activity.action);
                            return (
                                <div key={activity.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6 group">
                                    <div className={`w-12 h-12 rounded-corner-lg flex items-center justify-center shrink-0 shadow-sm ${color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-black text-gray-900 truncate">
                                                {activity.description}
                                            </p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-corner-sm">
                                                {format(new Date(activity.createdAt), "MMM dd, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-gray-500 flex items-center gap-1 flex-wrap">
                                            <span className="text-gray-400">by</span>
                                            <span className="font-bold text-gray-700">{activity.actor?.name || activity.actor?.email || "System"}</span>

                                            {activity.target && (
                                                <>
                                                    <span className="text-gray-400 mx-1">→</span>
                                                    <span className="font-bold text-gray-700">{activity.target.name || activity.target.email}</span>
                                                </>
                                            )}

                                            {!!activity.metadata && typeof activity.metadata === 'object' && Object.keys(activity.metadata as Record<string, unknown>).length > 0 && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                                                    <span className="italic truncate max-w-[300px]">
                                                        {Object.values(activity.metadata as Record<string, unknown>).join(", ")}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {!loading && activities.length === 0 && (
                        <div className="p-20 text-center text-gray-400">
                            <p className="text-sm font-bold">No activity recorded found.</p>
                            {searchQuery && <p className="text-xs mt-2">Try adjusting your filters.</p>}
                        </div>
                    )}
                    {loading && (
                        <div className="p-20 text-center text-gray-400 animate-pulse">
                            <p className="text-sm font-bold">Loading activity log...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
