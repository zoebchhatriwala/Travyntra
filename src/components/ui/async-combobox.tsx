"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDebouncedCallback } from "use-debounce"

export interface ComboboxOption {
    value: string
    label: string
    countryCode?: string // Added for auto-detection
}


interface AsyncComboboxProps {
    value?: string
    onChange: (value: string, option?: ComboboxOption) => void
    onSearch: (query: string) => Promise<ComboboxOption[]>
    initialValueLabel?: string // Label to show if value is set but not in list yet
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    className?: string
    allowCustom?: boolean
}

export function AsyncCombobox({
    value,
    onChange,
    onSearch,
    initialValueLabel,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    className,
    allowCustom = false
}: AsyncComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [options, setOptions] = React.useState<ComboboxOption[]>([])
    const [loading, setLoading] = React.useState(false)
    const [query, setQuery] = React.useState("")

    // Manage display label
    const [label, setLabel] = React.useState<string>(initialValueLabel || placeholder)

    // Update label when options change or value changes
    React.useEffect(() => {
        const found = options.find(o => o.value === value);
        if (found) {
            setLabel(found.label);
        } else if (initialValueLabel) {
            setLabel(initialValueLabel);
        } else if (!value) {
            setLabel(placeholder);
        }
    }, [value, options, initialValueLabel, placeholder]);


    const debouncedSearch = useDebouncedCallback(async (q: string) => {
        if (!q) {
            setOptions([]);
            return;
        }
        setLoading(true);
        try {
            const results = await onSearch(q);
            setOptions(results);
        } catch (e) {
            console.error("Search failed", e);
            setOptions([]);
        } finally {
            setLoading(false);
        }
    }, 300);

    const handleSearch = (q: string) => {
        setQuery(q);
        debouncedSearch(q);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("flex w-full max-w-full overflow-hidden justify-between font-normal bg-white px-3 text-left", !value && "text-muted-foreground", className)}
                >
                    <div className="truncate flex-1 text-sm text-left min-w-0">{label}</div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        onValueChange={handleSearch}
                    />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}

                        {!loading && options.length === 0 && query && !allowCustom && (
                            <CommandEmpty>{emptyText}</CommandEmpty>
                        )}

                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value} // Use unique value for internal key
                                    onSelect={() => {
                                        onChange(option.value, option)
                                        setLabel(option.label); // Optimistic update
                                        setOpen(false)
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {allowCustom && query && !loading && (
                            <CommandGroup heading="Custom">
                                <CommandItem
                                    value={`custom-entry-${query}`}
                                    onSelect={() => {
                                        onChange(query, { value: query, label: query });
                                        setLabel(query);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer font-medium text-indigo-600 data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Use "{query}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
