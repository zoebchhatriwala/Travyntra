import { getCompanyInvoices } from "./actions";
import { BillingList } from "./_components/billing-list";

export default async function BillingPage({
    params
}: {
    params: { slug: string }
}) {
    const { slug } = await params;
    const { invoices, currency } = await getCompanyInvoices(slug);

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

            <BillingList invoices={invoices} currency={currency} />
        </div>
    );
}
