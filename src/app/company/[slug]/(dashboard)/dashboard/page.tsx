
import { getEmployeeDashboardStats } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Plane, Clock, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getStatusColor } from "@/lib/utils";

export default async function EmployeeDashboardPage({
    params
}: {
    params: { slug: string }
}) {
    const { slug } = await params;
    const stats = await getEmployeeDashboardStats();

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        Welcome back, {stats?.userName?.split(' ')[0] || 'Traveler'}!
                    </h1>
                    <p className="text-gray-500 font-medium">
                        Ready for your next adventure?
                    </p>
                </div>
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105" asChild>
                    <Link href={`/company/${slug}/dashboard/requests/new`}>
                        <Plus className="mr-2 h-5 w-5" />
                        New Trip Request
                    </Link>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Requests */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] bg-blue-50/50">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Plane size={24} />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-gray-900">{stats?.activeRequests || 0}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Requests</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Completed Trips */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] bg-emerald-50/50">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-gray-900">{stats?.completedTrips || 0}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Completed Trips</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Action / Asset Vault */}
                <Link href={`/company/${slug}/dashboard/assets`}>
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] bg-white hover:ring-indigo-200 transition-all cursor-pointer h-full group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">Asset Vault</h3>
                                    <p className="text-xs text-gray-400 font-medium">Access Tickets & Visas</p>
                                </div>
                            </div>
                            <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Requests Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900">Recent Requests</h3>
                    <Button variant="ghost" asChild className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50">
                        <Link href={`/company/${slug}/dashboard/requests`}>
                            View All <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </Button>
                </div>

                {stats?.recentRequests && stats.recentRequests.length > 0 ? (
                    <div className="grid gap-4">
                        {stats.recentRequests.map((req) => (
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
                                        {req.budget > 0 && (
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-black text-gray-900">{req.currency} {req.budget.toLocaleString()}</p>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Est. Budget</p>
                                            </div>
                                        )}
                                        <Badge className={cn("rounded-xl px-3 py-1 font-bold text-[10px] border-none", getStatusColor(req.status))}>
                                            {req.status}
                                        </Badge>
                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Plane size={24} className="text-gray-300" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">No requests yet</h3>
                        <p className="text-gray-400 text-xs max-w-xs mx-auto mb-6">Start your first journey by creating a new trip request.</p>
                        <Button className="bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200" asChild>
                            <Link href={`/company/${slug}/dashboard/requests/new`}>Create Request</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
