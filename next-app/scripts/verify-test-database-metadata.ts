import { Pool } from "pg"

import { assertSafeTestDatabase } from "./test-database-guard"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

loadLocalTestEnvironment()
enterTestEnvironment()
const testDatabaseUrl = assertSafeTestDatabase()

const pool = new Pool({
  connectionString: testDatabaseUrl,
  max: 1,
  connectionTimeoutMillis: 5_000,
})

const requiredConstraints = [
  "Booking_no_overlapping_room_time",
  "Booking_branchId_fkey",
  "Booking_roomId_fkey",
  "Booking_customerId_fkey",
  "PricingRule_branchId_fkey",
  "PricingRule_roomId_fkey",
]
const requiredIndexes = ["Booking_roomId_startAt_endAt_status_idx"]

try {
  const [constraintRows, indexRows] = await Promise.all([
    pool.query<{ name: string }>(
      `SELECT constraint_record.conname AS name
       FROM pg_constraint AS constraint_record
       JOIN pg_class AS table_record
         ON table_record.oid = constraint_record.conrelid
       JOIN pg_namespace AS schema_record
         ON schema_record.oid = table_record.relnamespace
       WHERE schema_record.nspname = 'public'
         AND table_record.relname IN ('Booking', 'PricingRule')`
    ),
    pool.query<{ name: string }>(
      `SELECT indexname AS name
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'Booking'`
    ),
  ])

  const constraints = new Set(constraintRows.rows.map(({ name }) => name))
  const indexes = new Set(indexRows.rows.map(({ name }) => name))
  const missingConstraints = requiredConstraints.filter(
    (name) => !constraints.has(name)
  )
  const missingIndexes = requiredIndexes.filter((name) => !indexes.has(name))

  for (const name of requiredConstraints) {
    console.info(
      `[metadata] constraint ${name}: ${constraints.has(name) ? "present" : "MISSING"}`
    )
  }
  for (const name of requiredIndexes) {
    console.info(
      `[metadata] index ${name}: ${indexes.has(name) ? "present" : "MISSING"}`
    )
  }

  if (missingConstraints.length > 0 || missingIndexes.length > 0) {
    const db001 = missingConstraints.filter((name) =>
      name.startsWith("PricingRule_")
    )
    if (db001.length > 0) {
      console.error(
        `[metadata] DB-001 confirmed; missing PricingRule foreign keys: ${db001.join(", ")}`
      )
    }
    throw new Error(
      `Test database metadata verification failed. Missing: ${[
        ...missingConstraints,
        ...missingIndexes,
      ].join(", ")}`
    )
  }
} finally {
  await pool.end()
}
