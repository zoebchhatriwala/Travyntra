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
                    className="w-48 rounded-lg p-1 border-gray-200 shadow-lg bg-white"
                >
                    <DropdownMenuItem
                        onClick={() => router.push(`/company/${slug}/dashboard/requests/${requestId}/edit`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                    >
                        <Edit size={18} className="text-indigo-600" />
                        <span>Edit Request</span>
                    </DropdownMenuItem>

                    {canCancel && (
                        <DropdownMenuItem
                            onClick={() => setShowCancelDialog(true)}
                            className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm text-orange-600 hover:bg-orange-50 focus:bg-orange-50"
                        >
                            <Ban size={18} />
                            <span>Cancel Request</span>
                        </DropdownMenuItem>
                    )}

                    {canDelete && (
                        <>
                            <DropdownMenuSeparator className="my-1 bg-gray-100" />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm text-red-600 hover:bg-red-50 focus:bg-red-50"
                            >
                                <Trash2 size={18} />
                                <span>Delete Request</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent className="rounded-xl sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Cancel Request?</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Are you sure you want to cancel this travel request? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCancelDialog(false)} className="rounded-lg font-medium">
                            Keep Request
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
                        >
                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="rounded-xl sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Delete Request?</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            This will permanently delete the travel request. This action cannot be rolled back.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="rounded-lg font-medium">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
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
