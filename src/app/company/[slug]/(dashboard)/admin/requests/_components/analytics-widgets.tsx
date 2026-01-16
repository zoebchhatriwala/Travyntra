"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    Clock,
    TrendingUp,
    MapPin,
    AlertCircle,
    ArrowUpRight,
    LucideIcon
} from "lucide-react";


interface AnalyticsWidgetsProps {
    analytics: {
        avgApprovalTime: string;
        mtdBudget: number;
        mtdCost: number;
        violations: number;
        budgetByMonth: unknown[];
        topDestinations: { name: string, count: number }[];
        currency?: string;
    } | null;
}

export function AnalyticsWidgets({ analytics }: AnalyticsWidgetsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <AnalyticsCard
                title="Avg. Approval Time"
                value={`${analytics?.avgApprovalTime || "0.0"} Days`}
                subtitle="Approval cycle"
                icon={Clock}
                color="indigo"
            />
            <AnalyticsCard
                title="Total Budget (MTD)"
                value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: analytics?.currency || "USD",
                    maximumFractionDigits: 0
                }).format(analytics?.mtdBudget || 0)}
                subtitle="Current month"
                icon={TrendingUp}
                color="emerald"
            />
            <AnalyticsCard
                title="Total Cost (MTD)"
                value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: analytics?.currency || "USD",
                    maximumFractionDigits: 0
                }).format(analytics?.mtdCost || 0)}
                subtitle="Booked amount"
                icon={TrendingUp}
                color="blue"
            />
            <AnalyticsCard
                title="Top Destination"
                value={analytics?.topDestinations?.[0]?.name || "None"}
                subtitle={`${analytics?.topDestinations?.[0]?.count || 0} bookings`}
                icon={MapPin}
                color="amber"
            />
            <AnalyticsCard
                title="Policy Violations"
                value={String(analytics?.violations || 0)}
                subtitle={analytics?.violations === 0 ? "All clear" : `${analytics?.violations || 0} flagged`}
                icon={AlertCircle}
                color="rose"
            />
        </div>
    );
}

function AnalyticsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color
}: {
    title: string,
    value: string,
    subtitle: string,
    icon: LucideIcon,
    trend?: 'up' | 'down',
    color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue'
}) {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
        amber: "bg-amber-50 text-amber-600 ring-amber-100",
        rose: "bg-rose-50 text-rose-600 ring-rose-100",
        blue: "bg-blue-50 text-blue-600 ring-blue-100"
    };

    return (
        <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden group hover:ring-indigo-200 transition-all duration-300">
            <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-corner-lg ${colors[color]} group-hover:scale-110 transition-transform`}>
                        <Icon size={24} />
                    </div>
                    <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <ArrowUpRight size={20} />
                    </button>
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
                    <p className="text-3xl font-black text-gray-900 group-hover:translate-x-1 transition-transform inline-block">{value}</p>
                    <div className="mt-4 flex items-center gap-2">
                        {trend && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {trend === 'up' ? '▲' : '▼'} 10%
                            </span>
                        )}
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter opacity-60 italic">
                            {subtitle}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
