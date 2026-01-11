import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, RequestStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Setup adapter for seeding to match the main app configuration
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
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("💣 Clearing database...");

    // Order matters for deletion due to foreign keys
    try {
        await prisma.activityLog.deleteMany();
        await prisma.message.deleteMany();
        await prisma.document.deleteMany();
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
        console.warn("Error clearing db (might be empty already):", e);
    }

    console.log("🌱 Database cleared. Starting seed...");

    const passwordHash = await hash("password", 10);

    // --- AGENCIES ---
    console.log("Creating Agencies...");

    const joyTravels = await prisma.company.create({
        data: {
            name: "Joy Travels & Tours",
            slug: "joy-travels",
            domain: "joytravels.com",
            type: CompanyType.AGENT,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Joy",
            country: "USA"
        }
    });

    const globalWings = await prisma.company.create({
        data: {
            name: "Global Wings",
            slug: "global-wings",
            domain: "globalwings.com",
            type: CompanyType.AGENT,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.STARTER,
            logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Global",
            country: "UK"
        }
    });

    // --- COMPANIES ---
    console.log("Creating Client Companies...");

    const acmeCorp = await prisma.company.create({
        data: {
            name: "Acme Corp",
            slug: "acme",
            domain: "acme.com",
            type: CompanyType.ENTERPRISE,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Acme",
        }
    });

    const techStart = await prisma.company.create({
        data: {
            name: "TechStart",
            slug: "techstart",
            domain: "techstart.io",
            type: CompanyType.ENTERPRISE,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.STARTER,
            logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Tech",
        }
    });

    // --- USERS ---
    console.log("Creating Users...");

    // Super Admin
    await prisma.user.create({
        data: {
            email: "admin@travyntra.com",
            name: "Zoeb Chhatriwala",
            password: passwordHash,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoeb"
        }
    });

    // Joy Travels Agents
    await prisma.user.create({
        data: {
            email: "sarah@joytravels.com",
            name: "Sarah Joy",
            password: passwordHash,
            role: UserRole.TRAVEL_AGENT,
            companyId: joyTravels.id,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
        }
    });

    // Acme Corp Employees
    const acmeAdmin = await prisma.user.create({
        data: {
            email: "alice@acme.com",
            name: "Alice Admin",
            password: passwordHash,
            role: UserRole.COMPANY_ADMIN,
            companyId: acmeCorp.id,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
        }
    });

    const acmeEmployee = await prisma.user.create({
        data: {
            email: "bob@acme.com",
            name: "Bob Builder",
            password: passwordHash,
            role: UserRole.EMPLOYEE,
            companyId: acmeCorp.id,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
        }
    });

    // TechStart Employees
    const techAdmin = await prisma.user.create({
        data: {
            email: "dave@techstart.io",
            name: "Dave Developer",
            password: passwordHash,
            role: UserRole.COMPANY_ADMIN,
            companyId: techStart.id,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dave"
        }
    });

    // --- INTEGRATIONS ---
    console.log("Creating Integrations...");

    // Acme integrates with Joy Travels
    await prisma.agencyIntegration.create({
        data: {
            companyId: acmeCorp.id,
            agencyId: joyTravels.id,
            status: "ACTIVE"
        }
    });

    // TechStart integrates with Global Wings
    await prisma.agencyIntegration.create({
        data: {
            companyId: techStart.id,
            agencyId: globalWings.id,
            status: "ACTIVE"
        }
    });

    // --- TRIP REQUESTS & BIDS ---
    console.log("Creating Trip Requests & Bids...");

    // 1. Acme Request: Approved, needs Fulfillment (Assigned to Joy)
    const req1 = await prisma.tripRequest.create({
        data: {
            title: "NYC Client Summit",
            destination: "New York, USA",
            startDate: new Date("2026-06-10"),
            endDate: new Date("2026-06-15"),
            status: RequestStatus.APPROVED,
            userId: acmeEmployee.id,
            companyId: acmeCorp.id,
            assignedAgentId: joyTravels.id,
            purpose: "Annual client summit with key stakeholders.",
            budget: 2500,
            preferences: {
                flight: "Morning flight, Delta preferred, Aisle seat",
                hotel: "Marriott Downtown, King bed",
                car: "Uber voucher preferred"
            }
        }
    });

    // Bid for Req1
    await prisma.agentBid.create({
        data: {
            requestId: req1.id,
            agentId: joyTravels.id,
            amount: 2400,
            message: "We can secure the Marriott at a corporate rate.",
            status: "ACCEPTED"
        }
    });

    // 2. Acme Request: Open for Bidding (Approved by company, unassigned)
    await prisma.tripRequest.create({
        data: {
            title: "London Tech Week",
            destination: "London, UK",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-07-07"),
            status: RequestStatus.APPROVED,
            userId: acmeAdmin.id,
            companyId: acmeCorp.id,
            purpose: "Attending London Tech Week conference.",
            budget: 4000,
            preferences: {
                flight: "British Airways, Business Class if within budget",
                hotel: "Near ExCeL London",
                train: "Heathrow Express ticket needed"
            }
        }
    });

    // 3. TechStart Request: Pending Company Approval
    await prisma.tripRequest.create({
        data: {
            title: "Team Retreat - Bali",
            destination: "Bali, Indonesia",
            startDate: new Date("2026-08-15"),
            endDate: new Date("2026-08-22"),
            status: RequestStatus.PENDING_COMPANY_APPROVAL,
            userId: techAdmin.id,
            companyId: techStart.id,
            purpose: "Company wide retreat.",
            isGroup: true,
            preferences: {
                other: "Need villa for 15 people with coworking space"
            }
        }
    });

    console.log("✅ Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
