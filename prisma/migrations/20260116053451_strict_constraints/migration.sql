-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AgencyIntegration" DROP CONSTRAINT "AgencyIntegration_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "AgencyIntegration" DROP CONSTRAINT "AgencyIntegration_companyId_fkey";

-- DropForeignKey
ALTER TABLE "AgentBid" DROP CONSTRAINT "AgentBid_agentId_fkey";

-- DropForeignKey
ALTER TABLE "AgentBid" DROP CONSTRAINT "AgentBid_requestId_fkey";

-- DropForeignKey
ALTER TABLE "ApprovalWorkflow" DROP CONSTRAINT "ApprovalWorkflow_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_fulfillmentItemId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploaderId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_requestId_fkey";

-- DropForeignKey
ALTER TABLE "FulfillmentItem" DROP CONSTRAINT "FulfillmentItem_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "RequestApprovalStep" DROP CONSTRAINT "RequestApprovalStep_requestId_fkey";

-- DropForeignKey
ALTER TABLE "RequestApprovalStep" DROP CONSTRAINT "RequestApprovalStep_stepId_fkey";

-- DropForeignKey
ALTER TABLE "TripRequest" DROP CONSTRAINT "TripRequest_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TripRequest" DROP CONSTRAINT "TripRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UserApproval" DROP CONSTRAINT "UserApproval_requestApprovalStepId_fkey";

-- DropForeignKey
ALTER TABLE "UserApproval" DROP CONSTRAINT "UserApproval_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAction" DROP CONSTRAINT "WorkflowAction_actorId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAction" DROP CONSTRAINT "WorkflowAction_requestId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowStep" DROP CONSTRAINT "WorkflowStep_workflowId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRequest" ADD CONSTRAINT "TripRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBid" ADD CONSTRAINT "AgentBid_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
