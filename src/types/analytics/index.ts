export interface EmployeeSpendStats {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    tripCount: number;
    totalSpend: number;
    avgCost: number; // Calculated field
}

export interface RequestSpendStats {
    id: string;
    title: string;
    userName: string;
    userAvatar: string | null;
    date: Date;
    status: string; // Or use RequestStatus enum if available, but string is safer for generic analytics
    budget: number;
    actual: number;
    variance: number;
}
