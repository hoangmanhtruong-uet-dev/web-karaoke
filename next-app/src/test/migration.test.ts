import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migrationPath = path.resolve(
  process.cwd(),
  "prisma/migrations/20260721000200_production_booking/migration.sql"
)

describe("database booking protection", () => {
  const migration = readFileSync(migrationPath, "utf8")

  it("has a database exclusion constraint for active room bookings", () => {
    expect(migration).toContain("Booking_no_overlapping_room_time")
    expect(migration).toContain("EXCLUDE USING gist")
    expect(migration).toContain("'pending', 'confirmed', 'checkedIn'")
  })

  it("uses a half-open range so adjacent bookings are allowed", () => {
    expect(migration).toContain("tstzrange(\"startAt\", \"endAt\", '[)')")
  })

  it("has a unique idempotency key", () => {
    expect(migration).toContain("Booking_idempotencyKey_key")
    expect(migration).toContain("CREATE UNIQUE INDEX")
  })

  it("keeps expired bookings outside the occupying-status constraint", () => {
    expect(migration).not.toMatch(/status" IN \([^)]*expired/)
  })
})
