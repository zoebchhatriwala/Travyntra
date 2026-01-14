
import { notFound } from "next/navigation";
import { getFulfillmentRequest } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Building2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { FulfillmentChecklist } from "./_components/fulfillment-checklist";
import { StatusActions } from "./_components/status-actions";
import { RecentMessages } from "./_components/recent-messages";
import { parseMoney, formatMoney } from "@/lib/types/money";

interface Location {
    city?: string;
    formatted?: string;
}

export default async function FulfillmentDetailPage({
    params,
}: {
    params: Promise<{ requestId: string }>;
}) {
    const { requestId } = await params;

    const request = await getFulfillmentRequest(requestId);

    if (!request) return notFound();

    const myBid = request.bids[0];

    // Check if all fulfillment items are completed
    const totalItems = request.fulfillmentItems.length;
    const completedItems = request.fulfillmentItems.filter(item => item.isCompleted).length;
    const allCompleted = totalItems > 0 && completedItems === totalItems;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/agent/fulfillment"
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{request.title}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className={`
                                ${request.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : ''}
                                ${request.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' : ''}
                                ${request.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : ''}
                                font-bold
                            `}>
                                {request.status.replace(/_/g, ' ')}
                            </Badge>
                            {myBid && (
                                <span className="text-sm font-bold text-emerald-600">
                                    Won: {formatMoney(parseMoney(myBid.amount))}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <StatusActions
                    requestId={requestId}
                    currentStatus={request.status}
                    allItemsCompleted={allCompleted}
                    hasItems={totalItems > 0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Trip Details Card */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Trip Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-100 rounded-xl">
                                        <MapPin size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Destination</p>
                                        <p className="font-semibold text-gray-900">{(request.destination as unknown as Location)?.city || (request.destination as unknown as Location)?.formatted || "Unknown"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-purple-100 rounded-xl">
                                        <Calendar size={18} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Travel Dates</p>
                                        <p className="font-semibold text-gray-900">
                                            {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-100 rounded-xl">
                                        <User size={18} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Traveler</p>
                                        <p className="font-semibold text-gray-900">{request.user.name}</p>
                                        <p className="text-xs text-gray-500">{request.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                                        <Building2 size={18} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Company</p>
                                        <p className="font-semibold text-gray-900">{request.company.name}</p>
                                    </div>
                                </div>
                            </div>
                            {request.purpose && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Purpose</p>
                                    <p className="text-sm text-gray-600">{request.purpose}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dynamic Fulfillment Checklist */}
                    <FulfillmentChecklist
                        requestId={requestId}
                        items={request.fulfillmentItems}
                        isCompleted={request.status === 'COMPLETED'}
                    />
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                    {/* Progress Summary */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Progress</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-600">Checklist Items</span>
                                        <span className="font-bold text-gray-900">{completedItems}/{totalItems}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                            style={{ width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                                {totalItems === 0 && (
                                    <p className="text-xs text-amber-600 font-medium">
                                        ⚠️ Add checklist items to track fulfillment
                                    </p>
                                )}
                                {totalItems > 0 && !allCompleted && (
                                    <p className="text-xs text-gray-500">
                                        Complete all items to mark request as done
                                    </p>
                                )}
                                {allCompleted && (
                                    <p className="text-xs text-emerald-600 font-medium">
                                        ✓ Ready to mark as complete!
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Messages with Markdown */}
                    <RecentMessages
                        messages={request.messages}
                        companySlug={request.company.slug}
                        requestId={requestId}
                    />
                </div>
            </div>
        </div>
    );
}
