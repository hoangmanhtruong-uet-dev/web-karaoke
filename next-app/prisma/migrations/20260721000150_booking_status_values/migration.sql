-- PostgreSQL requires newly-added enum values to be committed before they can
-- be referenced by constraints in a later migration.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'checkedIn';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'expired';
