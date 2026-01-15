import { getAgencyInvoices } from "./actions";
import { InvoiceList } from "./_components/invoice-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

export default async function AgencyInvoicesPage({
    searchParams
}: {
    searchParams: Promise<{
        page?: string;
        query?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== UserRole.TRAVEL_AGENT) {
        redirect("/");
    }

    const resolvedSearchParams = await searchParams;
    const page = Number(resolvedSearchParams.page) || 1;
    const query = resolvedSearchParams.query || "";
    const status = resolvedSearchParams.status;
    const startDate = resolvedSearchParams.startDate;
    const endDate = resolvedSearchParams.endDate;

    const { invoices, agencyCurrency, metadata, stats } = await getAgencyInvoices({
        page,
        query,
        status,
        startDate,
        endDate
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Agency / <span className="text-indigo-600 uppercase">Invoices</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Monitor revenue, track pending payments, and manage corporate billing.
                </p>
            </div>

            <InvoiceList
                invoices={invoices}
                agencyCurrency={agencyCurrency}
                metadata={metadata}
                stats={stats}
            />
        </div>
    );
}
