# Production evidence report

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
