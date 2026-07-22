# Production P1 deployment checklist

Status: **open / NO-GO until every item below has production evidence**.

This checklist is for the production operator. Completing code-level checks or CI
does not satisfy infrastructure and operational controls. Do not enable a live
payment provider, deploy to production, or open production traffic as part of
this checklist without separate approval.

## Configuration and readiness

- [ ] Store the provider CA PEM as `DATABASE_SSL_CA_BASE64` in the production
  secret manager; verify the application validates the database certificate and
  hostname without `DATABASE_SSL_ALLOW_UNVERIFIED`.
- [ ] Set `AUTH_URL` to the canonical public HTTPS origin.
- [ ] Set `AUTH_TRUST_HOST=true` only after forwarded host/protocol headers are
  overwritten by the trusted proxy and direct origin access is blocked.
- [ ] Set `TRUSTED_PROXY_MODE` to the deployed topology (`cloudflare`, `vercel`,
  or `single`) and record evidence that the selected proxy owns/overwrites its
  client-IP and forwarded headers.
- [ ] From the production load balancer/orchestrator, verify
  `GET /api/health/ready` returns HTTP `200` with `{"status":"ready"}`; keep the
  instance out of rotation on any `503`.

## Network, database, and recovery

- [ ] Apply firewall/origin lock so the application origin is reachable only
  through the approved edge/proxy and required operations paths.
- [ ] Provision and verify separate least-privilege database roles for runtime
  CRUD, migrations, and backups; capture grants and a denied-operation test.
- [ ] Enable encrypted production backups with the approved retention policy,
  then perform a real restore rehearsal into an isolated database. Record the
  backup identifier, restore duration, migration result, readiness result, and
  integration-test result.

## Monitoring and secrets

- [ ] Configure an external security alert/log drain for structured auth, staff,
  cron, readiness, and rate-limit events; trigger a safe test event and retain
  proof that an operator received it.
- [ ] Rotate all production secrets before launch, including database, auth,
  cron, notification-provider, and security-event hashing secrets. Confirm old
  credentials are revoked and no development/test value is reused.
- [ ] Bootstrap the first production admin exactly once with
  `ALLOW_ADMIN_BOOTSTRAP=true` and the `BOOTSTRAP_ADMIN_*` variables, verify the
  audited account, then delete every bootstrap variable and redeploy/restart so
  the bootstrap path is disabled.

## Release gate

- [ ] Attach CI evidence for lint, typecheck, unit tests, PostgreSQL integration
  tests, build, and dependency audit from the exact commit to be released.
- [ ] Run the production HTTP smoke suite against the staged/release artifact
  without enabling live payments or opening production traffic.
- [ ] Obtain an explicit production GO approval after all P1 evidence has been
  reviewed. Until then, the release status remains **NO-GO**.
