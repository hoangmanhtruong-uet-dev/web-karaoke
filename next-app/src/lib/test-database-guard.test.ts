import { describe, expect, it, vi } from "vitest"

import { assertSafeTestDatabase } from "../../scripts/test-database-guard"

const safeEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  TEST_DATABASE_URL:
    "postgresql://test_user:test_password@localhost:5432/guard_isolated_test",
})

describe("integration test database guard", () => {
  it("accepts local PostgreSQL databases ending in _test", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(
        assertSafeTestDatabase({
          ...safeEnvironment(),
          TEST_DATABASE_URL: `postgresql://test_user:test_password@${host}:5432/guard_isolated_test`,
        })
      ).toContain("guard_isolated_test")
    }
  })

  it("rejects missing, malformed and non-PostgreSQL URLs", () => {
    expect(() => assertSafeTestDatabase({ NODE_ENV: "test" })).toThrow(
      /TEST_DATABASE_URL is required/
    )
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        TEST_DATABASE_URL: "not-a-url",
      })
    ).toThrow(/valid PostgreSQL URL/)
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        TEST_DATABASE_URL: "mysql://localhost/guard_isolated_test",
      })
    ).toThrow(/PostgreSQL protocol/)
  })

  it("rejects empty or non-test database names", () => {
    for (const url of [
      "postgresql://test_user:test_password@localhost:5432",
      "postgresql://test_user:test_password@localhost:5432/guard_database",
    ]) {
      expect(() =>
        assertSafeTestDatabase({ ...safeEnvironment(), TEST_DATABASE_URL: url })
      ).toThrow(/database name|end with _test/)
    }
  })

  it("rejects the application database even across loopback aliases", () => {
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        DATABASE_URL:
          "postgresql://another:secret@127.0.0.1:5432/guard_isolated_test",
      })
    ).toThrow(/must not target the same/)
  })

  it("rejects configured production and managed remote targets", () => {
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        TEST_DATABASE_URL:
          "postgresql://test_user:test_password@primary-db.example:5432/guard_test",
        PRODUCTION_DATABASE_HOSTS: "primary-db.example:5432",
      })
    ).toThrow(/configured production host\/port/)

    for (const hostname of ["project.aivencloud.com", "db.render.com"]) {
      expect(() =>
        assertSafeTestDatabase({
          ...safeEnvironment(),
          TEST_DATABASE_URL: `postgresql://test_user:test_password@${hostname}:5432/guard_test`,
          ALLOW_REMOTE_TEST_DATABASE: "true",
        })
      ).toThrow(/forbidden production\/managed target/)
    }
  })

  it("rejects every other remote target without an escape hatch", () => {
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        TEST_DATABASE_URL:
          "postgresql://test_user:test_password@test-db.example:5432/guard_test",
        ALLOW_REMOTE_TEST_DATABASE: "true",
      })
    ).toThrow(/Remote test databases are not accepted/)
  })

  it("rejects NODE_ENV=production and any non-test mode", () => {
    expect(() =>
      assertSafeTestDatabase({ ...safeEnvironment(), NODE_ENV: "production" })
    ).toThrow(/NODE_ENV=production/)
    expect(() =>
      assertSafeTestDatabase({ ...safeEnvironment(), NODE_ENV: "development" })
    ).toThrow(/NODE_ENV="test"/)
  })

  it("never prints credentials in logs or errors", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const password = "never-print-this-password"
    try {
      assertSafeTestDatabase({
        NODE_ENV: "test",
        TEST_DATABASE_URL: `postgresql://private-user:${password}@localhost:5432/redaction_test`,
      })
      const output = info.mock.calls.flat().join(" ")
      expect(output).not.toContain(password)
      expect(output).not.toContain("private-user")

      let message = ""
      try {
        assertSafeTestDatabase({
          NODE_ENV: "test",
          TEST_DATABASE_URL: `not-a-url-${password}`,
        })
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      }
      expect(message).not.toContain(password)
    } finally {
      info.mockRestore()
    }
  })
})
