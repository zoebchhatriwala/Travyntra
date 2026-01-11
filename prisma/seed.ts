import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, RequestStatus, ApprovalStatus } from "@prisma/client";

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
    console.log("🚀 Starting comprehensive seed...");

    const hashedPassword = await hash("password123", 10);

    // 1. Super Admin
    console.log("👤 Creating Super Admin...");
    await prisma.user.upsert({
        where: { email: "admin@travyntra.com" },
        update: {},
        create: {
            email: "admin@travyntra.com",
            name: "Zoe SuperAdmin",
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
        },
    });

    // 2. Agencies
    console.log("🏢 Creating Agency...");
    const joyTravels = await prisma.company.upsert({
        where: { slug: "joy-travels" },
        update: { type: CompanyType.AGENT, status: CompanyStatus.ACTIVE },
        create: {
            name: "Joy Travels & Tours",
            slug: "joy-travels",
            domain: "joytravels.com",
            type: CompanyType.AGENT,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.ENTERPRISE,
        }
    });

    // 3. Agency Agent
    console.log("👨‍💼 Creating Agency Agent...");
    await prisma.user.upsert({
        where: { email: "sarah@joytravels.com" },
        update: {},
        create: {
            email: "sarah@joytravels.com",
            name: "Sarah Agent",
            password: hashedPassword,
            role: UserRole.TRAVEL_AGENT,
            companyId: joyTravels.id,
            isActive: true,
        }
    });

    // 4. Client Company: Innovate Corp
    console.log("🏢 Creating Client Company...");
    const innovate = await prisma.company.upsert({
        where: { slug: "innovate" },
        update: { status: CompanyStatus.ACTIVE },
        create: {
            name: "Innovate Corp",
            slug: "innovate",
            domain: "innovate.com",
            type: CompanyType.ENTERPRISE,
            status: CompanyStatus.ACTIVE,
            plan: SubscriptionPlan.STARTER,
        }
    });

    // 5. Company Admin & Employee
    console.log("👥 Creating Company Users...");
    const michael = await prisma.user.upsert({
        where: { email: "michael@innovate.com" },
        update: {},
        create: {
            email: "michael@innovate.com",
            name: "Michael Manager",
            password: hashedPassword,
            role: UserRole.COMPANY_ADMIN,
            companyId: innovate.id,
            isActive: true,
        }
    });

    const emma = await prisma.user.upsert({
        where: { email: "emma@innovate.com" },
        update: {},
        create: {
            email: "emma@innovate.com",
            name: "Emma Employee",
            password: hashedPassword,
            role: UserRole.EMPLOYEE,
            companyId: innovate.id,
            isActive: true,
        }
    });

    // 6. Approval Workflow for Innovate
    console.log("⚙️ Creating Workflow...");
    const workflow = await prisma.approvalWorkflow.upsert({
        where: { companyId: innovate.id },
        update: {},
        create: {
            name: "Standard Approval",
            companyId: innovate.id,
            steps: {
                create: [
                    {
                        name: "Manager Approval",
                        order: 1,
                        approvers: {
                            connect: { id: michael.id }
                        }
                    }
                ]
            }
        },
        include: { steps: true }
    });

    // 7. Trip Requests
    console.log("🚢 Creating Trip Requests...");

    // Check for existing requests to avoid unique constraint issues if running twice
    const existingRequests = await prisma.tripRequest.findMany({
        where: { userId: emma.id }
    });

    if (existingRequests.length === 0) {
        // Request 1: Draft
        await prisma.tripRequest.create({
            data: {
                title: "Client Visit - London",
                destination: "London, UK",
                startDate: new Date("2026-03-01"),
                endDate: new Date("2026-03-10"),
                status: RequestStatus.DRAFT,
                userId: emma.id,
                companyId: innovate.id,
                purpose: "Meeting with major stakeholders in the London office.",
            }
        });

        // Request 2: Pending Approval
        await prisma.tripRequest.create({
            data: {
                title: "Tech Conference - SF",
                destination: "San Francisco, USA",
                startDate: new Date("2026-04-15"),
                endDate: new Date("2026-04-20"),
                status: RequestStatus.PENDING_COMPANY_APPROVAL,
                userId: emma.id,
                companyId: innovate.id,
                purpose: "Annual JS Conference.",
                approvalSteps: {
                    create: [
                        {
                            stepId: workflow.steps[0].id,
                            status: ApprovalStatus.PENDING,
                        }
                    ]
                }
            }
        });

        // Request 3: Booked (Historical/Completed)
        await prisma.tripRequest.create({
            data: {
                title: "Team Building - Bali",
                destination: "Bali, Indonesia",
                startDate: new Date("2025-12-01"),
                endDate: new Date("2025-12-07"),
                status: RequestStatus.BOOKED,
                userId: emma.id,
                companyId: innovate.id,
                assignedAgentId: joyTravels.id,
                purpose: "End of year team retreat.",
                messages: {
                    create: [
                        {
                            senderId: emma.id,
                            content: "Hi Sarah, can you please book the resort in Ubud?"
                        },
                        {
                            senderId: (await prisma.user.findFirst({ where: { email: "sarah@joytravels.com" } }))!.id,
                            content: "Sure Emma! Booking confirmed for Maya Ubud."
                        }
                    ]
                }
            }
        });
    }

    // 8. Activity Logs
    console.log("📝 Creating Activity Logs...");
    await prisma.activityLog.createMany({
        data: [
            {
                companyId: innovate.id,
                actorId: emma.id,
                action: "TRIP_REQUEST_CREATED",
                description: "Emma created a new trip request for London",
            },
            {
                companyId: innovate.id,
                actorId: michael.id,
                action: "USER_JOINED",
                description: "Michael joined Innovate Corp as Company Admin",
            }
        ]
    });

    console.log("✨ Seed completed successfully.");
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
