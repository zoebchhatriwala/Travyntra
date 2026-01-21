"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Search,
    UserCheck,
    UserX,
    ShieldAlert,
    ShieldCheck,
    MoreHorizontal,
    Mail,
    CalendarDays,
    BadgeCheck,
    UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatStatus, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
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
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
}

interface StaffListProps {
    initialStaff: StaffMember[];
    slug: string;
}

export function StaffList({ initialStaff, slug }: StaffListProps) {
    const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<string | null>(null);



    const filteredStaff = staff.filter(member => {
        const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "ALL" || member.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const activeStaff = filteredStaff.filter(m => m.isActive);
    const pendingStaff = filteredStaff.filter(m => !m.isActive);

    const copyInviteLink = () => {
        const link = `${window.location.origin}/company/${slug}/register`;
        navigator.clipboard.writeText(link);
        toast.success("Invite link copied to clipboard");
    };

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
            toast.success(currentlyBlocked ? "User unblocked successfully" : "User blocked successfully");
        } else {
            toast.error(res.error || "Failed to update staff status");
        }
        setIsLoading(null);
    };

    const handleRoleUpdate = async (id: string, newRole: UserRole) => {
        setIsLoading(id);
        const res = await updateStaffRole(id, newRole, slug);
        if (res.success) {
            setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
            toast.success("Role updated successfully");
        } else {
            toast.error(res.error || "Failed to update staff role");
        }
        setIsLoading(null);
    };



    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === pendingStaff.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingStaff.map(m => m.id));
        }
    };

    const handleBulkApprove = async () => {
        setIsLoading("bulk");
        const pendingSelected = pendingStaff.filter(m => selectedIds.includes(m.id));

        for (const member of pendingSelected) {
            await approveStaff(member.id, slug);
        }

        setStaff(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, isActive: true } : s));
        setSelectedIds([]);
        setIsLoading(null);
        toast.success(`Approved ${pendingSelected.length} members`);
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search staff by name or email..."
                            className="w-full h-12 pl-11 pr-4 rounded-corner-lg border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center p-1 bg-white border border-gray-100 rounded-corner-lg shadow-sm">
                        <Button
                            variant={roleFilter === "ALL" ? "default" : "ghost"}
                            onClick={() => setRoleFilter("ALL")}
                            className={cn(
                                "h-10 px-6 rounded-corner-md font-black text-[10px] uppercase tracking-widest transition-all",
                                roleFilter === "ALL"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            All
                        </Button>
                        <Button
                            variant={roleFilter === UserRole.COMPANY_ADMIN ? "default" : "ghost"}
                            onClick={() => setRoleFilter(UserRole.COMPANY_ADMIN)}
                            className={cn(
                                "h-10 px-6 rounded-corner-md font-black text-[10px] uppercase tracking-widest transition-all",
                                roleFilter === UserRole.COMPANY_ADMIN
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            Admins
                        </Button>
                        <Button
                            variant={roleFilter === UserRole.EMPLOYEE ? "default" : "ghost"}
                            onClick={() => setRoleFilter(UserRole.EMPLOYEE)}
                            className={cn(
                                "h-10 px-6 rounded-corner-md font-black text-[10px] uppercase tracking-widest transition-all",
                                roleFilter === UserRole.EMPLOYEE
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            Staff
                        </Button>
                    </div>
                </div>
                {pendingStaff.length > 0 && (
                    <div className="flex items-center gap-3 px-6 h-12 bg-white rounded-corner-lg border border-gray-100 shadow-sm">
                        <Checkbox
                            id="select-all"
                            checked={selectedIds.length === pendingStaff.length && pendingStaff.length > 0}
                            onCheckedChange={toggleSelectAll}
                            className="w-5 h-5 rounded-corner-sm border-gray-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 transition-all"
                        />
                        <label htmlFor="select-all" className="text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer select-none">
                            Select All Pending
                        </label>
                    </div>
                )}

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {selectedIds.length > 0 && (
                        <Button
                            onClick={handleBulkApprove}
                            disabled={isLoading === "bulk"}
                            className="h-12 px-6 rounded-corner-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                        >
                            Approve Selected ({selectedIds.length})
                        </Button>
                    )}
                    <Button
                        onClick={copyInviteLink}
                        className="h-12 px-6 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex-1 md:flex-none"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Invite Member
                    </Button>
                </div>
            </div>

            {/* Pending Approvals Section */}
            {pendingStaff.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <ShieldAlert className="text-amber-500" /> Pending Verification
                        <Badge className="bg-amber-100 text-amber-700 border-none ml-2">{pendingStaff.length}</Badge>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pendingStaff.map((member) => (
                            <StaffCard
                                key={member.id}
                                member={member}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                                isLoading={isLoading}
                                handleApprove={handleApprove}
                                handleToggleBlock={handleToggleBlock}
                                handleRoleUpdate={handleRoleUpdate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Active Staff Section */}
            {activeStaff.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600" /> Active Directory
                        <Badge className="bg-indigo-50 text-indigo-700 border-none ml-2">{activeStaff.length}</Badge>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {activeStaff.map((member) => (
                            <StaffCard
                                key={member.id}
                                member={member}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                                isLoading={isLoading}
                                handleApprove={handleApprove}
                                handleToggleBlock={handleToggleBlock}
                                handleRoleUpdate={handleRoleUpdate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filteredStaff.length === 0 && (
                <div className="text-center py-20 bg-white rounded-corner-xl border border-gray-100">
                    <UserX size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-black text-gray-900 mb-1 tracking-tight">No staff found.</h3>
                    <p className="text-sm text-gray-400 font-medium italic leading-relaxed">Try adjusting your search query or clear filters.</p>
                </div>
            )}


        </div>
    );
}

function StaffCard({
    member,
    selectedIds,
    toggleSelect,
    isLoading,
    handleApprove,
    handleToggleBlock,
    handleRoleUpdate,
}: {
    member: StaffMember;
    selectedIds: string[];
    toggleSelect: (id: string) => void;
    isLoading: string | null;
    handleApprove: (id: string) => void;
    handleToggleBlock: (id: string, isBlocked: boolean) => void;
    handleRoleUpdate: (id: string, role: UserRole) => void;
}) {
    return (
        <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden hover:ring-indigo-100 hover:shadow-md transition-all duration-300 bg-white">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Checkbox
                            checked={selectedIds.includes(member.id)}
                            onCheckedChange={() => toggleSelect(member.id)}
                            className="w-5 h-5 rounded-corner-sm border-gray-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 transition-all focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="relative">
                            <div className="w-14 h-14 bg-indigo-50 rounded-corner-lg flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner uppercase overflow-hidden">
                                {member.avatarUrl ? (
                                    <Image src={member.avatarUrl} alt={member.name || ""} width={56} height={56} className="w-full h-full object-cover" />
                                ) : (
                                    member.name ? member.name[0] : member.email?.[0]
                                )}
                            </div>
                            {member.isActive && (
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-corner-sm p-0.5 border-2 border-white shadow-sm">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-corner-md" disabled={isLoading === member.id} aria-label="More actions">
                                <MoreHorizontal size={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-corner-lg p-2 min-w-[180px]">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 p-2">Actions</DropdownMenuLabel>

                            {!member.isActive && (
                                <DropdownMenuItem onClick={() => handleApprove(member.id)} className="rounded-corner-md flex items-center gap-2 text-emerald-600 font-bold focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer">
                                    <UserCheck size={16} /> Approve Access
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleBlock(member.id, member.isBlocked)} className={`rounded-corner-md flex items-center gap-2 font-bold cursor-pointer ${member.isBlocked ? 'text-emerald-600 focus:bg-emerald-50' : 'text-rose-600 focus:bg-rose-50'}`}>
                                {member.isBlocked ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                {member.isBlocked ? 'Unblock User' : 'Block User'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 p-2">Promote/Demote</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleRoleUpdate(member.id, member.role === UserRole.COMPANY_ADMIN ? UserRole.EMPLOYEE : UserRole.COMPANY_ADMIN)}
                                className="rounded-corner-md flex items-center gap-2 font-bold cursor-pointer"
                            >
                                {member.role === UserRole.COMPANY_ADMIN ? 'Demote to Employee' : 'Promote to Admin'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>



                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-gray-50/50 rounded-corner-lg ring-1 ring-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                        {(() => {
                            const status = member.isBlocked ? 'BLOCKED' : member.isActive ? 'ACTIVE' : 'PENDING';
                            return (
                                <Badge variant={getStatusColor(status)}>
                                    {formatStatus(status)}
                                </Badge>
                            );
                        })()}
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-corner-lg ring-1 ring-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Role</span>
                        <span className={`text-[10px] font-black ${member.role === UserRole.COMPANY_ADMIN ? 'text-indigo-600' : 'text-gray-600'} uppercase`}>
                            {member.role.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="col-span-2 p-3 bg-gray-50/50 rounded-corner-lg ring-1 ring-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Verification</span>
                        <div className="flex items-center gap-2">
                            {member.emailVerifiedAt ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Verified</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200 animate-pulse" />
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-tight">Not Verified</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <CalendarDays size={12} />
                        Joined {format(new Date(member.createdAt), 'MMM dd, yyyy')}
                    </div>
                    {!member.isActive && (
                        <Button
                            size="sm"
                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase px-4 rounded-corner-md shadow-lg shadow-indigo-100 disabled:grayscale disabled:opacity-50"
                            onClick={() => handleApprove(member.id)}
                            disabled={isLoading === member.id || !member.emailVerifiedAt}
                            title={!member.emailVerifiedAt ? "Verification required" : "Approve member"}
                        >
                            {member.emailVerifiedAt ? "APPROVE" : "PENDING VERIFICATION"}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card >
    );
}
