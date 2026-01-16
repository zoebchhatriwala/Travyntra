/**
 * Interface representing a system notification.
 * Compatible with Prisma model but safe for client-side serialization (dates as strings).
 */
export interface Notification {
    id: string;
    title: string;
    message: string;
    type: string | null;
    link: string | null;
    read: boolean;
    createdAt: string | Date;
}
