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
