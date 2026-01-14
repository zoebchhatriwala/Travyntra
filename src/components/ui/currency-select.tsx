"use client"

import { Combobox } from "@/components/ui/combobox"
import { CURRENCIES } from "@/lib/constants/currencies"

interface CurrencySelectProps {
    value: string
    onChange: (value: string) => void
    className?: string
    placeholder?: string
    icon?: React.ReactNode
}

export function CurrencySelect({
    value,
    onChange,
    className,
    placeholder = "Select currency",
    icon,
}: CurrencySelectProps) {
    const options = CURRENCIES.map((c) => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
    }))

    return (
        <Combobox
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder="Search currency..."
            className={className}
            startIcon={icon}
        />
    )
}
