import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-brand-subtle py-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="mb-12">
                    <Button variant="ghost" asChild className="mb-8 -ml-4">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                        </Link>
                    </Button>
                    <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Terms of Infrastructure</h1>
                    <p className="text-slate-500 font-medium">Last updated: January 10, 2026</p>
                </div>

                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 space-y-10 prose prose-slate max-w-none">
                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-slate-600 leading-relaxed">
                            By accessing the Travyntra, you agree to be bound by these Terms of Service.
                            Our platform is designed for enterprise-grade travel coordination between agencies,
                            companies, and their authorized personnel.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">2. Tiered Access & Multi-Tenancy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Travyntra provides isolated workspace environments. Company Admins are responsible for
                            managing their own staff and internal approval workflows. Agencies are responsible for
                            the fulfillment of journey artifacts (tickets, visas, etc.).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">3. Data Security & Sovereignty</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We maintain strictly isolated databases for each company. Audit logs are preserved
                            to ensure accountability across the travel lifecycle. Sensitive documents are stored
                            using AES-256 encryption.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">4. Fulfillment Liability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Fulfillment service levels (SLA) are determined by the agreement between the Agency
                            and the Company. Travyntra acts as the record-keeping and communication
                            infrastructure enabling these transactions.
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
