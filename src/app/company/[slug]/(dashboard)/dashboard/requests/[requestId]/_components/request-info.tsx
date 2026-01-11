import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Calendar, MapPin, DollarSign, FileText, Building2 } from "lucide-react";
import { format } from "date-fns";

export function RequestInfo({ request, currency }: { request: any, currency: string }) {
    const preferences = request.preferences as any;

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
                                <p className="text-base font-bold text-gray-900">{request.destination}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Est. Budget</p>
                                <p className="text-base font-bold text-gray-900">
                                    {currency} {Number(request.budget || 0).toLocaleString()}
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
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.flight}
                                </p>
                            </div>
                        )}
                        {preferences.hotel && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Hotel Requirements</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.hotel}
                                </p>
                            </div>
                        )}
                        {preferences.train && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Train / Rail Requirements</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.train}
                                </p>
                            </div>
                        )}
                        {preferences.car && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Car / Taxi Requirements</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.car}
                                </p>
                            </div>
                        )}
                        {preferences.other && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Other Requests</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {preferences.other}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
