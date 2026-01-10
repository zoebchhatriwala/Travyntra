import { DashboardShell } from "@/components/layout/shell";
import { Sidebar } from "@/components/layout/sidebar";
import {
    LayoutDashboard,
    PlusCircle,
    History,
    Receipt,
    Settings
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const user = {
        name: session.user?.name || "User",
        role: session.user?.role || "Employee",
        email: session.user?.email || "",
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
