
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getDigestEmailTemplate } from "@/lib/email-templates";
import { ApprovalStatus } from "@prisma/client";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userStats = new Map<string, {
            name: string;
            email: string;
            pendingNotifications: number;
            pendingApprovals: number;
            companySlug: string;
        }>();

        // 1. Get users with unread notifications
        const usersWithNotifications = await prisma.user.findMany({
            where: {
                notifications: { some: { read: false } },
                isActive: true,
                email: { not: '' } // Ensure email exists
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: { select: { slug: true } },
                _count: {
                    select: { notifications: { where: { read: false } } }
                }
            }
        });

        for (const user of usersWithNotifications) {
            if (!user.email) continue;
            userStats.set(user.id, {
                name: user.name || 'User',
                email: user.email,
                pendingNotifications: user._count.notifications,
                pendingApprovals: 0,
                companySlug: user.company?.slug || 'demo'
            });
        }

        // 2. Get pending approvals
        const pendingSteps = await prisma.requestApprovalStep.findMany({
            where: { status: ApprovalStatus.PENDING },
            include: {
                step: {
                    include: {
                        approvers: {
                            select: { id: true, name: true, email: true, company: { select: { slug: true } } }
                        }
                    }
                },
                approvals: true // To check if *this* user already approved it (if type=ANY)
            }
        });

        for (const step of pendingSteps) {
            for (const approver of step.step.approvers) {
                if (!approver.email) continue;

                // Check if this approver has already acted on this step
                const hasActed = step.approvals.some(a => a.userId === approver.id);
                if (hasActed) continue;

                const stats = userStats.get(approver.id) || {
                    name: approver.name || 'User',
                    email: approver.email,
                    pendingNotifications: 0,
                    pendingApprovals: 0,
                    companySlug: approver.company?.slug || 'demo'
                };

                stats.pendingApprovals += 1;
                userStats.set(approver.id, stats);
            }
        }

        // 3. Send emails
        let emailsSent = 0;
        for (const stats of userStats.values()) {
            if (stats.pendingNotifications === 0 && stats.pendingApprovals === 0) continue;

            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/company/${stats.companySlug}/dashboard`;
            const html = getDigestEmailTemplate(
                stats.name,
                stats.pendingNotifications,
                stats.pendingApprovals,
                dashboardUrl
            );

            await sendEmail({
                to: stats.email,
                subject: `Daily Digest: ${stats.pendingApprovals} approvals waiting`,
                html
            });
            emailsSent++;
        }

        return NextResponse.json({ success: true, emailsSent });
    } catch (error) {
        console.error("Cron digest error:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
