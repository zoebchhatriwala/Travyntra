import { UserRole } from "@/lib/constants/roles";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Middleware function to handle route protection and authorization logic.
 * Ensures users have the correct roles and permissions to access specific routes.
 * 
 * @param {NextRequestWithAuth} req - The incoming request object augmented with NextAuth data.
 * @returns {NextResponse} The resulting response after authorization checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function middlewareHandler(req: any) {
    // Retrieve the authorization token from the request
    const token = req.nextauth.token;

    // Retrieve the current URL from the request
    const nextUrl = req.nextUrl;

    // Retrieve the current pathname from the URL
    const pathname = nextUrl.pathname;

    // Base URL of the application for redirection purposes
    const appBaseUrl = req.url;

    // Determine if the current path is an admin-specific route
    const isAdminPage = pathname.startsWith("/admin");

    // Determine if the current path is an agent-specific route
    const isAgentPage = pathname.startsWith("/agent");

    // Determine if the current path is a company-specific route
    const isCompanyPage = pathname.startsWith("/company/");

    // Check if the user is attempting to access an admin page without SUPER_ADMIN role
    const isInvalidAdminAccess = isAdminPage && token?.role !== UserRole.SUPER_ADMIN;

    // If the access to admin page is invalid
    if (isInvalidAdminAccess) {
        // Construct the redirection URL for the home page
        const homeUrl = new URL("/", appBaseUrl);

        // Redirect the user to the home page
        return NextResponse.redirect(homeUrl);
    }

    // Check if the user is attempting to access an agent page without TRAVEL_AGENT or AGENCY_EMPLOYEE role
    const allowedAgentRoles = [UserRole.TRAVEL_AGENT, UserRole.AGENCY_EMPLOYEE];
    const isInvalidAgentAccess = isAgentPage && !allowedAgentRoles.includes(token?.role as UserRole);

    // If the access to agent page is invalid
    if (isInvalidAgentAccess) {
        // Construct the redirection URL for the home page
        const homeUrl = new URL("/", appBaseUrl);

        // Redirect the user to the home page
        return NextResponse.redirect(homeUrl);
    }

    // Handle authorization for company-specific routes
    if (isCompanyPage) {
        // Split the pathname into segments to extract the company slug
        const pathSegments = pathname.split("/");

        // The company slug is expected to be the third segment (index 2)
        const slugFromUrl = pathSegments[2];

        // Retrieve the user's role from the token
        const userRole = token?.role as string;

        // Define the list of roles allowed to access company routes
        const allowedCompanyRoles = [UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN];

        // Check if the user's role is in the allowed list
        const isAllowedRole = allowedCompanyRoles.includes(userRole as UserRole);

        // Retrieve the user's assigned company slug from the token
        const userCompanySlug = token?.companySlug;

        // Determine if the user belongs to the company specified in the URL or is a SUPER_ADMIN
        const isAuthorizedForCompany = userCompanySlug === slugFromUrl || userRole === UserRole.SUPER_ADMIN;

        // Check for invalid company access (wrong role or wrong company)
        const isInvalidCompanyAccess = !isAllowedRole || !isAuthorizedForCompany;

        // If the access to company page is invalid
        if (isInvalidCompanyAccess) {
            // Construct the redirection URL for the home page
            const homeUrl = new URL("/", appBaseUrl);

            // Redirect the user to the home page
            return NextResponse.redirect(homeUrl);
        }

        // identify the specific section within the company route
        const section = pathSegments[3];

        // Determine if the user is accessing an admin-only path within the company route
        const isAdminPath = section === "admin";


        // Check if a non-admin is trying to access a company admin path
        const isUnauthorizedAdminPath = isAdminPath && userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN;

        // If an unauthorized user attempts to access the company admin section
        if (isUnauthorizedAdminPath) {
            // Construct the redirection URL for the company dashboard
            const dashboardPathSegment = `/company/${slugFromUrl}/dashboard`;
            const dashboardUrl = new URL(dashboardPathSegment, appBaseUrl);

            // Redirect the user to the company dashboard
            return NextResponse.redirect(dashboardUrl);
        }
    }

    // Allow the request to proceed to its destination
    return NextResponse.next();
}

/**
 * Configuration options for the withAuth middleware wrapper.
 */
const authMiddlewareOptions = {
    callbacks: {
        /**
         * Determines if a request is authorized to proceed based on the presence of a token.
         * 
         * @param {Object} params - The authorization parameters.
         * @returns {boolean} True if authorized, false otherwise.
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authorized: (params: { token: any, req: any }) => {
            // Extract the token and request from parameters
            const token = params.token;
            const req = params.req;

            // Retrieve the current pathname
            const pathname = req.nextUrl.pathname;

            // Check if the current route is the login page
            const isLoginPage = pathname === "/login";

            // Check if the current route is the registration page
            const isRegisterPage = pathname === "/register";

            // Check if the current route is the root home page
            const isHomePage = pathname === "/";

            // If the route is one of the designated public pages
            if (isLoginPage) {
                return true;
            }
            if (isRegisterPage) {
                return true;
            }
            if (isHomePage) {
                return true;
            }

            // determine authorization status based on session token existence
            const result = !!token;

            // Return authorization status
            return result;
        },
    },
};

// Export the middleware wrapped with authentication logic
export default withAuth(middlewareHandler, authMiddlewareOptions);

/**
 * Configuration object defining which routes the middleware should apply to.
 */
export const config = {
    // Array of route patterns that should trigger the middleware
    matcher: [
        "/admin/:path*",
        "/agent/:path*",
        "/company/:path*",
    ],
};
