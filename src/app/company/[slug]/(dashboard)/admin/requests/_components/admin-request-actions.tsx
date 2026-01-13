"use client";

import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { exportCompanyRequests } from "../../actions";

interface AdminRequestActionsProps {
    slug: string;
}

export function AdminRequestActions({ slug }: AdminRequestActionsProps) {
    const handleExport = async () => {
        const toastId = toast.loading("Generating full audit export...");
        try {
            const result = await exportCompanyRequests(slug);
            const blob = new Blob([result.csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Audit export ready", { id: toastId });
        } catch {
            toast.error("Audit export failed", { id: toastId });
        }
    };

    return (
        <div className="flex items-center gap-4">
            <Button
                onClick={handleExport}
                variant="outline"
                className="h-16 px-8 rounded-[24px] border-none shadow-sm ring-1 ring-gray-100 font-black uppercase tracking-widest text-xs gap-3 hover:ring-indigo-200 transition-all bg-white text-gray-600"
            >
                <Download size={20} />
                Export Audit
            </Button>
            <Button asChild className="h-16 px-8 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all">
                <Link href={`/company/${slug}/dashboard/requests/new`}>
                    <Plus size={20} />
                    Internal Booking
                </Link>
            </Button>
        </div>
    );
}
