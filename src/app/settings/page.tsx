"use client";

import { useState, useRef } from "react";
import {
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    User,
    Camera,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, updateProfile } from "./actions";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function SettingsPage() {
    const { data: session, update: updateSession } = useSession();
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const result = await changePassword(formData);

        if (result.success) {
            setSuccess(true);
            (e.target as HTMLFormElement).reset();
        } else {
            setError(result.error || "Something went wrong");
        }
        setLoading(false);
    };

    const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProfileLoading(true);
        setError(null);
        setProfileSuccess(false);

        const formData = new FormData(e.currentTarget);
        const result = await updateProfile(formData);

        if (result.success) {
            setProfileSuccess(true);

            // Explicitly update the session with new data
            // This ensures the JWT cookie is updated immediately
            await updateSession({
                ...session,
                user: {
                    ...session?.user,
                    name: formData.get("name") as string,
                    image: (result as any).avatarUrl || session?.user?.image
                }
            });

            // Clear preview
            setPreviewUrl(null);
        } else {
            setError(result.error || "Something went wrong");
        }
        setProfileLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const role = session?.user?.role;
    const companySlug = session?.user?.companySlug;

    const backPath = role === "SUPER_ADMIN"
        ? "/admin/dashboard"
        : role === "TRAVEL_AGENT"
            ? "/agent/dashboard"
            : companySlug
                ? role === "EMPLOYEE"
                    ? `/company/${companySlug}/dashboard`
                    : `/company/${companySlug}/admin`
                : "/";

    return (
        <div className="min-h-screen bg-[#FAFAFB] p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Link
                        href={backPath}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Account <span className="text-indigo-600">Settings</span>
                    </h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        Manage your profile, security preferences, and account details.
                    </p>
                </div>

                {/* Profile Section */}
                <Card className="border-none shadow-xl shadow-indigo-100/20 rounded-[32px] overflow-hidden bg-white ring-1 ring-gray-100">
                    <CardHeader className="p-8 pb-4 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <User size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Profile Info</CardTitle>
                                <CardDescription className="text-gray-500 font-medium">Update your personal information and profile picture.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleProfileSubmit} className="space-y-8">
                            <div className="flex flex-col items-center sm:flex-row gap-8">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-[40px] bg-gray-50 border-4 border-white shadow-xl overflow-hidden relative">
                                        {(previewUrl || session?.user?.image) ? (
                                            <Image
                                                src={previewUrl || session?.user?.image || ""}
                                                alt="Avatar"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <User size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all scale-90 group-hover:scale-100"
                                    >
                                        <Camera size={20} />
                                    </button>
                                    <input
                                        type="file"
                                        name="avatar"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</Label>
                                        <Input
                                            name="name"
                                            defaultValue={session?.user?.name || ""}
                                            placeholder="Your Name"
                                            className="h-14 bg-gray-50/50 border-gray-100 focus:border-indigo-600 focus:ring-indigo-600 rounded-2xl font-medium transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <p className="font-bold text-gray-700">Email Address</p>
                                        <p className="text-gray-500">{session?.user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {profileSuccess && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 size={20} />
                                    <p className="text-sm font-bold uppercase tracking-tight">Profile updated successfully!</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                disabled={profileLoading}
                            >
                                {profileLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        Syncing Profile...
                                    </span>
                                ) : "Update Profile Info"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card className="border-none shadow-xl shadow-indigo-100/20 rounded-[32px] overflow-hidden bg-white ring-1 ring-gray-100">
                    <CardHeader className="p-8 pb-4 border-b border-gray-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Security</CardTitle>
                                <CardDescription className="text-gray-500 font-medium">Update your password to keep your account secure.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 size={20} />
                                    <p className="text-sm font-bold uppercase tracking-tight">Password updated successfully!</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <Input
                                        name="currentPassword"
                                        type={showCurrent ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="h-14 pl-12 pr-12 bg-gray-50/50 border-gray-100 focus:border-indigo-600 focus:ring-indigo-600 rounded-2xl font-medium transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <Input
                                            name="newPassword"
                                            type={showNew ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-14 pl-12 pr-12 bg-gray-50/50 border-gray-100 focus:border-indigo-600 focus:ring-indigo-600 rounded-2xl font-medium transition-all"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <Input
                                            name="confirmPassword"
                                            type={showNew ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-14 pl-12 px-4 bg-gray-50/50 border-gray-100 focus:border-indigo-600 focus:ring-indigo-600 rounded-2xl font-medium transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? "Updating Security Protocol..." : "Save New Password"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-100 flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm flex-shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">Privacy Notice</p>
                        <p className="text-xs font-medium text-amber-700 leading-relaxed">
                            Changing your password will not log you out of your current session, but will require the new password for any future logins across all devices.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
