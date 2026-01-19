import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { Settings, Receipt, CreditCard } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AgencySettingsMenuPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        redirect("/");
    }

    const settingsOptions = [
        {
            title: "Agency Configuration",
            description: "Adjust branding, workspace identity, and security parameters",
            href: "/agent/settings/configuration",
            icon: Settings,
            color: "bg-indigo-50 text-indigo-600"
        },
        {
            title: "Tax Templates",
            description: "Create and manage reusable tax templates for quick bidding",
            href: "/agent/settings/tax-templates",
            icon: Receipt,
            color: "bg-emerald-50 text-emerald-600"
        },
        {
            title: "Plan & Billing",
            description: "View subscription details, feature limits, and current usage statistics",
            href: "/agent/settings/plan",
            icon: CreditCard,
            color: "bg-purple-50 text-purple-600"
        }
    ];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Console / <span className="text-indigo-600 uppercase">Settings</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Manage your agency settings and configurations.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {settingsOptions.map((option) => (
                    <Link key={option.href} href={option.href}>
                        <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden hover:shadow-md transition-all cursor-pointer h-full">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-corner-lg ${option.color} flex items-center justify-center mb-4`}>
                                    <option.icon size={24} />
                                </div>
                                <CardTitle className="text-xl font-black text-gray-900">
                                    {option.title}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-500">
                                    {option.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
