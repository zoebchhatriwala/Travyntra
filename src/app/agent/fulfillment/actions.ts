"use server";


import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { RequestStatus, UserRole, Prisma, DocType } from "@prisma/client";
import { ActivityLogAction } from "@/types/common/enums";
import { createNotification } from "@/lib/notifications";

/**
 * Get a request assigned to the current agency for fulfillment
 */
export async function getFulfillmentRequest(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) return null;

    const agencyId = session.user.companyId;

    const request = await prisma.tripRequest.findFirst({
        where: {
            id: requestId,
            agencyId: agencyId // Only return if this agency is assigned
        },
        include: {
            company: {
                select: {
                    name: true,
                    logoUrl: true,
                    currency: true,
                    slug: true
                }
            },
            user: { select: { name: true, email: true } },
            bids: {
                where: { agencyId: agencyId, status: "ACCEPTED" },
                select: { amount: true, updatedAt: true }
            },
            fulfillmentItems: {
                orderBy: { order: 'asc' },
                include: {
                    documents: {
                        select: {
                            id: true,
                            name: true,
                            url: true,
                            type: true,
                            createdAt: true,
                            uploader: { select: { name: true } }
                        }
                    }
                }
            },
            messages: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    sender: { select: { name: true } }
                }
            },
            invoice: {
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    createdAt: true,
                    updatedAt: true
                }
            }
        }
    });

    if (!request) return null;

    // Convert decimal values to numbers for Client Component compatibility
    const showInvoice = session.user.role === UserRole.TRAVEL_AGENT;

    return {
        ...request,
        bids: request.bids as unknown as { amount: Prisma.JsonValue; updatedAt: Date }[],
        invoice: (request.invoice && showInvoice)
            ? {
                ...request.invoice,
                amount: Number(request.invoice.amount),
                // Invoice subtotal is also a Decimal and needs conversion
                subtotal: (request.invoice as unknown as { subtotal?: number }).subtotal ? Number((request.invoice as unknown as { subtotal?: number }).subtotal) : 0,
            }
            : null,
    };
}

// ============ FULFILLMENT CHECKLIST ACTIONS ============

/**
 * Add a new fulfillment checklist item
 */
export async function addFulfillmentItem(requestId: string, title: string, description?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        // Verify this agency is assigned to the request
        const request = await prisma.tripRequest.findFirst({
            where: {
                id: requestId,
                agencyId: agencyId
            },
            include: { fulfillmentItems: true }
        });

        if (!request) {
            return { error: "Request not found or not assigned to your agency" };
        }

        // Get next order number
        const nextOrder = request.fulfillmentItems.length;

        const item = await prisma.fulfillmentItem.create({
            data: {
                requestId,
                title,
                description,
                order: nextOrder
            }
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);

        return { success: true, item };
    } catch (e) {
        console.error("Add fulfillment item error:", e);
        return { error: "Failed to add item" };
    }
}

/**
 * Update a fulfillment checklist item
 */
