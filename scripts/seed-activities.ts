
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Constructs the database connection string from environment variables or defaults.
 * 
 * @returns {string} The PostgreSQL connection string.
 */
const getDatabaseUrl = (): string => {
    // Retrieve the DATABASE_URL from environment variables
    const envUrl = process.env.DATABASE_URL;

    // If environment URL exists
    if (envUrl) {
        // Return the existing connection string
        return envUrl;
    }

    // Retrieve database configuration portions or use defaults
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const user = process.env.DB_USER || "postgres";
    const password = process.env.DB_PASSWORD || "password";
    const dbName = process.env.DB_NAME || "travel_portal";

    // Combine parameters into a standard PostgreSQL connection string
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;

    // Return the constructed string
    return connectionString;
};

// Retrieve the database connection string
const dbConnectionString = getDatabaseUrl();

// Configuration for the PostgreSQL pool
const poolConfig = {
    connectionString: dbConnectionString
};

// Initialize the PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Create the Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool);

// Configuration for the Prisma Client
const prismaOptions = {
    adapter: adapter,
};

// Initialize the Prisma Client instance
const prisma = new PrismaClient(prismaOptions);

/**
 * Main execution function for seeding activity logs.
 */
async function main() {
    // Define the initiation message
    const initiationMsg = "Seeding activities...";

    // Log the initiation message
    console.log(initiationMsg);

    // Retrieve all companies from the database
    const companies = await prisma.company.findMany();

    // Iterate through each company to generate mock activity logs
    for (const company of companies) {
        // Extract name property from the company object
        const companyName = company.name;
        // Extract ID property from the company object
        const companyId = company.id;

        // Define the current seeding message
        const seedingMsg = `Seeding activities for company: ${companyName}`;

        // Log the current company being seeded
        console.log(seedingMsg);

        // Constant for number of milliseconds in one hour
        const millisecondsInHour = 1000 * 60 * 60;
        // Constant for number of milliseconds in one day
        const millisecondsInDay = millisecondsInHour * 24;

        // Get the current timestamp in milliseconds
        const currentTimestamp = Date.now();

        // Calculate date for 2 hours ago
        const twoHoursAgoOffset = millisecondsInHour * 2;
        const twoHoursAgo = new Date(currentTimestamp - twoHoursAgoOffset);

        // Calculate date for 2 days ago
        const twoDaysAgoOffset = millisecondsInDay * 2;
        const twoDaysAgo = new Date(currentTimestamp - twoDaysAgoOffset);

        // Calculate date for 5 days ago
        const fiveDaysAgoOffset = millisecondsInDay * 5;
        const fiveDaysAgo = new Date(currentTimestamp - fiveDaysAgoOffset);

        // Define the data for mock activity logs
        const mockActivitiesData = [
            {
                companyId: companyId,
                action: "SETTINGS_CHANGE",
                description: "Updated company settings",
                createdAt: twoHoursAgo,
                metadata: { section: "General" }
            },
            {
                companyId: companyId,
                action: "USER_REGISTERED",
                description: "New user registration",
                createdAt: twoDaysAgo,
                metadata: { role: "EMPLOYEE" }
            },
            {
                companyId: companyId,
                action: "TRIP_APPROVED",
                description: "Trip request #TR-1234 approved",
                createdAt: fiveDaysAgo,
                metadata: { tripId: "TR-1234", amount: 1200 }
            }
        ];

        // Batch create the activity log entries for the company
        await prisma.activityLog.createMany({
            data: mockActivitiesData
        });
    }

    // Define the completion message
    const completionMsg = "Done seeding activities.";

    // Log the completion message
    console.log(completionMsg);
}

// Execute the main seeding function
main()
    .catch((error) => {
        // Log any errors that occurred to the console
        console.error(error);
        // Terminate the process with a failure code
        process.exit(1);
    })
    .finally(async () => {
        // Terminate the Prisma client connection
        await prisma.$disconnect();
        // Terminate the PostgreSQL pool connection
        await pool.end();
    });
