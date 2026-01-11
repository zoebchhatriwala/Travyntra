import { RequestForm } from "./_components/request-form";
import { prisma } from "@/lib/prisma";
import { getCompanyGroupTrips } from "../../actions";

export default async function NewRequestPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const [company, groupTrips] = await Promise.all([
        prisma.company.findUnique({
            where: { slug },
            select: { currency: true }
        }),
        getCompanyGroupTrips()
    ]);

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight">New Trip Request</h1>
                <p className="text-lg text-gray-500 mt-3 leading-relaxed">
                    Planning a business trip? Fill out the details below to initiate the approval process.
                    Your request will be routed to your manager automatically.
                </p>
            </div>

            <RequestForm
                slug={slug}
                currency={company?.currency || "USD"}
                groupTrips={groupTrips as any}
            />
        </div>
    );
}

