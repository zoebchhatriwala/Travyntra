/**
 * Defines the role-based access control levels for users in the system.
 */
export enum UserRole {
    /** 
     * System administrator with full access to all platform features and settings.
     * Can manage companies, agencies, and global configurations.
     */
    SUPER_ADMIN = "SUPER_ADMIN",

    /** 
     * Administrator or main account holder for a travel agency.
     * Can manage agency settings, agents, and handle fulfillment.
     */
    TRAVEL_AGENT = "TRAVEL_AGENT",

    /** 
     * Administrator for a client company.
     * Can manage company settings, employees, workflow policies, and approvals.
     */
    COMPANY_ADMIN = "COMPANY_ADMIN",

    /** 
     * Standard user belonging to a client company.
     * Can submit trip requests and view their own history.
     */
    EMPLOYEE = "EMPLOYEE",

    /** 
     * Staff member working for a travel agency.
     * Can assist with fulfillment tasks assigned to their agency.
     */
    AGENCY_EMPLOYEE = "AGENCY_EMPLOYEE"
}
