import { describe, expect, it, vi } from "vitest"

import {
  operationalErrorResponse,
  withOperationalErrorHandling,
} from "@/lib/operational-error"

describe("operational error mapping", () => {
  it("maps database connection and pool failures to retryable 503", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const response = operationalErrorResponse(
      Object.assign(new Error("sensitive host detail"), { code: "P2024" }),
      "test.database"
    )
    expect(response.status).toBe(503)
    expect(response.headers.get("Retry-After")).toBe("5")
    expect(response.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/)
    expect(await response.json()).toMatchObject({
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    })
    expect(spy.mock.calls.flat().join(" ")).not.toContain(
      "sensitive host detail"
    )
  })

  it("maps adapter connection timeouts wrapped in a cause to 503", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const response = operationalErrorResponse(
      Object.assign(new Error("Invalid database invocation"), {
        clientVersion: "test",
        cause: new Error("Connection terminated after timeout"),
      }),
      "test.adapter-timeout"
    )

    expect(response.status).toBe(503)
    expect(response.headers.get("Retry-After")).toBe("5")
    expect(await response.json()).toMatchObject({
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    })
    expect(spy.mock.calls.flat().join(" ")).not.toContain(
      "Connection terminated after timeout"
    )
  })

  it("maps Prisma driver and marker-only timeouts to 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const codeResponse = operationalErrorResponse(
      Object.assign(new Error("Driver timeout"), { code: "P2039" }),
      "test.driver-timeout"
    )
    const genericTimeoutResponse = operationalErrorResponse(
      Object.assign(new Error("Operation timeout"), { clientVersion: "test" }),
      "test.marker-timeout"
    )

    expect(codeResponse.status).toBe(503)
    expect(genericTimeoutResponse.status).toBe(503)
    expect(await codeResponse.json()).toMatchObject({
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    })
    expect(await genericTimeoutResponse.json()).toMatchObject({
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    })
  })

  it("keeps unexpected programmer errors as generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const handler = withOperationalErrorHandling(
      "test.unexpected",
      async () => {
        throw new Error("private timeout implementation detail")
      }
    )
    const response = await handler()
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    })
  })
})
