
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getDigestEmailTemplate } from "@/lib/email-templates";
import { ApprovalStatus } from "@prisma/client";

/**
 * Ensures the route is always executed dynamically and prevents static caching.
 */
export const dynamic = 'force-dynamic';

/**
 * Sets the maximum execution duration for the function (e.g., on Vercel).
 */
export const maxDuration = 300;

/**
 * Handles the GET request for the daily digest cron job.
 * Gathers user statistics regarding pending notifications and approvals, and sends summary emails.
 * 
 * @param {Request} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} A JSON response indicating the number of emails sent.
 */
export async function GET(request: Request): Promise<NextResponse> {
    // Retrieve the current Request Headers
    const requestHeaders = request.headers;
    // Retrieve the Authorization header from the incoming request
    const authHeaderValue = requestHeaders.get('authorization');

    // Retrieve the configured CRON_SECRET from the environment variable
    const environmentCronSecret = process.env.CRON_SECRET;
    // Define the expected bearer authorization token string
    const expectedAuthToken = `Bearer ${environmentCronSecret}`;

    // identify the current process node environment
    const currentProcessEnv = process.env.NODE_ENV;
    const isDevelopmentMode = currentProcessEnv === 'development';

    // Verify if the auth header matches the expected token
    const isSecretValid = authHeaderValue === expectedAuthToken;
    // determine authorization status (valid secret or development environment)
    const isAuthorizedRequest = isSecretValid || isDevelopmentMode;

    // If the request is not authorized to proceed
    if (!isAuthorizedRequest) {
        // Define the error body text
        const unauthorizedText = 'Unauthorized';
        // Define the response status options
        const unauthorizedStatusOptions = {
            status: 401
        };
        // Return a 401 Unauthorized response
        const unauthorizedResponseResult = new NextResponse(unauthorizedText, unauthorizedStatusOptions);
        return unauthorizedResponseResult;
    }

    try {
        // define the structural type for the user statistics map
        type UserStatRecord = {
            name: string;
            email: string;
            pendingNotifications: number;
            pendingApprovals: number;
            companySlug: string;
        };
        // Map to store gathered statistics indexed by user identifier
        const userStatsCollection = new Map<string, UserStatRecord>();

        // 1. GATHER USERS WITH UNREAD NOTIFICATIONS

        // Define configuration for fetching users with notifications
        const notificationUserFilter = {
            where: {
                notifications: {
                    some: {
                        read: false
                    }
                },
                isActive: true,
                email: {
                    not: ''
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: {
                    select: {
                        slug: true
                    }
                },
                _count: {
                    select: {
                        notifications: {
                            where: {
                                read: false
                            }
                        }
                    }
                }
            }
        };

        // Find users with at least one unread notification matching the filter
        const usersWithNotificationsRecords = await prisma.user.findMany(notificationUserFilter);

        // Populate the userStatsCollection map with the notification counts
        for (const userEntry of usersWithNotificationsRecords) {
            // Get user identifier
            const userIdIdentifier = userEntry.id;
            // Retrieve email address
            const userEmailAddress = userEntry.email;

            // skip user processing if email address is missing
            if (!userEmailAddress) {
                continue;
            }

            // Retrieve the integer count of unread notifications
            const unreadCount = userEntry._count.notifications;

            // retrieve the associated company slug or default to 'demo'
            const companySlugValue = userEntry.company?.slug || 'demo';

            // retrieve user name or use 'User' as a fallback
            const userNameDisplay = userEntry.name || 'User';

            // Define the stats object for the current user
            const statsRecord: UserStatRecord = {
                name: userNameDisplay,
                email: userEmailAddress,
                pendingNotifications: unreadCount,
                pendingApprovals: 0,
                companySlug: companySlugValue
            };

            // store the entry in the map
            userStatsCollection.set(userIdIdentifier, statsRecord);
        }

        // 2. GATHER PENDING APPROVALS

        // Configuration for including relations needed for approval logic
        const approvalIncludeConfig = {
            step: {
                include: {
                    approvers: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: {
                                select: {
                                    slug: true
                                }
                            }
                        }
                    }
                }
            },
            approvals: true
        };

        // Fetch all request approval steps that are in a PENDING status
        const pendingStepRecords = await prisma.requestApprovalStep.findMany({
            where: {
                status: ApprovalStatus.PENDING
            },
            include: approvalIncludeConfig
        });

        // Track pending approval counts for each authorized and pending approver
        for (const currentStep of pendingStepRecords) {
            // Retrieve the list of authorized approvers for the step
            const currentApproversList = currentStep.step.approvers;

            // Iterate through each authorized approver
            for (const currentApprover of currentApproversList) {
                // retrieve current approver identifier
                const approverIdValue = currentApprover.id;
                // Retrieve the email address of the current approver
                const approverEmailStr = currentApprover.email;

                // Skip if the approver has no valid email address
                if (!approverEmailStr) {
                    continue;
                }

                // Check if this specific approver has already provided a decision for this step
                const currentApprovalsList = currentStep.approvals;
                const approverActionFilter = (act: { userId: string }) => act.userId === approverIdValue;
                const hasApproverActed = currentApprovalsList.some(approverActionFilter);

                // Skip if the approver has already acted
                if (hasApproverActed) {
                    continue;
                }

                // retrieve existing statistics or initialize a default object if not found
                const existingUserStats = userStatsCollection.get(approverIdValue);
                const defaultUserStats: UserStatRecord = {
                    name: currentApprover.name || 'User',
                    email: approverEmailStr,
                    pendingNotifications: 0,
                    pendingApprovals: 0,
                    companySlug: currentApprover.company?.slug || 'demo'
                };
                const activeUserStats = existingUserStats || defaultUserStats;

                // Increment the counter for pending approvals
                const currentApprovalsCount = activeUserStats.pendingApprovals;
                activeUserStats.pendingApprovals = currentApprovalsCount + 1;

                // Update the user statistics collection with the incremented value
                userStatsCollection.set(approverIdValue, activeUserStats);
            }
        }

        // 3. GENERATE AND DISPATCH DIGEST EMAILS

        // Initial counter for total emails successfully dispatched
        let totalEmailsDispatched = 0;

        // Retrieve the base application URL from environment variables
        const applicationBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Iterate through all user statistics entries in the collection
        for (const userStatsItem of userStatsCollection.values()) {
            // Check if there are any pending tasks for the current user
            const noPendingNotifs = userStatsItem.pendingNotifications === 0;
            const noPendingApprovals = userStatsItem.pendingApprovals === 0;
            const isUserCaughtUp = noPendingNotifs && noPendingApprovals;

            // Skip generating an email if the user has no pending items
            if (isUserCaughtUp) {
                continue;
            }

            // identify the company slug for dashboard linking
            const activeCompanySlug = userStatsItem.companySlug;
            // Construct the path for the company dashboard
            const dashboardRelativePath = `/company/${activeCompanySlug}/dashboard`;
            // Assemble the absolute dashboard URL
            const absoluteDashboardUrl = `${applicationBaseUrl}${dashboardRelativePath}`;

            // Generate the customized HTML content for the digest email
            const customDigestHtml = getDigestEmailTemplate(
                userStatsItem.name,
                userStatsItem.pendingNotifications,
                userStatsItem.pendingApprovals,
                absoluteDashboardUrl
            );

            // Construct the email subject line highlighting pending approvals
            const dynamicSubjectLine = `Daily Digest: ${userStatsItem.pendingApprovals} approvals waiting`;

            // Define the complete email payload for submission
            const completeEmailPayload = {
                to: userStatsItem.email,
                subject: dynamicSubjectLine,
                html: customDigestHtml
            };

            // Execute the email sending process
            await sendEmail(completeEmailPayload);

            // Increment the dispatch counter upon success
            totalEmailsDispatched = totalEmailsDispatched + 1;
        }

        // Define the final JSON success result body
        const successResultBody = {
            success: true,
            emailsSent: totalEmailsDispatched
        };

        // Return the success response
        const successfulResponseObject = NextResponse.json(successResultBody);
        return successfulResponseObject;

    } catch (operationCaughtError) {
        // define specific label for logging digest errors
        const digestErrorContextLabel = "Cron digest error:";
        // Log the full error for analysis
        console.error(digestErrorContextLabel, operationCaughtError);

        // Define a generic internal server error body
        const genericErrorResponseText = 'Internal Server Error';
        // Define internal server error response options
        const internalErrorResponseOptions = {
            status: 500
        };

        // Return a 500 Internal Server Error response object
        const finalErrorResponseObject = new NextResponse(genericErrorResponseText, internalErrorResponseOptions);
        return finalErrorResponseObject;
    }
}
