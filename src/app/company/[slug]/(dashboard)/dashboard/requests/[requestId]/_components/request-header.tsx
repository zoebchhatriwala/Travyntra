"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Ban, FileText } from "lucide-react";
import Link from "next/link";
import { cancelTripRequest } from "../../../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/hooks/use-confirm";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RequestHeaderProps {
    request: {
        id: string;
        title: string;
        status: string;
        userId: string;
    };
    currentUser: {
        id: string;
        role: string;
    };
    slug: string;
}

export function RequestHeader({ request, currentUser, slug }: RequestHeaderProps) {
    const router = useRouter();
    const [isCancelling, setIsCancelling] = useState(false);
    const { confirm, ConfirmDialog } = useConfirm();

    const isOwner = currentUser.id === request.userId;
    const isAdmin = currentUser.role === 'COMPANY_ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const canEdit = isOwner || isAdmin;
    const canCancel = isOwner; // Currently action restricts to owner only

    const handleCancel = async () => {
        const ok = await confirm({
            title: "Cancel Request",
            description: "Are you sure you want to cancel this request? This action cannot be undone.",
            confirmText: "Cancel Request",
            variant: "destructive",
        });

        if (!ok) return;
        setIsCancelling(true);
        try {
            const result = await cancelTripRequest(request.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request cancelled successfully");
                router.refresh();
            }
        } catch {
            toast.error("Failed to cancel request");
        } finally {
            setIsCancelling(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
            case 'COMPLETED': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';
            case 'CANCELLED': return 'bg-slate-50 text-slate-700 ring-1 ring-slate-100';
            case 'BOOKED': return 'bg-violet-50 text-violet-700 ring-1 ring-violet-100';
            case 'PENDING_AGENT_ACTION': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 animate-pulse-subtle';
            case 'PENDING_COMPANY_APPROVAL': return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100';
            default: return 'bg-slate-50 text-slate-700 ring-1 ring-slate-100';
        }
    };

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                    <FileText size={24} />
                </div>
                <div className="min-w-0 flex-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight truncate">{request.title}</h1>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{request.title}</p>
                        </TooltipContent>
                    </Tooltip>
                    <p className="text-sm text-gray-500 font-medium truncate">Request ID: <span className="font-mono">{request.id.slice(0, 8)}</span></p>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
                <Badge className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border-none shadow-sm transition-all duration-500",
                    getStatusStyles(request.status)
                )}>
                    {request.status.replace(/_/g, " ")}
                </Badge>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-300"
                        >
                            <MoreHorizontal size={22} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-[28px] p-2 border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                    >
                        {canEdit && (
                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/company/${slug}/dashboard/requests/${request.id}/edit`}
                                    className="flex items-center gap-3 px-4 py-3 rounded-[20px] cursor-pointer font-bold text-gray-700 focus:bg-indigo-50 focus:text-indigo-600 transition-colors"
                                >
                                    <div className="p-2 bg-indigo-50 rounded-xl group-focus:bg-indigo-100">
                                        <Edit size={16} />
                                    </div>
                                    Edit Request
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canCancel && request.status !== 'CANCELLED' && request.status !== 'COMPLETED' && request.status !== 'REJECTED' && (
                            <DropdownMenuItem
                                onClick={handleCancel}
                                className="flex items-center gap-3 px-4 py-3 rounded-[20px] cursor-pointer font-bold text-rose-600 focus:bg-rose-50 focus:text-rose-700 transition-colors mt-1"
                                disabled={isCancelling}
                            >
                                <div className="p-2 bg-rose-50 rounded-xl group-focus:bg-rose-100">
                                    <Ban size={16} />
                                </div>
                                Cancel Request
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ConfirmDialog />
        </div>
    );
}
