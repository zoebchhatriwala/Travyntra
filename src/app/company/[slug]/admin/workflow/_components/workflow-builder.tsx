"use client";

import {
    GitBranch,
    ArrowRight,
    User,
    ShieldCheck,
    Globe,
    Plus,
    BellRing,
    Settings
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

export function WorkflowBuilder() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Strategy Card */}
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Active Protocol</CardTitle>
                            <CardDescription className="text-gray-500 font-medium whitespace-nowrap">Current approval chain for all travel requests.</CardDescription>
                        </div>
                        <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] px-3 h-7 rounded-lg">
                            TRIPLE-LAYER VERIFICATION
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100 relative overflow-hidden">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-32 right-32 h-0.5 bg-gray-100 -translate-y-1/2 z-0" />

                        {/* Step 1 */}
                        <div className="relative z-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-center text-indigo-600 ring-1 ring-gray-100">
                                <User size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Employee</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Initiation</p>
                            </div>
                        </div>

                        <ArrowRight size={24} className="text-gray-300 relative z-10" />

                        {/* Step 2 */}
                        <div className="relative z-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center text-white ring-4 ring-indigo-50">
                                <ShieldCheck size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Internal Admin</p>
                                <p className="text-[10px] font-bold text-indigo-600 mt-1 italic font-black">Gatekeeper</p>
                            </div>
                        </div>

                        <ArrowRight size={24} className="text-gray-300 relative z-10" />

                        {/* Step 3 */}
                        <div className="relative z-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-center text-blue-600 ring-1 ring-gray-100">
                                <Globe size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Fulfillers</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Execution</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Notification Settings */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <BellRing size={20} className="text-indigo-600" /> Webhook Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        {[
                            { label: "Request Submission", status: true },
                            { label: "Internal Rejection", status: true },
                            { label: "Agent Confirmation", status: false },
                            { label: "Ticket Issuance", status: true },
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

                {/* Advanced Logic */}
                <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <GitBranch size={20} className="text-indigo-600" /> Exception Rules
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                            <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                                <Settings size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Auto-Approval</p>
                                <p className="text-[10px] font-medium text-indigo-700 leading-relaxed italic">
                                    Requests under <strong>$500</strong> with a <strong>"Routine"</strong> purpose can bypass Internal Admin verify.
                                </p>
                            </div>
                        </div>
                        <Button className="w-full h-12 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black">
                            <Plus size={16} className="mr-2" /> Define New Rule
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
