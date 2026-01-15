import { getTaxTemplates } from "./actions";
import { TaxTemplateList } from "./_components/tax-template-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

export default async function TaxTemplatesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        redirect("/");
    }

    const templates = await getTaxTemplates();

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Settings / <span className="text-indigo-600 uppercase">Tax Templates</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Create and manage reusable tax templates for quick bidding.
                </p>
            </div>

            <TaxTemplateList templates={templates} />
        </div>
    );
}
