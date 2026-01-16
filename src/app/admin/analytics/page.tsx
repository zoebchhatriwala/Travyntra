
import { getAnalyticsData } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart3,
    TrendingUp,
    Users,
    Building2,
    Globe2,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Activity
} from "lucide-react";

export const metadata = {
    title: "Platform Analytics | Travyntra Admin",
};

export default async function AnalyticsPage() {
    const data = await getAnalyticsData();

    if (!data) {
        return (
            <div className="container mx-auto py-10 px-6">
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-corner-xl text-rose-700 font-medium">
                    Failed to load analytics data. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFB] pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <div className="container mx-auto py-8 px-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-corner-md text-indigo-600">
                            <BarChart3 size={20} />
                        </div>
                        <span className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Insight Engine</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Platform Analytics</h1>
                    <p className="text-gray-500 mt-1 max-w-2xl">
                        A real-time overview of global travel volume, company growth, and platform health.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 space-y-10">
                {/* Top Level KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total Requests"
                        value={data.totalRequests}
                        trend="+12.5%"
                        isUp={true}
                        icon={<TrendingUp className="text-indigo-600" />}
                        bgColor="bg-indigo-50"
                    />
                    <KpiCard
                        title="Companies"
                        value={data.stats.companies}
                        trend="+2"
                        isUp={true}
                        icon={<Building2 className="text-amber-600" />}
                        bgColor="bg-amber-50"
                    />
                    <KpiCard
                        title="Network Agencies"
                        value={data.stats.agents}
                        trend="+5.2%"
                        isUp={true}
                        icon={<Globe2 className="text-blue-600" />}
                        bgColor="bg-blue-50"
                    />
                    <KpiCard
                        title="Gross Volume"
                        value={`${(data.stats.totalBudget / 1000).toFixed(1)}k`}
                        trend="+8.1%"
                        isUp={true}
                        icon={<CreditCard className="text-emerald-600" />}
                        bgColor="bg-emerald-50"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Status Distribution */}
                    <Card className="lg:col-span-1 border-none shadow-sm rounded-corner-xl overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={18} className="text-indigo-600" />
                                <CardTitle className="text-lg">Request Pipeline</CardTitle>
                            </div>
                            <CardDescription>Distribution of trips across lifecycle stages.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {data.statusDistribution.length > 0 ? (
                                data.statusDistribution.map((item) => (
                                    <div key={item.status} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-600">{item.status.replace(/_/g, ' ')}</span>
                                            <span className="font-bold text-gray-900">{item.count}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full"
                                                style={{ width: `${(item.count / data.totalRequests) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-gray-400 text-sm italic">
                                    No request data available yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Volume Trends (Simplified CSS Chart) */}
                    <Card className="lg:col-span-2 border-none shadow-sm rounded-corner-xl overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={18} className="text-indigo-600" />
                                <CardTitle className="text-lg">Monthly Volume</CardTitle>
                            </div>
                            <CardDescription>Number of trip requests registered per month.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64 flex items-end justify-between gap-4 pt-10">
                            {data.monthlyRequests.length > 0 ? (
                                data.monthlyRequests.map((item) => {
                                    const maxCount = Math.max(...data.monthlyRequests.map(m => m.count));
                                    const height = (item.count / maxCount) * 100;
                                    return (
                                        <div key={item.month} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                                            <div className="relative w-full flex justify-center">
                                                <div
                                                    className="w-full max-w-[40px] bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors rounded-t-corner-md absolute bottom-0"
                                                    style={{ height: '100px' }}
                                                />
                                                <div
                                                    className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-corner-md transition-all duration-1000 group-hover:scale-y-[1.02] origin-bottom shadow-lg shadow-indigo-100"
                                                    style={{ height: `${Math.max(height * 2, 8)}px` }}
                                                >
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-corner-sm font-bold">
                                                        {item.count}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.month}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                                    Insufficient data to generate trends.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Spending by Category */}
                    <Card className="border-none shadow-sm rounded-corner-xl overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <PieChart size={18} className="text-indigo-600" />
                                <CardTitle className="text-lg">Expense Distribution</CardTitle>
                            </div>
                            <CardDescription>Breakdown of platform expenses by category.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-8 py-4">
                            <div className="space-y-4">
                                {data.categorySpending.map((item, idx) => (
                                    <div key={item.category} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full bg-indigo-${(idx + 3) * 100}`} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{item.category}</span>
                                            <span className="text-sm font-black text-gray-900">{item.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                                {data.categorySpending.length === 0 && (
                                    <div className="text-gray-400 text-sm italic">No expense data.</div>
                                )}
                            </div>
                            <div className="flex items-center justify-center relative">
                                <div className="w-32 h-32 rounded-full border-[12px] border-gray-50 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                                        <p className="text-sm font-black text-indigo-600">
                                            {data.categorySpending.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {/* Simple visual representation hack */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-32 rounded-full border-[12px] border-indigo-500 border-l-transparent border-b-transparent rotate-45" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active User Metrics */}
                    <Card className="border-none shadow-sm rounded-corner-xl overflow-hidden bg-gradient-to-br from-gray-900 to-slate-800 text-white">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Users size={18} className="text-indigo-400" />
                                <CardTitle className="text-lg text-white">Global User Base</CardTitle>
                            </div>
                            <CardDescription className="text-slate-400">Total verified users across all segments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-corner-lg border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/20 rounded-corner-md">
                                            <Building2 size={24} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Admins</p>
                                            <p className="text-2xl font-black">{data.stats.companies}</p>
                                        </div>
                                    </div>
                                    <TrendingUp size={20} className="text-indigo-400" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-corner-lg border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/20 rounded-corner-md">
                                            <Globe2 size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agencies</p>
                                            <p className="text-2xl font-black">{data.stats.agents}</p>
                                        </div>
                                    </div>
                                    <TrendingUp size={20} className="text-blue-400" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-corner-lg border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-500/20 rounded-corner-md">
                                            <Users size={24} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Staff</p>
                                            <p className="text-2xl font-black">{data.stats.employees}</p>
                                        </div>
                                    </div>
                                    <Activity size={20} className="text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, trend, isUp, icon, bgColor }: { title: string, value: string | number, trend: string, isUp: boolean, icon: React.ReactNode, bgColor: string }) {
    return (
        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-4 rounded-corner-lg ${bgColor} group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-corner-sm text-[10px] font-black uppercase ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trend}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em]">{title}</p>
                    <h3 className="text-3xl font-black text-gray-900">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}
