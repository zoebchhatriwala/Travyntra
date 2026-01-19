"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Trash2,
    Zap,
    Edit2,
    Receipt,
    RefreshCw,
    Info
} from "lucide-react";
import {
    submitBid,
    updateBid,
    getConversionPreview
} from "../actions";
import { getTaxTemplates } from "@/app/agent/settings/tax-templates/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RequestStatus } from "@prisma/client";

interface TaxItem {
    label: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
}

interface BidFormProps {
    requestId: string;
    requestStatus: RequestStatus;
    currency: string;
    requestCurrency: string;
    existingBid: {
        id: string;
        amount: number;
        message: string;
        taxes: TaxItem[];
    } | null;
}

export function BidForm({
    requestId,
    requestStatus,
    currency,
    requestCurrency,
    existingBid
}: BidFormProps) {
    const router = useRouter();

    // State
    const [amount, setAmount] = useState<string>(existingBid?.amount?.toString() || "");
    const [message, setMessage] = useState(existingBid?.message || "");
    const [taxes, setTaxes] = useState<TaxItem[]>(existingBid?.taxes || []);
    const [templates, setTemplates] = useState<any[]>([]);
    const [preview, setPreview] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // New Tax Input State
    const [newTax, setNewTax] = useState<TaxItem>({
        label: "",
        value: 0,
        type: "PERCENTAGE"
    });

    // Fetch Templates
    useEffect(() => {
        getTaxTemplates().then(setTemplates);
    }, []);

    // Conversion Preview
    const updatePreview = useCallback(async (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
            setPreview("");
            return;
        }

        setIsPreviewLoading(true);
        try {
            const result = await getConversionPreview(num, currency, requestCurrency);
            setPreview(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsPreviewLoading(false);
        }
    }, [currency, requestCurrency]);

    useEffect(() => {
        const timer = setTimeout(() => {
            updatePreview(amount);
        }, 500);
        return () => clearTimeout(timer);
    }, [amount, updatePreview]);

    // Totals Calculation
    const subtotal = parseFloat(amount) || 0;
    const taxTotal = taxes.reduce((acc, tax) => {
        if (tax.type === "PERCENTAGE") {
            return acc + (subtotal * tax.value) / 100;
        }
        return acc + tax.value;
    }, 0);
    const total = subtotal + taxTotal;

    // Handlers
    const handleAddTax = () => {
        if (!newTax.label || newTax.value <= 0) return;
        setTaxes([...taxes, newTax]);
        setNewTax({ label: "", value: 0, type: "PERCENTAGE" });
        toast.success("Line item added");
    };

    const handleRemoveTax = (index: number) => {
        setTaxes(taxes.filter((_, i) => i !== index));
    };

    const handleApplyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setTaxes(template.taxes);
            toast.success(`Applied ${template.name} tax template.`);
        }
    };


    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Invalid Amount");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = existingBid
                ? await updateBid(existingBid.id, requestId, numAmount, message, currency, taxes)
                : await submitBid(requestId, numAmount, message, currency, taxes);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(existingBid ? "Bid Updated" : "Bid Submitted");
                router.refresh();
            }
        } catch (e) {
            toast.error("Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isClosed = ([
        RequestStatus.IN_PROGRESS,
        RequestStatus.BOOKED,
        RequestStatus.COMPLETED,
        RequestStatus.REJECTED,
        RequestStatus.CANCELLED
    ] as RequestStatus[]).includes(requestStatus);

    if (isClosed) {
        return (
            <Card className="border-none bg-gray-50/50 shadow-none ring-1 ring-gray-100">
                <CardHeader>
                    <CardTitle className="text-lg font-black text-gray-400 uppercase tracking-tight flex items-center gap-2">
                        <Info size={18} /> Bid Console Closed
                    </CardTitle>
                    <CardDescription>
                        This request is no longer accepting bids or modifications.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="sticky top-8 border-none shadow-xl shadow-indigo-100/50 ring-1 ring-gray-100 rounded-corner-xl overflow-hidden animate-in slide-in-from-right duration-500">
            <CardHeader className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Agent Quotation</span>
                    <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] font-black">
                        {existingBid ? 'MODIFYING BID' : 'NEW PROPOSAL'}
                    </Badge>
                </div>
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    {existingBid ? <Edit2 size={20} /> : <Zap size={20} />}
                    {existingBid ? 'Update Proposal' : 'Submit Quotation'}
                </CardTitle>
                <CardDescription className="text-indigo-100 font-medium">
                    {existingBid ? 'Adjust your pricing or message for this trip.' : 'Provide your best offer for this travel request.'}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Amount Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">Base Quote Amount</Label>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Currency: {currency}</span>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-indigo-600 transition-colors">
                            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : ''}
                        </div>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-10 h-14 text-xl font-black bg-gray-50 border-none ring-1 ring-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    {currency !== requestCurrency && preview && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-corner-md text-amber-700 text-xs font-bold border border-amber-100 animate-in fade-in slide-in-from-top-1">
                            <RefreshCw size={12} className={cn("shrink-0", isPreviewLoading && "animate-spin")} />
                            Company will see approx: <span className="text-amber-900 underline underline-offset-2">{preview}</span>
                        </div>
                    )}
                </div>

                {/* Tax Section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-corner-sm">
                                <Receipt size={14} />
                            </div>
                            <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">Taxes & Fees</Label>
                        </div>

                        {templates.length > 0 && (
                            <Select onValueChange={handleApplyTemplate}>
                                <SelectTrigger className="w-[140px] h-8 text-[10px] font-black border-none bg-gray-100 hover:bg-gray-200 transition-colors">
                                    <SelectValue placeholder="APPLY TEMPLATE" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                                            {t.name} {t.isDefault && "(Default)"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Active Taxes List */}
                    <div className="space-y-2">
                        {taxes.map((tax, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-corner-lg group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-corner-md bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                                        {tax.label.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 leading-none mb-1">{tax.label}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            {tax.type === 'PERCENTAGE' ? `${tax.value}% Applied` : `Fixed ${currency} ${tax.value}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-emerald-600">
                                        +{currency} {(tax.type === 'PERCENTAGE' ? (subtotal * tax.value) / 100 : tax.value).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveTax(idx)}
                                        className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Tax Form */}
                    <div className="p-4 bg-gray-50/50 rounded-corner-lg ring-1 ring-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                placeholder="Label (e.g. VAT)"
                                className="h-9 text-xs font-bold border-none bg-white ring-1 ring-gray-200 focus-visible:ring-indigo-500"
                                value={newTax.label}
                                onChange={(e) => setNewTax({ ...newTax, label: e.target.value })}
                            />
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="Value"
                                    className="h-9 text-xs font-bold border-none bg-white ring-1 ring-gray-200 focus-visible:ring-indigo-500"
                                    value={newTax.value || ""}
                                    onChange={(e) => setNewTax({ ...newTax, value: parseFloat(e.target.value) || 0 })}
                                />
                                <button
                                    onClick={() => setNewTax({ ...newTax, type: newTax.type === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE' })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 hover:text-indigo-700"
                                >
                                    {newTax.type === 'PERCENTAGE' ? '%' : 'AMT'}
                                </button>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full h-9 text-xs font-black border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all rounded-corner-md"
                            onClick={handleAddTax}
                        >
                            <Plus size={14} className="mr-2" /> ADD LINE ITEM
                        </Button>
                    </div>
                </div>

                {/* Message Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                    <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">Proposal Message</Label>
                    <Textarea
                        placeholder="Detail your offer, inclusions, and terms..."
                        className="min-h-[120px] text-sm font-medium bg-gray-50 border-none ring-1 ring-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 p-4 resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>
            </CardContent>

            {/* Summary & Footer */}
            <CardFooter className="bg-gray-50 p-6 flex flex-col gap-6">
                <div className="w-full space-y-3">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-tight">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-tight">
                        <span>Total Taxes</span>
                        <span>+ {currency} {taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Grand Total</span>
                        <span className="text-2xl font-black text-indigo-600 tracking-tight">
                            {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="w-full flex flex-col gap-3">
                    <Button
                        className="w-full h-14 text-base font-black uppercase tracking-widest rounded-corner-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.01] transition-all group"
                        disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw size={20} className="mr-2 animate-spin" />
                                PROCESSING...
                            </>
                        ) : (
                            <>
                                {existingBid ? 'UPDATE PROPOSAL' : 'SEND QUOTATION'}
                                {existingBid ? <Edit2 size={20} className="ml-2 group-hover:rotate-12 transition-transform" /> : <Zap size={20} className="ml-2 group-hover:scale-125 transition-transform" />}
                            </>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card >
    );
}
