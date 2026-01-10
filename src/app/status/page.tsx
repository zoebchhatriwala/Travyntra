"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Activity, Globe, Shield, Database, AlertCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StatusPage() {
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<{ database: string; api: string } | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/health");
            const data = await res.json();
            setHealth(data);
        } catch (error) {
            console.error("Failed to fetch health:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const services = [
        {
            name: "CDN",
            status: "Operational",
            uptime: "100%",
            icon: Globe,
            isUp: true
        },
        {
            name: "Backend",
            status: health?.api === "up" ? "Operational" : "Degraded",
            uptime: "99.99%",
            icon: Activity,
            isUp: health?.api === "up"
        },
        {
            name: "Database",
            status: health?.database === "up" ? "Operational" : "Critical",
            uptime: "100%",
            icon: Database,
            isUp: health?.database === "up"
        },
    ];

    const allSystemsUp = services.every(s => s.isUp);

    return (
        <main className="min-h-screen bg-white py-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-16">
                    <div className="flex justify-between items-start mb-8">
                        <Button variant="ghost" asChild className="-ml-4">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={checkHealth}
                            disabled={loading}
                            className="rounded-xl border-slate-100 font-bold text-slate-600 hover:bg-slate-50"
                        >
                            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Re-check
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tighter">Infrastructure Health</h1>
                            <p className="text-slate-500 font-medium text-xl">Real-time status of the Travyntra ecosystem.</p>
                        </div>

                        {loading ? (
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                                <div className="h-2 w-2 bg-slate-300 rounded-full animate-pulse" />
                                <span className="font-bold text-slate-400">Pinging systems...</span>
                            </div>
                        ) : allSystemsUp ? (
                            <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100">
                                <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                                <span className="font-bold text-emerald-800">All Systems Functional</span>
                            </div>
                        ) : (
                            <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 border border-rose-100">
                                <AlertCircle className="text-rose-500 h-6 w-6" />
                                <span className="font-bold text-rose-800">Partial System Outage</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-6">
                    {services.map((service) => (
                        <div key={service.name} className={`bg-slate-50/50 rounded-3xl p-8 flex items-center justify-between border ${service.isUp ? "border-slate-100" : "border-rose-100 bg-rose-50/10"} hover:border-indigo-100 transition-colors group`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center ${service.isUp ? "text-slate-400 group-hover:text-indigo-600" : "text-rose-400"} transition-colors shadow-sm`}>
                                    <service.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{service.name}</h3>
                                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Uptime: {service.uptime}</p>
                                </div>
                            </div>
                            <Badge className={`border-none font-bold px-4 py-1.5 h-auto rounded-full ${service.isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {service.status}
                            </Badge>
                        </div>
                    ))}
                </div>
                <div className="mt-16 text-center">
                    <p className="text-slate-400 font-bold flex items-center justify-center gap-2">
                        © 2026 Travyntra <span className="text-slate-200">|</span> <span className="bg-slate-50 px-3 py-1 rounded-full text-indigo-600 text-xs shadow-sm border border-slate-100">Built by Chhatriwala.com</span>
                    </p>
                </div>
            </div>
        </main>
    );
}
