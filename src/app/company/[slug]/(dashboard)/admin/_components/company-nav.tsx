"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Settings,
    CreditCard,
    GitBranch,
    Activity,
    CheckCircle2,
    LucideIcon,
    Share2,
    Plane,
    Files,
    Home
} from "lucide-react";


interface NavLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

import { useSidebar } from "@/components/layout/sidebar-layout";

interface CompanyNavProps {
    slug: string;
}

export function CompanyNav({ slug }: CompanyNavProps) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();

    const companyLinks: NavLink[] = [
        { href: `/company/${slug}/admin`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/company/${slug}/admin/requests`, label: "All Trip Requests", icon: Activity },
        { href: `/company/${slug}/admin/staff`, label: "Staff Management", icon: Users },
        { href: `/company/${slug}/admin/workflow`, label: "Approval Workflow", icon: GitBranch },
        { href: `/company/${slug}/admin/activity`, label: "Activity Log", icon: Activity },
        { href: `/company/${slug}/admin/integrations`, label: "Integrations", icon: Share2 },
        { href: `/company/${slug}/admin/billing`, label: "Billing & Invoices", icon: CreditCard },
        { href: `/company/${slug}/admin/settings`, label: "Portal Settings", icon: Settings },
    ];

    const personalLinks: NavLink[] = [
        { href: `/company/${slug}/dashboard`, label: "Employee Dashboard", icon: Home },
        { href: `/company/${slug}/dashboard/requests`, label: "My Requests", icon: Plane },
        { href: `/company/${slug}/dashboard/approvals`, label: "My Approvals", icon: CheckCircle2 },
        { href: `/company/${slug}/dashboard/assets`, label: "Asset Vault", icon: Files },
    ];

    const renderLinks = (links: NavLink[]) => {
        return links.map((link) => {
            const isActive = pathname === link.href || (link.href !== `/company/${slug}/admin` && link.href !== `/company/${slug}/dashboard` && pathname.startsWith(link.href));

            return (
                <Link
                    key={link.href}
                    href={link.href}
                    title={isCollapsed ? link.label : undefined}
                    className={cn(
                        "flex items-center gap-4 py-2.5 rounded-corner-md text-xs font-semibold transition-all duration-200 group",
                        isActive
                            ? "text-indigo-600 bg-indigo-50 shadow-sm shadow-indigo-100/50"
                            : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/30",
                        isCollapsed ? "justify-center px-0" : "px-4"
                    )}
                >
                    <link.icon
                        size={18}
                        className={cn(
                            "transition-transform group-hover:scale-110",
                            isActive ? "scale-110" : ""
                        )}
                    />
                    {!isCollapsed && link.label}
                </Link>
            );
        });
    };


    return (
        <nav className={cn("flex-1 py-4 space-y-6 overflow-y-auto", isCollapsed ? "px-2" : "px-4")}>

            {/* Company Management Section */}
            <div>
                {!isCollapsed && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Company Workspace</p>}
                <div className="space-y-0.5">
                    {renderLinks(companyLinks)}
                </div>
            </div>

            {/* Personal Workspace Section */}
            <div>
                {!isCollapsed && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Home</p>}
                <div className="space-y-0.5">
                    {renderLinks(personalLinks)}
                </div>
            </div>

        </nav>
    );
}

