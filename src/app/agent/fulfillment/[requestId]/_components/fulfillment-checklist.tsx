"use client";

import { useState, useRef } from "react";
import { DocType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    addFulfillmentItem,
    toggleFulfillmentItem,
    deleteFulfillmentItem,
    uploadFulfillmentDocument,
    deleteDocument
} from "../../actions";
import {
    Plus,
    Check,
    Trash2,
    Upload,
    File,
    X,
    Loader2,
    ChevronDown,
    ChevronUp,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface FulfillmentItem {
    id: string;
    title: string;
    description: string | null;
    isCompleted: boolean;
    order: number;
    documents: {
        id: string;
        name: string;
        url: string;
        type: DocType;
        createdAt: Date;
        uploader: { name: string | null };
    }[];
}

interface FulfillmentChecklistProps {
    requestId: string;
    items: FulfillmentItem[];
    isCompleted: boolean;
}

export function FulfillmentChecklist({ requestId, items, isCompleted }: FulfillmentChecklistProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
    const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
    const [selectedDocType, setSelectedDocType] = useState<DocType>(DocType.TICKET);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    async function handleAddItem() {
        if (!newTitle.trim()) {
            toast.error("Please enter a title");
            return;
        }

        setLoadingItemId('adding');

        try {
            const result = await addFulfillmentItem(requestId, newTitle.trim(), newDescription.trim() || undefined);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Item added");
                setNewTitle("");
                setNewDescription("");
                setIsAdding(false);
            }
        } catch {
            toast.error("Failed to add item");
        } finally {
            setLoadingItemId(null);
        }
    }

    async function handleToggleItem(itemId: string, currentState: boolean) {
        setLoadingItemId(itemId);

        try {
            const result = await toggleFulfillmentItem(itemId, requestId, !currentState);
            if (result.error) {
                toast.error(result.error);
            }
        } catch {
            toast.error("Failed to update item");
        } finally {
            setLoadingItemId(null);
        }
    }

    async function handleDeleteItem(itemId: string) {
        const ok = await confirm({
            title: "Delete Item",
            description: "Are you sure you want to delete this item and all its documents? This action cannot be undone.",
            confirmText: "Delete",
            variant: "destructive",
        });

        if (!ok) return;

        setLoadingItemId(itemId);

        try {
            const result = await deleteFulfillmentItem(itemId, requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Item deleted");
            }
        } catch {
            toast.error("Failed to delete item");
        } finally {
            setLoadingItemId(null);
        }
    }

    async function handleFileUpload(itemId: string, files: FileList) {
        setUploadingItemId(itemId);

        try {
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('files', file));
            formData.append('requestId', requestId);
            formData.append('fulfillmentItemId', itemId);
            formData.append('type', selectedDocType);

            const result = await uploadFulfillmentDocument(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Documents uploaded");
            }
        } catch {
            toast.error("Failed to upload");
        } finally {
            setUploadingItemId(null);
        }
    }

    async function handleDeleteDocument(docId: string) {
        setDeletingDocId(docId);

        try {
            const result = await deleteDocument(docId, requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Document deleted");
            }
        } catch {
            toast.error("Failed to delete");
        } finally {
            setDeletingDocId(null);
        }
    }

    return (
        <div className="bg-white rounded-corner-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">Fulfillment Checklist</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Add items required to complete this request</p>
                    </div>
                    {!isCompleted && !isAdding && (
                        <Button
                            onClick={() => setIsAdding(true)}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-corner-md"
                        >
                            <Plus size={16} className="mr-1" />
                            Add Item
                        </Button>
                    )}
                </div>

                {/* Add Item Form */}
                {isAdding && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-corner-md border border-gray-200 space-y-3">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Item title (e.g., Flight Ticket, Hotel Booking)"
                            className="w-full px-3 py-2 border border-gray-200 rounded-corner-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                            autoFocus
                        />
                        <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-corner-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={handleAddItem}
                                disabled={loadingItemId === 'adding'}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-corner-sm"
                            >
                                {loadingItemId === 'adding' ? (
                                    <Loader2 size={14} className="animate-spin mr-1" />
                                ) : (
                                    <Plus size={14} className="mr-1" />
                                )}
                                Add
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewTitle("");
                                    setNewDescription("");
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-700 rounded-corner-sm"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100">
                {items.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-corner-md mx-auto mb-3 flex items-center justify-center">
                            <Plus size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No checklist items yet</p>
                        <p className="text-xs text-gray-400 mt-1">Add items like tickets, visas, or hotel bookings</p>
                    </div>
                ) : (
                    items.map(item => {
                        const isExpanded = expandedItemId === item.id;

                        return (
                            <div key={item.id} className="group">
                                <div className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => !isCompleted && handleToggleItem(item.id, item.isCompleted)}
                                            disabled={isCompleted || loadingItemId === item.id}
                                            className={`flex-shrink-0 w-6 h-6 rounded-corner-sm border-2 flex items-center justify-center transition-all mt-0.5 ${item.isCompleted
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-gray-300 hover:border-indigo-400'
                                                } ${isCompleted ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {loadingItemId === item.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : item.isCompleted ? (
                                                <Check size={14} strokeWidth={3} />
                                            ) : null}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-medium text-sm ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {item.title}
                                                </h4>
                                                {item.documents.length > 0 && (
                                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                                        {item.documents.length} file{item.documents.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className={`text-xs mt-0.5 ${item.isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!isCompleted && (
                                                <>
                                                    <Button
                                                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-corner-sm"
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        disabled={loadingItemId === item.id}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-corner-sm"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded: Documents & Upload */}
                                    {isExpanded && (
                                        <div className="mt-4 ml-10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            {/* Documents */}
                                            {item.documents.length > 0 && (
                                                <div className="space-y-2">
                                                    {item.documents.map(doc => (
                                                        <div key={doc.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded-corner-sm group/doc">
                                                            <div className="w-8 h-8 bg-indigo-100 rounded-corner-sm flex items-center justify-center">
                                                                <File size={14} className="text-indigo-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs font-medium text-gray-700 truncate">{doc.name}</p>
                                                                    <span className="text-[8px] font-black bg-gray-200 text-gray-500 px-1 rounded uppercase tracking-tighter">
                                                                        {doc.type}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-gray-400">
                                                                    {format(new Date(doc.createdAt), "MMM d, h:mm a")}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                                                                <a
                                                                    href={doc.url}
                                                                    download={doc.name}
                                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-corner-sm transition-colors"
                                                                >
                                                                    <Download size={14} />
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                                    disabled={deletingDocId === doc.id}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-corner-sm transition-colors"
                                                                >
                                                                    {deletingDocId === doc.id ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <X size={14} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Upload Zone */}
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed border-gray-200 rounded-corner-md p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                                            >
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files) {
                                                            handleFileUpload(item.id, e.target.files);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                />
                                                {uploadingItemId === item.id ? (
                                                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                                                        <Loader2 size={16} className="animate-spin" />
                                                        <span className="text-xs font-medium">Uploading...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Upload size={16} className="text-gray-400" />
                                                            <p className="text-xs font-medium text-gray-600">Upload documents</p>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-3 mt-1" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type:</span>
                                                            <select
                                                                value={selectedDocType}
                                                                onChange={(e) => setSelectedDocType(e.target.value as DocType)}
                                                                className="text-[10px] font-bold bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                                            >
                                                                {Object.values(DocType).map(type => (
                                                                    <option key={type} value={type}>{type}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-1">PDF, Images • Max 10MB</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <ConfirmDialog />
        </div>
    );
}
