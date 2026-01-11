"use client";

import { useState } from "react";
import {
    Search,
    UserCheck,
    UserX,
    ShieldAlert,
    ShieldCheck,
    MoreHorizontal,
    Mail,
    Calendar,
    BadgeCheck
} from "lucide-react";
import {
    Card,
    CardContent
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveStaff, toggleStaffBlock, updateStaffRole } from "../actions";
import { UserRole } from "@prisma/client";

interface StaffMember {
    id: string;
    name: string | null;
    email: string | null;
    role: UserRole;
    isActive: boolean;
    isBlocked: boolean;
    createdAt: Date;
}

interface StaffListProps {
    initialStaff: StaffMember[];
    slug: string;
}

export function StaffList({ initialStaff, slug }: StaffListProps) {
    const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const filteredStaff = staff.filter(member =>
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApprove = async (id: string) => {
        setIsLoading(id);
        const res = await approveStaff(id, slug);
        if (res.success) {
            setStaff(prev => prev.map(s => s.id === id ? { ...s, isActive: true } : s));
        }
        setIsLoading(null);
    };

    const handleToggleBlock = async (id: string, currentlyBlocked: boolean) => {
        setIsLoading(id);
        const res = await toggleStaffBlock(id, !currentlyBlocked, slug);
        if (res.success) {
            setStaff(prev => prev.map(s => s.id === id ? { ...s, isBlocked: !currentlyBlocked } : s));
        }
        setIsLoading(null);
    };

    const handleRoleUpdate = async (id: string, newRole: UserRole) => {
        setIsLoading(id);
        const res = await updateStaffRole(id, newRole, slug);
        if (res.success) {
            setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
        }
        setIsLoading(null);
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search staff by name or email..."
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-10 px-4 rounded-xl border-gray-200 bg-white text-gray-500 font-bold">
                        Total: {staff.length}
                    </Badge>
                    <Badge variant="outline" className="h-10 px-4 rounded-xl border-amber-100 bg-amber-50 text-amber-600 font-bold">
                        Pending: {staff.filter(s => !s.isActive).length}
                    </Badge>
                </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStaff.map((member) => (
                    <Card key={member.id} className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden hover:ring-indigo-100 hover:shadow-md transition-all duration-300 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner uppercase">
                                            {member.name ? member.name[0] : member.email?.[0]}
                                        </div>
                                        {member.isActive && (
                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-lg p-0.5 border-2 border-white shadow-sm">
                                                <BadgeCheck size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="max-w-[140px]">
                                        <h3 className="font-black text-gray-900 leading-tight truncate">{member.name || "Unnamed"}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                            <Mail size={10} /> {member.email}
                                        </p>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={isLoading === member.id}>
                                            <MoreHorizontal size={18} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[180px]">
                                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 p-2">Actions</DropdownMenuLabel>
                                        {!member.isActive && (
                                            <DropdownMenuItem onClick={() => handleApprove(member.id)} className="rounded-xl flex items-center gap-2 text-emerald-600 font-bold focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer">
                                                <UserCheck size={16} /> Approve Access
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => handleToggleBlock(member.id, member.isBlocked)} className={`rounded-xl flex items-center gap-2 font-bold cursor-pointer ${member.isBlocked ? 'text-emerald-600 focus:bg-emerald-50' : 'text-rose-600 focus:bg-rose-50'}`}>
                                            {member.isBlocked ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                            {member.isBlocked ? 'Unblock User' : 'Block User'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 p-2">Promote/Demote</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => handleRoleUpdate(member.id, member.role === UserRole.COMPANY_ADMIN ? UserRole.EMPLOYEE : UserRole.COMPANY_ADMIN)}
                                            className="rounded-xl flex items-center gap-2 font-bold cursor-pointer"
                                        >
                                            {member.role === UserRole.COMPANY_ADMIN ? 'Demote to Employee' : 'Promote to Admin'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3 bg-gray-50/50 rounded-2xl ring-1 ring-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                                    {member.isBlocked ? (
                                        <Badge className="bg-rose-100 text-rose-600 border-none font-bold text-[10px] px-2 h-5 rounded-lg">BLOCKED</Badge>
                                    ) : member.isActive ? (
                                        <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold text-[10px] px-2 h-5 rounded-lg">ACTIVE</Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-600 border-none font-bold text-[10px] px-2 h-5 rounded-lg">PENDING</Badge>
                                    )}
                                </div>
                                <div className="p-3 bg-gray-50/50 rounded-2xl ring-1 ring-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Role</span>
                                    <span className={`text-[10px] font-black ${member.role === UserRole.COMPANY_ADMIN ? 'text-indigo-600' : 'text-gray-600'} uppercase`}>
                                        {member.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                    <Calendar size={12} />
                                    Joined {new Date(member.createdAt).toLocaleDateString()}
                                </div>
                                {!member.isActive && (
                                    <Button
                                        size="sm"
                                        className="h-8 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase px-4 rounded-xl shadow-lg shadow-indigo-100"
                                        onClick={() => handleApprove(member.id)}
                                        disabled={isLoading === member.id}
                                    >
                                        APPROVE
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredStaff.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
                    <UserX size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-black text-gray-900 mb-1 tracking-tight">No staff found.</h3>
                    <p className="text-sm text-gray-400 font-medium italic leading-relaxed">Try adjusting your search query or clear filters.</p>
                </div>
            )}
        </div>
    );
}
