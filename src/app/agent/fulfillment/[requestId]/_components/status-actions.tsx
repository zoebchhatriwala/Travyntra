"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markAsBooked, markAsCompleted } from "../../actions";
import { generateInvoice, updateInvoiceStatus, uploadInvoiceAttachment } from "../../../invoices/actions";
import { Loader2, CheckCircle, Plane, FileText, CheckCircle2, Ban, RefreshCw, Upload, X } from "lucide-react";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { InvoiceStatus, RequestStatus, UserRole } from "@prisma/client";
import { withdrawBid } from "../../../bids/[requestId]/actions";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StatusActionsProps {
    requestId: string;
    currentStatus: string;
    allItemsCompleted: boolean;
    hasItems: boolean;
    invoice: {
        id: string;
        status: InvoiceStatus;
    } | null;
    canRegenerate?: boolean;
    userRole?: UserRole;
    bidId?: string;
}

export function StatusActions({ requestId, currentStatus, allItemsCompleted, hasItems, invoice, canRegenerate, userRole, bidId }: StatusActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    // Generate Invoice State
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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

    async function handleConfirmGenerate() {
        setIsLoading('invoice');
        setIsUploading(true);
        try {
            let pdfUrl: string | undefined;

            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                const uploadResult = await uploadInvoiceAttachment(formData);
                if (uploadResult.error || !uploadResult.url) {
                    toast.error(uploadResult.error || "Failed to upload PDF");
                    setIsLoading(null);
                    setIsUploading(false);
                    return;
                }
                pdfUrl = uploadResult.url;
            }

            const result = await generateInvoice(requestId, pdfUrl);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invoice generated successfully!");
                setIsGenerateDialogOpen(false);
                setSelectedFile(null);
            }
        } catch {
            toast.error("Failed to generate invoice");
        } finally {
            setIsLoading(null);
            setIsUploading(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
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
    async function handleWithdraw() {
        if (!bidId) return;

        const ok = await confirm({
            title: "Withdraw/Reverse Bid",
            description: "Are you sure you want to withdraw or reverse this bid? This will unassign you from this trip and reopen it for other agents. This action cannot be undone.",
            confirmText: "Withdraw Bid",
            variant: "destructive"
        });

        if (!ok) return;

        setIsLoading('withdraw');
        try {
            const result = await withdrawBid(bidId, requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Bid withdrawn and trip unassigned.");
                router.push('/agent/fulfillment');
            }
        } catch {
            toast.error("Failed to withdraw bid");
        } finally {
            setIsLoading(null);
        }
    }

    if (currentStatus === RequestStatus.COMPLETED) {
        return (
            <>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-corner-md font-semibold text-sm">
                        <CheckCircle size={18} />
                        Completed
                    </div>
                    {!invoice ? (
                        userRole === UserRole.TRAVEL_AGENT && (
                            <Button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsGenerateDialogOpen(true);
                                }}
                                disabled={isLoading !== null}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-corner-md font-semibold shadow-lg shadow-indigo-100"
                            >
                                {isLoading === 'invoice' ? (
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                ) : (
                                    <FileText size={16} className="mr-2" />
                                )}
                                Generate Invoice
                            </Button>
                        )
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
                                    {canRegenerate && userRole === UserRole.TRAVEL_AGENT && (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsGenerateDialogOpen(true);
                                                }}
                                                disabled={isLoading !== null}
                                                variant="outline"
                                                className="border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl font-semibold"
                                                title="Update invoice with latest bid details"
                                            >
                                                {isLoading === 'invoice' ? (
                                                    <Loader2 size={16} className="animate-spin mr-2" />
                                                ) : (
                                                    <RefreshCw size={16} className="mr-2" />
                                                )}
                                                Regenerate
                                            </Button>
                                            <div className="h-8 w-px bg-gray-200 mx-1" />
                                        </>
                                    )}
                                    {userRole === UserRole.TRAVEL_AGENT && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <ConfirmDialog />

                <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-corner-xl border-gray-100 p-0 overflow-hidden">
                        <DialogHeader className="px-8 pt-8 pb-4 bg-gray-50/50 border-b border-gray-100">
                            <DialogTitle className="text-xl font-black text-gray-900">Generate Invoice</DialogTitle>
                            <DialogDescription className="text-gray-500 font-medium">
                                Review and finalize the invoice. You can optionally attach a PDF file.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Attach PDF Invoice (Optional)</Label>
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 group text-center cursor-pointer relative">
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileChange}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                            <Upload size={20} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-sm text-gray-900">
                                                {selectedFile ? selectedFile.name : "Click to upload PDF"}
                                            </p>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF up to 10MB"}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedFile && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-rose-50 hover:text-rose-600 z-20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                            }}
                                        >
                                            <X size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 items-start">
                                <div className="mt-0.5 text-blue-600"><FileText size={16} /></div>
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                    The invoice will be automatically generated based on your accepted bid amount. You can void it later if needed.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="px-8 pb-8 pt-4 bg-white">
                            <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)} className="rounded-xl font-bold h-12 border-gray-200">
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmGenerate}
                                disabled={isLoading !== null}
                                className="rounded-xl font-bold h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-200"
                            >
                                {isLoading === 'invoice' ? (
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                ) : (
                                    <FileText size={16} className="mr-2" />
                                )}
                                {isUploading ? 'Uploading PDF...' : (invoice ? 'Update Invoice' : 'Generate Invoice')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    const canComplete = hasItems && allItemsCompleted;

    return (
        <>
            <div className="flex items-center gap-3">
                {currentStatus === RequestStatus.IN_PROGRESS && (
                    <>
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

                        <Button
                            onClick={handleWithdraw}
                            disabled={isLoading !== null}
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold"
                        >
                            {isLoading === 'withdraw' ? (
                                <Loader2 size={16} className="animate-spin mr-2" />
                            ) : (
                                <Ban size={16} className="mr-2" />
                            )}
                            Withdraw Bid
                        </Button>
                    </>
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
            </div>
            <ConfirmDialog />

            <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl border-gray-100 p-0 overflow-hidden">
                    <DialogHeader className="px-8 pt-8 pb-4 bg-gray-50/50 border-b border-gray-100">
                        <DialogTitle className="text-xl font-black text-gray-900">Generate Invoice</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Review and finalize the invoice. You can optionally attach a PDF file.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Attach PDF Invoice (Optional)</Label>
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 group text-center cursor-pointer relative">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileChange}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        <Upload size={20} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm text-gray-900">
                                            {selectedFile ? selectedFile.name : "Click to upload PDF"}
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium">
                                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF up to 10MB"}
                                        </p>
                                    </div>
                                </div>
                                {selectedFile && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-rose-50 hover:text-rose-600 z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                    >
                                        <X size={14} />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 items-start">
                            <div className="mt-0.5 text-blue-600"><FileText size={16} /></div>
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                The invoice will be automatically generated based on your accepted bid amount. You can void it later if needed.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="px-8 pb-8 pt-4 bg-white">
                        <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)} className="rounded-xl font-bold h-12 border-gray-200">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmGenerate}
                            disabled={isLoading !== null}
                            className="rounded-xl font-bold h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-200"
                        >
                            {isLoading === 'invoice' ? (
                                <Loader2 size={16} className="animate-spin mr-2" />
                            ) : (
                                <FileText size={16} className="mr-2" />
                            )}
                            {isUploading ? 'Uploading PDF...' : (invoice ? 'Update Invoice' : 'Generate Invoice')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
