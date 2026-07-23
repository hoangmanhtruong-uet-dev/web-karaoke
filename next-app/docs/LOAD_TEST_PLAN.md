# Safe load and failure-test plan

## Safety gate

Never point these tools at the production Render service, its `onrender.com` origin, or production Aiven. `tests/load/local-sample.mjs` hard-refuses non-local hosts. `tests/load/k6-resilience.js` always refuses `*.onrender.com`; every other non-local target requires HTTPS, an exact `EXPECTED_STAGING_HOST`, a named `STAGING_RUN_ID`, `ISOLATED_STAGING_ACK=yes`, and `STAGING_DATABASE_ACK=isolated-disposable`. Staging must use its own database and disposable test data. Stop immediately for corruption, sustained 5xx, failure to recover, pool near cap, CPU/RAM saturation, p95 breach, or operator concern.

Production validation is limited to a separately approved, low-rate smoke (one request at a time, named endpoints, fixed maximum request count). This repository deliberately provides no production-load switch.

## Workload profiles

| Profile         | Configuration                                | Purpose / stop condition                        |
| --------------- | -------------------------------------------- | ----------------------------------------------- |
| Baseline 1      | 1 VU, 30s                                    | correctness and idle latency                    |
| Baseline 5      | 5 VUs, 30s                                   | small concurrency                               |
| Baseline 10     | 10 VUs, 30s                                  | initial safe envelope candidate                 |
| Ramp            | 0?10 in 1m, 10?25 over 2m, drain 1m          | find onset, not maximum-at-all-costs            |
| Burst           | 0?25 in 5s, hold 15s, drain 10s              | recovery after short public read burst          |
| Sustained       | 10 VUs, 15m                                  | memory, event-loop, pool, latency and log trend |
| Staging dynamic | 1?5?10 VUs by default, configurable up to 50 | bounded isolated-staging ramp with run ID       |

The default endpoint mix is `/`, branches, rooms and available menu items. Login, booking and contact mutations require seeded disposable identities plus cleanup/integrity assertions; do not include them until the staging dataset harness is approved. Admin mutation load needs dedicated accounts and per-operation idempotency keys.

## Commands

```powershell
# Start an isolated local app first, then a bounded 100-request measurement:
$env:LOAD_BASE_URL='http://127.0.0.1:3000/'
$env:LOAD_CONCURRENCY='5'
$env:LOAD_REQUESTS='100'
node tests/load/local-sample.mjs

# k6 baseline/ramp on local:
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=baseline-1 tests/load/k6-resilience.js
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=baseline-5 tests/load/k6-resilience.js
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=baseline-10 tests/load/k6-resilience.js
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=ramp tests/load/k6-resilience.js
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=burst tests/load/k6-resilience.js
k6 run -e BASE_URL=http://127.0.0.1:3000 -e PROFILE=sustained tests/load/k6-resilience.js

# Isolated staging only, after the preflight evidence below is approved:
$env:BASE_URL='https://staging.example.internal'
$env:EXPECTED_STAGING_HOST='staging.example.internal'
$env:ISOLATED_STAGING_ACK='yes'
$env:STAGING_DATABASE_ACK='isolated-disposable'
$env:STAGING_RUN_ID='change-id-yyyymmdd-operator'
$env:PROFILE='staging-dynamic'
$env:STAGING_WARM_VUS='1'
$env:STAGING_STEP_VUS='5'
$env:STAGING_PEAK_VUS='10'
k6 inspect tests/load/k6-resilience.js
k6 run tests/load/k6-resilience.js
```

Before any non-local run, attach a redacted preflight record proving:

1. The exact hostname belongs to a distinct staging service, with its own service ID and no production traffic.
2. The database hostname/name is different from production and contains only disposable seeded data with an approved cleanup owner.
3. Live/ready are 200 and CPU, RAM, event-loop, active/idle/waiting DB connections, query latency and log-rate dashboards are visible.
4. A named operator watches the run, can abort it immediately and records the change/run ID and start/end timestamps.
5. Run baseline 1, 5 and 10 first. Run `staging-dynamic` only if every prior threshold and integrity check passes; sustained load needs separate approval.

