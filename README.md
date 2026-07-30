# Web Karaoke

Ứng dụng chính và duy nhất dùng để phát triển/phát hành là [`next-app`](./next-app). Hai thư mục `karaoke-luxury` và `next-monorepo` là template Git độc lập, không được ứng dụng chính hoặc CI tham chiếu. Không chạy hoặc deploy hai template này. Xem [`WORKSPACE_CLEANUP_PLAN.md`](./WORKSPACE_CLEANUP_PLAN.md) trước khi lưu trữ hay xóa chúng.

## Yêu cầu

- Node.js 20 trở lên
- npm
- PostgreSQL cho luồng cần database

Root không dùng npm workspaces. Các lệnh root chuyển tiếp tới `next-app` bằng `npm --prefix next-app`, nên hoạt động trong PowerShell, Command Prompt và shell POSIX mà không cần `cd`.

## Cài đặt

Từ root repository:

```powershell
npm --prefix next-app ci
Copy-Item next-app/.env.example next-app/.env
```

Trên macOS/Linux, thay lệnh sao chép bằng:

```sh
cp next-app/.env.example next-app/.env
```

Điền biến môi trường trong `next-app/.env`, sau đó apply migration development:

```powershell
npm --prefix next-app exec -- prisma migrate dev
```

Không chạy `migrate dev`, reset, truncate hoặc test trên database production.

## Lệnh từ root

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy development server của `next-app` |
| `npm run lint` | Chạy ESLint |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm test` | Chạy unit/component tests; không chạy integration test |
| `npm run test:integration` | Migrate và chạy integration test trên database test riêng |
| `npm run build` | Tạo production build |
| `npm run start` | Chạy production build đã tạo |

## Environment

Danh sách đầy đủ và giá trị mẫu nằm tại [`next-app/.env.example`](./next-app/.env.example). Các biến tối thiểu cho ứng dụng gồm:

- `DATABASE_URL`: PostgreSQL của môi trường development/production.
- `AUTH_SECRET`: khóa ký session.
- Các khóa TLS, 2FA, email và media theo tính năng được bật.

Integration test chỉ dùng `TEST_DATABASE_URL`; database name phải kết thúc bằng `_test`. Runner buộc `NODE_ENV=test`, từ chối cùng target với `DATABASE_URL`, từ chối hostname production đã khai báo và không tự fallback sang database khác. Ví dụ PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://test_user:test_password@localhost:5432/web_karaoke_test"
npm run test:integration
```

Nếu production database không có trong `DATABASE_URL` của môi trường hiện tại, khai báo hostname của nó trong `PRODUCTION_DATABASE_HOSTS` (danh sách phân cách bằng dấu phẩy) để guard vẫn có thể chặn.

## Phát hành

Chạy từ root:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration # chỉ khi TEST_DATABASE_URL an toàn đã được cấu hình
npm run build
```

Checklist và kết quả xác minh gần nhất nằm trong [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).

## CI-first integration testing

Docker is not required for normal local development. GitHub Actions owns the authoritative PostgreSQL integration run through the `PostgreSQL integration (two clean runs)` job and a PostgreSQL 16 service named `web_karaoke_ci_test`.

Run these checks locally before pushing:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:integration` runs migrations and the full integration suite only when an explicit guarded `TEST_DATABASE_URL` is already available. `npm run test:integration:local` first checks that this loopback PostgreSQL database is reachable and otherwise stops with a clear message. It never starts Docker or falls back to a remote database.

Docker Compose remains optional for developers who want an isolated local PostgreSQL instance:

```powershell
Copy-Item next-app/.env.test.local.example next-app/.env.test.local
npm run test:db:up
npm run test:integration:local
npm run test:db:down
```

If Docker is not installed, skip those four commands and rely on the GitHub Actions integration job. The database guard still requires `NODE_ENV=test`, PostgreSQL, a database ending in `_test`, and a loopback host; it rejects production mode, Aiven/Render/other remote hosts, configured production host/port targets, and a target equal to `DATABASE_URL`. Logs never include credentials.

### Branch protection guidance

Repository administrators should configure a ruleset for `main` that:

- requires a pull request before merge;
- blocks direct pushes and force pushes to `main`;
- requires the `Lint, typecheck, unit tests, and build` check;
- requires the `PostgreSQL integration (two clean runs)` check;
- requires branches to be up to date before merge.

These are instructions only; this task does not change GitHub repository settings. The metadata step intentionally fails if DB-001 is present, after both integration runs have completed, so release remains blocked until DB-001 is fixed in its separately authorized task.

To publish a branch and inspect CI:

```powershell
git push -u origin <branch-name>
```

Open the repository's **Actions** tab and select **Next app security baseline**, or use `gh run watch` when GitHub CLI is installed. The actual migration result, both integration totals, the nine branch-scope results, and the DB-001 metadata result are only authoritative after the branch is pushed and GitHub Actions finishes.
