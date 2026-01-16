import { prisma } from "./prisma";
import { type Money } from "@/types/finance/money";
import { moneyToDecimal } from "@/lib/utils/money";
import {
    type AutoApprovalEvaluation,
    type AutoApprovalRule,
    type RequestForEvaluation,
    AutoApprovalRuleType,
} from "@/types/workflow/auto-approval-policy";
import { parseAutoApprovalPolicy } from "@/lib/utils/auto-approval-policy";
import { Address } from "./utils/address";

/**
 * Engine responsible for evaluating trip requests against auto-approval policies.
 */
export class AutoApprovalEngine {
    /**
     * Evaluates whether a trip request qualifies for automatic approval.
     * 
     * @param {string} requestId - The unique identifier of the trip request.
     * @returns {Promise<AutoApprovalEvaluation>} The evaluation result.
     */
    static async evaluateRequest(requestId: string): Promise<AutoApprovalEvaluation> {
        // Fetch the request with company details
        const request = await prisma.tripRequest.findUnique({
            where: { id: requestId },
            include: {
                company: {
                    select: {
                        policyThreshold: true,
                        currency: true,
                        country: true,
                    },
                },
            },
        });

        // If request not found, deny auto-approval
        if (!request) {
            return {
                shouldAutoApprove: false,
                reason: "Request not found",
            };
        }

        // Parse the company's auto-approval policy
        const policy = parseAutoApprovalPolicy(request.company.policyThreshold);

        // If no policy exists or it's disabled, deny auto-approval
        if (!policy || !policy.enabled) {
            return {
                shouldAutoApprove: false,
                reason: "Auto-approval is not enabled for this company",
            };
        }

        // If no rules are defined, deny auto-approval
        if (!policy.rules || policy.rules.length === 0) {
            return {
                shouldAutoApprove: false,
                reason: "No auto-approval rules configured",
            };
        }

        // Evaluate each rule
        for (const rule of policy.rules) {
            // Skip disabled rules
            if (!rule.enabled) {
                continue;
            }

            const evaluation = await this.evaluateRule(request, rule, request.company);

            // If a rule matches, approve immediately
            if (evaluation.shouldAutoApprove) {
                return evaluation;
            }
        }

        // No rules matched
        return {
            shouldAutoApprove: false,
            reason: "Request does not match any auto-approval criteria",
        };
    }

    /**
     * Evaluates a single rule against a trip request.
     * 
     * @param {Object} request - The trip request object.
     * @param {AutoApprovalRule} rule - The rule to evaluate.
     * @param {Object} company - The company object with currency and country.
     * @returns {Promise<AutoApprovalEvaluation>} The evaluation result.
     */
    private static async evaluateRule(
        request: RequestForEvaluation,
        rule: AutoApprovalRule,
        company: { currency: string; country: string | null }
    ): Promise<AutoApprovalEvaluation> {
        switch (rule.type) {
            case AutoApprovalRuleType.BUDGET_THRESHOLD:
                return this.evaluateBudgetThreshold(request, rule);

            case AutoApprovalRuleType.DOMESTIC_TRIP:
                return this.evaluateDomesticTrip(request, rule, company.country);

            case AutoApprovalRuleType.COMBINED:
                return this.evaluateCombinedRule(request, rule, company);

            default:
                return {
                    shouldAutoApprove: false,
                    reason: `Unknown rule type: ${rule.type}`,
                };
        }
    }

    /**
     * Evaluates a budget threshold rule.
     * 
     * @param {Object} request - The trip request object.
     * @param {AutoApprovalRule} rule - The budget threshold rule.
     * @param {string} companyCurrency - The company's currency code.
     * @returns {AutoApprovalEvaluation} The evaluation result.
     */
    private static evaluateBudgetThreshold(
        request: RequestForEvaluation,
        rule: AutoApprovalRule
    ): AutoApprovalEvaluation {
        // Check if request has a budget
        if (!request.budget) {
            return {
                shouldAutoApprove: false,
                reason: "Request has no budget specified",
            };
        }

        // Parse the budget as Money object
        const budget = request.budget as Money;
        const budgetAmount = moneyToDecimal(budget);

        // Get the threshold from rule config
        const config = rule.config as { maxAmount: number; currencyCode: string };

        // Ensure currencies match (we don't do conversion for auto-approval to keep it simple)
        if (budget.currencyCode !== config.currencyCode) {
            return {
                shouldAutoApprove: false,
                reason: `Budget currency (${budget.currencyCode}) does not match policy currency (${config.currencyCode})`,
            };
        }

        // Check if budget is within threshold
        if (budgetAmount <= config.maxAmount) {
            return {
                shouldAutoApprove: true,
                matchedRule: rule,
                reason: `Budget ${budgetAmount} ${budget.currencyCode} is within company auto-approval limits`,
            };
        }

        return {
            shouldAutoApprove: false,
            reason: `Budget ${budgetAmount} ${budget.currencyCode} exceeds threshold of ${config.maxAmount} ${config.currencyCode}`,
        };
    }

