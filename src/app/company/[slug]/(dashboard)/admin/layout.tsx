import { prisma } from "@/lib/prisma";
import { AdminShell } from "./_components/admin-shell";

export default async function CompanyAdminLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Fetch company plan data specifically for the layout's support card
    const company = await prisma.company.findUnique({
        where: { slug },
        select: { plan: true }
    });

    return (
        <AdminShell slug={slug} companyPlan={company?.plan}>
            {children}
        </AdminShell>
    );
}
