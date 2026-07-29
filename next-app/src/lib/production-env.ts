import { X509Certificate } from "node:crypto"
import { loadDatabaseCertificateAuthority } from "@/lib/database-ssl"

export type ProductionEnvironmentCheck = {
  name: string
  status: "PASS" | "FAIL" | "WARN"
  evidence: string
}

export type ProductionEnvironmentResult = {
  valid: boolean
  checks: ProductionEnvironmentCheck[]
}

const proxyModes = new Set(["cloudflare", "vercel", "single"])
const privilegedDatabaseUsers = new Set(["postgres", "root", "superuser"])

export function verifyProductionEnvironment(
  env: Readonly<Record<string, string | undefined>>
): ProductionEnvironmentResult {
  const checks: ProductionEnvironmentCheck[] = []
  const add = (
    name: string,
    pass: boolean,
    passEvidence: string,
    failEvidence: string
  ) =>
    checks.push({
      name,
      status: pass ? "PASS" : "FAIL",
      evidence: pass ? passEvidence : failEvidence,
    })
  const secret = (name: string, minimumLength = 32) => {
    const length = env[name]?.trim().length ?? 0
    add(
      name,
      length >= minimumLength,
      `configured; length=${length}; minimum=${minimumLength}`,
      length
        ? `configured; length=${length}; minimum=${minimumLength}`
        : "not configured"
    )
  }

  add(
    "NODE_ENV",
    env.NODE_ENV === "production",
    "production mode",
    "must equal production"
  )

  const databaseUrl = env.DATABASE_URL?.trim()
  let databaseValid = false
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl)
      const user = decodeURIComponent(url.username).toLowerCase()
      databaseValid =
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        Boolean(url.hostname && url.username && url.password) &&
        !["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
        !privilegedDatabaseUsers.has(user) &&
        ["require", "verify-ca", "verify-full"].includes(
          url.searchParams.get("sslmode") ?? ""
        )
    } catch {
      databaseValid = false
    }
  }
  add(
    "DATABASE_URL",
    databaseValid,
    "parsed with redaction; non-local PostgreSQL host, non-owner user and verified TLS required",
    databaseUrl ? "configured but failed safe validation" : "not configured"
  )

  const caConfigured = Boolean(
    env.DATABASE_SSL_CA_BASE64?.trim() ||
    env.DATABASE_SSL_CA_PEM?.trim() ||
    env.DATABASE_SSL_CA_FILE?.trim()
  )
  let caValid = false
  let caValidity = ""
  let caLength = 0
  try {
    const ca = loadDatabaseCertificateAuthority(env)
    if (!ca) throw new Error("missing CA")
    caLength = ca.length
    const certificate = new X509Certificate(ca)
    caValid = true
    caValidity = certificate.validTo
  } catch {
    caValid = false
  }
  add(
    "DATABASE_SSL_CA",
    caValid,
    `configured; length=${caLength}; certificate parsed; validTo=${caValidity}`,
    caConfigured
      ? "configured; certificate loading or parsing failed"
      : "not configured"
  )
  add(
    "DATABASE_SSL_ALLOW_UNVERIFIED",
    env.DATABASE_SSL_ALLOW_UNVERIFIED !== "true",
    "unverified TLS is not enabled",
    "must not be true in production"
  )

  secret("AUTH_SECRET")
  secret("SECURITY_EVENT_HASH_SECRET")
  secret("RECOVERY_CODE_HASH_SECRET")
  const totpEncryptionKey = env.TOTP_ENCRYPTION_KEY?.trim() ?? ""
  let totpKeyValid = false
  try {
    totpKeyValid =
      /^[A-Za-z0-9+/]+={0,2}$/.test(totpEncryptionKey) &&
      Buffer.from(totpEncryptionKey, "base64").length === 32
  } catch {
    totpKeyValid = false
  }
  add(
    "TOTP_ENCRYPTION_KEY",
    totpKeyValid,
    "configured as a base64-encoded 32-byte key; value redacted",
    totpEncryptionKey ? "configured but invalid; value redacted" : "not configured"
  )
  secret("CRON_SECRET")

  let authUrlValid = false
  try {
    const actual = new URL(env.AUTH_URL ?? "")
    const expected = new URL(env.PRODUCTION_CANONICAL_ORIGIN ?? "")
    authUrlValid =
      actual.protocol === "https:" &&
      actual.origin === expected.origin &&
      actual.pathname === "/" &&
      !actual.search &&
      !actual.hash &&
      !actual.username &&
      !actual.password
  } catch {
    authUrlValid = false
  }
  add(
    "AUTH_URL",
    authUrlValid,
    "matches PRODUCTION_CANONICAL_ORIGIN; values redacted",
    "AUTH_URL and PRODUCTION_CANONICAL_ORIGIN must be matching canonical HTTPS origins"
  )
  add(
    "AUTH_TRUST_HOST",
    env.AUTH_TRUST_HOST === "true",
    "explicitly enabled; proxy/origin evidence is still required",
    "must equal true after proxy and origin lock are verified"
  )
  const proxyMode = env.TRUSTED_PROXY_MODE?.trim()
  add(
    "TRUSTED_PROXY_MODE",
    Boolean(
      proxyMode &&
      proxyModes.has(proxyMode) &&
      proxyMode === env.PRODUCTION_EXPECTED_PROXY_MODE?.trim()
    ),
    "supported mode matches PRODUCTION_EXPECTED_PROXY_MODE; values redacted",
    "supported mode must match PRODUCTION_EXPECTED_PROXY_MODE"
  )

  let publicSiteUrlValid = false
  try {
    const publicSiteUrl = new URL(env.NEXT_PUBLIC_SITE_URL ?? "")
    const canonicalOrigin = new URL(env.PRODUCTION_CANONICAL_ORIGIN ?? "")
    publicSiteUrlValid =
      publicSiteUrl.protocol === "https:" &&
      publicSiteUrl.origin === canonicalOrigin.origin &&
      publicSiteUrl.pathname === "/" &&
      !publicSiteUrl.search &&
      !publicSiteUrl.hash
  } catch {
    publicSiteUrlValid = false
  }
  add(
    "NEXT_PUBLIC_SITE_URL",
    publicSiteUrlValid,
    "canonical HTTPS public URL configured; value redacted",
    "must be the canonical HTTPS origin"
  )

  const hotline = env.NEXT_PUBLIC_HOTLINE?.trim() ?? ""
  const hotlineDigits = hotline.replace(/\D/g, "")
  const hotlineValid =
    /^\d{9,11}$/.test(hotlineDigits) &&
    !/^(?:0+|1900+)$/.test(hotlineDigits) &&
    hotlineDigits !== "19000000"
  add(
    "NEXT_PUBLIC_HOTLINE",
    hotlineValid,
    "plausible public hotline configured; value redacted",
    hotline ? "configured but looks like a placeholder" : "not configured"
  )
  const provider = env.EMAIL_PROVIDER?.trim()
  checks.push({
    name: "NOTIFICATION_PROVIDER",
    status: !provider || provider === "console" || provider === "disabled" ? "WARN" : "PASS",
    evidence:
      !provider || provider === "console" || provider === "disabled"
        ? "external notification delivery is not proven"
        : "external provider selected; delivery evidence is still required",
  })

  const bootstrapNames = [
    "ALLOW_ADMIN_BOOTSTRAP",
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PASSWORD",
    "BOOTSTRAP_ADMIN_NAME",
    "ALLOW_DEV_ADMIN_SEED",
    "ADMIN_SEED_EMAIL",
    "ADMIN_SEED_PASSWORD",
    "ADMIN_SEED_NAME",
  ]
  const booleanGuardNames = new Set([
    "ALLOW_ADMIN_BOOTSTRAP",
    "ALLOW_DEV_ADMIN_SEED",
  ])
  const remainingBootstrapNames = bootstrapNames.filter((name) => {
    const value = env[name]?.trim()
    if (!value) return false
    return booleanGuardNames.has(name) ? value !== "false" : true
  })
  add(
    "BOOTSTRAP_AND_SEED",
    remainingBootstrapNames.length === 0,
    "bootstrap and development seed variables are absent",
    `variables still configured: ${remainingBootstrapNames.join(", ")}`
  )

  return {
    valid: checks.every((check) => check.status !== "FAIL"),
    checks,
  }
}

export function renderProductionEnvironmentChecks(
  result: ProductionEnvironmentResult
) {
  return [
    ...result.checks.map(
      (check) => `[${check.status}] ${check.name}: ${check.evidence}`
    ),
    `RESULT=${result.valid ? "PASS" : "FAIL"}`,
  ]
}
