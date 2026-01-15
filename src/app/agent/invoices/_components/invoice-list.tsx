"use client";

import {
    CreditCard,
    ArrowUpRight,
    Receipt,
    TrendingUp,
    Clock,
    Building2,
    Calendar,
    FileText,
    Download,
    Upload,
    Filter
} from "lucide-react";
import { UploadInvoiceDialog } from "./upload-invoice-dialog";
import { format } from "date-fns";
import {
    Card,
    CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatus } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { exportToCSV, generatePDF } from "@/lib/utils/export";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, MoreVertical } from "lucide-react";
import { updateInvoiceStatus } from "../actions";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/search-input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";

interface Invoice {
    id: string;
    amount: number;
    subtotal?: number;
    taxes?: any[];
    currency: string;
    convertedAmount: number;
    status: InvoiceStatus;
    dueDate: Date | null;
    createdAt: Date;
    companyName: string;
    requestTitle: string;
    requestId: string;
    pdfUrl?: string | null;
}

interface InvoiceListProps {
    invoices: Invoice[];
    agencyCurrency: string;
    metadata: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
    };
    stats: {
        totalBilled: number;
        pendingAmount: number;
    };
}

const getStatusStyles = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.PAID:
            return "bg-emerald-100 text-emerald-600 border-none px-3";
        case InvoiceStatus.PENDING:
            return "bg-amber-100 text-amber-600 border-none px-3";
        case InvoiceStatus.OVERDUE:
            return "bg-rose-100 text-rose-600 border-none px-3";
        case InvoiceStatus.VOID:
            return "bg-gray-100 text-gray-500 border-none px-3";
        default:
            return "bg-gray-100 text-gray-600";
    }
};

