"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MapPin, Calendar, DollarSign, User, MessageSquare, Loader2 } from "lucide-react";
import { processApproval } from "@/lib/actions/approvals";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Approval {
    id: string;
    requestId: string;
    requestTitle: string;
    requestDestination: string;
    requestStartDate: Date;
    requestEndDate: Date;
    requestBudget: number;
    requesterName: string | null;
    requesterEmail: string;
    requesterAvatar: string | null;
    companyName: string;
    companySlug: string;
    stepName: string;
    stepOrder: number;
    createdAt: Date;
    myApprovalStatus: string;
}

interface ApprovalsClientProps {
    initialApprovals: Approval[];
}

export function ApprovalsClient({ initialApprovals }: ApprovalsClientProps) {
    const [approvals, setApprovals] = useState(initialApprovals);
    const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
    const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [comment, setComment] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOpenDialog = (approval: Approval, actionType: 'APPROVE' | 'REJECT') => {
        setSelectedApproval(approval);
        setAction(actionType);
        setComment("");
    };

    const handleCloseDialog = () => {
        setSelectedApproval(null);
        setAction(null);
        setComment("");
    };

    const handleSubmit = async () => {
        if (!selectedApproval || !action) return;

        setIsProcessing(true);
        try {
            const result = await processApproval({
                requestApprovalStepId: selectedApproval.id,
                action,
                comment: comment.trim() || undefined
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully!`);
                // Remove from list
                setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id));
                handleCloseDialog();
            }
        } catch {
            toast.error("Failed to process approval");
        } finally {
            setIsProcessing(false);
        }
    };

    if (approvals.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-16">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto">
                        <Check size={40} className="text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">All Caught Up!</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                        You have no pending approvals at the moment. New requests will appear here when they need your review.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {approvals.map((approval) => (
                    <div
                        key={approval.id}
                        className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all p-6 group"
                    >
                        <div className="flex items-start justify-between gap-6">
                            {/* Left: Request Info */}
                            <div className="flex-1 space-y-4">
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden ring-2 ring-white">
                                        {approval.requesterAvatar ? (
                                            <Image src={approval.requesterAvatar} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                        ) : (
                                            approval.requesterName?.[0] || <User size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {approval.requestTitle}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Requested by <span className="font-bold">{approval.requesterName || approval.requesterEmail}</span>
                                        </p>
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                            <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
                                                Step {approval.stepOrder}: {approval.stepName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
                                        <MapPin size={18} className="text-indigo-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Destination</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">{approval.requestDestination}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
                                        <Calendar size={18} className="text-indigo-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Travel Dates</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {format(new Date(approval.requestStartDate), "MMM d")} - {format(new Date(approval.requestEndDate), "MMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
                                        <DollarSign size={18} className="text-indigo-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Budget</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                ${approval.requestBudget.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <p className="text-xs text-gray-400">
                                    Submitted {format(new Date(approval.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => handleOpenDialog(approval, 'APPROVE')}
                                    className="h-12 px-6 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    Approve
                                </Button>
                                <Button
                                    onClick={() => handleOpenDialog(approval, 'REJECT')}
                                    variant="outline"
                                    className="h-12 px-6 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                >
                                    <X size={18} />
                                    Reject
                                </Button>
                                <Button
                                    variant="ghost"
                                    asChild
                                    className="h-12 px-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-sm"
                                >
                                    <a href={`/company/${approval.companySlug}/dashboard/requests/${approval.requestId}`}>
                                        View Details →
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!selectedApproval && !!action} onOpenChange={handleCloseDialog}>
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

                    {selectedApproval && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                                <p className="text-sm font-bold text-gray-900">{selectedApproval.requestTitle}</p>
                                <p className="text-xs text-gray-600">
                                    Requested by {selectedApproval.requesterName || selectedApproval.requesterEmail}
                                </p>
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
                    )}

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
