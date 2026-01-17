"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { TripPreferences } from "@/types/request/trip-preferences";
import { TripPreferencesSchema } from "@/lib/schemas/trip-preferences";
import { type Money } from "@/types/finance/money";
import { parseMoney, moneyToDecimal } from "@/lib/utils/money";
import { convertMoney } from "@/lib/services/currency";
import { type PartialAddress, formatAddressShort } from "@/lib/utils/address";

/**
 * Retrieves dashboard statistics for the currently authenticated employee.
 * Returns counts of active/completed trips and the 5 most recent requests.
 * 
 * @returns {Promise<Object|null>} Dashboard stats object or null if unauthenticated.
 */
export async function getEmployeeDashboardStats() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const userId = session.user.id;

    const whereClause: Prisma.TripRequestWhereInput = {
        OR: [
            { userId },
            { collaborators: { some: { id: userId } } }
        ]
    };

    const activeRequests = await prisma.tripRequest.count({
        where: {
            ...whereClause,
            status: {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED', 'DRAFT']
            }
        }
    });

    const completedTrips = await prisma.tripRequest.count({
        where: {
            ...whereClause,
            status: 'COMPLETED'
        }
    });

    const recentRequests = await prisma.tripRequest.findMany({
        where: whereClause,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            budget: true,
            userId: true,
        }
    });

    // Fetch user's company currency
    const company = session.user.companyId ? await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { currency: true }
    }) : null;

    return {
        userName: session.user.name,
        activeRequests,
        completedTrips,
        currency: company?.currency || "USD",
        recentRequests: recentRequests.map(req => {
            const money = req.budget ? parseMoney(req.budget) : null;
            const budgetValue = money ? moneyToDecimal(money) : 0;

            return {
                id: req.id,
                title: req.title,
                status: req.status,
                createdAt: req.createdAt,
                budget: budgetValue,
                currency: money?.currencyCode || company?.currency || "USD",
                isCollaborator: req.userId !== userId
            };
        })
    };
}

/**
 * Fetches a paginated list of trip requests for the current employee.
 * Supports filtering by a search query (title).
 * 
 * @param {Object} params - Query parameters.
 * @param {number} [params.page=1] - Page number.
 * @param {number} [params.limit=10] - Items per page.
 * @param {string} [params.query=""] - Search term for filtering requests.
 * @returns {Promise<Object>} Paginated requests, total count, and total pages.
 */
export async function getEmployeeRequests({
    page = 1,
    limit = 10,
    query = "",
}: {
    page?: number;
    limit?: number;
    query?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { requests: [], total: 0, totalPages: 0 };

    const userId = session.user.id;
    const skip = (page - 1) * limit;

    const where: Prisma.TripRequestWhereInput = {
        AND: [
            {
                OR: [
                    { userId },
                    { collaborators: { some: { id: userId } } }
                ]
            },
            query ? {
                title: { contains: query, mode: Prisma.QueryMode.insensitive }
            } : {}
        ]
    };

    const [total, requests] = await prisma.$transaction([
        prisma.tripRequest.count({ where }),
        prisma.tripRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                budget: true,
                cost: true,
                userId: true,
            },
        }),
    ]);

    // Fetch user's company currency
    const company = session.user.companyId ? await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { currency: true }
    }) : null;

    return {
        requests: requests.map(req => {
            const money = req.budget ? parseMoney(req.budget) : null;
            const budgetValue = money ? moneyToDecimal(money) : 0;
            return {
                id: req.id,
                title: req.title,
                status: req.status,
                createdAt: req.createdAt,
                budget: budgetValue,
                cost: req.cost ? moneyToDecimal(parseMoney(req.cost)) : null,
                currency: (req.cost ? parseMoney(req.cost)?.currencyCode : money?.currencyCode) || company?.currency || "USD",
                isCollaborator: req.userId !== userId
            };
        }),
        currency: company?.currency || "USD",
        total,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Retrieves a list of active group trips associated with the user's company.
 * Used for linking individual requests to parent group trips.
 * 
 * @returns {Promise<Array>} List of group trips with summary details.
 */
export async function getCompanyGroupTrips() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return [];

    const groupTrips = await prisma.tripRequest.findMany({
        where: {
            companyId: session.user.companyId,
            isGroup: true,
            status: {
                notIn: ['CANCELLED', 'REJECTED']
            }
        },
        orderBy: {
            startDate: 'desc'
        },
        select: {
            id: true,
            title: true,
            destination: true,
            startDate: true,
            endDate: true,
            _count: {
                select: { childTrips: true }
            }
        }
    });

    return groupTrips.map((trip) => ({
        ...trip,
        destination: formatAddressShort(trip.destination as unknown as PartialAddress)
    }));
}

