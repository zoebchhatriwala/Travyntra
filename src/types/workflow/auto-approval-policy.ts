import { Prisma } from "@prisma/client";
import { type Money } from "@/types/finance/money";

/**
 * Auto-Approval Policy Configuration
 * 
 * This module defines the structure for company-level auto-approval policies.
 * Policies can automatically approve trip requests that meet certain criteria,
 * bypassing the standard approval workflow.
 */

/**
 * Supported types for auto-approval rules.
 */
export enum AutoApprovalRuleType {
    BUDGET_THRESHOLD = "BUDGET_THRESHOLD",
    DOMESTIC_TRIP = "DOMESTIC_TRIP",
    COMBINED = "COMBINED",
}

/**
 * Represents a single auto-approval rule.
 */
export interface AutoApprovalRule {
    /** Unique identifier for the rule */
    id: string;
    /** Human-readable name for the rule */
    name: string;
    /** Whether this rule is currently active */
    enabled: boolean;
    /** Type of rule */
    type: AutoApprovalRuleType;
    /** Configuration specific to the rule type */
    config: BudgetThresholdConfig | DomesticTripConfig | CombinedConfig;
}

/**
 * Configuration for budget-based auto-approval.
 */
export interface BudgetThresholdConfig {
    /** Maximum budget amount that qualifies for auto-approval */
    maxAmount: number;
    /** Currency code for the threshold (should match company currency) */
    currencyCode: string;
}

/**
 * Configuration for domestic trip auto-approval.
 */
export interface DomesticTripConfig {
    /** Whether to auto-approve domestic trips */
    enabled: boolean;
}

/**
 * Configuration for combined rules (both budget AND domestic).
 */
export interface CombinedConfig {
    /** Budget threshold configuration */
    budget: BudgetThresholdConfig;
    /** Whether the trip must also be domestic */
    requireDomestic: boolean;
}

/**
 * Complete auto-approval policy for a company.
 */
export interface AutoApprovalPolicy {
    /** Whether auto-approval is enabled at all */
    enabled: boolean;
    /** List of auto-approval rules */
    rules: AutoApprovalRule[];
    /** Last updated timestamp */
    updatedAt?: string;
}

/**
 * Result of evaluating a request against auto-approval policies.
 */
export interface AutoApprovalEvaluation {
    /** Whether the request qualifies for auto-approval */
    shouldAutoApprove: boolean;
    /** The rule that triggered auto-approval (if any) */
    matchedRule?: AutoApprovalRule;
    /** Reason for the decision */
    reason: string;
}

/**
 * Metadata stored in RequestApprovalStep for auditing purposes.
 */
export interface ApprovalStepMetadata {
    autoApproved: boolean;
    ruleType?: AutoApprovalRuleType;
    ruleConfig?: BudgetThresholdConfig | DomesticTripConfig | CombinedConfig;
    reason: string;
}
/**
 * Structure of a trip request needed for auto-approval evaluation.
 */
export interface RequestForEvaluation {
    budget: Money | Prisma.JsonValue;
    destination: Prisma.JsonValue;
}
