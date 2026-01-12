
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { COUNTRIES } from "@/lib/constants/countries"
import { cn } from "@/lib/utils"

interface CountrySelectProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    className?: string
    placeholder?: string
}

export function CountrySelect({
    value,
    onChange,
    disabled,
    className,
    placeholder = "Select a country",
}: CountrySelectProps) {
    // Find the selected country object to display properly (if needed) or just pass value
    // We assume value is the country NAME based on previous string input usage.

    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={cn("w-full", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                        <span className="flex items-center gap-2">
                            <span className="text-lg leading-none">{country.emoji}</span>
                            <span className="truncate">{country.name}</span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
