"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Plane,
    FolderOpen,
    Settings,
    CheckCircle,
    LucideIcon
} from "lucide-react";

interface NavLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

import { useSidebar } from "@/components/layout/sidebar-layout";

interface EmployeeNavProps {
    slug: string;
}

export function EmployeeNav({ slug }: EmployeeNavProps) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();

    const navLinks: NavLink[] = [
        { href: `/company/${slug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/company/${slug}/dashboard/requests`, label: "My Requests", icon: Plane },
        { href: `/company/${slug}/dashboard/approvals`, label: "My Approvals", icon: CheckCircle },
        { href: `/company/${slug}/dashboard/assets`, label: "Asset Vault", icon: FolderOpen },
        { href: `/settings`, label: "Settings", icon: Settings },
    ];

    return (
        <nav className={cn("flex-1 px-3 space-y-1", isCollapsed ? "px-2" : "px-4")}>
            {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== `/company/${slug}/dashboard` && pathname.startsWith(link.href));

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-4 px-3 py-3 rounded-corner-md text-sm font-semibold transition-all duration-200 group",
                            isActive
                                ? "text-indigo-600 bg-indigo-50 shadow-sm shadow-indigo-100/50"
                                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/30",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? link.label : undefined}
                    >
                        <link.icon
                            size={20}
                            className={cn(
                                "transition-transform group-hover:scale-110 shrink-0",
                                isActive ? "scale-110" : ""
                            )}
                        />
                        {!isCollapsed && (
                            <span className="truncate">{link.label}</span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
