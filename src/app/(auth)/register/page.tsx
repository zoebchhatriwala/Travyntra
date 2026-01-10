"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    CheckCircle2,
    Loader2,
    ArrowRight,
    User,
    Mail,
    KeyRound,
    Building2,
    Globe2,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegType = "COMPANY" | "AGENT" | null;

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [regType, setRegType] = React.useState<RegType>(null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!regType) return;

        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const name = formData.get("name") as string;
        const companyName = formData.get("companyName") as string;

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    type: regType,
                    companyName: regType === "COMPANY" ? companyName : undefined
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Registration failed");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-8 py-10">
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-100/50 animate-bounce">
                        <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Onboarding Started.</h2>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                        Your {regType === "COMPANY" ? "corporate portal" : "agent account"} is awaiting verification. You will receive an email once your workspace is live.
                    </p>
                </div>
                <div className="pt-4">
                    <Button variant="outline" asChild className="h-14 px-8 rounded-2xl font-bold border-2 border-slate-100">
                        <Link href="/login" className="flex items-center gap-2">
                            Back to Login <ArrowRight size={18} />
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (!regType) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Join Workspace.</h1>
                    <p className="text-lg text-slate-500 font-medium">Select how you want to use the platform.</p>
                </div>

                <div className="grid gap-6">
                    <button
                        onClick={() => setRegType("COMPANY")}
                        className="group p-8 text-left bg-white rounded-[32px] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all"
                    >
                        <div className="w-14 h-14 bg-joy-purple/50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <Building2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">I am a Corporate Admin</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Register your company, set up approval hierarchies, and manage staff travel requests.
                        </p>
                    </button>

                    <button
                        onClick={() => setRegType("AGENT")}
                        className="group p-8 text-left bg-white rounded-[32px] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all"
                    >
                        <div className="w-14 h-14 bg-joy-blue/50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Globe2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">I am a Travel Agent</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Fulfill global travel requests, manage tickets, and service corporate portfolios at scale.
                        </p>
                    </button>
                </div>

                <div className="text-center pt-4">
                    <p className="text-slate-500 font-medium">
                        Just a regular staff member? <br />
                        <span className="text-slate-400">Please use the private link sent by your admin.</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
                <button
                    onClick={() => setRegType(null)}
                    className="flex items-center gap-2 text-indigo-600 font-black text-sm mb-4 hover:opacity-80 transition-opacity"
                >
                    <ArrowLeft size={16} /> CHANGE ACCOUNT TYPE
                </button>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">
                    {regType === "COMPANY" ? "Corporate Setup." : "Agent Enrollment."}
                </h1>
                <p className="text-lg text-slate-500 font-medium">Create your credentials to get started.</p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                <form onSubmit={onSubmit} className="space-y-5">
                    {regType === "COMPANY" && (
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-sm font-bold text-slate-700 ml-1">
                                Company Name
                            </Label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    placeholder="Acme Corporation"
                                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 transition-all"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">
                            Your Full Name
                        </Label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">
                            {regType === "COMPANY" ? "Business Email" : "Agent Email"}
                        </Label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@organization.com"
                                className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">
                            Create Password
                        </Label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-50 border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99] mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            "Finalize Enrollment"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
