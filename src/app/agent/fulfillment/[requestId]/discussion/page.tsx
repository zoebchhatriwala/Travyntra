
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFulfillmentRequest } from "../../actions";
import { ChatThread, type Message } from "@/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/chat-thread";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function FulfillmentDiscussionPage({
    params,
}: {
    params: Promise<{ requestId: string }>;
}) {
    const { requestId } = await params;
    const session = await getServerSession(authOptions);
    const request = await getFulfillmentRequest(requestId, false); // Fetch ALL messages, asc order

    if (!request) return notFound();

    // Available users for mentions (Request Creator + Agency Employees)
    const agencyEmployees = await prisma.user.findMany({
        where: {
            companyId: request.agencyId || "",
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            company: { select: { name: true } },
        },
    });

    const availableUsers = [
        {
            id: request.user.id,
            name: request.user.name,
            role: "EMPLOYEE", // The traveler
            avatarUrl: null,
            company: { name: request.company.name }
        },
        ...agencyEmployees.map(u => ({
            ...u,
            company: u.company ? { name: u.company.name } : null
        }))
    ];

    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link
                    href={`/agent/fulfillment/${requestId}`}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-corner-md transition-colors shrink-0"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Full Discussion</h1>
                    <p className="text-sm text-gray-500">{request.title}</p>
                </div>
            </div>

            <div className="bg-white rounded-corner-xl shadow-xl shadow-indigo-100/20 overflow-hidden ring-1 ring-gray-100">
                <ChatThread
                    requestId={requestId}
                    initialMessages={request.messages as Message[]}
                    currentUserId={session?.user?.id || ""}
                    availableUsers={availableUsers}
                />
            </div>
        </div>
    );
}
