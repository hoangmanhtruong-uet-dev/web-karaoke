# Private production deployment runbook

Status: **BLOCKED - OPERATOR ACTION REQUIRED**  
Decision: **NO-GO PRODUCTION**  
Candidate commit: `23e510659a2551958ed5710dd6a58129e2207365`  
CI: GitHub Actions run `29915712602` - `completed/success`

This runbook prepares a real production environment without opening public
traffic. Never paste a secret into chat, a ticket, a screenshot, a shell history,
or Git. Enter secrets directly in the provider secret manager.

## 1. Verified repository state

| Item                     | Current state                                                                          | Codex can do it | Operator required | Evidence required                                         |
| ------------------------ | -------------------------------------------------------------------------------------- | --------------: | ----------------: | --------------------------------------------------------- |
| Branch and commit        | `main` at `23e510659a2551958ed5710dd6a58129e2207365`                                   |             Yes |                No | `git status`, `git rev-parse HEAD`                        |
| Working tree             | Clean before this documentation sprint                                                 |             Yes |                No | `git status --porcelain=v1` was empty                     |
| Remote parity            | Local HEAD, local `origin/main`, and GitHub `refs/heads/main` matched                  |             Yes |                No | Exact SHA above                                           |
| CI for HEAD              | Run `29915712602`, workflow `Next app security baseline`, SUCCESS                      |             Yes |                No | GitHub Actions run URL/metadata                           |
| Hosting                  | Operator confirmed Render; no service ID, type, plan, deploy ID, or dashboard evidence |          Partly |               Yes | Redacted Render Overview and Settings                     |
| Production domain/TLS    | No canonical domain evidence                                                           |              No |               Yes | DNS records, certificate state, redirect transcript       |
| Production environment   | No provider environment or verifier output                                             |          Partly |               Yes | Variable-name list and redacted verifier PASS             |
| Production database      | No production connection, role, TLS, network, backup, or restore evidence              |          Partly |               Yes | Redacted provider/query evidence                          |
| Private deployment       | No deployment ID or URL                                                                |              No |               Yes | Deployment ID, SHA, time, protected URL                   |
| Runtime/security smoke   | No real deployment to test                                                             |          Partly |               Yes | Redacted status/header transcript                         |
| Logging/alert/monitoring | Structured console events exist; no external system is connected                       |          Partly |               Yes | Drain/rule/monitor IDs and delivered test alert           |
| Bootstrap admin          | Guarded one-time script exists; not run in production                                  |          Partly |               Yes | Redacted output, audit ID, count, second-run refusal      |
| Rollback                 | No immutable deployed target exists                                                    |          Partly |               Yes | Target deployment and rehearsal transcript                |
| Payment                  | Real-money integration is absent and remains off                                       |             Yes |                No | Source/dependency review; keep all payment secrets absent |

## 2. Actual platform: Render

The operator confirmed that the application is deployed on Render. Repository
inspection did not expose a render.yaml, Render CLI link, service ID, or dashboard
session, so the platform is now known but its configuration is not yet evidence.

A Render Web Service is public by default on its onrender.com hostname. Safe options
for this sprint are:

- Maintenance Mode on a paid Web Service: public requests receive 503 while the
  service remains reachable over Render private networking and SSH.
- Inbound IP Restrictions for a web service on Scale or Enterprise: allow only an
  approved operator or VPN CIDR.
- A Private Service: no public URL, but it cannot serve the final public custom
  domain until the release architecture changes.

Do not describe an existing Web Service as private merely because it is in a
protected Render project/environment; web services remain public unless maintenance
mode or inbound IP rules actually block traffic.

Official references:

- <https://render.com/docs/web-services>
- <https://render.com/docs/maintenance-mode>
- <https://render.com/docs/inbound-ip-rules>
- <https://render.com/docs/monorepo-support>
- <https://render.com/docs/rollbacks>

## 3. Operator group 1 - identify and protect the existing Render service

Complete only this group first. Do not redeploy, change DNS, or edit secrets yet.

1. Open Render Dashboard and select the existing karaoke service.
2. Record only non-secret metadata: workspace/project/environment, service name and
   ID, service type, plan, region, repository, branch, latest deploy ID, deploy SHA,
   and current public/custom hostname.
3. Capture the service Overview and Settings pages with secret values redacted.
4. Verify Build & Deploy settings: root directory next-app, branch main, runtime
   Node, build command npm ci && npm run build, and start command npm run start.
   Also record Auto-Deploy state and Health Check Path. Do not trigger a deploy.
5. If it is a paid Web Service and public traffic must stop immediately, open
   Settings > Maintenance Mode, enable it, and confirm an unauthenticated request
   receives Render maintenance 503. Capture the enabled state and response.
6. If it is Scale/Enterprise and private runtime testing through one stable IP is
   required, record Settings > Networking > Inbound IP Restrictions. Do not remove
   0.0.0.0/0 until the operator CIDR and rollback access are confirmed.
7. If it is a Private Service, capture that service type and private hostname; do
   not expose it or convert it during this group.
