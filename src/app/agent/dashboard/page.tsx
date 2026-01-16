
import { getAgencyStats, getRecentOpportunities } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Briefcase, FileCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@prisma/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { type LocationDisplay as Location } from "@/types/common/location";

export default async function AgencyDashboard() {
    const session = await getServerSession(authOptions);
    const stats = await getAgencyStats();
    const opportunities = await getRecentOpportunities();

    const isEmployee = session?.user?.role === UserRole.AGENCY_EMPLOYEE;

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {!isEmployee && (
                    <>
                        <StatsCard
                            title="Open Opportunities"
                            value={stats.openOpportunities}
                            icon={Bell}
                            description="Requests waiting for bids"
                        />
                        <StatsCard
                            title="Active Bids"
                            value={stats.activeBids}
                            icon={TrendingUp}
                            description="Pending company response"
                        />
                    </>
                )}
                <StatsCard
                    title="To Fulfill"
                    value={stats.pendingFulfillment}
                    icon={Briefcase}
                    description="Assigned trips needing action"
                />
                {!isEmployee && (
                    <StatsCard
                        title="Total Revenue"
                        value={`${stats.currency} ${stats.totalRevenue}`}
                        icon={FileCheck}
                        description="Year to date"
                    />
                )}
            </div>

            {/* Recent Opportunities Section */}
            {!isEmployee && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Opportunities</h2>
                        <Link href="/agent/bids" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                            View all
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {opportunities.length === 0 ? (
                            <div className="col-span-full p-8 text-center bg-white rounded-lg border border-dashed border-gray-300">
                                <p className="text-gray-500">No new opportunities available at the moment.</p>
                            </div>
                        ) : (
                            opportunities.map((req) => (
                                <Link key={req.id} href={`/agent/bids/${req.id}`} className="block group">
                                    <Card className="h-full hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium truncate pr-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="truncate block">
                                                            {(req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown"}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{(req.destination as unknown as Location)?.city || (req.destination as unknown as Location)?.formatted || "Unknown"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </CardTitle>
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {req.company.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold truncate">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="truncate block">{req.title}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{req.title}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {req.user.name} • {req.company.name}
                                            </p>
                                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                    Active
                                                </span>
                                                <span>
                                                    Posted {formatDistanceToNow(req.updatedAt)} ago
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description: string;
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
