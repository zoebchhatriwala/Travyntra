"use client";

import { signOut, useSession } from "next-auth/react";
import {
    LogOut,
    ChevronDown,
    Settings
} from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

export function UserMenu() {
    const { data: session } = useSession();

    const initials = session?.user?.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
        : "SA";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-50 rounded-xl transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-bold overflow-hidden relative">
                        {session?.user?.image ? (
                            <Image
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <span className="text-sm font-bold text-gray-700 hidden lg:block">
                        {session?.user?.name || "User"}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-gray-100">
                <DropdownMenuItem asChild className="rounded-xl focus:bg-indigo-50 cursor-pointer">
                    <Link href="/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-xl text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
