import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
const sql=readFileSync(path.resolve(process.cwd(),"prisma/migrations/20260721000300_admin_outbox_expiry/migration.sql"),"utf8")
describe("admin/outbox/expiry migration",()=>{
  it("adds and backfills expiresAt without expiring rows",()=>{expect(sql).toContain('ADD COLUMN IF NOT EXISTS "expiresAt"');expect(sql).toContain('SET "expiresAt"');expect(sql).not.toMatch(/SET\s+"status"\s*=\s*'expired'/)})
  it("indexes expiry and outbox worker queries",()=>{expect(sql).toContain("Booking_status_expiresAt_idx");expect(sql).toContain("OutboxEvent_status_nextAttemptAt_createdAt_idx")})
  it("enforces unique outbox event and delivery idempotency",()=>{expect(sql).toContain("OutboxEvent_idempotencyKey_key");expect(sql).toContain("NotificationDelivery_outboxEventId_channel_recipientHash_key")})
  it("stores password hashes but no plaintext password",()=>{expect(sql).toContain('"passwordHash"');expect(sql).not.toMatch(/"password"\s+VARCHAR/)})
})
