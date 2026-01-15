"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
    text: string;
    displayText?: string;
}

export function CopyButton({ text, displayText }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-gray-900 hover:text-indigo-600 transition-colors group"
            title="Copy full ID"
        >
            <span>{displayText || text}</span>
            {copied ? (
                <Check size={12} className="text-emerald-600" />
            ) : (
                <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
}
