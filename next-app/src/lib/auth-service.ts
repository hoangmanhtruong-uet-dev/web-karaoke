import { createHash } from "node:crypto"

import { compare } from "bcryptjs"
import { z } from "zod"

import prisma from "@/lib/prisma"

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_BLOCK_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZTkHDJqDUj8mGN3z.lxH1cHjrrG3K"

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
})

export type AuthenticatedAdmin = {
  id: string
  email: string
  name: string
  role: "staff" | "admin"
}

function identifierHash(email: string) {
  return createHash("sha256").update(email).digest("hex")
}

async function registerFailedAttempt(hash: string, now: Date) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.authLoginAttempt.findUnique({ where: { identifierHash: hash } })
    const windowExpired = !existing || now.getTime() - existing.windowStartedAt.getTime() >= LOGIN_WINDOW_MS
    const attemptCount = windowExpired ? 1 : existing.attemptCount + 1
    const blockedUntil = attemptCount >= MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOGIN_BLOCK_MS)
      : null

    await tx.authLoginAttempt.upsert({
      where: { identifierHash: hash },
      create: { identifierHash: hash, attemptCount, windowStartedAt: now, blockedUntil },
      update: {
        attemptCount,
        windowStartedAt: windowExpired ? now : existing.windowStartedAt,
        blockedUntil,
      },
    })
  })
}

export async function authenticateAdmin(credentials: unknown): Promise<AuthenticatedAdmin | null> {
  const parsed = credentialsSchema.safeParse(credentials)
  if (!parsed.success) return null

  const now = new Date()
  const hash = identifierHash(parsed.data.email)
  const attempt = await prisma.authLoginAttempt.findUnique({ where: { identifierHash: hash } })
  if (attempt?.blockedUntil && attempt.blockedUntil > now) return null

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, passwordHash: true, role: true, isActive: true },
  })
  const passwordMatches = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!passwordMatches || !user || !user.isActive || (user.role !== "staff" && user.role !== "admin")) {
    await registerFailedAttempt(hash, now)
    return null
  }

  await prisma.$transaction([
    prisma.authLoginAttempt.deleteMany({ where: { identifierHash: hash } }),
    prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
  ])

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}
