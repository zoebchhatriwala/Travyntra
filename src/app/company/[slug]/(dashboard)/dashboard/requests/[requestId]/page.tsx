import { notFound } from "next/navigation";
import { getTripRequest } from "../../actions";
import { RequestInfo } from "./_components/request-info";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function RequestOverviewPage({
    params,
}: {
    params: Promise<{ slug: string; requestId: string }>;
}) {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) return notFound();

    const request = await getTripRequest(requestId);

    if (!request) return notFound();

    // Fetch company currency
    const company = await prisma.company.findUnique({
        where: { id: request.companyId },
        select: { currency: true }
    });

    const currency = company?.currency || "USD";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Left Column: Request Details */}
            <div className="lg:col-span-2 space-y-8">
                <RequestInfo request={request} currency={currency} />
            </div>

            {/* Right Column: Widgets */}
            <div className="space-y-6">
                {/* Documents Widget */}
                <div className="p-6 rounded-3xl bg-indigo-900 text-white shadow-lg overflow-hidden relative min-h-[200px] flex flex-col justify-between">
                    <div className="relative z-10">
                        <h4 className="font-bold text-lg mb-1">Travel Documents</h4>
                        <p className="text-indigo-200 text-xs mb-4">Tickets and visas.</p>

                        {request.documents.length === 0 ? (
                            <div className="h-20 flex items-center justify-center border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm text-xs font-medium text-indigo-100">
                                No documents yet
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Simple list for now */}
                                <div className="text-sm font-medium">{request.documents.length} document(s) available</div>
                            </div>
                        )}
                    </div>

                    {/* Decoration */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-50" />
                </div>
            </div>
        </div>
    );
}
