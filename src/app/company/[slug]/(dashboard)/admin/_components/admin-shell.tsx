"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CompanyNav } from "./company-nav";
import { SidebarLayout, SidebarBrand, useSidebar } from "@/components/layout/sidebar-layout";

interface AdminShellProps {
    children: React.ReactNode;
    slug: string;
    companyPlan?: string | null;
}

function SupportPlanCard({ companyPlan }: { companyPlan?: string | null }) {
    const { isCollapsed } = useSidebar();

    if (isCollapsed) {
        return (
            <div className="flex justify-center py-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600" title="Values Plan">
                    <span className="text-xs font-bold">
                        {companyPlan === 'FREE' ? 'F' : companyPlan === 'STARTER' ? 'S' : 'E'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 relative overflow-hidden w-full">
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
    );
}

export function AdminShell({ children, slug, companyPlan }: AdminShellProps) {
    return (
        <SidebarLayout
            sidebarContent={<CompanyNav slug={slug} />}
            sidebarFooter={<SupportPlanCard companyPlan={companyPlan} />}
            brandContent={
                <SidebarBrand
                    href={`/company/${slug}/admin`}
                    title="Travyntra"
                    subtitle="Company Admin"
                    logo={
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Building2 size={24} />
                        </div>
                    }
                />
            }
            userMenu={<UserMenu />}
            notificationBell={<NotificationBell />}
            headerTitle={(
                <>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">Workspace</span>
                    <div className="h-1 w-1 rounded-full bg-gray-300 hidden sm:block" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{slug}</span>
                </>
            )}
        >
            {children}
        </SidebarLayout>
    );
}
