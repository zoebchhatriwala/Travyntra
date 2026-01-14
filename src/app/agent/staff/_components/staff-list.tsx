"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { UserRole } from "@/lib/constants/roles";
import { Plus, Search, MoreVertical, User as UserIcon, Ban, CheckCircle, Trash2, Shield, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createAgencyStaff, updateStaffStatus, deleteAgencyStaff, updateStaffRole } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/lib/hooks/use-confirm";

// Since I am not sure if 'sonner' is installed, I will try to use a basic error handling or see if there is a 'useToast' hook.
// I saw 'components/ui/use-toast.ts' in some projects, but here I only saw components/ui listing.
// I'll stick to a simple alert for now or try to use a standard hook if I find one.
// Actually, I'll just use browsing native confirm/alert if needed, but for notifications, I'll assume `sonner` or `react-hot-toast` is common. I will omit toast for now to avoid errors and just rely on state.

export function StaffList({ initialStaff }: { initialStaff: User[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const { confirm, ConfirmDialog } = useConfirm();

    const filteredStaff = initialStaff.filter(
        (staff) =>
            staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            staff.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const result = await createAgencyStaff({ name, email, password });

        if (result.success) {
            setIsAddOpen(false);
            toast.success("Staff member added successfully");
            router.refresh();
        } else {
            toast.error(result.error);
        }
        setIsLoading(false);
    }

    async function handleToggleStatus(id: string, isBlocked: boolean) {
        const ok = await confirm({
            title: isBlocked ? "Block Account" : "Unblock Account",
            description: `Are you sure you want to ${isBlocked ? "block" : "unblock"} this user?`,
            confirmText: isBlocked ? "Block" : "Unblock",
            variant: isBlocked ? "destructive" : "default",
        });

        if (!ok) return;

        const result = await updateStaffStatus(id, isBlocked);
        if (result.success) {
            toast.success(`Account ${isBlocked ? "blocked" : "unblocked"} successfully`);
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    async function handleDeleteStaff(id: string) {
        const ok = await confirm({
            title: "Delete Account",
            description: "Are you sure you want to delete this staff member? This action cannot be undone.",
            confirmText: "Delete",
            variant: "destructive",
        });

        if (!ok) return;

        const result = await deleteAgencyStaff(id);
        if (result.success) {
            toast.success("Staff member deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    async function handleUpdateRole(id: string, newRole: UserRole) {
        const action = newRole === UserRole.TRAVEL_AGENT ? "promote this user to Admin" : "demote this user to Staff";

        const ok = await confirm({
            title: "Update Role",
            description: `Are you sure you want to ${action}?`,
            confirmText: "Update",
        });

        if (!ok) return;

        const result = await updateStaffRole(id, newRole);
        if (result.success) {
            toast.success("Role updated successfully");
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search staff..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Staff Member</DialogTitle>
                            <DialogDescription>
                                Add a new employee to your agency. They will receive an email to set their password.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input name="name" required placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input name="email" type="email" required placeholder="john@example.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input name="password" type="password" required placeholder="••••••••" minLength={8} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Adding..." : "Add Member"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Member</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Joined</th>
                            <th className="px-6 py-4 relative"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStaff.map((member) => (
                            <tr key={member.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-gray-200">
                                            <AvatarImage src={member.avatarUrl || undefined} />
                                            <AvatarFallback className="bg-indigo-50 text-indigo-600 font-medium">
                                                {member.name?.[0] || member.email[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold text-gray-900">{member.name}</div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant="secondary" className={
                                        member.role === UserRole.TRAVEL_AGENT
                                            ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                                            : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                    }>
                                        {member.role === UserRole.TRAVEL_AGENT ? "Admin" : "Staff"}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {member.isBlocked ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                <Ban size={12} /> Blocked
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                <CheckCircle size={12} /> Active
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(member.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {member.role !== UserRole.TRAVEL_AGENT && (
                                                <>
                                                    <DropdownMenuItem
                                                        className={member.isBlocked ? "text-emerald-600" : "text-amber-600"}
                                                        onClick={() => handleToggleStatus(member.id, !member.isBlocked)}
                                                    >
                                                        {member.isBlocked ? (
                                                            <>
                                                                <CheckCircle className="mr-2 h-4 w-4" /> Unblock Account
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Ban className="mr-2 h-4 w-4" /> Block Account
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        className="text-indigo-600"
                                                        onClick={() => handleUpdateRole(member.id, UserRole.TRAVEL_AGENT)}
                                                    >
                                                        <Shield className="mr-2 h-4 w-4" /> Promote to Admin
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {member.role === UserRole.TRAVEL_AGENT && (
                                                <DropdownMenuItem
                                                    className="text-gray-600"
                                                    onClick={() => handleUpdateRole(member.id, UserRole.AGENCY_EMPLOYEE)}
                                                >
                                                    <UserCog className="mr-2 h-4 w-4" /> Demote to Staff
                                                </DropdownMenuItem>
                                            )}

                                            {member.role !== UserRole.TRAVEL_AGENT && (
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    onClick={() => handleDeleteStaff(member.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                        {filteredStaff.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <p className="font-medium">No staff members found</p>
                                    <p className="text-sm">Try adjusting your search or add a new member.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmDialog />
        </div>
    );
}
