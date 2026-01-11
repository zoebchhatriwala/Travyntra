import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const registrationSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    type: z.enum(["COMPANY", "AGENT"]),
    companyName: z.string().min(2).optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = registrationSchema.parse(body);
        const { email, password, name, type, companyName } = validatedData;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await hash(password, 10);

        if (type === "COMPANY") {
            if (!companyName) {
                return NextResponse.json(
                    { message: "Company name is required for company registration" },
                    { status: 400 }
                );
            }

            // Create Company first
            const slug = companyName.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
            const newCompany = await prisma.company.create({
                data: {
                    name: companyName,
                    slug: `${slug}-${Math.random().toString(36).substring(2, 7)}`,
                },
            });

            // Create Admin User for that company
            const user = await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role: UserRole.COMPANY_ADMIN,
                    companyId: newCompany.id,
                    isActive: false, // Requires activation by platform owner
                },
            });

            // Notify the new user
            await createNotification({
                userId: user.id,
                title: "Welcome to Travyntra",
                message: "Your registration as a Company Admin is successful. Your account is currently pending approval by the platform administrators.",
                type: "INFO"
            });

            // Notify Super Admins
            const superAdmins = await prisma.user.findMany({
                where: { role: UserRole.SUPER_ADMIN },
                select: { id: true }
            });

            for (const admin of superAdmins) {
                await createNotification({
                    userId: admin.id,
                    title: "New Company Registration",
                    message: `A new company "${companyName}" has been registered by ${name} (${email}).`,
                    type: "WARNING",
                    link: "/admin/companies"
                });
            }

            return NextResponse.json(
                { user: { id: user.id, email: user.email, company: newCompany.name } },
                { status: 201 }
            );
        } else {
            // Registering as an Agent
            const user = await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role: UserRole.TRAVEL_AGENT,
                    isActive: false, // Agents must be manually vetted and activated
                },
            });

            // Notify the new user
            await createNotification({
                userId: user.id,
                title: "Welcome to Travyntra",
                message: "Your registration as a Travel Agent is successful. Your account is currently pending manual vetting and activation.",
                type: "INFO"
            });

            // Notify Super Admins
            const superAdmins = await prisma.user.findMany({
                where: { role: UserRole.SUPER_ADMIN },
                select: { id: true }
            });

            for (const admin of superAdmins) {
                await createNotification({
                    userId: admin.id,
                    title: "New Agent Registration",
                    message: `A new travel agent ${name} (${email}) has registered.`,
                    type: "WARNING",
                    link: "/admin/agents"
                });
            }

            return NextResponse.json(
                { user: { id: user.id, email: user.email, role: "AGENT" } },
                { status: 201 }
            );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Invalid input", errors: error }, { status: 400 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
