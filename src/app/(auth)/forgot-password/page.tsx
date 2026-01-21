
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/auth";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const router = useRouter();

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;

        try {
            const result = await requestPasswordReset(email);

            if (result.success) {
                toast.success("Reset code sent! Please check your email.");
                router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
            } else {
                toast.error(result.error || "Something went wrong. Please try again.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
                >
                    <ArrowLeft size={16} />
                    Back to login
                </Link>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Reset password.</h1>
                <p className="text-lg text-slate-500 font-medium">Enter your email and we&apos;ll send you a 6-digit reset code.</p>
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

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            <>
                                <Send size={20} />
                                Send Reset Code
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
