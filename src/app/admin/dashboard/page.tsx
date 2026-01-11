import { getPendingEntities, getGlobalStats } from "./actions";
import { PendingList } from "./_components/pending-list";
import { Card, CardContent } from "@/components/ui/card";
import {
    Users,
    Building2,
    Ship,
    CheckCircle2,
    Activity,
    LayoutDashboard
} from "lucide-react";

export const metadata = {
    title: "Super Admin Dashboard | Travyntra",
};

export default async function AdminDashboardPage() {
    const { agents, companies } = await getPendingEntities();
    const stats = await getGlobalStats();

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            {/* Header section with glass effect */}
            <div className="bg-white border-b border-gray-100">
                <div className="container mx-auto py-8 px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <LayoutDashboard size={20} />
                                </div>
                                <span className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Control Center</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Super Admin Portal</h1>
                            <p className="text-gray-500 mt-1 max-w-2xl">
                                Welcome back! Manage your travel infrastructure, verify partners, and monitor platform health.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-10 px-6 space-y-12">
                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Active Agencies"
                            value={stats.totalAgents}
                            icon={<Users className="text-blue-500" />}
                            gradient="bg-blue-50"
                            label="Verified Partners"
                        />
                        <StatCard
                            title="Companies"
                            value={stats.totalCompanies}
                            icon={<Building2 className="text-purple-500" />}
                            gradient="bg-purple-50"
                            label="Registered Companies"
                        />
                        <StatCard
                            title="Total Requests"
                            value={stats.totalRequests}
                            icon={<Ship className="text-amber-500" />}
                            gradient="bg-amber-50"
                            label="Journeys Planned"
                        />
                        <StatCard
                            title="System Health"
                            value={`${stats.platformHealth}%`}
                            icon={<Activity className="text-emerald-500" />}
                            gradient="bg-emerald-50"
                            label="Uptime Performance"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Areas */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Agents Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Agency Verification Queue</h2>
                                </div>
                                <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                                    {agents.length} Pending
                                </div>
                            </div>
                            <PendingList
                                title="Agencies"
                                description="Review and approve agencies wanting to join the platform."
                                users={agents}
                                type="AGENT"
                                accentColor="blue"
                            />
                        </section>

                        {/* Companies Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-8 bg-purple-500 rounded-full" />
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Company Activation</h2>
                                </div>
                                <div className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold border border-purple-100">
                                    {companies.length} Pending
                                </div>
                            </div>
                            <PendingList
                                title="Company Admins"
                                description="Verify organizations and activate their exclusive corporate portals."
                                users={companies}
                                type="COMPANY"
                                accentColor="purple"
                            />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, gradient, label }: { title: string, value: string | number, icon: React.ReactNode, gradient: string, label: string }) {
    return (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${gradient} transition-transform group-hover:scale-110`}>
                        {icon}
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                </div>
            </CardContent>
        </Card>
    );
}

