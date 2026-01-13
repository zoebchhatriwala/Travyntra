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
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900 rounded-full">
                        <MoreHorizontal size={20} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                    <DropdownMenuItem
                        onClick={() => router.push(`/company/${slug}/dashboard/requests/${requestId}/edit`)}
                        className="rounded-lg cursor-pointer flex items-center gap-2"
                    >
                        <Edit size={16} />
                        <span>Edit Request</span>
                    </DropdownMenuItem>

                    {canCancel && (
                        <DropdownMenuItem
                            onClick={() => setShowCancelDialog(true)}
                            className="text-amber-600 focus:text-amber-600 rounded-lg cursor-pointer flex items-center gap-2"
                        >
                            <Ban size={16} />
                            <span>Cancel Request</span>
                        </DropdownMenuItem>
                    )}

                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-rose-600 focus:text-rose-600 rounded-lg cursor-pointer flex items-center gap-2"
                            >
                                <Trash2 size={16} />
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
