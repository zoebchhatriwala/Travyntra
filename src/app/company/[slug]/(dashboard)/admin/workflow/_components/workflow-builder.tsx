"use client";

import { useState } from "react";
import Image from "next/image";
import {
    GitBranch,
    ArrowRight,
    User,
    ShieldCheck,
    Globe,
    Plus,
    Settings,
    Trash2,
    Users,
    Check,
    Search,
    ChevronLeft,
    ChevronRight,

} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveWorkflowConfig } from "../actions";
import { createTestRequest, approveTestStep, rejectTestStep } from "../test-actions";
import { ApprovalType, WorkflowStepKind } from "@prisma/client";

import { type WorkflowStepConfig as WorkflowStep } from "@/types/workflow/step";

interface WorkflowBuilderProps {
    slug: string;
    availableUsers: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;

    }[];
    initialWorkflow: {
        steps: Array<{
            id: string;
            name: string;
            order: number;
            type: ApprovalType;
            approvers: Array<{ id: string }>;
            kind?: WorkflowStepKind;

        }>;
    } | null;
    simulationRequests?: Array<{
        id: string;
        title: string;
        user: { name: string | null; email: string };
        approvalSteps: Array<{
            status: string;
            step: { name: string };
            approvals: Array<{
                userId: string;
                status: string;
                user: { name: string | null; email: string };
            }>;
        }>;
        workflow: Array<{
            action: string;
            comment?: string | null;
        }>;
    }>;
    currentUserId?: string;
}

