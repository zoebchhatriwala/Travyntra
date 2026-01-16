import { ApprovalType } from "@prisma/client";
import { type ApprovalStepMetadata } from "./auto-approval-policy";

/**
 * Configuration for a workflow step, used in the workflow builder.
 */
export interface WorkflowStepConfig {
    id?: string;
    name: string;
    order: number;
    type: ApprovalType;
    approverIds: string[];
}

import { type UserProfile } from "@/types/user/profile";

/**
 * Detailed workflow step status for progress tracking.
 * Includes approvers and their decisions.
 */
export interface WorkflowProgressStep {
    id: string;
    stepName: string;
    stepOrder: number;
    stepType: string; // or ApprovalType
    status: string; // or ApprovalStatus
    approvers: Array<UserProfile & { role: string }>;
    approvals: Array<{
        userId: string;
        userName: string | null;
        userAvatar: string | null;
        status: string; // or ApprovalStatus
        comment: string | null;
        updatedAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
    metadata?: ApprovalStepMetadata;
}