/**
 * Fetches all documents (assets) linked to the user's trip requests.
 * Includes tickets, visas, and other fulfillment artifacts.
 * 
 * @returns {Promise<Array>} List of employee assets/documents.
 */
export async function getEmployeeAssets({
    page = 1,
    limit = 12,
    query = "",
    type = "ALL"
}: {
    page?: number;
    limit?: number;
    query?: string;
    type?: string;
} = {}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { documents: [], total: 0, totalPages: 0 };

    const userId = session.user.id;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
        request: {
            userId: userId
        },
        // Filter by type if provided and not "ALL"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(type && type !== "ALL" ? { type: type as any } : {}),
        // Search by name or trip title
        ...(query ? {
            OR: [
                { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
                { request: { title: { contains: query, mode: Prisma.QueryMode.insensitive } } }
            ]
        } : {})
    };

    // Transaction to get count and documents
    const [total, documents] = await prisma.$transaction([
        prisma.document.count({ where }),
        prisma.document.findMany({
            where,
            skip,
            take: limit,
            include: {
                request: {
                    select: {
                        title: true,
                        destination: true,
                        startDate: true,
                    }
                },
                uploader: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    ]);

    return {
        documents: documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            url: doc.url,
            createdAt: doc.createdAt,
            tripTitle: doc.request?.title || "Unknown Trip",
            tripDestination: formatAddressShort(doc.request?.destination as unknown as PartialAddress),
            uploadedBy: doc.uploader.name || "Unknown",
            uploaderRole: doc.uploader.role
        })),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
}

/**
 * Updates the profile information of the current authenticated user.
 * 
 * @param {FormData} formData - Form data containing profile fields (e.g., name).
 * @returns {Promise<Object>} Success message or error object.
 */
export async function updateEmployeeProfile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    const name = formData.get("name") as string;
    // const email - usually immutable for now without verification

    if (!name || name.length < 2) {
        return { error: "Name must be at least 2 characters." };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { name }
        });

        // Trigger session update implicitly by revalidating
        revalidatePath("/company/[slug]/dashboard/settings", "page");
        return { success: "Profile updated successfully." };
    } catch {
        return { error: "Failed to update profile." };
    }
}



/**
 * Creates a new trip request for the current user.
 * Initiates the approval workflow if configured for the company.
 * 
 * @param {Object} data - Trip request payload.
 * @param {string} data.title - Title of the trip.
 * @param {Location} data.destination - Destination object.
 * @param {Date} data.startDate - Trip start date.
 * @param {Date} data.endDate - Trip end date.
 * @param {string} [data.purpose] - Purpose of the trip.
 * @param {Money} [data.budget] - Estimated budget.
 * @param {TripPreferences} [data.preferences] - Travel preferences (flight, hotel, etc.).
 * @param {boolean} [data.isGroup] - Whether this is a group trip leader request.
 * @param {string} [data.parentTripId] - ID of parent group trip to link to.
 * @returns {Promise<Object>} Success result with requestId or error object.
 */
