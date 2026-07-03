import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { seedBranches, seedRooms, seedMenuItems } from "../../../../prisma/seeds/data"

// Only allow seeding in development or when explicitly enabled
const SEEDING_ENABLED = process.env.ALLOW_SEEDING === "true"

export async function GET() {
  if (!SEEDING_ENABLED) {
    return NextResponse.json(
      { error: "Seeding is disabled. Set ALLOW_SEEDING=true to enable." },
      { status: 403 }
    )
  }

  try {
    // Seed Branches
    const branches = []
    for (const branch of seedBranches) {
      const created = await prisma.branch.upsert({
        where: { id: branch.id },
        create: {
          id: branch.id,
          name: branch.name,
          slug: branch.slug,
          address: branch.address,
          district: branch.district,
          city: branch.city,
          phone: branch.phone,
          email: branch.email,
          openingHours: branch.openingHours,
          amenities: branch.amenities,
          status: branch.status === "coming-soon" ? "comingSoon" : (branch.status as "active" | "maintenance"),
          imageUrl: branch.imageUrl,
        },
        update: {
          name: branch.name,
          slug: branch.slug,
          address: branch.address,
          district: branch.district,
          city: branch.city,
          phone: branch.phone,
          email: branch.email,
          openingHours: branch.openingHours,
          amenities: branch.amenities,
          status: branch.status === "coming-soon" ? "comingSoon" : (branch.status as "active" | "maintenance"),
          imageUrl: branch.imageUrl,
        },
      })
      branches.push(created)
    }

    // Seed Rooms
    const rooms = []
    for (const room of seedRooms) {
      const created = await prisma.room.upsert({
        where: { id: room.id },
        create: {
          id: room.id,
          branchId: room.branchId,
          name: room.name,
          slug: room.slug,
          tier: room.tier as "standard" | "vip" | "premium" | "presidential",
          capacity: room.capacity,
          hourlyRate: room.hourlyRate,
          features: room.features,
          status: room.status as "available" | "occupied" | "maintenance",
          imageUrl: room.imageUrl,
        },
        update: {
          branchId: room.branchId,
          name: room.name,
          slug: room.slug,
          tier: room.tier as "standard" | "vip" | "premium" | "presidential",
          capacity: room.capacity,
          hourlyRate: room.hourlyRate,
          features: room.features,
          status: room.status as "available" | "occupied" | "maintenance",
          imageUrl: room.imageUrl,
        },
      })
      rooms.push(created)
    }

    // Seed Menu Items
    const menuItems = []
    for (const item of seedMenuItems) {
      const created = await prisma.menuItem.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          category: item.category as "drink" | "food" | "combo" | "fruit" | "snack",
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isSignature: item.isSignature,
          isAvailable: item.isAvailable,
        },
        update: {
          name: item.name,
          slug: item.slug,
          category: item.category as "drink" | "food" | "combo" | "fruit" | "snack",
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isSignature: item.isSignature,
          isAvailable: item.isAvailable,
        },
      })
      menuItems.push(created)
    }

    return NextResponse.json({
      success: true,
      message: "Đã seed dữ liệu thành công",
      count: { branches: branches.length, rooms: rooms.length, menuItems: menuItems.length },
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ error: "Không thể seed dữ liệu" }, { status: 500 })
  }
}