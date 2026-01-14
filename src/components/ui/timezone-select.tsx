"use client"

import { Combobox } from "@/components/ui/combobox"
import { TIMEZONES } from "@/lib/constants/timezones"

interface TimezoneSelectProps {
    value: string
    onChange: (value: string) => void
    className?: string
    placeholder?: string
    icon?: React.ReactNode
}

export function TimezoneSelect({
    value,
    onChange,
    className,
    placeholder = "Select timezone",
    icon,
}: TimezoneSelectProps) {
    const options = [
        { value: "UTC", label: "UTC" },
        ...TIMEZONES.filter((t) => t !== "UTC").map((tz) => ({
            value: tz,
            label: tz.replace(/_/g, " "),
        })),
    ]

    return (
        <Combobox
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder="Search timezone..."
            className={className}
            startIcon={icon}
        />
    )
}
