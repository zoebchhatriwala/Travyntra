"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Building2,
    Mail,
    Lock,
    User,
    ArrowRight,
    CheckCircle2,
    ChevronLeft,
    ShieldCheck
} from "lucide-react";
import { registerEmployee } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function CompanyRegisterPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await registerEmployee({
            ...formData,
            slug
        });

        if (res.success) {
            setSuccess(true);
            toast.success("Registration successful!");
        } else {
            toast.error(res.error || "Failed to register");
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center p-6 font-inter">
                <div className="absolute top-0 left-0 right-0 h-96 bg-indigo-600/5 -z-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

                <Card className="w-full max-w-md border-none shadow-2xl shadow-indigo-100/50 rounded-[40px] overflow-hidden bg-white/80 backdrop-blur-xl animate-in zoom-in-95 duration-500">
                    <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-corner-xl flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-inner shadow-emerald-100/50 animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 uppercase">Registration Sent</h2>
                        <p className="text-gray-500 font-medium leading-relaxed mb-8">
                            We&apos;ve sent your request to the <span className="text-indigo-600 font-bold uppercase tracking-wider">{slug}</span> administrators. You&apos;ll receive a notification once they verify your profile.
                        </p>
                        <Button
                            onClick={() => router.push("/login")}
                            className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-corner-lg font-black uppercase tracking-widest transition-all shadow-xl shadow-gray-200"
                        >
                            Return to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFB] flex flex-col lg:flex-row font-inter">
            {/* Left Side: Illustration & Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black/20 to-transparent" />

                <div className="relative z-10 space-y-12 max-w-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[24px] flex items-center justify-center border border-white/20 shadow-2xl">
                            <Building2 className="text-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">Travyntra</h1>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                            Join your team at <span className="bg-white text-indigo-600 px-4 py-1 rounded-corner-lg inline-block -rotate-1 shadow-xl uppercase">{slug}</span>
                        </h2>
                        <p className="text-xl text-indigo-100 font-medium leading-relaxed opacity-90">
                            Access unified booking, automated expense tracking, and personalized itineraries curated for your company.
                        </p>
                    </div>


                </div>

                {/* Animated Background Elements */}
                <div className="absolute top-1/4 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden absolute top-8 left-8 right-8 flex items-center justify-between z-20">
                    <div className="flex items-center gap-2">
                        <Building2 className="text-indigo-600" size={24} />
                        <span className="font-black text-gray-900 uppercase text-sm tracking-tight">Travyntra</span>
                    </div>
                </div>

                <div className="w-full max-w-md relative z-10 animate-in slide-in-from-bottom-10 duration-700">
                    <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 mb-8 transition-colors group">
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </Link>

                    <div className="mb-10">
                        <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Create Account</h3>
                        <p className="text-gray-500 font-medium italic">Enter your details to register as a staff member.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <Input
                                    required
                                    placeholder="John Doe"
                                    className="h-14 pl-12 rounded-corner-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Corporate Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <Input
                                    required
                                    type="email"
                                    placeholder="john@company.com"
                                    className="h-14 pl-12 rounded-corner-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <Input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-14 pl-12 rounded-corner-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-corner-lg border border-indigo-100/50 flex items-start gap-4">
                            <div className="w-8 h-8 bg-indigo-600 rounded-corner-sm flex items-center justify-center text-white flex-shrink-0">
                                <ShieldCheck size={18} />
                            </div>
                            <p className="text-[11px] text-indigo-600 font-bold leading-relaxed">
                                By registering, you agree to your company&apos;s travel policies and our terms of service. Your account will require approval.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-corner-lg font-black uppercase tracking-[0.15em] text-sm transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Complete Signup
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-gray-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-indigo-600 font-black uppercase tracking-widest text-xs hover:underline">
                                Login Here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] -z-10" />
            </div>
        </div>
    );
}
