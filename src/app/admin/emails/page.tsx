
"use client";

import { useState } from "react";
import {
    getGeneralNotificationTemplate,
    getDigestEmailTemplate,
    getStaffWelcomeTemplate,
    getOtpEmailTemplate
} from "@/lib/email-templates";
import {
    Mail,
    Bell,
    Briefcase,
    ShieldCheck,
    Layout,
    Eye,
    Copy,
    Check,
    Smartphone,
    Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TEMPLATES = [
    {
        id: "otp",
        name: "OTP Verification",
        description: "Sent during registration to verify email address",
        icon: ShieldCheck,
        fn: () => getOtpEmailTemplate("Alex Rivers", "482931")
    },
    {
        id: "notification",
        name: "General Notification",
        description: "Generic template for system alerts and updates",
        icon: Bell,
        fn: () => getGeneralNotificationTemplate(
            "New Bid Received",
            "A travel agent has submitted a new bid for your 'Business Trip to London' request.",
            "/dashboard/requests/123",
            "View Bid"
        )
    },
    {
        id: "welcome",
        name: "Staff Welcome",
        description: "Sent to newly added agency employees",
        icon: Briefcase,
        fn: () => getStaffWelcomeTemplate(
            "Sarah Jenkins",
            "sarah.j@example.com",
            "trV-2026-XyZ",
            "/login"
        )
    },
    {
        id: "digest",
        name: "Daily Digest",
        description: "Summary of activity sent to users daily",
        icon: Layout,
        fn: () => getDigestEmailTemplate(
            "Michael Chen",
            3,
            2,
            "/dashboard"
        )
    }
];

export default function EmailTemplatesPage() {
    const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
    const [copied, setCopied] = useState(false);

    const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];
    const html = selectedTemplate.fn();

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(html);
        setCopied(true);
        toast.success("HTML copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="container mx-auto px-6 py-10 max-w-7xl">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Mail className="text-indigo-600" size={32} />
                    Email Templates
                </h1>
                <p className="text-gray-500 font-medium">Preview and manage premium email communications for the platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar: Navigation */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-corner-xl border border-gray-100 p-2 shadow-sm">
                        <p className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Available Templates</p>
                        <nav className="space-y-1">
                            {TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                const isActive = selectedTemplateId === template.id;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        className={cn(
                                            "w-full flex items-start gap-4 p-4 rounded-corner-lg transition-all duration-200 text-left group",
                                            isActive
                                                ? "bg-indigo-50 ring-1 ring-indigo-100"
                                                : "hover:bg-gray-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-corner-md shrink-0",
                                            isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                                        )}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <p className={cn(
                                                "font-bold text-sm mb-0.5",
                                                isActive ? "text-indigo-900" : "text-gray-700"
                                            )}>
                                                {template.name}
                                            </p>
                                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                                {template.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Main Content: Preview */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="bg-white rounded-corner-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px]">
                        {/* Preview Toolbar */}
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex bg-gray-100 p-1 rounded-corner-lg">
                                    <button
                                        onClick={() => setPreviewMode("desktop")}
                                        className={cn(
                                            "p-2 rounded-corner-md transition-all",
                                            previewMode === "desktop" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Monitor size={18} />
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode("mobile")}
                                        className={cn(
                                            "p-2 rounded-corner-md transition-all",
                                            previewMode === "mobile" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Smartphone size={18} />
                                    </button>
                                </div>
                                <div className="h-6 w-px bg-gray-100 mx-2 hidden sm:block" />
                                <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <Eye size={14} />
                                    Live Preview
                                </div>
                            </div>

                            <button
                                onClick={handleCopyHtml}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-corner-md text-sm font-bold hover:bg-gray-800 transition-colors"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? "Copied!" : "Copy HTML"}
                            </button>
                        </div>

                        {/* Iframe Preview Container */}
                        <div className="flex-1 bg-gray-50/50 p-4 md:p-8 flex justify-center overflow-auto">
                            <div
                                className={cn(
                                    "bg-white shadow-2xl transition-all duration-500 ease-in-out border border-gray-100 overflow-hidden rounded-corner-xl",
                                    previewMode === "desktop" ? "w-full max-w-[600px]" : "w-[375px]"
                                )}
                            >
                                <iframe
                                    srcDoc={html}
                                    className="w-full h-[800px] border-none"
                                    title="Email Template Preview"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
