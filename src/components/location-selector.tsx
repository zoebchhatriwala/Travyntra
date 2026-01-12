"use client";

import { AsyncCombobox, ComboboxOption } from "@/components/ui/async-combobox";
import { Input } from "@/components/ui/input";
import { searchLocations } from "@/app/actions/locations";
import { MapPin } from "lucide-react";

interface LocationSelectorProps {
    mode: "flight" | "train" | "car" | "other" | "any";
    value?: string;
    onChange: (value: string) => void;
    onCountryChange?: (country: string) => void;
    placeholder?: string;
    className?: string;
}

export function LocationSelector({ mode, value, onChange, onCountryChange, placeholder, className }: LocationSelectorProps) {


    // Wrapper to adapt server action to combobox expectation
    const handleSearch = async (query: string): Promise<ComboboxOption[]> => {
        if (mode !== 'flight' && mode !== 'train') return [];

        try {
            const results = await searchLocations(query, mode);
            return results.map(item => ({
                value: item.code,
                label: `${item.city} (${item.code}) - ${item.name} [${item.country}]`,
                countryCode: item.country
            }));
        } catch (e) {
            console.error("Search error:", e);
            return [];
        }
    };

    // If generic mode or no options (fallback), use text input
    if (mode === "car" || mode === "other" || mode === "any") {
        return (
            <div className="relative w-full">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || "Enter address or location..."}
                    className={`pl-9 bg-white ${className || ""}`}
                />
            </div>
        )
    }

    return (
        <AsyncCombobox
            value={value}
            onChange={(val, opt) => {
                onChange(val);
                if (opt?.countryCode && onCountryChange) {
                    onCountryChange(opt.countryCode);
                }
            }}
            onSearch={handleSearch}
            initialValueLabel={value} // Pass value as label initially, user can search to correct it if needed
            placeholder={placeholder || (mode === "flight" ? "Select airport..." : "Select station...")}
            searchPlaceholder="Search city, code, station..."
            className={className}
        />
    );
}
