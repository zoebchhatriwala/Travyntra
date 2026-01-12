
import { getIntegratedAgencies } from "./actions";
import { AgencySearch } from "./_components/agency-search";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisconnectButton } from "./_components/disconnect-button";

export default async function IntegrationsPage() {
    const integratedAgencies = await getIntegratedAgencies();

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">Travel Partner Network</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Connect with verified travel agencies to fulfill your company&apos;s trip requests.
                    Streamline bookings, billing, and support in one place.
                </p>
            </div>

            {/* Discovery Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 mb-12">
                <div className="max-w-2xl mx-auto text-center space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-gray-900">Find a Partner</h2>
                        <p className="text-gray-500">Search for agencies by name to start an integration request.</p>
                    </div>
                    <AgencySearch />
                </div>
            </div>

            {/* Active Integrations Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Your Active Connections</h2>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                        {integratedAgencies.length} Active
                    </span>
                </div>

                {integratedAgencies.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No agencies connected yet</h3>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                            Start by searching for an agency above. Once connected, they will be able to see and bid on your trip requests.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {integratedAgencies.map((int) => (
                            <Card key={int.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                                            <AvatarImage src={int.agency.logoUrl || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                {int.agency.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            Active
                                        </span>
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {int.agency.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <Building2 size={14} />
                                            {int.agency.country || "Global Partner"}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Since {new Date().getFullYear()}</span>
                                        <DisconnectButton agencyId={int.agency.id} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
