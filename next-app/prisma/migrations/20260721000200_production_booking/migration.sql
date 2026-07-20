-- Add production-safe booking/contact fields without removing legacy columns.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'checkedIn';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'expired';

DO $$ BEGIN
  CREATE TYPE "ContactStatus" AS ENUM ('new', 'inProgress', 'resolved', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContactRequest" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "email" VARCHAR(255),
  "message" TEXT NOT NULL,
  "status" "ContactStatus" NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContactRequest_status_createdAt_idx"
  ON "ContactRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactRequest_phone_idx" ON "ContactRequest"("phone");

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMPTZ(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(100);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "requestHash" VARCHAR(64);

-- Backfill only well-formed legacy values. Invalid legacy rows are preserved and
-- can be repaired manually; every new API booking always supplies both columns.
UPDATE "Booking"
SET
  "startAt" = ("date"::date + "startTime"::time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
  "endAt" = (("date"::date + "startTime"::time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
    + ("durationHours" * INTERVAL '1 hour')
WHERE "startAt" IS NULL
  AND "endAt" IS NULL
  AND "date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND to_char(to_date("date", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "date"
  AND "durationHours" BETWEEN 1 AND 12;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_idempotencyKey_key"
  ON "Booking"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Booking_roomId_startAt_endAt_status_idx"
  ON "Booking"("roomId", "startAt", "endAt", "status");

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_time_range"
    CHECK (
      ("startAt" IS NULL AND "endAt" IS NULL)
      OR ("startAt" IS NOT NULL AND "endAt" IS NOT NULL AND "endAt" > "startAt")
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- btree_gist lets PostgreSQL combine room equality with timestamp-range overlap.
-- The [) range makes an end time equal to another start time non-overlapping.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlapping_room_time"
    EXCLUDE USING gist (
      "roomId" WITH =,
      tstzrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE (
      "roomId" IS NOT NULL
      AND "startAt" IS NOT NULL
      AND "endAt" IS NOT NULL
      AND "status" IN ('pending', 'confirmed', 'checkedIn')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
