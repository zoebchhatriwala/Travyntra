import { getCompanyInvoices } from "./actions";
import { BillingList } from "./_components/billing-list";

export default async function BillingPage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{
        page?: string;
        query?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }>;
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;

    const page = Number(resolvedSearchParams.page) || 1;
    const query = resolvedSearchParams.query || "";
    const status = resolvedSearchParams.status;
    const startDate = resolvedSearchParams.startDate;
    const endDate = resolvedSearchParams.endDate;

    const { invoices, currency, metadata, stats } = await getCompanyInvoices(slug, {
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
                    Console / <span className="text-indigo-600 uppercase">Billing</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Manage inscriptions, reconciliation, and expenditure analytics.
                </p>
            </div>

            <BillingList
                invoices={invoices}
                currency={currency}
                companySlug={slug}
                metadata={metadata}
                stats={stats}
            />
        </div>
    );
}
