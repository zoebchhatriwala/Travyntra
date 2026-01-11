"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

import {
    ChevronDown,
    Terminal,
    ShieldAlert,
    Building,
    User,
    Check
} from "lucide-react";
import { getDevUsers } from "@/app/actions/dev";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function DevLoginSwitcher() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            getDevUsers().then(setUsers);
        }
    }, []);

    if (process.env.NODE_ENV !== 'development') return null;

    const handleSwitch = async (email: string) => {
        await signIn("dev-login", {
            email,
            callbackUrl: window.location.pathname
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <DropdownMenu onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={`h-14 px-6 rounded-full shadow-2xl border-2 transition-all duration-300 gap-3 group bg-white border-indigo-100 hover:border-indigo-600 hover:scale-105 ${isOpen ? 'ring-4 ring-indigo-50' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                            <Terminal size={18} />
                        </div>
                        <div className="flex flex-col items-start pr-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Dev Console</span>
                            <span className="text-xs font-bold text-gray-900 leading-none">Switch Account</span>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    side="top"
                    className="w-80 rounded-[32px] p-4 border-2 border-indigo-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
                >
                    <DropdownMenuLabel className="px-3 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Local Environment</p>
                                <p className="text-[10px] font-bold text-amber-600 italic leading-none mt-1">Impersonation Mode Active</p>
                            </div>
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-gray-50 mb-2" />

                    <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                        {users.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400">No users found in database</p>
                            </div>
                        ) : (
                            users.map((user) => (
                                <DropdownMenuItem
                                    key={user.id}
                                    onClick={() => handleSwitch(user.email)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 group focus:bg-indigo-50 ${session?.user?.id === user.id ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm transition-all group-hover:scale-110 ${session?.user?.id === user.id ? 'bg-indigo-600 text-white' : 'bg-white ring-1 ring-gray-100'}`}>
                                        {user.role === 'SUPER_ADMIN' ? <ShieldAlert size={18} /> :
                                            user.role === 'ADMIN' ? <Building size={18} /> :
                                                <User size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-black truncate leading-none ${session?.user?.id === user.id ? 'text-indigo-600' : 'text-gray-900'}`}>{user.name}</p>
                                            {session?.user?.id === user.id && <Check size={14} className="text-indigo-600" />}
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1 truncate">
                                            {user.role} {user.companyName ? `• ${user.companyName}` : ''}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronDown className="-rotate-90 text-indigo-400" size={14} />
                                    </div>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>

                    <DropdownMenuSeparator className="bg-gray-50 mt-2 mb-2" />
                    <div className="px-3 py-2 bg-indigo-50/50 rounded-2xl">
                        <p className="text-[9px] font-bold text-indigo-600 leading-tight">
                            Security Note: This switcher is automatically stripped from production builds.
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
