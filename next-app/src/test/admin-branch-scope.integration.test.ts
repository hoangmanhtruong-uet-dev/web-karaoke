import { randomUUID } from "node:crypto"

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { PrismaClient } from "@prisma/client"
import type { AdminPrincipal } from "@/lib/admin-auth"

let currentPrincipal: AdminPrincipal

vi.mock("@/lib/admin-api", () => ({
  authorizeAdminApi: async () => ({ principal: currentPrincipal }),
  hasPrincipal: (result: object) => "principal" in result,
}))

let prisma: PrismaClient
let listBookings: typeof import("@/app/api/admin/bookings/route").GET
let getBookingDetail: typeof import("@/app/api/admin/bookings/[id]/route").GET
let listCalendar: typeof import("@/app/api/admin/calendar/route").GET
let getDashboard: typeof import("@/app/api/admin/dashboard/route").GET
let transitionBooking: typeof import("@/app/api/admin/bookings/[id]/transition/route").POST
let reassignRoom: typeof import("@/app/api/admin/bookings/[id]/reassign-room/route").POST
let addNote: typeof import("@/app/api/admin/bookings/[id]/notes/route").POST

type Fixture = Awaited<ReturnType<typeof createFixture>>
let fixture: Fixture

function principal(
  user: {
    id: string
    name: string
    email: string
    role: string
    assignedBranchId: string | null
  }
): AdminPrincipal {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AdminPrincipal["role"],
    assignedBranchId: user.assignedBranchId,
    mustChangePassword: false,
  }
}

async function createFixture() {
  const token = randomUUID().replaceAll("-", "")
  const branchA = await prisma.branch.create({
    data: {
      name: `Scope Branch A ${token}`,
      slug: `scope-branch-a-${token}`,
      address: "Branch A address",
      district: "District A",
      city: "Ho Chi Minh City",
      phone: "0900000001",
      openingHours: {},
      amenities: [],
      status: "active",
    },
  })
  const branchB = await prisma.branch.create({
    data: {
      name: `Scope Branch B ${token}`,
      slug: `scope-branch-b-${token}`,
      address: "Branch B address",
      district: "District B",
      city: "Ho Chi Minh City",
      phone: "0900000002",
      openingHours: {},
      amenities: [],
      status: "active",
    },
  })
  const roomA = await prisma.room.create({
    data: {
      branchId: branchA.id,
      name: "Scope Room A",
      slug: `scope-room-a-${token}`,
      tier: "standard",
      capacity: { min: 1, max: 10 },
      hourlyRate: 100_000,
      features: [],
      status: "available",
    },
  })
  const roomB = await prisma.room.create({
    data: {
      branchId: branchB.id,
      name: "Scope Room B",
      slug: `scope-room-b-${token}`,
      tier: "standard",
      capacity: { min: 1, max: 10 },
      hourlyRate: 100_000,
      features: [],
      status: "available",
    },
  })
  const customerA = await prisma.customer.create({
    data: {
      fullName: "Scope Customer A",
      phone: `091${token.slice(0, 7)}`,
      email: `scope-customer-a-${token}@example.test`,
    },
  })
  const customerB = await prisma.customer.create({
    data: {
      fullName: "Scope Customer B",
      phone: `092${token.slice(0, 7)}`,
      email: `scope-customer-b-${token}@example.test`,
    },
  })
  const [staffA, staffB, unassignedStaff, admin] = await Promise.all([
    prisma.adminUser.create({
      data: {
        name: "Scope Staff A",
        email: `scope-staff-a-${token}@example.test`,
        passwordHash: "integration-test-only",
        role: "staff",
        assignedBranchId: branchA.id,
      },
    }),
    prisma.adminUser.create({
      data: {
        name: "Scope Staff B",
        email: `scope-staff-b-${token}@example.test`,
        passwordHash: "integration-test-only",
        role: "staff",
        assignedBranchId: branchB.id,
      },
    }),
    prisma.adminUser.create({
      data: {
        name: "Scope Unassigned Staff",
        email: `scope-staff-none-${token}@example.test`,
        passwordHash: "integration-test-only",
        role: "staff",
      },
    }),
    prisma.adminUser.create({
      data: {
        name: "Scope Admin",
        email: `scope-admin-${token}@example.test`,
        passwordHash: "integration-test-only",
        role: "admin",
      },
    }),
  ])
  const startAt = new Date(Date.now() + 60 * 60_000)
  const endAt = new Date(startAt.getTime() + 60 * 60_000)
  const expiresAt = new Date(Date.now() + 30 * 60_000)
  const bookingA = await prisma.booking.create({
    data: {
      code: `SA${token.slice(0, 10)}`,
      branchId: branchA.id,
      roomId: roomA.id,
      customerId: customerA.id,
      customerName: customerA.fullName,
      customerPhone: customerA.phone,
      customerEmail: customerA.email,
      guestCount: 4,
      date: startAt.toISOString().slice(0, 10),
      startTime: "19:00",
      durationHours: 1,
      startAt,
      endAt,
      expiresAt,
      status: "pending",
    },
  })
  const bookingB = await prisma.booking.create({
    data: {
      code: `SB${token.slice(0, 10)}`,
      branchId: branchB.id,
      roomId: roomB.id,
      customerId: customerB.id,
      customerName: customerB.fullName,
      customerPhone: customerB.phone,
      customerEmail: customerB.email,
      guestCount: 4,
      date: startAt.toISOString().slice(0, 10),
      startTime: "19:00",
      durationHours: 1,
      startAt,
      endAt,
      expiresAt,
      status: "pending",
    },
  })
  await prisma.payment.createMany({
    data: [
      {
        bookingId: bookingA.id,
        amount: 1_000,
        method: "cash",
        status: "completed",
        transactionCode: `scope-a-${token}`,
      },
      {
        bookingId: bookingB.id,
        amount: 2_000,
        method: "cash",
        status: "completed",
        transactionCode: `scope-b-${token}`,
      },
    ],
  })

  return {
    branchA,
    branchB,
    roomA,
    roomB,
    customerA,
    customerB,
    bookingA,
    bookingB,
    staffA: principal(staffA),
    staffB: principal(staffB),
    unassignedStaff: principal(unassignedStaff),
    admin: principal(admin),
    userIds: [staffA.id, staffB.id, unassignedStaff.id, admin.id],
  }
}

