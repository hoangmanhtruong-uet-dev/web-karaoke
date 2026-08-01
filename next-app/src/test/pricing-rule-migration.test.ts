import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "prisma/migrations/20260801000100_pricing_rule_foreign_keys/migration.sql"
  ),
  "utf8"
)

describe("pricing rule foreign-key migration", () => {
  it("links pricing rules to their branch", () => {
    expect(migration).toContain('CONSTRAINT "PricingRule_branchId_fkey"')
    expect(migration).toContain(
      'FOREIGN KEY ("branchId") REFERENCES "Branch"("id")'
    )
    expect(migration).toContain("ON DELETE CASCADE ON UPDATE CASCADE")
  })

  it("links room-scoped pricing rules to their room", () => {
    expect(migration).toContain('CONSTRAINT "PricingRule_roomId_fkey"')
    expect(migration).toContain(
      'FOREIGN KEY ("roomId") REFERENCES "Room"("id")'
    )
  })
})
