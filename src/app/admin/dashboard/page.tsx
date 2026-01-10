import { getPendingEntities } from "./actions";
import { PendingList } from "./_components/pending-list";

export const metadata = {
    title: "Super Admin Dashboard | Travyntra",
};

export default async function AdminDashboardPage() {
    const { agents, companies } = await getPendingEntities();

    return (
        <div className="container mx-auto py-10 px-4 space-y-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Super Admin Dashboard</h1>
                <p className="text-xl text-muted-foreground">
                    Manage pending approvals for Travel Agents and Companies.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Pending Travel Agents</h2>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium dark:bg-blue-900 dark:text-blue-200">
                        {agents.length} Requests
                    </div>
                </div>
                <PendingList
                    title="Travel Agents"
                    description="Agents waiting for platform access."
                    users={agents}
                    type="AGENT"
                />
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Pending Companies</h2>
                    <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium dark:bg-purple-900 dark:text-purple-200">
                        {companies.length} Requests
                    </div>
                </div>
                <PendingList
                    title="Companies"
                    description="Companies waiting for admin activation."
                    users={companies}
                    type="COMPANY"
                />
            </div>
        </div>
    );
}
