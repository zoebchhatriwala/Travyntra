import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PlanGuardService, PlanFeature } from "@/lib/services/plan-guard";
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { format } from "date-fns";
import { SubscriptionPlan, UserRole } from "@prisma/client";
import { PLAN_NAMES } from "@/lib/constants/plans";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const metadata = {
    title: "Plan & Billing | Agency Console",
};

export default async function AgencyPlanSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        redirect("/");
    }

    const companyId = session.user.companyId;

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            plan: true,
            subscriptionExpiresAt: true,
        }
    });

    if (!company) return notFound();

    // Fetch usage for key Agency features
    const bidUsage = await PlanGuardService.checkUsage(companyId, PlanFeature.MAX_ACTIVE_BIDS);
    const fulfillmentUsage = await PlanGuardService.checkUsage(companyId, PlanFeature.FULFILLMENTS_PER_MONTH);
    const taxUsage = await PlanGuardService.checkUsage(companyId, PlanFeature.ADD_TAX_TEMPLATE);

    const features = [
        {
            name: "Active Bids",
            ...bidUsage,
            icon: Zap
        },
        {
            name: "Monthly Fulfillments",
            ...fulfillmentUsage,
            icon: CheckCircle2
        },
        {
            name: "Tax Templates",
            ...taxUsage,
            icon: CreditCard
        }
    ];

    const isExpired = company.subscriptionExpiresAt ? new Date(company.subscriptionExpiresAt) < new Date() : false;

    return (
        <div className="min-h-screen bg-[#FAFAFB] animate-in fade-in duration-500">
            <div className="max-w-[1000px] mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-corner-sm">Agency Subscription</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Plan & <span className="text-purple-600 uppercase">Usage</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        View your agency subscription plan limits and current usage.
                    </p>
                </div>

                {/* Plan Status Card */}
                <div className="bg-white rounded-corner-xl shadow-lg shadow-purple-100 overflow-hidden relative">
                    <div className={`p-8 ${company.plan === SubscriptionPlan.ENTERPRISE ? 'bg-gradient-to-r from-gray-900 to-purple-900 text-white' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block">Current Plan</span>
                                <h2 className="text-3xl font-black tracking-tight mb-2">
                                    {PLAN_NAMES[company.plan]}
                                </h2>
                                <p className="opacity-90 font-medium flex items-center gap-2 text-sm">
                                    {isExpired ? (
                                        <span className="flex items-center gap-2 bg-rose-500/20 px-3 py-1 rounded-full"><AlertTriangle size={14} /> Expired on {format(new Date(company.subscriptionExpiresAt!), 'MMM dd, yyyy')}</span>
                                    ) : company.subscriptionExpiresAt ? (
                                        <span>Renews on {format(new Date(company.subscriptionExpiresAt), 'MMM dd, yyyy')}</span>
                                    ) : (
                                        <span>Lifetime Access</span>
                                    )}
                                </p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <ShieldCheck size={32} className="text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Usage Grid */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-corner-sm">
                                            <feature.icon size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{feature.name}</span>
                                    </div>
                                    <span className={`text-xs font-black ${feature.allowed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {feature.allowed ? 'ACTIVE' : 'LIMIT REACHED'}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-end justify-between">
                                        <span className="text-2xl font-black text-gray-900">{feature.usage}</span>
                                        <span className="text-sm font-bold text-gray-400">/ {feature.limit === Infinity ? '∞' : feature.limit}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${feature.allowed ? 'bg-purple-500' : 'bg-rose-500'}`}
                                            style={{ width: `${Math.min(100, feature.limit === Infinity ? 0 : (feature.usage / feature.limit) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-purple-50 border border-purple-100 rounded-corner-xl p-6 flex items-start gap-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-corner-md mt-1">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-900 mb-1">Need higher limits?</h4>
                        <p className="text-sm text-purple-700 font-medium">
                            As an Agency Partner, you can request limit increases or upgrade to Growth/Enterprise plans. Please contact the Platform Admin for custom quotations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