export async function createTripRequest(data: {
    title: string;
    destination: PartialAddress;
    startDate: Date;
    endDate: Date;
    purpose?: string;
    budget?: Money;
    preferences?: TripPreferences;
    isGroup?: boolean;
    parentTripId?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    try {
        // Validate preferences if provided
        if (data.preferences) {
            const result = TripPreferencesSchema.safeParse(data.preferences);
            if (!result.success) {
                console.error("Invalid preferences format:", result.error);
            }
        }


        // Create the trip request
        const request = await prisma.tripRequest.create({
            data: {
                userId: session.user.id,
                companyId: session.user.companyId,
                title: data.title,
                destination: data.destination as unknown as Prisma.InputJsonValue,
                startDate: data.startDate,
                endDate: data.endDate,
                purpose: data.purpose,
                budget: data.budget ? (data.budget as unknown as Prisma.InputJsonValue) : undefined,
                preferences: (data.preferences ?? {}) as unknown as Prisma.InputJsonValue,
                isGroup: data.isGroup || false,
                parentTripId: data.parentTripId || null,
                status: 'DRAFT', // WorkflowEngine will update this
            }
        });

        // Add a system message to the discussion
        await prisma.message.create({
            data: {
                requestId: request.id,
                senderId: session.user.id,
                content: `🚀 Trip request created: **${data.title}** to **${formatAddressShort(data.destination)}**.`
            }
        });

        // Initialize the approval workflow
        const { WorkflowEngine } = await import("@/lib/workflow-engine");
        await WorkflowEngine.startWorkflow(request.id);

        revalidatePath(`/company/${session.user.companySlug}/dashboard`);
        return { success: true, requestId: request.id };
    } catch (e) {
        console.error("Failed to create trip request:", e);
        return { error: "Failed to create trip request." };
    }
}

/**
 * Fetches detailed information for a specific trip request.
 * Includes security checks for multi-tenancy and role-based access.
 * Automatically performs currency conversion for all associated agent bids based on the company's currency.
 * 
 * @param {string} requestId - The unique identifier of the trip request.
 * @returns {Promise<Object|null>} The enhanced trip request object or null if not found/unauthorized.
 */
export async function getTripRequest(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: {
                user: {
                    select: { name: true, avatarUrl: true, email: true }
                },
                company: {
                    select: { currency: true, name: true }
                },
                collaborators: {
                    select: { id: true, name: true, email: true, avatarUrl: true, role: true }
                },
                bids: {
                    include: {
                        agent: {
                            select: { name: true, logoUrl: true }
                        }
                    },
                    orderBy: { amount: 'asc' }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { name: true, avatarUrl: true, role: true, company: { select: { name: true } } } } }
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    include: { uploader: { select: { name: true } } }
                },
                parentTrip: {
                    select: { id: true, title: true }
                },
                childTrips: {
                    include: {
                        user: {
                            select: { name: true, avatarUrl: true }
                        }
                    }
                },
                approvalSteps: {
                    include: {
                        approvals: true
                    }
                }
            }
        });

        if (!request) return null;

        // Security check: Ensure the user belongs to the company of the request
        if (request.companyId !== session.user.companyId) {
            return null;
        }

        // Role-based access control
        // If employee, must be owner or collaborator OR an assigned approver
        if (session.user.role === 'EMPLOYEE') {
            const isOwner = request.userId === session.user.id;
            const isCollaborator = request.collaborators.some(c => c.id === session.user.id);
            const isApprover = request.approvalSteps.some(step =>
                step.approvals.some(approval => approval.userId === session.user.id)
            );

            if (!isOwner && !isCollaborator && !isApprover) {
                return null;
            }
        }

        // Enhance bids with conversion if necessary
        const companyCurrency = request.company.currency || "USD";
        const bidsWithConversion = await Promise.all(request.bids.map(async (bid) => {
            const amount = bid.amount ? parseMoney(bid.amount) : null;
            let convertedAmount = null;
            let totalAmount = null;

            if (amount) {
                // Calculate total including taxes for the conversion preview
                let totalDecimal = moneyToDecimal(amount);
                const bidWithTaxes = bid as unknown as { taxes?: { type: string; value: number }[] };
                const taxes = bidWithTaxes.taxes || [];

                if (taxes.length > 0) {
                    taxes.forEach(t => {
                        if (t.type === 'PERCENTAGE') {
                            totalDecimal += (moneyToDecimal(amount) * (t.value || 0)) / 100;
                        } else {
                            totalDecimal += (t.value || 0);
                        }
                    });
                }

                // Create a temporary Money object for the total to convert
                // We use the same currency code as the base amount
                const { createMoney } = await import("@/lib/utils/money");
                totalAmount = createMoney(totalDecimal, amount.currencyCode);

                if (amount.currencyCode !== companyCurrency) {
                    convertedAmount = await convertMoney(totalAmount, companyCurrency);
                }
            }

            return {
                id: bid.id,
                status: bid.status,
                message: bid.message,
                createdAt: bid.createdAt,
                updatedAt: bid.updatedAt,
                requestId: bid.requestId,
                agentId: bid.agentId,
                agent: bid.agent,
                amount,
                totalAmount, // Return total in original currency
                convertedAmount
            };
        }));

        const destinationObj = request.destination as unknown as PartialAddress;
        const destinationString = formatAddressShort(destinationObj);
        const hasDetails = destinationObj && typeof destinationObj === 'object' && !Array.isArray(destinationObj);

        return {
            ...request,
            companyCurrency, // Return company's base currency
            destination: destinationString,
            purpose: request.purpose || "",
            isGroup: request.isGroup || false,
            parentTripId: request.parentTripId || undefined,
            preferences: (request.preferences as unknown as TripPreferences) || undefined,
            destinationDetails: hasDetails ? destinationObj : undefined,
            budget: request.budget ? parseMoney(request.budget) : null,
            cost: request.cost ? parseMoney(request.cost) : null,
            bids: bidsWithConversion,
            childTrips: request.childTrips.map((child) => ({
                ...child,
                budget: child.budget ? parseMoney(child.budget) : null,
                destination: formatAddressShort(child.destination as unknown as PartialAddress)
            })),
        };
    } catch (e) {
        console.error("Error fetching request:", e);
        return null;
    }
}


