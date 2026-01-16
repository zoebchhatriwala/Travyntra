import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, RequestStatus, ApprovalType, BidStatus, InvoiceStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Creates a Money object containing the amount in the smallest unit and the currency code.
 */
function createMoney(amount: number, currencyCode: string = "USD", multiplier: number = 100) {
    const scaledAmount = amount * multiplier;
    const roundedAmount = Math.round(scaledAmount);
    return {
        amount: roundedAmount,
        currencyCode: currencyCode,
        multiplier: multiplier
    };
}

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

    const companyUsers: any[] = [];

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
            approvers: { connect: { id: adminUser.id } }
        }
    });

    // --- 3. GENERATE HISTORICAL ANALYTICS DATA ---
    console.log("Generating 13 months of historical data...");

    const CITIES = [
        { name: "London", country: "UK", currency: "GBP" },
        { name: "Paris", country: "France", currency: "EUR" },
        { name: "Tokyo", country: "Japan", currency: "JPY" },
        { name: "Singapore", country: "Singapore", currency: "SGD" },
        { name: "New York", country: "US", currency: "USD" },
        { name: "Berlin", country: "Germany", currency: "EUR" },
        { name: "Dubai", country: "UAE", currency: "AED" }
    ];

    const TRIP_PURPOSES = ["Client Meeting", "Conference", "Training", "Project Launch", "Site Visit"];

    const now = new Date();
    // Go back 13 months
    for (let i = 12; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        // Generate 3-8 trips per month
        const numTrips = Math.floor(Math.random() * 6) + 3;

        for (let j = 0; j < numTrips; j++) {
            const requester = employeesToCreate[Math.floor(Math.random() * employeesToCreate.length)];
            const userRecord = companyUsers.find(u => u.email === requester.email);
            const destination = CITIES[Math.floor(Math.random() * CITIES.length)];

            // Random day in the month
            const day = Math.floor(Math.random() * 28) + 1;
            const tripCreatedDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 10, 0, 0); // 10 AM local rough time

            // Determine status - mostly COMPLETED for past months, PENDING for current
            let status: RequestStatus = RequestStatus.COMPLETED;
            let invoiceStatus: InvoiceStatus = InvoiceStatus.PAID;

            if (i === 0) { // Current month
                const rand = Math.random();
                if (rand > 0.6) status = RequestStatus.PENDING_COMPANY_APPROVAL;
                else if (rand > 0.3) status = RequestStatus.BOOKED; // Invoice pending
                else status = RequestStatus.COMPLETED;

                if (status === RequestStatus.BOOKED) invoiceStatus = InvoiceStatus.PENDING;
            }

            const estimatedBudget = Math.floor(Math.random() * 3000) + 1000;
            const actualCost = estimatedBudget * (0.8 + Math.random() * 0.4); // +/- 20% variance mostly

            // Create Request
            const request = await prisma.tripRequest.create({
                data: {
                    userId: userRecord.id,
                    companyId: clientCompany.id,
                    title: `${TRIP_PURPOSES[Math.floor(Math.random() * TRIP_PURPOSES.length)]} - ${destination.name}`,
                    destination: { city: destination.name, country: destination.country },
                    startDate: new Date(tripCreatedDate.getTime() + 86400000 * 10), // 10 days later
                    endDate: new Date(tripCreatedDate.getTime() + 86400000 * 14),
                    status: status,
                    purpose: "Business travel",
                    budget: createMoney(estimatedBudget, "USD"), // Budget in Company Currency
                    preferences: { flight: "Economy", hotel: "City Center" },
                    createdAt: tripCreatedDate,
                    updatedAt: tripCreatedDate
                }
            });

            // If it went to agency (Booked/Completed)
            if (status === RequestStatus.BOOKED || status === RequestStatus.COMPLETED) {
                // Link Agent
                await prisma.tripRequest.update({ where: { id: request.id }, data: { assignedAgentId: agency.id } });

                // Bid in Agent Currency (GBP) or Destination Currency (e.g. EUR)
                // Let's mix it up. 70% Agent Currency.
                const isAgentCurrency = Math.random() > 0.3;
                const bidCurrency = isAgentCurrency ? "GBP" : destination.currency;

                // Approximate exchange rates for seed realism
                const rates: any = { "GBP": 0.78, "EUR": 0.92, "JPY": 145, "SGD": 1.34, "AED": 3.67, "USD": 1 };
                const rate = rates[bidCurrency] || 1;
                const bidAmount = Math.round(actualCost * rate);

                // Create Discussion Thread
                // 1. Employee asks
                await prisma.message.create({
                    data: {
                        requestId: request.id,
                        senderId: userRecord.id,
                        content: `Hi, I need to be near the convention center in ${destination.name}.`,
                        createdAt: new Date(tripCreatedDate.getTime() + 3600000) // 1 hr later
                    }
                });

                // 2. Agent replies
                const agentUser = await prisma.user.findFirst({ where: { email: "emma@globalvoyage.com" } });
                await prisma.message.create({
                    data: {
                        requestId: request.id,
                        senderId: agentUser!.id,
                        content: "Understood. I've attached a proposal with 3 hotel options nearby.",
                        createdAt: new Date(tripCreatedDate.getTime() + 7200000) // 2 hrs later
                    }
                });

                // Create Bid
                await prisma.agentBid.create({
                    data: {
                        requestId: request.id,
                        agentId: agency.id,
                        amount: createMoney(bidAmount, bidCurrency),
                        status: BidStatus.ACCEPTED,
                        message: "Standard package negotiation final.",
                        createdAt: new Date(tripCreatedDate.getTime() + 7200000)
                    }
                });

                // Create Invoice
                await prisma.invoice.create({
                    data: {
                        requestId: request.id,
                        companyId: clientCompany.id,
                        agencyId: agency.id,
                        amount: bidAmount, // Decimal for invoice
                        currency: bidCurrency,
                        status: invoiceStatus,
                        dueDate: new Date(tripCreatedDate.getTime() + 86400000 * 30),
                        createdAt: new Date(tripCreatedDate.getTime() + 86400000 * 2) // Invoice 2 days later
                    }
                });
            }
        }
    }

    // --- 4. SUPER ADMIN ---
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
    console.log("   - Review 'Financial Analytics' for historical data.");
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
