import { createHash, randomBytes, randomUUID } from "node:crypto"
import { isIP } from "node:net"

const ephemeralHashSecret = randomBytes(32).toString("hex")

const TRUSTED_PROXY_MODES = new Set(["cloudflare", "vercel", "single"])

export function hasTrustedProxyConfiguration() {
  return TRUSTED_PROXY_MODES.has(process.env.TRUSTED_PROXY_MODE ?? "")
}

function validIp(value: string | null) {
  const candidate = value?.trim() ?? ""
  const version = isIP(candidate)
  if (!version || candidate.includes(",")) return null
  if (version === 4) return candidate
  const hostname = new URL(`http://[${candidate}]/`).hostname
  return hostname.slice(1, -1)
}

export function getClientIp(request: Request) {
  const mode = process.env.TRUSTED_PROXY_MODE
  if (mode === "cloudflare")
    return validIp(request.headers.get("cf-connecting-ip")) ?? "unknown"
  if (mode === "vercel")
    return validIp(request.headers.get("x-vercel-forwarded-for")) ?? "unknown"
  if (mode === "single")
    return validIp(request.headers.get("x-real-ip")) ?? "unknown"
  return "unknown"
}

export function hashSecurityIdentifier(value: string) {
  const secret =
    process.env.SECURITY_EVENT_HASH_SECRET ??
    process.env.AUTH_SECRET ??
    ephemeralHashSecret
  return createHash("sha256").update(`${secret}:${value}`).digest("hex")
}

export function requestContext(request?: Request) {
  if (!request)
    return { requestId: randomUUID(), ipAddressHash: null, userAgent: null }
  const suppliedRequestId = request.headers.get("x-request-id")
  const requestId =
    suppliedRequestId && /^[A-Za-z0-9._:-]{1,100}$/.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID()
  const ip = getClientIp(request)
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null
  return {
    requestId,
    ipAddressHash: ip === "unknown" ? null : hashSecurityIdentifier(ip),
    userAgent,
  }
}
