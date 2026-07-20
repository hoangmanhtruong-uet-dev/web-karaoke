import { describe, it } from "vitest"

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL)

describe.skipIf(!hasTestDatabase)("PostgreSQL production invariants", () => {
  it.todo("runs migrations on an isolated TEST_DATABASE_URL")
  it.todo("rejects concurrent overlapping bookings through the exclusion constraint")
  it.todo("serializes concurrent room reassignment")
  it.todo("allows only one winner for confirm versus expire")
  it.todo("lets only one worker claim an outbox event")
  it.todo("rolls back booking and outbox atomically")
})