/**
 * Posts a new message/comment to a trip request's discussion thread.
 * Handles @mentions to automatically add collaborators and send notifications.
 * 
 * @param {string} requestId - ID of the trip request.
 * @param {string} content - Message content (markdown supported).
 * @returns {Promise<Object>} Success result or error object.
 */
export async function postTripMessage(requestId: string, content: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    if (!content.trim()) return { error: "Message cannot be empty" };

    // Fetch request details primarily to know the creator and context
    const request = await prisma.tripRequest.findUnique({
        where: { id: requestId },
        include: {
            collaborators: { select: { id: true } },
            company: { select: { slug: true } }
        }
    });

    if (!request) return { error: "Request not found" };

    try {
        // Create the message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content
            }
        });

        const { createNotification } = await import("@/lib/notifications");
        const notifiedUserIds = new Set<string>();

        // Parse @mentions from the message - find users whose names appear after an @
        // First, get all active users in the company to check against
        const companyUsers = await prisma.user.findMany({
            where: {
                companyId: session.user.companyId,
                isActive: true,
                id: { not: session.user.id } // Don't mention yourself
            },
            select: { id: true, name: true }
        });

        const sortedUsers = [...companyUsers].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
        const mentionedUsers: typeof companyUsers = [];
        let tempContent = content;

        for (const user of sortedUsers) {
            if (!user.name) continue;
            const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const mentionRegex = new RegExp(`@${escapedName}(?:\\s|[.,!?]|$)`, 'i');

            if (mentionRegex.test(tempContent)) {
                mentionedUsers.push(user);
                // Replace the mention in tempContent to avoid matching shorter names that might be part of this name
                tempContent = tempContent.replace(new RegExp(`@${escapedName}`, 'gi'), ' __MENTIONED__ ');
            }
        }

        if (mentionedUsers.length > 0) {
            const currentCollaboratorIds = request.collaborators.map(c => c.id);
            const newCollaboratorIds = mentionedUsers
                .filter(u => !currentCollaboratorIds.includes(u.id))
                .map(u => u.id);

            // Add new collaborators
            if (newCollaboratorIds.length > 0) {
                await prisma.tripRequest.update({
                    where: { id: requestId },
                    data: {
                        collaborators: {
                            connect: newCollaboratorIds.map(id => ({ id }))
                        }
                    }
                });
            }

            // Create notifications for all mentioned users
            await Promise.all(
                mentionedUsers.map(async (user) => {
                    notifiedUserIds.add(user.id);
                    return createNotification({
                        userId: user.id,
                        title: "You were mentioned",
                        message: `${session.user.name} mentioned you in "${request.title}"`,
                        type: "INFO",
                        link: `/company/${request.company.slug}/dashboard/requests/${requestId}`
                    });
                })
            );
        }

        // Notify Request Creator (if not sender and not already notified via mention)
        if (request.userId !== session.user.id && !notifiedUserIds.has(request.userId)) {
            await createNotification({
                userId: request.userId,
                title: "New message on your request",
                message: `${session.user.name} commented on "${request.title}"`,
                type: "INFO",
                link: `/company/${request.company.slug}/dashboard/requests/${requestId}`
            });
        }

        if (request.company.slug) {
            revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);
        }

        return { success: true };
    } catch (e) {
        console.error("Failed to post message:", e);
        return { error: "Failed to post message" };
    }
}

