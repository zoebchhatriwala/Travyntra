import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getDatabaseUrl = () => {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const user = process.env.DB_USER || "postgres";
    const password = process.env.DB_PASSWORD || "password";
    const dbName = process.env.DB_NAME || "travel_portal";

    return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
};

// Shim the environment variable so Prisma Client picks it up naturally
// This avoids the "Unknown property datasources" error in recent Prisma versions
// while still respecting the user's wish to use individual env vars.
const url = getDatabaseUrl();
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
}

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
