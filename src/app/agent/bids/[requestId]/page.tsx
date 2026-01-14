
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { BidForm } from "./_components/bid-form";
import { ChatThread } from "@/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/chat-thread";
import { Calendar, MapPin, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { TripPreferences } from "@/lib/types/trip-preferences";
import { parseMoney, moneyToDecimal } from "@/lib/types/money";

export default async function RequestDetailsPage({
    params
}: {
    params: Promise<{ requestId: string }>;
}) {
    const { requestId } = await params; // await params in Next.js 15
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId || session.user.role !== "TRAVEL_AGENT") {
        redirect("/");
    }

    const request = await prisma.tripRequest.findUnique({
        where: { id: requestId },
        include: {
            company: { select: { name: true, logoUrl: true, slug: true, currency: true } },
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
            bids: {
                where: { agentId: session.user.companyId }
            },
            messages: {
                include: {
                    sender: {
                        select: {
                            name: true,
                            avatarUrl: true,
                            role: true,
                            company: { select: { name: true } }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                }
            }
        }
    });

    if (!request) {
        notFound();
    }

    // Get Agent's currency
    const agentCompany = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { currency: true }
    });

    const myBid = request.bids[0] || null;
    const budget = request.budget ? parseMoney(request.budget) : null;
    const agentCurrency = agentCompany?.currency || "USD";
    const requestCurrency = budget?.currencyCode || request.company.currency || "USD";

    interface Location {
        city?: string;
        formatted?: string;
    }

    // Available users for mentions (Request Creator)
    const availableUsers = [
        {
            id: request.user.id,
            name: request.user.name,
            role: request.user.role,
            avatarUrl: request.user.avatarUrl
        }
    ];

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{request.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                    <Building2 size={14} />
                                    {request.company.name}
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                    <User size={14} />
                                    {request.user.name}
                                </span>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-sm px-3 py-1">
                            {request.status}
                        </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mb-8">
                        <div className="p-4 bg-indigo-50/50 rounded-lg space-y-1">
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Destination</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <MapPin size={18} className="text-indigo-500" />
                                {(request.destination as unknown as Location)?.city || (request.destination as unknown as Location)?.formatted || "Unknown Destination"}
                            </div>
                        </div>
                        <div className="p-4 bg-indigo-50/50 rounded-lg space-y-1">
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Timeline</span>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <Calendar size={18} className="text-indigo-500" />
                                {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Trip Details & Preferences</h3>
                        <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 p-6 rounded-lg">
                            {request.purpose && (
                                <p><strong>Purpose:</strong> {request.purpose}</p>
                            )}
                            {/* Render JSON preferences if needed */}
                            {(() => {
                                const prefs = request.preferences as TripPreferences;
                                if (!prefs) return null;

                                interface TravelPrefDetail {
                                    from?: string;
                                    to?: string;
                                    pickup?: string | Location;
                                    dropoff?: string | Location;
                                    details?: string;
                                }

                                const renderItem = (title: string, content: string | TravelPrefDetail | null | undefined) => {
                                    if (!content) return null;

                                    const renderedContent = typeof content === 'string' ? content : (
                                        <div className="space-y-1">
                                            {content.from && <p><strong>From:</strong> {content.from}</p>}
                                            {content.to && <p><strong>To:</strong> {content.to}</p>}
                                            {content.pickup && (
                                                <p><strong>Pickup:</strong> {typeof content.pickup === 'string' ? content.pickup : ((content.pickup as Location).formatted || (content.pickup as Location).city || 'Custom Location')}</p>
                                            )}
                                            {content.dropoff && (
                                                <p><strong>Dropoff:</strong> {typeof content.dropoff === 'string' ? content.dropoff : ((content.dropoff as Location).formatted || (content.dropoff as Location).city || 'Custom Location')}</p>
                                            )}
                                            {content.details && <p><strong>Details:</strong> {content.details}</p>}
                                        </div>
                                    );

                                    return (
                                        <div className="bg-white p-3 rounded border border-gray-100 shadow-sm">
                                            <span className="text-xs font-bold text-indigo-600 uppercase block mb-1">{title}</span>
                                            <div className="text-sm">{renderedContent}</div>
                                        </div>
                                    );
                                };

                                return (
                                    <div className="mt-6 space-y-4">
                                        <h4 className="font-bold text-gray-900 border-b pb-2">Travel Preferences</h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {renderItem("Flight", prefs.flight)}
                                            {renderItem("Hotel", prefs.hotel)}
                                            {renderItem("Train / Rail", prefs.train)}
                                            {renderItem("Car / Taxi", prefs.car)}
                                            {renderItem("Other Requests", prefs.other)}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Discussion Thread */}
                <ChatThread
                    requestId={request.id}
                    initialMessages={request.messages}
                    currentUserId={session.user.id}
                    availableUsers={availableUsers}
                />
            </div>

            <div className="space-y-6">
                <BidForm
                    requestId={request.id}
                    requestStatus={request.status}
                    currency={agentCurrency}
                    requestCurrency={requestCurrency}
                    existingBid={myBid ? {
                        id: myBid.id,
                        amount: moneyToDecimal(parseMoney(myBid.amount)),
                        message: myBid.message
                    } : null}
                />
            </div>
        </div>
    );
}
