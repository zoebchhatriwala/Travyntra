"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveUser, rejectUser } from "../actions";
import { UserRole } from "@prisma/client";
import { useState } from "react";
import { Mail, CalendarDays, Building, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useConfirm } from "@/lib/hooks/use-confirm";

type UserWithCompany = {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    createdAt: Date;
    company?: {
        name: string;
    } | null;
};

interface PendingListProps {
    title: string;
    description: string;
    users: UserWithCompany[];
    type: "AGENT" | "COMPANY";
    accentColor: "blue" | "purple";
}

const colorMap = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-100",
        accent: "bg-blue-500",
        button: "bg-blue-600 hover:bg-blue-700",
    },
    purple: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-100",
        accent: "bg-purple-500",
        button: "bg-purple-600 hover:bg-purple-700",
    }
};

export function PendingList({ title, users, type, accentColor }: PendingListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const colors = colorMap[accentColor];
    const { confirm, ConfirmDialog } = useConfirm();

    const handleApprove = async (id: string) => {
        setLoadingId(id);
        const res = await approveUser(id);
        if (res.success) {
            toast.success("User approved successfully");
        } else {
            toast.error(res.error);
        }
        setLoadingId(null);
    };

    const handleReject = async (id: string) => {
        const ok = await confirm({
            title: "Reject User",
            description: "Are you sure you want to reject and remove this user? This action cannot be undone.",
            confirmText: "Reject",
            variant: "destructive",
        });
        if (!ok) return;
        setLoadingId(id);
        const res = await rejectUser(id);
        if (res.success) {
            toast.success("User rejected successfully");
        } else {
            toast.error(res.error);
        }
        setLoadingId(null);
    };

    if (users.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <Check className="text-emerald-500" size={24} />
                    </div>
                    <CardTitle className="text-gray-900 mb-1">Queue is Clear</CardTitle>
                    <CardDescription>All pending {title.toLowerCase()} have been processed.</CardDescription>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {users.map((user) => (
                <Card key={user.id} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden ring-1 ring-black/5">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <Badge variant="secondary" className={`${colors.bg} ${colors.text} border-none font-semibold px-3 py-1`}>
                                {type === "AGENT" ? "Agency" : "Company Admin"}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                <CalendarDays size={12} />
                                {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                            </div>
                        </div>
                        <div className="mt-4">
                            <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                                {user.name || "Anonymous Requester"}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                                <Mail size={14} />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {type === "COMPANY" && user.company && (
                            <div className={`flex items-center gap-2 p-3 ${colors.bg} rounded-xl border ${colors.border}`}>
                                <Building size={16} className={colors.text} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 leading-none mb-0.5">Organization</span>
                                    <span className={`text-sm font-bold ${colors.text}`}>{user.company.name}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(user.id)}
                                disabled={loadingId === user.id}
                                className="flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors border-gray-200 text-gray-600 font-semibold rounded-xl h-11"
                            >
                                {loadingId === user.id ? "..." : <><X size={16} className="mr-2" /> Reject</>}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleApprove(user.id)}
                                disabled={loadingId === user.id}
                                className={`flex-1 ${colors.button} text-white shadow-lg shadow-primary/20 transition-all active:scale-95 font-semibold rounded-xl h-11`}
                            >
                                {loadingId === user.id ? "Processing..." : <><Check size={16} className="mr-2" /> Approve</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <ConfirmDialog />
        </div>
    );
}
