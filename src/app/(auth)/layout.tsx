import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white">
            {/* Visual Side */}
            <div className="hidden lg:flex relative overflow-hidden bg-[#0A0C10] flex-col justify-between p-12 text-white">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <Link href="/" className="relative z-10 text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity">
                    Travyntra
                </Link>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-5xl font-black leading-tight mb-6 tracking-tight">
                        The Operating System for Business Travel.
                    </h2>
                    <p className="text-xl text-slate-400 font-medium leading-relaxed">
                        Manage journeys, automate approvals, and delight your staff with a joyful travel experience.
                    </p>
                </div>

                <div className="relative z-10 flex gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
                    <span>© 2026</span>
                    <span>
                        Chhatriwala.com
                    </span>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex items-center justify-center p-8 bg-slate-50/30">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:hidden text-center mb-12">
                        <Link href="/" className="text-3xl font-black text-indigo-600 tracking-tighter">
                            Travyntra
                        </Link>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
