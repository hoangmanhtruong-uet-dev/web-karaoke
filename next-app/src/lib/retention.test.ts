import { describe, expect, it } from "vitest"
import { assertRetentionDryRun, selectRetentionCandidates } from "@/lib/retention"

describe("retention", () => {
  it("selects only records older than the configured cutoff", () => {
    const now = new Date("2026-01-31T00:00:00.000Z")
    const records = [{ createdAt: new Date("2025-12-01") }, { createdAt: new Date("2026-01-15") }]
    expect(selectRetentionCandidates(records, "session", now, { booking: 1, customer: 1, session: 30 * 86400000, auditLog: 1, securityEvent: 1, payment: 1 })).toHaveLength(1)
  })

  it("guards destructive production runs", () => {
    expect(() => assertRetentionDryRun("production", false)).toThrow(/Production retention/)
    expect(() => assertRetentionDryRun("production", true)).not.toThrow()
  })
})
