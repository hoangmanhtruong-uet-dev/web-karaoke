-- Baseline migration for the existing MVP schema.
-- IF NOT EXISTS keeps this migration safe for databases that were previously
-- created with `prisma db push` but had no migration history.
DO $$ BEGIN
  CREATE TYPE "BranchStatus" AS ENUM ('active', 'maintenance', 'coming-soon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoomTier" AS ENUM ('standard', 'vip', 'premium', 'presidential');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MenuCategory" AS ENUM ('drink', 'food', 'combo', 'fruit', 'snack');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" VARCHAR(255),
  "openingHours" JSONB NOT NULL,
  "amenities" JSONB NOT NULL,
  "status" "BranchStatus" NOT NULL DEFAULT 'active',
  "imageUrl" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Room" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "tier" "RoomTier" NOT NULL,
  "capacity" JSONB NOT NULL,
  "hourlyRate" INTEGER NOT NULL,
  "features" JSONB NOT NULL,
  "status" "RoomStatus" NOT NULL DEFAULT 'available',
  "imageUrl" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" "MenuCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "imageUrl" VARCHAR(500),
  "isSignature" BOOLEAN NOT NULL DEFAULT false,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "roomId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" VARCHAR(255),
  "guestCount" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "durationHours" INTEGER NOT NULL DEFAULT 3,
  "status" "BookingStatus" NOT NULL DEFAULT 'pending',
  "note" TEXT,
  "totalAmount" INTEGER,
  "paidAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingMenuItem" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "price" INTEGER NOT NULL,
  CONSTRAINT "BookingMenuItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_slug_key" ON "Branch"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Room_slug_key" ON "Room"("slug");
CREATE INDEX IF NOT EXISTS "Room_branchId_idx" ON "Room"("branchId");
CREATE INDEX IF NOT EXISTS "Room_tier_idx" ON "Room"("tier");
CREATE INDEX IF NOT EXISTS "Room_status_idx" ON "Room"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "MenuItem_slug_key" ON "MenuItem"("slug");
CREATE INDEX IF NOT EXISTS "Booking_branchId_idx" ON "Booking"("branchId");
CREATE INDEX IF NOT EXISTS "Booking_roomId_idx" ON "Booking"("roomId");
CREATE INDEX IF NOT EXISTS "Booking_status_date_idx" ON "Booking"("status", "date");
CREATE INDEX IF NOT EXISTS "Booking_customerPhone_idx" ON "Booking"("customerPhone");
CREATE UNIQUE INDEX IF NOT EXISTS "BookingMenuItem_bookingId_menuItemId_key"
  ON "BookingMenuItem"("bookingId", "menuItemId");

DO $$ BEGIN
  ALTER TABLE "Room" ADD CONSTRAINT "Room_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BookingMenuItem" ADD CONSTRAINT "BookingMenuItem_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BookingMenuItem" ADD CONSTRAINT "BookingMenuItem_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
