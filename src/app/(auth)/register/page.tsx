"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
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
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const router = useRouter();
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

            router.push(`/verify?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
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
                        className="group p-8 text-left bg-white rounded-corner-xl border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all"
                    >
                        <div className="w-14 h-14 bg-purple-100/50 rounded-corner-lg flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <Building2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">I am a Company Admin</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Register your company, set up approval hierarchies, and manage staff travel requests.
                        </p>
                    </button>

                    <button
                        onClick={() => setRegType("AGENT")}
                        className="group p-8 text-left bg-white rounded-corner-xl border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all"
                    >
                        <div className="w-14 h-14 bg-blue-100/50 rounded-corner-lg flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Globe2 className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">I am an Agency</h3>
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
                    {regType === "COMPANY" ? "Company Setup." : "Agency Enrollment."}
                </h1>
                <p className="text-lg text-slate-500 font-medium">Create your credentials to get started.</p>
            </div>

            <div className="bg-white p-8 rounded-corner-xl shadow-xl shadow-slate-200/50 border border-slate-100">
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
                                    className="h-14 pl-12 rounded-corner-sm border-2 transition-all"
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
                                className="h-14 pl-12 rounded-corner-sm border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">
                            {regType === "COMPANY" ? "Business Email" : "Agency Email"}
                        </Label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@organization.com"
                                className="h-14 pl-12 rounded-corner-sm border-2 transition-all"
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
                                className="h-14 pl-12 rounded-corner-sm border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-corner-lg bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99] mt-4"
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
