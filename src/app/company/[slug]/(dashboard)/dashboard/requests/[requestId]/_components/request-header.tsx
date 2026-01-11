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

    const isOwner = currentUser.id === request.userId;
    const isAdmin = currentUser.role === 'COMPANY_ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const canEdit = isOwner || isAdmin;
    const canCancel = isOwner; // Currently action restricts to owner only

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this request?")) return;

        setIsCancelling(true);
        try {
            const result = await cancelTripRequest(request.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request cancelled successfully");
                router.refresh();
            }
        } catch (e) {
            toast.error("Failed to cancel request");
        } finally {
            setIsCancelling(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
            case 'REJECTED': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
            case 'COMPLETED': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
            case 'CANCELLED': return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
            case 'BOOKED': return 'bg-purple-100 text-purple-700 hover:bg-purple-100';
            default: return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
        }
    };

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">{request.title}</h1>
                    <p className="text-sm text-gray-500 font-medium">Request ID: <span className="font-mono">{request.id.slice(0, 8)}</span></p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Badge className={`px-3 py-1.5 text-xs font-bold rounded-xl border-none ${getStatusColor(request.status)}`}>
                    {request.status.replace(/_/g, " ")}
                </Badge>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                            <MoreHorizontal size={20} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        {canEdit && (
                            <DropdownMenuItem asChild>
                                <Link href={`/company/${slug}/dashboard/requests/${request.id}/edit`} className="cursor-pointer font-medium">
                                    <Edit size={16} className="mr-2" />
                                    Edit Request
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canCancel && request.status !== 'CANCELLED' && request.status !== 'COMPLETED' && request.status !== 'REJECTED' && (
                            <DropdownMenuItem onClick={handleCancel} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-medium" disabled={isCancelling}>
                                <Ban size={16} className="mr-2" />
                                Cancel Request
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
