"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function AssetTypeFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Get current value or default to ALL (which corresponds to empty string or "ALL")
    const currentValue = searchParams.get("type") || "ALL";

    function onValueChange(value: string) {
        const params = new URLSearchParams(searchParams);
        params.set("page", "1"); // Reset pagination
        if (value && value !== "ALL") {
            params.set("type", value);
        } else {
            params.delete("type");
        }
        replace(`${pathname}?${params.toString()}`);
    }

    return (
        <Select
            value={currentValue}
            onValueChange={onValueChange}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Documents</SelectItem>
                <SelectItem value="TICKET">Tickets</SelectItem>
                <SelectItem value="VISA">Visas</SelectItem>
                <SelectItem value="PASSPORT">Passports</SelectItem>
                <SelectItem value="INVOICE">Invoices</SelectItem>
            </SelectContent>
        </Select>
    );
}
