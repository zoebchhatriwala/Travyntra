
import { prisma } from "@/lib/prisma";

type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Sends an email using the configured provider.
 * In development, this logs the email to the console.
 */
export async function sendEmail({ to, subject, html }: EmailPayload) {
    if (IS_DEV) {
        console.log(`
      📧 [MOCK EMAIL] 
      To: ${to}
      Subject: ${subject}
      ---
      ${html}
      ---
    `);
        return { success: true, id: "mock-id" };
    }

    // TODO: Integrate actual email provider (e.g., Resend, SendGrid)
    // if (!process.env.RESEND_API_KEY) {
    //   console.warn("RESEND_API_KEY is not set. Email not sent.");
    //   return { success: false, error: "Missing API Key" };
    // }

    // const resend = new Resend(process.env.RESEND_API_KEY);
    // return await resend.emails.send({ ... });

    console.warn("Email sending not implemented for production yet.");
    return { success: false, error: "Not implemented" };
}

/**
 * Sends a notification email to a user by their ID.
 * Fetches the user's email from the database.
 */
export async function sendUserEmail(userId: string, subject: string, html: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true }
        });

        if (!user || !user.email) {
            console.error(`User ${userId} not found or has no email.`);
            return false;
        }

        return await sendEmail({
            to: user.email,
            subject,
            html
        });
    } catch (error) {
        console.error("Failed to send user email:", error);
        return false;
    }
}
