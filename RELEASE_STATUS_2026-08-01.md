# B?o c?o ho?n thi?n release candidate ? 2026-08-01

?ng d?ng ch?nh: `next-app`

## K?t lu?n

M? ngu?n hi?n ??t m?c **release candidate ch?y ???c v?i PostgreSQL**. Kh?ng ???c m?
traffic production cho ??n khi ho?n t?t nh?m c?u h?nh v? b?ng ch?ng v?n h?nh ? cu?i
t?i li?u n?y.

## H?ng m?c ?? ho?n thi?n

- Production build kh?ng c?n t?i Google Fonts trong l?c build; font d?ng stack h?
  th?ng n?n build l?p l?i ???c trong m?i tr??ng kh?ng c? Internet.
- Th?m migration `20260801000100_pricing_rule_foreign_keys` ?? t?o hai foreign
  key c?n thi?u c?a `PricingRule`.
- Lo?i UTF-8 BOM kh?i migration pricing c?; th?m regression test ng?n BOM quay l?i.
- S?a integration runner tr?n Windows/Node 26 b?ng c?ch g?i npm CLI qua Node thay
  v? spawn tr?c ti?p `npm.cmd`.
- S?a fixture integration lu?n sinh s? ?i?n tho?i h?p l?.
- N?ng Auth.js l?n `5.0.0-beta.32`, Prisma tooling l?n `7.9.1` v? c?c
  transitive dependency c? advisory qua lockfile.

## B?ng ch?ng release gate

C?c l?nh ???c ch?y t? root repository ng?y 2026-08-01 (Asia/Saigon):

| Gate                                   | K?t qu?                               |
| -------------------------------------- | ------------------------------------- |
| `npm run lint`                         | PASS                                  |
| `npm run typecheck`                    | PASS                                  |
| `npm test`                             | PASS ? 56 files, 259 tests            |
| Prisma schema validation               | PASS                                  |
| Migration deploy tr?n PostgreSQL tr?ng | PASS ? 11/11 migrations               |
| Integration suite                      | PASS ? 4 files, 22 tests              |
| Integration rerun tr?n c?ng schema     | PASS ? 22/22, kh?ng c?n migration ch? |
| `npm run build`                        | PASS ? 56 route/page entries          |
| `npm audit --audit-level=moderate`     | PASS ? 0 vulnerabilities              |
| `git diff --check`                     | PASS                                  |

Post-upgrade smoke test v?i PostgreSQL test c? l?p:

| Route               | HTTP |
| ------------------- | ---- |
| `/`                 | 200  |
| `/booking`          | 200  |
| `/booking/lookup`   | 200  |
| `/admin/login`      | 200  |
| `/api/health/live`  | 200  |
| `/api/health/ready` | 200  |
| `/api/branches`     | 200  |
| `/api/rooms`        | 200  |
| `/api/menu-items`   | 200  |

Database test ch? l?ng nghe loopback, c? t?n k?t th?c b?ng `_test`, ?? ???c d?ng v?
x?a sau khi ki?m tra. Kh?ng migration/test n?o ???c ch?y tr?n Aiven ho?c database
trong `.env`.

## Vi?c b?t bu?c tr??c khi m? production

Ch? d? ?n/operator ph?i cung c?p ho?c x?c nh?n:

1. Canonical HTTPS domain, Render service v? ch?nh s?ch ch?n direct origin.
2. Production database credential ri?ng cho runtime/migration, CA TLS v? b?ng
   ch?ng role least-privilege.
3. Gi? tr? th??ng hi?u th?t: hotline, email, ??a ch?, social URL v? ?nh c? quy?n s? d?ng.
4. Secret production trong secret manager: Auth.js, security hashes, TOTP, recovery,
   cron v? notification provider.
5. Backup/restore rehearsal, log drain, alert delivery, uptime monitors v? rollback target.
6. Ki?m tra responsive/keyboard b?ng browser th?t. Browser automation trong l?n n?y
   b? ch?n khi kh?i t?o b?i l?i Windows sandbox ACL, n?n HTTP smoke kh?ng thay th?
   visual/accessibility QA.

Sau khi c?u h?nh production, ch?y:

```powershell
npm --prefix next-app run verify:production-env
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Ch? ti?p t?c deploy khi verifier tr? `RESULT=PASS`, CI c?a ??ng commit xanh, migration
???c review/backup v? private deployment tr? readiness 200. Quy tr?nh thao t?c chi
ti?t n?m trong `next-app/docs/PRODUCTION_MANUAL_ACTIONS.md`.
