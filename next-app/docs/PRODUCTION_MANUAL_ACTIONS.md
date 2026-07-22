# Production manual actions

Current execution point: **BLOCKED - OPERATOR ACTION REQUIRED (group 1: hosting
and protected project)**. The provider-specific sequence, environment matrix,
database role guidance, and evidence format are in:

- `docs/PRIVATE_PRODUCTION_DEPLOYMENT.md`
- `docs/PRODUCTION_OPERATOR_EVIDENCE_TEMPLATE.md`

Do not proceed to database, secrets, deployment, domain, bootstrap, or public
traffic until group 1 proves every production URL will be protected. The default
platform is Render, as confirmed by the operator. Render service configuration and
protection evidence remain unverified.

Every section is **BLOCKED ? MANUAL ACTION REQUIRED**. Replace placeholders in
the operator shell or provider UI only. Never paste secrets into tickets, logs,
screenshots, commits, or this document.

## 1. Identify private hosting and canonical domain

- Goal: create/identify a protected production deployment without public traffic.
- Open: hosting project, deployments, domains, DNS, and access-protection pages.
- Configure: `<CANONICAL_HTTPS_ORIGIN>`, private access control, and deployment from
  a CI-success commit.
- Verify: record deployment ID, SHA, timestamp, environment, operator, domain, and
  previous immutable rollback target. Run `curl.exe -sS -o NUL -w "%{http_code}" <CANONICAL_HTTPS_ORIGIN>` only after access is approved.
- Expected: protected access works; public traffic is not enabled.
- Evidence: redacted deployment overview, domain/DNS screen, access policy, SHA.
- Rollback: restore previous access policy/deployment; do not change DNS blindly.

## 2. Configure and verify production environment

- Goal: configure secrets without exposing values.
- Open: hosting production environment/secret-manager settings.
- Configure: `DATABASE_URL`, `DATABASE_SSL_CA_BASE64`, `AUTH_SECRET`, `AUTH_URL`,
  `AUTH_TRUST_HOST=true`, `TRUSTED_PROXY_MODE`, `SECURITY_EVENT_HASH_SECRET`,
  `CRON_SECRET`, notification secrets, plus verification-only
  `PRODUCTION_CANONICAL_ORIGIN` and `PRODUCTION_EXPECTED_PROXY_MODE`.
- Verify: run `npm run verify:production-env` inside the production environment.
- Expected: `RESULT=PASS`; output contains only configured state, length, and CA
  expiry metadata, never secret values.
- Evidence: redacted command output and provider variable-name list.
- Rollback: restore the prior secret version and restart privately if readiness fails.

## 3. Verify database TLS, roles, extension, and exposure

- Goal: prove certificate/hostname validation and least privilege.
- Open: database networking, roles/users, extensions, backups, and query console.
- Runtime role requirements: LOGIN, `NOSUPERUSER NOCREATEDB NOCREATEROLE`, CONNECT,
  schema USAGE, required table DML, and sequence USAGE only.
- Migration role: separate secret, schema migration rights only, never injected into
  runtime. Preinstall/own `btree_gist` with an approved owner or migration role.
- Read-only evidence queries (run with a privileged audit connection):

```sql
SELECT current_database(), current_user;
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication
FROM pg_roles WHERE rolname IN ('<RUNTIME_ROLE>', '<MIGRATION_ROLE>');
SELECT extname, extversion, pg_get_userbyid(extowner) AS owner
FROM pg_extension WHERE extname = 'btree_gist';
SELECT grantee, privilege_type, table_schema, table_name
FROM information_schema.role_table_grants
WHERE grantee IN ('<RUNTIME_ROLE>', '<MIGRATION_ROLE>')
ORDER BY grantee, table_schema, table_name, privilege_type;
```

- Denied tests: with the runtime credential in a disposable transaction/database,
  prove `CREATE ROLE`, `CREATE DATABASE`, `CREATE EXTENSION`, `DROP SCHEMA`, and
  `CREATE TABLE` fail. Do not run destructive probes against production objects.
- TLS verify: connect using the application with `sslmode=verify-full` and provider
  CA; prove a deliberately wrong/omitted CA fails from an isolated test runner.
- Exposure: show private networking/IP allowlist; confirm app is not owner/superuser.
- Evidence: redacted role rows, grants, denied outputs, CA fingerprint/expiry,
  network policy, successful verified connection and failed wrong-CA connection.
- Rollback: revoke newly granted excess rights; never revoke the active credential
  until a tested replacement is live.

## 4. Verify domain, proxy, and origin lock

- Goal: users reach only the canonical HTTPS domain through the approved proxy.
- Open: DNS, CDN/WAF, load balancer, origin firewall/private-network settings.
- Configure: HTTP-to-HTTPS, optional host redirect, proxy header overwrite, and
  origin allowlist limited to the proxy/platform.
