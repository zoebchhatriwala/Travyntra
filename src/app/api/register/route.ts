import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(["EMPLOYEE", "COMPANY_ADMIN"]).optional(), // Basic self-registration
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, role } = userSchema.parse(body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: (role as any) || "EMPLOYEE",
                isActive: false,
            },
        });

        return NextResponse.json(
            { user: { id: user.id, email: user.email, name: user.name } },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Invalid input", errors: (error as any).errors }, { status: 400 });
        }
        console.error("Registration validation error:", error);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}
