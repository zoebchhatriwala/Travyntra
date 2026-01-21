
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getOtpEmailTemplate } from "./email-templates";

/**
 * Generates a random 6-digit OTP token.
 * 
 * @returns {string} A 6-digit numeric string.
 */
export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Prepares and sends an OTP verification email to a user.
 * Stores the OTP and its expiry in the database.
 * 
 * @param {string} userId - The unique identifier of the user.
 * @param {string} email - The user's email address.
 * @param {string} userName - The user's name.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function sendOtpVerification(userId: string, email: string, userName: string): Promise<boolean> {
    // Generate a new 6-digit OTP
    const otp = generateOtp();
    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        // Update user record with OTP details
        await prisma.user.update({
            where: { id: userId },
            data: {
                otpToken: otp,
                otpExpiresAt: expiresAt,
            },
        });

        // Generate the email HTML content
        const html = getOtpEmailTemplate(userName, otp);

        // Send the email
        const result = await sendEmail({
            to: email,
            subject: "Verify Your Email - Travyntra",
            html,
        });

        return result.success;
    } catch (error) {
        console.error("Failed to send OTP verification:", error);
        return false;
    }
}

/**
 * Prepares and sends a password reset OTP email to a user.
 * Stores the OTP and its expiry in the database.
 * 
 * @param {string} userId - The unique identifier of the user.
 * @param {string} email - The user's email address.
 * @param {string} userName - The user's name.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function sendPasswordResetOtp(userId: string, email: string, userName: string): Promise<boolean> {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                otpToken: otp,
                otpExpiresAt: expiresAt,
            },
        });

        const { getPasswordResetTemplate } = await import("./email-templates");
        const html = getPasswordResetTemplate(userName, otp);

        const result = await sendEmail({
            to: email,
            subject: "Reset Your Password - Travyntra",
            html,
        });

        return result.success;
    } catch (error) {
        console.error("Failed to send password reset OTP:", error);
        return false;
    }
}
