import { SubscriptionPlan } from '@prisma/client';

export interface AgencyPlanFeatures {
    allowedTaxTemplates: number;
    allowedActiveBids: number;
    allowedFullfillmentsPerMonth: number;
}

export interface CompanyPlanFeatures {
    allowedIntegrations: number;
    allowedRequestsPerMonth: number;
}

export interface PlanFeatures extends AgencyPlanFeatures, CompanyPlanFeatures {
    canAccessAnalytics: boolean;
    canAccessTeamAccounts: boolean;
    supportLevel: 'COMMUNITY' | 'EMAIL' | 'DEDICATED';
}

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanFeatures> = {
    [SubscriptionPlan.FREE]: {
        allowedRequestsPerMonth: 5,
        allowedIntegrations: 1,
        allowedTaxTemplates: 1,
        allowedActiveBids: 10,
        allowedFullfillmentsPerMonth: 5,
        canAccessAnalytics: false,
        canAccessTeamAccounts: false,
        supportLevel: 'COMMUNITY',
    },
    [SubscriptionPlan.STARTER]: {
        allowedRequestsPerMonth: 20,
        allowedIntegrations: 3,
        allowedTaxTemplates: 5,
        allowedActiveBids: 50,
        allowedFullfillmentsPerMonth: 20,
        canAccessAnalytics: true,
        canAccessTeamAccounts: true,
        supportLevel: 'EMAIL',
    },
    [SubscriptionPlan.ENTERPRISE]: {
        allowedRequestsPerMonth: Infinity,
        allowedIntegrations: Infinity,
        allowedTaxTemplates: Infinity,
        allowedActiveBids: Infinity,
        allowedFullfillmentsPerMonth: Infinity,
        canAccessAnalytics: true,
        canAccessTeamAccounts: true,
        supportLevel: 'DEDICATED',
    },
};

export const PLAN_NAMES: Record<SubscriptionPlan, string> = {
    [SubscriptionPlan.FREE]: 'Free Tier',
    [SubscriptionPlan.STARTER]: 'Growth Plan',
    [SubscriptionPlan.ENTERPRISE]: 'Enterprise',
};
