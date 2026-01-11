
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Gavel, Plane, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    {
        name: "Dashboard",
        href: "/agent/dashboard",
        icon: Gauge,
        exact: true
    },
    {
        name: "Bid Management",
        href: "/agent/bids",
        icon: Gavel
    },
    {
        name: "Fulfillment Console",
        href: "/agent/fulfillment",
        icon: Plane
    },
    {
        name: "Invoices",
        href: "/agent/invoices",
        icon: FileText
    },
    {
        name: "Settings",
        href: "/agent/settings",
        icon: Settings
    }
];

export function AgencyNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4">
                Agency Workspace
            </div>
            {NAV_ITEMS.map((item) => {
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
