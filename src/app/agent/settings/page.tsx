import { getAgencySettings } from "./actions";
import { SettingsForm } from "./_components/settings-form";

export default async function AgencySettingsPage() {
    const company = await getAgencySettings();

    if (!company) return <div>Agency Not Found</div>;

    return (
        <div className="min-h-screen bg-[#FAFAFB] animate-in fade-in duration-500">
            <div className="max-w-[1400px] mx-auto p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">Console</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Console / <span className="text-indigo-600 uppercase">Configuration</span>
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Adjust branding, workspace identity, and security parameters.
                        </p>
                    </div>
                </div>

                <SettingsForm company={company} />
            </div>
        </div>
    );
}
