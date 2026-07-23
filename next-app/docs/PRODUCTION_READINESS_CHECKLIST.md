# Production resilience readiness checklist

Decision: **NO-GO** as of 2026-07-23 ICT. `CODE` and unit tests are not production evidence.

| Gate                                                         | Status                                                    | Evidence / required action                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Migration/test target isolation                              | LOCAL GUARD PASS; PRODUCTION CHANGE-CONTROL FAIL P0       | Prisma CLI guard rejects managed/same targets and local rerun passed; close unintended Aiven migration incident |
| Booking same-key double-click/retry creates once             | CODE + UNIT PASS; runtime BLOCKED                         | `booking-service.test.ts`; run PostgreSQL integration against isolated migrated DB                              |
| Concurrent room/time cannot double-book                      | POSTGRESQL INTEGRATION PASS                               | 7 migrations applied; concurrent overlap case produced one success/one rejection and one row                    |
| Contact retry/reconnect creates once                         | POSTGRESQL INTEGRATION PASS                               | 10 concurrent same-key retries produced one row/ID; changed payload returned 409                                |
| Same idempotency key/different payload returns 409           | UNIT PASS                                                 | booking and contact service tests                                                                               |
| Proxy header spoof/simple multi-value/IPv6 bypass            | UNIT PASS; Render BLOCKED                                 | `request-context.test.ts`; prove Render overwrites selected header before setting mode                          |
| Oversized/wrong content body rejected                        | UNIT PASS                                                 | request security tests cover streamed cancel and content type                                                   |
| Pagination/result bounds                                     | PARTIAL PASS                                              | admin pages max 100; public lists hard cap 200; staff list low-cardinality unpaginated                          |
| Login, booking, contact quotas                               | DB ATOMICITY INTEGRATION PASS; HTTP runtime BLOCKED       | 20 concurrent limiter calls allowed exactly 5 and blocked 15; HTTP 429/window runtime still required            |
| Admin mutation endpoint quotas                               | FAIL P1                                                   | implement per-user+endpoint quotas and alert aggregation                                                        |
| Pool cap and connect/query/TX deadlines                      | CODE + LOCAL FAILURE PASS; production sizing BLOCKED      | typecheck PASS; pool max 2 and 1s deadlines exercised locally; Aiven/Render budget remains unknown              |
| Pool exhaustion does not crash and recovers                  | LOCAL FAILURE PARTIAL PASS                                | 6 locked reads returned 503 in 1,067 ms; live/recovery/data count PASS; active/idle peak metrics not captured   |
| DB outage returns controlled 503                             | LOCAL FAILURE PASS on critical public APIs; admin PARTIAL | DB pause: ready/API 503, live 200, Retry-After 5, request ID, no technical leak; admin mapping still partial    |
| Ready follows DB down/up without restart                     | LOCAL FAILURE PASS                                        | paused DB produced ready 503; unpause restored ready/API 200 in 32 ms on the same app process                   |
| Live is process-only and ready is dependency-aware           | CODE PASS                                                 | `/api/health/live`, `/api/health/ready`                                                                         |
| Render health path is configured to ready                    | BLOCKED platform                                          | screenshot/export and unhealthy/recovery event required                                                         |
| SIGTERM drains request/TX and cleanly disconnects            | BLOCKED P1                                                | Render/local rehearsal with in-flight read and mutation                                                         |
| Provider call timeout/backoff/idempotency                    | CODE PASS; delivery BLOCKED                               | 15s abort, outbox backoff/dead letter, provider idempotency header                                              |
| No raw technical public error                                | UNIT + LOCAL FAILURE PASS for reviewed public routes      | outage/pool 503 bodies omitted Prisma/host/database details; centralized admin handling remains                 |
| Internal log redaction                                       | PARTIAL P1                                                | critical mapper/limiter fixed; outbox/script raw summaries need allowlist/redaction review                      |
| 429/log spam cannot amplify severely                         | PARTIAL                                                   | no per-429 error; threshold audit only; DB audit/log volume load measurement required                           |
| Public read cache/static asset cache                         | CODE PASS                                                 | API max-age 30/SWR 60; Next hashed assets immutable; verify deployed headers                                    |
| Event-loop/request concurrency load shedding                 | FAIL P1                                                   | no general admission shedder; establish need/limit from isolated ramp                                           |
| Capacity baseline and safe envelope                          | LOCAL SAMPLE ONLY; STAGING BLOCKED                        | local 100-request sample measured; guarded staging-dynamic profile prepared but not inspected/run               |
| Local static homepage sample                                 | MEASURED, not a capacity envelope                         | 100/100 HTTP 200, concurrency 5, 297.75 RPS, p95 22.40ms, p99 54.88ms; no CPU/RAM/DB metrics                    |
| Breaking point and recovery after burst                      | BLOCKED; HARNESS PREPARED                                 | exact-host/disposable-DB guarded staging ramp exists; approved target, telemetry and execution still absent     |
| One-million request claim                                    | NOT CLAIMED                                               | models only; no million-request execution                                                                       |
| Render plan/instances/resources/deploy overlap               | BLOCKED platform                                          | collect redacted service configuration and runtime metrics                                                      |
| Aiven plan/max/reserved/pool/PITR/latest backup              | BLOCKED platform                                          | collect console/SQL evidence; never infer from docs                                                             |
| Restore rehearsal with measured RPO/RTO                      | BLOCKED P1                                                | follow `BACKUP_RESTORE_RUNBOOK.md` on isolated restore                                                          |
| Uptime/5xx/latency/CPU/RAM/DB/backup/deploy alerts           | BLOCKED P1                                                | monitor IDs, thresholds, recipients and delivered test alerts                                                   |
| Custom domain and direct `onrender.com` origin policy        | BLOCKED P1                                                | prove desired policy and direct-origin result; historical origin was reachable                                  |
| Maintenance mode tested                                      | FAIL P1                                                   | implement and rehearse at verified edge/application before GO                                                   |
| Runtime role least privilege and exposed credentials rotated | FAIL/BLOCKED P0 operational                               | historical evidence reports admin runtime role and displayed secrets; operator must rotate and prove grants     |

## Required GO evidence bundle

1. Exact deploy SHA/ID with passing CI and successful Render health configuration.
2. Redacted Render resources, instance/autoscaling/deploy-overlap and graceful shutdown rehearsal.
3. Redacted Aiven plan, connection limit/reserve, current peak, backups/PITR and isolated restore rehearsal.
4. **SATISFIED LOCALLY:** all 7 migrations applied to isolated PostgreSQL 16; 8/8 integration tests PASS with no skip.
5. Isolated baseline/ramp/burst/sustained results with endpoint mix, CPU/RAM/pool/query/log metrics, integrity counts, breaking point and safe envelope.
6. **PARTIAL:** DB pause/recovery, reset, latency/pool pressure and app hard-kill/restart measured; SIGTERM and write-in-flight remain required.
7. Monitor/alert IDs and delivered test notifications.
8. Credential rotation, dedicated runtime role, verified TLS CA and custom-domain/origin proof.
9. Close the unintended production migration incident with authorized migration-history/schema verification, log review and a recorded compatibility/remediation decision.

GO is prohibited while any P0/P1 row is FAIL or BLOCKED.
