import { afterEach, describe, expect, it, vi } from "vitest"
import { nextOutboxAttempt, processOutbox } from "@/lib/outbox-worker"
import prisma from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  default: { $transaction: vi.fn() },
}))

const originalProvider = process.env.EMAIL_PROVIDER

afterEach(() => {
  if (originalProvider === undefined) delete process.env.EMAIL_PROVIDER
  else process.env.EMAIL_PROVIDER = originalProvider
  vi.clearAllMocks()
})

describe("outbox retry backoff", () => {
  const now = new Date("2030-01-01T00:00:00Z")
  it.each([
    [1, 1],
    [2, 5],
    [3, 30],
    [4, 120],
    [5, 120],
  ] as const)("attempt %s waits %s minutes", (attempt, minutes) =>
    expect(nextOutboxAttempt(attempt, now).getTime() - now.getTime()).toBe(
      minutes * 60_000
    )
  )

  it("does not claim or deliver events when external notifications are disabled", async () => {
    process.env.EMAIL_PROVIDER = "disabled"
    await expect(processOutbox(now, 25)).resolves.toEqual({
      claimed: 0,
      processed: 0,
      failed: 0,
      disabled: true,
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
