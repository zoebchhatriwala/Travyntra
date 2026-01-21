-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpToken" TEXT;
