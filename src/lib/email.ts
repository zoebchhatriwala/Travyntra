
import { prisma } from "@/lib/prisma";
import { IS_DEVELOPMENT } from "./constants/enviroment";

/**
 * Type definition for the email delivery payload.
 */
type EmailPayload = {
    /** The recipient's email address */
    to: string;
    /** The subject line of the email */
    subject: string;
    /** The HTML content of the email body */
    html: string;
};


import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends a mock email to the console.
 * @param payload - The details of the email to be sent.
 * @returns {Promise<{success: boolean, id?: string, error?: string}>} The result of the email operation.
 */
async function sendMockEmail(payload: EmailPayload) {
    // Destructure properties from the payload
    const { to, subject, html } = payload;

    // Construct a console log message for the mock email
    const logHeader = "📧 [MOCK EMAIL]";
    const logTo = `To: ${to}`;
    const logSubject = `Subject: ${subject}`;
    const logSeparator = "---";
    const emailContent = `${logHeader}\n${logTo}\n${logSubject}\n${logSeparator}\n${html}\n${logSeparator}`;

    // Log the mock email content to the console
    console.log(emailContent);

    // Define the mock result object
    const result = {
        success: true,
        id: "mock-id"
    };

    // Return the mock result
    return result;
}

/**
 * Sends an email using the configured provider.
 * In development, this logs the email to the console.
 * 
 * @param {EmailPayload} payload - The details of the email to be sent.
 * @returns {Promise<{success: boolean, id?: string, error?: string}>} The result of the email operation.
 */
export async function sendEmail(payload: EmailPayload) {
    // Destructure properties from the payload
    const { to, subject, html } = payload;

    // Check if the system is in development mode
    if (IS_DEVELOPMENT) {
        return await sendMockEmail(payload);
    }

    // If resend is not initialized, send a mock email
    if (!resend) {
        return await sendMockEmail(payload);
    }

    // Send the email using Resend
    try {
        const { data, error } = await resend.emails.send({
            from: "Travyntra <notifications@travyntra.chhatriwala.com>",
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("Resend error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Failed to send email via Resend:", error);
        return { success: false, error: "Internal server error" };
    }
}

/**
 * Sends a notification email to a user by their ID.
 * Fetches the user's email from the database.
 * 
 * @param {string} userId - The unique identifier of the user.
 * @param {string} subject - The subject line of the email.
 * @param {string} html - The HTML content of the email body.
 * @returns {Promise<any>} The result of the email operation or false if user not found.
 */
export async function sendUserEmail(userId: string, subject: string, html: string) {
    try {
        // Search for the user in the database by their ID
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                email: true,
                name: true
            }
        });

        // Check if the user exists
        const userExists = !!user;

        // Check if the user has an email address
        const hasEmail = user?.email;

        // If the user is missing or has no email
        if (!userExists || !hasEmail) {
            // Construct an error message
            const errorMsg = `User ${userId} not found or has no email.`;

            // Log the error to the console
            console.error(errorMsg);

            // Return false to indicate failure
            return false;
        }

        // Retrieve the recipient's email address
        const recipientEmail = user.email;

        // Define the parameters for the sendEmail function
        const emailParams = {
            to: recipientEmail,
            subject: subject,
            html: html
        };

        // Execute the email delivery
        const sendResult = await sendEmail(emailParams);

        // Return the result of the email delivery
        return sendResult;
    } catch (error) {
        // Log the exception to the console
        console.error("Failed to send user email:", error);

        // Return false to indicate an exception occurred
        return false;
    }
}