8. If it is a free Web Service, Maintenance Mode and service-level inbound IP
   restrictions are unavailable. Record BLOCKED - PUBLIC WEB SERVICE CANNOT BE
   PROTECTED ON CURRENT PLAN and do not claim a private production deployment.

Expected evidence: existing Render service ID, type, plan, current deploy ID/SHA,
root/branch/build/start/health settings, current hostname, and actual protection
state. Do not return environment values, shell credentials, or API keys.

## 4. Operator group 2 - production database and verified TLS

Perform only after group 1 passes. Use Aiven PostgreSQL or the operator's approved
provider. Create separate provider-managed credentials:

- `<RUNTIME_ROLE>`: LOGIN, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, not a
  database/schema owner; CONNECT, schema USAGE, table SELECT/INSERT/UPDATE/DELETE,
  and sequence USAGE/SELECT only.
- `<MIGRATION_ROLE>`: used only by the migration job. It may create/alter schema
  objects. Preinstall `btree_gist` with an approved owner so runtime never needs
  extension privileges.

The runtime accepts only `DATABASE_URL`. For `npx prisma migrate deploy`, inject the
migration credential temporarily as `DATABASE_URL` in a separate migration job.
Never put it in the Render runtime. `SHADOW_DATABASE_URL` is not needed by
`prisma migrate deploy` and must not be set in runtime production.

Read-only audit queries (replace placeholders in the database console, not Git):

```sql
SELECT current_database(), current_user;
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname IN ('<RUNTIME_ROLE>', '<MIGRATION_ROLE>');

SELECT extname, extversion, pg_get_userbyid(extowner) AS owner
FROM pg_extension WHERE extname = 'btree_gist';

SELECT grantee, privilege_type, table_schema, table_name
FROM information_schema.role_table_grants
WHERE grantee IN ('<RUNTIME_ROLE>', '<MIGRATION_ROLE>')
ORDER BY grantee, table_schema, table_name, privilege_type;
```

Example grant plan for DBA review; do not run without an approved change window
and tested credential rollback:

```sql
GRANT CONNECT ON DATABASE <DATABASE_NAME> TO <RUNTIME_ROLE>;
GRANT USAGE ON SCHEMA public TO <RUNTIME_ROLE>;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <RUNTIME_ROLE>;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <RUNTIME_ROLE>;
ALTER DEFAULT PRIVILEGES FOR ROLE <MIGRATION_ROLE> IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <RUNTIME_ROLE>;
ALTER DEFAULT PRIVILEGES FOR ROLE <MIGRATION_ROLE> IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO <RUNTIME_ROLE>;
```

Rollback the new grants only if the runtime credential is not active:

```sql
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM <RUNTIME_ROLE>;
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM <RUNTIME_ROLE>;
REVOKE USAGE ON SCHEMA public FROM <RUNTIME_ROLE>;
REVOKE CONNECT ON DATABASE <DATABASE_NAME> FROM <RUNTIME_ROLE>;
```

Require an allowlist/private network as narrow as the runtime permits. Use
`sslmode=verify-full` and the provider CA in `DATABASE_SSL_CA_BASE64`. From an
isolated runner prove the correct CA succeeds and a wrong CA fails. Never set
`DATABASE_SSL_ALLOW_UNVERIFIED=true` in production.

## 5. Operator group 3 - environment variables

Enter values directly at Render Dashboard > service > Environment. Do not return
or screenshot values. Placeholders are not production values.

