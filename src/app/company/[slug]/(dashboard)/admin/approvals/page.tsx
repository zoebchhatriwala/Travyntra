import { getMyPendingApprovals } from "@/lib/actions/approvals";
import { ApprovalsClient } from "../../dashboard/approvals/_components/approvals-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const metadata = {
    title: "My Approvals | Admin Console",
    description: "Manage travel requests awaiting your approval"
};

export default async function AdminApprovalsPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    await params;
    const session = await getServerSession(authOptions);


    if (!session?.user) {
        redirect("/login");
    }

    const pendingApprovals = await getMyPendingApprovals();

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    My Approvals
                </h1>
                <p className="text-gray-500 font-medium">
                    Review and process travel requests that require your authorization.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm ring-1 ring-gray-100/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <span className="text-2xl font-black">{pendingApprovals.length}</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Items Seeking Approval</p>
                            <p className="text-xl font-bold text-gray-900">Pending Action</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm ring-1 ring-gray-100/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                            <span className="text-2xl font-black">✓</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Approvals Completed</p>
                            <p className="text-xl font-bold text-gray-900">Lifetime Flow</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm ring-1 ring-gray-100/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                            <span className="text-2xl font-black">⏱</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Efficiency Metrics</p>
                            <p className="text-xl font-bold text-gray-900">Fast Resolution</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approvals List */}
            <div className="max-w-5xl mx-auto">
                <ApprovalsClient initialApprovals={pendingApprovals} />
            </div>
        </div>
    );
}
