-- Additive migration. Review/apply in development or staging only; never run directly on production.
DO $$ BEGIN CREATE TYPE "PricingRuleType" AS ENUM ('holiday','special','weekend','regular','defaultRoom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "roomAmount" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "priceSnapshot" JSONB;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(40);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" VARCHAR(180);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "lastWebhookId" VARCHAR(180);
CREATE TABLE IF NOT EXISTS "PricingRule" ("id" TEXT PRIMARY KEY,"name" VARCHAR(120) NOT NULL,"branchId" TEXT NOT NULL,"roomId" TEXT,"roomTier" "RoomTier","ruleType" "PricingRuleType" NOT NULL DEFAULT 'regular',"specificDate" DATE,"dayOfWeek" INTEGER,"startMinute" INTEGER NOT NULL DEFAULT 0,"endMinute" INTEGER NOT NULL DEFAULT 1440,"hourlyRate" INTEGER NOT NULL,"priority" INTEGER NOT NULL,"validFrom" DATE NOT NULL,"validTo" DATE,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PricingRule_range_check" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute" AND "hourlyRate" >= 0 AND "priority" >= 0));
CREATE INDEX IF NOT EXISTS "PricingRule_scope_idx" ON "PricingRule"("branchId","isActive","validFrom","validTo");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_key" ON "Payment"("provider","providerPaymentId");
