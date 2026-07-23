# Incident response runbook

## Severity and ownership

- SEV-1: corruption, duplicate/lost bookings, credential exposure, full outage, or unsafe restore. Incident commander + application owner + database owner immediately.
- SEV-2: elevated 5xx/latency/429, partial dependency outage, pool pressure, dead-letter growth. Application on-call, database owner as needed.
- SEV-3: isolated errors or degraded noncritical admin/notification behavior.

Names, phone numbers, escalation channel and Render/Aiven account owners are **BLOCKED operator fields** and must be stored in the private operations system, not this repository.

## First 15 minutes

1. Declare incident, timestamp it, assign commander/scribe, and freeze unrelated deploys.
2. Record Render service/deploy ID/SHA, instance count/resources, `/api/health/live`, `/api/health/ready`, 5xx/429/latency, CPU/RAM and Aiven active/idle/max connections. Never paste secrets.
3. Determine scope: public reads, booking/contact writes, admin, cron/outbox, or database.
4. Preserve request IDs and a small redacted log sample; avoid broad debug logging during abuse.
5. If data integrity is uncertain, stop mutations through the verified edge/maintenance control. Do not improvise a code deploy before the control is tested.

## Decision paths

### Database unavailable or pool exhausted

- Expect ready=503, live=200 and critical API=503 with Retry-After.
- Compare app pool budget (`instances ? DATABASE_POOL_MAX`, including deploy overlap/jobs) with Aiven limit/reserved connections.
- Check long-running/idle-in-transaction queries and connection churn using an approved read-only operator account.
- Do not raise pool max blindly. Shed traffic or reduce instances/jobs if the connection budget is invalid.
- After recovery, require ready=200 without restart, pool waiting=0, connection baseline restored, and booking/contact integrity queries clean.

### 5xx or latency spike

- Split by endpoint and error category; check deployment change and database query latency.
- Roll back Render only to a known CI-successful SHA with schema compatibility.
- For repeated identical errors, aggregate/suppress logs before increasing verbosity.

### Abuse / DDoS

- Do not counterattack or run a load test. Preserve aggregate evidence.
- Verify custom domain and direct Render origin path, edge rate limits, top endpoints, user/account/IP hashed keys and body sizes.
- Tighten endpoint-specific limits only with false-positive review. Keep login account limit across IPs.
- Enable the pre-tested maintenance/edge rule if saturation threatens writes. The current maintenance implementation is OPEN, so provider procedure must be rehearsed before GO.

### Duplicate or lost write

- Freeze affected mutation, retain idempotency key/request hash/audit/outbox IDs, and avoid deleting rows.
- Query duplicates by booking idempotency key, contact idempotency key, room/time overlap and outbox delivery unique keys.
- Do not merge/delete until business owner approves reconciliation. Restore is not the first response to a small logical duplicate.

### Notification provider failure

- Booking/contact request should remain committed; inspect pending/failed/dead-letter outbox and delivery uniqueness.
- Disable provider processing only through `EMAIL_PROVIDER=disabled` during a controlled config change; do not discard events.
- Retry dead letters through the authenticated admin operation after provider recovery.

## Deploy/restart/SIGTERM

Render health path must be `/api/health/ready`; liveness is for diagnosis, not traffic admission. Confirm Render permits a 10-30 second drain as recommended by bundled Next.js self-hosting docs. During a rehearsal, send SIGTERM with an in-flight request and transaction, record response/result, exit time, pool disconnect and final DB state. Next.js owns signal draining; do not add a handler that calls `process.exit()` early.

## Monitoring and alert plan

| Signal                  | Initial trigger                                       | Route                              |
| ----------------------- | ----------------------------------------------------- | ---------------------------------- |
| external ready          | 2 consecutive failures from 2 locations               | SEV-1/2 page                       |
| 5xx                     | >2% for 5m and minimum 20 requests                    | SEV-2                              |
| p95                     | >1s for 10m by endpoint                               | SEV-2                              |
| 429                     | >5? 7-day same-hour baseline                          | abuse review, not automatic outage |
| CPU/RAM                 | >85% for 10m or monotonic RSS                         | SEV-2                              |
| DB connections          | >70% warning, >85% page of usable budget              | DB owner                           |
| dead letters            | any new dead letter                                   | application on-call                |
| backup/deploy unhealthy | one failed scheduled backup/deploy or health rollback | owner/page                         |

Thresholds are proposed starting points, not configured evidence. Record monitor IDs, recipients and delivered test-alert IDs before marking PASS.

## Closeout

Confirm health and metrics stable for 30 minutes, no duplicates/lost writes, outbox drained, alerts reset, customer impact assessed, and exact recovery/rollback actions recorded. Create a blameless review with timeline, root cause, corrective owner/due date and evidence links.
