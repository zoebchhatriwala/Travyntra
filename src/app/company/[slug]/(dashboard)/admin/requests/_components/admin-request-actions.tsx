"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

interface AdminRequestActionsProps {
    slug: string;
}

export function AdminRequestActions({ slug }: AdminRequestActionsProps) {
    return (
        <div className="flex items-center gap-4">
            <Button asChild className="h-16 px-8 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all">
                <Link href={`/company/${slug}/dashboard/requests/new`}>
                    <Plus size={20} />
                    Add Request
                </Link>
            </Button>
        </div>
    );
}
