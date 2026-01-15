import { getAgencyInvoices } from "./actions";
import { InvoiceList } from "./_components/invoice-list";

export default async function AgencyInvoicesPage() {
    const { invoices, agencyCurrency } = await getAgencyInvoices();

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

            <InvoiceList invoices={invoices} agencyCurrency={agencyCurrency} />
        </div>
    );
}
