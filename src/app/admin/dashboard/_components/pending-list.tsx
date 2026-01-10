"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveUser, rejectUser } from "../actions";
import { UserRole } from "@prisma/client";
import { useState } from "react";

type UserWithCompany = {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    createdAt: Date;
    company?: {
        name: string;
    } | null;
};

interface PendingListProps {
    title: string;
    description: string;
    users: UserWithCompany[];
    type: "AGENT" | "COMPANY";
}

export function PendingList({ title, description, users, type }: PendingListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setLoadingId(id);
        await approveUser(id);
        setLoadingId(null);
    };

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure you want to reject and remove this user?")) return;
        setLoadingId(id);
        await rejectUser(id);
        setLoadingId(null);
    };

    if (users.length === 0) {
        return (
            <Card className="opacity-50 border-dashed">
                <CardHeader>
                    <CardTitle className="text-muted-foreground">{title}</CardTitle>
                    <CardDescription>No pending requests</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
                <Card key={user.id} className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="mb-2">
                                {type === "AGENT" ? "Travel Agent" : "Company Admin"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <CardTitle className="text-lg">{user.name || "No Name"}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {type === "COMPANY" && user.company && (
                            <div className="p-2 bg-muted/50 rounded-md text-sm">
                                <span className="font-semibold text-muted-foreground">Company: </span>
                                {user.company.name}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2 pt-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(user.id)}
                            disabled={loadingId === user.id}
                            className="w-full"
                        >
                            Reject
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(user.id)}
                            disabled={loadingId === user.id}
                            className="w-full"
                        >
                            {loadingId === user.id ? "Processing..." : "Approve"}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
