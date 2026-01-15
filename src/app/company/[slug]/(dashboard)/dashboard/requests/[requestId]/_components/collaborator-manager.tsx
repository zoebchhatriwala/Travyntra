"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { searchCompanyUsers, addCollaborator, removeCollaborator } from "../../../actions";

interface Collaborator {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
}

interface CollaboratorManagerProps {
    requestId: string;
    initialCollaborators: Collaborator[];
    isOwner: boolean;
    isAdmin: boolean;
    currentUserId: string;
}

export function CollaboratorManager({
    requestId,
    initialCollaborators,
    isOwner,
    isAdmin,
    currentUserId
}: CollaboratorManagerProps) {
    const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);

    const canManage = isOwner || isAdmin;

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchCompanyUsers(query);
            // Filter out existing collaborators and request owner (if needed)
            const filteredResults = results.filter(
                user => !collaborators.some(c => c.id === user.id)
            ) as Collaborator[];
            setSearchResults(filteredResults);
        } catch (_error) {
            console.error("Search failed:", _error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddCollaborator = async (user: Collaborator) => {
        setIsAdding(user.id);
        try {
            const result = await addCollaborator(requestId, user.id);
            if (result.success) {
                setCollaborators([...collaborators, user]);
                setSearchResults(searchResults.filter(r => r.id !== user.id));
                toast.success(`${user.name || user.email} added as collaborator`);
            } else {
                toast.error(result.error || "Failed to add collaborator");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsAdding(null);
        }
    };

    const handleRemoveCollaborator = async (user: Collaborator) => {
        setIsRemoving(user.id);
        try {
            const result = await removeCollaborator(requestId, user.id);
            if (result.success) {
                setCollaborators(collaborators.filter(c => c.id !== user.id));
                toast.success(`${user.name || user.email} removed from collaborators`);
            } else {
                toast.error(result.error || "Failed to remove collaborator");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsRemoving(null);
        }
    };

    return (
        <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <CardHeader className="pb-3 border-b border-gray-100/50">
                <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    Collaborators
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {/* Existing Collaborators */}
                <div className="max-h-[240px] overflow-y-auto p-4 space-y-3">
                    {collaborators.length === 0 ? (
                        <div className="text-center py-6">
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 text-gray-300">
                                <Users size={20} />
                            </div>
                            <p className="text-xs text-gray-400 font-medium">No collaborators yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {collaborators.map((collaborator) => (
                                <div
                                    key={collaborator.id}
                                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/80 transition-all duration-300 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-9 h-9 border-2 border-white shadow-sm ring-1 ring-gray-100">
                                            <AvatarImage src={collaborator.avatarUrl || ""} />
                                            <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-bold">
                                                {collaborator.name?.[0] || collaborator.email?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {collaborator.name || collaborator.email}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                {collaborator.role.toLowerCase().replace(/_/g, " ")}
                                            </p>
                                        </div>
                                    </div>
                                    {(canManage || collaborator.id === currentUserId) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all duration-300"
                                            onClick={() => handleRemoveCollaborator(collaborator)}
                                            disabled={isRemoving === collaborator.id}
                                        >
                                            {isRemoving === collaborator.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <X size={14} />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Collaborator UI */}
                {canManage && (
                    <div className="p-4 border-t border-gray-100/50 bg-gray-50/30">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Add Collaborator</p>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                placeholder="Search staff..."
                                className="pl-9 h-10 bg-white border-gray-100 focus-visible:ring-indigo-500 rounded-2xl text-xs font-medium shadow-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        {/* Search Results */}
                        {(isSearching || searchResults.length > 0) && (
                            <div className="mt-3 p-1.5 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-indigo-900/5 max-h-[180px] overflow-y-auto animate-in slide-in-from-top-2 duration-300">
                                {isSearching ? (
                                    <div className="flex items-center justify-center p-6 text-[10px] font-bold text-indigo-400 gap-2 uppercase tracking-widest">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Searching...
                                    </div>
                                ) : (
                                    searchResults.map((user) => (
                                        <button
                                            key={user.id}
                                            className="w-full flex items-center justify-between p-2.5 hover:bg-indigo-50/50 rounded-2xl transition-all duration-300 group text-left"
                                            onClick={() => handleAddCollaborator(user)}
                                            disabled={isAdding === user.id}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8 rounded-xl ring-2 ring-gray-100">
                                                    <AvatarImage src={user.avatarUrl || ""} />
                                                    <AvatarFallback className="bg-gray-50 text-gray-500 text-[10px] font-bold">
                                                        {user.name?.[0] || user.email?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                        {user.name || user.email}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                                                {isAdding === user.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <UserPlus size={14} />
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                            <p className="mt-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2">No users found</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
