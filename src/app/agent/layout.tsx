
import Link from "next/link";
import { Building2 } from "lucide-react";
import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { AgencyNav } from "./_components/agency-nav";
import { redirect } from "next/navigation";

export default async function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "TRAVEL_AGENT") {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen bg-[#FAFAFB]">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-sm z-50">
                <div className="p-8">
                    <Link href="/agent/dashboard" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                            <Building2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display text-lg font-bold tracking-tight text-gray-900 leading-none">
                                Travyntra
                            </span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                                Agency Portal
                            </span>
                        </div>
                    </Link>
                </div>

                <AgencyNav />

                <div className="p-6 border-t border-gray-50 bg-gray-50/30 font-medium">
                    <p className="text-[10px] text-gray-400 text-center">
                        Agency Console | Fulfillment Partner
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-72">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workspace</span>
                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">
                            {session.user.companySlug || "Agency"}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu />
                    </div>
                </header>

                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
