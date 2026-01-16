
import { getBudgetAnalytics } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Financial Analytics",
    description: "Analyze corporate travel spending and budget trends.",
};

export default async function AnalyticsPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    const data = await getBudgetAnalytics(slug);

    const totalBudget = data.chartData.reduce((acc, curr) => acc + curr.budget, 0);
    const utilization = totalBudget > 0 ? (data.totalSpend / totalBudget) * 100 : 0;
    const maxVal = Math.max(
        ...data.chartData.map(d => Math.max(d.actual, d.budget))
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Financial Analytics
                </h1>
                <p className="text-gray-500 font-medium">
                    Spending trends and budget utilization for the last 12 months.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Spend (12m)"
                    value={data.totalSpend}
                    currency={data.currency}
                    icon={<Wallet className="text-emerald-600" />}
                    color="bg-emerald-50"
                    trend={totalBudget > 0 && data.totalSpend > totalBudget ? "Over Budget" : "Within Budget"}
                    trendUp={totalBudget > 0 && data.totalSpend > totalBudget}
                />
                <StatCard
                    title="Avg. Trip Cost"
                    value={data.avgTripCost}
                    currency={data.currency}
                    icon={<DollarSign className="text-blue-600" />}
                    color="bg-blue-50"
                    trend="Per completed trip"
                />
                <StatCard
                    title="Budget Utilization"
                    value={utilization}
                    isPercentage
                    icon={<TrendingUp className="text-purple-600" />}
                    color="bg-purple-50"
                    trend={`${totalBudget.toLocaleString()} ${data.currency} Estimated`}
                />
            </div>

            {/* Chart Section */}
            <Card className="border-none shadow-joy rounded-corner-xl bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-gray-50">
                    <CardTitle className="text-xl font-black text-gray-900">
                        Budget vs. Actual Spend
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[400px] w-full flex items-end justify-between gap-2 sm:gap-4">
                        {data.chartData.map((item, i) => {
                            const actualHeight = maxVal > 0 ? (item.actual / maxVal) * 100 : 0;
                            const budgetHeight = maxVal > 0 ? (item.budget / maxVal) * 100 : 0;

                            return (
                                <div key={i} className="group relative flex-1 h-full flex flex-col justify-end gap-1">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48 bg-gray-900 text-white p-3 rounded-corner-md shadow-xl text-xs">
                                        <p className="font-bold mb-1 border-b border-gray-700 pb-1">{item.month}</p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-emerald-300">Actual:</span>
                                                <span className="font-mono">{data.currency} {item.actual.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-purple-300">Budget:</span>
                                                <span className="font-mono">{data.currency} {item.budget.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bars */}
                                    <div className="flex gap-1 items-end h-full w-full justify-center px-1 md:px-2 bg-gray-50/50 rounded-t-lg pt-4 hover:bg-gray-100 transition-colors">
                                        <div
                                            style={{ height: `${Math.max(budgetHeight, 1)}%` }}
                                            className="w-full max-w-[20px] bg-purple-200 rounded-t-sm transition-all group-hover:bg-purple-300"
                                        />
                                        <div
                                            style={{ height: `${Math.max(actualHeight, 1)}%` }}
                                            className="w-full max-w-[20px] bg-emerald-400 rounded-t-sm transition-all group-hover:bg-emerald-500 shadow-sm"
                                        />
                                    </div>

                                    {/* Label */}
                                    <p className="text-[10px] text-gray-400 font-bold uppercase text-center truncate w-full mt-2">
                                        {item.month.split(' ')[0]}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-8 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                            <span className="text-sm font-bold text-gray-600">Actual Spend</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-200 rounded-full" />
                            <span className="text-sm font-bold text-gray-600">Estimated Budget</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    title,
    value,
    currency,
    isPercentage,
    icon,
    color,
    trend,
    trendUp
}: {
    title: string,
    value: number,
    currency?: string,
    isPercentage?: boolean,
    icon: React.ReactNode,
    color: string,
    trend: string,
    trendUp?: boolean
}) {
    return (
        <Card className="border-none shadow-joy rounded-corner-xl bg-white">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-corner-lg transition-transform hover:scale-110", color)}>
                        {icon}
                    </div>
                    {trendUp !== undefined && (
                        <div className={cn(
                            "flex items-center text-xs font-bold px-2 py-1 rounded-corner-md",
                            trendUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                            {trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                            {trendUp ? "High" : "Good"}
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
                    <p className="text-3xl font-black text-gray-900 tracking-tight">
                        {isPercentage
                            ? `${value.toFixed(1)}%`
                            : `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        }
                    </p>
                    <p className="text-xs font-bold text-gray-400 mt-2 opacity-80">
                        {trend}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