- Verify: canonical request succeeds; direct-origin request is refused/not routable;
  forged `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` do not alter security
  decisions; valid proxy traffic still works.
- Expected: direct origin blocked, valid proxy accepted, forged client headers ignored.
- Evidence: redacted curl outputs/statuses and provider firewall/routing screenshots.
- Rollback: restore the last known-good firewall policy while keeping the service private.

## 5. Rotate secrets and bootstrap one admin

- Goal: rotate production secrets safely and create exactly one initial admin.
- Order: create new runtime DB credential; update private deployment; verify readiness;
  rotate migration/backup credentials; rotate notification secrets; rotate
  `CRON_SECRET`; rotate `AUTH_SECRET` last because it logs out sessions; revoke old
  credentials only after new ones pass.
- Bootstrap prerequisites: DB/TLS/roles/readiness/audit pass and zero active admins.
- Configure bootstrap values temporarily in the secret manager, then run
  `npm run admin:bootstrap` once from an approved private operator session.
- Expected: one admin, `mustChangePassword=true`, audit event present; second run is
  refused. Immediately delete `ALLOW_ADMIN_BOOTSTRAP` and every
  `BOOTSTRAP_ADMIN_*` variable, then restart/redeploy privately and rerun verifier.
- Evidence: secret-version/revocation IDs, redacted bootstrap output, admin count,
  audit event ID, forced-change result, second-run refusal, variable-name absence.
- Rollback: disable the created account and increment session version; never log/reset
  its password through an unapproved channel.

## 6. Private deployment, readiness, and security smoke

- Goal: validate the exact CI-success artifact before opening traffic.
- Record: SHA, CI run, deployment ID/time/operator/environment/domain/rollback target.
- Verify `GET /api/health/live` and `/api/health/ready` return 200, expected JSON,
  and `Cache-Control: no-store`. Keep the deployment out of rotation on any 503.
- Smoke `/`, `/admin`, `/admin/login`, `/admin/payments`, `/api/branches`; send only
  invalid JSON payloads to booking/contact; call one admin API anonymously.
- Expected: public 200, admin API 401, admin pages redirect, invalid bodies safe 4xx,
  no stack trace/internal host/secret. Verify HSTS, CSP, nosniff, DENY,
  `frame-ancestors 'none'`, referrer/permissions policies, no `X-Powered-By`, and
  no-store on admin/health. Do not capture cookies or authorization headers.
- Evidence: redacted request/response transcript and headers.
- Rollback: switch to recorded immutable target and repeat live/ready/smoke privately.

## 7. Backup and isolated restore rehearsal

- Goal: prove recoverability, not merely backup availability.
- Open: database backup/snapshot, retention, encryption, access, and alert settings.
- Select a named successful backup; restore to `<ISOLATED_REHEARSAL_DATABASE>`.
- Record start/end, backup ID, target, RTO, provider RPO, schema/migration status,
  redacted row counts and integrity checks. Run app readiness/integration smoke against
  the restored target only. Delete the rehearsal target after evidence is retained.
- Expected: restore/integrity/migrations/smoke pass and cleanup completes.
- Evidence: backup ID/timestamp, retention/encryption/access settings, restore job ID,
  checks, RTO/RPO, smoke and cleanup results.
- Rollback: abort/delete only the isolated target; never overwrite production.

## 8. External log drain and alert delivery

- Goal: export structured production logs and deliver actionable alerts.
- Open: provider log drains and chosen Sentry/Datadog/Loki/Better Stack/Axiom/SIEM.
- Configure restricted access, retention, environment tags and alerts with cooldown.
- Trigger safe test events for auth rate-limit, rejected cron auth, readiness test,
  and privileged action where approved.
- Expected: recipient receives timestamp, environment, request/event ID and action;
  no password, cookie, authorization header, token, raw IP, or connection string.
- Evidence: redacted drain event, alert rule/recipient, delivered notification, cooldown.
- Rollback: disable the test rule/drain token and revoke it if exposed.

## 9. Monitoring and rollback rehearsal

- Goal: monitor homepage, liveness, and readiness separately and prove rollback.
- Configure HTTPS monitors with explicit interval, timeout, retry, and recipient.
- Test one controlled failure while private; prove alert and recovery notification.
- Rehearse rollback to the recorded immutable target without seed or destructive DB
  action, run smoke, then return to the candidate artifact.
- Evidence: monitor IDs/config, alert delivery, rollback target, duration, smoke,
  forward-restoration result, and migration compatibility notes.
- Rollback: keep traffic private and remain on the last healthy artifact if any gate fails.

## Evidence return package

Return only redacted artifacts: deployment/domain IDs, exact SHA, CI URL, verifier
output, readiness/smoke transcript, role/grant/extension output, network/origin
policy, rotation/revocation IDs, bootstrap audit evidence, backup/restore/RTO/RPO,
log/alert/monitor IDs and deliveries, and rollback rehearsal result.
