import { prisma } from '@/lib/prisma';
import { PLAN_CONFIG, PLAN_NAMES } from '@/lib/constants/plans';
import { startOfMonth, endOfMonth } from 'date-fns';

export enum PlanFeature {
    CREATE_REQUEST = 'CREATE_REQUEST',
    ADD_INTEGRATION = 'ADD_INTEGRATION',
    ADD_TAX_TEMPLATE = 'ADD_TAX_TEMPLATE',
    MAX_ACTIVE_BIDS = 'MAX_ACTIVE_BIDS',
    ACCESS_ANALYTICS = 'ACCESS_ANALYTICS',
    FULFILLMENTS_PER_MONTH = 'FULFILLMENTS_PER_MONTH'
}

export class PlanGuardService {
    /**
     * Check if a company can perform a specific action based on their subscription plan.
     * Returns details about usage and limits.
     */
    static async checkUsage(companyId: string, feature: PlanFeature): Promise<{
        allowed: boolean;
        limit: number;
        usage: number;
        planName: string;
        message?: string;
    }> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { plan: true, timezone: true, type: true }
        });

        if (!company) {
            throw new Error(`Company not found: ${companyId}`);
        }

        const config = PLAN_CONFIG[company.plan];
        const planName = PLAN_NAMES[company.plan];

        // Default response
        let usage = 0;
        let limit = 0;
        let allowed = true;

        switch (feature) {
            case PlanFeature.CREATE_REQUEST: {
                limit = config.allowedRequestsPerMonth;
                if (limit === Infinity) {
                    return { allowed: true, limit, usage: 0, planName };
                }

                // Count requests in current month
                const now = new Date();
                const start = startOfMonth(now);
                const end = endOfMonth(now);

                usage = await prisma.tripRequest.count({
                    where: {
                        companyId,
                        createdAt: { gte: start, lte: end }
                    }
                });

                allowed = usage < limit;
                break;
            }

            case PlanFeature.ADD_INTEGRATION: {
                limit = config.allowedIntegrations;
                if (limit === Infinity) {
                    return { allowed: true, limit, usage: 0, planName };
                }

                usage = await prisma.agencyIntegration.count({
                    where: {
                        companyId,
                        status: 'ACTIVE'
                    }
                });

                allowed = usage < limit;
                break;
            }

            case PlanFeature.ADD_TAX_TEMPLATE: {
                // Feature restriction: Only Agents can add tax templates
                if (company.type !== 'AGENT') {
                    return {
                        allowed: false,
                        limit: 0,
                        usage: 0,
                        planName,
                        message: "Tax templates are only available for Agency accounts."
                    };
                }

                limit = config.allowedTaxTemplates;
                if (limit === Infinity) {
                    return { allowed: true, limit, usage: 0, planName };
                }

                usage = await prisma.taxTemplate.count({
                    where: {
                        agencyId: companyId
                    }
                });

                allowed = usage < limit;
                break;
            }

            case PlanFeature.MAX_ACTIVE_BIDS: {
                // Feature restriction: Only Agents can bid
                if (company.type !== 'AGENT') {
                    return {
                        allowed: false,
                        limit: 0,
                        usage: 0,
                        planName,
                        message: "Bidding is only available for Agency accounts."
                    };
                }

                limit = config.allowedActiveBids;
                if (limit === Infinity) {
                    return { allowed: true, limit, usage: 0, planName };
                }

                usage = await prisma.agentBid.count({
                    where: {
                        agencyId: companyId,
                        status: 'PENDING'
                    }
                });

                allowed = usage < limit;
                break;
            }

            case PlanFeature.FULFILLMENTS_PER_MONTH: {
                if (company.type !== 'AGENT') {
                    return { allowed: false, limit: 0, usage: 0, planName, message: "Only Agents can fulfill requests." };
                }

                limit = config.allowedFullfillmentsPerMonth;
                if (limit === Infinity) {
                    return { allowed: true, limit, usage: 0, planName };
                }

                const now = new Date();
                const start = startOfMonth(now);
                const end = endOfMonth(now);

                // Count accepted bids in current month as proxy for "fulfillments"
                usage = await prisma.agentBid.count({
                    where: {
                        agencyId: companyId,
                        status: 'ACCEPTED',
                        updatedAt: { gte: start, lte: end }
                    }
                });

                allowed = usage < limit;
                break;
            }

            case PlanFeature.ACCESS_ANALYTICS: {
                allowed = config.canAccessAnalytics;
                limit = allowed ? 1 : 0;
                usage = allowed ? 0 : 1;
                break;
            }
        }

        return {
            allowed,
            limit,
            usage,
            planName,
            message: allowed ? undefined : `Upgrade to ${planName} to exceed limit of ${limit} for ${feature}. Current usage: ${usage}.`
        };
    }

    /**
     * Helper to throw error if limit reached, for use in Server Actions
     */
    static async enforce(companyId: string, feature: PlanFeature) {
        const result = await this.checkUsage(companyId, feature);
        if (!result.allowed) {
            throw new Error(result.message || `Plan limit reached for ${feature}`);
        }
    }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type ActionResponse = { error?: string; success?: boolean;[key: string]: any };

/**
 * Higher-Order Function (Decorator-like) to wrap server actions with PlanGuard enforcement.
 * Automatically fetches session and checks company plan limits.
 * 
 * Usage:
 * export const myAction = withPlanGuard('FEATURE_NAME', async (arg1, arg2) => { ... })
 */
export function withPlanGuard<T extends any[], R extends ActionResponse>(
    feature: PlanFeature,
    action: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        const session = await getServerSession(authOptions);

        // Basic auth check - if no company ID, we can't check plan
        // We assume actions that need plan checks are for authenticated users
        if (!session?.user?.companyId) {
            return { error: "Unauthenticated or not associated with a company." } as R;
        }

        try {
            await PlanGuardService.enforce(session.user.companyId, feature);
        } catch (e) {
            return { error: e instanceof Error ? e.message : "Plan limit reached" } as R;
        }

        return action(...args);
    };
}

/**
 * Decorator factory for Class-based Server Actions.
 * Usage:
 * class MyActions {
 *   @PlanGuard('FEATURE')
 *   static async action(...) { ... }
 * }
 */
export function PlanGuard(feature: PlanFeature) {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const session = await getServerSession(authOptions);

            if (!session?.user?.companyId) {
                // For now, assume error object return schema. 
                // If the method returns something else, we might need a generic or diverse handling.
                return { error: "Unauthenticated or not associated with a company." };
            }

            try {
                await PlanGuardService.enforce(session.user.companyId, feature);
            } catch (e) {
                return { error: e instanceof Error ? e.message : "Plan limit reached" };
            }

            // Call original method
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
