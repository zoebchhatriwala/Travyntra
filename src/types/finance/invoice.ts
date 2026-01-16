import { InvoiceStatus } from "@prisma/client";

/**
 * Represents a tax or fee applied to an invoice.
 */
export interface Tax {
    label: string;
    value: number;
    type: string; // 'PERCENTAGE' | 'FIXED'
    calculatedAmount: number;
}

/**
 * Represents a billing invoice.
 */
export interface Invoice {
    id: string;
    amount: number;
    subtotal?: number;
    taxes?: Tax[];
    currency: string;
    date: Date;
    status: InvoiceStatus;
    description: string;
    recipient: string;
    requestId: string;
    pdfUrl?: string | null;
}
