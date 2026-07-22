# Production evidence report

## Current addendum - 2026-07-22 18:39 ICT

- Current candidate: `23e510659a2551958ed5710dd6a58129e2207365`.
- Local HEAD, local `origin/main`, and GitHub `main` matched that SHA.
- GitHub Actions run `29915712602` completed successfully for that SHA.
- The operator identified Render as the actual platform. No Render service ID,
  deploy ID, domain, configuration screenshot, or provider session is available.
- Operator-supplied URL https://website-banhang-gkil.onrender.com is reachable,
  but it serves MTRUONG-STORE, not the karaoke application. Its health payload,
  admin redirects, missing karaoke APIs, and security headers do not match this repo.
  Treat this as a different Render service and do not deploy over it.
- Correct Render URL: https://web-karaoke-el42.onrender.com. Anonymous runtime
  smoke at 2026-07-22 19:18 ICT proved homepage 200, liveness 200, readiness
  503, branches API 500, anonymous admin API 401, invalid payloads 400, and
  HTTP-to-HTTPS 301. Security headers pass and X-Powered-By is absent.
- Admin redirects contain callbackUrl=https://0.0.0.0:10000, proving canonical
  auth/proxy handling is not production-correct. The onrender.com homepage is
  publicly reachable, so protected/private deployment evidence fails.
- Operator screenshots at 2026-07-22 19:23 ICT exposed production database,
  authentication, cron, and email credentials. Values are intentionally omitted.
  Treat all displayed credentials as compromised and rotate with rollback checks.
- The screenshots show an Aiven administrative database account in runtime and
  sslmode=require. No dedicated runtime role, verify-full CA variable, AUTH_URL,
  canonical origin, trusted proxy mode, expected proxy mode, or separate security
  hash secret is visible. Absence must be confirmed in Render rather than assumed.
- Start with group 1 in `docs/PRIVATE_PRODUCTION_DEPLOYMENT.md` and return redacted
  evidence using `docs/PRODUCTION_OPERATOR_EVIDENCE_TEMPLATE.md`.
- The historical evidence below remains valid for its stated cutoff, but its older
  candidate SHA/CI references are superseded by this addendum.

### Current local quality-gate rerun

| Gate                               | Result                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `npm ci`                           | PASS - 673 packages, 0 vulnerabilities                                        |
| `npx prisma generate`              | PASS - Prisma Client 7.9.0                                                    |
| `npm run lint`                     | PASS                                                                          |
| `npm run typecheck`                | PASS                                                                          |
| `npm test`                         | PASS - 25 files / 139 tests                                                   |
| `npm run test:integration`         | BLOCKED locally - isolated test database unavailable; no production DB action |
| Remote PostgreSQL integration      | PASS in run `29915712602` for the exact candidate SHA                         |
| `npm run build`                    | PASS - 37 static pages                                                        |
| `npm audit --audit-level=moderate` | PASS - 0 vulnerabilities                                                      |
| `git diff --check`                 | PASS after documentation formatting                                           |
| `npm run verify:production-env`    | EXPECTED FAIL - no production environment; output redacted                    |
| Diff secret scan                   | PASS - 0 suspected secret values; only five documentation entries changed     |
| Payment provider scan              | PASS - 0 provider/webhook matches; real-money payment remains off             |

The local integration rerun first refused an unset test URL, then the explicit
karaoke_evidence_test target could not connect. No migration reached production.

Evidence cutoff: 2026-07-22 18:07 ICT

## A. Executive conclusion

**NO-GO PRODUCTION**

Code and CI evidence pass. Production hosting, domain, database, proxy, backup,
restore, log-drain, alert, monitoring, rollback, secret-rotation, and bootstrap
evidence are unavailable. No public deployment or traffic opening was performed.

## B. Deployment evidence

| Field                     | Evidence                                   |
| ------------------------- | ------------------------------------------ |
| CI-verified sprint commit | `5fbdb0c547c2b84b4bc6fcfaa0c646061c5f8a5d` |
| CI run                    | GitHub Actions `29915462916` — SUCCESS     |
| Deployment ID             | BLOCKED ? not available                    |
| Production domain         | BLOCKED ? not available                    |
| Deployment time           | BLOCKED ? not available                    |
| Rollback target           | BLOCKED ? not available                    |

