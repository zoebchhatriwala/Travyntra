"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markAsBooked, markAsCompleted } from "../../actions";
import { generateInvoice, updateInvoiceStatus } from "../../../invoices/actions";
import { Loader2, CheckCircle, Plane, FileText, CheckCircle2, Ban } from "lucide-react";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { InvoiceStatus } from "@prisma/client";

interface StatusActionsProps {
    requestId: string;
    currentStatus: string;
    allItemsCompleted: boolean;
    hasItems: boolean;
    invoice: {
        id: string;
        status: InvoiceStatus;
    } | null;
}

export function StatusActions({ requestId, currentStatus, allItemsCompleted, hasItems, invoice }: StatusActionsProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    async function handleMarkBooked() {
        setIsLoading('booked');
        try {
            const result = await markAsBooked(requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request marked as booked!");
            }
        } catch {
            toast.error("Failed to update status");
        } finally {
            setIsLoading(null);
        }
    }

    async function handleMarkCompleted() {
        if (!hasItems) {
            toast.error("Please add at least one checklist item");
            return;
        }

        if (!allItemsCompleted) {
            toast.error("Complete all checklist items first");
            return;
        }

        const ok = await confirm({
            title: "Complete Request",
            description: "Are you sure you want to mark this request as completed? This action cannot be undone.",
            confirmText: "Complete",
        });

        if (!ok) {
            return;
        }

        setIsLoading('completed');
        try {
            const result = await markAsCompleted(requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request completed successfully!");
            }
        } catch {
            toast.error("Failed to complete request");
        } finally {
            setIsLoading(null);
        }
    }

    async function handleGenerateInvoice() {
        setIsLoading('invoice');
        try {
            const result = await generateInvoice(requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invoice generated successfully!");
            }
        } catch {
            toast.error("Failed to generate invoice");
        } finally {
            setIsLoading(null);
        }
    }

    async function handleMarkPaid() {
        if (!invoice) return;

        setIsLoading('paid');
        try {
            const result = await updateInvoiceStatus(invoice.id, InvoiceStatus.PAID);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invoice marked as paid!");
            }
        } catch {
            toast.error("Failed to update invoice status");
        } finally {
            setIsLoading(null);
        }
    }

    async function handleVoidInvoice() {
        if (!invoice) return;

        const ok = await confirm({
            title: "Void Invoice",
            description: "Are you sure you want to void this invoice? This action cannot be undone.",
            confirmText: "Void",
            variant: "destructive"
        });

        if (!ok) return;

        setIsLoading('void');
        try {
            const result = await updateInvoiceStatus(invoice.id, InvoiceStatus.VOID);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invoice voided successfully");
            }
        } catch {
            toast.error("Failed to void invoice");
        } finally {
            setIsLoading(null);
        }
    }

    if (currentStatus === 'COMPLETED') {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-semibold text-sm">
                    <CheckCircle size={18} />
                    Completed
                </div>
                {!invoice ? (
                    <Button
                        onClick={handleGenerateInvoice}
                        disabled={isLoading !== null}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-100"
                    >
                        {isLoading === 'invoice' ? (
                            <Loader2 size={16} className="animate-spin mr-2" />
                        ) : (
                            <FileText size={16} className="mr-2" />
                        )}
                        Generate Invoice
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        {invoice.status === InvoiceStatus.PAID ? (
                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-semibold text-sm border border-indigo-100">
                                <CheckCircle2 size={18} className="text-indigo-600" />
                                Invoice Paid
                            </div>
                        ) : invoice.status === InvoiceStatus.VOID ? (
                            <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-semibold text-sm border border-gray-200">
                                <Ban size={18} />
                                Invoice Voided
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleMarkPaid}
                                    disabled={isLoading !== null}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-100"
                                >
                                    {isLoading === 'paid' ? (
                                        <Loader2 size={16} className="animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle2 size={16} className="mr-2" />
                                    )}
                                    Mark as Paid
                                </Button>
                                <Button
                                    onClick={handleVoidInvoice}
                                    disabled={isLoading !== null}
                                    variant="outline"
                                    className="border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl font-semibold"
                                >
                                    {isLoading === 'void' ? (
                                        <Loader2 size={16} className="animate-spin mr-2" />
                                    ) : (
                                        <Ban size={16} className="mr-2" />
                                    )}
                                    Void
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const canComplete = hasItems && allItemsCompleted;

    return (
        <div className="flex items-center gap-3">
            {currentStatus === 'IN_PROGRESS' && (
                <Button
                    onClick={handleMarkBooked}
                    disabled={isLoading !== null}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-semibold"
                >
                    {isLoading === 'booked' ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                        <Plane size={16} className="mr-2" />
                    )}
                    Mark as Booked
                </Button>
            )}

            <Button
                onClick={handleMarkCompleted}
                disabled={isLoading !== null || !canComplete}
                className={`rounded-xl font-semibold shadow-lg ${canComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                title={!canComplete ? 'Complete all checklist items to enable' : ''}
            >
                {isLoading === 'completed' ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                    <CheckCircle size={16} className="mr-2" />
                )}
                Mark as Complete
            </Button>
            <ConfirmDialog />
        </div>
    );
}
