
import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Module augmentation for NextAuth to include custom user properties in the User, Session, and JWT objects.
 */
declare module "next-auth" {
    interface User {
        /** The unique identifier for the user */
        id: string;
        /** The role assigned to the user */
        role: UserRole;
        /** The ID of the company the user belongs to */
        companyId?: string | null;
        /** The type/category of the company */
        companyType?: string | null;
        /** The unique URL slug for the company */
        companySlug?: string | null;
        /** The URL of the user's profile image */
        image?: string | null;
    }
    interface Session {
        /** The user profile stored in the session */
        user: {
            /** The unique identifier for the user */
            id: string;
            /** The role assigned to the user */
            role: UserRole;
            /** The ID of the company the user belongs to */
            companyId?: string | null;
            /** The type/category of the company */
            companyType?: string | null;
            /** The unique URL slug for the company */
            companySlug?: string | null;
            /** The URL of the user's profile image */
            image?: string | null;
        } & DefaultSession["user"]
    }
}

/**
 * Module augmentation for NextAuth JWT to include custom user properties.
 */
declare module "next-auth/jwt" {
    interface JWT {
        /** The unique identifier for the user */
        id: string;
        /** The role assigned to the user */
        role: UserRole;
        /** The ID of the company the user belongs to */
        companyId?: string | null;
        /** The type/category of the company */
        companyType?: string | null;
        /** The unique URL slug for the company */
        companySlug?: string | null;
        /** The URL of the user's profile image */
        picture?: string | null;
    }
}

/**
 * Factory function to create NextAuth configuration with injectable dependencies.
 * This allows for dependency injection during testing while maintaining production behavior.
 * 
 * @param prisma - Optional Prisma client instance. Defaults to the production prisma client.
 * @param nodeEnv - Optional Node environment string. Defaults to process.env.NODE_ENV.
 * @returns NextAuth configuration object
 */
