import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Link as LinkIcon, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface GroupTripInfoProps {
    request: {
        isGroup: boolean;
        parentTrip?: {
            id: string;
            title: string;
        } | null;
        childTrips?: Array<{
            id: string;
            title: string;
            status: string;
            user: {
                name: string | null;
                avatarUrl: string | null;
            };
        }>;
    };
    slug: string;
}

export function GroupTripInfo({ request, slug }: GroupTripInfoProps) {
    const isGroup = request.isGroup;
    const hasParent = !!request.parentTrip;
    const participants = request.childTrips || [];

    if (!isGroup && !hasParent) return null;

    return (
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                    <Users className="w-5 h-5 text-indigo-500" />
                    {isGroup ? "Group Trip Overview" : "Part of Group Trip"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasParent && request.parentTrip && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parent Trip</span>
                        <Link
                            href={`/company/${slug}/dashboard/requests/${request.parentTrip.id}`}
                            className="flex items-center justify-between p-3 rounded-corner-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <LinkIcon className="w-4 h-4" />
                                <span className="font-medium">{request.parentTrip.title}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                )}

                {isGroup && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Participants</span>
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">
                                {participants.length} linked requests
                            </Badge>
                        </div>

                        {participants.length === 0 ? (
                            <p className="text-sm text-gray-500 italic py-2">No participants joined yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {participants.map((child) => (
                                    <Link
                                        key={child.id}
                                        href={`/company/${slug}/dashboard/requests/${child.id}`}
                                        className="flex items-center justify-between p-2 rounded-corner-md hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                <AvatarImage src={child.user.avatarUrl || ""} />
                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                                    {child.user.name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{child.user.name}</p>
                                                <p className="text-xs text-gray-500">{child.title}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-tighter">
                                                {child.status}
                                            </Badge>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