`staging-dynamic` defaults to 1?5?10 VUs and caps operator inputs at 10/25/50 VUs for warm/step/peak. The exact-host and disposable-database acknowledgements are safety interlocks, not evidence by themselves.

The k6 thresholds abort after p95 ?1000ms or HTTP failure rate ?1% after the 10-second evaluation delay. Tighten/relax only from an approved SLO, not to manufacture a PASS.

## Mutation scenarios for isolated staging

1. Send 10 concurrent booking requests with the same key/payload: one row, one outbox event, responses 201 then 200 replay.
2. Same key/different payload: 409 and no second row.
3. Distinct keys for the same room/time: at most one occupying booking per physical room and no partial writes.
4. Repeat the first two cases for contact.
5. Double-click/admin retry tests must compare final state/audit/outbox counts, not only HTTP status.
6. Simulate client timeout after send, then retry the exact body and key; reconcile returned resource ID.

## Failure injection in local/isolated staging

| Injection                                   | Expected evidence                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Block DB network / stop isolated PostgreSQL | public critical API 503, ready 503 within deadline, live 200, no raw error                          |
| Restore DB                                  | ready returns 200 without manual app restart; recovery time recorded                                |
| Add DB latency above statement timeout      | controlled timeout, TX rollback, pool returns to baseline                                           |
| Hold all pool slots                         | no process crash; new request fails within maxWait; active/idle count recovers                      |
| Kill app during request                     | committed idempotent mutation replays; uncommitted TX absent                                        |
| SIGTERM during reads/writes                 | new traffic drains at edge; in-flight TX completes or rolls back; process exits within Render grace |
| Email webhook returns 500/timeouts          | mutation remains committed once; outbox backoff; one delivery per idempotency key                   |
| Browser offline then online                 | form data/key retained; no automatic non-idempotent POST with a new key                             |

Record exact command, isolated target ID, timestamps, HTTP response, structured log/request ID, DB before/after counts, pool metrics and recovery time. Unit mocks are not a substitute for these injections.

## One-million-request capacity model

- One million total has no rate until a duration is specified.
- One million/day averages 11.57 RPS; peaks and endpoint mix dominate the average.
- One million/hour averages 277.78 RPS.
- One million simultaneous requests is a concurrency claim, not a throughput claim, and is outside this harness/environment.

No million-request run was performed. After baseline/ramp measurements, estimate requests/day as `safe sustained RPS ? 86,400`, label it **extrapolated**, and apply an explicit headroom factor. Do not infer write capacity from cached public reads.

## Required measurements

Capture total/success/4xx/429/5xx/timeouts, RPS, active concurrency, p50/p90/p95/p99, CPU, RSS/heap, event-loop lag, active/idle/waiting DB connections, query latency, recovery time, duplicate/lost writes and log bytes/minute. The local Node sample measures request/status/RPS/latency only; CPU/RAM/database metrics require process/Aiven/Render telemetry.

## Results

Measured 2026-07-23 ICT with `next start -p 3100`, Next.js 16.2.11 production build, Node 26.1.0, local loopback, homepage-only, warm short sample:

| Requests | Concurrency |          Success |    RPS |     p50 |     p90 |     p95 |     p99 | Timeouts |
| -------: | ----------: | ---------------: | -----: | ------: | ------: | ------: | ------: | -------: |
|      100 |           5 | 100/100 HTTP 200 | 297.75 | 13.22ms | 18.17ms | 22.40ms | 54.88ms |        0 |

Elapsed time was 336ms. This measures only local cached/static homepage handling. Instance resources, CPU/RAM, event-loop lag, database plan/connections/query latency, mutation integrity, log volume, burst recovery and network latency were not measured. It is neither a Render capacity result nor evidence for 297 RPS sustained operation.

Local profiles and the guarded `staging-dynamic` profile are **CREATED, NOT RUN** because k6 is not installed and no approved isolated staging target/telemetry bundle exists. A proposed Docker-based `k6 inspect` was not run because mounting source into a third-party image was not authorized; no request was emitted. Native `k6 inspect`, staged baselines and the dynamic run remain BLOCKED. Safe operating envelope and breaking point are **UNKNOWN**; no extrapolated capacity claim is approved from the local sample.
