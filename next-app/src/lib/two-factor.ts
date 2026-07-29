import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

import { generateSecret, generateURI, verify } from "otplib"

const TOTP_PERIOD_SECONDS = 30
const TOTP_TOLERANCE_SECONDS: [number, number] = [30, 0]

function encryptionKey() {
  const encoded = process.env.TOTP_ENCRYPTION_KEY?.trim()
  if (!encoded) throw new Error("TOTP_ENCRYPTION_KEY is required")
  const key = Buffer.from(encoded, "base64")
  if (key.length !== 32)
    throw new Error("TOTP_ENCRYPTION_KEY must be a base64-encoded 32-byte key")
  return key
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")
}

export function decryptTotpSecret(payload: string) {
  const [version, iv, tag, ciphertext] = payload.split(".")
  if (version !== "v1" || !iv || !tag || !ciphertext)
    throw new Error("Invalid encrypted TOTP secret")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function createTotpEnrollment(email: string, issuer = "Royal Karaoke") {
  const secret = generateSecret({ length: 20 })
  return {
    secret,
    uri: generateURI({
      issuer,
      label: email,
      secret,
      algorithm: "sha1",
      digits: 6,
      period: TOTP_PERIOD_SECONDS,
    }),
  }
}

export async function verifyTotp(
  encryptedSecret: string,
  token: string,
  options: { epoch?: number; afterTimeStep?: number | null } = {}
) {
  if (!/^\d{6}$/.test(token)) return { valid: false as const }
  const result = await verify({
    secret: decryptTotpSecret(encryptedSecret),
    token,
    algorithm: "sha1",
    digits: 6,
    period: TOTP_PERIOD_SECONDS,
    epoch: options.epoch,
    epochTolerance: TOTP_TOLERANCE_SECONDS,
    ...(typeof options.afterTimeStep === "number"
      ? { afterTimeStep: options.afterTimeStep }
      : {}),
  })
  if (!result.valid || !("timeStep" in result))
    return { valid: false as const }
  return { valid: true as const, timeStep: result.timeStep }
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const value = randomBytes(8).toString("hex").toUpperCase()
    return `RK-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`
  })
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function hashRecoveryCode(code: string) {
  const pepper =
    process.env.RECOVERY_CODE_HASH_SECRET ??
    process.env.SECURITY_EVENT_HASH_SECRET ??
    process.env.AUTH_SECRET
  if (!pepper) throw new Error("RECOVERY_CODE_HASH_SECRET is required")
  return createHash("sha256")
    .update(`${pepper}:${normalizeRecoveryCode(code)}`)
    .digest("hex")
}
