
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/actions/auth";
import { toast } from "sonner";
import Link from "next/link";

function VerifyResetContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";

    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const otp = formData.get("otp") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            const result = await resetPassword({
                email,
                otp,
                password
            });

            if (result.success) {
                setIsSuccess(true);
                toast.success("Password reset successfully!");
            } else {
                toast.error(result.error || "Failed to reset password. Please check your code.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-white p-10 rounded-corner-xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={48} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-900">All set!</h2>
                        <p className="text-slate-500 font-medium text-lg">Your password has been reset successfully. You can now log in with your new credentials.</p>
                    </div>
                    <Button
                        asChild
                        className="w-full h-14 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01]"
                    >
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">New password.</h1>
                <p className="text-lg text-slate-500 font-medium">Verify your code and choose a secure new password.</p>
            </div>

            <div className="bg-white p-8 rounded-corner-xl shadow-xl shadow-slate-200/50 border border-slate-100">
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-bold text-slate-700 ml-1">
                            6-Digit Code
                        </Label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="otp"
                                name="otp"
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                className="h-14 pl-12 rounded-corner-sm border-2 transition-all tracking-[0.5em] font-mono text-xl"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1 mt-1">Sent to: {email}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-bold text-slate-700 ml-1">
                            New Password
                        </Label>
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

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700 ml-1">
                            Confirm New Password
                        </Label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-14 pl-12 pr-12 rounded-corner-sm border-2 transition-all"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            "Reset Password"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function VerifyResetPage() {
    return (
        <React.Suspense fallback={
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        }>
            <VerifyResetContent />
        </React.Suspense>
    );
}
