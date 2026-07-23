import { afterEach, describe, expect, it, vi } from "vitest"

const transaction = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({ default: { $transaction: transaction } }))

import { GET } from "@/app/api/health/ready/route"

afterEach(() => vi.unstubAllEnvs())

describe("GET /api/health/ready", () => {
  it("returns 503 during a database outage and recovers without process restart", async () => {
    vi.stubEnv("NODE_ENV", "test")
    transaction
      .mockRejectedValueOnce(
        Object.assign(new Error("offline"), { code: "P1001" })
      )
      .mockResolvedValueOnce([{ result: 1 }])

    const unavailable = await GET()
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get("Retry-After")).toBe("5")

    const recovered = await GET()
    expect(recovered.status).toBe(200)
    expect(await recovered.json()).toEqual({ status: "ready" })
  })
})
