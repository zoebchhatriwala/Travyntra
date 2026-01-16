
import {
    AutoApprovalRule,
    AutoApprovalPolicy
} from "@/types/workflow/auto-approval-policy";

/**
 * Parses an auto-approval policy from JSON storage.
 * 
 * @param {unknown} json - The JSON data from the database.
 * @returns {AutoApprovalPolicy | null} The parsed policy or null if invalid.
 */
export function parseAutoApprovalPolicy(json: unknown): AutoApprovalPolicy | null {
    if (!json || typeof json !== "object") {
        return null;
    }

    const obj = json as Record<string, unknown>;

    // Validate basic structure
    if (typeof obj.enabled !== "boolean" || !Array.isArray(obj.rules)) {
        return null;
    }

    return {
        enabled: obj.enabled,
        rules: obj.rules as AutoApprovalRule[],
        updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
    };
}

/**
 * Creates a default auto-approval policy.
 * 
 * @returns {AutoApprovalPolicy} A new policy with sensible defaults.
 */
export function createDefaultPolicy(): AutoApprovalPolicy {
    return {
        enabled: false,
        rules: [],
        updatedAt: new Date().toISOString(),
    };
}
