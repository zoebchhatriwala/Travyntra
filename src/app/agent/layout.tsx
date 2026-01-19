


import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { AgencyNav } from "./_components/agency-nav";
import { SidebarLayout, SidebarBrand } from "@/components/layout/sidebar-layout";
import { Logo } from "@/components/ui/logo";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SupportPlanCard } from "@/components/layout/support-plan-card";

export default async function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const allowedRoles = ["TRAVEL_AGENT", "AGENCY_EMPLOYEE"];
    if (!allowedRoles.includes(session.user.role)) {
        redirect("/");
    }

    const company = await prisma.company.findUnique({
        where: { id: session.user.companyId! },
        select: { plan: true, slug: true }
    });

    return (
        <SidebarLayout
            sidebarContent={<AgencyNav />}
            sidebarFooter={
                <SupportPlanCard
                    slug={company?.slug}
                    companyPlan={company?.plan}
                    type="AGENCY"
                />
            }
            brandContent={
                <SidebarBrand
                    href="/agent/dashboard"
                    title="Travyntra"
                    subtitle="Agency Portal"
                    logo={<Logo />}
                />
            }
            userMenu={<UserMenu />}
            notificationBell={<NotificationBell />}
            headerTitle={(
                <>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">Workspace</span>
                    <div className="h-1 w-1 rounded-full bg-gray-300 hidden sm:block" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">
                        {company?.slug || "Agency"}
                    </span>
                </>
            )}
            footerContent="Agency Console | Fulfillment Partner"
        >
            {children}
        </SidebarLayout>
    );
}
