"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MessageSquare, Loader2 } from "lucide-react";
import { processApproval } from "@/lib/actions/approvals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ApprovalActionsProps {
    requestApprovalStepId: string;
    requestTitle: string;
    stepName: string;
    onSuccess?: () => void;
}

export function ApprovalActions({
    requestApprovalStepId,
    requestTitle,
    stepName,
    onSuccess
}: ApprovalActionsProps) {
    const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [comment, setComment] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOpenDialog = (actionType: 'APPROVE' | 'REJECT') => {
        setAction(actionType);
        setComment("");
    };

    const handleCloseDialog = () => {
        setAction(null);
        setComment("");
    };

    const handleSubmit = async () => {
        if (!action) return;

        setIsProcessing(true);
        try {
            const result = await processApproval({
                requestApprovalStepId,
                action,
                comment: comment.trim() || undefined
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully!`);
                handleCloseDialog();
                if (onSuccess) {
                    onSuccess();
                }
                // Refresh the page to show updated status
                window.location.reload();
            }
        } catch {
            toast.error("Failed to process approval");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 shadow-sm">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <MessageSquare size={20} className="text-orange-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Action Required</h3>
                            <p className="text-sm text-gray-600">This request is awaiting your approval at step: <span className="font-semibold text-gray-900">{stepName}</span></p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleOpenDialog('APPROVE')}
                            className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm"
                        >
                            <Check size={18} className="mr-2" />
                            Approve Request
                        </Button>
                        <Button
                            onClick={() => handleOpenDialog('REJECT')}
                            variant="outline"
                            className="flex-1 h-11 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
                        >
                            <X size={18} className="mr-2" />
                            Reject Request
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!action} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[500px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            {action === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            {action === 'APPROVE'
                                ? 'Approving this request will move it to the next step in the workflow.'
                                : 'Rejecting this request will stop the approval workflow and notify the requester.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <p className="text-sm font-bold text-gray-900">{requestTitle}</p>
                            <p className="text-xs text-gray-600">Step: {stepName}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <MessageSquare size={16} />
                                Comment {action === 'REJECT' && <span className="text-red-500">(Required)</span>}
                            </label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={action === 'APPROVE'
                                    ? "Add an optional comment..."
                                    : "Please provide a reason for rejection..."}
                                className="min-h-[100px] rounded-lg"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={isProcessing}
                            className="rounded-lg"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isProcessing || (action === 'REJECT' && !comment.trim())}
                            className={cn(
                                "rounded-lg font-medium",
                                action === 'APPROVE'
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {action === 'APPROVE' ? <Check size={16} className="mr-2" /> : <X size={16} className="mr-2" />}
                                    Confirm {action === 'APPROVE' ? 'Approval' : 'Rejection'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
