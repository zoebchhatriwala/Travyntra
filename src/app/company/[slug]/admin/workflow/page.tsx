import { WorkflowBuilder } from "./_components/workflow-builder";

export default async function WorkflowPage() {
    // Note: Workflow configurations are currently managed at the tenant level defaults.
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    Logic / <span className="text-indigo-600 uppercase">Workflow</span>
                </h1>
                <p className="text-gray-500 font-medium">
                    Map out the sequence of events from request initiation to final fulfillment.
                </p>
            </div>

            <WorkflowBuilder />
        </div>
    );
}
