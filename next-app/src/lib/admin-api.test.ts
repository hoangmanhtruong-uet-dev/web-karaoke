import { beforeEach, describe, expect, it, vi } from "vitest"

const principalMock=vi.hoisted(()=>vi.fn())
vi.mock("@/lib/admin-auth",()=>({getAdminPrincipal:principalMock}))

import { authorizeAdminApi, hasPrincipal } from "@/lib/admin-api"

describe("admin authorization",()=>{
  beforeEach(()=>principalMock.mockReset())
  it("rejects an unauthenticated request",async()=>{principalMock.mockResolvedValue(null);const result=await authorizeAdminApi();expect(hasPrincipal(result)).toBe(false);if(!hasPrincipal(result))expect(result.response.status).toBe(401)})
  it("allows staff for operational APIs",async()=>{principalMock.mockResolvedValue({id:"staff-1",name:"Staff",email:"s@example.com",role:"staff"});expect(hasPrincipal(await authorizeAdminApi())).toBe(true)})
  it("allows admin for admin-only APIs",async()=>{principalMock.mockResolvedValue({id:"admin-1",name:"Admin",email:"a@example.com",role:"admin"});expect(hasPrincipal(await authorizeAdminApi(["admin"]))).toBe(true)})
  it("forbids staff from admin-only APIs",async()=>{principalMock.mockResolvedValue({id:"staff-1",name:"Staff",email:"s@example.com",role:"staff"});const result=await authorizeAdminApi(["admin"]);expect(hasPrincipal(result)).toBe(false);if(!hasPrincipal(result))expect(result.response.status).toBe(403)})
  it("does not accept a client-provided role when server principal is missing",async()=>{principalMock.mockResolvedValue(null);const result=await authorizeAdminApi(["admin"]);expect(hasPrincipal(result)).toBe(false)})
})