/**
 * Get all messages for a specific trip request
 */
export async function getTripMessages(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    try {
        const messages = await prisma.message.findMany({
            where: { requestId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: {
                        name: true,
                        role: true,
                        avatarUrl: true,
                        company: { select: { name: true } }
                    }
                }
            }
        });

        // Convert dates to strings/compatible types if needed, or return as is (Next.js handles Dates in Server Actions usually,
        // but for Client Components, they are serialized. Let's return objects that are compatible with the Message interface)
        return messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt, // Will be serialized to string over wire
            senderId: msg.senderId,
            sender: {
                name: msg.sender.name,
                avatarUrl: msg.sender.avatarUrl,
                role: msg.sender.role,
                company: msg.sender.company
            }
        }));
    } catch (e) {
        console.error("Failed to fetch messages:", e);
        return [];
    }
}

/**
 * Uploads one or more file attachments to a request discussion.
 * Enforces file size limits and allowed counts.
 * 
 * @param {FormData} formData - Contains 'files' and 'requestId'.
 * @returns {Promise<Object>} Success result with URLs or error object.
 */
export async function uploadMessageAttachment(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const files = formData.getAll('files') as File[];
        const requestId = formData.get('requestId') as string;

        if (!files || files.length === 0) {
            return { error: "No files provided" };
        }

        if (files.length > 5) {
            return { error: "Maximum 5 files allowed" };
        }

        // Validate file sizes (max 10MB per file)
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                return { error: `File ${file.name} exceeds 10MB limit` };
            }
        }

        // Use the existing storage system (local for dev, S3 for production)
        const { uploadFile } = await import("@/lib/storage");

        const uploadPromises = files.map(async (file) => {
            try {
                // Upload to messages folder with request context
                const url = await uploadFile(file, `messages/${requestId}`);
                return { success: true, url, name: file.name };
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                return { success: false, url: null, name: file.name };
            }
        });

        const results = await Promise.all(uploadPromises);

        // Check if any uploads failed
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return { error: `Failed to upload: ${failed.map(f => f.name).join(', ')}` };
        }

        const urls = results.map(r => r.url).filter(Boolean) as string[];

        return { success: true, urls };
    } catch (e) {
        console.error("File upload error:", e);
        return { error: "Failed to upload files" };
    }
}

