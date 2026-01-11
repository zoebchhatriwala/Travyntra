import { notFound } from "next/navigation";
import { getTripRequest } from "../../actions";
import { RequestInfo } from "./_components/request-info";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getRequestApprovalProgress } from "@/lib/actions/approvals";
import { WorkflowProgressTracker } from "@/components/workflow/workflow-progress-tracker";
import { ApprovalActions } from "@/components/workflow/approval-actions";
import { GroupTripInfo } from "./_components/group-trip-info";
import { BidList } from "./_components/bid-list";

export default async function RequestOverviewPage({
    params,
}: {
    params: Promise<{ slug: string; requestId: string }>;
}) {
    const { requestId, slug } = await params;
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

    // Get approval workflow progress
    const approvalProgress = await getRequestApprovalProgress(requestId);

    // Check if current user has a pending approval
    const myPendingApproval = approvalProgress?.find(step =>
        step.status === 'PENDING' &&
        step.approvers.some(approver => approver.id === userId) &&
        !step.approvals.some(approval => approval.userId === userId && approval.status !== 'PENDING')
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Approval Actions - Show if user has pending approval */}
            {myPendingApproval && (
                <ApprovalActions
                    requestApprovalStepId={myPendingApproval.id}
                    requestTitle={request.title}
                    stepName={myPendingApproval.stepName}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Request Details */}
                <div className="lg:col-span-2 space-y-8">
                    <RequestInfo request={request} currency={currency} />

                    {/* Agent Bids Section */}
                    {request.bids && request.bids.length > 0 && (
                        <BidList
                            bids={request.bids}
                            requestId={request.id}
                            isAuthorized={session?.user?.role === 'COMPANY_ADMIN' || session?.user?.role === 'SUPER_ADMIN'}
                            currency={currency}
                        />
                    )}

                    {/* Workflow Progress Tracker */}
                    {approvalProgress && approvalProgress.length > 0 && (
                        <WorkflowProgressTracker steps={approvalProgress} />
                    )}
                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-6">
                    {/* Group Trip Widget */}
                    <GroupTripInfo request={request} slug={slug} />

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
        </div>
    );
}
