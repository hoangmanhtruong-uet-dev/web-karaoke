import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ContactRequestInput } from "@/lib/contact-domain"

const fakeDatabase = vi.hoisted(() => {
  const contacts = new Map<
    string,
    { id: string; idempotencyKey: string; requestHash: string; createdAt: Date }
  >()
  let createCount = 0
  let transactionQueue = Promise.resolve()
  const outboxCreate = vi.fn(async () => ({ id: "event-1" }))
  const tx = {
    $executeRaw: async () => 1,
    contactRequest: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
        contacts.get(where.idempotencyKey) ?? null,
      create: async ({
        data,
      }: {
        data: { idempotencyKey: string; requestHash: string }
      }) => {
        createCount += 1
        const contact = {
          id: `contact-${createCount}`,
          idempotencyKey: data.idempotencyKey,
          requestHash: data.requestHash,
          createdAt: new Date("2030-07-23T10:00:00.000Z"),
        }
        contacts.set(contact.idempotencyKey, contact)
        return contact
      },
    },
    outboxEvent: { create: outboxCreate },
  }
  return {
    prisma: {
      $transaction: async <Result>(
        callback: (client: typeof tx) => Promise<Result>
      ) => {
        let release: () => void = () => undefined
        const previous = transactionQueue
        transactionQueue = new Promise<void>((resolve) => {
          release = resolve
        })
        await previous
        try {
          return await callback(tx)
        } finally {
          release()
        }
      },
    },
    reset() {
      contacts.clear()
      createCount = 0
      transactionQueue = Promise.resolve()
      outboxCreate.mockClear()
    },
    getCreateCount: () => createCount,
    outboxCreate,
  }
})

vi.mock("@/lib/prisma", () => ({ default: fakeDatabase.prisma }))

import { createContactRequest } from "@/lib/contact-service"

const input: ContactRequestInput = {
  name: "Nguyen An",
  phone: "0901234567",
  email: "an@example.test",
  message: "Tu van phong VIP",
}

describe("contact idempotency", () => {
  beforeEach(() => fakeDatabase.reset())

  it("creates one row and one outbox event for a concurrent retry burst", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createContactRequest(input, "contact-request-key-0001", true)
      )
    )
    expect(new Set(results.map((result) => result.id))).toEqual(
      new Set(["contact-1"])
    )
    expect(results.filter((result) => !result.replayed)).toHaveLength(1)
    expect(fakeDatabase.getCreateCount()).toBe(1)
    expect(fakeDatabase.outboxCreate).toHaveBeenCalledTimes(1)
  })

  it("rejects reuse of a key with a different payload", async () => {
    await createContactRequest(input, "contact-request-key-0001", true)
    await expect(
      createContactRequest(
        { ...input, message: "Different request" },
        "contact-request-key-0001",
        true
      )
    ).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_KEY_REUSED" })
    expect(fakeDatabase.getCreateCount()).toBe(1)
  })
})