    /**
     * Evaluates a domestic trip rule.
     * 
     * @param {Object} request - The trip request object.
     * @param {AutoApprovalRule} rule - The domestic trip rule.
     * @param {string | null} companyCountry - The company's country code.
     * @returns {AutoApprovalEvaluation} The evaluation result.
     */
    private static evaluateDomesticTrip(
        request: RequestForEvaluation,
        rule: AutoApprovalRule,
        companyCountry: string | null
    ): AutoApprovalEvaluation {
        // If company country is not set, cannot determine if domestic
        if (!companyCountry) {
            return {
                shouldAutoApprove: false,
                reason: "Company country not configured",
            };
        }

        // Parse destination to extract country
        const destination = request.destination as unknown as Address;
        const destinationCountry = destination?.country;

        console.log("Destination country:", destinationCountry);
        console.log("Company country:", companyCountry);

        if (!destinationCountry) {
            return {
                shouldAutoApprove: false,
                reason: "Destination country not specified",
            };
        }

        // Check if domestic (same country)
        const isDomestic = destinationCountry === companyCountry;

        if (isDomestic) {
            return {
                shouldAutoApprove: true,
                matchedRule: rule,
                reason: `Domestic trip within ${companyCountry}`,
            };
        }

        return {
            shouldAutoApprove: false,
            reason: `International trip (${companyCountry} → ${destinationCountry})`,
        };
    }

    /**
     * Evaluates a combined rule (budget AND domestic).
     * 
     * @param {Object} request - The trip request object.
     * @param {AutoApprovalRule} rule - The combined rule.
     * @param {Object} company - The company object.
     * @returns {Promise<AutoApprovalEvaluation>} The evaluation result.
     */
    private static async evaluateCombinedRule(
        request: RequestForEvaluation,
        rule: AutoApprovalRule,
        company: { currency: string; country: string | null }
    ): Promise<AutoApprovalEvaluation> {
        const config = rule.config as {
            budget: { maxAmount: number; currencyCode: string };
            requireDomestic: boolean;
        };

        // Create a temporary budget rule
        const budgetRule: AutoApprovalRule = {
            id: `${rule.id}-budget`,
            name: `${rule.name} (Budget)`,
            enabled: true,
            type: AutoApprovalRuleType.BUDGET_THRESHOLD,
            config: config.budget,
        };

        // Evaluate budget threshold
        const budgetEval = this.evaluateBudgetThreshold(request, budgetRule);

        if (!budgetEval.shouldAutoApprove) {
            return budgetEval;
        }

        // If domestic is required, check that too
        if (config.requireDomestic) {
            const domesticRule: AutoApprovalRule = {
                id: `${rule.id}-domestic`,
                name: `${rule.name} (Domestic)`,
                enabled: true,
                type: AutoApprovalRuleType.DOMESTIC_TRIP,
                config: { enabled: true },
            };

            const domesticEval = this.evaluateDomesticTrip(request, domesticRule, company.country);

            if (!domesticEval.shouldAutoApprove) {
                return {
                    shouldAutoApprove: false,
                    reason: `Budget criteria met, but ${domesticEval.reason}`,
                };
            }

            return {
                shouldAutoApprove: true,
                matchedRule: rule,
                reason: `Domestic trip with budget within threshold (${budgetEval.reason})`,
            };
        }

        // If domestic not required, budget check is sufficient
        return {
            shouldAutoApprove: true,
            matchedRule: rule,
            reason: budgetEval.reason,
        };
    }
}
