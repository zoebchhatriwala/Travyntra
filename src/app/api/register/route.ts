
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole, CompanyType, SubscriptionPlan } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { sendOtpVerification } from "@/lib/auth-utils";

/**
 * Zod schema for validating user registration requests.
 */
const registrationSchema = z.object({
    /** The user's email address */
    email: z.string().email(),
    /** The user's password (minimum 6 characters) */
    password: z.string().min(6),
    /** The user's full name */
    name: z.string().min(1),
    /** The type of entity being registered (COMPANY or AGENT) */
    type: z.enum(["COMPANY", "AGENT"]),
    /** The name of the company (required if type is COMPANY) */
    companyName: z.string().min(2).optional(),
});

/**
 * Handles the POST request for user registration.
 * Creates a new user (and company if applicable) and initiates notification workflows.
 * 
 * @param {Request} req - The incoming HTTP request object.
 * @returns {Promise<NextResponse>} A JSON response indicating the outcome of the registration.
 */
export async function POST(req: Request): Promise<NextResponse> {
    try {
        // Parse the JSON request body
        const rawBody = await req.json();

        // Validate the request body against the registration schema
        const validatedDataResults = registrationSchema.parse(rawBody);

        // Extract validated data fields
        const emailValue = validatedDataResults.email;
        const passwordValue = validatedDataResults.password;
        const nameValue = validatedDataResults.name;
        const registrationTypeValue = validatedDataResults.type;
        const companyNameValue = validatedDataResults.companyName;

        // Configuration for checking existing user
        const existingUserQuery = {
            where: {
                email: emailValue
            }
        };
        // Check for an existing user with the same email
        const existingUserRecord = await prisma.user.findUnique(existingUserQuery);

        // If a user with the same email is found
        if (existingUserRecord) {
            // Define the conflict error response body
            const conflictErrorBody = {
                message: "An account with this email already exists"
            };
            // Define response options
            const conflictResponseOptions = {
                status: 409
            };
            // Return a 409 Conflict response
            return NextResponse.json(conflictErrorBody, conflictResponseOptions);
        }

        // Define the number of salt rounds for hashing
        const saltRoundsCount = 10;
        // Hash the provided password
        const hashedPasswordResult = await hash(passwordValue, saltRoundsCount);

        /**
         * Common search criteria for super admins.
         */
        const superAdminQuery = {
            where: {
                role: UserRole.SUPER_ADMIN
            },
            select: {
                id: true
            }
        };

        // Create the company/agency record
        // For Agents, use their name as the company name if not provided
        const isAgencyType = registrationTypeValue === "AGENT";
        const effectiveCompanyName = companyNameValue || (isAgencyType ? `${nameValue}'s Agency` : nameValue);

        // Convert company name for slug generation
        const slugBaseInput = effectiveCompanyName.toLowerCase();
        // Create a URL-friendly slug from the company name
        const baseSlugString = slugBaseInput.replace(/ /g, "-").replace(/[^\w-]+/g, "");

        // Generate a random string segment for uniqueness
        const randomStringSegment = Math.random().toString(36).substring(2, 7);
        // Construct the final unique slug
        const uniqueCompanySlug = `${baseSlugString}-${randomStringSegment}`;

        // Create the new company record in the database
        const createdCompanyRecord = await prisma.company.create({
            data: {
                name: effectiveCompanyName,
                slug: uniqueCompanySlug,
                type: isAgencyType ? CompanyType.AGENT : CompanyType.ENTERPRISE,
                plan: SubscriptionPlan.FREE,
                subscriptionExpiresAt: isAgencyType ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial for companies
            },
        });

        // Determine the user role based on registration type
        const userRole = registrationTypeValue === "COMPANY" ? UserRole.COMPANY_ADMIN : UserRole.TRAVEL_AGENT;

        // Create the initial administrator user
        const createdUser = await prisma.user.create({
            data: {
                email: emailValue,
                name: nameValue,
                password: hashedPasswordResult,
                role: userRole,
                companyId: createdCompanyRecord.id,
                isActive: false, // Requires email verification (and potentially manual approval)
            },
        });

        // Send OTP verification email
        await sendOtpVerification(createdUser.id, createdUser.email, createdUser.name || "User");

        // Define parameters for the welcome notification
        const welcomeNotification = {
            userId: createdUser.id,
            title: "Welcome to Travyntra",
            message: `Your registration as a ${registrationTypeValue === "COMPANY" ? "Company Admin" : "Agency"} is successful. Please verify your email with the OTP sent to you. Your account is currently pending activation.`,
            type: "INFO" as const
        };
        // Send the notification to the new user
        await createNotification(welcomeNotification);

        // Fetch the list of super admins
        const superAdminsList = await prisma.user.findMany(superAdminQuery);

        // Iterate and notify each super admin
        for (const adminRecord of superAdminsList) {
            // Construct the notification message
            const adminUpdateMessage = `A new ${registrationTypeValue.toLowerCase()} "${effectiveCompanyName}" has been registered by ${nameValue} (${emailValue}).`;

            // Define the notification data
            const adminNotificationData = {
                userId: adminRecord.id,
                title: `New ${registrationTypeValue} Registration`,
                message: adminUpdateMessage,
                type: "WARNING" as const,
                link: registrationTypeValue === "COMPANY" ? "/admin/companies" : "/admin/agents"
            };
            // Send the notification
            await createNotification(adminNotificationData);
        }

        // Define the success response payload
        const successResponseBody = {
            user: {
                id: createdUser.id,
                email: createdUser.email,
                company: createdCompanyRecord.name,
                role: createdUser.role
            }
        };

        return NextResponse.json(successResponseBody, { status: 201 });
    } catch (error) {
        // identify if the error is a Zod validation error
        const isZodError = error instanceof z.ZodError;

        // Handle validation errors
        if (isZodError) {
            // Construct the failure body
            const failureBody = {
                message: "Invalid input",
                errors: error
            };
            // Define options
            const failureOptions = {
                status: 400
            };
            // Return a 400 Bad Request response with details
            return NextResponse.json(failureBody, failureOptions);
        }

        // define label for console logging
        const registrationErrorLabel = "Registration error:";
        // Log the error
        console.error(registrationErrorLabel, error);

        // Construct the internal error body
        const internalErrorBody = {
            message: "Internal server error"
        };
        // Define options
        const internalErrorOptions = {
            status: 500
        };
        // Return a 500 Internal Server Error response
        return NextResponse.json(internalErrorBody, internalErrorOptions);
    }
}
