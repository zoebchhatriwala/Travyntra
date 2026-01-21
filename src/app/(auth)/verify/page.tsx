
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyOtp, resendOtp } from "@/lib/actions/auth";
import { toast } from "sonner";

/**
 * Verification page for OTP email verification.
 * Users enter the 6-digit code sent to their email.
 */
function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get("email");
    const [isLoading, setIsLoading] = React.useState(false);
    const [isResending, setIsResending] = React.useState(false);
    const [otp, setOtp] = React.useState("");

    // Redirect to login if no email is provided in the query string
    React.useEffect(() => {
        if (!email) {
            router.push("/login");
        }
    }, [email, router]);

    /**
     * Handles the OTP verification submission.
     */
    async function onVerify(e: React.FormEvent) {
        e.preventDefault();
        // Ensure OTP is exactly 6 digits
        if (otp.length !== 6) return;

        setIsLoading(true);
        try {
            const result = await verifyOtp({ email: email!, otp });

            if (result.success) {
                toast.success("Email verified successfully!");
                // Redirect to login with a success indicator
                router.push("/login?verified=true");
            } else {
                toast.error(result.error || "Verification failed");
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Handles the request to resend a new OTP.
     */
    async function handleResend() {
        setIsResending(true);
        try {
            const result = await resendOtp(email!);
            if (result.success) {
                toast.success("A new OTP has been sent to your email.");
            } else {
                toast.error(result.error || "Failed to resend OTP");
            }
        } catch (error) {
            console.error("Resend error:", error);
            toast.error("Failed to resend code. Please try again.");
        } finally {
            setIsResending(false);
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center sm:text-left">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-tight">Verify your email.</h1>
                <p className="text-lg text-slate-500 font-medium">
                    We&apos;ve sent a 6-digit verification code to <br className="hidden sm:block" />
                    <span className="text-indigo-600 font-bold">{email}</span>.
                </p>
            </div>

            <div className="bg-white p-8 rounded-corner-xl shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-slate-100">
                <form onSubmit={onVerify} className="space-y-8">
                    <div className="space-y-4">
                        <Input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="000000"
                            className="h-20 text-center text-4xl font-black tracking-[0.5em] pl-[0.25em] rounded-corner-lg border-2 border-slate-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all bg-slate-50/50"
                            disabled={isLoading}
                            autoFocus
                        />
                        <p className="text-sm text-center text-slate-400 font-bold uppercase tracking-widest">
                            Enter code
                        </p>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading || otp.length !== 6}
                        className="w-full h-16 rounded-corner-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:grayscale disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-8 w-8" /> : "Verify & Continue"}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                    <p className="text-slate-500 font-medium">
                        Didn&apos;t receive the code?{" "}
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="font-black text-indigo-600 hover:text-indigo-700 hover:underline disabled:opacity-50 transition-colors"
                        >
                            {isResending ? "Sending..." : "Resend OTP"}
                        </button>
                    </p>
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={() => router.push('/login')}
                    className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                    Back to Sign In
                </button>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <React.Suspense fallback={
            <div className="flex justify-center p-12">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        }>
            <VerifyContent />
        </React.Suspense>
    );
}
