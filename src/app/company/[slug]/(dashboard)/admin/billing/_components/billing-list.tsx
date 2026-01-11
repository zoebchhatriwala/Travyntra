"use client";

import {
    CreditCard,
    Download,
    ArrowUpRight,
    Receipt,
    TrendingUp,
    Clock
} from "lucide-react";
import { format } from "date-fns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatus } from "@prisma/client";
import { SpendingChart } from "./spending-chart";

interface Invoice {
    id: string;
    amount: number;
    date: Date;
    status: InvoiceStatus;
    description: string;
    recipient: string;
}

interface BillingListProps {
    invoices: Invoice[];
}

const MOCK_CHART_DATA = [
    { month: "AUG", amount: 4500 },
    { month: "SEP", amount: 3200 },
    { month: "OCT", amount: 7800 },
    { month: "NOV", amount: 5100 },
    { month: "DEC", amount: 9400 },
    { month: "JAN", amount: 2500 }
];

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

export function BillingList({ invoices }: BillingListProps) {
    const totalSpent = invoices
        .filter(inv => inv.status === InvoiceStatus.PAID)
        .reduce((sum, inv) => sum + inv.amount, 0);

    const pendingAmount = invoices
        .filter(inv => inv.status === InvoiceStatus.PENDING || inv.status === InvoiceStatus.OVERDUE)
        .reduce((sum, inv) => sum + inv.amount, 0);

    const averageCost = invoices.length > 0 ? (totalSpent + pendingAmount) / invoices.length : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Billing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historical Spend</p>
                            <p className="text-xl font-black text-gray-900">${totalSpent.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Liability</p>
                            <p className="text-xl font-black text-rose-600">${pendingAmount.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Trip Cost</p>
                            <p className="text-xl font-black text-gray-900">${averageCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Audit Status</p>
                            <p className="text-xl font-black text-gray-900">Compliant</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Expenditure Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-1">
                <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-indigo-600" /> Spending Trend
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-medium text-xs">Monthly corporate expenditure overview.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <SpendingChart data={MOCK_CHART_DATA} />
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Ledger / <span className="text-indigo-600 italic underline decoration-indigo-200">Reconciliation</span></h3>
                        <p className="text-sm text-gray-400 font-medium">Historical record of all corporate travel expenditures.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl border-gray-100 font-bold hover:bg-gray-50 text-xs px-6">
                            <Download size={16} className="mr-2" /> Export CSV
                        </Button>
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
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-6 px-8">
                                            <p className="text-sm font-black text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">{invoice.description}</p>
                                            <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase tracking-widest italic font-mono">#{invoice.id.slice(0, 8)}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400">
                                                    {invoice.recipient[0]}
                                                </div>
                                                <p className="text-xs font-bold text-gray-600">{invoice.recipient}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-xs font-bold text-gray-500">{format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-sm font-black text-gray-900">${invoice.amount.toLocaleString()}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <Badge className={`font-black text-[9px] uppercase tracking-widest h-6 rounded-[8px] flex items-center justify-center w-fit ${getStatusStyles(invoice.status)}`}>
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-2xl group-hover:bg-white group-hover:shadow-lg group-hover:shadow-indigo-50 transition-all border border-transparent group-hover:border-indigo-100">
                                                <ArrowUpRight size={18} className="text-indigo-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
