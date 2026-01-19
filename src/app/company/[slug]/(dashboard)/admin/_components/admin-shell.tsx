"use client";

import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CompanyNav } from "./company-nav";
import { SidebarLayout, SidebarBrand } from "@/components/layout/sidebar-layout";
import { Logo } from "@/components/ui/logo";

import { SupportPlanCard } from "@/components/layout/support-plan-card";
import { SubscriptionPlan } from "@prisma/client";

interface AdminShellProps {
    children: React.ReactNode;
    slug: string;
    companyPlan?: SubscriptionPlan | string | null;
}

export function AdminShell({ children, slug, companyPlan }: AdminShellProps) {
    return (
        <SidebarLayout
            sidebarContent={<CompanyNav slug={slug} />}
            sidebarFooter={<SupportPlanCard
                slug={slug}
                companyPlan={companyPlan}
                type="COMPANY"
            />}
            brandContent={
                <SidebarBrand
                    href={`/company/${slug}/admin`}
                    title="Travyntra"
                    subtitle="Company Admin"
                    logo={<Logo />}
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
