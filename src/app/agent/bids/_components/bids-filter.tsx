"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface Company {
    id: string;
    name: string;
}

interface BidsFilterProps {
    companies: Company[];
}

export function BidsFilter({ companies }: BidsFilterProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Local state for dates to avoid excessive URL updates on typing
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

    const handleCompanyChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== 'all') {
            params.set("companyId", value);
        } else {
            params.delete("companyId");
        }
        params.set("page", "1"); // Reset pagination
        router.push(`?${params.toString()}`);
    };

    const handleDateChange = (start: string, end: string) => {
        const params = new URLSearchParams(searchParams);
        if (start) params.set("startDate", start);
        else params.delete("startDate");

        if (end) params.set("endDate", end);
        else params.delete("endDate");

        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("companyId");
        params.delete("startDate");
        params.delete("endDate");
        params.delete("query");
        params.set("page", "1");
        setStartDate("");
        setEndDate("");
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("companyId") || searchParams.has("startDate") || searchParams.has("endDate") || searchParams.has("query");

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Select
                value={searchParams.get("companyId") || "all"}
                onValueChange={handleCompanyChange}
            >
                <SelectTrigger className="w-[180px] bg-white rounded-xl border-gray-200">
                    <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                            {company.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
                <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                        setStartDate(e.target.value);
                        handleDateChange(e.target.value, endDate);
                    }}
                    className="w-[150px] bg-white rounded-xl border-gray-200"
                    placeholder="Start Date"
                />
                <span className="text-gray-400">-</span>
                <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                        setEndDate(e.target.value);
                        handleDateChange(startDate, e.target.value);
                    }}
                    className="w-[150px] bg-white rounded-xl border-gray-200"
                    placeholder="End Date"
                />
            </div>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="ml-auto sm:ml-0 text-gray-500 hover:text-red-500"
                    title="Clear Filters"
                >
                    <X size={18} />
                </Button>
            )}
        </div>
    );
}
