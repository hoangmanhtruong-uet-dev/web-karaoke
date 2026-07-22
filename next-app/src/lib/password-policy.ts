import { Buffer } from "node:buffer"

import { z } from "zod"

const MAX_BCRYPT_PASSWORD_BYTES = 72

function fitsBcryptInput(value: string) {
  return Buffer.byteLength(value, "utf8") <= MAX_BCRYPT_PASSWORD_BYTES
}

const bcryptLengthMessage = "Password must be at most 72 UTF-8 bytes"

export const currentPasswordSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(fitsBcryptInput, bcryptLengthMessage)

export const loginPasswordSchema = z
  .string()
  .min(12)
  .max(200)
  .refine(fitsBcryptInput, bcryptLengthMessage)

export const passwordSchema = z
  .string()
  .min(12)
  .max(200)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .refine(fitsBcryptInput, bcryptLengthMessage)
