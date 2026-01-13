import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Calendar, MapPin, DollarSign, FileText, Building2 } from "lucide-react";
import { format } from "date-fns";
import { TripPreferences } from "@/lib/types/trip-preferences";
import { Money, formatMoney } from "@/lib/types/money";
import { Prisma } from "@prisma/client";

interface RequestInfoProps {
    request: {
        title: string;
        destination: Prisma.JsonValue | string;
        budget?: Money | null;
        cost?: Money | null;
        startDate: Date | string;
        endDate: Date | string;
        purpose?: string | null;
        preferences?: Prisma.JsonValue;
    };
    currency: string;
}

export function RequestInfo({ request }: { request: RequestInfoProps['request'] }) {
    const preferences: TripPreferences = request.preferences as TripPreferences;

    const destination = request.destination as { city?: string; formatted?: string } | null;

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                        <Plane className="w-5 h-5 text-indigo-500" />
                        Trip Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                                <p className="text-base font-bold text-gray-900">
                                    {destination?.city || destination?.formatted || "Unknown Destination"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {request.cost ? "Finalized Cost" : "Est. Budget"}
                                </p>
                                <p className={`text-base font-bold ${request.cost ? 'text-indigo-600 animate-in fade-in zoom-in-95 duration-500' : 'text-gray-900'}`}>
                                    {request.cost ? formatMoney(request.cost) : (request.budget ? formatMoney(request.budget) : "N/A")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 md:col-span-2">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dates</p>
                                <p className="text-base font-bold text-gray-900">
                                    {format(new Date(request.startDate), "MMM dd, yyyy")} — {format(new Date(request.endDate), "MMM dd, yyyy")}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Purpose
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        {request.purpose || "No details provided."}
                    </p>
                </CardContent>
            </Card>

            {(preferences?.flight || preferences?.hotel || preferences?.car || preferences?.train || preferences?.other) && (
                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {preferences.flight && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Flight Requirements</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {typeof preferences.flight === 'string' ? (
                                        preferences.flight
                                    ) : (
                                        <div className="space-y-1">
                                            {preferences.flight.from && <p><strong>From:</strong> {preferences.flight.from}</p>}
                                            {preferences.flight.to && <p><strong>To:</strong> {preferences.flight.to}</p>}
                                            {preferences.flight.details && <p><strong>Details:</strong> {preferences.flight.details}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {preferences.hotel && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Hotel Requirements</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.hotel}
                                </div>
                            </div>
                        )}
                        {preferences.train && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Train / Rail Requirements</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {typeof preferences.train === 'string' ? (
                                        preferences.train
                                    ) : (
                                        <div className="space-y-1">
                                            {preferences.train.from && <p><strong>From:</strong> {preferences.train.from}</p>}
                                            {preferences.train.to && <p><strong>To:</strong> {preferences.train.to}</p>}
                                            {preferences.train.details && <p><strong>Details:</strong> {preferences.train.details}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {preferences.car && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Car / Taxi Requirements</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {typeof preferences.car === 'string' ? (
                                        preferences.car
                                    ) : (
                                        <div className="space-y-1">
                                            {preferences.car.pickup && (
                                                <p><strong>Pickup:</strong> {typeof preferences.car.pickup === 'string' ? preferences.car.pickup : (preferences.car.pickup.formatted || preferences.car.pickup.city || 'Custom Location')}</p>
                                            )}
                                            {preferences.car.dropoff && (
                                                <p><strong>Dropoff:</strong> {typeof preferences.car.dropoff === 'string' ? preferences.car.dropoff : (preferences.car.dropoff.formatted || preferences.car.dropoff.city || 'Custom Location')}</p>
                                            )}
                                            {preferences.car.details && <p><strong>Details:</strong> {preferences.car.details}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {preferences.other && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Other Requests</h4>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {typeof preferences.other === 'string' ? preferences.other : JSON.stringify(preferences.other)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
