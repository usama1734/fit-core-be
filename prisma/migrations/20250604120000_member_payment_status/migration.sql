-- CreateEnum
CREATE TYPE "MemberPaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "paymentStatus" "MemberPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Existing members with an active plan are treated as paid
UPDATE "Member"
SET "paymentStatus" = 'PAID'
WHERE "membershipPlanId" IS NOT NULL;
