# Aiven PostgreSQL backup and restore runbook

Status: **BLOCKED / UNPROVEN**. A plan name, backup retention, latest successful backup, PITR window, restore target, RPO/RTO and rehearsal evidence are not available in this workspace. Provider marketing is not evidence.

## Evidence to collect (redacted)

1. Aiven project/service identifiers and plan; PostgreSQL version; region; HA configuration.
2. `max_connections`, reserved/admin connections, current/peak active/idle/waiting sessions.
3. Backup schedule/retention, latest successful backup timestamp/ID/status, encryption and failure-alert destination.
4. PITR/fork availability and earliest/latest restorable timestamps.
5. Named database/service owner, Render owner and incident commander.
6. Approved RPO/RTO. Until measured, both are `UNKNOWN`, not zero.

## Safe restore rehearsal

1. Obtain incident/change approval and select a named backup or PITR timestamp. Never overwrite production.
2. Create an isolated restored Aiven service/database with no public application traffic and distinct credentials.
3. Create a least-privilege rehearsal runtime role; keep owner/migration credentials separate.
4. Set `TEST_DATABASE_URL` only in the isolated operator shell. The database name must contain `test` or `ci` so integration tests fail closed.
5. Verify migration history, required `btree_gist` extension, row counts by critical table, orphan checks, unique idempotency keys, room overlap constraint, contact/booking/outbox relationships and a sample of business records.
6. Run `npm run test:integration` against the restored target. Do not run mutation tests against production.
7. Measure start time, database ready time, integrity-complete time and application-ready time. Compare observed data cutoff with approved RPO and total recovery with RTO.
8. Destroy the isolated restore through the provider's approved workflow after evidence retention; record deletion ID/time. Do not place credentials or dumps in Git.

## Application cutover during a real recovery

1. Put writes into a pre-tested maintenance mode/edge rule and capture the old Render deploy/config IDs.
2. Validate restored DB privately with the production runtime role and verified CA.
3. Update Render `DATABASE_URL` and CA secret through secret management, deploy one controlled instance, and require ready=200.
4. Smoke public reads and one explicitly approved synthetic mutation; verify idempotency, audit and outbox.
5. Reopen traffic gradually while watching 5xx, latency, pool connections, duplicate/lost writes and dead letters.
6. Keep the old database read-only/isolated according to retention policy; do not delete it during incident pressure.

## Integrity queries/checks

- Duplicate non-null `Booking.idempotencyKey` or `ContactRequest.idempotencyKey`: must be zero (unique indexes should enforce this).
- Overlapping occupying bookings for one room/time: must be zero and exclusion constraint present/validated.
- Outbox aggregate IDs with no booking/contact, and notification deliveries with no outbox: must be zero except documented retention behavior.
- `_prisma_migrations`: no failed/unrolled migration; required migrations finished.
- Compare critical table counts and timestamp maxima with pre-incident evidence; sample business owners validate bookings near the cutoff.

Exact SQL must be reviewed against the restored schema and run read-only first. Do not paste broad destructive SQL into this runbook.

## Rollback

If the restored target fails integrity or readiness, keep maintenance on, revert Render to the prior known-compatible database URL/config version, and revalidate. Credential rollback must not re-enable a credential known to be exposed. Escalate rather than attempting a second unreviewed restore.
