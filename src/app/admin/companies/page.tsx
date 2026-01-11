import { getCompanies } from "./actions";
import { CompanyList, type Company } from "./_components/company-list";
import { Building2 } from "lucide-react";
import { CompanyType } from "@prisma/client";

export const metadata = {
    title: "Manage Enterprises | Travyntra Admin",
};

export default async function CompaniesPage() {
    const companies = await getCompanies(CompanyType.ENTERPRISE);

    return (
        <div className="min-h-screen bg-[#FAFAFB] pb-20">
            {/* Header section */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <div className="container mx-auto py-8 px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Building2 size={20} />
                                </div>
                                <span className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Tenant Registry</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Enterprise Companies</h1>
                            <p className="text-gray-500 mt-1 max-w-2xl">
                                Manage corporate accounts, set subscription tiers, and control platform access for tenants.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6">
                <CompanyList initialCompanies={companies as Company[]} />
            </div>
        </div>
    );
}
