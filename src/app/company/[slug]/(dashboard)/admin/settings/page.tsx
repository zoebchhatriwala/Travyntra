import { getCompanySettings } from "./actions";
import { SettingsForm } from "./_components/settings-form";
import Link from "next/link";

export default async function SettingsPage({
    params
}: {
    params: { slug: string }
}) {
    const { slug } = await params;
    const company = await getCompanySettings(slug);

    if (!company) return <div>Company Not Found</div>;

    return (
        <div className="min-h-screen bg-[#FAFAFB] animate-in fade-in duration-500">
            <div className="max-w-[1400px] mx-auto p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-corner-sm">Settings</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Console / <span className="text-indigo-600 uppercase">Configuration</span>
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Adjust branding, workspace identity, and security parameters.
                        </p>
                    </div>
                </div>

                {/* Quick Links Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        href={`/company/${slug}/admin/settings/auto-approval`}
                        className="group bg-white border border-gray-100 rounded-corner-lg p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:scale-[1.02]"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-corner-md group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-corner-sm">NEW</span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            Auto-Approval Policies
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">
                            Configure rules to automatically approve requests based on budget or destination
                        </p>
                    </Link>

                    <Link
                        href={`/company/${slug}/admin/settings/plan`}
                        className="group bg-white border border-gray-100 rounded-corner-lg p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 hover:scale-[1.02]"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-corner-md group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                            Plan & Billing
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">
                            View subscription details, feature limits, and current usage statistics
                        </p>
                    </Link>
                </div>

                <SettingsForm company={company} />
            </div>
        </div>
    );
}
