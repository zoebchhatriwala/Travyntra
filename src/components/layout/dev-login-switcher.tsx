"use client";

import { useState, useEffect, useMemo } from "react";
import { signIn, useSession } from "next-auth/react";
import type { Session } from "next-auth";

import {
    ChevronDown,
    Terminal,
    ShieldAlert,
    Building,
    User,
    Check,
    Briefcase,
    Globe,
    Filter,
    Copy,
    UserCog
} from "lucide-react";
import { getDevUsers } from "@/app/actions/dev";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { IS_DEVELOPMENT } from "@/lib/constants/enviroment";

// --- COLOR & GROUPING UTILS ---
const COLORS = [
    { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", border: "border-blue-100" },
    { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-100" },
    { bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50", border: "border-violet-100" },
    { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-100" },
    { bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50", border: "border-rose-100" },
    { bg: "bg-cyan-500", text: "text-cyan-600", light: "bg-cyan-50", border: "border-cyan-100" },
    { bg: "bg-fuchsia-500", text: "text-fuchsia-600", light: "bg-fuchsia-50", border: "border-fuchsia-100" },
];

const getCompanyColor = (index: number) => COLORS[index % COLORS.length];

interface DevUser {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    companyName?: string;
    companySlug?: string | null;
}

export function DevLoginSwitcher() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<DevUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Filtering State
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isFilterInitialized, setIsFilterInitialized] = useState(false);

    // Determine storage key
    const STORAGE_KEY = "dev-console-company-filter";

    // Load from LocalStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setSelectedCompanies(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse dev filter", e);
                }
            }
            setIsFilterInitialized(true);
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (isFilterInitialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCompanies));
        }
    }, [selectedCompanies, isFilterInitialized]);

    useEffect(() => {
        if (IS_DEVELOPMENT) {
            getDevUsers().then(data => {
                setUsers(data || []);
            });
        }
    }, []);

    // Extract unique companies for filter
    const uniqueCompanies = useMemo(() => {
        const companies = new Set<string>();
        users.forEach(u => {
            if (u.companyName) companies.add(u.companyName);
        });
        return Array.from(companies).sort();
    }, [users]);

    // Apply filters
    const filteredUsers = useMemo(() => {
        if (selectedCompanies.length === 0) {
            return users;
        }
        return users.filter(u =>
            // Always show Super Admins regardless of filter? Or filter if they have no company?
            // Let's keep logic simple: If filtered, show user if their company is in list OR if they are super admin (usually no company)
            (u.role === 'SUPER_ADMIN') ||
            (u.companyName && selectedCompanies.includes(u.companyName))
        );
    }, [selectedCompanies, users]);

    const toggleCompanyFilter = (company: string) => {
        setSelectedCompanies(prev =>
            prev.includes(company)
                ? prev.filter(c => c !== company)
                : [...prev, company]
        );
    };

    const groupedUsers = useMemo(() => {
        const groups: Record<string, typeof filteredUsers> = {
            "Super Admin": [],
            "Agencies": [],
        };
        const companyGroups: Record<string, typeof filteredUsers> = {};

        filteredUsers.forEach(u => {
            if (u.role === 'SUPER_ADMIN') {
                groups["Super Admin"].push(u);
            } else if (u.role === 'TRAVEL_AGENT' || u.role === 'AGENCY_EMPLOYEE') {
                const key = u.companyName ? `Agency: ${u.companyName}` : "Agencies";
                if (!groups[key]) groups[key] = [];
                groups[key].push(u);
            } else {
                const key = u.companyName || "No Company";
                if (!companyGroups[key]) companyGroups[key] = [];
                companyGroups[key].push(u);
            }
        });

        // Clean up empty agency groups if filtered out
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0 && key !== "Super Admin") delete groups[key];
        });

        return { special: groups, companies: companyGroups };
    }, [filteredUsers]);

    // Only show in development
    if (!IS_DEVELOPMENT) return null;

    const handleSwitch = async (user: DevUser) => {
        const { email, role, companySlug } = user;
        if (!email) return;

        let targetUrl = "/";
        if (role === 'SUPER_ADMIN') targetUrl = "/admin/dashboard";
        else if (role === 'TRAVEL_AGENT' || role === 'AGENCY_EMPLOYEE') targetUrl = "/agent/dashboard";
        else if (companySlug) targetUrl = role === 'COMPANY_ADMIN' || role === 'ADMIN' ? `/company/${companySlug}/admin` : `/company/${companySlug}/dashboard`;

        await signIn("dev-login", { email, callbackUrl: targetUrl });
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
            <DropdownMenu onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setIsFilterOpen(false); // Close filter view when menu closes
            }}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "h-14 px-6 rounded-full shadow-2xl border-2 transition-all duration-300 gap-3 group bg-white border-indigo-100 hover:border-indigo-600 hover:scale-105",
                            isOpen && "ring-4 ring-indigo-50 border-indigo-600"
                        )}
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                            <Terminal size={18} />
                        </div>
                        <div className="flex flex-col items-start pr-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Dev Console</span>
                            <span className="text-xs font-bold text-gray-900 leading-none">Switch Account</span>
                        </div>
                        {selectedCompanies.length > 0 && (
                            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-[10px] items-center justify-center flex h-5 w-5 p-0 rounded-full">
                                {selectedCompanies.length}
                            </Badge>
                        )}
                        <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="center"
                    side="top"
                    className="w-[400px] h-[600px] rounded-[32px] p-0 border-2 border-indigo-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col overflow-hidden bg-white"
                >
                    <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-100">
                        <DropdownMenuLabel className="p-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Local Environment</p>
                                        <p className="text-[10px] font-bold text-amber-600 italic leading-none mt-1">Impersonation Mode Active</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn("h-8 w-8 p-0 rounded-full", isFilterOpen ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:bg-gray-100")}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsFilterOpen(!isFilterOpen);
                                    }}
                                >
                                    <Filter size={16} />
                                </Button>
                            </div>
                        </DropdownMenuLabel>

                        {/* Filter View Header */}
                        {isFilterOpen && (
                            <div className="mt-3 pt-3 border-t border-gray-50 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Filter Companies</span>
                                    {selectedCompanies.length > 0 && (
                                        <button
                                            onClick={() => setSelectedCompanies([])}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                                    {uniqueCompanies.map((company, idx) => {
                                        const theme = getCompanyColor(idx);
                                        const isSelected = selectedCompanies.includes(company);
                                        return (
                                            <button
                                                key={company}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toggleCompanyFilter(company);
                                                }}
                                                className={cn(
                                                    "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all truncate max-w-[150px]",
                                                    isSelected
                                                        ? cn(theme.bg, "text-white border-transparent shadow-sm")
                                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200 hover:bg-white"
                                                )}
                                            >
                                                {company}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <p className="text-sm font-bold">No users match criteria</p>
                            </div>
                        ) : (
                            <>
                                {/* SUPER ADMIN */}
                                {groupedUsers.special["Super Admin"]?.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase text-gray-400 pl-2">System Admin</h3>
                                        {groupedUsers.special["Super Admin"].map((u) => (
                                            <UserItem key={u.id} user={u} session={session} onClick={handleSwitch} colorClass="bg-gray-900" textClass="text-gray-900" />
                                        ))}
                                    </div>
                                )}

                                {/* AGENCIES */}
                                {Object.entries(groupedUsers.special).filter(([k]) => k !== "Super Admin" && k !== "Agencies").map(([groupName, groupUsers]) => (
                                    <div key={groupName} className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase text-indigo-400 pl-2">{groupName}</h3>
                                        {groupUsers.map((u) => (
                                            <UserItem key={u.id} user={u} session={session} onClick={handleSwitch} colorClass="bg-indigo-500" textClass="text-indigo-600" />
                                        ))}
                                    </div>
                                ))}
                                {groupedUsers.special["Agencies"]?.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase text-indigo-400 pl-2">Agencies</h3>
                                        {groupedUsers.special["Agencies"].map((u) => (
                                            <UserItem key={u.id} user={u} session={session} onClick={handleSwitch} colorClass="bg-indigo-500" textClass="text-indigo-600" />
                                        ))}
                                    </div>
                                )}

                                {/* CLIENT COMPANIES */}
                                {Object.entries(groupedUsers.companies).map(([companyName, companyUsers]) => {
                                    const theme = getCompanyColor(uniqueCompanies.indexOf(companyName));
                                    // Use consistent color based on global index to keep color same when filtering

                                    return (
                                        <div key={companyName} className={cn("space-y-2 p-3 rounded-2xl border-2", theme.light, theme.border)}>
                                            <h3 className={cn("text-[11px] font-black uppercase flex items-center gap-2", theme.text)}>
                                                <Briefcase size={12} />
                                                {companyName}
                                            </h3>
                                            <div className="space-y-1">
                                                {companyUsers.map((u) => (
                                                    <UserItem
                                                        key={u.id}
                                                        user={u}
                                                        session={session}
                                                        onClick={handleSwitch}
                                                        colorClass={theme.bg.replace("bg-", "bg-")}
                                                        textClass={theme.text}
                                                        minimal
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-[9px] font-bold text-gray-400 leading-tight">
                            Security Note: This switcher is automatically stripped from production builds.
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

interface UserItemProps {
    user: DevUser;
    session: Session | null;
    onClick: (user: DevUser) => void;
    colorClass: string;
    textClass: string;
    minimal?: boolean;
}

function UserItem({ user, session, onClick, colorClass, textClass, minimal = false }: UserItemProps) {
    const isActive = session?.user?.email === user.email;
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (user.email) {
            navigator.clipboard.writeText(user.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <DropdownMenuItem
            onClick={() => onClick(user)}
            className={cn(
                "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 group focus:bg-white/50 hover:bg-white/80",
                isActive && "ring-1 ring-black/5 bg-white shadow-sm"
            )}
        >
            <div className={cn(
                "rounded-lg flex items-center justify-center shadow-sm transition-all group-hover:scale-105",
                colorClass,
                minimal ? "w-8 h-8" : "w-10 h-10",
                "text-white"
            )}>
                {user.role === 'SUPER_ADMIN' ? <ShieldAlert className="text-white" size={minimal ? 14 : 18} /> :
                    user.role === 'TRAVEL_AGENT' ? <Globe className="text-white" size={minimal ? 14 : 18} /> :
                        user.role === 'COMPANY_ADMIN' ? <Building className="text-white" size={minimal ? 14 : 18} /> :
                            user.role === 'AGENCY_EMPLOYEE' ? <UserCog className="text-white" size={minimal ? 14 : 18} /> :
                                <User className="text-white" size={minimal ? 14 : 18} />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-bold truncate leading-none", isActive ? "text-black" : "text-gray-700")}>{user.name}</p>
                    {isActive && <Check size={14} className="text-green-500" />}
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                        <p className={cn("text-[10px] font-medium uppercase tracking-tight truncate", textClass || "text-gray-400")}>
                            {user.role.replace("_", " ")}
                        </p>
                        {user.email && (
                            <p className="text-[10px] text-gray-400/70 truncate font-normal">
                                {user.email}
                            </p>
                        )}
                    </div>
                    {user.email && (
                        <button
                            onClick={handleCopy}
                            className={cn(
                                "p-1.5 rounded-full hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                                copied ? "text-green-500 bg-green-50" : "text-gray-400 hover:text-indigo-600"
                            )}
                            title="Copy email"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                    )}
                </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                <ChevronDown className="-rotate-90 text-gray-300" size={14} />
            </div>
        </DropdownMenuItem>
    );
}
