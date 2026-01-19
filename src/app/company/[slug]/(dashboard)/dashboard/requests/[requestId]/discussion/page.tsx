import { notFound } from "next/navigation";
import { getTripRequest } from "../../../actions";
import { ChatThread } from "../_components/chat-thread";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function RequestDiscussionPage({
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

    // Fetch available users from the company for mentions
    const companyUsers = await prisma.user.findMany({
        where: {
            companyId: request.companyId,
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            company: { select: { name: true } },
        },
        take: 50,
    });

    let agencyUsers: any[] = [];
    if (request.agencyId) {
        agencyUsers = await prisma.user.findMany({
            where: {
                companyId: request.agencyId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true,
                company: { select: { name: true } },
            },
            take: 20,
        });
    }

    const availableUsers = [...companyUsers, ...agencyUsers].map(u => ({
        ...u,
        company: u.company ? { name: u.company.name } : null
    }));

    return (
        <div className="max-w-8xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
            <ChatThread
                requestId={request.id}
                initialMessages={request.messages}
                currentUserId={userId}
                availableUsers={availableUsers}
            />
        </div>
    );
}
