"use client";

import { useState, useMemo } from "react";
import {
    ShieldCheck,
    Search,
    Lock,
    Settings2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    Card,
    CardContent
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    updateCompanyStatus,
    updateCompanySubscription,
    toggleUserBlock
} from "../actions";
import { CompanyStatus, SubscriptionPlan } from "@prisma/client";

export interface User {
    id: string;
    name: string | null;
    email: string | null;
    isBlocked: boolean;
}

export interface Company {
    id: string;
    name: string;
    slug: string;
    type: "ENTERPRISE" | "AGENT";
    status: CompanyStatus;
    plan: SubscriptionPlan;
    subscriptionExpiresAt: Date | string | null;
    _count: {
        users: number;
        requests: number;
        assignedRequests: number;
    };
    users: User[];
}

export interface CompanyListProps {
    initialCompanies: Company[];
}


export function CompanyList({ initialCompanies }: CompanyListProps) {
    const [companies, setCompanies] = useState<Company[]>(initialCompanies);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Manage Dialog State
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const filteredCompanies = useMemo(() => {
        return companies.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [companies, searchQuery]);

    // Derived pagination values
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
    const paginatedCompanies = filteredCompanies.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleStatusUpdate = async (companyId: string, status: CompanyStatus) => {
        setLoadingId(companyId);
        const res = await updateCompanyStatus(companyId, status);
        if (res.success) {
            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status } : c));
            if (selectedCompany?.id === companyId) {
                setSelectedCompany((prev) => prev ? ({ ...prev, status }) : null);
            }
        }
        setLoadingId(null);
    };

    const handleSubscriptionUpdate = async (companyId: string, plan: SubscriptionPlan, expiresAt?: string) => {
        setLoadingId(companyId);
        const dateObj = expiresAt ? new Date(expiresAt) : null;
        const res = await updateCompanySubscription(companyId, plan, dateObj);
        if (res.success) {
            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, plan, subscriptionExpiresAt: dateObj } : c));
            if (selectedCompany?.id === companyId) {
                setSelectedCompany((prev) => prev ? ({ ...prev, plan, subscriptionExpiresAt: dateObj }) : null);
            }
        }
        setLoadingId(null);
    };

    const handleUserBlock = async (userId: string, companyId: string, isBlocked: boolean) => {
        setLoadingId(userId);
        const res = await toggleUserBlock(userId, isBlocked);
        if (res.success) {
            const updatedCompanies = companies.map(c => {
                if (c.id === companyId) {
                    return {
                        ...c,
                        users: c.users.map((u) => u.id === userId ? { ...u, isBlocked } : u)
                    };
                }
                return c;
            });
            setCompanies(updatedCompanies);

            // Sync selected company in dialog if open
            if (selectedCompany?.id === companyId) {
                setSelectedCompany((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        users: prev.users.map((u) => u.id === userId ? { ...u, isBlocked } : u)
                    };
                });
            }
        }
        setLoadingId(null);
    };

    return (
        <div className="space-y-6">
            {/* Compact Search Bar */}
            <div className="relative max-w-xl mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search companies..."
                    className="w-full h-12 pl-11 pr-4 rounded-corner-lg border-none bg-white shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {paginatedCompanies.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-corner-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-400 font-medium">No results found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedCompanies.map((company) => (
                        <Card key={company.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white ring-1 ring-gray-100 overflow-hidden group">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-corner-lg flex items-center justify-center text-indigo-600 font-black text-xl group-hover:scale-110 transition-transform">
                                            {company.name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 leading-tight truncate max-w-[140px]">{company.name}</h3>
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">/{company.slug}</p>
                                        </div>
                                    </div>
                                    <Badge
                                        className={`rounded-corner-sm px-2 py-0.5 font-bold text-[10px] border-none ${company.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                            company.status === 'BLOCKED' ? 'bg-rose-100 text-rose-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}
                                    >
                                        {company.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-gray-50 rounded-corner-md">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Staff</span>
                                        <p className="text-lg font-black text-gray-900">{company._count.users}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-corner-md">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                                            {company.type === 'AGENT' ? 'Fulfillments' : 'Trips'}
                                        </span>
                                        <p className="text-lg font-black text-gray-900">
                                            {company.type === 'AGENT' ? company._count.assignedRequests : company._count.requests}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-1 pt-2">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <div className={`w-1.5 h-1.5 rounded-full ${company.plan === 'ENTERPRISE' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{company.plan}</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedCompany(company);
                                            setIsManageOpen(true);
                                        }}
                                        className="h-8 rounded-corner-sm bg-gray-900 hover:bg-black text-[10px] font-black px-4"
                                    >
                                        MANAGE
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-corner-md h-10 w-10 border-gray-100"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={18} />
                    </Button>
                    <div className="flex items-center gap-1 px-4 py-2 bg-white rounded-corner-md shadow-sm ring-1 ring-gray-100">
                        <span className="text-xs font-black text-indigo-600">{currentPage}</span>
                        <span className="text-[10px] font-bold text-gray-400">/ {totalPages}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-corner-md h-10 w-10 border-gray-100"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={18} />
                    </Button>
                </div>
            )}

            {/* Manage Company Dialog */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-[540px] rounded-corner-xl p-0 border-none shadow-2xl overflow-hidden">
                    {selectedCompany && (
                        <>
                            <div className="p-8 bg-indigo-600 text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <DialogTitle className="text-2xl font-black mb-1 text-white">{selectedCompany.name}</DialogTitle>
                                <DialogDescription className="text-indigo-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Settings2 size={14} /> Workspace Configuration
                                </DialogDescription>
                            </div>

                            <ScrollArea className="max-h-[70vh] p-8">
                                <div className="space-y-8">
                                    {/* Access & Tiers */}
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Protocol</Label>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    onClick={() => handleStatusUpdate(selectedCompany.id, 'ACTIVE')}
                                                    className={`h-11 rounded-corner-md font-bold ${selectedCompany.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    <ShieldCheck size={16} className="mr-2" /> Active
                                                </Button>
                                                <Button
                                                    onClick={() => handleStatusUpdate(selectedCompany.id, 'BLOCKED')}
                                                    className={`h-11 rounded-corner-md font-bold ${selectedCompany.status === 'BLOCKED' ? 'bg-rose-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    <Lock size={16} className="mr-2" /> Suspended
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subscription Tier</Label>
                                            <div className="flex flex-col gap-2">
                                                {['FREE', 'STARTER', 'ENTERPRISE'].map((p) => (
                                                    <Button
                                                        key={p}
                                                        size="sm"
                                                        onClick={() => handleSubscriptionUpdate(selectedCompany.id, p as SubscriptionPlan)}
                                                        className={`h-11 rounded-corner-md font-bold text-[10px] ${selectedCompany.plan === p
                                                            ? 'bg-indigo-600 shadow-md'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {p}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-gray-100" />

                                    {/* Expiry */}
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Link Expiry</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="date"
                                                className="h-12 rounded-corner-md border-gray-100 bg-gray-50 focus:bg-white font-bold"
                                                value={selectedCompany.subscriptionExpiresAt ? new Date(selectedCompany.subscriptionExpiresAt).toISOString().split('T')[0] : ""}
                                                onChange={(e) => handleSubscriptionUpdate(selectedCompany.id, selectedCompany.plan, e.target.value)}
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => handleSubscriptionUpdate(selectedCompany.id, selectedCompany.plan, undefined)}
                                                className="h-12 px-6 rounded-corner-md font-bold border-gray-100 text-gray-400"
                                            >
                                                RESET
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator className="bg-gray-100" />

                                    {/* Internal Admins - Moved here for compactness */}
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity Management</Label>
                                        <div className="space-y-3">
                                            {selectedCompany.users.map((admin) => (
                                                <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-corner-lg border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-900 text-xs font-black shadow-sm ring-1 ring-gray-100">
                                                            {admin.name ? admin.name[0].toUpperCase() : 'A'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900">{admin.name || 'Admin'}</p>
                                                            <p className="text-[10px] font-bold text-gray-400">{admin.email}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-8 px-3 rounded-corner-sm text-[10px] font-black ${admin.isBlocked ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}
                                                        onClick={() => handleUserBlock(admin.id, selectedCompany.id, !admin.isBlocked)}
                                                        disabled={loadingId === admin.id}
                                                    >
                                                        {admin.isBlocked ? 'RESTORE' : 'BLOCK'}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-8 pt-0 mt-4">
                                <Button
                                    onClick={() => setIsManageOpen(false)}
                                    className="w-full h-14 rounded-corner-lg bg-gray-900 text-white font-black hover:bg-black transition-colors"
                                >
                                    CLOSE WORKSPACE
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>

            </Dialog>
        </div>
    );
}

