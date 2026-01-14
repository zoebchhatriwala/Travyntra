
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleIntegration } from "../actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface DisconnectButtonProps {
    agencyId: string;
}

export function DisconnectButton({ agencyId }: DisconnectButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { confirm, ConfirmDialog } = useConfirm();

    async function handleDisconnect() {
        const ok = await confirm({
            title: "Disconnect Agency",
            description: "Are you sure you want to disconnect from this agency?",
            confirmText: "Disconnect",
            variant: "destructive",
        });

        if (!ok) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await toggleIntegration(agencyId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Disconnected successfully");
                router.refresh(); // Ensure the UI updates
            }
        } catch {
            toast.error("Failed to disconnect");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2"
                onClick={handleDisconnect}
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
            </Button>
            <ConfirmDialog />
        </>
    );
}
