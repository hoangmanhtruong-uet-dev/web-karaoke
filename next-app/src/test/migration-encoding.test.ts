import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migrationsDir = path.resolve(process.cwd(), "prisma/migrations")
const migrationFiles = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))

describe("migration file encoding", () => {
  it.each(migrationFiles)("%s does not start with a UTF-8 BOM", (file) => {
    const bytes = readFileSync(file).subarray(0, 3)
    expect([...bytes]).not.toEqual([0xef, 0xbb, 0xbf])
  })
})
