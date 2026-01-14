"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markAsBooked, markAsCompleted } from "../../actions";
import { Loader2, CheckCircle, Plane } from "lucide-react";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface StatusActionsProps {
    requestId: string;
    currentStatus: string;
    allItemsCompleted: boolean;
    hasItems: boolean;
}

export function StatusActions({ requestId, currentStatus, allItemsCompleted, hasItems }: StatusActionsProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const { confirm, ConfirmDialog } = useConfirm();

    async function handleMarkBooked() {
        setIsLoading('booked');
        try {
            const result = await markAsBooked(requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request marked as booked!");
            }
        } catch {
            toast.error("Failed to update status");
        } finally {
            setIsLoading(null);
        }
    }

    async function handleMarkCompleted() {
        if (!hasItems) {
            toast.error("Please add at least one checklist item");
            return;
        }

        if (!allItemsCompleted) {
            toast.error("Complete all checklist items first");
            return;
        }

        const ok = await confirm({
            title: "Complete Request",
            description: "Are you sure you want to mark this request as completed? This action cannot be undone.",
            confirmText: "Complete",
        });

        if (!ok) {
            return;
        }

        setIsLoading('completed');
        try {
            const result = await markAsCompleted(requestId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Request completed successfully!");
            }
        } catch {
            toast.error("Failed to complete request");
        } finally {
            setIsLoading(null);
        }
    }

    if (currentStatus === 'COMPLETED') {
        return (
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-semibold text-sm">
                <CheckCircle size={18} />
                Completed
            </div>
        );
    }

    const canComplete = hasItems && allItemsCompleted;

    return (
        <div className="flex items-center gap-3">
            {currentStatus === 'IN_PROGRESS' && (
                <Button
                    onClick={handleMarkBooked}
                    disabled={isLoading !== null}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-semibold"
                >
                    {isLoading === 'booked' ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                        <Plane size={16} className="mr-2" />
                    )}
                    Mark as Booked
                </Button>
            )}

            <Button
                onClick={handleMarkCompleted}
                disabled={isLoading !== null || !canComplete}
                className={`rounded-xl font-semibold shadow-lg ${canComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                title={!canComplete ? 'Complete all checklist items to enable' : ''}
            >
                {isLoading === 'completed' ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                    <CheckCircle size={16} className="mr-2" />
                )}
                Mark as Complete
            </Button>
            <ConfirmDialog />
        </div>
    );
}
