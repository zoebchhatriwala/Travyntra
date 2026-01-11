"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

    return {
        userName: session.user.name,
        activeRequests,
        completedTrips,
        recentRequests: recentRequests.map(req => ({
            id: req.id,
            title: req.title,
            status: req.status,
            createdAt: req.createdAt,
            budget: Number(req.budget || 0)
        }))
    };
}

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

    return {
        requests: requests.map(req => ({
            id: req.id,
            title: req.title,
            status: req.status,
            createdAt: req.createdAt,
            budget: Number(req.budget || 0)
        })),
        total,
        totalPages: Math.ceil(total / limit),
    };
}

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
        tripDestination: doc.request?.destination,
        uploadedBy: doc.uploader.name || "Unknown",
        uploaderRole: doc.uploader.role
    }));
}

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
    } catch (e) {
        return { error: "Failed to update profile." };
    }
}

export async function createTripRequest(data: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    purpose?: string;
    budget?: number;
    preferences?: any;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    try {
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
                budget: data.budget ? new Prisma.Decimal(data.budget) : undefined,
                preferences: data.preferences ?? {},
                status: workflow && workflow.steps.length > 0 ? 'PENDING_COMPANY_APPROVAL' : 'DRAFT',
            }
        });

        // If workflow exists, create approval steps
        if (workflow && workflow.steps.length > 0) {
            await prisma.requestApprovalStep.createMany({
                data: workflow.steps.map(step => ({
                    requestId: request.id,
                    stepId: step.id,
                    status: 'PENDING'
                }))
            });

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
                collaborators: {
                    select: { id: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { name: true, avatarUrl: true, role: true } } }
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    include: { uploader: { select: { name: true } } }
                },
                workflow: {
                    orderBy: { timestamp: 'desc' },
                    include: { actor: { select: { name: true, role: true } } }
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

        return request;
    } catch (e) {
        console.error("Error fetching request:", e);
        return null;
    }
}


export async function postTripMessage(requestId: string, content: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    if (!content.trim()) return { error: "Message cannot be empty" };

    try {
        // Create the message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content
            }
        });

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
                // Get current collaborators
                const request = await prisma.tripRequest.findUnique({
                    where: { id: requestId },
                    include: {
                        collaborators: { select: { id: true } },
                        company: { select: { slug: true } }
                    }
                });

                if (request) {
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
                    const { createNotification } = await import("@/lib/notifications");

                    await Promise.all(
                        mentionedUsers.map(user =>
                            createNotification({
                                userId: user.id,
                                title: "You were mentioned",
                                message: `${session.user.name} mentioned you in "${request.title}"`,
                                type: "INFO",
                                link: `/company/${request.company.slug}/dashboard/requests/${requestId}`
                            })
                        )
                    );

                    if (request.company.slug) {
                        revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);
                    }
                }
            }
        } else {
            // No mentions, just revalidate
            const request = await prisma.tripRequest.findUnique({
                where: { id: requestId },
                include: { company: { select: { slug: true } } }
            });

            if (request?.company?.slug) {
                revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);
            }
        }

        return { success: true };
    } catch (e) {
        console.error("Failed to send message:", e);
        return { error: "Failed to send message" };
    }
}

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

export async function updateTripRequest(requestId: string, data: {
    title?: string;
    destination?: string;
    startDate?: Date;
    endDate?: Date;
    purpose?: string;
    budget?: number;
    preferences?: any;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthenticated" };

    try {
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            select: { userId: true, status: true, companyId: true, title: true }
        });

        if (!request) return { error: "Request not found" };

        // Only owner can update their request
        if (request.userId !== session.user.id) {
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
                budget: data.budget ? new Prisma.Decimal(data.budget) : undefined,
                preferences: data.preferences ?? {},
                updatedAt: new Date()
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.companyId,
                actorId: session.user.id,
                action: 'REQUEST_UPDATED',
                description: `Trip request "${data.title || request.title}" was updated by the user`,
                metadata: { requestId }
            }
        });

        revalidatePath(`/company/${session.user.companySlug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Failed to update trip request:", e);
        return { error: "Failed to update trip request" };
    }
}

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
