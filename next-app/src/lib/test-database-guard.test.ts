import { describe, expect, it } from "vitest"

import { assertSafeTestDatabase } from "../../scripts/test-database-guard"

const safeEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  TEST_DATABASE_URL:
    "postgresql://test_user:test_password@localhost:5432/guard_isolated_test",
})

describe("integration test database guard", () => {
  it("accepts an isolated local database ending in _test", () => {
    expect(assertSafeTestDatabase(safeEnvironment())).toContain(
      "guard_isolated_test"
    )
  })

  it("requires test mode and an explicit TEST_DATABASE_URL", () => {
    expect(() =>
      assertSafeTestDatabase({ ...safeEnvironment(), NODE_ENV: "development" })
    ).toThrow(/NODE_ENV="test"/)
    expect(() => assertSafeTestDatabase({ NODE_ENV: "test" })).toThrow(
      /TEST_DATABASE_URL is required/
    )
  })

  it("rejects unsafe names and the configured application database", () => {
    expect(() =>
      assertSafeTestDatabase({
        NODE_ENV: "test",
        TEST_DATABASE_URL:
          "postgresql://test_user:test_password@localhost:5432/guard_database",
      })
    ).toThrow(/end with _test/)

    const url = safeEnvironment().TEST_DATABASE_URL
    expect(() =>
      assertSafeTestDatabase({
        ...safeEnvironment(),
        DATABASE_URL: url,
      })
    ).toThrow(/must not target the same/)
  })

  it("rejects configured production hosts before remote access is allowed", () => {
    expect(() =>
      assertSafeTestDatabase({
        NODE_ENV: "test",
        TEST_DATABASE_URL:
          "postgresql://test_user:test_password@primary-db.example:5432/guard_test",
        PRODUCTION_DATABASE_HOSTS: "primary-db.example",
        ALLOW_REMOTE_TEST_DATABASE: "true",
      })
    ).toThrow(/configured production host/)
  })

  it("rejects Aiven and Render targets even when remote tests are enabled", () => {
    for (const hostname of ["project.aivencloud.com", "db.render.com"]) {
      expect(() =>
        assertSafeTestDatabase({
          NODE_ENV: "test",
          TEST_DATABASE_URL: `postgresql://test_user:test_password@${hostname}:5432/guard_test`,
          ALLOW_REMOTE_TEST_DATABASE: "true",
        })
      ).toThrow(/forbidden production\/managed target/)
    }
  })
})
