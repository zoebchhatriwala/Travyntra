"use client";

import {
    CreditCard,
    Download,
    ArrowUpRight,
    Receipt,
    TrendingUp,
    Clock,
    FileText,
    Filter
} from "lucide-react";
import { format } from "date-fns";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatus } from "@prisma/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { exportToCSV, generatePDF } from "@/lib/utils/export";
import { voidInvoice } from "../actions";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Ban } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { type Invoice } from "@/types/finance/invoice";

interface BillingListProps {
    invoices: Invoice[];
    currency: string;
    companySlug: string;
    metadata: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
    };
    stats: {
        totalSpent: number;
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


export function BillingList({ invoices, currency, companySlug, metadata, stats }: BillingListProps) {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

    const totalSpent = stats.totalSpent;
    const pendingAmount = stats.pendingAmount;
    const averageCost = metadata.totalCount > 0 ? (totalSpent + pendingAmount) / metadata.totalCount : 0;

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
                'Description': inv.description,
                'Agency': inv.recipient,
                'Date': format(new Date(inv.date), 'yyyy-MM-dd'),
                'Subtotal': inv.subtotal || inv.amount,
                'Taxes': taxDetails,
                'Total Amount': inv.amount,
                'Currency': inv.currency,
                'Status': inv.status
            };
        });
        exportToCSV(exportData, `billing_ledger_${companySlug}`);
    };

    const handleExportPDF = () => {
        const headers = ['Date', 'Description', 'Agency', 'Subtotal', 'Taxes', 'Total', 'Status'];
        const data = invoices.map(inv => {
            const taxSum = (inv.taxes || []).reduce((sum, t) => sum + t.calculatedAmount, 0);
            return [
                format(new Date(inv.date), 'MMM dd, yyyy'),
                inv.description,
                inv.recipient,
                (inv.subtotal || inv.amount).toFixed(2),
                taxSum.toFixed(2),
                inv.amount.toFixed(2),
                inv.status
            ];
        });
        generatePDF(headers, data, `billing_ledger_${companySlug}`, 'Billing Ledger');
    };

    const handleVoidInvoice = async (invoiceId: string) => {
        const result = await voidInvoice(invoiceId, companySlug);
        if (result.success) {
            toast.success("Invoice voided successfully");
        } else {
            toast.error(result.error || "Failed to void invoice");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Billing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-corner-lg flex items-center justify-center text-indigo-600">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historical Spend</p>
                            <p className="text-xl font-black text-gray-900">{currency} {formatNumber(totalSpent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-corner-lg flex items-center justify-center text-rose-600">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Liability</p>
                            <p className="text-xl font-black text-rose-600">{currency} {formatNumber(pendingAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-corner-lg flex items-center justify-center text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Trip Cost</p>
                            <p className="text-xl font-black text-gray-900">{currency} {formatNumber(averageCost, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-corner-lg flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Audit Status</p>
                            <p className="text-xl font-black text-gray-900">Compliant</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Ledger / <span className="text-indigo-600 italic underline decoration-indigo-200">Reconciliation</span></h3>
                        <p className="text-sm text-gray-400 font-medium">Historical record of all corporate travel expenditures.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="rounded-corner-md border-gray-100 font-bold hover:bg-gray-50 text-xs px-6"
                            onClick={handleExportCSV}
                        >
                            <Download size={16} className="mr-2" /> Export CSV
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-corner-md border-gray-100 font-bold hover:bg-gray-50 text-xs px-6"
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
                            <SearchInput placeholder="Search by trip or agency..." />
                        </div>
                        <Select
                            value={searchParams.get("status") || "ALL"}
                            onValueChange={(value) => handleFilterChange("status", value === "ALL" ? null : value)}
                        >
                            <SelectTrigger aria-label="Filter by invoice status">
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
                                aria-label="Filter by start date"
                            />
                            <Input
                                type="date"
                                placeholder="End Date"
                                value={searchParams.get("endDate") || ""}
                                onChange={(e) => handleFilterChange("endDate", e.target.value || null)}
                                aria-label="Filter by end date"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference / ID</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Agency</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Issued Date</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</th>
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
                                                <CreditCard size={32} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No active ledger</p>
                                                <p className="text-gray-300 text-[10px] italic">Liability records manifest upon trip completion.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id}
                                        id={`invoice_${invoice.id}`}
                                        className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-6 px-8">
                                            <p className="text-sm font-black text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">{invoice.description}</p>
                                            <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase tracking-widest italic font-mono">#{invoice.id.slice(0, 8)}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 rounded-corner-sm flex items-center justify-center text-[10px] font-black text-gray-400">
                                                    {invoice.recipient[0]}
                                                </div>
                                                <p className="text-xs font-bold text-gray-600">{invoice.recipient}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-xs font-bold text-gray-500">{format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-sm font-black text-gray-900">{invoice.currency} {formatNumber(invoice.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <Badge className={`font-black text-[9px] uppercase tracking-widest h-6 rounded-corner-sm flex items-center justify-center w-fit ${getStatusStyles(invoice.status)}`}>
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 transition-colors" aria-label="More options">
                                                            <MoreVertical size={16} className="text-gray-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-corner-lg border-gray-100 shadow-2xl p-2">
                                                        <Link href={`/company/${companySlug}/dashboard/requests/${invoice.requestId}`} className="contents">
                                                            <DropdownMenuItem className="flex items-center gap-2 text-gray-600 font-bold cursor-pointer rounded-corner-md p-3 hover:bg-gray-50 transition-colors">
                                                                <ArrowUpRight size={16} className="text-indigo-600" />
                                                                View Request
                                                            </DropdownMenuItem>
                                                        </Link>

                                                        {(invoice.status === InvoiceStatus.PENDING || invoice.status === InvoiceStatus.OVERDUE) && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleVoidInvoice(invoice.id)}
                                                                className="flex items-center gap-2 text-rose-600 font-bold cursor-pointer rounded-corner-md p-3 hover:bg-rose-50 transition-colors"
                                                            >
                                                                <Ban size={16} />
                                                                Void Invoice
                                                            </DropdownMenuItem>
                                                        )}

                                                        {invoice.pdfUrl && (
                                                            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="contents">
                                                                <DropdownMenuItem className="flex items-center gap-2 text-indigo-600 font-bold cursor-pointer rounded-corner-md p-3 hover:bg-indigo-50 transition-colors">
                                                                    <Download size={16} />
                                                                    Download Invoice
                                                                </DropdownMenuItem>
                                                            </a>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <Link href={`/company/${companySlug}/dashboard/requests/${invoice.requestId}`}>
                                                    <Button variant="ghost" size="icon" className="rounded-corner-lg h-8 w-8 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-indigo-50 transition-all border border-transparent group-hover:border-indigo-100" aria-label="View request details">
                                                        <ArrowUpRight size={18} className="text-indigo-600" />
                                                    </Button>
                                                </Link>
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
        </div>
    );
}
