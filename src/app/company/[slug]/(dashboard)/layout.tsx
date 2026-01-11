import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function CompanyLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const session = await getServerSession(authOptions);
    const { slug } = await params;

    if (!session) {
        redirect("/login");
    }

    // Security: Ensure user belongs to this company
    if (session.user.companySlug !== slug && session.user.role !== "SUPER_ADMIN") {
        redirect("/");
    }

    const company = await prisma.company.findUnique({
        where: { slug },
        select: { name: true, logoUrl: true, type: true, plan: true }
    });

    if (!company) {
        redirect("/404");
    }

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            {children}
        </div>
    );
}
