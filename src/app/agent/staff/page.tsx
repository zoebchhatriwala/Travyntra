import { getAgencyStaff } from "./actions";
import { StaffList } from "./_components/staff-list";
import { Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { UserRole } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

export default async function AgencyStaffPage() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== UserRole.TRAVEL_AGENT) {
        redirect("/agent/dashboard");
    }

    const staff = await getAgencyStaff();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        Agency <span className="text-indigo-600">Staff</span>
                    </h1>
                    <p className="text-gray-500 font-medium">
                        Manage your agency team members and their access permissions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {staff.slice(0, 3).map((member) => (
                            <div key={member.id} className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase overflow-hidden">
                                {member.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={member.avatarUrl} alt={member.name || ""} className="w-full h-full object-cover" />
                                ) : (
                                    member.name ? member.name[0] : member.email?.[0]
                                )}
                            </div>
                        ))}
                        {staff.length > 3 && (
                            <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                                +{staff.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Staff</p>
                        <p className="text-2xl font-black text-gray-900">{staff.length}</p>
                    </div>
                </div>
            </div>

            <StaffList initialStaff={staff} />
        </div>
    );
}