/**
 * Updates an existing trip request.
 * Only allows updates if the request is in an editable status (DRAFT or PENDING).
 * Logs significant changes to the discussion thread and activity log.
 * 
 * @param {string} requestId - ID of the request to update.
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>} Success result or error object.
 */
export async function updateTripRequest(requestId: string, data: {
    title?: string;
    destination?: PartialAddress;
    startDate?: Date;
    endDate?: Date;
    purpose?: string;
    budget?: Money;
    preferences?: TripPreferences;
    isGroup?: boolean;
    parentTripId?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        // Validate preferences if provided
        if (data.preferences) {
            const result = TripPreferencesSchema.safeParse(data.preferences);
            if (!result.success) {
                console.error("Invalid preferences format:", result.error);
                // Can soft fail or throw
            }
        }

        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: {
                userId: true,
                status: true,
                companyId: true,
                title: true,
                destination: true,
                startDate: true,
                endDate: true,
                purpose: true,
                budget: true,
                preferences: true,
                isGroup: true,
                parentTripId: true
            }
        });

        if (!request) return { error: "Request not found" };

        const isOwner = request.userId === session.user.id;
        const isAdmin = session.user.role === 'COMPANY_ADMIN' || session.user.role === 'SUPER_ADMIN';

        // Only owner or admin can update
        if (!isOwner && !isAdmin) {
            return { error: "You are not authorized to update this request" };
        }

        // Only allowed to update if it's a DRAFT or PENDING_COMPANY_APPROVAL
        const unupdatableStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED'];
        if (unupdatableStatuses.includes(request.status)) {
            return { error: `Cannot update a request that is already ${request.status.toLowerCase()}` };
        }

        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                title: data.title,
                destination: data.destination ? (data.destination as unknown as Prisma.InputJsonValue) : undefined,
                startDate: data.startDate,
                endDate: data.endDate,
                purpose: data.purpose,
                budget: data.budget !== undefined ? (data.budget as unknown as Prisma.InputJsonValue) : undefined,
                preferences: (data.preferences ?? (request.preferences || {})) as unknown as Prisma.InputJsonValue,
                isGroup: data.isGroup !== undefined ? data.isGroup : undefined,
                parentTripId: data.parentTripId !== undefined ? (data.parentTripId === "none" ? null : data.parentTripId) : undefined,
                updatedAt: new Date()
            }
        });

        // Compute changes for the discussion message
        const changes: string[] = [];
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (data.title && data.title !== request.title) changes.push(`- **Title**: "${request.title}" → "${data.title}"`);
        if (data.destination && JSON.stringify(data.destination) !== JSON.stringify(request.destination)) changes.push(`- **Destination**: ${formatAddressShort(request.destination as unknown as PartialAddress)} → ${formatAddressShort(data.destination)}`);
        if (data.startDate && data.startDate.getTime() !== new Date(request.startDate).getTime()) changes.push(`- **Start Date**: ${formatDate(request.startDate)} → ${formatDate(data.startDate)}`);
        if (data.endDate && data.endDate.getTime() !== new Date(request.endDate).getTime()) changes.push(`- **End Date**: ${formatDate(request.endDate)} → ${formatDate(data.endDate)}`);
        if (data.purpose && data.purpose !== request.purpose) changes.push(`- **Purpose**: Updated`);
        if (data.budget !== undefined) {
            const oldBudget = request.budget ? moneyToDecimal(parseMoney(request.budget)) : 0;
            const newBudget = moneyToDecimal(data.budget);
            if (newBudget !== oldBudget) {
                changes.push(`- **Budget**: ${oldBudget} → ${newBudget}`);
            }
        }

        if (data.preferences) {
            const oldPrefs = JSON.stringify(request.preferences || {});
            const newPrefs = JSON.stringify(data.preferences);
            if (oldPrefs !== newPrefs) {
                changes.push(`- **Preferences**: Requirements updated`);
            }
        }

        const changeMsg = changes.length > 0 ? `\n\n**Changes:**\n${changes.join('\n')}` : '';

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.companyId,
                actorId: session.user.id,
                action: 'REQUEST_UPDATED',
                description: `Trip request "${data.title || request.title}" was updated by ${session.user.role === 'COMPANY_ADMIN' ? 'an admin' : 'the user'}`,
                metadata: { requestId }
            }
        });

        // Add a system message to the discussion
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Request Updated** ${changeMsg}`
            }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);

        // Revalidate auto-approval/workflow ONLY if significant changes occurred
        // We define significant changes as any change to the trip parameters handled above
        if (changes.length > 0) {
            // Check specifically for Destination change (manually approved trips are revoked only on this)
            const destinationChanged = !!(
                data.destination &&
                JSON.stringify(data.destination) !== JSON.stringify(request.destination)
            );

            const { WorkflowEngine } = await import("@/lib/workflow-engine");
            await WorkflowEngine.handleRequestUpdate(requestId, session.user.id, { destinationChanged });
        }

        return { success: true };
    } catch (e) {
        console.error("Failed to update trip request:", e);
        return { error: "Failed to update trip request" };
    }
}

/**
 * Cancels a trip request.
 * Only the owner can cancel, and only if the request is in a cancellable state.
 * 
 * @param {string} requestId - ID of the request to cancel.
 * @returns {Promise<Object>} Success result or error object.
 */
export async function cancelTripRequest(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: { userId: true, status: true, companyId: true, title: true }
        });

        if (!request) return { error: "Request not found" };

        // Only owner can cancel their request
        if (request.userId !== session.user.id) {
            return { error: "You are not authorized to cancel this request" };
        }

        // Only allowed to cancel if not already completed/cancelled/rejected/booked
        const uncancelableStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED', 'BOOKED'];
        if (uncancelableStatuses.includes(request.status)) {
            return { error: `Cannot cancel a request that is already ${request.status.toLowerCase().replace('_', ' ')}` };
        }


        await prisma.tripRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED' }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.companyId,
                actorId: session.user.id,
                action: 'REQUEST_UPDATED',
                description: `Trip request "${request.title}" was cancelled by the user`,
                metadata: { requestId, status: 'CANCELLED' }
            }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests`);
        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Failed to cancel trip request:", e);
        return { error: "Failed to cancel trip request" };
    }
}

