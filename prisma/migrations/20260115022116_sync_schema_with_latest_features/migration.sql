/*
  Warnings:

  - The `amount` column on the `AgentBid` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `budget` column on the `TripRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `destination` on the `TripRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "ApprovalStatus" ADD VALUE 'WAITING';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'AGENCY_EMPLOYEE';

-- AlterTable
ALTER TABLE "AgentBid" DROP COLUMN "amount",
ADD COLUMN     "amount" JSONB;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "policyThreshold" JSONB;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fulfillmentItemId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "TripRequest" ADD COLUMN     "cost" JSONB,
DROP COLUMN "destination",
ADD COLUMN     "destination" JSONB NOT NULL,
DROP COLUMN "budget",
ADD COLUMN     "budget" JSONB;

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
CREATE TABLE "AgencyIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyIntegration_companyId_agencyId_key" ON "AgencyIntegration"("companyId", "agencyId");

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TripRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "FulfillmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyIntegration" ADD CONSTRAINT "AgencyIntegration_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
