import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-brand-subtle py-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-12 text-center">
                    <div className="flex justify-center mb-8">
                        <Button variant="ghost" asChild className="absolute top-8 left-8">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Link>
                        </Button>
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Privacy Sovereignty</h1>
                    <p className="text-slate-500 font-medium text-xl">Protecting the digital journeys of global enterprises.</p>
                </div>

                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 space-y-12">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Workspace Isolation</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Every tenant operates in an isolated environment. Your company data, employee identities,
                                and travel history are never shared with other tenants on the platform.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Selective Disclosure</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Travel Agents only see the data required to fulfill a specific request. Your private
                                internal approval notes remain invisible to fulfillment partners.
                            </p>
                        </div>
                    </div>

                    <hr className="border-slate-50" />

                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">Identity & Encryption</h2>
                        <p className="text-slate-600 leading-relaxed mb-6">
                            We encrypt all PII (Personally Identifiable Information) including passport numbers
                            and visa IDs at rest. Authentication is handled via secure JWT and Bcrypt hashing
                            for passwords.
                        </p>
                    </section>

                    <section className="bg-joy-blue/30 rounded-3xl p-8 border border-blue-100/50">
                        <h2 className="text-2xl font-black text-slate-900 mb-4">GDPR & Enterprise Compliance</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Travyntra is committed to global data protection standards. We provide tools for
                            Corporate Admins to exercise their "Right to be Forgotten" and data export commands
                            directly from their management dashboard.
                        </p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-400 font-bold flex items-center justify-center gap-2">
                        © 2026 Travyntra <span className="text-slate-200">|</span> <span className="bg-white px-3 py-1 rounded-full text-indigo-600 text-xs shadow-sm border border-slate-100">Built by Chhatriwala.com</span>
                    </p>
                </div>
            </div>
        </main>
    );
}
