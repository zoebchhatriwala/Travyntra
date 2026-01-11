"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
    getNotifications,
    markAsRead,
    markAllAsRead
} from "@/lib/actions/notifications";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type Notification = {
    id: string;
    title: string;
    message: string;
    type: string | null;
    link: string | null;
    read: boolean;
    createdAt: Date;
};

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [prevUnreadCount, setPrevUnreadCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchNotifications = async () => {
        const data = await getNotifications(20);
        // Convert dates to Date objects if they are strings
        const formattedData = data.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt)
        }));
        setNotifications(formattedData);
        const count = formattedData.filter((n: any) => !n.read).length;
        setUnreadCount(count);
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (unreadCount > prevUnreadCount && prevUnreadCount !== 0) {
            // New notification arrived
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
        }
        setPrevUnreadCount(unreadCount);
    }, [unreadCount, prevUnreadCount]);

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getTypeIcon = (type: string | null) => {
        switch (type) {
            case "SUCCESS": return <CheckCircle2 className="text-emerald-500" size={18} />;
            case "WARNING": return <AlertTriangle className="text-amber-500" size={18} />;
            case "ERROR": return <XCircle className="text-rose-500" size={18} />;
            default: return <Info className="text-indigo-500" size={18} />;
        }
    };

    return (
        <>
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative group">
                        <Bell size={20} className="group-hover:scale-110 transition-transform" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 rounded-3xl border-gray-100 shadow-2xl shadow-indigo-100/50 overflow-hidden">
                    <div className="p-4 bg-white border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Notifications</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {unreadCount} UNREAD UPDATES
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="h-8 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg px-2"
                            >
                                Mark all Read
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="h-[400px]">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center space-y-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                                    <Bell size={24} />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 transition-colors relative group",
                                            !notification.read ? "bg-indigo-50/30" : "hover:bg-gray-50/50"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1 flex-shrink-0">
                                                {getTypeIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn(
                                                        "text-xs font-black truncate",
                                                        !notification.read ? "text-gray-900" : "text-gray-600"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase flex-shrink-0">
                                                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 pt-1">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                                                        >
                                                            Mark as Read
                                                        </button>
                                                    )}
                                                    {notification.link && (
                                                        <a
                                                            href={notification.link}
                                                            className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            View Details
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50/50 border-t border-gray-50">
                            <Link href="/notifications" className="w-full">
                                <Button className="w-full h-10 bg-white text-gray-900 border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 shadow-sm">
                                    View Activity Log
                                </Button>
                            </Link>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
