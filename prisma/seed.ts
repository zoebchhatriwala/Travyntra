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
            currency: "JPY"
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
            currency: "JPY"
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

    // Joy Travels Agent
    const joyAgent = await prisma.user.create({
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

    // Global Wings Agent
    await prisma.user.create({
        data: {
            email: "mike@globalwings.com",
            name: "Mike Wings",
            password: passwordHash,
            role: UserRole.TRAVEL_AGENT,
            companyId: globalWings.id,
            isActive: true,
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike"
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

    // ========================================
    // 1. IN_PROGRESS: Ready for Fulfillment
    // ========================================
    // This request has an accepted bid and is assigned to Joy Travels
    // Agent can now add fulfillment items, upload documents, and complete
    const reqFulfillment = await prisma.tripRequest.create({
        data: {
            title: "NYC Client Summit",
            destination: "New York, USA",
            startDate: new Date("2026-06-10"),
            endDate: new Date("2026-06-15"),
            status: RequestStatus.IN_PROGRESS, // Ready for fulfillment!
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

    // Accepted bid for this request
    await prisma.agentBid.create({
        data: {
            requestId: reqFulfillment.id,
            agentId: joyTravels.id,
            amount: 2400,
            message: "We can secure the Marriott at a corporate rate. Flight and hotel package deal available.",
            status: "ACCEPTED"
        }
    });

    // Initial discussion message
    await prisma.message.create({
        data: {
            requestId: reqFulfillment.id,
            senderId: joyAgent.id,
            content: "**Bid Accepted!** We're excited to work on your NYC trip. We'll start booking immediately and upload the documents as they come in."
        }
    });

    // ========================================
    // 2. APPROVED: Open for Bidding
    // ========================================
    // This request is approved but no bid accepted yet
    const reqBidding = await prisma.tripRequest.create({
        data: {
            title: "London Tech Week",
            destination: "London, UK",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-07-07"),
            status: RequestStatus.APPROVED, // Open for bidding
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

    // Pending bid from Joy Travels
    await prisma.agentBid.create({
        data: {
            requestId: reqBidding.id,
            agentId: joyTravels.id,
            amount: 3800,
            message: "We have partner rates with BA and can get you business class within budget. Hilton ExCeL available.",
            status: "PENDING"
        }
    });

    // ========================================
    // 3. PENDING_COMPANY_APPROVAL: Awaiting Approval
    // ========================================
    await prisma.tripRequest.create({
        data: {
            title: "Team Retreat - Bali",
            destination: "Bali, Indonesia",
            startDate: new Date("2026-08-15"),
            endDate: new Date("2026-08-22"),
            status: RequestStatus.PENDING_COMPANY_APPROVAL,
            userId: techAdmin.id,
            companyId: techStart.id,
            purpose: "Annual company retreat for team bonding.",
            isGroup: true,
            preferences: {
                other: "Need villa for 15 people with coworking space"
            }
        }
    });

    // ========================================
    // 4. DRAFT: Not yet submitted
    // ========================================
    await prisma.tripRequest.create({
        data: {
            title: "SF Partner Meeting",
            destination: "San Francisco, USA",
            startDate: new Date("2026-09-05"),
            endDate: new Date("2026-09-07"),
            status: RequestStatus.DRAFT,
            userId: acmeEmployee.id,
            companyId: acmeCorp.id,
            purpose: "Meeting with potential partners.",
            budget: 1500
        }
    });

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("📋 Test Accounts:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Super Admin:     admin@travyntra.com");
    console.log("Joy Agent:       sarah@joytravels.com (Joy Travels)");
    console.log("Global Agent:    mike@globalwings.com (Global Wings)");
    console.log("Acme Admin:      alice@acme.com (Acme Corp)");
    console.log("Acme Employee:   bob@acme.com (Acme Corp)");
    console.log("TechStart Admin: dave@techstart.io (TechStart)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Password for all: password");
    console.log("");
    console.log("🎯 Fulfillment Workflow Test:");
    console.log("1. Login as sarah@joytravels.com");
    console.log("2. Go to Fulfillment Console (/agent/fulfillment)");
    console.log("3. Click 'NYC Client Summit' request");
    console.log("4. Add checklist items and upload documents");
    console.log("5. Mark items as complete and finish the request");
    console.log("");
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
