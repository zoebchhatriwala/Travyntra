"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { uploadInvoicePdf } from "../actions";

interface UploadInvoiceDialogProps {
    invoiceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPdfUrl?: string | null;
}

export function UploadInvoiceDialog({ invoiceId, open, onOpenChange, currentPdfUrl }: UploadInvoiceDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== "application/pdf") {
                toast.error("Please select a PDF file");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("invoiceId", invoiceId);

        startTransition(async () => {
            const result = await uploadInvoicePdf(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invoice PDF uploaded successfully");
                onOpenChange(false);
                setFile(null);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Invoice PDF</DialogTitle>
                    <DialogDescription>
                        Upload the official invoice PDF. This will be accessible to the client.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {currentPdfUrl && (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-corner-sm text-sm mb-4">
                            <FileText size={16} />
                            <span className="font-medium flex-1">Current Invoice PDF</span>
                            <a
                                href={currentPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-indigo-100 rounded-corner-sm transition-colors"
                            >
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    )}

                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="invoice-pdf">Invoice PDF</Label>
                        <Input
                            id="invoice-pdf"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            disabled={isPending}
                        />
                        <p className="text-[10px] text-gray-500">Only PDF files are allowed.</p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || isPending}
                        className="gap-2"
                    >
                        {isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Upload size={16} />
                        )}
                        Upload
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
