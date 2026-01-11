"use client";

import { useState } from "react";
import {
    GitBranch,
    ArrowRight,
    User,
    ShieldCheck,
    Globe,
    Plus,
    BellRing,
    Settings,
    Trash2,
    Users,
    Check
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
import { ApprovalType } from "@prisma/client";

interface WorkflowStep {
    id?: string;
    name: string;
    order: number;
    type: ApprovalType;
    approverIds: string[];
}

interface WorkflowBuilderProps {
    slug: string;
    availableUsers: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
    }[];
    initialWorkflow: any;
    simulationRequests?: any[];
    currentUserId?: string;
}

export function WorkflowBuilder({ slug, availableUsers, initialWorkflow, simulationRequests = [], currentUserId }: WorkflowBuilderProps) {
    const [steps, setSteps] = useState<WorkflowStep[]>(
        initialWorkflow?.steps?.map((s: any) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            type: s.type,
            approverIds: s.approvers.map((a: any) => a.id)
        })) || [
            { name: "Manager Approval", order: 1, type: ApprovalType.ANY, approverIds: [] }
        ]
    );

    const [isSaving, setIsSaving] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);

    const addStep = () => {
        setSteps([...steps, { name: "New Step", order: steps.length + 1, type: ApprovalType.ANY, approverIds: [] }]);
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
            await saveWorkflowConfig(slug, steps as any);
            toast.success("Workflow configuration updated successfully!");
        } catch (error) {
            toast.error("Failed to save workflow configuration.");
            console.error(error);
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
        } catch (error) {
            toast.error("Failed to create simulation request.");
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Visual Flow Preview */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
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
                                className="rounded-xl border-indigo-200 text-indigo-600 font-bold px-6 h-10 hover:bg-indigo-50"
                            >
                                {isSimulating ? "Initiating..." : "Simulate Flow"}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-indigo-600 text-white rounded-xl font-bold px-6 h-10 hover:bg-indigo-700"
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
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-400 ring-1 ring-gray-100">
                                <User size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</p>
                        </div>

                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <ArrowRight size={16} className="text-gray-300" />
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center text-white">
                                        <Badge className="absolute -top-1 -right-1 bg-white text-indigo-600 border-none w-5 h-5 flex items-center justify-center p-0 rounded-full text-[10px] shadow-sm">
                                            {step.approverIds.length}
                                        </Badge>
                                        <ShieldCheck size={24} />
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
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 ring-1 ring-gray-100">
                                <Globe size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agency</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Simulation Sandbox */}
            {simulationRequests.length > 0 && (
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <GitBranch size={20} className="text-indigo-600" /> Simulation Sandbox
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-medium">Test your workflow configuration with dummy requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        {simulationRequests.map((req: any) => {
                            const currentStep = req.approvalSteps.find((s: any) => s.status === "PENDING");
                            return (
                                <div key={req.id} className="p-6 bg-indigo-50/30 rounded-[32px] border border-indigo-100 space-y-4">
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
                                            {currentStep.approvals.filter((a: any) => a.status === "PENDING").map((approval: any) => (
                                                <div key={approval.userId} className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
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
                                                {req.workflow.map((action: any, idx: number) => (
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

            <div className="grid grid-cols-1 gap-8">
                {/* Workflow Configuration */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Settings size={20} className="text-indigo-600" /> Step Configuration
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">Define who needs to approve at each stage.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={addStep} className="rounded-xl border-gray-200 font-bold text-xs uppercase tracking-widest px-4">
                            <Plus size={16} className="mr-2" /> Add Step
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                        {steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm">
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
                                        <div className="flex bg-white p-1 rounded-xl ring-1 ring-gray-100">
                                            <button
                                                onClick={() => updateStep(stepIdx, { type: "ANY" })}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${step.type === "ANY" ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                One Must Approve
                                            </button>
                                            <button
                                                onClick={() => updateStep(stepIdx, { type: "ALL" })}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${step.type === "ALL" ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                All Must Approve
                                            </button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => removeStep(stepIdx)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Users size={12} /> Assigned Approvers
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableUsers.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => toggleApprover(stepIdx, user.id)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${step.approverIds.includes(user.id)
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10'
                                                    : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.name || ""} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={12} />
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold">{user.name || user.email}</span>
                                                {step.approverIds.includes(user.id) && <Check size={12} className="text-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Additional Settings (Static for now) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <BellRing size={20} className="text-indigo-600" /> Notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                            {[
                                { label: "Notify stage approvers on entry", status: true },
                                { label: "Notify requester on rejection", status: true },
                                { label: "Notify requester on final approval", status: true },
                            ].map((event, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-600">{event.label}</span>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${event.status ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${event.status ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <GitBranch size={20} className="text-indigo-600" /> Logic Overrides
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                            <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100">
                                <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Global Bypass</p>
                                <p className="text-[10px] font-medium text-amber-700 leading-relaxed italic">
                                    Requests initiated by <strong>Company Admin</strong> skip regular workflow stages and go directly to Agency.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
