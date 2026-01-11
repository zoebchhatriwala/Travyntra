import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./_components/user-menu";
import { NavLinks } from "./_components/nav-links";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-[#FAFAFB]">
            {/* Super Admin Top Navigation */}
            <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="container mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/dashboard" className="flex items-center gap-2 group">
                            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="font-display text-xl font-bold tracking-tight text-gray-900">
                                Travyntra<span className="text-indigo-600">.</span>Admin
                            </span>
                        </Link>

                        <NavLinks />
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu />
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="py-8 bg-white border-t border-gray-100">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400 font-medium">
                        &copy; 2026 Travyntra. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-sm text-gray-400 hover:text-indigo-600 font-medium transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-sm text-gray-400 hover:text-indigo-600 font-medium transition-colors">Privacy</Link>
                        <Link href="#" className="text-sm text-gray-400 hover:text-indigo-600 font-medium transition-colors">Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
