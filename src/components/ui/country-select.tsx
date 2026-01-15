"use client"

import { Combobox } from "@/components/ui/combobox"
import { COUNTRIES } from "@/lib/constants/countries"

interface CountrySelectProps {
    value: string
    onChange: (value: string) => void
    className?: string
    placeholder?: string
    icon?: React.ReactNode
}

export function CountrySelect({
    value,
    onChange,
    className,
    placeholder = "Select a country",
    icon,
}: CountrySelectProps) {
    const options = [
        { value: "", label: "No country selected" },
        ...COUNTRIES.map((country) => ({
            value: country.code,
            label: `${country.emoji} ${country.name}`,
        })),
    ]

    return (
        <Combobox
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder="Search country..."
            className={className}
            startIcon={icon}
        />
    )
}
