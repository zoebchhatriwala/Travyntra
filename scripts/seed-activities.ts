
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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

const prisma = new PrismaClient({
    adapter,
});

async function main() {
    console.log("Seeding activities...");
    const companies = await prisma.company.findMany();

    for (const company of companies) {
        console.log(`Seeding activities for company: ${company.name}`);

        await prisma.activityLog.createMany({
            data: [
                {
                    companyId: company.id,
                    action: "SETTINGS_CHANGE",
                    description: "Updated company settings",
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                    metadata: { section: "General" }
                },
                {
                    companyId: company.id,
                    action: "USER_REGISTERED",
                    description: "New user registration",
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
                    metadata: { role: "EMPLOYEE" }
                },
                {
                    companyId: company.id,
                    action: "TRIP_APPROVED",
                    description: "Trip request #TR-1234 approved",
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
                    metadata: { tripId: "TR-1234", amount: 1200 }
                }
            ]
        });
    }
    console.log("Done seeding activities.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
