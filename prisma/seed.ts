
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
    const agencyCreationMsg = "Creating Agency...";
    console.log(agencyCreationMsg);

    // Seed the primary travel agency
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

    // Define the list of agents to create
    const agentsToCreate = [
        { name: "John Agent", email: "john@premiumtravel.com" },
        { name: "Sarah Agent", email: "sarah@premiumtravel.com" },
    ];

    // Iterate through given agents to create user records
    for (const agentData of agentsToCreate) {
        // Extract properties from agent data
        const agentName = agentData.name;
        const agentEmail = agentData.email;

        // Construct the avatar URL using DiceBear
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${agentName}`;

        // Create the user record for the agent
        await prisma.user.create({
            data: {
                name: agentName,
                email: agentEmail,
                password: passwordHash,
                role: UserRole.TRAVEL_AGENT,
                companyId: agency.id,
                isActive: true,
                avatarUrl: avatarUrl,
            }
        });
    }

    // --- 2. CREATE CLIENT COMPANY ---
    const clientCreationMsg = "Creating Client Company...";
    console.log(clientCreationMsg);

    // Seed the enterprise client company
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

    // Define the list of company administrators
    const adminsToCreate = [
        { name: "Alice Admin", email: "alice@acme.com" },
        { name: "Bob Admin", email: "bob@acme.com" },
    ];

    // Iterate through admins list to create records
    for (const adminData of adminsToCreate) {
        // Extract properties
        const adminName = adminData.name;
        const adminEmail = adminData.email;

        // Construct avatar URL
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${adminName}`;

        // Create admin user record
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
        { name: "Charlie Employee", email: "charlie@acme.com" },
        { name: "David Employee", email: "david@acme.com" },
        { name: "Eve Employee", email: "eve@acme.com" },
    ];

    // Iterate through employees list to create records
    for (const employeeData of employeesToCreate) {
        // Extract properties
        const empName = employeeData.name;
        const empEmail = employeeData.email;

        // Construct avatar URL
        const avatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=${empName}`;

        // Create employee user record
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
            name: "Standard Approval Workflow",
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
    const CITIES = ["New York", "London", "Paris", "Tokyo", "Singapore", "Dubai", "Sydney", "Berlin"];

    // List of placeholder titles for trips
    const TRIP_TITLES = ["Client Meeting", "Q3 Planning", "Tech Conference", "Partner Summit", "Sales Pitch"];

    /**
     * Selects a random item from an array.
     */
    const getRandomItem = <T>(arr: T[]): T => {
        // Calculate a random index
        const index = Math.floor(Math.random() * arr.length);
        // Return the item at the index
        return arr[index];
    };

    /**
     * Generates a random Date within a given range from a start date.
     */
    const getRandomDate = (start: Date, maxDays: number): Date => {
        // Create a copy of the start date
        const date = new Date(start);
        // Calculate a random number of days to add
        const randomDays = Math.floor(Math.random() * maxDays);
        // Update the date object
        date.setDate(date.getDate() + randomDays);
        // Return the resulting date
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
            // Select a random title prefix
            const titlePrefix = getRandomItem(TRIP_TITLES);
            // Construct the full trip title
            const fullTitle = `${titlePrefix} - ${destinationCity}`;

            // Get current date
            const nowTime = new Date();
            // Generate a random start date within 30 days
            const startDateResult = getRandomDate(nowTime, 30);
            // Generate a random end date within 5 days of start
            const endDateResult = getRandomDate(startDateResult, 5);

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
                country: "Various",
                formatted: destinationCity
            };

            // Define the budget Money object
            const budgetGenericValue = 2500;
            const budgetMoney = createMoney(budgetGenericValue, "USD");

            // Define user preferences
            const tripPreferences = {
                flight: "Economy",
                hotel: "Central location"
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
                const bidMoneyValue = createMoney(bidVal, "USD");

                // Create a bid from the agency for the request
                await prisma.agentBid.create({
                    data: {
                        requestId: tripRequest.id,
                        agentId: agency.id,
                        amount: bidMoneyValue,
                        message: "We have found a great deal for your trip.",
                        status: bidStatus
                    }
                });

                // Add an initial message from the employee
                await prisma.message.create({
                    data: {
                        requestId: tripRequest.id,
                        senderId: employee.id,
                        content: "I need to be close to the convention center."
                    }
                });

                // identify which agent will respond
                const respondersEmailAddr = "john@premiumtravel.com";
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
                            content: "We've selected a hotel just 2 blocks away."
                        }
                    });
                }

                // If the trip is already booked, create fulfillment items
                if (isBookedRequest) {
                    // Define the set of fulfillment items to create
                    const fulfillmentItemsData = [
                        { requestId: tripRequest.id, title: "Flight Tickets", isCompleted: true, order: 1 },
                        { requestId: tripRequest.id, title: "Hotel Voucher", isCompleted: true, order: 2 },
                        { requestId: tripRequest.id, title: "Travel Insurance", isCompleted: true, order: 3 }
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

    // Select the first employee as the author of the test request
    const testEmployeeUser = employeeRecords[0];

    // calculate dates for the test request (14 days from now)
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const testStartTime = Date.now() + (14 * millisecondsInDay);
    const testEndTime = Date.now() + (18 * millisecondsInDay);
    const testStartDateObj = new Date(testStartTime);
    const testEndDateObj = new Date(testEndTime);

    // Define the budget for the test request
    const testBudgetRawValue = 3500;
    const testBudgetMoneyObj = createMoney(testBudgetRawValue, "USD");

    // Create the test trip request record
    const testTripRequest = await prisma.tripRequest.create({
        data: {
            userId: testEmployeeUser.id,
            companyId: clientCompany.id,
            title: "Annual Conference - San Francisco",
            destination: { city: "San Francisco", country: "USA", formatted: "San Francisco, CA, USA" },
            startDate: testStartDateObj,
            endDate: testEndDateObj,
            status: RequestStatus.PENDING_COMPANY_APPROVAL,
            purpose: "Attend annual tech conference and meet with west coast clients",
            budget: testBudgetMoneyObj,
            preferences: { flight: "Business", hotel: "Downtown area" }
        }
    });

    // Fetch all active workflow steps for the company
    const relevantWorkflowSteps = await prisma.workflowStep.findMany({
        where: {
            workflowId: workflow.id,
            deletedAt: null
        },
        orderBy: {
            order: 'asc'
        }
    });

    // Initialize request-specific approval steps for the test request
    for (let stepIdx = 0; stepIdx < relevantWorkflowSteps.length; stepIdx++) {
        // Retrieve the workflow step definition
        const stepDefObj = relevantWorkflowSteps[stepIdx];

        // determine the initial status: the first step is active (PENDING), others are WAITING
        let startingStatus: ApprovalStatus = ApprovalStatus.WAITING;
        const isTheFirstStep = stepIdx === 0;
        if (isTheFirstStep) {
            startingStatus = ApprovalStatus.PENDING;
        }

        // Create the request-specific approval step record
        await prisma.requestApprovalStep.create({
            data: {
                requestId: testTripRequest.id,
                stepId: stepDefObj.id,
                status: startingStatus
            }
        });
    }

    // Log the successful creation of the test request
    const testWorkflowStepCount = relevantWorkflowSteps.length;
    const testSummaryConclusionMsg = `✓ Created test request "${testTripRequest.title}" with ${testWorkflowStepCount} approval steps`;
    console.log(testSummaryConclusionMsg);

    // --- 4. SUPER ADMIN ---
    // define parameters for super admin creation
    const superAdminEmail = "admin@travyntra.com";
    const superAdminName = "Zoeb Chhatriwala";
    const superAdminAvatarUrl = `https://api.dicebear.com/9.x/${DICEBEAR_AVATAR_STYLE}/svg?seed=Zoeb`;

    // Create the super administrator record
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

    // Log completion message and summary information
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
