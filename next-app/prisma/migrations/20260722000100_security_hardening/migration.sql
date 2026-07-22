-- Security hardening additions are backward-compatible and additive.
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'manager' AFTER 'staff';

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMPTZ(3);

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "requestId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "ipAddressHash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "userAgent" VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "result" VARCHAR(30);

CREATE TABLE IF NOT EXISTS "SecurityRateLimit" (
  "keyHash" VARCHAR(64) NOT NULL,
  "scope" VARCHAR(60) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
  "blockedUntil" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX IF NOT EXISTS "SecurityRateLimit_scope_blockedUntil_idx"
  ON "SecurityRateLimit"("scope", "blockedUntil");
CREATE INDEX IF NOT EXISTS "SecurityRateLimit_updatedAt_idx"
  ON "SecurityRateLimit"("updatedAt");

-- Rollback (only after confirming no manager accounts remain): drop the new table/columns.
-- PostgreSQL enum values cannot be safely removed in place; recreate AdminRole without
-- 'manager' during a planned rollback window if a full rollback is required.
