import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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

const connectionString = getDatabaseUrl();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Force reload trigger: 2026-01-11
