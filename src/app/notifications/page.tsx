"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import {
    getNotificationsPaged,
    markAsRead,
    markAllAsRead
} from "@/lib/actions/notifications";
import { Bell, Search, ChevronLeft, ChevronRight, Info, CheckCircle2, AlertTriangle, XCircle, CheckSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function GoBackLink() {
    const { data: session } = useSession();

    const role = session?.user?.role;
    const companySlug = session?.user?.companySlug;

    const backPath = role === "SUPER_ADMIN"
        ? "/admin/dashboard"
        : role === "TRAVEL_AGENT"
            ? "/agent/dashboard"
            : companySlug
                ? role === "EMPLOYEE"
                    ? `/company/${companySlug}/dashboard`
                    : `/company/${companySlug}/admin`
                : "/";

    return (
        <Link href={backPath} className="group flex items-center gap-3 text-gray-400 hover:text-gray-900 transition-all font-black uppercase text-[10px] tracking-widest">
            <div className="w-10 h-10 rounded-2xl border border-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-lg transition-all">
                <ArrowLeft size={18} />
            </div>
            Back to Dashboard
        </Link>
    );
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string | null;
    link: string | null;
    read: boolean;
    createdAt: string | Date;
}

function NotificationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";

    const [data, setData] = useState<{ notifications: Notification[], total: number, pages: number }>({
        notifications: [],
        total: 0,
        pages: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(search);

    const fetchNotifications = useCallback(async (isInitial = false) => {
        if (!isInitial) setLoading(true);
        const result = await getNotificationsPaged({
            page,
            search,
            limit: 10
        });
        setData(result);
        setLoading(false);
    }, [page, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNotifications(true);
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchNotifications]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) {
            params.set("search", searchInput);
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        router.push(`/notifications?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/notifications?${params.toString()}`);
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        fetchNotifications();
    };

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
        fetchNotifications();
    };

    const getTypeIcon = (type: string | null) => {
        switch (type) {
            case "SUCCESS": return <CheckCircle2 className="text-emerald-500" size={20} />;
            case "WARNING": return <AlertTriangle className="text-amber-500" size={20} />;
            case "ERROR": return <XCircle className="text-rose-500" size={20} />;
            default: return <Info className="text-indigo-500" size={20} />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Search notifications..."
                        className="pl-10 h-11 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </form>

                <Button
                    variant="ghost"
                    onClick={handleMarkAllRead}
                    className="text-indigo-600 font-bold hover:bg-indigo-50 hover:text-indigo-700 h-11 px-6 rounded-xl transition-all active:scale-95"
                >
                    <CheckSquare size={18} className="mr-2" />
                    Mark all as read
                </Button>
            </div>

            {/* Notifications List */}
            <Card className="border-gray-100 shadow-xl shadow-indigo-100/20 overflow-hidden bg-white/70 backdrop-blur-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading notifications...</p>
                        </div>
                    ) : data.notifications.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto text-gray-300">
                                <Bell size={40} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-gray-900">No notifications found</p>
                                <p className="text-sm text-gray-400">Try adjusting your search or check back later.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {data.notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-6 transition-all relative flex gap-5 group",
                                        !notification.read ? "bg-indigo-50/20" : "hover:bg-gray-50/50"
                                    )}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-50 flex items-center justify-center">
                                            {getTypeIcon(notification.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className={cn(
                                                "text-[15px] font-black tracking-tight",
                                                !notification.read ? "text-gray-900" : "text-gray-600"
                                            )}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-6 pt-3">
                                            {!notification.read && (
                                                <button
                                                    onClick={() => handleMarkRead(notification.id)}
                                                    className="text-[11px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors tracking-widest flex items-center gap-2"
                                                >
                                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                                    Mark as Read
                                                </button>
                                            )}
                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    className="text-[11px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-widest"
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {data.pages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="rounded-2xl w-12 h-12 hover:bg-white hover:shadow-xl transition-all disabled:opacity-30"
                    >
                        <ChevronLeft size={20} />
                    </Button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                            // Simple pagination logic for first 5 pages, can be improved
                            const p = i + 1;
                            return (
                                <Button
                                    key={p}
                                    variant={page === p ? "default" : "ghost"}
                                    onClick={() => handlePageChange(p)}
                                    className={cn(
                                        "w-12 h-12 rounded-2xl font-black transition-all",
                                        page === p
                                            ? "bg-gray-900 text-white shadow-xl shadow-gray-200"
                                            : "hover:bg-white hover:shadow-xl text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    {p}
                                </Button>
                            );
                        })}
                        {data.pages > 5 && <span className="text-gray-300 px-2">...</span>}
                        {data.pages > 5 && (
                            <Button
                                variant={page === data.pages ? "default" : "ghost"}
                                onClick={() => handlePageChange(data.pages)}
                                className={cn(
                                    "w-12 h-12 rounded-2xl font-black transition-all",
                                    page === data.pages
                                        ? "bg-gray-900 text-white shadow-xl shadow-gray-200"
                                        : "hover:bg-white hover:shadow-xl text-gray-500 hover:text-gray-900"
                                )}
                            >
                                {data.pages}
                            </Button>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePageChange(Math.min(data.pages, page + 1))}
                        disabled={page === data.pages}
                        className="rounded-2xl w-12 h-12 hover:bg-white hover:shadow-xl transition-all disabled:opacity-30"
                    >
                        <ChevronRight size={20} />
                    </Button>
                </div>
            )}

            <div className="text-center pt-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
                    Showing {data.notifications.length} of {data.total} updates
                </p>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFB] pb-20 font-inter">
            {/* Nav Pattern Background */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-indigo-600/5 -z-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

            {/* Header */}
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="container mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <GoBackLink />
                        <div className="h-8 w-px bg-gray-100 mx-2" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">Activity Log</h1>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Audit Trail & System Alerts</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 pt-12">
                <Suspense fallback={
                    <div className="max-w-4xl mx-auto p-20 text-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                }>
                    <NotificationsContent />
                </Suspense>
            </main>
        </div>
    );
}
