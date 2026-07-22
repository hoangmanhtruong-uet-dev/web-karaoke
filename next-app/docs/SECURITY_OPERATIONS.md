# Security operations baseline

## Deployment requirements

- Terminate HTTPS at a trusted proxy. Set `TRUSTED_PROXY_MODE` to `cloudflare`, `vercel`, or `single` only when that proxy overwrites its client-IP header.
- Block direct access to the origin with a provider firewall/private network. Cloudflare origins must accept only Cloudflare egress ranges; a `single` proxy must strip and overwrite `X-Real-IP`, `X-Forwarded-Host`, and `X-Forwarded-Proto`. Vercel mode reads the platform-owned `X-Vercel-Forwarded-For` header.
- Set `AUTH_URL` to the canonical HTTPS origin. Set `AUTH_TRUST_HOST=true` only after the trusted proxy overwrites the Host/forwarded headers and direct origin access is blocked; otherwise Auth.js must remain fail-closed.
- Production readiness intentionally returns `503` when `TRUSTED_PROXY_MODE` is missing/invalid, when `AUTH_TRUST_HOST` is not explicitly enabled, or when the database probe fails. An unresolved IP is never placed in one shared public/login bucket; identity quotas remain active, but deployment must stay out of rotation until the proxy is fixed.
- Use `sslmode=require` (or `verify-full`) in `DATABASE_URL`. Production always verifies the PostgreSQL certificate and hostname. Set `DATABASE_SSL_CA_BASE64` to the provider CA PEM encoded as base64 when it is not in Node's trust store. `DATABASE_SSL_ALLOW_UNVERIFIED=true` is a development/test-only escape hatch and is ignored in production.
- Store database, auth, cron, notification and security-event secrets in the hosting secret manager. Development and production values must differ.
- Use separate least-privileged roles for application CRUD, migrations and backups.
- Remove every `BOOTSTRAP_ADMIN_*` value immediately after the one-time bootstrap succeeds.
- Keep `ALLOW_ADMIN_BOOTSTRAP` and `ALLOW_DEV_ADMIN_SEED` false/unset except during their explicit one-time operations.
- Configure `TEST_DATABASE_URL` to an isolated disposable PostgreSQL database in CI, deploy migrations into it, and run `npm run test:integration`; never point destructive integration tests at production.
- Rate-limit rows older than 24 hours are pruned opportunistically every 256 limiter calls. Monitor table growth and add a scheduled cleanup if traffic is too low to trigger maintenance.

## Secret rotation

1. Contain access and preserve audit evidence.
2. Revoke/rotate provider keys, update the secret manager, then redeploy.
3. Rotating `AUTH_SECRET` logs out every user. Incrementing `AdminUser.sessionVersion` revokes selected sessions when the signing secret remains safe.
4. Rotate database credentials and revoke the old role after readiness checks pass.
5. Rotate `CRON_SECRET`, update the scheduler, invoke each job once, then revoke the old value.

## Backup and restore

- Schedule encrypted PostgreSQL backups daily; retain 7 daily and 4 weekly copies in a separate account/location when supported.
- Quarterly, restore the newest backup into an isolated database, apply migrations, run readiness and integration tests, and record duration/result.
- A backup is not verified until a restore rehearsal succeeds.

## Incident runbook

1. **Compromised admin:** disable it, increment its session version, rotate its password and inspect audit events.
2. **Leaked secret:** revoke it at the source, redeploy, and search logs/Git history without copying the value into tickets.
3. **Database intrusion:** isolate network access, rotate credentials, preserve provider logs and assess exposed records.
4. **Booking/contact spam:** tighten shared-store limits, block at the edge and pause notifications rather than deleting evidence.
5. **Forged payment webhook:** no provider webhook is enabled; keep payment mutations disabled until signature and replay controls exist.
6. **Bad deploy:** restore the previous immutable artifact, then verify live/ready endpoints and critical smoke tests.
7. **Global session revoke:** increment every active admin's `sessionVersion`, or rotate `AUTH_SECRET` if it leaked.
8. **Global admin lock:** restrict `/admin` at the edge first and preserve a recoverable break-glass path.

## Data retention

- Proposed default for booking/contact/customer PII: 24 months, then delete or irreversibly anonymize according to business/legal needs.
- Security/audit events: 12 months; notification delivery metadata: 90 days unless tied to a dispute.
- Only admins may export/delete bulk customer data, using a dedicated future permission and audit event.

## Payment boundary

The project currently has read-only internal payment history and no live provider webhook/refund endpoint. Before enabling one, require server-side amount calculation, constant-time signature verification, timestamp tolerance, unique event IDs, idempotent state transitions, manager/admin refund permission, reasons, audit events and reconciliation.
