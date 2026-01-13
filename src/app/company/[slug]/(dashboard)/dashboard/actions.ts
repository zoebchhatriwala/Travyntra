"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma, ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { TripPreferences, TripPreferencesSchema } from "@/lib/types/trip-preferences";
import { type Money, parseMoney, moneyToDecimal } from "@/lib/types/money";
import { convertMoney } from "@/lib/services/currency";

/**
 * Represents a location/destination structure with extensible properties.
 */
interface Location {
    city?: string;
    formatted?: string;
    [key: string]: Prisma.InputJsonValue | undefined;
}

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

    const activeRequests = await prisma.tripRequest.count({
        where: {
            userId,
            status: {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED', 'DRAFT']
            }
        }
    });

    const completedTrips = await prisma.tripRequest.count({
        where: {
            userId,
            status: 'COMPLETED'
        }
    });

    const recentRequests = await prisma.tripRequest.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            budget: true,
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
            return {
                id: req.id,
                title: req.title,
                status: req.status,
                createdAt: req.createdAt,
                budget: moneyToDecimal(money),
                currency: money?.currencyCode || company?.currency || "USD"
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
        userId,
        OR: query ? [
            { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
            // Can add more fields if needed, e.g. location if available. 
            // For now title is the main textual field on TripRequest usually.
        ] : undefined,
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
            return {
                id: req.id,
                title: req.title,
                status: req.status,
                createdAt: req.createdAt,
                budget: moneyToDecimal(money),
                currency: money?.currencyCode || company?.currency || "USD"
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
        destination: (trip.destination as unknown as Location)?.city || (trip.destination as unknown as Location)?.formatted || "Unknown Destination"
    }));
}

/**
 * Fetches all documents (assets) linked to the user's trip requests.
 * Includes tickets, visas, and other fulfillment artifacts.
 * 
 * @returns {Promise<Array>} List of employee assets/documents.
 */