async function cleanupFixture(value: Fixture | undefined) {
  if (!value) return
  const bookingIds = [value.bookingA.id, value.bookingB.id]
  await prisma.outboxEvent.deleteMany({
    where: { aggregateType: "booking", aggregateId: { in: bookingIds } },
  })
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityType: "booking", entityId: { in: bookingIds } },
        { actorId: { in: value.userIds } },
      ],
    },
  })
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } })
  await prisma.customer.deleteMany({
    where: { id: { in: [value.customerA.id, value.customerB.id] } },
  })
  await prisma.adminUser.deleteMany({ where: { id: { in: value.userIds } } })
  await prisma.room.deleteMany({
    where: { id: { in: [value.roomA.id, value.roomB.id] } },
  })
  await prisma.branch.deleteMany({
    where: { id: { in: [value.branchA.id, value.branchB.id] } },
  })
}

function postRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: new URL(url).origin,
    },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  const [
    prismaModule,
    bookingsRoute,
    detailRoute,
    calendarRoute,
    dashboardRoute,
    transitionRoute,
    reassignRoute,
    notesRoute,
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/app/api/admin/bookings/route"),
    import("@/app/api/admin/bookings/[id]/route"),
    import("@/app/api/admin/calendar/route"),
    import("@/app/api/admin/dashboard/route"),
    import("@/app/api/admin/bookings/[id]/transition/route"),
    import("@/app/api/admin/bookings/[id]/reassign-room/route"),
    import("@/app/api/admin/bookings/[id]/notes/route"),
  ])
  prisma = prismaModule.default
  listBookings = bookingsRoute.GET
  getBookingDetail = detailRoute.GET
  listCalendar = calendarRoute.GET
  getDashboard = dashboardRoute.GET
  transitionBooking = transitionRoute.POST
  reassignRoom = reassignRoute.POST
  addNote = notesRoute.POST
})

beforeEach(async () => {
  fixture = await createFixture()
})

afterEach(async () => {
  await cleanupFixture(fixture)
})

afterAll(async () => {
  await prisma?.$disconnect()
})

