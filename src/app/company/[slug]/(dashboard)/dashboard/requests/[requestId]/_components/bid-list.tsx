"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { approveBid, unapproveBid } from "@/app/agent/bids/[requestId]/actions";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { type Money, formatMoney } from "@/lib/types/money";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface Bid {
    id: string;
    amount: Money | null;
    convertedAmount?: Money | null;
    status: string;
    message?: string | null;
    agent: {
        name: string;
        logoUrl?: string | null;
    };
}

export function BidList({ bids, requestId, isAuthorized }: { bids: Bid[], requestId: string, isAuthorized: boolean }) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    async function handleApprove(bidId: string) {
        const ok = await confirm({
            title: "Approve Proposal",
            description: "Are you sure you want to approve this bid? This will reject all other bids.",
            confirmText: "Approve",
        });

        if (!ok) return;

        setProcessingId(bidId);
        try {
            const res = await approveBid(bidId, requestId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Bid approved successfully");
            }
        } catch {
            toast.error("Failed to approve bid");
        } finally {
            setProcessingId(null);
        }
    }

    async function handleUnapprove(bidId: string) {
        const ok = await confirm({
            title: "Undo Approval",
            description: "Are you sure you want to undo the approval for this bid? This will reopen bidding for others.",
            confirmText: "Undo Approval",
            variant: "destructive",
        });

        if (!ok) return;

        setProcessingId(bidId);
        try {
            const res = await unapproveBid(bidId, requestId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Approval reversed successfully");
            }
        } catch {
            toast.error("Failed to reverse approval");
        } finally {
            setProcessingId(null);
        }
    }

    if (!bids || bids.length === 0) return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                Received Bids <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{bids.length}</span>
            </h3>
            <div className="grid gap-4">
                {bids.map(bid => (
                    <div key={bid.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-xl text-gray-900">
                                    {bid.amount ? formatMoney(bid.amount) : 'N/A'}
                                </span>
                                {bid.convertedAmount && (
                                    <span className="text-sm font-bold text-gray-400">
                                        ≈ {formatMoney(bid.convertedAmount)}
                                    </span>
                                )}
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${bid.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                    bid.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                        'bg-indigo-50 text-indigo-700'
                                    }`}>
                                    {bid.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {bid.agent.logoUrl ? (
                                        <Image src={bid.agent.logoUrl} alt="" width={20} height={20} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-500">{bid.agent.name[0]}</span>
                                    )}
                                </div>
                                <span className="font-medium text-gray-900">{bid.agent.name}</span>
                            </div>
                            {bid.message && (
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl max-w-lg border border-gray-100">
                                    {bid.message}
                                </p>
                            )}
                        </div>

                        <div className="flex-shrink-0">
                            {isAuthorized && bid.status === 'PENDING' && (
                                <Button
                                    onClick={() => handleApprove(bid.id)}
                                    disabled={!!processingId}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200"
                                >
                                    {processingId === bid.id ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                    Approve Proposal
                                </Button>
                            )}

                            {bid.status === 'ACCEPTED' && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                                        <CheckCircle2 size={18} />
                                        Approved
                                    </div>
                                    {isAuthorized && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnapprove(bid.id)}
                                            disabled={!!processingId}
                                            className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold uppercase tracking-tight h-7"
                                        >
                                            {processingId === bid.id ? <Loader2 className="animate-spin mr-1" size={12} /> : <RotateCcw size={12} className="mr-1" />}
                                            Undo Selection
                                        </Button>
                                    )}
                                </div>
                            )}

                            {bid.status === 'REJECTED' && (
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                    <XCircle size={18} />
                                    Rejected
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmDialog />
        </div>
    );
}
