"use server";

import { prisma } from "@/lib/prisma";

import { ApprovalStatus } from "@prisma/client";

export async function getCompanyDashboardStats(slug: string, userId?: string) {
    const company = await prisma.company.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            plan: true,
            _count: {
                select: {
                    users: true,
                    requests: true,
                }
            }
        }
    });

    if (!company) return null;

    const pendingStaff = await prisma.user.count({
        where: {
            companyId: company.id,
            isActive: false
        }
    });

    const activeRequests = await prisma.tripRequest.count({
        where: {
            companyId: company.id,
            status: {
                notIn: ['COMPLETED', 'REJECTED', 'CANCELLED', 'DRAFT']
            }
        }
    });

    // Count pending trip approvals for the CURRENT user
    let pendingApprovalsCount = 0;
    if (userId) {
        pendingApprovalsCount = await prisma.requestApprovalStep.count({
            where: {
                status: ApprovalStatus.PENDING,
                step: {
                    approvers: {
                        some: { id: userId }
                    }
                }
            }
        });
    }

    // Simple revenue/spend calculation - just as a dummy for now
    const totalSpend = await prisma.tripRequest.aggregate({
        where: {
            companyId: company.id,
            status: 'COMPLETED'
        },
        _sum: {
            budget: true
        }
    });

    const recentRequests = await prisma.tripRequest.findMany({
        where: { companyId: company.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { name: true, email: true, avatarUrl: true }
            }
        }
    });

    return {
        companyName: company.name,
        companyPlan: company.plan,
        totalStaff: company._count.users,
        pendingStaff,
        activeRequests,
        pendingApprovalsCount,
        totalSpend: Number(totalSpend._sum.budget || 0),
        recentRequests: recentRequests.map(req => ({
            id: req.id,
            title: req.title,
            userName: req.user.name || req.user.email || "Unknown",
            userAvatar: req.user.avatarUrl,
            status: req.status,
            createdAt: req.createdAt,
            budget: Number(req.budget || 0)
        }))
    };
}