export async function updateFulfillmentItem(
    itemId: string,
    requestId: string,
    data: { title?: string; description?: string; isCompleted?: boolean }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        // Verify the item belongs to a request assigned to this agency
        const item = await prisma.fulfillmentItem.findFirst({
            where: {
                id: itemId,
                requestId,
                request: { agencyId: agencyId }
            }
        });

        if (!item) {
            return { error: "Item not found" };
        }

        await prisma.fulfillmentItem.update({
            where: { id: itemId },
            data
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Update fulfillment item error:", e);
        return { error: "Failed to update item" };
    }
}

/**
 * Delete a fulfillment checklist item
 */
export async function deleteFulfillmentItem(itemId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        // Verify the item belongs to a request assigned to this agency
        const item = await prisma.fulfillmentItem.findFirst({
            where: {
                id: itemId,
                requestId,
                request: { agencyId: agencyId }
            },
            include: { documents: true }
        });

        if (!item) {
            return { error: "Item not found" };
        }

        // Delete associated documents first
        if (item.documents.length > 0) {
            await prisma.document.deleteMany({
                where: { fulfillmentItemId: itemId }
            });
        }

        await prisma.fulfillmentItem.delete({
            where: { id: itemId }
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Delete fulfillment item error:", e);
        return { error: "Failed to delete item" };
    }
}

/**
 * Mark/unmark a fulfillment item as completed
 */
export async function toggleFulfillmentItem(itemId: string, requestId: string, isCompleted: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        // Verify the item belongs to a request assigned to this agency
        const item = await prisma.fulfillmentItem.findFirst({
            where: {
                id: itemId,
                requestId,
                request: { agencyId: agencyId }
            }
        });

        if (!item) {
            return { error: "Item not found" };
        }

        await prisma.fulfillmentItem.update({
            where: { id: itemId },
            data: { isCompleted }
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Toggle fulfillment item error:", e);
        return { error: "Failed to update item" };
    }
}

// ============ DOCUMENT UPLOAD ACTIONS ============

/**
 * Upload documents for a specific fulfillment item
 */
export async function uploadFulfillmentDocument(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        const files = formData.getAll('files') as File[];
        const requestId = formData.get('requestId') as string;
        const fulfillmentItemId = formData.get('fulfillmentItemId') as string;

        if (!files || files.length === 0) {
            return { error: "No files provided" };
        }

        if (!requestId) {
            return { error: "Request ID is required" };
        }

        if (!fulfillmentItemId) {
            return { error: "Fulfillment item ID is required" };
        }

        // Verify this agency is assigned to the request and item exists
        const item = await prisma.fulfillmentItem.findFirst({
            where: {
                id: fulfillmentItemId,
                requestId,
                request: { agencyId: agencyId }
            },
            include: {
                request: {
                    select: {
                        companyId: true,
                        userId: true,
                        title: true,
                        company: { select: { slug: true } }
                    }
                }
            }
        });

        if (!item) {
            return { error: "Fulfillment item not found or not assigned to your agency" };
        }

        // Validate file sizes (max 10MB per file)
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                return { error: `File ${file.name} exceeds 10MB limit` };
            }
        }

        const docType = (formData.get('type') as string) || "OTHER";

        // Upload files
        const { uploadFile } = await import("@/lib/storage");

        const uploadedDocs = [];
        for (const file of files) {
            const url = await uploadFile(file, `documents/${requestId}`);
            const s3Key = `documents/${requestId}/${file.name}`;

            // Create document record linked to the fulfillment item
            const doc = await prisma.document.create({
                data: {
                    requestId,
                    uploaderId: session.user.id,
                    fulfillmentItemId,
                    name: file.name,
                    s3Key,
                    url,
                    type: docType as DocType
                }
            });

            uploadedDocs.push(doc);
        }

        // Prepare attachments metadata for chat rendering
        const attachmentData = uploadedDocs.map(d => ({
            url: d.url,
            name: d.name
        }));

        const messageContent = `**Document uploaded** for "${item.title}"\n\n__ATTACHMENTS__${JSON.stringify(attachmentData)}`;

        // Post a system message about the upload
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: messageContent
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: item.request.companyId,
                actorId: session.user.id,
                action: ActivityLogAction.DOCUMENT_UPLOADED,
                description: `Uploaded document(s) for fulfillment: ${item.title}`,
                metadata: { requestId, fulfillmentItemId, fileCount: files.length }
            }
        });

        // Notify the request owner
        await createNotification({
            userId: item.request.userId,
            title: "Document Uploaded",
            message: `A document has been uploaded for your request "${item.request.title}": ${item.title}`,
            type: "INFO",
            link: `/company/${item.request.company.slug}/dashboard/requests/${requestId}`,
            sendEmail: true
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);
        revalidatePath(`/company/${item.request.company.slug}/dashboard/requests/${requestId}`);

        return { success: true, documents: uploadedDocs };
    } catch (e) {
        console.error("Document upload error:", e);
        return { error: "Failed to upload documents" };
    }
}

/**
 * Delete a document from a fulfillment item
 */
