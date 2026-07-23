import { performance } from "node:perf_hooks"

const target = new URL(process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000/")
if (!["127.0.0.1", "localhost", "::1"].includes(target.hostname)) {
  throw new Error("local-sample refuses non-local targets")
}

const concurrency = Math.min(
  10,
  Math.max(1, Number(process.env.LOAD_CONCURRENCY ?? 5))
)
const total = Math.min(
  1000,
  Math.max(1, Number(process.env.LOAD_REQUESTS ?? 100))
)
const timeoutMs = 5_000
const latencies = []
const statuses = new Map()
let cursor = 0
let timeouts = 0

async function worker() {
  while (cursor < total) {
    cursor += 1
    const started = performance.now()
    try {
      const response = await fetch(target, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1)
      await response.arrayBuffer()
    } catch (error) {
      if (error?.name === "TimeoutError") timeouts += 1
      else statuses.set(0, (statuses.get(0) ?? 0) + 1)
    } finally {
      latencies.push(performance.now() - started)
    }
  }
}

const started = performance.now()
await Promise.all(Array.from({ length: concurrency }, () => worker()))
const elapsedMs = performance.now() - started
latencies.sort((a, b) => a - b)
const percentile = (value) =>
  latencies[
    Math.min(latencies.length - 1, Math.ceil(latencies.length * value) - 1)
  ] ?? 0

console.log(
  JSON.stringify({
    target: target.toString(),
    total,
    concurrency,
    elapsedMs: Math.round(elapsedMs),
    rps: Number((total / (elapsedMs / 1000)).toFixed(2)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p90Ms: Number(percentile(0.9).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    p99Ms: Number(percentile(0.99).toFixed(2)),
    timeouts,
    statuses: Object.fromEntries(statuses),
  })
)
