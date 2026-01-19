import { getCompanies } from "../companies/actions";
import { CompanyList } from "../companies/_components/company-list";
import { Briefcase } from "lucide-react";
import { CompanyType } from "@prisma/client";

export const metadata = {
    title: "Manage Agencies | Travyntra Admin",
};

export default async function AgentsPage() {
    const agents = await getCompanies(CompanyType.AGENT);

    return (
        <div className="min-h-screen bg-[#FAFAFB] pb-20">
            {/* Header section */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <div className="container mx-auto py-8 px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 bg-amber-50 rounded-corner-md text-amber-600">
                                    <Briefcase size={20} />
                                </div>
                                <span className="text-sm font-semibold text-amber-600 tracking-wide uppercase">Fulfillment Partners</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agencies</h1>
                            <p className="text-gray-500 mt-1 max-w-2xl">
                                Manage travel agencies, verify their credentials, and monitor their fulfillment performance.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6">
                <CompanyList initialCompanies={agents} />
            </div>
        </div>
    );
}
