import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
    interface User {
        id: string;
        role: UserRole;
        companyId?: string | null;
        companyType?: string | null;
        companySlug?: string | null;
        image?: string | null;
    }
    interface Session {
        user: {
            id: string;
            role: UserRole;
            companyId?: string | null;
            companyType?: string | null;
            companySlug?: string | null;
            image?: string | null;
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
        companyId?: string | null;
        companyType?: string | null;
        companySlug?: string | null;
        picture?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET || "travyntrasecretproject2026version",
    session: {
        strategy: "jwt",
    },
    providers: [

        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email.toLowerCase().trim();
                const user = await prisma.user.findUnique({
                    where: { email },
                    include: { company: true }
                });

                if (!user || !user.password || !user.isActive) return null;

                const isValid = await compare(credentials.password, user.password);
                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    companyId: user.companyId,
                    companyType: user.company?.type,
                    companySlug: user.company?.slug,
                    image: user.avatarUrl
                };
            },
        }),
        // Development-only provider for quick switching
        ...(process.env.NODE_ENV === 'development' ? [
            CredentialsProvider({
                id: "dev-login",
                name: "Dev Login",
                credentials: {
                    email: { label: "Email", type: "email" },
                },
                async authorize(credentials) {
                    if (process.env.NODE_ENV !== 'development') return null;
                    if (!credentials?.email) return null;

                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                        include: { company: true }
                    });

                    if (!user) return null;

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        companyId: user.companyId,
                        companyType: user.company?.type,
                        companySlug: user.company?.slug,
                        image: user.avatarUrl
                    };
                },
            })
        ] : []),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.companyId = user.companyId;
                token.companyType = user.companyType;
                token.companySlug = user.companySlug;
                token.picture = user.image;
                token.name = user.name;
            }

            // Handle session update (e.g. from useSession().update())
            if (trigger === "update" && session) {
                // Priority 1: Use data passed from the client update call
                if (session.user?.name) token.name = session.user.name;
                if (session.user?.image) token.picture = session.user.image;

                // Priority 2: Sync with DB to be absolutely sure
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { name: true, avatarUrl: true }
                });

                if (dbUser) {
                    token.name = dbUser.name;
                    token.picture = dbUser.avatarUrl;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.companyId = token.companyId;
                session.user.companyType = token.companyType;
                session.user.companySlug = token.companySlug;
                session.user.name = token.name;
                session.user.image = token.picture;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
};
