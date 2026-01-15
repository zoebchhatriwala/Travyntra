import { notFound } from "next/navigation";
import { getTripRequest } from "../../actions";
import { RequestInfo } from "./_components/request-info";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getRequestApprovalProgress } from "@/lib/actions/approvals";
import { WorkflowProgressTracker } from "@/components/workflow/workflow-progress-tracker";
import { ApprovalActions } from "@/components/workflow/approval-actions";
import { GroupTripInfo } from "./_components/group-trip-info";
import { BidList } from "./_components/bid-list";
import { CollaboratorManager } from "./_components/collaborator-manager";

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
                    <RequestInfo request={request} />

                    {/* Agent Bids Section */}
                    {request.bids && request.bids.length > 0 && (
                        <BidList
                            bids={request.bids}
                            requestId={request.id}
                            isAuthorized={session?.user?.role === 'COMPANY_ADMIN' || session?.user?.role === 'SUPER_ADMIN'}
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

                    {/* Collaborators Widget */}
                    <CollaboratorManager
                        requestId={requestId}
                        initialCollaborators={request.collaborators}
                        isOwner={request.userId === userId}
                        isAdmin={session?.user?.role === 'COMPANY_ADMIN' || session?.user?.role === 'SUPER_ADMIN'}
                        currentUserId={userId}
                    />

                    {/* Documents Widget */}
                    <div className="p-6 rounded-3xl bg-indigo-900 text-white shadow-lg overflow-hidden relative min-h-[200px] flex flex-col justify-between">
                        <div className="relative z-10">
                            <h4 className="font-bold text-lg mb-1">Travel Documents</h4>
                            <p className="text-indigo-200 text-xs mb-4">Tickets, visas and other documents.</p>

                            {request.documents.length === 0 ? (
                                <div className="h-20 flex items-center justify-center border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm text-xs font-medium text-indigo-100">
                                    No documents yet
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                    {request.documents.map((doc: { id: string; url: string; name: string; type: string }) => (
                                        <a
                                            key={doc.id}
                                            href={doc.url}
                                            download={doc.name}
                                            className="flex items-center gap-3 p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors group"
                                        >
                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                                                <p className="text-[10px] text-indigo-200">{doc.type}</p>
                                            </div>
                                            <svg className="w-4 h-4 text-indigo-300 group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    ))}
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