describe("admin booking branch scope on isolated PostgreSQL", () => {
  it("lets Staff A view Booking A but not Booking B by guessed ID", async () => {
    currentPrincipal = fixture.staffA

    const allowed = await getBookingDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: fixture.bookingA.id }),
    })
    const denied = await getBookingDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: fixture.bookingB.id }),
    })

    expect(allowed.status).toBe(200)
    expect((await allowed.json()).data.booking.id).toBe(fixture.bookingA.id)
    expect(denied.status).toBe(404)
    expect((await denied.json()).error.code).toBe("BOOKING_NOT_FOUND")
  })

  it("rejects a client branchId override and keeps valid Branch A filters", async () => {
    currentPrincipal = fixture.staffA

    const override = await listBookings(
      new Request(
        `http://localhost/api/admin/bookings?branchId=${fixture.branchB.id}`
      )
    )
    expect(override.status).toBe(403)
    expect((await override.json()).error.code).toBe("BRANCH_SCOPE_FORBIDDEN")

    const allowed = await listBookings(
      new Request(
        `http://localhost/api/admin/bookings?branchId=${fixture.branchA.id}&roomId=${fixture.roomA.id}&status=pending`
      )
    )
    const body = await allowed.json()
    expect(allowed.status).toBe(200)
    expect(body.data.items.map((item: { id: string }) => item.id)).toEqual([
      fixture.bookingA.id,
    ])
  })

  it("keeps each staff account inside its assigned branch", async () => {
    currentPrincipal = fixture.staffB
    const response = await listBookings(
      new Request("http://localhost/api/admin/bookings?status=pending")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.items.map((item: { id: string }) => item.id)).toEqual([
      fixture.bookingB.id,
    ])
  })

  it("does not expose Booking B in Staff A's calendar", async () => {
    currentPrincipal = fixture.staffA
    const from = new Date(fixture.bookingA.startAt!.getTime() - 60_000)
    const to = new Date(fixture.bookingA.endAt!.getTime() + 60_000)
    const response = await listCalendar(
      new Request(
        `http://localhost/api/admin/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
      )
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.map((item: { id: string }) => item.id)).toEqual([
      fixture.bookingA.id,
    ])
  })

  it("scopes Staff A dashboard aggregates and hides unscopable metrics", async () => {
    currentPrincipal = fixture.staffA
    const response = await getDashboard()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.byStatus.pending).toBe(1)
    expect(body.data.customers).toBe(1)
    expect(body.data.availableRooms).toBe(1)
    expect(body.data.activeBranches).toBe(1)
    expect(body.data.revenue).toBe(1_000)
    expect(body.data.contacts).toBeNull()
    expect(body.data.deadLetters).toBeNull()
  })

  it("prevents Staff A from transitioning or noting Booking B", async () => {
    currentPrincipal = fixture.staffA
    const transition = await transitionBooking(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingB.id}/transition`,
        { status: "confirmed" }
      ),
      { params: Promise.resolve({ id: fixture.bookingB.id }) }
    )
    const note = await addNote(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingB.id}/notes`,
        { content: "cross-branch note" }
      ),
      { params: Promise.resolve({ id: fixture.bookingB.id }) }
    )

    expect(transition!.status).toBe(404)
    expect(note!.status).toBe(404)
    expect(
      await prisma.booking.findUniqueOrThrow({
        where: { id: fixture.bookingB.id },
        select: { status: true, adminNotes: { select: { id: true } } },
      })
    ).toEqual({ status: "pending", adminNotes: [] })
  })

  it("prevents cross-branch room reassignment and Booking B reassignment", async () => {
    currentPrincipal = fixture.staffA
    const crossRoom = await reassignRoom(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingA.id}/reassign-room`,
        { roomId: fixture.roomB.id, allowTierChange: false }
      ),
      { params: Promise.resolve({ id: fixture.bookingA.id }) }
    )
    const crossBooking = await reassignRoom(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingB.id}/reassign-room`,
        { roomId: fixture.roomB.id, allowTierChange: false }
      ),
      { params: Promise.resolve({ id: fixture.bookingB.id }) }
    )

    expect(crossRoom!.status).toBe(422)
    expect(crossBooking!.status).toBe(404)
    expect(
      await prisma.booking.findMany({
        where: { id: { in: [fixture.bookingA.id, fixture.bookingB.id] } },
        orderBy: { id: "asc" },
        select: { id: true, roomId: true },
      })
    ).toEqual(
      [
        { id: fixture.bookingA.id, roomId: fixture.roomA.id },
        { id: fixture.bookingB.id, roomId: fixture.roomB.id },
      ].sort((left, right) => left.id.localeCompare(right.id))
    )
  })

  it("denies staff without assignedBranchId", async () => {
    currentPrincipal = fixture.unassignedStaff
    const response = await listBookings(
      new Request("http://localhost/api/admin/bookings")
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe("BRANCH_SCOPE_FORBIDDEN")
  })

  it("keeps admin access and mutations across both branches", async () => {
    currentPrincipal = fixture.admin
    const branchA = await getBookingDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: fixture.bookingA.id }),
    })
    const branchB = await getBookingDetail(new Request("http://localhost"), {
      params: Promise.resolve({ id: fixture.bookingB.id }),
    })
    const filtered = await listBookings(
      new Request(
        `http://localhost/api/admin/bookings?branchId=${fixture.branchB.id}`
      )
    )
    const transition = await transitionBooking(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingB.id}/transition`,
        { status: "confirmed" }
      ),
      { params: Promise.resolve({ id: fixture.bookingB.id }) }
    )
    const note = await addNote(
      postRequest(
        `http://localhost/api/admin/bookings/${fixture.bookingB.id}/notes`,
        { content: "admin branch B note" }
      ),
      { params: Promise.resolve({ id: fixture.bookingB.id }) }
    )
    const dashboard = await getDashboard()
    const dashboardBody = await dashboard.json()

    expect(branchA.status).toBe(200)
    expect(branchB.status).toBe(200)
    expect(
      (await filtered.json()).data.items.map(
        (item: { id: string }) => item.id
      )
    ).toEqual([fixture.bookingB.id])
    expect(transition!.status).toBe(200)
    expect(note!.status).toBe(201)
    expect(dashboardBody.data.revenue).toBeGreaterThanOrEqual(3_000)
  })
})
