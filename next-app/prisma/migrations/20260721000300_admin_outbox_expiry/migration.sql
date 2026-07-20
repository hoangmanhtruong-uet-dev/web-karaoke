-- Production admin, expiry and transactional-outbox additions.
DO $$ BEGIN CREATE TYPE "AdminRole" AS ENUM ('user', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BookingSource" AS ENUM ('website', 'admin', 'phone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OutboxEventType" AS ENUM (
  'bookingCreated', 'bookingConfirmed', 'bookingRejected', 'bookingCancelled',
  'bookingExpired', 'bookingRoomChanged', 'bookingReminder', 'contactRequestCreated'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'processed', 'failed', 'deadLetter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationChannel" AS ENUM ('email', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" "BookingSource" NOT NULL DEFAULT 'website';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "code" VARCHAR(20);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMPTZ(3);

UPDATE "Booking" SET "code" = 'RK-' || upper(substr(md5("id"), 1, 10)) WHERE "code" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_code_key" ON "Booking"("code");

-- Existing pending bookings receive a fresh hold window for review. The migration
-- deliberately does not change their status or auto-expire historical data.
UPDATE "Booking"
SET "expiresAt" = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
WHERE "status" = 'pending' AND "expiresAt" IS NULL;

CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL, "email" VARCHAR(255) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL, "role" "AdminRole" NOT NULL DEFAULT 'staff',
  "isActive" BOOLEAN NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX IF NOT EXISTS "AdminUser_role_isActive_idx" ON "AdminUser"("role", "isActive");

CREATE TABLE IF NOT EXISTS "AuthLoginAttempt" (
  "identifierHash" VARCHAR(64) NOT NULL, "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMPTZ(3) NOT NULL, "blockedUntil" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthLoginAttempt_pkey" PRIMARY KEY ("identifierHash")
);
CREATE INDEX IF NOT EXISTS "AuthLoginAttempt_blockedUntil_idx" ON "AuthLoginAttempt"("blockedUntil");

CREATE TABLE IF NOT EXISTS "AdminNote" (
  "id" TEXT NOT NULL, "authorId" TEXT NOT NULL, "bookingId" TEXT,
  "contactRequestId" TEXT, "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminNote_one_entity" CHECK (num_nonnulls("bookingId", "contactRequestId") = 1)
);
CREATE INDEX IF NOT EXISTS "AdminNote_bookingId_createdAt_idx" ON "AdminNote"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminNote_contactRequestId_createdAt_idx" ON "AdminNote"("contactRequestId", "createdAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL, "actorId" TEXT, "actorRole" VARCHAR(30) NOT NULL,
  "action" VARCHAR(80) NOT NULL, "entityType" VARCHAR(40) NOT NULL, "entityId" TEXT NOT NULL,
  "oldValue" JSONB, "newValue" JSONB, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  "id" TEXT NOT NULL, "eventType" "OutboxEventType" NOT NULL,
  "aggregateType" VARCHAR(40) NOT NULL, "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "idempotencyKey" VARCHAR(180) NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'pending', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ(3), "lockToken" VARCHAR(100), "processedAt" TIMESTAMPTZ(3),
  "lastError" VARCHAR(500), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_nextAttemptAt_createdAt_idx" ON "OutboxEvent"("status", "nextAttemptAt", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "id" TEXT NOT NULL, "outboxEventId" TEXT NOT NULL, "bookingId" TEXT,
  "channel" "NotificationChannel" NOT NULL, "recipientHash" VARCHAR(64) NOT NULL, "recipientMasked" VARCHAR(255) NOT NULL,
  "template" VARCHAR(80) NOT NULL, "status" "DeliveryStatus" NOT NULL,
  "providerMessageId" VARCHAR(255), "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" VARCHAR(500), "sentAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDelivery_outboxEventId_channel_recipientHash_key"
  ON "NotificationDelivery"("outboxEventId", "channel", "recipientHash");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_bookingId_createdAt_idx" ON "NotificationDelivery"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_status_startAt_idx" ON "Booking"("status", "startAt");
CREATE INDEX IF NOT EXISTS "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

DO $$ BEGIN ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_contactRequestId_fkey" FOREIGN KEY ("contactRequestId") REFERENCES "ContactRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
