import { beforeEach, describe, expect, it, vi } from "vitest"

const principalMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/admin-auth", () => ({ getAdminPrincipal: principalMock }))

import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"

const base = { mustChangePassword: false }

describe("admin permission authorization", () => {
  beforeEach(() => principalMock.mockReset())

  it("returns 401 for an anonymous request", async () => {
    principalMock.mockResolvedValue(null)
    const result = await authorizeAdminApi("booking.read")
    expect(hasPrincipal(result)).toBe(false)
    if (!hasPrincipal(result)) expect(result.response.status).toBe(401)
  })

  it("allows staff operational permission", async () => {
    principalMock.mockResolvedValue({ ...base, id: "staff-1", name: "Staff", email: "s@example.com", role: "staff" })
    expect(hasPrincipal(await authorizeAdminApi("booking.update"))).toBe(true)
  })

  it("forbids staff from manager permission", async () => {
    principalMock.mockResolvedValue({ ...base, id: "staff-1", name: "Staff", email: "s@example.com", role: "staff" })
    const result = await authorizeAdminApi("payment.read")
    expect(hasPrincipal(result)).toBe(false)
    if (!hasPrincipal(result)) expect(result.response.status).toBe(403)
  })

  it("forbids manager from admin permission", async () => {
    principalMock.mockResolvedValue({ ...base, id: "manager-1", name: "Manager", email: "m@example.com", role: "manager" })
    const result = await authorizeAdminApi("staff.manage")
    expect(hasPrincipal(result)).toBe(false)
    if (!hasPrincipal(result)) expect(result.response.status).toBe(403)
  })

  it("allows admin privileged permission", async () => {
    principalMock.mockResolvedValue({ ...base, id: "admin-1", name: "Admin", email: "a@example.com", role: "admin" })
    expect(hasPrincipal(await authorizeAdminApi("staff.manage"))).toBe(true)
  })

  it("blocks a forced-password-change session", async () => {
    principalMock.mockResolvedValue({ id: "staff-1", name: "Staff", email: "s@example.com", role: "staff", mustChangePassword: true })
    const result = await authorizeAdminApi("booking.read")
    expect(hasPrincipal(result)).toBe(false)
    if (!hasPrincipal(result)) expect(result.response.status).toBe(403)
  })
})
