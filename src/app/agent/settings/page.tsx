import { getAgencySettings } from "./actions";
import { SettingsForm } from "./_components/settings-form";

export default async function AgencySettingsPage() {
    const company = await getAgencySettings();

    if (!company) return <div>Agency Not Found</div>;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Console / <span className="text-indigo-600 uppercase">Configuration</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Adjust branding, workspace identity, and security parameters.
                </p>
            </div>

            <SettingsForm company={company} />
        </div>
    );
}