export async function deleteDocument(documentId: string, requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        // Verify the document belongs to a request assigned to this agency
        const document = await prisma.document.findFirst({
            where: {
                id: documentId,
                requestId,
                request: {
                    agencyId: agencyId
                }
            }
        });

        if (!document) {
            return { error: "Document not found" };
        }

        await prisma.document.delete({
            where: { id: documentId }
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Delete document error:", e);
        return { error: "Failed to delete document" };
    }
}

// ============ STATUS ACTIONS ============

/**
 * Mark a request as BOOKED (travel arrangements confirmed)
 */
export async function markAsBooked(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        const request = await prisma.tripRequest.findFirst({
            where: {
                id: requestId,
                agencyId: agencyId,
                status: RequestStatus.IN_PROGRESS
            },
            select: { companyId: true, userId: true, title: true, company: { select: { slug: true } } }
        });

        if (!request) {
            return { error: "Request not found or not in correct status" };
        }

        await prisma.tripRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.BOOKED }
        });

        // System message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Status Update**: Travel has been booked. Awaiting final documents.`
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.companyId,
                actorId: session.user.id,
                action: ActivityLogAction.STATUS_CHANGED,
                description: `Request status changed to BOOKED`,
                metadata: { requestId, newStatus: 'BOOKED' }
            }
        });

        // Notify the request owner
        await createNotification({
            userId: request.userId,
            title: "Travel Booked",
            message: `Your travel request "${request.title}" has been booked. Awaiting final documents.`,
            type: "SUCCESS",
            link: `/company/${request.company.slug}/dashboard/requests/${requestId}`,
            sendEmail: true
        });

        revalidatePath(`/agent/fulfillment/${requestId}`);
        revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Mark as booked error:", e);
        return { error: "Failed to update status" };
    }
}

/**
 * Mark a request as COMPLETED - only when ALL fulfillment items are checked
 */
export async function markAsCompleted(requestId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || (session.user.role !== UserRole.TRAVEL_AGENT && session.user.role !== UserRole.AGENCY_EMPLOYEE)) {
        return { error: "Unauthenticated or not associated with a company." };
    }

    const agencyId = session.user.companyId;

    try {
        const request = await prisma.tripRequest.findFirst({
            where: {
                id: requestId,
                agencyId: agencyId,
                status: { in: [RequestStatus.IN_PROGRESS, RequestStatus.BOOKED] }
            },
            include: {
                company: { select: { slug: true } },
                fulfillmentItems: true,
                user: { select: { id: true } }
            }
        });

        if (!request) {
            return { error: "Request not found or not in correct status" };
        }

        // Check if there are any fulfillment items
        if (request.fulfillmentItems.length === 0) {
            return { error: "Please add at least one fulfillment item before completing" };
        }

        // Check if ALL fulfillment items are completed
        const allCompleted = request.fulfillmentItems.every(item => item.isCompleted);
        if (!allCompleted) {
            const incompleteCount = request.fulfillmentItems.filter(item => !item.isCompleted).length;
            return { error: `${incompleteCount} checklist item(s) are still incomplete` };
        }

        await prisma.tripRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.COMPLETED }
        });

        // System message
        await prisma.message.create({
            data: {
                requestId,
                senderId: session.user.id,
                content: `**Request Completed**: All fulfillment items have been completed. This request is now closed.`
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                companyId: request.companyId,
                actorId: session.user.id,
                action: ActivityLogAction.STATUS_CHANGED,
                description: `Request marked as completed`,
                metadata: { requestId, newStatus: 'COMPLETED' }
            }
        });

        // Notify the request owner
        await createNotification({
            userId: request.userId,
            title: "Request Completed",
            message: `Your travel request "${request.title}" has been completed. All documents are now available.`,
            type: "SUCCESS",
            link: `/company/${request.company.slug}/dashboard/requests/${requestId}`,
            sendEmail: true
        });

        // Notify company admins
        const companyAdmins = await prisma.user.findMany({
            where: {
                companyId: request.companyId,
                role: UserRole.COMPANY_ADMIN,
                isActive: true
            },
            select: { id: true }
        });

        await Promise.all(companyAdmins.map(admin =>
            createNotification({
                userId: admin.id,
                title: "Trip Completed",
                message: `The trip "${request.title}" has been marked as completed by ${session.user.name}. All fulfillment items are done.`,
                type: "SUCCESS",
                link: `/company/${request.company.slug}/dashboard/requests/${requestId}`,
                sendEmail: true
            })
        ));

        revalidatePath(`/agent/fulfillment/${requestId}`);
        revalidatePath(`/agent/fulfillment`);
        revalidatePath(`/company/${request.company.slug}/dashboard/requests/${requestId}`);

        return { success: true };
    } catch (e) {
        console.error("Mark as completed error:", e);
        return { error: "Failed to complete request" };
    }
}
