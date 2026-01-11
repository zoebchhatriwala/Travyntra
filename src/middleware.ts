import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Protective logic for routes
        const isAdminPage = pathname.startsWith("/admin");
        const isAgentPage = pathname.startsWith("/agent");
        const isCompanyPage = pathname.startsWith("/company/");

        if (isAdminPage && token?.role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        if (isAgentPage && token?.role !== "TRAVEL_AGENT") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        if (isCompanyPage) {
            const parts = pathname.split("/");
            const slugFromUrl = parts[2];

            // Verify the user belongs to the company they are trying to access
            if (token?.companySlug !== slugFromUrl && token?.role !== "SUPER_ADMIN") {
                return NextResponse.redirect(new URL("/", req.url));
            }

            const isAdminPath = parts[3] === "admin";
            const isDashboardPath = parts[3] === "dashboard";

            if (isAdminPath && token?.role !== "COMPANY_ADMIN") {
                return NextResponse.redirect(new URL(`/company/${slugFromUrl}/dashboard`, req.url));
            }
            if (isDashboardPath && token?.role === "COMPANY_ADMIN") {
                return NextResponse.redirect(new URL(`/company/${slugFromUrl}/admin`, req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                // These pages are NOT in the matcher, so this won't even run for them,
                // but we keep it here as a safety measure if they are added back.
                if (pathname === "/login" || pathname === "/register" || pathname === "/") {
                    return true;
                }
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        "/admin/:path*",
        "/agent/:path*",
        "/company/:path*",
        // Explicitly excluding /login and /register from matcher to avoid next-auth interference
    ],
};

