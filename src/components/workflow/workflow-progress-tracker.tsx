"use client";
import Image from "next/image";

import { Check, Clock, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


import { type WorkflowProgressStep as ApprovalStep } from "@/types/workflow/step";

interface WorkflowProgressTrackerProps {
    steps: ApprovalStep[];
}

export function WorkflowProgressTracker({ steps }: WorkflowProgressTrackerProps) {
    if (!steps || steps.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
                <p className="text-center text-gray-500 text-sm">No approval workflow configured</p>
            </div>
        );
    }

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Check size={20} className="text-white" />;
            case 'REJECTED':
                return <X size={20} className="text-white" />;
            default:
                return <Clock size={20} className="text-white" />;
        }
    };

    const getStepColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'from-emerald-500 to-teal-600';
            case 'REJECTED':
                return 'from-red-500 to-rose-600';
            default:
                return 'from-amber-500 to-orange-600';
        }
    };

    const getStepBorderColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'border-emerald-200 bg-emerald-50';
            case 'REJECTED':
                return 'border-red-200 bg-red-50';
            default:
                return 'border-amber-200 bg-amber-50';
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8">
            <div className="space-y-2 mb-8">
                <h3 className="text-2xl font-black text-gray-900">Approval Workflow</h3>
                <p className="text-sm text-gray-600">Track the progress of this request through the approval chain</p>
            </div>

            <div className="space-y-6">
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    const isPending = step.status === 'PENDING';
                    const isApproved = step.status === 'APPROVED';
                    const isRejected = step.status === 'REJECTED';

                    return (
                        <div key={step.id} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={cn(
                                        "absolute left-7 top-16 w-0.5 h-full -mb-6",
                                        isApproved ? "bg-emerald-300" : "bg-gray-200"
                                    )}
                                />
                            )}

                            {/* Step Card */}
                            <div className={cn(
                                "relative border-2 rounded-3xl p-6 transition-all",
                                getStepBorderColor(step.status),
                                isPending && "ring-2 ring-amber-300 ring-offset-2"
                            )}>
                                {/* Step Header */}
                                <div className="flex items-start gap-4">
                                    {/* Step Icon */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0",
                                        getStepColor(step.status)
                                    )}>
                                        {getStepIcon(step.status)}
                                    </div>

                                    {/* Step Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-black text-gray-900">
                                                Step {step.stepOrder}: {step.stepName}
                                            </h4>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                isApproved && "bg-emerald-100 text-emerald-700",
                                                isRejected && "bg-red-100 text-red-700",
                                                isPending && "bg-amber-100 text-amber-700"
                                            )}>
                                                {step.status}
                                            </span>
                                        </div>

                                        {/* Step Type Description */}
                                        <p className="text-xs text-gray-600 mb-4">
                                            {step.kind === 'AGENT_QUOTATION' ? (
                                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    Waiting for agent bids
                                                </span>
                                            ) : (
                                                step.stepType === 'ALL'
                                                    ? 'All approvers must approve'
                                                    : 'Any approver can approve'
                                            )}
                                        </p>

                                        {/* Auto-approval Metadata */}
                                        {step.metadata?.autoApproved && (
                                            <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-black uppercase tracking-wider">System Auto-Approval</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 leading-tight">
                                                    {step.metadata.reason || "This step was automatically approved by the system."}
                                                </p>
                                            </div>
                                        )}

                                        {/* Agent Quotation Info */}
                                        {step.kind === 'AGENT_QUOTATION' && (
                                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-900">Broadcasting to Agencies</p>
                                                        <p className="text-xs text-indigo-600">Request is visible to all connected travel agents.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Approvers */}
                                        <div className="space-y-3">
                                            {step.approvers.map((approver) => {
                                                const approval = step.approvals.find(a => a.userId === approver.id);
                                                const hasApproved = approval?.status === 'APPROVED';
                                                const hasRejected = approval?.status === 'REJECTED';
                                                const isWaiting = !approval || approval.status === 'PENDING';

                                                return (
                                                    <div
                                                        key={approver.id}
                                                        className={cn(
                                                            "flex items-start gap-3 p-3 rounded-2xl transition-all",
                                                            hasApproved && "bg-emerald-50 border border-emerald-200",
                                                            hasRejected && "bg-red-50 border border-red-200",
                                                            isWaiting && "bg-white border border-gray-200"
                                                        )}
                                                    >
                                                        {/* Approver Avatar */}
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-white flex-shrink-0">
                                                            {approver.avatarUrl ? (
                                                                <Image src={approver.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" />
                                                            ) : (
                                                                approver.name?.[0] || <User size={16} />
                                                            )}
                                                        </div>

                                                        {/* Approver Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {approver.name || 'Unknown'}
                                                                </p>
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                                    {approver.role.toLowerCase()}
                                                                </span>
                                                            </div>

                                                            {approval && (
                                                                <div className="mt-1 space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        {hasApproved && (
                                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                                                <Check size={12} />
                                                                                Approved
                                                                            </span>
                                                                        )}
                                                                        {hasRejected && (
                                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                                                                                <X size={12} />
                                                                                Rejected
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[10px] text-gray-500">
                                                                            {format(new Date(approval.updatedAt), "MMM d, h:mm a")}
                                                                        </span>
                                                                    </div>
                                                                    {approval.comment && (
                                                                        <p className="text-xs text-gray-600 italic bg-white/50 p-2 rounded-lg">
                                                                            &quot;{approval.comment}&quot;
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {isWaiting && isPending && (
                                                                <p className="text-xs text-amber-600 font-medium mt-1">
                                                                    Awaiting response...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
