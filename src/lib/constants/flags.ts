
/**
 * Feature flags
 */

// Define feature flags
const FLAGS: Record<string, boolean> = {}

// Get feature flag
export const getFlags = (
    key: keyof typeof FLAGS
): boolean => {
    return FLAGS[key];
}