export function WorkflowBuilder({ slug, availableUsers, initialWorkflow, simulationRequests = [], currentUserId }: WorkflowBuilderProps) {
    const [steps, setSteps] = useState<WorkflowStep[]>(
        initialWorkflow?.steps?.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            type: s.type,
            kind: s.kind || WorkflowStepKind.INTERNAL_APPROVAL,
            approverIds: s.approvers.map((a) => a.id)
        })) || [
            { name: "Step 1 Approval", order: 1, type: ApprovalType.ANY, kind: WorkflowStepKind.INTERNAL_APPROVAL, approverIds: [] }
        ]
    );

    const [isSaving, setIsSaving] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
    const [pageOffsets, setPageOffsets] = useState<Record<number, number>>({});

    const USERS_PER_PAGE = 6;

    const addStep = () => {
        setSteps([...steps, { name: "New Step", order: steps.length + 1, type: ApprovalType.ANY, kind: WorkflowStepKind.INTERNAL_APPROVAL, approverIds: [] }]);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
        setSteps(newSteps);
    };

    const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setSteps(newSteps);
    };

    const toggleApprover = (stepIndex: number, userId: string) => {
        const step = steps[stepIndex];
        const isApprover = step.approverIds.includes(userId);
        const newApproverIds = isApprover
            ? step.approverIds.filter(id => id !== userId)
            : [...step.approverIds, userId];

        updateStep(stepIndex, { approverIds: newApproverIds });
    };



    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveWorkflowConfig(slug, steps.map(s => ({
                name: s.name,
                order: s.order,
                type: s.type,
                kind: s.kind,
                approverIds: s.approverIds
            })));
            toast.success("Workflow configuration updated successfully!");
        } catch {
            toast.error("Failed to save workflow configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateTest = async () => {
        if (!currentUserId) {
            toast.error("You must be logged in to simulate a request.");
            return;
        }
        setIsSimulating(true);
        try {
            await createTestRequest(slug, currentUserId);
            toast.success("Simulation request created!");
        } catch {
            toast.error("Failed to create simulation request.");
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Visual Flow Preview */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Flow Preview</CardTitle>
                            <CardDescription className="text-gray-500 font-medium pb-2">Visualization of the approval sequence.</CardDescription>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={handleCreateTest}
                                disabled={isSimulating}
                                className="rounded-corner-md border-indigo-200 text-indigo-600 font-bold px-6 h-10 hover:bg-indigo-50"
                            >
                                {isSimulating ? "Initiating..." : "Simulate Flow"}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-indigo-600 text-white rounded-corner-md font-bold px-6 h-10 hover:bg-indigo-700"
                            >
                                {isSaving ? "Saving..." : "Save Protocol"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <div className="flex flex-wrap items-center gap-4 p-8 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100 relative overflow-hidden">
                        {/* Start */}
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-white rounded-corner-lg shadow-sm flex items-center justify-center text-gray-400 ring-1 ring-gray-100">
                                <User size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</p>
                        </div>

                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <ArrowRight size={16} className="text-gray-300" />
                                <div className="text-center space-y-2">
                                    <div className={`w-14 h-14 rounded-corner-lg shadow-lg flex items-center justify-center text-white relative ${step.kind === WorkflowStepKind.AGENT_QUOTATION ? 'bg-indigo-900 shadow-indigo-900/20' : 'bg-indigo-600 shadow-indigo-100'}`}>
                                        {step.kind === WorkflowStepKind.AGENT_QUOTATION ? (
                                            <Globe size={24} />
                                        ) : (
                                            <>
                                                <Badge className="absolute -top-1 -right-1 bg-white text-indigo-600 border-none w-5 h-5 flex items-center justify-center p-0 rounded-full text-[10px] shadow-sm">
                                                    {step.approverIds.length}
                                                </Badge>
                                                <ShieldCheck size={24} />
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest truncate max-w-[80px]">
                                        {step.name}
                                    </p>
                                </div>
                            </div>
                        ))}

                        <ArrowRight size={16} className="text-gray-300" />

                        {/* End */}
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-white rounded-corner-lg shadow-sm flex items-center justify-center text-blue-600 ring-1 ring-gray-100">
                                <Globe size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agency</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-8">
                {/* Workflow Configuration */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Settings size={20} className="text-indigo-600" /> Step Configuration
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">Define who needs to approve at each stage.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={addStep} className="rounded-corner-md border-gray-200 font-bold text-xs uppercase tracking-widest px-4">
                            <Plus size={16} className="mr-2" /> Add Step
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                        {steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="p-6 bg-gray-50/50 rounded-corner-xl border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-corner-sm flex items-center justify-center font-black text-sm">
                                            {stepIdx + 1}
                                        </div>
                                        <Input
                                            value={step.name}
                                            onChange={(e) => updateStep(stepIdx, { name: e.target.value })}
                                            className="bg-transparent border-none text-gray-900 font-black text-lg focus-visible:ring-0 p-0 h-auto w-auto min-w-[200px]"
                                            placeholder="Step Name"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-white p-1 rounded-corner-md ring-1 ring-gray-100">
                                            <button
                                                onClick={() => updateStep(stepIdx, { kind: WorkflowStepKind.INTERNAL_APPROVAL })}
                                                className={`px-3 py-1.5 rounded-corner-sm text-[10px] font-black uppercase tracking-tight transition-all ${(!step.kind || step.kind === WorkflowStepKind.INTERNAL_APPROVAL) ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                Internal
                                            </button>
                                            <button
                                                onClick={() => updateStep(stepIdx, { kind: WorkflowStepKind.AGENT_QUOTATION })}
                                                className={`px-3 py-1.5 rounded-corner-sm text-[10px] font-black uppercase tracking-tight transition-all ${step.kind === WorkflowStepKind.AGENT_QUOTATION ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                Agent Bid
                                            </button>
                                        </div>

                                        {(!step.kind || step.kind === WorkflowStepKind.INTERNAL_APPROVAL) && (
                                            <div className="flex bg-white p-1 rounded-corner-md ring-1 ring-gray-100 ml-2">
                                                <button
                                                    onClick={() => updateStep(stepIdx, { type: "ANY" })}
                                                    className={`px-3 py-1.5 rounded-corner-sm text-[10px] font-black uppercase tracking-tight transition-all ${step.type === "ANY" ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    One Must Approve
                                                </button>
                                                <button
                                                    onClick={() => updateStep(stepIdx, { type: "ALL" })}
                                                    className={`px-3 py-1.5 rounded-corner-sm text-[10px] font-black uppercase tracking-tight transition-all ${step.type === "ALL" ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    All Must Approve
                                                </button>
                                            </div>
                                        )}
                                        <Button
                                            variant="ghost"
                                            onClick={() => removeStep(stepIdx)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-corner-md ml-2"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {step.kind === WorkflowStepKind.AGENT_QUOTATION ? (
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-corner-lg flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                <Globe size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-indigo-900">Agent Bidding Phase</h4>
                                                <p className="text-xs text-indigo-700 mt-1">
                                                    During this step, the request will be open for bidding to all connected travel agencies.
                                                    The workflow will pause until an internal admin reviews and accepts a bid.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Users size={12} /> Assigned Specific Users
                                                </label>
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <Input
                                                        placeholder="Search users..."
                                                        value={searchQueries[stepIdx] || ""}
                                                        onChange={(e) => {
                                                            setSearchQueries({ ...searchQueries, [stepIdx]: e.target.value });
                                                            setPageOffsets({ ...pageOffsets, [stepIdx]: 0 });
                                                        }}
                                                        className="h-8 pl-8 pr-3 text-[10px] font-bold rounded-corner-md border-gray-100 bg-white w-[180px] focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {(() => {
                                                const query = (searchQueries[stepIdx] || "").toLowerCase();
                                                const filteredUsers = availableUsers.filter(u => {
                                                    const matchesQuery = u.name?.toLowerCase().includes(query) ||
                                                        u.email.toLowerCase().includes(query);
                                                    return matchesQuery;
                                                });
                                                const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
                                                const currentPage = pageOffsets[stepIdx] || 0;
                                                const paginatedUsers = filteredUsers.slice(
                                                    currentPage * USERS_PER_PAGE,
                                                    (currentPage + 1) * USERS_PER_PAGE
                                                );

                                                return (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {paginatedUsers.length > 0 ? paginatedUsers.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => toggleApprover(stepIdx, user.id)}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-corner-lg border transition-all ${step.approverIds.includes(user.id)
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10'
                                                                        : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
                                                                        }`}
                                                                >
                                                                    <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center relative">
                                                                        {user.avatarUrl ? (
                                                                            <Image src={user.avatarUrl} alt={user.name || ""} width={24} height={24} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <User size={12} />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs font-bold">{user.name || user.email}</span>
                                                                    {step.approverIds.includes(user.id) && <Check size={12} className="text-indigo-600" />}

                                                                </button>
                                                            )) : (
                                                                <div className="w-full py-4 text-center">
                                                                    <p className="text-xs font-bold text-gray-400 italic">No users found matching &quot;{searchQueries[stepIdx]}&quot;</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {totalPages > 1 && (
                                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                    Page {currentPage + 1} of {totalPages}
                                                                </p>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => setPageOffsets({ ...pageOffsets, [stepIdx]: Math.max(0, currentPage - 1) })}
                                                                        disabled={currentPage === 0}
                                                                        className="h-6 w-6 rounded-corner-sm border-gray-100"
                                                                    >
                                                                        <ChevronLeft size={12} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => setPageOffsets({ ...pageOffsets, [stepIdx]: Math.min(totalPages - 1, currentPage + 1) })}
                                                                        disabled={currentPage >= totalPages - 1}
                                                                        className="h-6 w-6 rounded-corner-sm border-gray-100"
                                                                    >
                                                                        <ChevronRight size={12} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Simulation Sandbox */}
            {simulationRequests.length > 0 && (
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-xl overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <GitBranch size={20} className="text-indigo-600" /> Simulation Sandbox
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-medium">Test your workflow configuration with dummy requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        {simulationRequests.map((req) => {
                            const currentStep = req.approvalSteps.find((s) => s.status === "PENDING");
                            return (
                                <div key={req.id} className="p-6 bg-indigo-50/30 rounded-corner-xl border border-indigo-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-indigo-900">{req.title}</p>
                                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">By {req.user.name}</p>
                                        </div>
                                        <Badge className="bg-indigo-600 text-white border-none font-bold text-[10px] px-3 py-1 rounded-full">
                                            {currentStep ? `Awaiting: ${currentStep.step.name}` : "Process Complete"}
                                        </Badge>
                                    </div>

                                    {currentStep && (
                                        <div className="flex flex-wrap gap-4">
                                            {currentStep.approvals.filter((a) => a.status === "PENDING").map((approval) => (
                                                <div key={approval.userId} className="flex items-center gap-3 p-3 bg-white rounded-corner-lg shadow-sm ring-1 ring-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">
                                                        {approval.user.name?.[0] || approval.user.email[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-900 truncate max-w-[100px]">{approval.user.name}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <button
                                                                onClick={() => approveTestStep(req.id, approval.userId, slug)}
                                                                className="text-[9px] font-black text-green-600 hover:text-green-700 uppercase"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => rejectTestStep(req.id, approval.userId, slug)}
                                                                className="text-[9px] font-black text-red-600 hover:text-red-700 uppercase"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {req.workflow.length > 0 && (
                                        <div className="pt-4 border-t border-indigo-100 gap-2 flex flex-col">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Audit Trail</p>
                                            <div className="space-y-2">
                                                {req.workflow.map((action, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 text-[10px] font-medium text-indigo-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                        <span className="font-black italic underline decoration-indigo-200">{action.action}</span>
                                                        <span className="text-indigo-400">{action.comment}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
