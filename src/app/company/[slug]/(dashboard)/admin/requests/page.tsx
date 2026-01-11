import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getCompanyRequests, getCompanyAnalytics } from "../actions";
import { RequestsTable } from "./_components/requests-table";
import { AnalyticsWidgets } from "./_components/analytics-widgets";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Global Request Dashboard | Admin Console",
    description: "Comprehensive view of all corporate travel requests."
};

export default async function AdminRequestsPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role === 'EMPLOYEE') {
        redirect(`/company/${slug}/dashboard`);
    }

    const [requestsData, analytics] = await Promise.all([
        getCompanyRequests(slug, { page: 1, limit: 10 }),
        getCompanyAnalytics(slug)
    ]);

    return (
        <div className="p-10 space-y-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Management Console</span>
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-4">
                        Trip <span className="text-indigo-600">Requests</span>
                    </h1>
                    <p className="text-gray-500 font-medium max-w-xl text-lg flex items-center gap-2 italic">
                        Oversee global travel operations, analyze budget trends, and manage fulfillment workflows.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" className="h-16 px-8 rounded-[24px] border-none shadow-sm ring-1 ring-gray-100 font-black uppercase tracking-widest text-xs gap-3 hover:ring-indigo-200 transition-all bg-white text-gray-600">
                        <Download size={20} />
                        Export Audit
                    </Button>
                    <Button asChild className="h-16 px-8 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all">
                        <Link href={`#`}>
                            <Plus size={20} />
                            Internal Booking
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Analytics Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        Performance Metrics
                    </h2>
                </div>
                <AnalyticsWidgets analytics={analytics} />
            </section>

            {/* Main Content Area */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900">Request Pipeline</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Total Items: <span className="text-gray-900 font-black">{requestsData.total}</span>
                    </div>
                </div>
                <RequestsTable
                    slug={slug}
                    initialRequests={requestsData.requests as any}
                    total={requestsData.total}
                    totalPages={requestsData.totalPages}
                />
            </section>
        </div>
    );
}
