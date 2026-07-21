-- CRM customers, add-on services and auditable payment history for karaoke bookings.
DO $$ BEGIN CREATE TYPE "MembershipTier" AS ENUM ('regular', 'silver', 'gold', 'diamond');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CustomerStatus" AS ENUM ('active', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ServiceCategory" AS ENUM ('staff', 'decoration', 'equipment', 'event', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ServiceUnit" AS ENUM ('perBooking', 'perHour', 'perPerson', 'perItem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bankTransfer', 'card', 'eWallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "fullName" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "email" VARCHAR(255),
  "birthday" DATE,
  "membershipTier" "MembershipTier" NOT NULL DEFAULT 'regular',
  "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  "status" "CustomerStatus" NOT NULL DEFAULT 'active',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_loyaltyPoints_nonnegative" CHECK ("loyaltyPoints" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Customer_fullName_idx" ON "Customer"("fullName");
CREATE INDEX IF NOT EXISTS "Customer_membershipTier_status_idx" ON "Customer"("membershipTier", "status");

CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" TEXT NOT NULL,
  "category" "ServiceCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "unit" "ServiceUnit" NOT NULL,
  "price" INTEGER NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "imageUrl" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Service_price_nonnegative" CHECK ("price" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");
CREATE INDEX IF NOT EXISTS "Service_category_isAvailable_idx" ON "Service"("category", "isAvailable");

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

-- Convert existing booking contacts into one CRM row per phone number.
INSERT INTO "Customer" ("id", "fullName", "phone", "email", "createdAt", "updatedAt")
SELECT DISTINCT ON ("customerPhone")
  'customer-' || md5("customerPhone"),
  "customerName",
  "customerPhone",
  "customerEmail",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "Booking"
ORDER BY "customerPhone", "createdAt" DESC
ON CONFLICT ("phone") DO NOTHING;

UPDATE "Booking" AS booking
SET "customerId" = customer."id"
FROM "Customer" AS customer
WHERE booking."customerId" IS NULL
  AND booking."customerPhone" = customer."phone";

CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId");
DO $$ BEGIN ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BookingService" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingService_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "BookingService_unitPrice_nonnegative" CHECK ("unitPrice" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "BookingService_bookingId_serviceId_key"
  ON "BookingService"("bookingId", "serviceId");
CREATE INDEX IF NOT EXISTS "BookingService_serviceId_idx" ON "BookingService"("serviceId");
DO $$ BEGIN ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "transactionCode" VARCHAR(100),
  "paidAt" TIMESTAMPTZ(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionCode_key" ON "Payment"("transactionCode");
CREATE INDEX IF NOT EXISTS "Payment_bookingId_status_createdAt_idx" ON "Payment"("bookingId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
