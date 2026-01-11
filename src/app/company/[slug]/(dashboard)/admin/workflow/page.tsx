import { WorkflowBuilder } from "./_components/workflow-builder";
import { getCompanyUsers, getWorkflowConfig } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function WorkflowPage({ params }: Props) {
    const session = await getServerSession(authOptions);
    const { slug } = await params;

    // Fetch initial data
    const users = await getCompanyUsers(slug);
    const initialWorkflow = await getWorkflowConfig(slug);

    // Fetch active simulation requests
    const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
    const simulationRequests = company ? await prisma.tripRequest.findMany({
        where: {
            companyId: company.id,
            status: "PENDING_COMPANY_APPROVAL"
        },
        include: {
            user: true,
            approvalSteps: {
                include: {
                    step: true,
                    approvals: {
                        include: { user: true }
                    }
                },
                orderBy: { step: { order: "asc" } }
            },
            workflow: {
                orderBy: { timestamp: "desc" }
            }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
    }) : [];

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Logic / <span className="text-indigo-600 uppercase">Workflow</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Map out the sequence of events from request initiation to final fulfillment.
                </p>
            </div>

            <WorkflowBuilder
                slug={slug}
                availableUsers={users}
                initialWorkflow={initialWorkflow}
                simulationRequests={JSON.parse(JSON.stringify(simulationRequests))}
                currentUserId={session?.user?.id}
            />
        </div>
    );
}
