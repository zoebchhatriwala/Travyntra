/**
 * Summary view of a trip request, used in tables and lists.
 */
export interface TripRequestSummary {
    id: string;
    title: string;
    userName: string;
    userAvatar: string | null;
    status: string;
    createdAt: Date;
    budget: number;
    cost?: number | null;
    currency: string;
    destination: string;
    startDate: Date;
    endDate: Date;
}
