import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTripRequest } from "../../actions";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RequestTabs } from "./_components/request-tabs";
import { RequestActions } from "./_components/request-actions";
import { CopyButton } from "./_components/copy-button";
import { formatStatus, getStatusColor } from "@/lib/utils";


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
                            <CopyButton text={request.id} displayText={`${request.id.slice(0, 8)}...`} />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="min-w-0 flex-1 mr-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h1 className="text-2xl font-display font-bold text-gray-900 break-all">
                                        {request.title}
                                    </h1>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{request.title}</p>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium shrink-0">
                                    <Clock size={14} />
                                    <span>Submitted {new Date(request.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden shrink-0">
                                        {request.user.avatarUrl ? (
                                            <Image src={request.user.avatarUrl} alt="" width={20} height={20} className="w-full h-full object-cover" />
                                        ) : (
                                            request.user.name?.[0]
                                        )}
                                    </div>
                                    <span className="truncate">{request.user.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Badge variant={getStatusColor(request.status)} className="px-4 py-1.5 transition-all duration-500 flex items-center gap-1.5">
                                {request.status === 'APPROVED' && <CheckCircle2 size={12} />}
                                {request.status === 'REJECTED' && <AlertCircle size={12} />}
                                {request.status === 'PENDING_AGENT_ACTION' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                {formatStatus(request.status)}
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
