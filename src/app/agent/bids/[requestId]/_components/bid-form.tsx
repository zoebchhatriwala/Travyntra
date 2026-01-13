
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
import { Lock } from "lucide-react";

const bidSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0"),
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
    } | null;
};

export function BidForm({ requestId, requestStatus, currency = "USD", requestCurrency = "USD", existingBid }: BidFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [conversionPreview, setConversionPreview] = useState<string | null>(null);

    const form = useForm<z.infer<typeof bidSchema>>({
        resolver: zodResolver(bidSchema),
        defaultValues: {
            amount: existingBid?.amount ? Number(existingBid.amount) : undefined,
            message: existingBid?.message || ""
        }
    });

    // Handle initial conversion preview for existing bids
    useEffect(() => {
        if (existingBid?.amount && currency !== requestCurrency) {
            getConversionPreview(Number(existingBid.amount), currency, requestCurrency)
                .then(setConversionPreview)
                .catch(() => setConversionPreview(null));
        }
    }, [existingBid?.amount, currency, requestCurrency]);

    async function onSubmit(values: z.infer<typeof bidSchema>) {
        setIsSubmitting(true);
        try {
            let result;
            if (existingBid) {
                result = await updateBid(existingBid.id, requestId, values.amount, values.message, currency);
            } else {
                result = await submitBid(requestId, values.amount, values.message, currency);
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

                    <div className="space-y-2">
                        <Label htmlFor="message">Proposal Details</Label>
                        <Textarea
                            id="message"
                            placeholder="Describe flight options, layovers, baggage allowance..."
                            className="min-h-[100px]"
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