| Variable                                     |                    Required | Created/stored at                                                      | Placeholder allowed | Verification                                     |
| -------------------------------------------- | --------------------------: | ---------------------------------------------------------------------- | ------------------: | ------------------------------------------------ |
| `NODE_ENV`                                   |                         Yes | Platform/runtime (`production`)                                        |                  No | Verifier PASS                                    |
| `DATABASE_URL`                               |                         Yes | DB runtime role; Render Environment                                    |                  No | Non-local role, `sslmode=verify-full`, ready 200 |
| `DATABASE_SSL_CA_BASE64`                     |                         Yes | Provider CA; Render Environment                                        |                  No | X.509 parses; correct/wrong-CA tests             |
| `DATABASE_SSL_ALLOW_UNVERIFIED`              |                         Yes | Render (`false`)                                                       |                  No | Verifier: not enabled                            |
| `AUTH_SECRET`                                |                         Yes | Generate independently; Sensitive                                      |                  No | Length >= 32; auth smoke                         |
| `AUTH_URL`                                   |                         Yes | Canonical HTTPS origin                                                 |                  No | Exactly matches canonical origin                 |
| `PRODUCTION_CANONICAL_ORIGIN`                |            Yes for verifier | Canonical HTTPS origin                                                 |                  No | Matches `AUTH_URL` origin                        |
| `AUTH_TRUST_HOST`                            |                         Yes | Render (`true`) after proxy/origin controls                            |                  No | Verifier and readiness PASS                      |
| `TRUSTED_PROXY_MODE`                         |                         Yes | Leave unset until Render header proof; then `single` only if validated |                  No | Verifier and forged-header tests                 |
| `PRODUCTION_EXPECTED_PROXY_MODE`             |            Yes for verifier | Same validated mode as above                                           |                  No | Equals proxy mode                                |
| `SECURITY_EVENT_HASH_SECRET`                 |                         Yes | Generate independently; Sensitive                                      |                  No | Length >= 32; absent from logs                   |
| `CRON_SECRET`                                |                         Yes | Generate independently; Sensitive                                      |                  No | Length >= 32; cron smoke                         |
| `EMAIL_PROVIDER`                             |                         Yes | Render (`webhook`)                                                     |                  No | Delivery test                                    |
| `EMAIL_FROM`                                 |            Yes with webhook | Approved sender                                                        |                  No | Provider accepts test                            |
| `EMAIL_API_KEY`                              |            Yes with webhook | Email provider; Sensitive                                              |                  No | Delivery; absent from logs                       |
| `EMAIL_WEBHOOK_URL`                          |            Yes with webhook | Email provider HTTPS endpoint                                          |                  No | Delivery succeeds                                |
| `ADMIN_NOTIFICATION_EMAIL`                   | Yes for admin notifications | Approved mailbox                                                       |                  No | Safe test delivered                              |
| `BOOKING_HOLD_MINUTES`                       |                    Optional | Render (`15` default)                                                  |                  No | Config review                                    |
| `BOOKING_REMINDER_MINUTES`                   |                    Optional | Render (`120` default)                                                 |                  No | Config review                                    |
| `JOB_BATCH_SIZE`                             |                    Optional | Render (`25` default)                                                  |                  No | Config review                                    |
| `SHADOW_DATABASE_URL`                        |               No in runtime | Migration tooling only if needed                                       |                  No | Absent from runtime                              |
| `ALLOW_DEV_ADMIN_SEED`, `ADMIN_SEED_*`       |                   Forbidden | Nowhere in production                                                  |                  No | Absent/verifier PASS                             |
| `ALLOW_ADMIN_BOOTSTRAP`, `BOOTSTRAP_ADMIN_*` |              Temporary only | Sensitive during approved bootstrap                                    |                  No | Absent before deploy and after bootstrap         |

Generate a different value for every secret. Safe examples:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Run inside the configured production environment:

```bash
npm run verify:production-env
```

Return only redacted output. It may show state, lengths, and CA expiry, never values.
`RESULT=PASS` proves shape only, not roles, network exposure, or runtime behavior.

## 6. Operator groups 4-8

Proceed in order only after every preceding group has evidence:

1. **Protected Render deployment:** disable Auto-Deploy during the sprint. Deploy only
   the CI-success SHA after environment/database gates pass. Keep Maintenance Mode
   enabled, or retain a proven inbound IP allowlist. Record Render deploy ID,
   RENDER_GIT_COMMIT, time, environment, service hostname, CI run, and rollback ID.
2. **Domain/proxy/origin:** add and verify the canonical custom domain while traffic
   remains protected; wait for Render-managed TLS. Do not set TRUSTED_PROXY_MODE
   merely from the platform name. First prove Render overwrites the headers used by
   the application; select single only if X-Real-IP plus forwarded host/proto are
   trustworthy. Otherwise keep readiness blocked. After the custom domain is proven,
   disable the default onrender.com subdomain to prevent direct-origin bypass.
3. **Backup/log/monitoring:** prove a real backup, restore it into an isolated DB,
   measure RTO/RPO, then delete only that rehearsal target. Connect restricted log
   streaming/alerts and monitor /, /api/health/live, and /api/health/ready without
   URL secrets.
4. **Bootstrap admin:** only after DB/TLS/readiness/audit pass and active-admin count
   is zero. Set bootstrap variables temporarily, run npm run admin:bootstrap once,
   verify forced change and audit, prove the second run refuses, delete variables,
   restart privately, and rerun the verifier.
5. **Final verification:** run route/header/auth smoke, a safe alert test, rollback
   rehearsal, and all quality gates. Do not disable protection or open public traffic.

Minimum private runtime expectations:

| Check                                 | Expected                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `/api/health/live`                    | 200, `Cache-Control: no-store`                                                     |
| `/api/health/ready`                   | 200, no-store; any 503 keeps NO-GO                                                 |
| `/`, `/api/branches`                  | Safe response, no internal configuration                                           |
| `/admin`, `/admin/payments` anonymous | Redirect to login; no data disclosed                                               |
| Anonymous `/api/admin/*`              | 401 with no-store                                                                  |
| Invalid booking/contact JSON          | Safe 4xx, no stack trace                                                           |
| Headers                               | HSTS, CSP, frame denial, nosniff, referrer/permissions policies, no `X-Powered-By` |
| Payment                               | No provider keys/webhooks; `REAL-MONEY PAYMENT: OFF`                               |

Rollback triggers include readiness 503, auth bypass, secret/internal-host
disclosure, migration incompatibility, sustained 5xx, or missing security headers.
Use Render Dashboard > service > Events, locate the recorded successful deploy,
select Rollback, and confirm Rollback to this deploy, verify environment/database compatibility, then repeat
liveness/readiness/admin protection. Never perform destructive database rollback
without a separately reviewed data-preservation plan.
