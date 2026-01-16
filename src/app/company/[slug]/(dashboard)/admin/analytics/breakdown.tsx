"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
    Users,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Plane
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatStatus, getStatusColor } from "@/lib/utils";
import { EmployeeSpendStats, RequestSpendStats } from "@/types/analytics";

interface AnalyticsBreakdownProps {
    currency: string;
    employeeBreakdown: EmployeeSpendStats[];
    requestBreakdown: RequestSpendStats[];
}

export function AnalyticsBreakdown({
    currency,
    employeeBreakdown,
    requestBreakdown
}: AnalyticsBreakdownProps) {
    const [activeTab, setActiveTab] = useState<'employees' | 'requests'>('employees');

    return (
        <Card className="border-none shadow-joy rounded-corner-xl bg-white overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-xl font-black text-gray-900">
                    Detailed Breakdown
                </CardTitle>

                {/* Custom Tab Toggle */}
                <div className="flex bg-gray-50 p-1 rounded-corner-lg border border-gray-100 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={cn(
                            "px-4 py-2 rounded-corner-md text-xs font-bold transition-all flex items-center gap-2",
                            activeTab === 'employees'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Users size={14} />
                        Top Spenders
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn(
                            "px-4 py-2 rounded-corner-md text-xs font-bold transition-all flex items-center gap-2",
                            activeTab === 'requests'
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <FileText size={14} />
                        Request Analysis
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {activeTab === 'employees' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                                <tr>
                                    <th className="p-6">Employee</th>
                                    <th className="p-6 text-center">Trips</th>
                                    <th className="p-6 text-right">Avg. Cost</th>
                                    <th className="p-6 text-right">Total Spend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employeeBreakdown.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-corner-md bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {emp.avatarUrl ? (
                                                        <Image src={emp.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-black text-xs text-gray-400">{emp.name[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{emp.name}</p>
                                                    <p className="text-xs text-gray-400">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {emp.tripCount}
                                            </Badge>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="font-mono text-gray-600 text-sm">{currency} {emp.avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="font-black text-gray-900">{currency} {emp.totalSpend.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                                {employeeBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-400 text-sm italic">
                                            No employee data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                                <tr>
                                    <th className="p-6">Request</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6 text-right">Est. Budget</th>
                                    <th className="p-6 text-right">Actual Cost</th>
                                    <th className="p-6 text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {requestBreakdown.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-corner-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Plane size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 truncate max-w-[200px]">{req.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{req.userName}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(req.date), 'MMM dd')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <Badge variant={getStatusColor(req.status)} className="scale-90 origin-center">
                                                {formatStatus(req.status)}
                                            </Badge>
                                        </td>
                                        <td className="p-6 text-right font-mono text-sm text-gray-500">
                                            {req.budget > 0 ? `${currency} ${req.budget.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-6 text-right font-black text-gray-900">
                                            {req.actual > 0 ? `${currency} ${req.actual.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-6 text-right">
                                            {req.budget > 0 && req.actual > 0 ? (
                                                <div className={cn("flex items-center justify-end font-bold text-xs gap-1",
                                                    req.variance > 0 ? "text-red-600" : "text-emerald-600"
                                                )}>
                                                    <span>{Math.abs(req.variance).toFixed(1)}%</span>
                                                    {req.variance > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requestBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-400 text-sm italic">
                                            No request data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
