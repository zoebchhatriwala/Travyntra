/**
 * Basic user profile information used across the application.
 */
export interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    role?: string;
}