export function InvoiceList({ invoices, agencyCurrency, metadata, stats }: InvoiceListProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedInvoiceForUpload, setSelectedInvoiceForUpload] = useState<Invoice | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const totalBilled = stats.totalBilled;
    const pendingAmount = stats.pendingAmount;
    const totalInvoiceCount = metadata.totalCount;

    const handleFilterChange = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
        if (!isMounted) return "...";
        return num.toLocaleString(undefined, options);
    };

    const handleExportCSV = () => {
        const exportData = invoices.map(inv => {
            const taxDetails = (inv.taxes || []).map(t => `${t.label}: ${t.calculatedAmount.toFixed(2)}`).join('; ');
            return {
                'Invoice ID': inv.id,
                'Client': inv.companyName,
                'Request': inv.requestTitle,
                'Issued Date': format(new Date(inv.createdAt), 'yyyy-MM-dd'),
                'Subtotal': inv.subtotal || inv.amount,
                'Taxes': taxDetails,
                'Total Amount': inv.amount,
                'Currency': inv.currency,
                'Status': inv.status
            };
        });
        exportToCSV(exportData, `agency_invoices`);
    };

    const handleExportPDF = () => {
        const headers = ['Client', 'Request', 'Issued Date', 'Subtotal', 'Taxes', 'Total', 'Status'];
        const data = invoices.map(inv => {
            const taxSum = (inv.taxes || []).reduce((sum, t) => sum + t.calculatedAmount, 0);
            return [
                inv.companyName,
                inv.requestTitle,
                format(new Date(inv.createdAt), 'MMM dd, yyyy'),
                (inv.subtotal || inv.amount).toFixed(2),
                taxSum.toFixed(2),
                inv.amount.toFixed(2),
                inv.status
            ];
        });
        generatePDF(headers, data, 'agency_invoices', 'Agency Accounts Receivable');
    };

    const handleUpdateStatus = async (invoiceId: string, status: InvoiceStatus) => {
        const result = await updateInvoiceStatus(invoiceId, status);
        if (result.success) {
            toast.success(`Invoice marked as ${status.toLowerCase()}`);
        } else {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Invoice Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
                            <p className="text-xl font-black text-gray-900">{agencyCurrency} {formatNumber(totalBilled, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding</p>
                            <p className="text-xl font-black text-amber-600">{agencyCurrency} {formatNumber(pendingAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoices Issued</p>
                            <p className="text-xl font-black text-gray-900">{totalInvoiceCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency</p>
                            <p className="text-xl font-black text-gray-900">100%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Accounts / <span className="text-indigo-600 italic underline decoration-indigo-200">Receivables</span></h3>
                        <p className="text-sm text-gray-400 font-medium">Manage and track all issued invoices across corporate clients.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl border-gray-100 font-bold hover:bg-gray-50 text-xs px-6"
                            onClick={handleExportCSV}
                        >
                            <Download size={16} className="mr-2" /> Export CSV
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-gray-100 font-bold hover:bg-gray-50 text-xs px-6"
                            onClick={handleExportPDF}
                        >
                            <FileText size={16} className="mr-2" /> Export PDF
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-gray-50 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Filter size={16} className="text-indigo-600" />
                        Filters
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <SearchInput placeholder="Search by company or trip..." />
                        </div>
                        <Select
                            value={searchParams.get("status") || "ALL"}
                            onValueChange={(value) => handleFilterChange("status", value === "ALL" ? null : value)}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="OVERDUE">Overdue</SelectItem>
                                <SelectItem value="VOID">Void</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                placeholder="Start Date"
                                value={searchParams.get("startDate") || ""}
                                onChange={(e) => handleFilterChange("startDate", e.target.value || null)}
                                className="rounded-xl"
                            />
                            <Input
                                type="date"
                                placeholder="End Date"
                                value={searchParams.get("endDate") || ""}
                                onChange={(e) => handleFilterChange("endDate", e.target.value || null)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Client & Request</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Issued Date</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-32 text-center bg-gray-50/20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm ring-1 ring-gray-100 flex items-center justify-center text-gray-200">
                                                <FileText size={32} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No invoices found</p>
                                                <p className="text-gray-300 text-[10px] italic">Invoices appear here once you generate them from completed requests.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-xl">
                                                    <Building2 size={16} className="text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">{invoice.companyName}</p>
                                                    <p className="text-xs font-semibold text-gray-400 mt-1">{invoice.requestTitle}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <Calendar size={14} className="text-gray-400" />
                                                {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                {invoice.dueDate ? (
                                                    <>
                                                        <Clock size={14} className="text-gray-400" />
                                                        {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                                                    </>
                                                ) : '-'}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-sm font-black text-gray-900">{invoice.currency} {formatNumber(invoice.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <Badge className={`font-black text-[9px] uppercase tracking-widest h-6 rounded-[8px] flex items-center justify-center w-fit ${getStatusStyles(invoice.status)}`}>
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {invoice.status !== InvoiceStatus.PAID && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(invoice.id, InvoiceStatus.PAID)}
                                                        className="h-8 rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-[10px] items-center gap-1.5 hidden md:flex"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Mark Paid
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                                            <MoreVertical size={16} className="text-gray-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-2xl border-gray-100 shadow-2xl p-2">
                                                        {invoice.status !== InvoiceStatus.PAID && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleUpdateStatus(invoice.id, InvoiceStatus.PAID)}
                                                                className="flex items-center gap-2 text-emerald-600 font-bold cursor-pointer rounded-xl p-3 md:hidden"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                                Mark as Paid
                                                            </DropdownMenuItem>
                                                        )}
                                                        <Link href={`/agent/fulfillment/${invoice.requestId}`} className="contents">
                                                            <DropdownMenuItem className="flex items-center gap-2 text-gray-600 font-bold cursor-pointer rounded-xl p-3">
                                                                <ArrowUpRight size={16} />
                                                                View Request
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedInvoiceForUpload(invoice);
                                                                setUploadDialogOpen(true);
                                                            }}
                                                            className="flex items-center gap-2 text-indigo-600 font-bold cursor-pointer rounded-xl p-3"
                                                        >
                                                            <Upload size={16} />
                                                            Upload PDF
                                                        </DropdownMenuItem>
                                                        {invoice.status !== InvoiceStatus.PAID && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleUpdateStatus(invoice.id, InvoiceStatus.VOID)}
                                                                className="flex items-center gap-2 text-rose-600 font-bold cursor-pointer rounded-xl p-3"
                                                            >
                                                                <Clock size={16} />
                                                                Void Invoice
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-gray-50">
                    <PaginationControls
                        totalCount={metadata.totalCount}
                        pageSize={10}
                    />
                </div>
            </Card>

            {selectedInvoiceForUpload && (
                <UploadInvoiceDialog
                    invoiceId={selectedInvoiceForUpload.id}
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                    currentPdfUrl={selectedInvoiceForUpload.pdfUrl}
                />
            )}
        </div>
    );
}
