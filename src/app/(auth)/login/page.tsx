"use client";

import * as React from "react";
import { signIn, getSession, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import Link from "next/link";
import { Eye, EyeOff, Loader2, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/lib/constants/roles";


export default function LoginPage() {
    const { data: session, status } = useSession();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [showPassword, setShowPassword] = React.useState(false);

    const navigateUser = (user: Session["user"]) => {
        // Allow user to sign-in from a different account
        if (user?.isBlocked) {
            return
        }

        // Switch to user's dashboard
        if (user?.role === UserRole.SUPER_ADMIN) {
            window.location.href = "/admin/dashboard";
        } else if (user?.role === UserRole.TRAVEL_AGENT) {
            window.location.href = "/agent/dashboard";
        } else if (user?.role === UserRole.COMPANY_ADMIN && user.companySlug) {
            window.location.href = `/company/${user.companySlug}/admin`;
        } else if (user?.role === UserRole.EMPLOYEE && user.companySlug) {
            window.location.href = `/company/${user.companySlug}/dashboard`;
        } else if (user?.role === UserRole.AGENCY_EMPLOYEE) {
            window.location.href = "/agent/dashboard";
        }
    };

    React.useEffect(() => {
        if (status === "authenticated" && session?.user) {
            navigateUser(session.user);
        }
    }, [status, session]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const result = await signIn("normal-login", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError(result.error === "CredentialsSignin" ? "The email or password you entered is incorrect." : result.error);
            setIsLoading(false);
            return;
        }

        const newSession = await getSession();

        setIsLoading(false);

        if (newSession?.user) {
            navigateUser(newSession.user);
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Welcome back.</h1>
                <p className="text-lg text-slate-500 font-medium">Enter your credentials to access your portal.</p>
            </div>

            <div className="bg-white p-8 rounded-corner-xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">
                            Business Email
                        </Label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@company.com"
                                className="h-14 pl-12 rounded-corner-sm border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="password" className="text-sm font-bold text-slate-700">
                                Password
                            </Label>
                            <Link href="/forgot-password" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-14 pl-12 pr-12 rounded-corner-sm border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-corner-lg bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                {error}
                            </div>
                            {error.includes("verify your email") && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-fit border-rose-200 text-rose-600 hover:bg-rose-100 font-black m-auto"
                                >
                                    <Link href={`/verify?email=${encodeURIComponent(document.querySelector<HTMLInputElement>('#email')?.value || '')}`}>
                                        Verify Email Now
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                    <p className="text-slate-500 font-medium">
                        New to the platform?{" "}
                        <Link href="/register" className="font-black text-indigo-600 hover:text-indigo-700 hover:underline">
                            Join your workspace
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
