"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks() {
    const pathname = usePathname();

    const links = [
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/companies", label: "Companies" },
        { href: "/admin/agents", label: "Agencies" },
        { href: "/admin/analytics", label: "Analytics" },
        { href: "/admin/emails", label: "Emails" },
    ];

    return (
        <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-corner-sm",
                            isActive
                                ? "text-indigo-600 bg-indigo-50 shadow-sm shadow-indigo-100/50"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