export const createAuthOptions = (
    prisma: PrismaClient = defaultPrisma,
    nodeEnv: string = process.env.NODE_ENV || 'development'
): NextAuthOptions => ({
    // Secret key for securing the session tokens
    secret: process.env.NEXTAUTH_SECRET || "travyntrasecretproject2026version",

    // Session strategy configuration
    session: {
        // Use JSON Web Tokens for session management
        strategy: "jwt",
    },

    // Authentication providers configuration
    providers: [
        // Development-only provider for quick user switching (impersonation)
        CredentialsProvider({
            // Unique identifier for the dev login provider
            id: "dev-login",
            // Display name for the dev login provider
            name: "Dev Login",
            // Credential fields required for dev login
            credentials: {
                email: { label: "Email", type: "email" },
            },
            /**
             * Authorization logic for development-mode impersonation.
             * 
             * @param {Record<string, string> | undefined} credentials - The email provided for impersonation.
             * @returns {Promise<NextAuthUser | null>} The impersonated user object or null if unauthorized.
             */
            async authorize(credentials) {
                // Determine if the current environment is development
                const isDev = nodeEnv === 'development';

                // Block impersonation if not in development mode
                if (!isDev) {
                    // Log the rejection message
                    const rejectionMsg = "[DEV_AUTH] Impersonation rejected: Not in development mode";
                    console.error(rejectionMsg);
                    return null;
                }

                // Ensure an email was provided in the credentials
                const providedEmail = credentials?.email;
                if (!providedEmail) {
                    // Log the missing email error
                    const missingEmailMsg = "[DEV_AUTH] Missing email in credentials";
                    console.error(missingEmailMsg);
                    return null;
                }

                try {
                    // Search for the user in the database including company details
                    const user = await prisma.user.findUnique({
                        where: {
                            email: providedEmail
                        },
                        include: {
                            company: true
                        }
                    });

                    // Check if the user exists
                    if (!user) {
                        // Log the user not found error
                        const userNotFoundMsg = `[DEV_AUTH] User not found during impersonation: ${providedEmail}`;
                        console.error(userNotFoundMsg);
                        return null;
                    }

                    // Log the successful impersonation
                    const successMsg = `[DEV_AUTH] Impersonation successful for: ${user.email}`;
                    console.log(successMsg);

                    // Construct and return the impersonated user profile
                    const impersonatedUserResult = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        companyId: user.companyId,
                        companyType: user.company?.type,
                        companySlug: user.company?.slug,
                        image: user.avatarUrl
                    };

                    return impersonatedUserResult;
                } catch (error) {
                    // Log any database errors encountered
                    const dbErrorMsg = "[DEV_AUTH] Database error during impersonation:";
                    console.error(dbErrorMsg, error);
                    return null;
                }
            },
        }),
        // Standard credentials-based authentication provider
        CredentialsProvider({
            // Display name for the credentials provider
            name: "normal-login",
            id: "normal-login",
            // Credential fields required for standard login
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            /**
             * Standard authorization logic using email and password.
             * 
             * @param {Record<string, string> | undefined} credentials - User-provided login credentials.
             * @returns {Promise<NextAuthUser | null>} The authenticated user object or null if verification fails.
             */
            async authorize(credentials) {
                // Ensure both email and password were provided
                const rawEmail = credentials?.email;
                const rawPassword = credentials?.password;

                if (!rawEmail) {
                    return null;
                }

                if (!rawPassword) {
                    return null;
                }

                // Sanitize the email address
                const sanitizedEmail = rawEmail.toLowerCase();
                const trimmedEmail = sanitizedEmail.trim();

                // Retrieve the user record from the database
                const user = await prisma.user.findUnique({
                    where: {
                        email: trimmedEmail
                    },
                    include: {
                        company: true
                    }
                });

                // Verify user existence, password availability, and active status
                const userExists = !!user;
                if (!userExists) {
                    return null;
                }

                const hasPassword = !!user?.password;
                if (!hasPassword) {
                    return null;
                }

                const isActiveAccount = !!user?.isActive;
                if (!isActiveAccount) {
                    return null;
                }

                // Compare the provided password with the stored hash
                const storedPassword = user.password as string;
                const isPasswordValid = await compare(rawPassword, storedPassword);

                // If password verification failed
                if (!isPasswordValid) {
                    return null;
                }

                // Retrieve details from the associated company
                const companyDetails = user.company;
                const companyType = companyDetails?.type;
                const companySlug = companyDetails?.slug;

                // Construct and return the authenticated user profile
                const authenticatedUserResult = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    companyId: user.companyId,
                    companyType: companyType,
                    companySlug: companySlug,
                    image: user.avatarUrl
                };

                return authenticatedUserResult;
            },
        }),
    ],

    // Lifecycle callbacks for NextAuth
    callbacks: {
        /**
         * Logic to manage the generation and updating of the JSON Web Token.
         * 
         * @param {Object} params - Callback parameters containing token, user, and trigger data.
         * @returns {Promise<JWT>} The updated JWT object.
         */
        async jwt(params) {
            // Destructure parameters
            const token = params.token;
            const user = params.user;
            const trigger = params.trigger;
            const session = params.session;

            // Handle the initial sign-in event where a user object is present
            if (user) {
                // Populate the token with user properties
                token.id = user.id;
                token.role = user.role;
                token.companyId = user.companyId;
                token.companyType = user.companyType;
                token.companySlug = user.companySlug;
                token.picture = user.image;
                token.name = user.name;
            }

            // identify if a session update was triggered (e.g., via clientside update())
            const isUpdateTrigger = trigger === "update";
            const hasUpdateSession = !!session;

            if (isUpdateTrigger) {
                if (hasUpdateSession) {
                    // Update token properties from provided session data
                    const updatedUser = session.user;
                    const updatedName = updatedUser?.name;
                    const updatedImage = updatedUser?.image;

                    if (updatedName) {
                        token.name = updatedName;
                    }
                    if (updatedImage) {
                        token.picture = updatedImage;
                    }

                    // Sync parameters with the database to maintain data integrity
                    const userIdForDb = token.id;
                    const dbUserRecord = await prisma.user.findUnique({
                        where: {
                            id: userIdForDb
                        },
                        select: {
                            name: true,
                            avatarUrl: true
                        }
                    });

                    // If user was found in the database
                    if (dbUserRecord) {
                        // Update token with authoritative database values
                        token.name = dbUserRecord.name;
                        token.picture = dbUserRecord.avatarUrl;
                    }
                }
            }

            // Return the finalized token
            return token;
        },
        /**
         * Logic to populate the session object using data stored in the JWT.
         * 
         * @param {Object} params - Callback parameters containing current session and token.
         * @returns {Promise<Session>} The updated session object.
         */
        async session(params) {
            // Destructure parameters
            const session = params.session;
            const token = params.token;

            // Ensure both token and user object in session exist
            const hasValidToken = !!token;
            const hasUserInCurrentSession = !!session.user;

            if (hasValidToken) {
                if (hasUserInCurrentSession) {
                    // Transfer properties from token to session user object
                    session.user.id = token.id;
                    session.user.role = token.role;
                    session.user.companyId = token.companyId;
                    session.user.companyType = token.companyType;
                    session.user.companySlug = token.companySlug;
                    session.user.name = token.name;
                    session.user.image = token.picture;
                }
            }

            // Return the finalized session object
            return session;
        },
    },

    // Custom pages for the authentication flow
    pages: {
        // Redirection for sign-in page
        signIn: "/login",
        // Redirection for authentication errors
        error: "/login",
    },
});

/**
 * Default NextAuth configuration object for production use.
 * Uses the default Prisma client instance.
 */
export const authOptions: NextAuthOptions = createAuthOptions();

