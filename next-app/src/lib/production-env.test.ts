import { rootCertificates } from "node:tls"

import { describe, expect, it } from "vitest"

import {
  renderProductionEnvironmentChecks,
  verifyProductionEnvironment,
} from "@/lib/production-env"

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://karaoke_runtime:not-real@db.internal.example:5432/karaoke?sslmode=verify-full",
    DATABASE_SSL_CA_BASE64: Buffer.from(rootCertificates[0], "utf8").toString(
      "base64"
    ),
    DATABASE_SSL_ALLOW_UNVERIFIED: "false",
    AUTH_SECRET: "a".repeat(40),
    SECURITY_EVENT_HASH_SECRET: "b".repeat(40),
    RECOVERY_CODE_HASH_SECRET: "r".repeat(40),
    TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    CRON_SECRET: "c".repeat(40),
    AUTH_URL: "https://karaoke.example.com",
    PRODUCTION_CANONICAL_ORIGIN: "https://karaoke.example.com",
    NEXT_PUBLIC_SITE_URL: "https://karaoke.example.com",
    NEXT_PUBLIC_HOTLINE: "0901234567",
    AUTH_TRUST_HOST: "true",
    TRUSTED_PROXY_MODE: "vercel",
    PRODUCTION_EXPECTED_PROXY_MODE: "vercel",
    EMAIL_PROVIDER: "webhook",
  }
}

describe("production environment verification", () => {
  it("passes a strict configuration without rendering secret values", () => {
    const env = validEnvironment()
    const result = verifyProductionEnvironment(env)
    const output = renderProductionEnvironmentChecks(result).join("\n")

    expect(result.valid).toBe(true)
    expect(output).toContain("RESULT=PASS")
    expect(output).not.toContain(env.DATABASE_URL)
    expect(output).not.toContain(env.AUTH_SECRET)
    expect(output).not.toContain(env.CRON_SECRET)
  })

  it("fails closed when required production values are absent", () => {
    const result = verifyProductionEnvironment({})

    expect(result.valid).toBe(false)
    expect(renderProductionEnvironmentChecks(result)).toContain("RESULT=FAIL")
  })

  it("rejects invalid CA data and unverified TLS", () => {
    const env = validEnvironment()
    env.DATABASE_SSL_CA_BASE64 =
      Buffer.from("not a certificate").toString("base64")
    env.DATABASE_SSL_ALLOW_UNVERIFIED = "true"
    const result = verifyProductionEnvironment(env)

    expect(result.valid).toBe(false)
    expect(
      result.checks.find((check) => check.name === "DATABASE_SSL_CA")
        ?.status
    ).toBe("FAIL")
    expect(
      result.checks.find(
        (check) => check.name === "DATABASE_SSL_ALLOW_UNVERIFIED"
      )?.status
    ).toBe("FAIL")
  })

  it("rejects and redacts bootstrap values in steady state", () => {
    const env = validEnvironment()
    env.ALLOW_ADMIN_BOOTSTRAP = "true"
    env.BOOTSTRAP_ADMIN_PASSWORD = "must-never-appear-in-output"
    const result = verifyProductionEnvironment(env)
    const output = renderProductionEnvironmentChecks(result).join("\n")

    expect(result.valid).toBe(false)
    expect(output).not.toContain(env.BOOTSTRAP_ADMIN_PASSWORD)
    expect(output).toContain("BOOTSTRAP_ADMIN_PASSWORD")
  })
  it("rejects a local public URL and placeholder hotline", () => {
    const env = validEnvironment()
    env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
    env.NEXT_PUBLIC_HOTLINE = "1900 0000"
    const result = verifyProductionEnvironment(env)

    expect(result.valid).toBe(false)
    expect(result.checks.find((check) => check.name === "NEXT_PUBLIC_SITE_URL")?.status).toBe("FAIL")
    expect(result.checks.find((check) => check.name === "NEXT_PUBLIC_HOTLINE")?.status).toBe("FAIL")
  })
})