export async function getEmployeeAssets() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const userId = session.user.id;

    // Fetch documents linked to the user's trip requests
    const documents = await prisma.document.findMany({
        where: {
            request: {
                userId: userId
            }
        },
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
    });

    return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        url: doc.url,
        createdAt: doc.createdAt,
        tripTitle: doc.request?.title || "Unknown Trip",
        tripDestination: (doc.request?.destination as unknown as Location)?.city || (doc.request?.destination as unknown as Location)?.formatted || "Unknown",
        uploadedBy: doc.uploader.name || "Unknown",
        uploaderRole: doc.uploader.role
    }));
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
    destination: Location;
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

        // Fetch company workflow
        const workflow = await prisma.approvalWorkflow.findUnique({
            where: { companyId: session.user.companyId },
            include: {
                steps: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        // Create the trip request
        const request = await prisma.tripRequest.create({
            data: {
                userId: session.user.id,
                companyId: session.user.companyId,
                title: data.title,
                destination: data.destination,
                startDate: data.startDate,
                endDate: data.endDate,
                purpose: data.purpose,
                budget: data.budget ? (data.budget as unknown as Prisma.InputJsonValue) : undefined,
                preferences: data.preferences ?? {},
                isGroup: data.isGroup || false,
                parentTripId: data.parentTripId || null,
                status: workflow && workflow.steps.length > 0 ? 'PENDING_COMPANY_APPROVAL' : 'DRAFT',
            }
        });

        // Add a system message to the discussion
        await prisma.message.create({
            data: {
                requestId: request.id,
                senderId: session.user.id,
                content: `🚀 Trip request created: **${data.title}** to **${data.destination?.city || data.destination?.formatted || 'Destination'}**.`
            }
        });

        // If workflow exists, create approval steps
        if (workflow && workflow.steps.length > 0) {
            // Re-fetch steps to ensure correct ordering and include approvers for notification
            const stepsWithApprovers = await prisma.workflowStep.findMany({
                where: { workflowId: workflow.id, deletedAt: null },
                orderBy: { order: 'asc' },
                include: { approvers: { select: { id: true, name: true } } }
            });

            await prisma.requestApprovalStep.createMany({
                data: stepsWithApprovers.map((step, index) => ({
                    requestId: request.id,
                    stepId: step.id,
                    status: index === 0 ? ApprovalStatus.PENDING : ApprovalStatus.WAITING
                }))
            });

            // Notify Step 1 approvers
            const firstStep = stepsWithApprovers[0];
            if (firstStep) {
                const { createNotification } = await import("@/lib/notifications");

                await Promise.all(
                    firstStep.approvers.map(approver =>
                        createNotification({
                            userId: approver.id,
                            title: "New Approval Request",
                            message: `"${data.title}" requires your approval (${firstStep.name})`,
                            type: "INFO",
                            link: `/company/${session.user.companySlug}/dashboard/requests/${request.id}`,
                            sendEmail: true
                        })
                    )
                );
            }

            // Create activity log for workflow initiation
            await prisma.activityLog.create({
                data: {
                    companyId: session.user.companyId,
                    actorId: session.user.id,
                    action: 'REQUEST_CREATED',
                    description: `Trip request "${data.title}" created and sent for approval`,
                    metadata: {
                        requestId: request.id,
                        workflowId: workflow.id,
                        stepsCount: workflow.steps.length
                    }
                }
            });
        }

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
                    select: { id: true }
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
                workflow: {
                    orderBy: { timestamp: 'desc' },
                    include: { actor: { select: { name: true, role: true } } }
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
                }
            }
        });

        if (!request) return null;

        // Security check: Ensure the user belongs to the company of the request
        if (request.companyId !== session.user.companyId) {
            return null;
        }

        // Role-based access control
        // If employee, must be owner or collaborator
        if (session.user.role === 'EMPLOYEE') {
            const isOwner = request.userId === session.user.id;
            const isCollaborator = request.collaborators.some(c => c.id === session.user.id);

            if (!isOwner && !isCollaborator) {
                return null;
            }
        }

        // Enhance bids with conversion if necessary
        const companyCurrency = request.company.currency || "USD";
        const bidsWithConversion = await Promise.all(request.bids.map(async (bid) => {
            const amount = bid.amount ? parseMoney(bid.amount) : null;
            let convertedAmount = null;

            if (amount && amount.currencyCode !== companyCurrency) {
                convertedAmount = await convertMoney(amount, companyCurrency);
            }

            return {
                ...bid,
                amount,
                convertedAmount
            };
        }));

        const destinationObj = request.destination as unknown as Location;
        const destinationString = destinationObj?.formatted || destinationObj?.city || (typeof request.destination === 'string' ? request.destination : "Unknown");
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
                destination: (child.destination as unknown as Location)?.city || (child.destination as unknown as Location)?.formatted || "Unknown" // Handle child trips too
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

        // Parse @mentions from the message
        const mentionRegex = /@(\w+)/g;
        const mentions = content.match(mentionRegex);

        if (mentions && mentions.length > 0) {
            // Extract usernames (remove @ symbol)
            const usernames = mentions.map(m => m.substring(1));

            // Find users by name and same company
            const mentionedUsers = await prisma.user.findMany({
                where: {
                    name: { in: usernames },
                    companyId: session.user.companyId,
                    id: { not: session.user.id } // Don't mention yourself
                },
                select: { id: true, name: true }
            });

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
        console.error("Failed to send message:", e);
        return { error: "Failed to send message" };
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
    destination?: Location;
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
                destination: data.destination,
                startDate: data.startDate,
                endDate: data.endDate,
                purpose: data.purpose,
                budget: data.budget !== undefined ? (data.budget as unknown as Prisma.InputJsonValue) : undefined,
                preferences: data.preferences ?? (request.preferences || {}),
                isGroup: data.isGroup !== undefined ? data.isGroup : undefined,
                parentTripId: data.parentTripId !== undefined ? (data.parentTripId === "none" ? null : data.parentTripId) : undefined,
                updatedAt: new Date()
            }
        });

        // Compute changes for the discussion message
        const changes: string[] = [];
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (data.title && data.title !== request.title) changes.push(`- **Title**: "${request.title}" → "${data.title}"`);
        if (data.destination && JSON.stringify(data.destination) !== JSON.stringify(request.destination)) changes.push(`- **Destination**: ${(request.destination as unknown as Location)?.city || 'Old'} → ${(data.destination as unknown as Location)?.city || 'New'}`);
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

        await prisma.tripRequest.delete({
            where: { id: requestId }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests`);

        return { success: true };
    } catch (e) {
        console.error("Failed to delete trip request:", e);
        return { error: "Failed to delete trip request" };
    }
}
