"use client";

import {
    CreditCard,
    Download,
    ArrowUpRight,
    Receipt,
    TrendingUp,
    Clock
} from "lucide-react";
import {
    Card,
    CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Invoice {
    id: string;
    amount: number;
    date: Date;
    status: string;
    description: string;
    recipient: string;
}

interface BillingListProps {
    invoices: Invoice[];
}

export function BillingList({ invoices }: BillingListProps) {
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Billing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Spend</p>
                            <p className="text-2xl font-black text-gray-900">${totalSpent.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoices Settled</p>
                            <p className="text-2xl font-black text-gray-900">{invoices.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Cycle</p>
                            <p className="text-2xl font-black text-gray-900">Feb 01</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Ledger / <span className="text-indigo-600">Reconciliation</span></h3>
                        <p className="text-sm text-gray-400 font-medium">Historical record of all corporate travel expenditures.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-gray-100 font-bold hover:bg-gray-50">
                        <Download size={16} className="mr-2" /> Export CSV
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Beneficiary</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <CreditCard size={40} className="mx-auto text-gray-200 mb-4" />
                                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No invoices found</p>
                                        <p className="text-gray-300 text-[10px] mt-1 italic">Expenditures will appear here once trips are completed.</p>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-5 px-8">
                                            <p className="text-sm font-black text-gray-900 leading-none">{invoice.description}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">ID: {invoice.id.slice(0, 8)}</p>
                                        </td>
                                        <td className="py-5 px-4">
                                            <p className="text-sm font-bold text-gray-600">{invoice.recipient}</p>
                                        </td>
                                        <td className="py-5 px-4">
                                            <p className="text-sm font-bold text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
                                        </td>
                                        <td className="py-5 px-4">
                                            <p className="text-sm font-black text-gray-900">${invoice.amount.toLocaleString()}</p>
                                        </td>
                                        <td className="py-5 px-4">
                                            <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[10px] px-2 h-6 rounded-lg">
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-100">
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
