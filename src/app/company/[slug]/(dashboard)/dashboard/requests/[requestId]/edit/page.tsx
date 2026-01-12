import { prisma } from "@/lib/prisma";
import { getTripRequest } from "../../../actions";
import { notFound } from "next/navigation";
import { RequestForm } from "../../new/_components/request-form";

export default async function EditRequestPage({
    params,
}: {
    params: Promise<{ slug: string; requestId: string }>;
}) {
    const { slug, requestId } = await params;

    const request = await getTripRequest(requestId);

    if (!request) {
        return notFound();
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { currency: true }
    });

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight">Edit Trip Request</h1>
                <p className="text-lg text-gray-500 mt-3 leading-relaxed">
                    Update the details for your travel request. Changes may require re-approval if significantly modified.
                </p>
            </div>

            <RequestForm
                slug={slug}
                currency={company?.currency || "USD"}
                initialData={request as any}
                requestId={requestId}
            />
        </div>
    );
}
