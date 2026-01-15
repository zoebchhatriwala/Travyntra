-- AlterTable
ALTER TABLE "AgentBid" ADD COLUMN     "taxes" JSONB;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "taxes" JSONB;

-- AlterTable
ALTER TABLE "RequestApprovalStep" ADD COLUMN     "metadata" JSONB;

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

-- CreateIndex
CREATE INDEX "TaxTemplate_agencyId_idx" ON "TaxTemplate"("agencyId");

-- AddForeignKey
ALTER TABLE "TaxTemplate" ADD CONSTRAINT "TaxTemplate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
