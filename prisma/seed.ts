
import { PrismaClient, UserRole, CompanyStatus, SubscriptionPlan, CompanyType, RequestStatus, ApprovalType, ApprovalStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Creates a Money object containing the amount in the smallest unit and the currency code.
 * 
 * @param {number} amount - The decimal amount (e.g., 10.50).
 * @param {string} [currencyCode="USD"] - ISO 4217 currency code.
 * @param {number} [multiplier=100] - Multiplier for smallest unit calculation.
 * @returns {Object} The Money object structure.
 */
function createMoney(amount: number, currencyCode: string = "USD", multiplier: number = 100) {
    // Calculate the integer representative by multiplying the decimal by the multiplier
    const scaledAmount = amount * multiplier;

    // Round the scaled amount to the nearest integer
    const roundedAmount = Math.round(scaledAmount);

    // Return the resulting Money object
    const result = {
        amount: roundedAmount,
        currencyCode: currencyCode,
        multiplier: multiplier
    };

    return result;
}

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

// Retrieve the database connection URL
const dbUrl = getDatabaseUrl();

// Configuration for the PostgreSQL pool
const poolConfig = {
    connectionString: dbUrl
};

// Initialize the PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Create the Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool);

// Configuration for the Prisma client
const prismaConfig = {
    adapter: adapter
};

// Initialize the Prisma Client instance
const prisma = new PrismaClient(prismaConfig);

// Define the style for person avatars from DiceBear
const DICEBEAR_AVATAR_STYLE = "avataaars";

// Define the style for company logos from DiceBear
const DICEBEAR_COMPANY_STYLE = "identicon";

/**
 * Main execution function for seeding the database with initial data.
 */
async function main() {
    // Log the initiation of the clearing process
    const clearMsg = "💣 Clearing database...";
    console.log(clearMsg);

    try {
        // Sequentially delete records from dependent tables to avoid foreign key constraints issues
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
        // Log a warning if the database clearing fails
        const warningMsg = "Error clearing db:";
        console.warn(warningMsg, e);
    }

    // Log the start of the seeding process
    const seedStartMsg = "🌱 Database cleared. Starting seed...";
    console.log(seedStartMsg);

    // Default password string for all seeded users
    const defaultPassword = "password";
    // Number of salt rounds for bcrypt hashing
    const saltRounds = 10;
    // Generate the password hash
    const passwordHash = await hash(defaultPassword, saltRounds);

    // --- 1. CREATE AGENCY ---
    const agencyCreationMsg = "Creating Agency (UK Based)...";
    console.log(agencyCreationMsg);

    // Seed the primary travel agency - UK Based
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
            logoUrl: `https://api.dicebear.com/9.x/${DICEBEAR_COMPANY_STYLE}/png?seed=global-voyage`,
        }
    });

    // Define the list of agents to create
    const agentsToCreate = [
        { name: "Emma Thompson", email: "emma@globalvoyage.com", role: UserRole.TRAVEL_AGENT }, // Owner/Admin
        { name: "Liam Sterling", email: "liam@globalvoyage.com", role: UserRole.TRAVEL_AGENT }, // Admin
        { name: "Sophie Staff", email: "sophie@globalvoyage.com", role: UserRole.AGENCY_EMPLOYEE }, // Staff member (new role)
    ];

    // Iterate through given agents to create user records
    for (const agentData of agentsToCreate) {
        // Extract properties from agent data
        const agentName = agentData.name;
        const agentEmail = agentData.email;

        // Construct the avatar URL using DiceBear
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${agentName}`;

        // Create the user record for the agent
        await prisma.user.create({
            data: {
                name: agentName,
                email: agentEmail,
                password: passwordHash,
                role: agentData.role,
                companyId: agency.id,
                isActive: true,
                avatarUrl: avatarUrl,
            }
        });
    }

    // --- 2. CREATE CLIENT COMPANY ---
    // Seed the enterprise client company
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

    // Define the list of company administrators
    const adminsToCreate = [
        { name: "Marcus Chen", email: "marcus@nebula.tech" },
        { name: "Sarah Connor", email: "sarah@nebula.tech" },
    ];

    // Iterate through admins list to create records
    for (const adminData of adminsToCreate) {
        const adminName = adminData.name;
        const adminEmail = adminData.email;
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${adminName}`;

        await prisma.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                password: passwordHash,
                role: UserRole.COMPANY_ADMIN,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: avatarUrl,
            }
        });
    }

    // Define the list of company employees
    const employeesToCreate = [
        { name: "David Miller", email: "david@nebula.tech" },
        { name: "Jessica Wu", email: "jessica@nebula.tech" },
        { name: "Raj Patel", email: "raj@nebula.tech" },
    ];

    // Iterate through employees list to create records
    for (const employeeData of employeesToCreate) {
        const empName = employeeData.name;
        const empEmail = employeeData.email;
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=${empName}`;

        await prisma.user.create({
            data: {
                name: empName,
                email: empEmail,
                password: passwordHash,
                role: UserRole.EMPLOYEE,
                companyId: clientCompany.id,
                isActive: true,
                avatarUrl: avatarUrl,
            }
        });
    }

    // Link the client company to the agency through an integration
    await prisma.agencyIntegration.create({
        data: {
            companyId: clientCompany.id,
            agencyId: agency.id,
            status: "ACTIVE"
        }
    });

    // Create the primary approval workflow for the client company
    const workflow = await prisma.approvalWorkflow.create({
        data: {
            name: "Standard Travel Workflow",
            companyId: clientCompany.id,
            isActive: true
        }
    });

    // Fetch the recently created admin users to assign them as workflow approvers
    const adminUsers = await prisma.user.findMany({
        where: {
            companyId: clientCompany.id,
            role: UserRole.COMPANY_ADMIN
        }
    });

    // Transform admin users into a format suitable for Prisma connection
    const approverConnections = adminUsers.map((admin) => {
        return {
            id: admin.id
        };
    });

    // Create the first step of the workflow: Manager Approval
    await prisma.workflowStep.create({
        data: {
            workflowId: workflow.id,
            name: "Manager Approval",
            order: 1,
            type: ApprovalType.ANY,
            approvers: {
                connect: approverConnections
            }
        }
    });

    // Create the second step of the workflow: Finance Approval
    await prisma.workflowStep.create({
        data: {
            workflowId: workflow.id,
            name: "Finance Approval",
            order: 2,
            type: ApprovalType.ALL,
            approvers: {
                connect: approverConnections
            }
        }
    });

    // --- 3. CREATE REQUESTS & OTHER DATA ---
    const genericSeedMsg = "Generating Requests and interactions...";
    console.log(genericSeedMsg);

    // List of placeholder cities for trip requests
    const CITIES = ["New York", "London", "Paris", "Tokyo", "Singapore", "Dublin", "Sydney", "Berlin", "Mumbai", "San Francisco"];

    // List of placeholder titles for trips
    const TRIP_TITLES = ["Client QBR", "Tech Summit", "Product Launch", "Partner Negotiations", "Sales Roadshow"];

    /**
     * Selects a random item from an array.
     */
    const getRandomItem = <T>(arr: T[]): T => {
        const index = Math.floor(Math.random() * arr.length);
        return arr[index];
    };

    /**
     * Generates a random Date within a given range from a start date.
     */
    const getRandomDate = (start: Date, maxDays: number): Date => {
        const date = new Date(start);
        const randomDays = Math.floor(Math.random() * maxDays);
        date.setDate(date.getDate() + randomDays);
        return date;
    };

    // Retrieve all newly created employees from the database
    const employeeRecords = await prisma.user.findMany({
        where: {
            companyId: clientCompany.id,
            role: UserRole.EMPLOYEE
        }
    });

    // Loop through each employee to generate trip requests
    for (const employee of employeeRecords) {
        // determine the number of requests to generate (2 or 3)
        const randomModifier = Math.floor(Math.random() * 2);
        const numToGenerate = 2 + randomModifier;

        // Generate the requests
        for (let i = 0; i < numToGenerate; i++) {
            // Select a random destination city
            const destinationCity = getRandomItem(CITIES);
            const titlePrefix = getRandomItem(TRIP_TITLES);
            const fullTitle = `${titlePrefix} - ${destinationCity}`;

            // Get current date
            const nowTime = new Date();
            const startDateResult = getRandomDate(nowTime, 45);
            const endDateResult = getRandomDate(startDateResult, 7);

            // determine a status for the request based on the loop index
            let status: RequestStatus = RequestStatus.DRAFT;
            const isFirst = i === 0;
            const isSecond = i === 1;

            if (isFirst) {
                status = RequestStatus.PENDING_AGENT_ACTION;
            } else if (isSecond) {
                status = RequestStatus.BOOKED;
            }

            // Define the destination object structure
            const destinationObj = {
                city: destinationCity,
                country: "US",
                formatted: destinationCity
            };

            // Define the budget Money object
            const budgetGenericValue = 2500;
            const budgetMoney = createMoney(budgetGenericValue, "USD");

            // Define user preferences
            const tripPreferences = {
                flight: "Economy Plus",
                hotel: "4-star minimum, near city center"
            };

            // Create the trip request record
            const tripRequest = await prisma.tripRequest.create({
                data: {
                    userId: employee.id,
                    companyId: clientCompany.id,
                    title: fullTitle,
                    destination: destinationObj,
                    startDate: startDateResult,
                    endDate: endDateResult,
                    status: status,
                    purpose: `Business travel for ${fullTitle}`,
                    budget: budgetMoney,
                    preferences: tripPreferences
                }
            });

            // check if the request is beyond the draft stage
            const currentRequestStatus = status;
            const isNonDraft = currentRequestStatus !== RequestStatus.DRAFT;

            // If the request requires agent interaction
            if (isNonDraft) {
                // Assign the agency to the request
                await prisma.tripRequest.update({
                    where: {
                        id: tripRequest.id
                    },
                    data: {
                        assignedAgentId: agency.id
                    }
                });

                // determine the bid status based on the request status
                let bidStatus = "PENDING";
                const isBookedRequest = status === RequestStatus.BOOKED;
                if (isBookedRequest) {
                    bidStatus = "ACCEPTED";
                }

                // Define the bid amount
                const bidVal = 2200;
                const bidMoneyValue = createMoney(bidVal, "GBP"); // Quote in GBP since agent is UK based

                // Create a bid from the agency for the request
                await prisma.agentBid.create({
                    data: {
                        requestId: tripRequest.id,
                        agentId: agency.id,
                        amount: bidMoneyValue,
                        message: "We have composed an itinerary that matches your preferences perfectly.",
                        status: bidStatus
                    }
                });

                // Add an initial message from the employee
                await prisma.message.create({
                    data: {
                        requestId: tripRequest.id,
                        senderId: employee.id,
                        content: "Hi, prefer aisle seats if possible."
                    }
                });

                // identify which agent will respond
                const respondersEmailAddr = "emma@globalvoyage.com";
                const responderUserRecord = await prisma.user.findUnique({
                    where: {
                        email: respondersEmailAddr
                    }
                });

                // Get the ID of the available agent
                const responderAgentId = responderUserRecord?.id;

                // Add a response message from an agent if they exist
                if (responderAgentId) {
                    await prisma.message.create({
                        data: {
                            requestId: tripRequest.id,
                            senderId: responderAgentId,
                            content: "Noted regarding the aisle seat. We found a great hotel 10 mins from the venue."
                        }
                    });
                }

                // If the trip is already booked, create fulfillment items
                if (isBookedRequest) {
                    // Define the set of fulfillment items to create
                    const fulfillmentItemsData = [
                        { requestId: tripRequest.id, title: "British Airways Confirmation.pdf", isCompleted: true, order: 1 },
                        { requestId: tripRequest.id, title: "Hilton Hotel Voucher.pdf", isCompleted: true, order: 2 },
                        { requestId: tripRequest.id, title: "Travel Insurance Policy.pdf", isCompleted: true, order: 3 }
                    ];

                    // Batch create the fulfillment items
                    await prisma.fulfillmentItem.createMany({
                        data: fulfillmentItemsData
                    });
                }
            }
        }
    }

    // --- 3.5. CREATE A TEST REQUEST WITH PENDING APPROVAL ---
    const testRequestCreationLogMsg = "Creating test request with pending approval...";
    console.log(testRequestCreationLogMsg);

    const testEmployeeUser = employeeRecords[0];

    // calculate dates for the test request (14 days from now)
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const testStartTime = Date.now() + (14 * millisecondsInDay);
    const testEndTime = Date.now() + (18 * millisecondsInDay);
    const testStartDateObj = new Date(testStartTime);
    const testEndDateObj = new Date(testEndTime);

    const testBudgetRawValue = 3500;
    const testBudgetMoneyObj = createMoney(testBudgetRawValue, "USD");

    const testTripRequest = await prisma.tripRequest.create({
        data: {
            userId: testEmployeeUser.id,
            companyId: clientCompany.id,
            title: "CES 2026 - Las Vegas",
            destination: {
                city: "Las Vegas",
                country: "US",
            },
            startDate: testStartDateObj,
            endDate: testEndDateObj,
            status: RequestStatus.PENDING_COMPANY_APPROVAL,
            purpose: "Exhibiting our new product line at CES.",
            budget: testBudgetMoneyObj,
            preferences: { flight: "Business Class", hotel: "The Venetian or nearby" }
        }
    });

    const relevantWorkflowSteps = await prisma.workflowStep.findMany({
        where: {
            workflowId: workflow.id,
            deletedAt: null
        },
        orderBy: {
            order: 'asc'
        }
    });

    for (let stepIdx = 0; stepIdx < relevantWorkflowSteps.length; stepIdx++) {
        const stepDefObj = relevantWorkflowSteps[stepIdx];
        let startingStatus: ApprovalStatus = ApprovalStatus.WAITING;
        const isTheFirstStep = stepIdx === 0;
        if (isTheFirstStep) {
            startingStatus = ApprovalStatus.PENDING;
        }

        await prisma.requestApprovalStep.create({
            data: {
                requestId: testTripRequest.id,
                stepId: stepDefObj.id,
                status: startingStatus
            }
        });
    }

    const testWorkflowStepCount = relevantWorkflowSteps.length;
    const testSummaryConclusionMsg = `✓ Created test request "${testTripRequest.title}" with ${testWorkflowStepCount} approval steps`;
    console.log(testSummaryConclusionMsg);

    // --- 3.6. CREATE AN AUTO-APPROVED REQUEST ---
    const autoApprovedRequestMsg = "Creating an auto-approved request (Domestic trip)...";
    console.log(autoApprovedRequestMsg);

    const autoApprovedTrip = await prisma.tripRequest.create({
        data: {
            userId: testEmployeeUser.id,
            companyId: clientCompany.id,
            title: "Internal Strategy Meeting",
            destination: { city: "New York", country: "US", },
            startDate: new Date(Date.now() + (30 * millisecondsInDay)),
            endDate: new Date(Date.now() + (32 * millisecondsInDay)),
            status: RequestStatus.PENDING_AGENT_ACTION,
            purpose: "Q1 Strategy planning with NYC team.",
            budget: createMoney(500, "USD"),
            preferences: { flight: "Economy", hotel: "Near NYC office" }
        }
    });

    for (const step of relevantWorkflowSteps) {
        await prisma.requestApprovalStep.create({
            data: {
                requestId: autoApprovedTrip.id,
                stepId: step.id,
                status: ApprovalStatus.APPROVED,
                metadata: {
                    autoApproved: true,
                    ruleType: "DOMESTIC_TRIP",
                    ruleConfig: { enabled: true },
                    reason: "Domestic trip (USA) auto-approved by policy."
                }
            }
        });
    }

    await prisma.workflowAction.create({
        data: {
            requestId: autoApprovedTrip.id,
            actorId: testEmployeeUser.id,
            action: "AUTO_APPROVED",
            comment: "✅ Trip request auto-approved based on Domestic Trip policy."
        }
    });

    // --- 4. SUPER ADMIN ---
    const superAdminEmail = "admin@travyntra.com";
    const superAdminName = "Zoeb Chhatriwala";
    const superAdminAvatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/png?seed=Zoeb`;

    await prisma.user.create({
        data: {
            email: superAdminEmail,
            name: superAdminName,
            password: passwordHash,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            avatarUrl: superAdminAvatarUrl
        }
    });

    console.log("");
    console.log("✅ Seed Completed!");
    console.log("------------------------------------------------");
    console.log("1. AGENCY: Global Voyage Partners (UK, GBP)");
    console.log("   - Admins: emma@globalvoyage.com, liam@globalvoyage.com");
    console.log("   - Staff:  sophie@globalvoyage.com (Role: AGENCY_EMPLOYEE)");
    console.log("");
    console.log("2. COMPANY: Nebula Innovations (USA, USD)");
    console.log("   - Admins: marcus@nebula.tech, sarah@nebula.tech");
    console.log("   - Staff:  david@nebula.tech, jessica@nebula.tech, raj@nebula.tech");
    console.log("");
    console.log("3. SUPER ADMIN: admin@travyntra.com");
    console.log("------------------------------------------------");
    console.log("Password for all users: 'password'");
    console.log("------------------------------------------------");
}

// Execute the main seeding function
const mainExecution = main();

// Handle completion and errors
mainExecution
    .catch((error) => {
        // Log the exception
        console.error("❌ Seed error:", error);
        // Exit the process with failure code
        process.exit(1);
    })
    .finally(async () => {
        // Terminate the Prisma connection
        await prisma.$disconnect();
        // Terminate the PostgreSQL pool connection
        await pool.end();
    });
