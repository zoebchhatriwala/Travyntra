import { getMyPendingApprovals } from "@/lib/actions/approvals";
import { ApprovalsClient } from "./_components/approvals-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
    title: "My Approvals | Travyntra",
    description: "Manage your pending approval requests"
};

export default async function ApprovalsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/signin");
    }

    const pendingApprovals = await getMyPendingApprovals();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        My Approvals
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Review and process travel requests awaiting your approval
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                {pendingApprovals.length}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</p>
                                <p className="text-2xl font-black text-gray-900">{pendingApprovals.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                ✓
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Approved Today</p>
                                <p className="text-2xl font-black text-gray-900">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                ⏱
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg Response Time</p>
                                <p className="text-2xl font-black text-gray-900">2h</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Approvals List */}
                <ApprovalsClient initialApprovals={pendingApprovals} />
            </div>
        </div>
    );
}
