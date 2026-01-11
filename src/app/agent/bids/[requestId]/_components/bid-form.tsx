
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { submitBid, updateBid } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const bidSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0"),
    message: z.string().min(10, "Please provide some details about your offer")
});

type BidFormProps = {
    requestId: string;
    existingBid?: {
        id: string;
        amount: number | null;
        message: string | null;
    } | null;
};

export function BidForm({ requestId, existingBid }: BidFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof bidSchema>>({
        resolver: zodResolver(bidSchema),
        defaultValues: {
            amount: existingBid?.amount ? Number(existingBid.amount) : undefined,
            message: existingBid?.message || ""
        }
    });

    async function onSubmit(values: z.infer<typeof bidSchema>) {
        setIsSubmitting(true);
        try {
            let result;
            if (existingBid) {
                result = await updateBid(existingBid.id, requestId, values.amount, values.message);
            } else {
                result = await submitBid(requestId, values.amount, values.message);
            }

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(existingBid ? "Bid updated successfully" : "Bid submitted successfully");
                router.refresh();
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{existingBid ? "Update Your Bid" : "Submit a Bid"}</CardTitle>
            </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Bid Amount (USD)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            {...form.register("amount", { valueAsNumber: true })}
                        />
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
                            {...form.register("message")}
                        />
                        {form.formState.errors.message && (
                            <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? "Submitting..." : (existingBid ? "Update Proposal" : "Submit Proposal")}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
