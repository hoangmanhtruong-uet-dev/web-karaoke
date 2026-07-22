# Security audit register

| Area | Baseline | Risk | Priority | Remediation |
| --- | --- | --- | --- | --- |
| Admin authorization | Coarse staff/admin checks | Privilege overreach | P1 | Permission matrix and per-page/API enforcement |
| JWT sessions | Eight-hour JWT, no revoke | Disabled-account token persistence | P1 | Database session version checked per protected request |
| Public forms | Validation/idempotency, no shared limiter/body cap | Spam/cost | P1 | Database IP/identity limits, body caps and same-origin |
| Staff lifecycle | Production seed could overwrite admin | Account takeover | P0 | Production seed disabled; one-time bootstrap and audited UI |
| Browser policy | No explicit headers | XSS/clickjacking | P1 | CSP, frame denial, nosniff, referrer/permissions policy and production HSTS |
| Audit/alerts | Business audit only | Weak detection | P1 | Structured auth/staff/cron security events |
| Payment | Read-only records; no live webhook | Unsafe future integration | P2 | Keep mutations disabled until provider controls exist |
| Recovery | No runbook | Slow incident recovery | P2 | Backup, restore, rotation and incident procedures |

The static CSP retains `unsafe-inline` for Next.js static hydration and styles. Production does not enable `unsafe-eval`. A nonce CSP would require dynamically rendering affected pages and is tracked as later hardening.
