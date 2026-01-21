
"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});

/**
 * Verifies the OTP provided by the user.
 * If valid, updates the user's emailVerifiedAt timestamp.
 * 
 * @param {z.infer<typeof verifyOtpSchema>} data - The email and OTP to verify.
 * @returns {Promise<{success: boolean, error?: string}>} The result of the verification.
 */
export async function verifyOtp(data: z.infer<typeof verifyOtpSchema>) {
    try {
        const { email, otp } = verifyOtpSchema.parse(data);

        // Find the user with the provided email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // Check if OTP matches and has not expired
        if (!user.otpToken || user.otpToken !== otp) {
            return { success: false, error: "Invalid OTP" };
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return { success: false, error: "OTP has expired" };
        }

        // Determine if the account should be activated upon verification.
        // ENTERPRISE employees and agency staff require manual approval by their admins.
        // SUPER_ADMIN and TRAVEL_AGENT (main agency owner) can be auto-activated.
        const shouldAutoActivate = [
            "SUPER_ADMIN",
            "TRAVEL_AGENT"
        ].includes(user.role);

        // Update user: clear OTP, set emailVerifiedAt, and conditionally activate
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otpToken: null,
                otpExpiresAt: null,
                emailVerifiedAt: new Date(),
                isActive: shouldAutoActivate ? true : user.isActive,
            },
        });

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Invalid input" };
        }
        console.error("OTP verification error:", error);
        return { success: false, error: "Internal server error" };
    }
}


import { hash } from "bcryptjs";
import { sendOtpVerification, sendPasswordResetOtp } from "@/lib/auth-utils";

/**
 * Initiates the password reset process by sending an OTP.
 * 
 * @param {string} email - The user's email address.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function requestPasswordReset(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            // Releasing a generic success message even if user not found to prevent email enumeration
            return { success: true };
        }

        const sent = await sendPasswordResetOtp(user.id, user.email, user.name || "User");

        if (!sent) {
            return { success: false, error: "Failed to send reset email" };
        }

        return { success: true };
    } catch (error) {
        console.error("Request password reset error:", error);
        return { success: false, error: "Internal server error" };
    }
}

const resetPasswordSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    password: z.string().min(6),
});

/**
 * Resets the user's password using the provided OTP.
 * 
 * @param {z.infer<typeof resetPasswordSchema>} data - The verification and new password data.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetPassword(data: z.infer<typeof resetPasswordSchema>) {
    try {
        const { email, otp, password } = resetPasswordSchema.parse(data);

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        if (!user.otpToken || user.otpToken !== otp) {
            return { success: false, error: "Invalid OTP" };
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return { success: false, error: "OTP has expired" };
        }

        const hashedPassword = await hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otpToken: null,
                otpExpiresAt: null,
                // Ensure account is activated if it was pending
                isActive: true,
            },
        });

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Invalid input" };
        }
        console.error("Reset password error:", error);
        return { success: false, error: "Internal server error" };
    }
}

/**
 * Resends a new OTP to the user's email.
 * 
 * @param {string} email - The user's email address.
 * @returns {Promise<{success: boolean, error?: string}>} The result of the resend operation.
 */
export async function resendOtp(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const sent = await sendOtpVerification(user.id, user.email, user.name || "User");

        if (!sent) {
            return { success: false, error: "Failed to send email" };
        }

        return { success: true };
    } catch (error) {
        console.error("Resend OTP error:", error);
        return { success: false, error: "Internal server error" };
    }
}