## C. Infrastructure configuration

| Control         | Result  | Evidence                                                                    |
| --------------- | ------- | --------------------------------------------------------------------------- |
| Database TLS    | BLOCKED | Production URL/CA unavailable; source fails closed on missing verified TLS. |
| Auth.js         | BLOCKED | Production `AUTH_URL`/secret-manager configuration unavailable.             |
| Trusted proxy   | BLOCKED | Topology and header-overwrite evidence unavailable.                         |
| Origin lock     | BLOCKED | Firewall/CDN/load-balancer evidence unavailable.                            |
| Least privilege | BLOCKED | Production role attributes/grants unavailable.                              |
| Secret rotation | BLOCKED | No rotation/revocation evidence.                                            |

`npm run verify:production-env` was added as a redacted, fail-closed verifier. A
successful verifier run proves configuration shape only; it does not replace
network, role, rotation, or runtime evidence.

## D. Production runtime evidence

- Liveness: BLOCKED ? no production domain.
- Readiness: BLOCKED ? isolated test result is not production evidence.
- Route smoke: BLOCKED ? no production domain/private deployment.
- Security headers: BLOCKED on production; code-level tests previously passed.
- Authentication smoke: BLOCKED ? no approved production test account.

## E. Backup/restore evidence

- Backup ID/timestamp: BLOCKED.
- Restore target: BLOCKED.
- Integrity and migration status: BLOCKED.
- Actual RTO/RPO: BLOCKED.
- Rehearsal cleanup: BLOCKED.

No production data was read, changed, restored, or deleted during this sprint.

## F. Logging/alert evidence

The application emits structured security JSON with request/event identifiers,
but only console emission is visible in source. External drain, retention,
restricted access, recipient, test delivery, and cooldown evidence are BLOCKED.

## G. Monitoring/rollback evidence

Homepage/liveness/readiness monitor IDs and alert tests are BLOCKED. No deployment
or previous immutable artifact exists in the available evidence, so rollback
rehearsal is also BLOCKED.

## H. Quality gates

Local evidence collected in this sprint:

| Gate                            | Result                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `npm ci`                        | PASS — 673 packages installed from lockfile                                    |
| Prisma generate                 | PASS — Prisma Client 7.9.0                                                     |
| Lint                            | PASS                                                                           |
| Typecheck                       | PASS                                                                           |
| Unit                            | PASS — 25 files / 139 tests                                                    |
| PostgreSQL migrations           | PASS — 6 migrations on isolated database                                       |
| PostgreSQL integration          | PASS — 1 file / 7 tests                                                        |
| Production build                | PASS — 37 static pages generated                                               |
| Dependency audit                | PASS — 0 vulnerabilities at moderate threshold                                 |
| `git diff --check`              | PASS before staging                                                            |
| Production environment verifier | EXPECTED FAIL — production environment is unavailable; output was redacted     |
| Baseline remote CI              | PASS — run `29898986160` for commit `159129e3ebecfeacf09c62c06a1f43bc458dd432` |
| Sprint commit CI                | PASS — run `29915462916` for commit `5fbdb0c547c2b84b4bc6fcfaa0c646061c5f8a5d` |

Integration used disposable PostgreSQL `karaoke_evidence_test` on loopback. It is
not production evidence. Production-domain smoke and security smoke are BLOCKED
because no deployment/domain or authorization to open traffic is available.

Sprint commit `5fbdb0c547c2b84b4bc6fcfaa0c646061c5f8a5d` received remote CI success. It is
a private deployment candidate.

## I. Payment status

**REAL-MONEY PAYMENT: OFF**

No live provider SDK, webhook secret, provider webhook route, or refund endpoint
was found. The admin payment page is read-only. Payment was not enabled.

## J. Remaining risks

- P0: none proven in code; unknown production access/configuration cannot be ruled out.
- P1: every blocked infrastructure and operational control in the P1 checklist.
- P2: static CSP still requires `unsafe-inline`; production PII retention automation is not implemented/proven.
- P3: evidence collection remains manual until provider-specific automation is selected.

## K. Final decision

**NO-GO PRODUCTION.** Any single missing P1 evidence item is sufficient for
NO-GO. A new review may consider GO only after every blocked row has production
evidence, the exact deployed SHA has successful CI, production security smoke
passes, and real-money payment remains off.
