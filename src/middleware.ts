import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const { pathname } = req.nextUrl;
        const isAuthPage = pathname === "/login" || pathname === "/register";

        // Redirect authenticated users away from login/register
        if (isAuth && isAuthPage) {
            if (token.role === "SUPER_ADMIN") {
                return NextResponse.redirect(new URL("/admin/dashboard", req.url));
            }
            if (token.role === "TRAVEL_AGENT") {
                return NextResponse.redirect(new URL("/agent/dashboard", req.url));
            }
            if (token.role === "COMPANY_ADMIN" && token.companySlug) {
                return NextResponse.redirect(new URL(`/company/${token.companySlug}/admin`, req.url));
            }
            if (token.role === "EMPLOYEE" && token.companySlug) {
                return NextResponse.redirect(new URL(`/company/${token.companySlug}/dashboard`, req.url));
            }
            return NextResponse.redirect(new URL("/", req.url));
        }

        const isAdminPage = pathname.startsWith("/admin");
        const isAgentPage = pathname.startsWith("/agent");

        // Protect Admin routes
        if (isAdminPage) {
            if (!isAuth) {
                return NextResponse.redirect(new URL("/login", req.url));
            }
            if (token.role !== "SUPER_ADMIN") {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        // Protect Agent routes
        if (isAgentPage) {
            if (!isAuth) {
                return NextResponse.redirect(new URL("/login", req.url));
            }
            if (token.role !== "TRAVEL_AGENT") {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        // Protect Company Admin/Employee routes
        const isCompanyPage = pathname.startsWith("/company/");
        if (isCompanyPage) {
            if (!isAuth) {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            const parts = pathname.split("/");
            const slugFromUrl = parts[2];
            const isAdminPath = parts[3] === "admin";
            const isDashboardPath = parts[3] === "dashboard";

            // Verify the user belongs to the company they are trying to access
            if (token.companySlug !== slugFromUrl) {
                return NextResponse.redirect(new URL("/", req.url));
            }

            // Verify roles for specific sub-paths
            if (isAdminPath && token.role !== "COMPANY_ADMIN") {
                return NextResponse.redirect(new URL("/", req.url));
            }
            if (isDashboardPath && token.role !== "EMPLOYEE") {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                // Always allow access to login and register pages so we can handle redirection logic inside the middleware function
                if (pathname === "/login" || pathname === "/register") {
                    return true;
                }
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/agent/:path*", "/company/:path*", "/login", "/register"],
};
