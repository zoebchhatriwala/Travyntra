
"use client";

import { useState } from "react";
import { searchAgencies, toggleIntegration } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Plus, Check, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

// Minimal debounce implementation just in case
function useDebounceValue(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function AgencySearch() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounceValue(query, 500);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        async function fetch() {
            setIsLoading(true);
            const data = await searchAgencies(debouncedQuery);
            setResults(data);
            setIsLoading(false);
        }

        fetch();
    }, [debouncedQuery]);

    async function handleToggle(agencyId: string) {
        setProcessingId(agencyId);
        try {
            const res = await toggleIntegration(agencyId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.status === "added" ? "Agency connected" : "Agency disconnected");
                // Refresh local state to reflect change immediately
                setResults(prev => prev.map(a =>
                    a.id === agencyId ? { ...a, isIntegrated: res.status === "added" } : a
                ));
                // Optional: Trigger parent refresh if needed
            }
        } catch (e) {
            toast.error("Failed to update");
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="relative max-w-lg mx-auto">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Search for agencies by name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-12 h-12 text-base rounded-full shadow-sm border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                />
            </div>

            {isLoading && (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            )}

            {!isLoading && results.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {results.map((agency) => (
                        <div key={agency.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border bg-gray-50">
                                    <AvatarImage src={agency.logoUrl || undefined} />
                                    <AvatarFallback className="bg-white text-gray-400">
                                        <Building2 size={20} />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {agency.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium">Verified Partner</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant={agency.isIntegrated ? "ghost" : "default"}
                                className={agency.isIntegrated
                                    ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                                }
                                disabled={!!processingId}
                                onClick={() => handleToggle(agency.id)}
                            >
                                {processingId === agency.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : agency.isIntegrated ? (
                                    <>
                                        <Check className="mr-1.5 h-4 w-4" />
                                        Connected
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Connect
                                    </>
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && query.length >= 2 && results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No agencies found matching "{query}"
                </div>
            )}
        </div>
    );
}
