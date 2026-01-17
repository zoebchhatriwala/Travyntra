-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TRAVEL_AGENT', 'COMPANY_ADMIN', 'EMPLOYEE', 'AGENCY_EMPLOYEE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PENDING_COMPANY_APPROVAL', 'PENDING_QUOTATION', 'PENDING_AGENT_ACTION', 'IN_PROGRESS', 'APPROVED', 'BOOKED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('PASSPORT', 'VISA', 'TICKET', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('ENTERPRISE', 'AGENT');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('ALL', 'ANY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'WAITING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('REQUEST_CREATED', 'SUBMITTED', 'APPROVED_STEP', 'REJECTED', 'APPROVED', 'AUTO_APPROVED', 'AUTO_APPROVAL_REVOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FLIGHT', 'HOTEL', 'TRAIN', 'MEALS', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkflowStepKind" AS ENUM ('INTERNAL_APPROVAL', 'AGENT_QUOTATION');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "type" "CompanyType" NOT NULL DEFAULT 'ENTERPRISE',
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "policyThreshold" JSONB,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "avatarUrl" TEXT,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" DEFAULT 'INFO',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agencyId" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "destination" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "budget" JSONB,
    "cost" JSONB,
    "preferences" JSONB,
    "parentTripId" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBid" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "amount" JSONB,
    "taxes" JSONB,
    "message" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "WorkflowActionType" NOT NULL,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "fulfillmentItemId" TEXT,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ApprovalType" NOT NULL DEFAULT 'ANY',
    "kind" "WorkflowStepKind" NOT NULL DEFAULT 'INTERNAL_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestApprovalStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApproval" (
    "id" TEXT NOT NULL,
    "requestApprovalStepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "taxes" JSONB,
    "dueDate" TIMESTAMP(3),
    "requestId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxTemplate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "taxes" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserToWorkflowStep" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToWorkflowStep_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RequestCollaborators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RequestCollaborators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TripRequest_companyId_status_idx" ON "TripRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "TripRequest_userId_status_idx" ON "TripRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "AgentBid_requestId_agencyId_idx" ON "AgentBid"("requestId", "agencyId");

-- CreateIndex
CREATE INDEX "AgentBid_agencyId_status_idx" ON "AgentBid"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Expense_requestId_idx" ON "Expense"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_companyId_key" ON "ApprovalWorkflow"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestApprovalStep_requestId_stepId_key" ON "RequestApprovalStep"("requestId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApproval_requestApprovalStepId_userId_key" ON "UserApproval"("requestApprovalStepId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_requestId_key" ON "Invoice"("requestId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_status_idx" ON "Invoice"("companyId", "status");

-- CreateIndex
CREATE INDEX "Invoice_agencyId_status_idx" ON "Invoice"("agencyId", "status");

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_idx" ON "ActivityLog"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyIntegration_companyId_agencyId_key" ON "AgencyIntegration"("companyId", "agencyId");

-- CreateIndex
CREATE INDEX "TaxTemplate_agencyId_idx" ON "TaxTemplate"("agencyId");

-- CreateIndex
CREATE INDEX "_UserToWorkflowStep_B_index" ON "_UserToWorkflowStep"("B");

-- CreateIndex
CREATE INDEX "_RequestCollaborators_B_index" ON "_RequestCollaborators"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_parentTripId_fkey" FOREIGN KEY ("parentTripId") REFERENCES "TripRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBid" ADD CONSTRAINT "AgentBid_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBid" ADD CONSTRAINT "AgentBid_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "FulfillmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApprovalStep" ADD CONSTRAINT "RequestApprovalStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApprovalStep" ADD CONSTRAINT "RequestApprovalStep_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApproval" ADD CONSTRAINT "UserApproval_requestApprovalStepId_fkey" FOREIGN KEY ("requestApprovalStepId") REFERENCES "RequestApprovalStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApproval" ADD CONSTRAINT "UserApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxTemplate" ADD CONSTRAINT "TaxTemplate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToWorkflowStep" ADD CONSTRAINT "_UserToWorkflowStep_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToWorkflowStep" ADD CONSTRAINT "_UserToWorkflowStep_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestCollaborators" ADD CONSTRAINT "_RequestCollaborators_A_fkey" FOREIGN KEY ("A") REFERENCES "TripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestCollaborators" ADD CONSTRAINT "_RequestCollaborators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
