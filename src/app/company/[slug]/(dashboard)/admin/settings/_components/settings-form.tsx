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
    Check,
    Coins,
    Clock,
    MapPin,
    Activity,
    CreditCard
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { TIMEZONES } from "@/lib/constants/timezones";
import { CountrySelect } from "@/components/ui/country-select";

interface SettingsFormProps {
    company: {
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
        domain: string | null;
        plan: string;
        currency: string;
        timezone: string;
        country: string | null;
    };
}

export function SettingsForm({ company }: SettingsFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState(company.name);
    const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
    const [domain, setDomain] = useState(company.domain || "");
    const [currency, setCurrency] = useState(company.currency || "USD");
    const [timezone, setTimezone] = useState(company.timezone || "UTC");
    const [country, setCountry] = useState(company.country || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccess(false);
        const res = await updateCompanySettings(company.id, {
            name,
            logoUrl,
            domain,
            currency,
            timezone,
            country
        });
        setIsLoading(false);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    const [activeTab, setActiveTab] = useState("organization");

    const tabs = [
        { id: "organization", label: "Organization", icon: Building2 },
        { id: "regional", label: "Regional", icon: Globe },
        { id: "security", label: "Security & ID", icon: Lock },
        { id: "billing", label: "Deployment", icon: Activity },
    ];

    return (
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 relative min-h-[calc(100vh-200px)]">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 space-y-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6 pb-24">
                {activeTab === "organization" && (
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Building2 size={20} />
                                </div>
                                Organization Profile
                            </CardTitle>
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
                        </CardContent>
                    </Card>
                )}

                {activeTab === "regional" && (
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <Globe size={20} />
                                </div>
                                Regional Settings
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">Configure your default currency and locale preferences.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="currency" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</Label>
                                    <div className="relative group">
                                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 font-bold">
                                                <SelectValue placeholder="Select Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                                <SelectItem value="JPY">JPY (¥)</SelectItem>
                                                <SelectItem value="INR">INR (₹)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="timezone" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Timezone</Label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                        <Select value={timezone} onValueChange={setTimezone}>
                                            <SelectTrigger className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 font-bold">
                                                <SelectValue placeholder="Select Timezone" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIMEZONES.map((tz) => (
                                                    <SelectItem key={tz} value={tz}>
                                                        {tz.replace(/_/g, " ")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Country</Label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none" />
                                        <CountrySelect
                                            value={country}
                                            onChange={setCountry}
                                            className="h-12 pl-11 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-bold transition-all"
                                            placeholder="Select Country"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "security" && (
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                                    <Lock size={20} />
                                </div>
                                Security & Identity
                            </CardTitle>
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
                )}

                {activeTab === "billing" && (
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden bg-white opacity-90 animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Activity size={20} />
                                </div>
                                Deployment Tier
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">Your account is currently provisioned on the <strong>{company.plan}</strong> tier.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4">
                            <div className="p-8 bg-gray-50 rounded-[24px] border border-dashed border-gray-200 text-center flex flex-col items-center justify-center space-y-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                    <CreditCard className="text-gray-400" size={32} />
                                </div>
                                <div className="max-w-xs">
                                    <p className="text-sm font-bold text-gray-900 mb-1">Super-Admin Controlled</p>
                                    <p className="text-xs font-medium text-gray-500">Subscription management is handled by the Travyntra Super-Admin console.</p>
                                </div>
                                <Button variant="outline" className="border-gray-200 text-xs font-black uppercase tracking-wider rounded-xl">
                                    Contact Support
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Sticky Actions Bar */}
            <div className="fixed bottom-0 right-0 left-72 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 px-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-2">
                    {success && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-left-2 transition-all">
                            <Check size={16} />
                            <span>All changes saved successfully</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setName(company.name);
                            setLogoUrl(company.logoUrl || "");
                            setDomain(company.domain || "");
                            setCurrency(company.currency || "USD");
                            setTimezone(company.timezone || "UTC");
                            setCountry(company.country || "");
                        }}
                        className="font-bold text-gray-500 hover:text-gray-900"
                    >
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className={`h-12 px-8 rounded-xl ${success ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"} text-white font-black shadow-lg hover:scale-[1.02] transition-all min-w-[160px]`}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : success ? (
                            <Check className="mr-2 h-4 w-4" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {success ? "SAVED" : "SAVE CHANGES"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
