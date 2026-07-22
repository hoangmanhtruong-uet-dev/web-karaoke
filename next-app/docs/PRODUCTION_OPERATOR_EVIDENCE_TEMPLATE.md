# Production operator evidence return template

Return redacted values only. Do not include passwords, tokens, cookies,
authorization headers, connection strings, raw CA contents, bypass links, or private
customer data. Leave an item `BLOCKED` until real evidence exists.

## 1. Hosting and project

- Platform/team/project ID:
- Render service type/plan and protection capability:
- Protection scope/method:
- Repository/root/branch:
- Node/install/build settings:
- Auto-assign production domains disabled: PASS / FAIL / BLOCKED
- Redacted screenshots or provider evidence IDs:

## 2. Database and TLS

- Provider/service ID and region:
- Runtime role attributes/grant transcript:
- Migration role attributes/grant transcript:
- `btree_gist` version/owner:
- Runtime is not owner/superuser: PASS / FAIL / BLOCKED
- Correct CA + hostname verification: PASS / FAIL / BLOCKED
- Wrong-CA negative test: PASS / FAIL / BLOCKED
- Network allowlist/private-network evidence:
- Migration job ID and applied migration list:

## 3. Environment

- Redacted variable-name list:
- `npm run verify:production-env` redacted output:
- Bootstrap/development seed variables absent: PASS / FAIL / BLOCKED
- Migration credential absent from runtime: PASS / FAIL / BLOCKED
- Payment provider variables absent: PASS / FAIL / BLOCKED

## 4. Deployment

- Deployment ID:
- Exact commit SHA:
- CI run URL/ID and conclusion:
- Deployment time/operator/environment:
- Protected private URL (do not include bypass token):
- Protection verification:
- Rollback target ID/SHA:

## 5. Domain, proxy, origin and runtime smoke

- Canonical HTTPS domain and certificate state:
- HTTP-to-HTTPS/canonical redirect transcript:
- Trusted proxy mode and provider header-overwrite evidence:
- Direct generated/origin URL result:
- Forged Host/X-Forwarded-For/X-Forwarded-Proto results:
- Liveness/readiness status and headers:
- Route/auth/invalid-payload smoke transcript:
- Security header transcript:

## 6. Backup and restore

- Backup ID/timestamp/schedule/retention/encryption/access:
- Backup failure alert ID:
- Isolated restore job/target:
- Migration/schema/row-count/integrity results:
- Restore start/end and actual RTO:
- Expected RPO:
- App smoke against restored target:
- Rehearsal target cleanup ID/time:

## 7. Logs, alerts and monitors

- External drain destination/config ID/retention/access:
- Redacted event with environment and request/event ID:
- Readiness/auth-rate-limit/cron/privileged-action alert rule IDs:
- Delivered safe test alert timestamp/recipient/cooldown evidence:
- Homepage/live/ready monitor IDs, interval, timeout, retries, recipient:
- Controlled failure and recovery notification evidence:

## 8. Bootstrap and rotation

- Rotation version/revocation IDs (never values):
- Pre-bootstrap active-admin count:
- Bootstrap command redacted result and audit event ID:
- Post-bootstrap valid-admin count and forced-password-change evidence:
- Second-run safe refusal:
- Bootstrap variable-name absence after cleanup:
- Post-cleanup verifier result:

## 9. Rollback and final gates

- Candidate and rollback target deployment IDs/SHAs:
- Database compatibility review:
- Rollback start/end, smoke results, and forward restoration:
- Final command/result table:
- Working tree and local/remote/deployment parity:
- Final payment statement: `REAL-MONEY PAYMENT: OFF`