/**
 * Permanently deletes a trip request.
 * Only allowed for DRAFT or CANCELLED requests to maintain audit trails for active workflows.
 * 
 * @param {string} requestId - ID of the request to delete.
 * @returns {Promise<Object>} Success result or error object.
 */
export async function deleteTripRequest(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: { userId: true, status: true, companyId: true, title: true }
        });

        if (!request) return { error: "Request not found" };

        // Only owner can delete their request
        if (request.userId !== session.user.id) {
            return { error: "You are not authorized to delete this request" };
        }

        // Only allowed to delete if it's a DRAFT or CANCELLED (cleanup)
        if (request.status !== 'DRAFT' && request.status !== 'CANCELLED') {
            return { error: "Only draft or cancelled requests can be deleted" };
        }

        // Use a transaction to delete all related data to avoid foreign key constraint errors
        await prisma.$transaction(async (tx) => {
            // 1. Unlink child trips if this is a group trip
            await tx.tripRequest.updateMany({
                where: { parentTripId: requestId },
                data: { parentTripId: null }
            });

            // 2. Delete approvals hierarchy
            await tx.userApproval.deleteMany({
                where: { requestApprovalStep: { requestId } }
            });
            await tx.requestApprovalStep.deleteMany({
                where: { requestId }
            });

            // 3. Delete communication and activity
            await tx.message.deleteMany({ where: { requestId } });
            await tx.workflowAction.deleteMany({ where: { requestId } });

            // 4. Delete fulfillment items and associated documents
            // We delete documents first because they reference fulfillment items
            await tx.document.deleteMany({
                where: {
                    OR: [
                        { requestId },
                        { fulfillmentItem: { requestId } }
                    ]
                }
            });
            await tx.fulfillmentItem.deleteMany({ where: { requestId } });

            // 5. Delete commercial records
            await tx.agentBid.deleteMany({ where: { requestId } });
            await tx.expense.deleteMany({ where: { requestId } });
            await tx.invoice.deleteMany({ where: { requestId } });

            // 6. Finally delete the request itself
            await tx.tripRequest.delete({
                where: { id: requestId }
            });
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests`);

        return { success: true };
    } catch (e) {
        console.error("Failed to delete trip request:", e);
        return { error: "Failed to delete trip request" };
    }
}

/**
 * Searches for users within the same company to add as collaborators.
 * 
 * @param {string} query - Search term (name or email).
 * @returns {Promise<Array>} List of matching users.
 */
export async function searchCompanyUsers(query: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) return [];

    if (!query || query.length < 2) return [];

    const users = await prisma.user.findMany({
        where: {
            companyId: session.user.companyId,
            isActive: true,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ],
            // Exclude current user from search
            id: { not: session.user.id }
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
        },
        take: 10
    });

    return users;
}

/**
 * Adds a user as a collaborator to a trip request.
 * 
 * @param {string} requestId - ID of the trip request.
 * @param {string} userId - ID of the user to add.
 * @returns {Promise<Object>} Success result or error object.
 */
export async function addCollaborator(requestId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: { id: true, userId: true, title: true, companyId: true, company: { select: { slug: true } } }
        });

        if (!request) return { error: "Request not found" };

        // Security: Ensure request belongs to user's company
        if (request.companyId !== session.user.companyId) {
            return { error: "Unauthorized" };
        }

        // Authorization: Only owner or admin can add collaborators
        const isAdmin = session.user.role === 'COMPANY_ADMIN' || session.user.role === 'SUPER_ADMIN';
        if (request.userId !== session.user.id && !isAdmin) {
            return { error: "Only the request owner or an admin can add collaborators" };
        }

        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                collaborators: {
                    connect: { id: userId }
                }
            }
        });

        const { createNotification } = await import("@/lib/notifications");

        await createNotification({
            userId,
            title: "Added as collaborator",
            message: `${session.user.name} added you as a collaborator on "${request.title}"`,
            type: "INFO",
            link: `/company/${request.company.slug}/dashboard/requests/${requestId}`
        });

        revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Failed to add collaborator:", e);
        return { error: "Failed to add collaborator" };
    }
}

/**
 * Removes a user from the collaborators list of a trip request.
 * 
 * @param {string} requestId - ID of the trip request.
 * @param {string} userId - ID of the user to remove.
 * @returns {Promise<Object>} Success result or error object.
 */
export async function removeCollaborator(requestId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: { id: true, userId: true, companyId: true, company: { select: { slug: true } } }
        });

        if (!request) return { error: "Request not found" };

        // Security: Ensure request belongs to user's company
        if (request.companyId !== session.user.companyId) {
            return { error: "Unauthorized" };
        }

        // Authorization: Owner, Admin, or the collaborator themselves can remove
        const isAdmin = session.user.role === 'COMPANY_ADMIN' || session.user.role === 'SUPER_ADMIN';
        const isSelf = userId === session.user.id;
        if (request.userId !== session.user.id && !isAdmin && !isSelf) {
            return { error: "Not authorized to remove this collaborator" };
        }

        await prisma.tripRequest.update({
            where: { id: requestId },
            data: {
                collaborators: {
                    disconnect: { id: userId }
                }
            }
        });

        revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Failed to remove collaborator:", e);
        return { error: "Failed to remove collaborator" };
    }
}
