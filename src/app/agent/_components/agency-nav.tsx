
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Gavel, Plane, FileText, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";



export function AgencyNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = session?.user?.role;

    const navItems = [
        {
            name: "Dashboard",
            href: "/agent/dashboard",
            icon: Gauge,
            exact: true
        }
    ];

    if (userRole === UserRole.TRAVEL_AGENT) {
        navItems.push({
            name: "Bid Management",
            href: "/agent/bids",
            icon: Gavel
        } as any);
    }

    navItems.push({
        name: "Fulfillment Console",
        href: "/agent/fulfillment",
        icon: Plane
    } as any);

    if (userRole === UserRole.TRAVEL_AGENT) {
        navItems.push({
            name: "Invoices",
            href: "/agent/invoices",
            icon: FileText
        } as any);
        navItems.push({
            name: "Staff",
            href: "/agent/staff",
            icon: Users
        } as any);
        navItems.push({
            name: "Settings",
            href: "/agent/settings",
            icon: Settings
        } as any);
    }

    return (
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4">
                Agency Workspace
            </div>
            {navItems.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                    >
                        <item.icon
                            size={18}
                            className={cn(
                                "transition-colors",
                                isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"
                            )}
                        />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}
