
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Casting the global object to a custom type that includes an optional prisma instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Constructs the database connection string from environment variables.
 * Falls back to default values if environment variables are not set.
 * 
 * @returns {string} The constructed PostgreSQL connection string.
 */
const getDatabaseUrl = (): string => {
    // Retrieve the DATABASE_URL from the environment variables
    const envUrl = process.env.DATABASE_URL;

    // Check if the environment URL exists
    if (envUrl) {
        // Return the environment URL
        return envUrl;
    }

    // Retrieve the DB_HOST or default to "localhost"
    const host = process.env.DB_HOST || "localhost";

    // Retrieve the DB_PORT or default to "5432"
    const port = process.env.DB_PORT || "5432";

    // Retrieve the DB_USER or default to "postgres"
    const user = process.env.DB_USER || "postgres";

    // Retrieve the DB_PASSWORD or default to "password"
    const password = process.env.DB_PASSWORD || "password";

    // Retrieve the DB_NAME or default to "travel_portal"
    const dbName = process.env.DB_NAME || "travel_portal";

    // Create the connection string using template literals
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;

    // Return the constructed connection string
    return connectionString;
};

// Call the function to get the database connection string
const dbConnectionString = getDatabaseUrl();

// Configuration for the PostgreSQL pool
const poolConfig = {
    connectionString: dbConnectionString
};

// Initialize the PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Create a new Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool);

// Specify the query log level
const logLevel = "error" as const;

// Array of log configurations
const logConfig = [logLevel];

// Specify the Prisma Client configuration
const prismaConfig = {
    adapter: adapter,
    log: logConfig,
};

// Check if a global prisma instance already exists
const existingPrisma = globalForPrisma.prisma;

// Initialize a new Prisma Client if no global instance exists
const newPrisma = new PrismaClient(prismaConfig);

/**
 * The exported Prisma Client instance used throughout the application.
 */
export const prisma = existingPrisma || newPrisma;

// Retrieve the current NODE_ENV
const currentEnv = process.env.NODE_ENV;

// Check if the environment is not production
const isNotProduction = currentEnv !== 'production';

// Apply global assignment logic for development
if (isNotProduction) {
    // Assign the prisma instance to the global object for preservation during HMR
    globalForPrisma.prisma = prisma;
}

// Force reload trigger: 2026-01-14 T23:57
