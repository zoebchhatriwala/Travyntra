
import { Building2 } from "lucide-react";
import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { EmployeeNav } from "./_components/employee-nav";
import { CompanyNav } from "../admin/_components/company-nav";
import { SidebarLayout, SidebarBrand } from "@/components/layout/sidebar-layout";

export default async function EmployeeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "COMPANY_ADMIN" || session?.user?.role === "SUPER_ADMIN";

    return (
        <SidebarLayout
            sidebarContent={isAdmin ? <CompanyNav slug={slug} /> : <EmployeeNav slug={slug} />}
            brandContent={
                <SidebarBrand
                    href={isAdmin ? `/company/${slug}/admin` : `/company/${slug}/dashboard`}
                    title="Travyntra"
                    subtitle={isAdmin ? "Company Admin" : "Staff Portal"}
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
            footerContent={isAdmin ? "Admin Console | Elevated Access" : "Need help? Contact an approver."}
        >
            {children}
        </SidebarLayout>
    );
}
