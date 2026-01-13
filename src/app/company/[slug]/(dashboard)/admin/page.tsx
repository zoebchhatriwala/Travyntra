import Image from "next/image";
import { getCompanyDashboardStats } from "./actions";
import {
    Users,
    Ship,
    Clock,
    TrendingUp,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    Building2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";



export default async function CompanyAdminPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const stats = await getCompanyDashboardStats(slug, session?.user?.id);

    if (!stats) return <div>Company not found</div>;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Console / <span className="text-indigo-600 uppercase">{slug}</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Manage your corporate workspace, approve staff, and oversee travel operations.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Staff"
                    value={stats.totalStaff}
                    change="Global Directory"
                    icon={<Users className="text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Staff Verification"
                    value={stats.pendingStaff}
                    change={stats.pendingStaff > 0 ? "Action Required" : "All Verified"}
                    icon={<Clock className="text-amber-600" />}
                    color="bg-amber-50"
                    isAlert={stats.pendingStaff > 0}
                    href={`/company/${slug}/admin/staff`}
                />
                <StatCard
                    title="My Approvals"
                    value={stats.pendingApprovalsCount}
                    change={stats.pendingApprovalsCount > 0 ? "Pending Action" : "Up to Date"}
                    icon={<CheckCircle2 className="text-indigo-600" />}
                    color="bg-indigo-50"
                    isAlert={stats.pendingApprovalsCount > 0}
                    href={`/company/${slug}/admin/approvals`}
                />
                <StatCard
                    title="Live Requests"
                    value={stats.activeRequests}
                    change="In Progress"
                    icon={<Ship className="text-purple-600" />}
                    color="bg-purple-50"
                />
                <StatCard
                    title="Monthly Spend"
                    value={`${stats.currency} ${stats.totalSpend.toLocaleString()}`}
                    change="Completed Value"
                    icon={<TrendingUp className="text-emerald-600" />}
                    color="bg-emerald-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Areas */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Recent Activity */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-900">Recent Trip Requests</h3>
                                <Button variant="ghost" asChild className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                    <Link href={`/company/${slug}/admin/workflow`}>
                                        View All <ArrowUpRight size={14} className="ml-1" />
                                    </Link>
                                </Button>
                            </div>

                            {stats.recentRequests.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-[24px] border-2 border-dashed border-gray-100">
                                    <Ship size={40} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No active requests found</p>
                                    <p className="text-gray-300 text-[10px] mt-1 italic leading-relaxed">Staff requests awaiting approval will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stats.recentRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm ring-1 ring-gray-100 group-hover:scale-110 transition-transform overflow-hidden">
                                                    {req.userAvatar ? (
                                                        <Image src={req.userAvatar} alt={req.userName} width={40} height={40} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Ship size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 leading-none">{req.title}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{req.userName} • {format(new Date(req.createdAt), 'MMM dd, yyyy')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs font-black text-gray-900">{req.currency} {req.budget.toLocaleString()}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Budget</p>
                                                </div>
                                                <Badge className={`rounded-lg px-2 py-0.5 font-bold text-[9px] border-none ${req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                    req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {req.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ActionCard
                            title="Approval Workflow"
                            desc="Configure the chain of command for journey approvals."
                            icon={<CheckCircle2 className="text-indigo-600" />}
                            href={`/company/${slug}/admin/workflow`}
                        />
                        <ActionCard
                            title="Domain Setup"
                            desc="Verify corporate domains for automatic staff association."
                            icon={<Building2 className="text-indigo-600" />}
                            href={`/company/${slug}/admin/settings`}
                        />
                    </div>
                </div>

                {/* Sidebar Areas */}
                <div className="space-y-8">
                    {/* Pending Verification Module */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] bg-white overflow-hidden">
                        <CardContent className="p-8">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                <AlertCircle size={20} className="text-amber-500" /> Vetting Queue
                            </h3>
                            {stats.pendingStaff === 0 ? (
                                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest leading-none">All clear</p>
                                    <p className="text-[10px] font-bold text-emerald-600 mt-2 opacity-80 leading-relaxed">No staff registrations pending verification.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-gray-400 leading-relaxed">
                                        There are <span className="text-amber-600 font-black">{stats.pendingStaff}</span> staff members awaiting portal access.
                                    </p>
                                    <Button asChild className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02]">
                                        <Link href={`/company/${slug}/admin/staff`}>
                                            Manage Queue
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, icon, color, isAlert, href }: { title: string, value: string | number, change: string, icon: React.ReactNode, color: string, isAlert?: boolean, href?: string }) {
    const content = (
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {isAlert && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
                <p className="text-3xl font-black text-gray-900">{value}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-2 flex items-center gap-1 opacity-60 italic">
                    {change}
                </p>
            </div>
        </CardContent>
    );

    return (
        <Card className={`border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden group hover:ring-indigo-100 transition-all duration-300 ${href ? 'cursor-pointer' : ''}`}>
            {href ? <Link href={href}>{content}</Link> : content}
        </Card>
    );
}


function ActionCard({ title, desc, icon, href }: { title: string, desc: string, icon: React.ReactNode, href: string }) {
    return (
        <Link href={href}>
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] hover:ring-indigo-200 transition-all cursor-pointer group h-full">
                <CardContent className="p-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <h4 className="text-lg font-black text-gray-900 mb-2 leading-none">{title}</h4>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed italic">{desc}</p>
                </CardContent>
            </Card>
        </Link>
    );
}
