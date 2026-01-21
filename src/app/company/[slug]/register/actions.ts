"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const employeeRegistrationSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    name: z.string().min(1),
    slug: z.string(),
});

export async function registerEmployee(formData: z.infer<typeof employeeRegistrationSchema>) {
    try {
        const { email, password, name, slug } = employeeRegistrationSchema.parse(formData);

        // 1. Verify company exists
        const company = await prisma.company.findUnique({
            where: { slug }
        });

        if (!company) {
            return { success: false, error: "Company not found" };
        }

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { success: false, error: "An account with this email already exists" };
        }

        // 3. Hash password
        const hashedPassword = await hash(password, 10);

        // 4. Create user
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: UserRole.EMPLOYEE,
                companyId: company.id,
                isActive: false, // Requires company admin approval
            }
        });

        // 5. Send OTP verification
        const { sendOtpVerification } = await import("@/lib/auth-utils");
        await sendOtpVerification(user.id, user.email, user.name || "User");

        // 6. Notify the new user
        await createNotification({
            userId: user.id,
            title: "Welcome to " + company.name,
            message: "Your registration is successful. Please verify your email with the OTP sent to you. Your account is currently pending approval by your company administrator.",
            type: "INFO"
        });

        // 6. Notify Company Admins
        const admins = await prisma.user.findMany({
            where: {
                companyId: company.id,
                role: UserRole.COMPANY_ADMIN
            },
            select: { id: true }
        });

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                title: "New Employee Signup",
                message: `${name} (${email}) has registered and is waiting for approval.`,
                type: "WARNING",
                link: `/company/${slug}/admin/staff`
            });
        }

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Invalid input data" };
        }
        console.error("Employee registration error:", error);
        return { success: false, error: "Internal server error" };
    }
}
