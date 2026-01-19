"use client";

import Link from "next/link";
import { useSidebar } from "@/components/layout/sidebar-layout";
import { SubscriptionPlan } from "@prisma/client";
import { PLAN_NAMES } from "@/lib/constants/plans";

interface SupportPlanCardProps {
    slug?: string;
    companyPlan?: SubscriptionPlan | string | null;
    type: "COMPANY" | "AGENCY";
}

export function SupportPlanCard({
    slug,
    companyPlan,
    type
}: SupportPlanCardProps) {
    const { isCollapsed } = useSidebar();

    const plan = companyPlan as SubscriptionPlan;
    const planName = plan && PLAN_NAMES[plan] ? PLAN_NAMES[plan] : 'Corporate Plan';

    const planInitial = companyPlan === 'FREE' ? 'F' :
        companyPlan === 'STARTER' ? 'S' : 'E';

    const viewPlanHref = type === "COMPANY"
        ? `/company/${slug}/admin/settings/plan`
        : `/agent/settings/plan`;

    if (isCollapsed) {
        return (
            <div className="flex justify-center py-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-corner-md flex items-center justify-center text-indigo-600" title={planName}>
                    <span className="text-xs font-bold">
                        {planInitial}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-indigo-600 rounded-corner-lg p-4 text-white shadow-lg shadow-indigo-100 relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Support Plan</p>
            <p className="text-sm font-bold mb-3">
                {planName}
            </p>
            {companyPlan === 'FREE' ? (
                <Link
                    href="mailto:sales@travyntra.com"
                    className="block w-full py-2 bg-white text-indigo-600 rounded-corner-md text-[10px] font-black uppercase text-center hover:bg-gray-50 transition-colors"
                >
                    Upgrade Tier
                </Link>
            ) : (
                <Link href={viewPlanHref} className="block w-full py-2 bg-white text-indigo-600 rounded-corner-md text-[10px] font-black uppercase text-center hover:bg-gray-50 transition-colors">
                    View Plan
                </Link>
            )}
        </div>
    );
}
