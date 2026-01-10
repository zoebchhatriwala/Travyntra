import { DashboardShell } from "@/components/layout/shell";
import { Sidebar } from "@/components/layout/sidebar";
import {
    LayoutDashboard,
    PlusCircle,
    History,
    Receipt,
    Settings
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
    // Mock user for now
    const user = {
        name: "John Doe",
        role: "Employee",
        email: "john@example.com"
    };

    const navItems = [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "New Request", href: "/dashboard/request", icon: PlusCircle },
        { title: "History", href: "/dashboard/history", icon: History },
        { title: "Expenses", href: "/dashboard/expenses", icon: Receipt },
        { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <DashboardShell
            sidebar={<Sidebar items={navItems} user={user} />}
        >
            {children}
        </DashboardShell>
    );
}
