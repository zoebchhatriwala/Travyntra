import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTripRequest } from "../../actions";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RequestTabs } from "./_components/request-tabs";
import { RequestActions } from "./_components/request-actions";


export default async function RequestLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string; requestId: string }>;
}) {
    const { slug, requestId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) return notFound();

    const request = await getTripRequest(requestId);

    if (!request) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
                <div className="max-w-7xl mx-auto px-6 pt-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href={`/company/${slug}/dashboard/requests`}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span>Requests</span>
                            <span>/</span>
                            <span className="text-gray-900">{request.id.slice(0, 8)}...</span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
                                {request.title}
                            </h1>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                    <Clock size={14} />
                                    <span>Submitted {new Date(request.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden">
                                        {request.user.avatarUrl ? (
                                            <Image src={request.user.avatarUrl} alt="" width={20} height={20} className="w-full h-full object-cover" />
                                        ) : (
                                            request.user.name?.[0]
                                        )}
                                    </div>
                                    <span>{request.user.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge className={`px-3 py-1.5 text-xs font-bold rounded-lg border-none ${request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                request.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                {request.status === 'APPROVED' && <CheckCircle2 size={12} className="mr-1.5" />}
                                {request.status === 'REJECTED' && <AlertCircle size={12} className="mr-1.5" />}
                                {request.status}
                            </Badge>

                            <RequestActions
                                requestId={requestId}
                                status={request.status}
                                slug={slug}
                            />

                        </div>
                    </div>

                    <RequestTabs slug={slug} requestId={requestId} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </div>
        </div>
    );
}
