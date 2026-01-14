"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Ban, Trash2, Edit, Loader2 } from "lucide-react";
import { useState } from "react";
import { cancelTripRequest, deleteTripRequest } from "../../../actions";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RequestActionsProps {
    requestId: string;
    status: string;
    slug: string;
}

export function RequestActions({ requestId, status, slug }: RequestActionsProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const router = useRouter();

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            const result = await cancelTripRequest(requestId);
            if (result.success) {
                toast.success("Request cancelled successfully");
                setShowCancelDialog(false);
            } else {
                toast.error(result.error || "Failed to cancel request");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteTripRequest(requestId);
            if (result.success) {
                toast.success("Request deleted successfully");
                router.push(`/company/${slug}/dashboard/requests`);
            } else {
                toast.error(result.error || "Failed to delete request");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsDeleting(false);
        }
    };

    const canCancel = !['COMPLETED', 'REJECTED', 'CANCELLED', 'BOOKED'].includes(status);

    const canDelete = ['DRAFT', 'CANCELLED'].includes(status);

    return (
        <>
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
                    <DropdownMenuItem
                        onClick={() => router.push(`/company/${slug}/dashboard/requests/${requestId}/edit`)}
                        className="flex items-center gap-3 px-4 py-3 rounded-[20px] cursor-pointer font-bold text-gray-700 focus:bg-indigo-50 focus:text-indigo-600 transition-colors"
                    >
                        <div className="p-2 bg-indigo-50 rounded-xl group-focus:bg-indigo-100">
                            <Edit size={16} />
                        </div>
                        <span>Edit Request</span>
                    </DropdownMenuItem>

                    {canCancel && (
                        <DropdownMenuItem
                            onClick={() => setShowCancelDialog(true)}
                            className="flex items-center gap-3 px-4 py-3 rounded-[20px] cursor-pointer font-bold text-amber-600 focus:bg-amber-50 focus:text-amber-700 transition-colors mt-1"
                        >
                            <div className="p-2 bg-amber-50 rounded-xl group-focus:bg-amber-100">
                                <Ban size={16} />
                            </div>
                            <span>Cancel Request</span>
                        </DropdownMenuItem>
                    )}

                    {canDelete && (
                        <>
                            <DropdownMenuSeparator className="my-2 bg-slate-50" />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="flex items-center gap-3 px-4 py-3 rounded-[20px] cursor-pointer font-bold text-rose-600 focus:bg-rose-50 focus:text-rose-700 transition-colors"
                            >
                                <div className="p-2 bg-rose-50 rounded-xl group-focus:bg-rose-100">
                                    <Trash2 size={16} />
                                </div>
                                <span>Delete Request</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent className="rounded-[32px] sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Cancel Request?</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Are you sure you want to cancel this travel request? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowCancelDialog(false)} className="rounded-xl font-bold">
                            Keep Request
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest text-xs"
                        >
                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="rounded-[32px] sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Delete Request?</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            This will permanently delete the travel request. This action cannot be rolled back.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-xs"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
