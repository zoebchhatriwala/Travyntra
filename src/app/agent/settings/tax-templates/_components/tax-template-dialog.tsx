"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { createTaxTemplate, updateTaxTemplate } from "../actions";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface TaxItem {
    label: string;
    value: number;
    type: "PERCENTAGE" | "FIXED";
}

interface TaxTemplate {
    id: string;
    name: string;
    description: string | null;
    taxes: TaxItem[];
    isDefault: boolean;
}

interface TaxTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: TaxTemplate | null;
}

export function TaxTemplateDialog({ open, onOpenChange, template }: TaxTemplateDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [taxes, setTaxes] = useState<TaxItem[]>([
        { label: "", value: 0, type: "PERCENTAGE" }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (template) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(template.name);

            setDescription(template.description || "");

            setIsDefault(template.isDefault);

            setTaxes(template.taxes.length > 0 ? template.taxes : [{ label: "", value: 0, type: "PERCENTAGE" }]);
        } else {

            setName("");

            setDescription("");

            setIsDefault(false);

            setTaxes([{ label: "", value: 0, type: "PERCENTAGE" }]);
        }
    }, [template, open]);

    const handleAddTax = () => {
        setTaxes([...taxes, { label: "", value: 0, type: "PERCENTAGE" }]);
    };

    const handleRemoveTax = (index: number) => {
        setTaxes(taxes.filter((_, i) => i !== index));
    };

    const handleTaxChange = (index: number, field: keyof TaxItem, value: string | number) => {
        const newTaxes = [...taxes];
        newTaxes[index] = { ...newTaxes[index], [field]: value } as TaxItem;
        setTaxes(newTaxes);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate
        if (!name.trim()) {
            toast.error("Please enter a template name");
            setLoading(false);
            return;
        }

        const validTaxes = taxes.filter(t => t.label.trim() && t.value > 0);
        if (validTaxes.length === 0) {
            toast.error("Please add at least one valid tax item");
            setLoading(false);
            return;
        }

        const data = {
            name: name.trim(),
            description: description.trim() || undefined,
            taxes: validTaxes,
            isDefault
        };

        const result = template
            ? await updateTaxTemplate(template.id, data)
            : await createTaxTemplate(data);

        setLoading(false);

        if (result.success) {
            toast.success(template ? "Template updated successfully" : "Template created successfully");
            onOpenChange(false);
        } else {
            toast.error(result.error || "Failed to save template");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {template ? "Edit Tax Template" : "Create Tax Template"}
                    </DialogTitle>
                    <DialogDescription>
                        {template
                            ? "Update your tax template configuration"
                            : "Create a reusable tax template for quick bidding"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Template Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Standard GST, VAT Template"
                                className="rounded-corner-md mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of when to use this template"
                                className="rounded-corner-md mt-1"
                                rows={2}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isDefault"
                                checked={isDefault}
                                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                            />
                            <Label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">
                                Set as default template
                            </Label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-bold">Tax Items *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddTax}
                                className="rounded-corner-md"
                            >
                                <Plus size={14} className="mr-1" />
                                Add Tax
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {taxes.map((tax, index) => (
                                <div key={index} className="flex gap-2 items-start p-4 bg-gray-50 rounded-corner-md">
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            placeholder="Tax label (e.g., GST, VAT)"
                                            value={tax.label}
                                            onChange={(e) => handleTaxChange(index, "label", e.target.value)}
                                            className="rounded-corner-md"
                                        />
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Value"
                                                value={tax.value || ""}
                                                onChange={(e) => handleTaxChange(index, "value", parseFloat(e.target.value) || 0)}
                                                className="rounded-corner-md flex-1"
                                                step="0.01"
                                                min="0"
                                            />
                                            <Select
                                                value={tax.type}
                                                onValueChange={(value) => handleTaxChange(index, "type", value)}
                                            >
                                                <SelectTrigger className="rounded-corner-md w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {taxes.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveTax(index)}
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-corner-md mt-1"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-corner-md font-bold"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 rounded-corner-md font-bold"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : template ? "Update Template" : "Create Template"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
