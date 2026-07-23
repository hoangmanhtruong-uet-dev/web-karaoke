import http from "k6/http"
import { check, sleep } from "k6"

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3000"
const profile = __ENV.PROFILE || "baseline-1"
const parsed = new URL(baseUrl)
const targetHostname = parsed.hostname.toLowerCase()
const localHosts = new Set(["127.0.0.1", "localhost", "::1"])

function boundedInteger(name, fallback, maximum) {
  const raw = __ENV[name] || String(fallback)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
  return value
}

const localTarget = localHosts.has(targetHostname)
if (targetHostname.endsWith("onrender.com")) {
  throw new Error(
    "This load harness refuses direct Render production/origin targets"
  )
}
if (!localTarget) {
  if (parsed.protocol !== "https:") throw new Error("Staging must use HTTPS")
  if (__ENV.ISOLATED_STAGING_ACK !== "yes") {
    throw new Error(
      "Refusing non-local load target without ISOLATED_STAGING_ACK=yes"
    )
  }

  const expectedHost = (__ENV.EXPECTED_STAGING_HOST || "").toLowerCase()
  if (expectedHost !== targetHostname) {
    throw new Error("EXPECTED_STAGING_HOST must exactly match BASE_URL")
  }
  if (!/^[a-z0-9][a-z0-9._-]{5,79}$/i.test(__ENV.STAGING_RUN_ID || "")) {
    throw new Error("STAGING_RUN_ID is required for non-local load")
  }
  if (__ENV.STAGING_DATABASE_ACK !== "isolated-disposable") {
    throw new Error(
      "STAGING_DATABASE_ACK=isolated-disposable is required for non-local load"
    )
  }
}

const stagingWarmVus = boundedInteger("STAGING_WARM_VUS", 1, 10)
const stagingStepVus = boundedInteger("STAGING_STEP_VUS", 5, 25)
const stagingPeakVus = boundedInteger("STAGING_PEAK_VUS", 10, 50)
if (!(stagingWarmVus <= stagingStepVus && stagingStepVus <= stagingPeakVus))
  throw new Error("Staging VUs must satisfy warm <= step <= peak")

const profiles = {
  "baseline-1": { vus: 1, duration: "30s" },
  "baseline-5": { vus: 5, duration: "30s" },
  "baseline-10": { vus: 10, duration: "30s" },
  "staging-dynamic": {
    stages: [
      { duration: "30s", target: stagingWarmVus },
      { duration: "1m", target: stagingStepVus },
      { duration: "2m", target: stagingPeakVus },
      { duration: "30s", target: 0 },
    ],
  },
  ramp: {
    stages: [
      { duration: "1m", target: 10 },
      { duration: "2m", target: 25 },
      { duration: "1m", target: 0 },
    ],
  },
  burst: {
    stages: [
      { duration: "5s", target: 25 },
      { duration: "15s", target: 25 },
      { duration: "10s", target: 0 },
    ],
  },
  sustained: { vus: 10, duration: "15m" },
}

if (!profiles[profile]) throw new Error(`Unknown PROFILE=${profile}`)

export const options = {
  ...profiles[profile],
  discardResponseBodies: true,
  tags: {
    run_id: __ENV.STAGING_RUN_ID || "local",
    target_type: localTarget ? "local" : "isolated-staging",
  },
  thresholds: {
    http_req_failed: [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "10s" },
    ],
    http_req_duration: [
      { threshold: "p(95)<1000", abortOnFail: true, delayAbortEval: "10s" },
    ],
  },
}

const endpoints = [
  "/",
  "/api/branches?status=active",
  "/api/rooms",
  "/api/menu-items?isAvailable=true",
]

export default function resilienceScenario() {
  const path = endpoints[__ITER % endpoints.length]
  const response = http.get(`${baseUrl}${path}`, {
    timeout: "5s",
    tags: { endpoint: path },
  })
  check(response, { "status is controlled": (result) => result.status < 500 })
  sleep(0.2)
}
