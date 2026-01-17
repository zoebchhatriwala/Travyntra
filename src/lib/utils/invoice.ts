import { convertCurrency } from "@/lib/services/currency";

export interface TaxBase {
    label: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
}

export interface CalculatedTax extends TaxBase {
    calculatedAmount: number;
}

/**
 * Calculates the total amount and individual tax amounts for an invoice.
 * handles both percentage-based and fixed-amount taxes with currency conversion.
 * 
 * @param subtotal - The base amount in the invoice currency.
 * @param taxes - Array of tax definitions from the bid.
 * @param bidCurrency - The currency the bid (and fixed taxes) was originally in.
 * @param invoiceCurrency - The target currency for the invoice.
 * @returns Object containing the total amount and detailed calculated taxes.
 */
export async function calculateInvoiceDetails(
    subtotal: number,
    taxes: TaxBase[],
    bidCurrency: string,
    invoiceCurrency: string
): Promise<{ totalAmount: number; invoiceTaxes: CalculatedTax[] }> {
    let totalAmount = subtotal;
    const invoiceTaxes: CalculatedTax[] = [];

    for (const tax of taxes) {
        let taxValue = 0;
        if (tax.type === "PERCENTAGE") {
            // Percentage tax is calculated based on the subtotal in invoice currency
            taxValue = (subtotal * tax.value) / 100;
        } else {
            // Fixed tax is in bid currency, needs conversion to invoice currency
            taxValue = await convertCurrency(tax.value, bidCurrency, invoiceCurrency);
        }

        // Round each tax component to 2 decimal places
        taxValue = Number(taxValue.toFixed(2));
        totalAmount += taxValue;

        invoiceTaxes.push({
            ...tax,
            calculatedAmount: taxValue
        });
    }

    // Final rounding of total amount to handle cumulative floating point errors
    return {
        totalAmount: Number(totalAmount.toFixed(2)),
        invoiceTaxes
    };
}
