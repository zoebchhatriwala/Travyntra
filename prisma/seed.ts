import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, ApprovalType, User } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';


const getDatabaseUrl = (): string => {
    const envUrl = process.env.DATABASE_URL;
    if (envUrl) return envUrl;
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const user = process.env.DB_USER || "postgres";
    const password = process.env.DB_PASSWORD || "password";
    const dbName = process.env.DB_NAME || "travel_portal";
    return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
};

const dbUrl = getDatabaseUrl();
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DICEBEAR_AVATAR_STYLE = "avataaars";
const DICEBEAR_COMPANY_STYLE = "identicon";

async function main() {
    console.log("💣 Clearing database...");
    try {
        await prisma.notification.deleteMany();
        await prisma.activityLog.deleteMany();
        await prisma.message.deleteMany();
        await prisma.document.deleteMany();
        await prisma.fulfillmentItem.deleteMany();
        await prisma.expense.deleteMany();
        await prisma.invoice.deleteMany();
        await prisma.userApproval.deleteMany();
        await prisma.requestApprovalStep.deleteMany();
        await prisma.workflowStep.deleteMany();
        await prisma.approvalWorkflow.deleteMany();
        await prisma.agentBid.deleteMany();
        await prisma.workflowAction.deleteMany();
        await prisma.tripRequest.deleteMany();
        await prisma.agencyIntegration.deleteMany();
        await prisma.user.deleteMany();
        await prisma.company.deleteMany();
    } catch (e) {
        console.warn("Error clearing db:", e);
    }

    console.log("🌱 Database cleared. Starting seed...");

    const defaultPassword = "password";
    const passwordHash = await hash(defaultPassword, 10);

    // --- 1. CREATE AGENCY (UK, GBP, Europe/London) ---
    console.log("Creating Agency (UK Based)...");
    const agency = await prisma.company.create({
        data: {
            name: "Global Voyage Partners",
            slug: "global-voyage",
            domain: "globalvoyage.com",
            type: CompanyType.AGENT,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            country: "UK",
            currency: "GBP",
            timezone: "Europe/London",
            logoUrl: `https://api.dicebear.com/9.x/${DICEBEAR_COMPANY_STYLE}/png?seed=global-voyage`,
        }
    });

    const agentsToCreate = [
        { name: "Emma Thompson", email: "emma@globalvoyage.com", role: UserRole.TRAVEL_AGENT },
        { name: "Liam Sterling", email: "liam@globalvoyage.com", role: UserRole.TRAVEL_AGENT },
    ];

    for (const agentData of agentsToCreate) {
        await prisma.user.create({
            data: {
                name: agentData.name,
                email: agentData.email,
                password: passwordHash,
                role: agentData.role,
                companyId: agency.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${agentData.name}`,
            }
        });
    }

    // --- 2. CREATE CLIENT COMPANY (US, USD, America/New_York) ---
    console.log("Creating Client Company (US Based)...");
    const clientCompany = await prisma.company.create({
        data: {
            name: "Nebula Innovations",
            slug: "nebula",
            domain: "nebula.tech",
            type: CompanyType.ENTERPRISE,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            country: "US",
            currency: "USD",
            timezone: "America/New_York",
            logoUrl: `https://api.dicebear.com/9.x/${DICEBEAR_COMPANY_STYLE}/png?seed=nebula`,
            policyThreshold: {
                enabled: true,
                rules: [
                    {
                        id: "rule-budget-1",
                        name: "Budget Threshold Rule",
                        enabled: true,
                        type: "BUDGET_THRESHOLD",
                        config: { maxAmount: 1000, currencyCode: "USD" }
                    },
                    {
                        id: "rule-domestic-1",
                        name: "Domestic Trip Rule",
                        enabled: true,
                        type: "DOMESTIC_TRIP",
                        config: { enabled: true }
                    }
                ],
                updatedAt: new Date().toISOString()
            }
        }
    });

    const adminsToCreate = [
        { name: "Marcus Chen", email: "marcus@nebula.tech" },
        { name: "Sarah Connor", email: "sarah@nebula.tech" },
    ];

    const employeesToCreate = [
        { name: "David Miller", email: "david@nebula.tech" },
        { name: "Jessica Wu", email: "jessica@nebula.tech" },
        { name: "Raj Patel", email: "raj@nebula.tech" },
        { name: "Sophie Turner", email: "sophie@nebula.tech" },
        { name: "Alex Johnson", email: "alex@nebula.tech" },
    ];

    const companyUsers: User[] = [];

    for (const adminData of adminsToCreate) {
        const u = await prisma.user.create({
            data: {
                name: adminData.name,
                email: adminData.email,
                password: passwordHash,
                role: UserRole.COMPANY_ADMIN,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${adminData.name}`,
            }
        });
        companyUsers.push(u);
    }

    for (const empData of employeesToCreate) {
        const u = await prisma.user.create({
            data: {
                name: empData.name,
                email: empData.email,
                password: passwordHash,
                role: UserRole.EMPLOYEE,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${empData.name}`,
            }
        });
        companyUsers.push(u);
    }

    // Link Agency
    await prisma.agencyIntegration.create({
        data: {
            companyId: clientCompany.id,
            agencyId: agency.id,
            status: "ACTIVE"
        }
    });

    // Create Workflow
    const workflow = await prisma.approvalWorkflow.create({
        data: {
            name: "Standard Travel Workflow",
            companyId: clientCompany.id,
            isActive: true
        }
    });

    const adminUser = companyUsers.find(u => u.role === UserRole.COMPANY_ADMIN);

    // Simple 1-step workflow for seed simplicity
    await prisma.workflowStep.create({
        data: {
            workflowId: workflow.id,
            name: "Manager Approval",
            order: 1,
            type: ApprovalType.ANY,
            approvers: { connect: { id: adminUser!.id } }
        }
    });

    // --- 3. SUPER ADMIN ---
    console.log("Creating Super Admin...");
    await prisma.user.create({
        data: {
            email: "admin@travyntra.com",
            name: "Zoeb Chhatriwala",
            password: passwordHash,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=Zoeb`
        }
    });

    console.log("");
    console.log("✅ Seed Completed Successfully!");
    console.log("------------------------------------------------");
    console.log("1. AGENCY: Global Voyage Partners (UK, GBP, London Time)");
    console.log("   - User: emma@globalvoyage.com");
    console.log("");
    console.log("2. COMPANY: Nebula Innovations (USA, USD, NYC Time)");
    console.log("   - Admin: marcus@nebula.tech");
    console.log("");
    console.log("3. SUPER ADMIN: admin@travyntra.com");
    console.log("------------------------------------------------");
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
