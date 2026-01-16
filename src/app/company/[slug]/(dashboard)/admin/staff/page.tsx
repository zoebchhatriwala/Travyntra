import Image from "next/image";
import { getCompanyStaff } from "./actions";
import { StaffList } from "./_components/staff-list";
import { Users2, ShieldCheck } from "lucide-react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Staff Directory | Travyntra",
        description: "Manage company staff, roles, and permissions."
    };
}

export default async function StaffManagementPage({
    params
}: {
    params: { slug: string }
}) {
    const { slug } = await params;
    const staff = await getCompanyStaff(slug);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        Directory / <span className="text-indigo-600 uppercase">Staff</span>
                    </h1>
                    <p className="text-gray-500 font-medium">
                        Verify new registrations, manage permissions, and oversee your company directory.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {staff.slice(0, 3).map((member) => (
                            <div key={member.id} className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase overflow-hidden">
                                {member.avatarUrl ? (
                                    <Image src={member.avatarUrl} alt={member.name || ""} width={40} height={40} className="w-full h-full object-cover" />
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
                <div className="p-6 bg-white rounded-corner-xl shadow-sm ring-1 ring-gray-100 flex items-center gap-4 group hover:ring-indigo-100 transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-corner-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Users2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Directory</p>
                        <p className="text-2xl font-black text-gray-900">{staff.length} Members</p>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-corner-xl shadow-sm ring-1 ring-gray-100 flex items-center gap-4 group hover:ring-indigo-100 transition-all">
                    <div className="w-12 h-12 bg-emerald-50 rounded-corner-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Seats</p>
                        <p className="text-2xl font-black text-gray-900">{staff.filter(s => s.isActive && !s.isBlocked).length} Verified</p>
                    </div>
                </div>
                <div className="p-6 bg-indigo-600 rounded-corner-xl shadow-lg shadow-indigo-100 flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white/10 rounded-corner-lg flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Security Protocol</p>
                        <p className="text-2xl font-black italic">JOY-ENABLED</p>
                    </div>
                </div>
            </div>

            <StaffList initialStaff={staff} slug={slug} />
        </div>
    );
}
