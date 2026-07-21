import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "prisma/migrations/20260721000400_customer_services_payments/migration.sql"
  ),
  "utf8"
)

describe("customer, service and payment migration", () => {
  it.each(["Customer", "Service", "BookingService", "Payment"])(
    "creates the %s table",
    (table) => expect(migration).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`)
  )

  it("backfills customer records and connects old bookings", () => {
    expect(migration).toContain('INSERT INTO "Customer"')
    expect(migration).toContain('UPDATE "Booking" AS booking')
    expect(migration).toContain('booking."customerPhone" = customer."phone"')
  })

  it("protects quantities and money from invalid values", () => {
    expect(migration).toContain('CHECK ("quantity" > 0)')
    expect(migration).toContain('CHECK ("unitPrice" >= 0)')
    expect(migration).toContain('CHECK ("amount" > 0)')
  })
})
