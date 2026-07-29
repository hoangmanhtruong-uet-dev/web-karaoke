import { hash } from "bcryptjs"
import { z } from "zod"

import { logger } from "../src/lib/logger"
import prisma from "../src/lib/prisma"
import { passwordSchema } from "../src/lib/password-policy"

const bootstrapSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(255)
      .transform((value) => value.toLowerCase()),
    name: z.string().trim().min(2).max(120),
    password: passwordSchema,
  })
  .strict()

async function bootstrap() {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true")
    throw new Error(
      "Set ALLOW_ADMIN_BOOTSTRAP=true for this one-time operation"
    )
  const parsed = bootstrapSchema.safeParse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  })
  if (!parsed.success)
    throw new Error(
      "Valid BOOTSTRAP_ADMIN_EMAIL, NAME and strong PASSWORD are required"
    )
  const passwordHash = await hash(parsed.data.password, 12)
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('admin-bootstrap', 0))`
    const activeAdmins = await tx.adminUser.count({
      where: { role: "admin", isActive: true },
    })
    if (activeAdmins > 0)
      throw new Error("Bootstrap refused: an active admin already exists")
    const admin = await tx.adminUser.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: "admin",
        isActive: true,
        mustChangePassword: true,
      },
      select: { id: true },
    })
    await tx.auditLog.create({
      data: {
        actorRole: "system",
        action: "staff.bootstrapCreated",
        entityType: "adminUser",
        entityId: admin.id,
        newValue: { role: "admin", isActive: true, mustChangePassword: true },
        metadata: { source: "one-time-bootstrap" },
        result: "success",
      },
    })
  })
  logger.info("admin_bootstrap_created", { actionRequired: "remove_bootstrap_environment_variables" })
}

bootstrap()
  .catch((error: unknown) => {
    logger.error("admin_bootstrap_failed", { errorCode: error instanceof Error ? error.constructor.name : "UNKNOWN" })
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
