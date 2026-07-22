import prisma from "../src/lib/prisma"
import { passwordSchema } from "../src/lib/password-policy"
import {
  seedBranches,
  seedMenuItems,
  seedRooms,
  seedServices,
} from "./seeds/data"
import { hash } from "bcryptjs"

async function seed() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_SEED_PASSWORD
  const adminName =
    process.env.ADMIN_SEED_NAME?.trim() || "System Administrator"

  if (process.env.NODE_ENV === "production" && (adminEmail || adminPassword)) {
    throw new Error(
      "ADMIN_SEED_* is disabled in production; use the one-time bootstrap command"
    )
  }

  if (
    (adminEmail || adminPassword) &&
    process.env.ALLOW_DEV_ADMIN_SEED !== "true"
  ) {
    throw new Error(
      "Set ALLOW_DEV_ADMIN_SEED=true to create a development admin"
    )
  }

  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error(
      "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be configured together"
    )
  }
  if (adminEmail && adminPassword) {
    if (!passwordSchema.safeParse(adminPassword).success) {
      throw new Error(
        "ADMIN_SEED_PASSWORD must meet the strong-password and bcrypt length policy"
      )
    }
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    })
    if (!existingAdmin) {
      const passwordHash = await hash(adminPassword, 12)
      await prisma.adminUser.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: "admin",
          isActive: true,
          mustChangePassword: true,
        },
      })
    }
  }
  for (const branch of seedBranches) {
    const data = {
      name: branch.name,
      slug: branch.slug,
      address: branch.address,
      district: branch.district,
      city: branch.city,
      phone: branch.phone,
      email: branch.email,
      openingHours: branch.openingHours,
      amenities: branch.amenities,
      status:
        branch.status === "coming-soon"
          ? ("comingSoon" as const)
          : (branch.status as "active" | "maintenance"),
      imageUrl: branch.imageUrl,
    }

    await prisma.branch.upsert({
      where: { id: branch.id },
      create: { id: branch.id, ...data },
      update: data,
    })
  }

  for (const room of seedRooms) {
    const data = {
      branchId: room.branchId,
      name: room.name,
      slug: room.slug,
      tier: room.tier,
      capacity: room.capacity,
      hourlyRate: room.hourlyRate,
      features: room.features,
      status: room.status,
      imageUrl: room.imageUrl,
    }

    await prisma.room.upsert({
      where: { id: room.id },
      create: { id: room.id, ...data },
      update: data,
    })
  }

  for (const item of seedMenuItems) {
    const data = {
      name: item.name,
      slug: item.slug,
      category: item.category,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      isSignature: item.isSignature,
      isAvailable: item.isAvailable,
    }

    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data,
    })
  }

  for (const service of seedServices) {
    const data = {
      name: service.name,
      slug: service.slug,
      category: service.category,
      description: service.description,
      unit: service.unit,
      price: service.price,
      isAvailable: service.isAvailable,
      imageUrl: service.imageUrl,
    }

    await prisma.service.upsert({
      where: { id: service.id },
      create: { id: service.id, ...data },
      update: data,
    })
  }

  console.info("Seed completed", {
    branches: seedBranches.length,
    rooms: seedRooms.length,
    menuItems: seedMenuItems.length,
    services: seedServices.length,
  })
}

seed()
  .catch((error: unknown) => {
    console.error(
      "Seed failed",
      error instanceof Error ? error.message : "Unknown error"
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
