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
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-200 p-6 shadow-lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Action Required</h3>
                            <p className="text-sm text-gray-600">This request is awaiting your approval at step: <span className="font-bold">{stepName}</span></p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleOpenDialog('APPROVE')}
                            className="flex-1 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
                        >
                            <Check size={18} className="mr-2" />
                            Approve Request
                        </Button>
                        <Button
                            onClick={() => handleOpenDialog('REJECT')}
                            variant="outline"
                            className="flex-1 h-12 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded-xl font-black uppercase tracking-wider transition-all"
                        >
                            <X size={18} className="mr-2" />
                            Reject Request
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!action} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                            {action === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            {action === 'APPROVE'
                                ? 'Approving this request will move it to the next step in the workflow.'
                                : 'Rejecting this request will stop the approval workflow and notify the requester.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                            <p className="text-sm font-bold text-gray-900">{requestTitle}</p>
                            <p className="text-xs text-gray-600">Step: {stepName}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <MessageSquare size={16} />
                                Comment {action === 'REJECT' && <span className="text-red-500">(Required)</span>}
                            </label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={action === 'APPROVE'
                                    ? "Add an optional comment..."
                                    : "Please provide a reason for rejection..."}
                                className="min-h-[100px] rounded-2xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={isProcessing}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isProcessing || (action === 'REJECT' && !comment.trim())}
                            className={cn(
                                "rounded-xl font-bold",
                                action === 'APPROVE'
                                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                    : "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
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
