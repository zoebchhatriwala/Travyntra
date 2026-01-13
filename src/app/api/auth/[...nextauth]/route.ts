
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Initializes the NextAuth handler with the predefined authentication options.
 * This handler processes various authentication-related HTTP requests.
 */
const nextAuthHandler = NextAuth(authOptions);

/**
 * Exports the NextAuth handler to serve as the endpoint for GET requests.
 */
export { nextAuthHandler as GET };

/**
 * Exports the NextAuth handler to serve as the endpoint for POST requests.
 */
export { nextAuthHandler as POST };
