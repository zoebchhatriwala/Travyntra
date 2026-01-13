
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

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

        // Handle company-type registration
        if (registrationTypeValue === "COMPANY") {
            // identify if company name is missing
            const isCompanyNameMissing = !companyNameValue;

            // Ensure a company name was provided
            if (isCompanyNameMissing) {
                // Define the bad request body
                const missingCompanyBody = {
                    message: "Company name is required for company registration"
                };
                // define response options
                const badRequestOptions = {
                    status: 400
                };
                // Return a 400 Bad Request response
                return NextResponse.json(missingCompanyBody, badRequestOptions);
            }

            // Convert company name for slug generation
            const slugBaseInput = companyNameValue.toLowerCase();
            // Create a URL-friendly slug from the company name
            const baseSlugString = slugBaseInput.replace(/ /g, "-").replace(/[^\w-]+/g, "");

            // Generate a random string segment for uniqueness
            const randomStringSegment = Math.random().toString(36).substring(2, 7);
            // Construct the final unique slug
            const uniqueCompanySlug = `${baseSlugString}-${randomStringSegment}`;

            // Create the new company record in the database
            const createdCompanyRecord = await prisma.company.create({
                data: {
                    name: companyNameValue,
                    slug: uniqueCompanySlug,
                },
            });

            // Retrieve the ID of the new company
            const newCompanyId = createdCompanyRecord.id;

            // Create the initial administrator user for the company
            const createdAdminUser = await prisma.user.create({
                data: {
                    email: emailValue,
                    name: nameValue,
                    password: hashedPasswordResult,
                    role: UserRole.COMPANY_ADMIN,
                    companyId: newCompanyId,
                    isActive: false, // Requires activation by platform owner
                },
            });

            // Define parameters for the user welcome notification
            const userWelcomeNotification = {
                userId: createdAdminUser.id,
                title: "Welcome to Travyntra",
                message: "Your registration as a Company Admin is successful. Your account is currently pending approval by the platform administrators.",
                type: "INFO" as const
            };
            // Send the notification to the new user
            await createNotification(userWelcomeNotification);

            // Fetch the list of super admins
            const superAdminsList = await prisma.user.findMany(superAdminQuery);

            // Iterate and notify each super admin
            for (const adminRecord of superAdminsList) {
                // Construct the notification message
                const adminUpdateMessage = `A new company "${companyNameValue}" has been registered by ${nameValue} (${emailValue}).`;

                // Define the notification data
                const adminNotificationData = {
                    userId: adminRecord.id,
                    title: "New Company Registration",
                    message: adminUpdateMessage,
                    type: "WARNING" as const,
                    link: "/admin/companies"
                };
                // Send the notification
                await createNotification(adminNotificationData);
            }

            // Define the success response payload
            const successResponseBody = {
                user: {
                    id: createdAdminUser.id,
                    email: createdAdminUser.email,
                    company: createdCompanyRecord.name
                }
            };
            // Define response options
            const successResponseOptions = {
                status: 201
            };
            // Return a 201 Created response
            return NextResponse.json(successResponseBody, successResponseOptions);
        } else {
            // Handle Agency-type registration

            // Create the agent user record
            const createdAgentUser = await prisma.user.create({
                data: {
                    email: emailValue,
                    name: nameValue,
                    password: hashedPasswordResult,
                    role: UserRole.TRAVEL_AGENT,
                    isActive: false, // Agents must be manually vetted and activated
                },
            });

            // Define parameters for the agent welcome notification
            const agentWelcomeNotification = {
                userId: createdAgentUser.id,
                title: "Welcome to Travyntra",
                message: "Your registration as an Agency is successful. Your account is currently pending manual vetting and activation.",
                type: "INFO" as const
            };
            // Send the notification to the agent
            await createNotification(agentWelcomeNotification);

            // Fetch the list of super admins
            const adminsToNotify = await prisma.user.findMany(superAdminQuery);

            // Iterate and notify each super admin
            for (const adminToNotifyRecord of adminsToNotify) {
                // Construct the notification message
                const agencyRegisterMessage = `A new agency ${nameValue} (${emailValue}) has registered.`;

                // Define the notification data
                const agencyNotificationData = {
                    userId: adminToNotifyRecord.id,
                    title: "New Agency Registration",
                    message: agencyRegisterMessage,
                    type: "WARNING" as const,
                    link: "/admin/agents"
                };
                // Send the notification
                await createNotification(agencyNotificationData);
            }

            // Define the agent success response payload
            const agentSuccessBody = {
                user: {
                    id: createdAgentUser.id,
                    email: createdAgentUser.email,
                    role: "AGENT"
                }
            };
            // Define response options
            const agentSuccessOptions = {
                status: 201
            };
            // Return a 201 Created response
            return NextResponse.json(agentSuccessBody, agentSuccessOptions);
        }
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
