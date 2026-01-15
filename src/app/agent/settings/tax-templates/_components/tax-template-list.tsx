"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { TaxTemplateDialog } from "./tax-template-dialog";
import { deleteTaxTemplate, setDefaultTemplate } from "../actions";
import { toast } from "sonner";
import { useConfirm } from "@/lib/hooks/use-confirm";

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
    createdAt: Date;
}

interface TaxTemplateListProps {
    templates: TaxTemplate[];
}

export function TaxTemplateList({ templates }: TaxTemplateListProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TaxTemplate | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    const handleEdit = (template: TaxTemplate) => {
        setEditingTemplate(template);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Tax Template",
            description: "Are you sure you want to delete this tax template? This action cannot be undone.",
            variant: "destructive"
        });
        if (!confirmed) return;

        const result = await deleteTaxTemplate(id);
        if (result.success) {
            toast.success("Tax template deleted successfully");
        } else {
            toast.error(result.error || "Failed to delete tax template");
        }
    };

    const handleSetDefault = async (id: string) => {
        const result = await setDefaultTemplate(id);
        if (result.success) {
            toast.success("Default template updated");
        } else {
            toast.error(result.error || "Failed to update default template");
        }
    };

    const formatTaxValue = (tax: TaxItem) => {
        if (tax.type === "PERCENTAGE") {
            return `${tax.value}%`;
        }
        return `$${tax.value.toFixed(2)}`;
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        {templates.length} {templates.length === 1 ? "template" : "templates"}
                    </p>
                    <Button
                        onClick={handleCreate}
                        className="rounded-xl font-bold"
                    >
                        <Plus size={16} className="mr-2" />
                        Create Template
                    </Button>
                </div>

                {templates.length === 0 ? (
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px]">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Plus size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No Tax Templates</h3>
                            <p className="text-gray-500 mb-6">
                                Create your first tax template to streamline your bidding process.
                            </p>
                            <Button onClick={handleCreate} className="rounded-xl font-bold">
                                <Plus size={16} className="mr-2" />
                                Create Your First Template
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {templates.map((template) => (
                            <Card
                                key={template.id}
                                className="border-none shadow-sm ring-1 ring-gray-100 rounded-[32px] overflow-hidden hover:shadow-md transition-all"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                {template.name}
                                                {template.isDefault && (
                                                    <Badge className="bg-indigo-100 text-indigo-700 border-none text-xs">
                                                        Default
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            {template.description && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            Tax Items ({template.taxes.length})
                                        </p>
                                        <div className="space-y-1">
                                            {template.taxes.map((tax, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-center text-sm py-1"
                                                >
                                                    <span className="text-gray-700">{tax.label}</span>
                                                    <span className="font-bold text-gray-900">
                                                        {formatTaxValue(tax)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        {!template.isDefault && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetDefault(template.id)}
                                                className="flex-1 rounded-xl text-xs"
                                            >
                                                <Star size={14} className="mr-1" />
                                                Set Default
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(template)}
                                            className="flex-1 rounded-xl text-xs"
                                        >
                                            <Edit size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(template.id)}
                                            className="flex-1 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        >
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <TaxTemplateDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                template={editingTemplate}
            />

            <ConfirmDialog />
        </>
    );
}
