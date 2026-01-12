import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, RequestStatus, ApprovalType } from "@prisma/client";
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

const DICEBEAR_AVATAR_STYLE = "avataaars";
const DICEBEAR_COMPANY_STYLE = "identicon";

async function main() {
    console.log("💣 Clearing database...");

    // Cleanup
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

    const passwordHash = await hash("password", 10);

    // --- 1. CREATE AGENCY ---
    console.log("Creating Agency...");
    const agency = await prisma.company.create({
        data: {
            name: "Premium Travel Agency",
            slug: "premium-travel",
            domain: "premiumtravel.com",
            type: CompanyType.AGENT,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            country: "USA",
            currency: "USD",
            logoUrl: `https://api.dicebear.com/9.x/${DICEBEAR_COMPANY_STYLE}/svg?seed=premium-travel`,
        }
    });

    // Create 2 Agents
    const agents = [
        { name: "John Agent", email: "john@premiumtravel.com" },
        { name: "Sarah Agent", email: "sarah@premiumtravel.com" },
    ];

    for (const a of agents) {
        await prisma.user.create({
            data: {
                name: a.name,
                email: a.email,
                password: passwordHash,
                role: UserRole.TRAVEL_AGENT,
                companyId: agency.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${a.name}`,
            }
        });
    }

    // --- 2. CREATE CLIENT COMPANY ---
    console.log("Creating Client Company...");
    const clientCompany = await prisma.company.create({
        data: {
            name: "Acme Corp",
            slug: "acme",
            domain: "acme.com",
            type: CompanyType.ENTERPRISE,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
            country: "USA",
            currency: "USD",
            logoUrl: `https://api.dicebear.com/9.x/${DICEBEAR_COMPANY_STYLE}/svg?seed=acme`,
        }
    });

    // Create 2 Admins
    const admins = [
        { name: "Alice Admin", email: "alice@acme.com" },
        { name: "Bob Admin", email: "bob@acme.com" },
    ];

    for (const a of admins) {
        await prisma.user.create({
            data: {
                name: a.name,
                email: a.email,
                password: passwordHash,
                role: UserRole.COMPANY_ADMIN,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${a.name}`,
            }
        });
    }

    // Create 3 Employees
    const employees = [
        { name: "Charlie Employee", email: "charlie@acme.com" },
        { name: "David Employee", email: "david@acme.com" },
        { name: "Eve Employee", email: "eve@acme.com" },
    ];

    for (const e of employees) {
        await prisma.user.create({
            data: {
                name: e.name,
                email: e.email,
                password: passwordHash,
                role: UserRole.EMPLOYEE,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${e.name}`,
            }
        });
    }

    // Integrate Client Company with Agency
    await prisma.agencyIntegration.create({
        data: {
            companyId: clientCompany.id,
            agencyId: agency.id,
            status: "ACTIVE"
        }
    });

    // Create a default workflow for the client company
    const workflow = await prisma.approvalWorkflow.create({
        data: {
            name: "Standard Approval Workflow",
            companyId: clientCompany.id,
            isActive: true
        }
    });

    // Get admin users to assign as approvers
    const adminUsers = await prisma.user.findMany({
        where: { companyId: clientCompany.id, role: UserRole.COMPANY_ADMIN }
    });

    // Create workflow steps
    await prisma.workflowStep.create({
        data: {
            workflowId: workflow.id,
            name: "Manager Approval",
            order: 1,
            type: ApprovalType.ANY,
            approvers: {
                connect: adminUsers.map(admin => ({ id: admin.id }))
            }
        }
    });

    await prisma.workflowStep.create({
        data: {
            workflowId: workflow.id,
            name: "Finance Approval",
            order: 2,
            type: ApprovalType.ALL,
            approvers: {
                connect: adminUsers.map(admin => ({ id: admin.id }))
            }
        }
    });

    // --- 3. CREATE REQUESTS & OTHER DATA ---
    console.log("Generating Requests and interactions...");

    const CITIES = ["New York", "London", "Paris", "Tokyo", "Singapore", "Dubai", "Sydney", "Berlin"];
    const TRIP_TITLES = ["Client Meeting", "Q3 Planning", "Tech Conference", "Partner Summit", "Sales Pitch"];
    const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const getRandomDate = (start: Date, days: number) => {
        const date = new Date(start);
        date.setDate(date.getDate() + Math.floor(Math.random() * days));
        return date;
    };

    const employeeRecords = await prisma.user.findMany({
        where: { companyId: clientCompany.id, role: UserRole.EMPLOYEE }
    });

    for (const employee of employeeRecords) {
        // Create 2-3 requests per employee
        const numReqs = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numReqs; i++) {
            const dest = getRandom(CITIES);
            const title = `${getRandom(TRIP_TITLES)} - ${dest}`;
            const startDate = getRandomDate(new Date(), 30);
            const endDate = getRandomDate(startDate, 5);

            // Varied statuses
            const status = i === 0 ? RequestStatus.PENDING_AGENT_ACTION :
                i === 1 ? RequestStatus.BOOKED :
                    RequestStatus.DRAFT;

            const request = await prisma.tripRequest.create({
                data: {
                    userId: employee.id,
                    companyId: clientCompany.id,
                    title,
                    destination: { city: dest, country: "Various", formatted: dest },
                    startDate,
                    endDate,
                    status: status,
                    purpose: `Business travel for ${title}`,
                    budget: 2500,
                    preferences: { flight: "Economy", hotel: "Central location" }
                }
            });

            // If pending agent action or further, create a bid
            if (status !== RequestStatus.DRAFT) {
                await prisma.tripRequest.update({
                    where: { id: request.id },
                    data: { assignedAgentId: agency.id }
                });

                await prisma.agentBid.create({
                    data: {
                        requestId: request.id,
                        agentId: agency.id,
                        amount: 2200,
                        message: "We have found a great deal for your trip.",
                        status: status === RequestStatus.BOOKED ? "ACCEPTED" : "PENDING"
                    }
                });

                // Add some messages
                await prisma.message.create({
                    data: {
                        requestId: request.id,
                        senderId: employee.id,
                        content: "I need to be close to the convention center."
                    }
                });

                await prisma.message.create({
                    data: {
                        requestId: request.id,
                        senderId: agents[0].email === "john@premiumtravel.com"
                            ? (await prisma.user.findUnique({ where: { email: "john@premiumtravel.com" } }))!.id
                            : (await prisma.user.findUnique({ where: { email: "sarah@premiumtravel.com" } }))!.id,
                        content: "We've selected a hotel just 2 blocks away."
                    }
                });

                // If booked, add fulfillment steps
                if (status === RequestStatus.BOOKED) {
                    await prisma.fulfillmentItem.createMany({
                        data: [
                            { requestId: request.id, title: "Flight Tickets", isCompleted: true, order: 1 },
                            { requestId: request.id, title: "Hotel Voucher", isCompleted: true, order: 2 },
                            { requestId: request.id, title: "Travel Insurance", isCompleted: true, order: 3 }
                        ]
                    });
                }
            }
        }
    }

    // --- 3.5. CREATE A TEST REQUEST WITH PENDING APPROVAL ---
    console.log("Creating test request with pending approval...");
    const testEmployee = employeeRecords[0];
    const testRequest = await prisma.tripRequest.create({
        data: {
            userId: testEmployee.id,
            companyId: clientCompany.id,
            title: "Annual Conference - San Francisco",
            destination: { city: "San Francisco", country: "USA", formatted: "San Francisco, CA, USA" },
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
            status: RequestStatus.PENDING_COMPANY_APPROVAL,
            purpose: "Attend annual tech conference and meet with west coast clients",
            budget: 3500,
            preferences: { flight: "Business", hotel: "Downtown area" }
        }
    });

    // Create approval steps for the test request
    const workflowSteps = await prisma.workflowStep.findMany({
        where: { workflowId: workflow.id, deletedAt: null },
        orderBy: { order: 'asc' }
    });

    for (let stepIndex = 0; stepIndex < workflowSteps.length; stepIndex++) {
        const step = workflowSteps[stepIndex];
        await prisma.requestApprovalStep.create({
            data: {
                requestId: testRequest.id,
                stepId: step.id,
                status: stepIndex === 0 ? 'PENDING' : 'WAITING'
            }
        });
    }

    console.log(`✓ Created test request "${testRequest.title}" with ${workflowSteps.length} approval steps`);

    // --- 4. SUPER ADMIN ---
    await prisma.user.create({
        data: {
            email: "admin@travyntra.com",
            name: "Zoeb Chhatriwala",
            password: passwordHash,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            avatarUrl: `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=Zoeb`
        }
    });

    console.log("");
    console.log("✅ Seed Completed!");
    console.log("------------------------------------------------");
    console.log("Created 1 Agency (2 Agents)");
    console.log("Created 1 Client Company (2 Admins, 3 Employees)");
    console.log("Generated Sample Requests, Bids, and Messages");
    console.log("------------------------------------------------");
    console.log("Login with password: 'password'");
    console.log("- Super Admin: admin@travyntra.com");
    console.log("- Agency Admin/Agent: john@premiumtravel.com, sarah@premiumtravel.com");
    console.log("- Company Admin: alice@acme.com, bob@acme.com");
    console.log("- Employee: charlie@acme.com, david@acme.com, eve@acme.com");
    console.log("------------------------------------------------");
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
