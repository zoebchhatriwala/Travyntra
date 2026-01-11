"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Plane,
    FolderOpen,
    Settings,
    LucideIcon
} from "lucide-react";

interface NavLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

interface EmployeeNavProps {
    slug: string;
}

export function EmployeeNav({ slug }: EmployeeNavProps) {
    const pathname = usePathname();

    const navLinks: NavLink[] = [
        { href: `/company/${slug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/company/${slug}/dashboard/requests`, label: "My Requests", icon: Plane },
        { href: `/company/${slug}/dashboard/assets`, label: "Asset Vault", icon: FolderOpen },
        { href: `/settings`, label: "Settings", icon: Settings },
    ];

    return (
        <nav className="flex-1 px-4 space-y-1">
            {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== `/company/${slug}/dashboard` && pathname.startsWith(link.href));

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group",
                            isActive
                                ? "text-indigo-600 bg-indigo-50 shadow-sm shadow-indigo-100/50"
                                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/30"
                        )}
                    >
                        <link.icon
                            size={20}
                            className={cn(
                                "transition-transform group-hover:scale-110",
                                isActive ? "scale-110" : ""
                            )}
                        />
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
