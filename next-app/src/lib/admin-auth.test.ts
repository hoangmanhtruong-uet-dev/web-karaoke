import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.hoisted(() => vi.fn())
const findUnique = vi.hoisted(() => vi.fn())

vi.mock("@/auth", () => ({ auth: authMock }))
vi.mock("@/lib/prisma", () => ({
  default: { adminUser: { findUnique } },
}))

import { getAdminPrincipal } from "@/lib/admin-auth"

const session = {
  user: {
    id: "admin-1",
    sessionVersion: 4,
    role: "admin",
    name: "Admin",
    email: "admin@example.test",
  },
}

const activeUser = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.test",
  role: "admin",
  isActive: true,
  mustChangePassword: false,
  sessionVersion: 4,
}

describe("admin session revalidation", () => {
  beforeEach(() => {
    authMock.mockReset()
    findUnique.mockReset()
    authMock.mockResolvedValue(session)
    findUnique.mockResolvedValue(activeUser)
  })

  it("rejects a missing signed session before reading the database", async () => {
    authMock.mockResolvedValue(null)

    await expect(getAdminPrincipal()).resolves.toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it("rejects a disabled account", async () => {
    findUnique.mockResolvedValue({ ...activeUser, isActive: false })

    await expect(getAdminPrincipal()).resolves.toBeNull()
  })

  it("rejects a session after sessionVersion is incremented", async () => {
    findUnique.mockResolvedValue({ ...activeUser, sessionVersion: 5 })

    await expect(getAdminPrincipal()).resolves.toBeNull()
  })

  it("rejects legacy non-admin roles", async () => {
    findUnique.mockResolvedValue({ ...activeUser, role: "user" })

    await expect(getAdminPrincipal()).resolves.toBeNull()
  })

  it("returns only the active, version-matched principal", async () => {
    await expect(getAdminPrincipal()).resolves.toEqual({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: activeUser.role,
      mustChangePassword: false,
    })
  })
})
