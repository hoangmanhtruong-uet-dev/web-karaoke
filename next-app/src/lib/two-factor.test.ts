import { randomBytes } from "node:crypto"

import { generate } from "otplib"
import { beforeEach, describe, expect, it } from "vitest"

import {
  createTotpEnrollment,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/two-factor"

describe("two-factor utilities", () => {
  beforeEach(() => {
    process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString("base64")
    process.env.RECOVERY_CODE_HASH_SECRET = "test-recovery-pepper"
  })

  it("encrypts the TOTP secret with authenticated encryption", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP")
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP")
    expect(decryptTotpSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP")
  })

  it("verifies a current token and rejects a stale token", async () => {
    const { secret } = createTotpEnrollment("admin@example.com")
    const encrypted = encryptTotpSecret(secret)
    const currentEpoch = 1_800_000_000
    const current = await generate({ secret, epoch: currentEpoch })
    const stale = await generate({ secret, epoch: currentEpoch - 120 })

    expect((await verifyTotp(encrypted, current, { epoch: currentEpoch })).valid).toBe(true)
    expect((await verifyTotp(encrypted, stale, { epoch: currentEpoch })).valid).toBe(false)
  })

  it("prevents replay of a previously accepted time step", async () => {
    const { secret } = createTotpEnrollment("admin@example.com")
    const encrypted = encryptTotpSecret(secret)
    const epoch = 1_800_000_000
    const token = await generate({ secret, epoch })
    const first = await verifyTotp(encrypted, token, { epoch })
    expect(first.valid).toBe(true)
    if (!first.valid) throw new Error("expected valid token")
    expect(
      (await verifyTotp(encrypted, token, { epoch, afterTimeStep: first.timeStep }))
        .valid
    ).toBe(false)
  })

  it("generates unique recovery codes and stable non-plaintext hashes", () => {
    const codes = generateRecoveryCodes()
    expect(new Set(codes).size).toBe(10)
    expect(hashRecoveryCode(codes[0])).toBe(hashRecoveryCode(codes[0]))
    expect(hashRecoveryCode(codes[0])).not.toContain(codes[0])
  })
})
