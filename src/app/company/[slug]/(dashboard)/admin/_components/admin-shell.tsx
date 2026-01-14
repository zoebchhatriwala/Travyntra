"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CompanyNav } from "./company-nav";
import { cn } from "@/lib/utils";

interface AdminShellProps {
    children: React.ReactNode;
    slug: string;
    companyPlan?: string | null;
}

export function AdminShell({ children, slug, companyPlan }: AdminShellProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="flex min-h-screen bg-[#FAFAFB]">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-sm z-50 transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-72"
                )}
            >
                {/* Sidebar Header */}
                <div className={cn("flex items-center", isCollapsed ? "justify-center p-4" : "p-8 justify-between")}>
                    <Link href={`/company/${slug}/admin`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform flex-shrink-0">
                            <Building2 size={24} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-display text-lg font-bold tracking-tight text-gray-900 leading-none truncate">
                                    Travyntra
                                </span>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 truncate">
                                    Company Admin
                                </span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <CompanyNav slug={slug} isCollapsed={isCollapsed} />

                {/* Sidebar Footer / Support Card */}
                {!isCollapsed ? (
                    <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                        <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Support Plan</p>
                            <p className="text-sm font-bold mb-3">
                                {companyPlan === 'FREE' ? 'Free Tier' :
                                    companyPlan === 'STARTER' ? 'Business Starter' :
                                        companyPlan === 'ENTERPRISE' ? 'Enterprise Gold' : 'Corporate Plan'}
                            </p>
                            {companyPlan === 'FREE' ? (
                                <Link
                                    href="mailto:sales@travyntra.com"
                                    className="block w-full py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase text-center hover:bg-gray-50 transition-colors"
                                >
                                    Upgrade Tier
                                </Link>
                            ) : (
                                <button className="w-full py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-colors">
                                    View Billing
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600" title="Values Plan">
                            <span className="text-xs font-bold">
                                {companyPlan === 'FREE' ? 'F' : companyPlan === 'STARTER' ? 'S' : 'E'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Collapse Toggle - Absolute Positioned or part of footer */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm z-50 hover:scale-110 transition-all"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </aside>

            {/* Main Content Wrapper */}
            <div
                className={cn(
                    "flex-1 transition-all duration-300 ease-in-out",
                    isCollapsed ? "ml-20" : "ml-72"
                )}
            >
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workspace</span>
                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{slug}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu />
                    </div>
                </header>

                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
