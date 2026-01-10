"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
// @ts-ignore
import styles from "./sidebar.module.css";

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
}

interface SidebarProps {
    items: NavItem[];
    user?: {
        name: string;
        role: string;
        email: string;
    };
}

export function Sidebar({ items, user }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.brand}>
                    {/* Logo could go here */}
                    <span>Traverse</span>
                </div>
            </div>

            <nav className={styles.nav}>
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(styles.item, isActive && styles.active)}
                        >
                            <item.icon className={styles.itemIcon} />
                            <span>{item.title}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                {user && (
                    <div className={styles.user}>
                        <div className={styles.avatar}>
                            {user.name.charAt(0)}
                        </div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.userRole}>{user.role}</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
