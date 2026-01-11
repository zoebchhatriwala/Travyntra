"use client";

import {
    Activity,
    CheckCircle2,
    XCircle,
    UserPlus,
    FileText,
    Settings,
    ShieldAlert,
    Clock,
    Filter
} from "lucide-react";
import { format, subHours, subDays } from "date-fns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock Data for Activity Log
const ACTIVITIES = [
    {
        id: "1",
        type: "TRIP_APPROVED",
        description: "Trip to London approved by Sarah Manager",
        user: "Alex Employee",
        timestamp: subHours(new Date(), 2),
        icon: CheckCircle2,
        color: "text-emerald-600 bg-emerald-50",
        meta: "Trip #TR-8821"
    },
    {
        id: "2",
        type: "USER_REGISTERED",
        description: "New staff member registered",
        user: "John Newbie",
        timestamp: subHours(new Date(), 5),
        icon: UserPlus,
        color: "text-indigo-600 bg-indigo-50",
        meta: "Pending Approval"
    },
    {
        id: "3",
        type: "POLICY_UPDATE",
        description: "Updated travel allowance policy",
        user: "Admin User",
        timestamp: subDays(new Date(), 1),
        icon: ShieldAlert,
        color: "text-amber-600 bg-amber-50",
        meta: "Global Policy"
    },
    {
        id: "4",
        type: "TRIP_REJECTED",
        description: "Trip to Las Vegas rejected",
        user: "Sarah Manager",
        timestamp: subDays(new Date(), 2),
        icon: XCircle,
        color: "text-rose-600 bg-rose-50",
        meta: "Over Budget"
    },
    {
        id: "5",
        type: "INVOICE_PAID",
        description: "Monthly travel invoice settled",
        user: "Finance Team",
        timestamp: subDays(new Date(), 3),
        icon: FileText,
        color: "text-blue-600 bg-blue-50",
        meta: "$4,500.00"
    },
    {
        id: "6",
        type: "SETTINGS_CHANGE",
        description: "Changed default currency to USD",
        user: "Admin User",
        timestamp: subDays(new Date(), 4),
        icon: Settings,
        color: "text-gray-600 bg-gray-50",
        meta: "System Settings"
    }
];

export default function ActivityLogPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-600" size={32} />
                        Activity Log
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Comprehensive audit trail of all company events and actions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 font-bold text-gray-600">
                        <Filter size={16} className="mr-2" />
                        Filter
                    </Button>
                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 font-bold text-gray-600">
                        <Clock size={16} className="mr-2" />
                        Last 30 Days
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-indigo-100/20 rounded-[32px] overflow-hidden bg-white ring-1 ring-gray-100">
                <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-black text-gray-900 uppercase tracking-widest">Recent Events</CardTitle>
                        <Badge variant="secondary" className="bg-white text-gray-500 border border-gray-100 font-mono text-xs">
                            {ACTIVITIES.length} Events
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                        {ACTIVITIES.map((activity) => (
                            <div key={activity.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6 group">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${activity.color}`}>
                                    <activity.icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-black text-gray-900 truncate">
                                            {activity.description}
                                        </p>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                                            {format(activity.timestamp, "MMM dd, HH:mm")}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                        by <span className="font-bold text-gray-700">{activity.user}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="italic">{activity.meta}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {ACTIVITIES.length === 0 && (
                        <div className="p-20 text-center text-gray-400">
                            <p className="text-sm font-bold">No activity recorded yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
