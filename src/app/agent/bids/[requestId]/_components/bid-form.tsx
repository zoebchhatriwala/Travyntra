
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { submitBid, updateBid, getConversionPreview } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Plus, Trash2, Info } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const taxSchema = z.object({
    label: z.string().min(1, "Label is required"),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().min(0, "Value must be positive")
});

const bidSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0"),
    taxes: z.array(taxSchema).default([]),
    message: z.string().min(10, "Please provide some details about your offer")
});

type BidFormProps = {
    requestId: string;
    requestStatus?: string;
    currency?: string;
    requestCurrency?: string;
    existingBid?: {
        id: string;
        amount: number | null;
        message: string | null;
        taxes?: any[] | null;
    } | null;
};

export function BidForm({ requestId, requestStatus, currency = "USD", requestCurrency = "USD", existingBid }: BidFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [conversionPreview, setConversionPreview] = useState<string | null>(null);

    const form = useForm<z.infer<typeof bidSchema>>({
        resolver: zodResolver(bidSchema),
        defaultValues: {
            amount: existingBid?.amount || undefined,
            taxes: (existingBid?.taxes as any[]) || [],
            message: existingBid?.message || ""
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "taxes"
    });

    const watchedTaxes = form.watch("taxes") || [];
    const watchedAmount = form.watch("amount") || 0;

    const calculateTotal = () => {
        let total = watchedAmount;
        watchedTaxes.forEach(tax => {
            if (tax.type === "PERCENTAGE") {
                total += (watchedAmount * tax.value) / 100;
            } else {
                total += tax.value;
            }
        });
        return total;
    };

    const totalAmount = calculateTotal();

    // Handle initial conversion preview for existing bids
    useEffect(() => {
        if (existingBid?.amount && currency !== requestCurrency) {
            getConversionPreview(existingBid.amount, currency, requestCurrency)
                .then(setConversionPreview)
                .catch(() => setConversionPreview(null));
        }
    }, [existingBid?.amount, currency, requestCurrency]);

    async function onSubmit(values: z.infer<typeof bidSchema>) {
        setIsSubmitting(true);
        try {
            let result;
            const taxesToSubmit = values.taxes || [];
            if (existingBid) {
                result = await updateBid(existingBid.id, requestId, values.amount, values.message, currency, taxesToSubmit);
            } else {
                result = await submitBid(requestId, values.amount, values.message, currency, taxesToSubmit);
            }

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(existingBid ? "Bid updated successfully" : "Bid submitted successfully");
                router.refresh();
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }
    const isClosed = requestStatus !== "APPROVED" && requestStatus !== "PENDING_AGENT_BIDS";
    // Note: status might vary, let's assume anything not in bidding phase is closed.
    // Based on Phase 3: PENDING_COMPANY_APPROVAL -> APPROVED -> IN_PROGRESS

    return (
        <Card className={isClosed ? "opacity-75 bg-gray-50" : ""}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {existingBid ? "Update Your Bid" : "Submit a Bid"}
                    {isClosed && <Lock size={16} className="text-gray-400" />}
                </CardTitle>
                {isClosed && (
                    <CardDescription className="text-amber-600 font-medium">
                        This request is currently closed for new bids.
                    </CardDescription>
                )}
            </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Bid Amount ({currency})</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            disabled={isClosed}
                            {...form.register("amount", {
                                valueAsNumber: true,
                                onChange: async (e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val > 0 && currency !== requestCurrency) {
                                        try {
                                            const preview = await getConversionPreview(val, currency, requestCurrency);
                                            setConversionPreview(preview);
                                        } catch {
                                            setConversionPreview(null);
                                        }
                                    } else {
                                        setConversionPreview(null);
                                    }
                                }
                            })}
                        />
                        {currency !== requestCurrency && (
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">
                                {conversionPreview
                                    ? `Note: Company sees this as approx. ${conversionPreview}`
                                    : `Note: This will be converted to ${requestCurrency} automatically`
                                }
                            </p>
                        )}
                        {form.formState.errors.amount && (
                            <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-gray-700">Taxes & Additional Fees</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isClosed}
                                onClick={() => append({ label: "", type: "PERCENTAGE", value: 0 })}
                                className="h-7 text-[10px] font-bold uppercase tracking-wider rounded-lg border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                            >
                                <Plus size={14} className="mr-1" /> Add Tax
                            </Button>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                <div className="col-span-12 md:col-span-5 space-y-1">
                                    <Input
                                        placeholder="Label (e.g. VAT)"
                                        disabled={isClosed}
                                        {...form.register(`taxes.${index}.label`)}
                                        className="h-9 text-xs"
                                    />
                                    {form.formState.errors.taxes?.[index]?.label && (
                                        <p className="text-[10px] text-red-500">{form.formState.errors.taxes[index]?.label?.message}</p>
                                    )}
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    <Select
                                        disabled={isClosed}
                                        defaultValue={field.type}
                                        onValueChange={(val) => form.setValue(`taxes.${index}.type`, val as "PERCENTAGE" | "FIXED")}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERCENTAGE">%</SelectItem>
                                            <SelectItem value="FIXED">{currency}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-10 md:col-span-3 space-y-1">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        disabled={isClosed}
                                        {...form.register(`taxes.${index}.value`, { valueAsNumber: true })}
                                        className="h-9 text-xs"
                                    />
                                    {form.formState.errors.taxes?.[index]?.value && (
                                        <p className="text-[10px] text-red-500">{form.formState.errors.taxes[index]?.value?.message}</p>
                                    )}
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isClosed}
                                        onClick={() => remove(index)}
                                        className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm mb-1 text-gray-500">
                            <span>Base Amount</span>
                            <span>{currency} {watchedAmount.toFixed(2)}</span>
                        </div>
                        {watchedTaxes.map((tax, i) => {
                            const taxAmt = tax.type === "PERCENTAGE" ? (watchedAmount * tax.value) / 100 : tax.value;
                            if (!tax.label && !tax.value) return null;
                            return (
                                <div key={i} className="flex items-center justify-between text-sm mb-1 text-gray-500">
                                    <span>{tax.label || 'Tax'} {tax.type === 'PERCENTAGE' ? `(${tax.value}%)` : ''}</span>
                                    <span>{currency} {taxAmt.toFixed(2)}</span>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between text-lg font-black text-indigo-600 mt-2">
                            <span>Total Proposal</span>
                            <span>{currency} {totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Proposal Details</Label>
                        <Textarea
                            id="message"
                            placeholder="Describe flight options, layovers, baggage allowance..."
                            className="min-h-[100px] rounded-xl border-gray-200"
                            disabled={isClosed}
                            {...form.register("message")}
                        />
                        {form.formState.errors.message && (
                            <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    {!isClosed && (
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            {isSubmitting ? "Submitting..." : (existingBid ? "Update Proposal" : "Submit Proposal")}
                        </Button>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
