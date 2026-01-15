
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gavel, Plane, FileText, Settings, Users, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";



interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
}

import { useSidebar } from "@/components/layout/sidebar-layout";

export function AgencyNav() {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = session?.user?.role;

    // ... rest of the function remains the same, remove prop definition and interface ...
    const navItems: NavItem[] = [
        {
            name: "Dashboard",
            href: "/agent/dashboard",
            icon: LayoutDashboard,
            exact: true
        }
    ];

    if (userRole === UserRole.TRAVEL_AGENT) {
        navItems.push({
            name: "Bid Management",
            href: "/agent/bids",
            icon: Gavel
        });
    }

    navItems.push({
        name: "Fulfillment Console",
        href: "/agent/fulfillment",
        icon: Plane
    });

    if (userRole === UserRole.TRAVEL_AGENT) {
        navItems.push({
            name: "Invoices",
            href: "/agent/invoices",
            icon: FileText
        });
        navItems.push({
            name: "Staff",
            href: "/agent/staff",
            icon: Users
        });
        navItems.push({
            name: "Settings",
            href: "/agent/settings",
            icon: Settings
        });
    }

    return (
        <nav className={cn("flex-1 px-3 py-6 space-y-1 overflow-y-auto", isCollapsed ? "px-2" : "px-4")}>
            {!isCollapsed && (
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4 whitespace-nowrap overflow-hidden">
                    Agency Workspace
                </div>
            )}
            {navItems.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? item.name : undefined}
                    >
                        <item.icon
                            size={20}
                            className={cn(
                                "transition-colors shrink-0",
                                isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                            )}
                        />
                        {!isCollapsed && (
                            <span className="truncate">{item.name}</span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
