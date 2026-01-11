import Link from "next/link";
import { Building2 } from "lucide-react";
import { UserMenu } from "@/app/admin/_components/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { prisma } from "@/lib/prisma";
import { CompanyNav } from "./_components/company-nav";

export default async function CompanyAdminLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Fetch company plan data specifically for the layout's support card
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { plan: true }
    });

    return (
        <div className="flex min-h-screen bg-[#FAFAFB]">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-sm z-50">
                <div className="p-8">
                    <Link href={`/company/${slug}/admin`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                            <Building2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display text-lg font-bold tracking-tight text-gray-900 leading-none">
                                Travyntra
                            </span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                                Company Admin
                            </span>
                        </div>
                    </Link>
                </div>

                <CompanyNav slug={slug} />

                <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                    <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Support Plan</p>
                        <p className="text-sm font-bold mb-3">
                            {company?.plan === 'FREE' ? 'Free Tier' :
                                company?.plan === 'STARTER' ? 'Business Starter' :
                                    company?.plan === 'ENTERPRISE' ? 'Enterprise Gold' : 'Corporate Plan'}
                        </p>
                        {company?.plan === 'FREE' ? (
                            <Link
                                href="mailto:sales@travyntra.com"
                                className="block w-full py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase text-center hover:bg-gray-50 transition-colors"
                            >
                                Upgrade Tier
                            </Link>
                        ) : (
                            <button className="w-full py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-colors">
                                View Billing
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-72">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workspace</span>
                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{slug}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu />
                    </div>
                </header>

                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
