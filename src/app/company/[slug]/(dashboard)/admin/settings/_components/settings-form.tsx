"use client";

import { useState } from "react";
import {
    Building2,
    Globe,
    ShieldCheck,
    Save,
    Loader2,
    Image as ImageIcon,
    Lock,
    Check
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCompanySettings } from "../actions";

interface SettingsFormProps {
    company: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
        domain: string | null;
        plan: string;
    };
}

export function SettingsForm({ company }: SettingsFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState(company.name);
    const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
    const [domain, setDomain] = useState(company.domain || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccess(false);
        const res = await updateCompanySettings(company.id, { name, logoUrl, domain });
        setIsLoading(false);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Organization Profile</CardTitle>
                    <CardDescription className="text-gray-500 font-medium">Control how your workspace is identified across the ecosystem.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label htmlFor="orgName" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Legal Name</Label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    id="orgName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-bold transition-all"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Workspace ID (Public Slug)</Label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <Input
                                    id="slug"
                                    value={company.slug}
                                    disabled
                                    className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-100/50 text-gray-400 font-bold cursor-not-allowed"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold px-1">Namespace is globally unique and immutable.</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="logoUrl" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Logo URL</Label>
                            <div className="relative group">
                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    id="logoUrl"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-bold transition-all"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={`h-14 px-8 rounded-2xl ${success ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"} text-white font-black shadow-lg hover:scale-[1.02] transition-all`}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin mr-2" />
                            ) : success ? (
                                <Check className="mr-2 h-4 w-4" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {success ? "CHANGES SAVED" : "PERSIST CHANGES"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Security & Identity</CardTitle>
                    <CardDescription className="text-gray-500 font-medium">Manage domain verification and employee access rules.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="domain" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trusted Domain</Label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-violet-600 transition-colors" />
                            <Input
                                id="domain"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-bold transition-all focus:ring-violet-500/20"
                                placeholder="e.g. acme-corp.com"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold px-1">Signups from this domain are automatically routed to your workspace.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white opacity-60">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Deployment Tier</CardTitle>
                    <CardDescription className="text-gray-500 font-medium">Your account is currently provisioned on the <strong>{company.plan}</strong> tier.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm font-bold text-gray-400">Subscription management is handled by the Travyntra Super-Admin console.</p>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
