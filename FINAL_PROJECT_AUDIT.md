# FINAL PROJECT AUDIT — `web-karaoke`

Ngày audit: 2026-07-29 (Asia/Saigon)  
Phạm vi: working tree hiện tại, audit chỉ-đọc; không sửa lỗi, không migration, không kết nối/ghi database.  
Lưu ý: báo cáo được lập từ source và command thực tế trong lượt audit này, không dùng kết luận của các báo cáo review cũ.

## A. Executive summary

### Kết luận

Ứng dụng hiện ở mức **chạy local được**, chưa đủ điều kiện staging/beta công khai và **không production-ready**.

Có **2 Blocker, 9 High, 10 Medium, 4 Low** và 2 mục Enhancement. Hai blocker là cấu hình production hiện không thể vận hành an toàn và dữ liệu/nội dung kinh doanh public còn là dữ liệu mẫu/chưa được xác minh. Ngoài ra còn lỗi phân quyền chi nhánh, giá động, migration và payment race.

### Ứng dụng chính và stack thực tế

- App chính: `next-app`.
- `karaoke-luxury` và `next-monorepo`: template Git độc lập, bị root `.gitignore` loại trừ; không được root scripts/CI dùng.
- Root không dùng npm workspaces; các script dùng `npm --prefix next-app`.
- Package manager: npm, có lockfile tại root và `next-app/package-lock.json`.
- Stack: Next.js 16.2.11 App Router, React 19.2.4, TypeScript 5, Prisma/PostgreSQL 7.9, Auth.js 5 beta, Zod, Vitest 4, Tailwind CSS 4.
- Runtime audit: Node `v26.1.0`, npm `11.13.0`; CI dùng Node 22; root README nói Node 20+, app README nói Node 18+.

### Command đã chạy

| Command | Kết quả |
|---|---|
| `git status --short --branch` | PASS command; worktree bẩn |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 52 files, 224/224 tests |
| `npm run test:integration` | **Không chạy**: không có `TEST_DATABASE_URL`; `.env` trỏ managed remote, tên DB không kết thúc `_test` |
| `npm run build` | PASS: 56 static/dynamic routes được build |
| `git diff --check` | FAIL: trailing whitespace trong `next-app/next-env.d.ts` do build sinh; side effect đã được hoàn nguyên |
| Production env verifier | Không chạy: môi trường từ chối nạp secret production vào project script; source verifier đã được audit |
| `npm audit` | Không chạy: môi trường từ chối gửi dependency manifest ra advisory service |

Không có test `.skip`, `.only`, `@ts-ignore` hoặc `@ts-expect-error` được phát hiện. Vitest unit config chủ động loại `*.integration.test.ts`; đây không phải skipped test trong kết quả 224 tests.

### Git/workspace

Tại thời điểm bắt đầu audit, các file sau đã thay đổi và được giữ nguyên:

- Modified: `next-app/src/app/api/admin/me/2fa/setup/route.test.ts`
- Modified: `next-app/src/app/api/payments/webhook/route.ts`
- Modified: `next-app/src/lib/booking-service.ts`
- Modified: `next-app/src/lib/payment-provider.test.ts`
- Modified: `next-app/src/lib/payment-provider.ts`
- Modified: `next-app/src/lib/production-env.test.ts`
- Untracked: `PRODUCTION_CHECKLIST.md`
- Untracked: `next-app/src/lib/test-database-guard.test.ts`

## B. Bảng phát hiện

### Tổng hợp

| ID | Severity | Category | Trạng thái | Tiêu đề | Chặn public |
|---|---|---|---|---|---|
| PROD-001 | BLOCKER | Production config | Operational risk | Cấu hình hiện tại không thể chạy production an toàn | Yes |
| CONTENT-001 | BLOCKER | Content/brand | Confirmed bug | Public site chứa dữ liệu kinh doanh, ưu đãi và ảnh mẫu chưa xác minh | Yes |
| AUTHZ-001 | HIGH | Authorization/IDOR | Security risk | Staff vượt branch scope ở booking read và mutation | Yes |
| AUTHZ-002 | HIGH | Data exposure | Security risk | Dashboard staff trả số liệu toàn hệ thống và doanh thu | Yes |
| AUTH-001 | HIGH | Session security | Security risk | Route quản trị 2FA không kiểm tra `sessionVersion` | Yes |
| PRICING-001 | HIGH | Pricing/concurrency | Confirmed bug | Pricing rule chồng lấn được phép do thuật toán và race | Yes |
| DB-001 | HIGH | Migration/integrity | Confirmed bug | Migration `PricingRule` thiếu foreign key | Yes |
| PAYMENT-001 | HIGH | Payment/concurrency | Security risk | Webhook payment có lost-update race | Yes nếu bật payment |
| DATA-001 | HIGH | Architecture/content | Confirmed bug | Public pages và booking dùng hai nguồn dữ liệu khác nhau | Yes |
| QA-001 | HIGH | Database verification | Unable to verify | Critical integration suite chưa được chạy trên DB test | Yes |
| OPS-001 | HIGH | Operations | Operational risk | Backup, restore, monitoring, alert và external log drain chưa có bằng chứng | Yes |
| API-001 | MEDIUM | Public API | Confirmed bug | `/api/rooms` có thể trả room thuộc branch inactive | No |
| API-002 | MEDIUM | API validation | Confirmed bug | Admin query sai bị âm thầm thay bằng default | No |
| PRICING-002 | MEDIUM | Booking UX/pricing | Confirmed bug | Giá ước tính client bỏ qua pricing rules | No |
| UI-001 | MEDIUM | Booking UX | Confirmed bug | Availability lỗi vẫn giữ danh sách phòng cũ | No |
| UI-002 | MEDIUM | Error UX | Confirmed bug | Global error page có tiếng Việt bị hỏng encoding | No |
| SEO-001 | MEDIUM | SEO/structured data | Confirmed bug | JSON-LD dùng type không chuẩn và URL branch sai | No |
| REPO-001 | MEDIUM | Release integrity | Operational risk | Production-critical code chưa commit | Yes |
| TEST-001 | MEDIUM | Test gaps | Confirmed missing feature | Không có E2E/coverage gate; component coverage rất mỏng | No |
| PRIVACY-001 | MEDIUM | Privacy/legal | Confirmed missing feature | Không có trang privacy/terms/booking-cancellation public | No |
| MEDIA-001 | MEDIUM | Storage consistency | Confirmed bug | Delete media có thể để object orphan/response lỗi sau DB commit | No |
| DOC-001 | LOW | Documentation | Technical debt | README và runtime/package manager không đồng nhất | No |
| API-003 | LOW | Public API | Confirmed bug | Branch room count gồm cả room không khả dụng | No |
| DEP-001 | LOW | Dependencies | Technical debt | Root khai báo dependency không được root code sử dụng | No |
| DB-002 | LOW | Maintainability | Technical debt | Prisma schema có comment mojibake diện rộng | No |
| PAYMENT-002 | ENHANCEMENT | Payment | Confirmed missing feature | Chưa có luồng tạo payment/refund end-to-end | No |
| AUTH-002 | ENHANCEMENT | Account recovery | Needs business decision | Chưa có forgot/reset password hoặc customer account | No |

### Chi tiết phát hiện

#### PROD-001 — Cấu hình hiện tại không thể chạy production an toàn

- **Bằng chứng:** `next-app/.env` chỉ có `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_SSL_ALLOW_UNVERIFIED`; target được phân loại managed-remote, không phải DB test, và unverified SSL đang bật. `next-app/src/lib/prisma.ts:33-55` bắt buộc TLS+CA khi runtime production. `next-app/src/lib/production-env.ts:45-235` yêu cầu thêm CA, security hash, TOTP/recovery secrets, canonical HTTPS origin, trusted proxy và hotline hợp lệ. `next-app/src/config/site.ts:25-41` fallback sang localhost/placeholder.
- **Impact:** runtime production có thể fail khi import Prisma; auth/origin/2FA/brand fail hoặc chạy với placeholder.
- **Tái hiện:** đối chiếu key trong `.env` với verifier; không in giá trị secret.
- **Fix:** tạo secret/config production ngoài Git; chạy verifier trong pipeline an toàn; fail deployment nếu verifier fail; cung cấp CA Aiven hợp lệ và tắt unverified.
- **Test cần bổ sung:** CI job `verify:production-env` với secret giả hợp lệ; smoke test startup/readiness trên staging.
- **Release blocker:** Yes.

#### CONTENT-001 — Dữ liệu kinh doanh và hình ảnh public chưa xác minh

- **Bằng chứng:** `next-app/src/data/branches.ts:7-95` hard-code 4 địa chỉ; `next-app/src/data/rooms.ts:8-153` hard-code phòng/giá; `next-app/src/data/promotions.ts:15-55` công bố ưu đãi đến 25%; `next-app/prisma/seeds/data.ts:111-193` dùng thương hiệu VivaStar và địa chỉ/điện thoại/email khác. `next-app/public` chỉ có 4 SVG placeholder; `next-app/src/components/sections/GalleryPreview.tsx:25` tự mô tả là visual placeholder. `next-app/src/config/site.ts:33-41` fallback hotline `1900 0000`, “4 chi nhánh”, giờ mở cửa.
- **Impact:** có thể public thông tin giả/sai thương hiệu, địa chỉ, giá, ưu đãi và hình ảnh; rủi ro khách hàng và pháp lý.
- **Tái hiện:** build site không cần env brand; các default/static data được prerender.
- **Fix:** chủ doanh nghiệp duyệt một dataset production; bỏ fallback kinh doanh ở production; cung cấp asset thật; seed production tách khỏi demo seed.
- **Test:** production content validation; link/image crawl; snapshot approved content.
- **Release blocker:** Yes.

#### AUTHZ-001 — Staff vượt branch scope

- **Bằng chứng:** `next-app/src/lib/admin-queries.ts:32-42` đặt `scope` trước rồi để `query.branchId` ghi đè; `next-app/src/lib/calendar-query.ts:4-5` lặp lại lỗi. Các mutation `transition`, `reassign-room`, `notes` chỉ gọi permission ở `next-app/src/app/api/admin/bookings/[id]/transition/route.ts:28-46`, `reassign-room/route.ts:16-37`, `notes/route.ts:11-31`; service tại `next-app/src/lib/admin-booking-service.ts:25-145` không nhận/enforce branch scope.
- **Impact:** staff chi nhánh A có thể đọc, đổi trạng thái, đổi phòng hoặc thêm note booking chi nhánh B.
- **Tái hiện:** đăng nhập staff A; GET bookings/calendar với `branchId=B`; dùng ID trả về để POST transition/note.
- **Fix:** tạo một branch-scope predicate bắt buộc và merge sau user filters; service mutation phải load booking bằng `{id, branchId: assignedBranchId}`.
- **Test:** API integration cho staff A/B trên mọi read/mutation; test query override.
- **Release blocker:** Yes.

#### AUTHZ-002 — Dashboard staff lộ số liệu toàn hệ thống

- **Bằng chứng:** `next-app/src/app/api/admin/dashboard/route.ts:5-8` bỏ qua principal sau authorization; `next-app/src/lib/admin-queries.ts:65-92` aggregate toàn bộ booking, contact, customer và payment revenue.
- **Impact:** staff xem doanh thu và hoạt động của mọi chi nhánh.
- **Tái hiện:** login staff branch A; GET `/api/admin/dashboard`.
- **Fix:** truyền principal vào query và scope mọi aggregate; quyết định rõ manager có global scope hay không.
- **Test:** fixtures hai branch, assert staff chỉ thấy A.
- **Release blocker:** Yes.

#### AUTH-001 — Session revoke không áp dụng cho 2FA management

- **Bằng chứng:** route setup dùng trực tiếp JWT `auth()` tại `next-app/src/app/api/admin/me/2fa/setup/route.ts:35-67`; disable tương tự tại `next-app/src/app/api/admin/me/2fa/route.ts:22-53`. Cả hai không so `session.user.sessionVersion` với DB, trong khi `getAdminPrincipal()` có check tại `next-app/src/lib/admin-auth.ts:18-36`.
- **Impact:** JWT đã bị revoke vẫn vào endpoint 2FA nếu account còn active; điều này phá cam kết revoke session.
- **Tái hiện:** login admin, lưu cookie, increment `sessionVersion` bằng revoke, gọi 2FA endpoint bằng cookie cũ và thông tin re-auth.
- **Fix:** dùng `getAdminPrincipal()`/helper chung; kiểm tra role, active, sessionVersion và 2FA state.
- **Test:** revoked-session tests cho begin/confirm/disable.
- **Release blocker:** Yes.

#### PRICING-001 — Pricing rule overlap không an toàn

- **Bằng chứng:** `next-app/src/lib/pricing-service.ts:30-32` xử lý hai range open-ended sai; candidate bắt đầu trước existing có thể bị coi không overlap. Route kiểm tra ngoài transaction tại `next-app/src/app/api/admin/pricing-rules/route.ts:8-9`; migration `20260729000200.../migration.sql:10-12` không có exclusion/unique constraint chống overlap.
- **Impact:** hai rule cùng priority áp dụng cùng lúc; `calculateRoomPrice` chọn theo ID, làm giá phụ thuộc thứ tự không phải nghiệp vụ.
- **Tái hiện:** tạo rule A open-ended từ ngày sau, rồi rule B open-ended bắt đầu sớm hơn, cùng branch/priority/time.
- **Fix:** chuẩn hóa range bằng infinity, transaction/lock theo scope và DB constraint hoặc serializable retry; validate scope room/branch.
- **Test:** open-ended both directions, concurrent create, midnight/multi-slot/weekend/holiday.
- **Release blocker:** Yes.

#### DB-001 — Migration PricingRule thiếu foreign key

- **Bằng chứng:** Prisma khai báo relation ở `next-app/prisma/schema.prisma:408-429`; migration tạo `branchId`/`roomId` ở `20260729000200_flexible_pricing_payment_hardening/migration.sql:10` nhưng không `ADD CONSTRAINT` cho Branch/Room.
- **Impact:** database được migrate từ SQL có thể chứa orphan rules và lệch Prisma schema.
- **Tái hiện:** review SQL; DB cho phép ID không tồn tại nếu migration thực tế đúng như file.
- **Fix:** migration additive thêm FK sau preflight orphan check; không sửa migration đã apply.
- **Test:** migration integration từ baseline và FK rejection.
- **Release blocker:** Yes.

#### PAYMENT-001 — Webhook payment có race

- **Bằng chứng:** `next-app/src/app/api/payments/webhook/route.ts:59-114` đọc payment rồi update trong transaction nhưng không row lock/optimistic status condition; `lastWebhookId` chỉ lưu một event. Hai event khác nhau có thể cùng đọc `pending` rồi ghi trạng thái khác nhau.
- **Impact:** paid/failed/expired có thể bị last-writer-wins; booking/payment reconciliation sai.
- **Tái hiện:** gửi đồng thời webhook signed `paid` và `failed` cho cùng payment.
- **Fix:** `SELECT ... FOR UPDATE` hoặc conditional update theo current status; event ledger với globally unique provider event ID; chính sách ordering.
- **Test:** concurrent paid/failed/refund, duplicate event ID trên cùng/khác payment.
- **Release blocker:** Yes khi payment bật.

#### DATA-001 — Hai nguồn dữ liệu public và booking

- **Bằng chứng:** rooms/branches/menu/contact/sitemap import static data (`next-app/src/app/rooms/page.tsx:33-34`, `menu/page.tsx:12`, `branches/page.tsx:28-29`, `sitemap.ts:2`). Booking form lấy catalog từ DB API tại `next-app/src/app/booking/page.tsx:227-248`.
- **Impact:** khách thấy phòng/giá/branch/promotion khác dữ liệu backend; SEO có thể index branch không book được.
- **Tái hiện:** đổi DB branch/room mà không đổi source static.
- **Fix:** một catalog source; prerender/revalidate từ DB/CMS hoặc generate approved content artifact.
- **Test:** contract test public pages/API, sitemap-active-branch test.
- **Release blocker:** Yes.

#### QA-001 — Chưa xác minh critical DB behavior

- **Bằng chứng:** `.env` không có `TEST_DATABASE_URL`; guard `next-app/scripts/test-database-guard.ts:61-123` đúng khi từ chối target không `_test`; 18 integration test declarations tồn tại nhưng không chạy.
- **Impact:** exclusion constraint, migration chain, advisory lock, idempotency, outbox và payment/booking race chưa được chứng minh trên PostgreSQL của commit hiện tại.
- **Tái hiện:** `TEST_DATABASE_URL_PRESENT=False`; integration command cố ý không chạy.
- **Fix:** provision PostgreSQL test riêng; chạy migrations và suite trong CI/staging.
- **Test:** chính integration suite hiện có cộng thêm các race nêu trên.
- **Release blocker:** Yes.

#### OPS-001 — Thiếu bằng chứng vận hành

- **Bằng chứng:** chỉ có GitHub CI; không có deployment config trong repo. `next-app/docs/BACKUP_RESTORE_RUNBOOK.md:3-9` tự ghi BLOCKED/UNPROVEN. Logger chỉ console tại `next-app/src/lib/logger.ts:13-25`. Không có SDK error tracking/alert destination trong source.
- **Impact:** không chứng minh được backup/PITR/restore, alert, external log retention hoặc rollback production.
- **Tái hiện:** inventory file/config.
- **Fix:** staging, deployment manifest, backup/PITR, restore rehearsal, external log/error tracking, alerts và rollback evidence.
- **Test:** restore drill; synthetic readiness/booking alert; rollback rehearsal.
- **Release blocker:** Yes.

#### API-001 — Public rooms không scope branch active

- **Bằng chứng:** `next-app/src/app/api/rooms/route.ts:22-45` filter room status nhưng không `branch.status=active`; response select branch name/slug.
- **Impact:** room của branch maintenance/coming-soon vẫn hiện.
- **Tái hiện:** branch inactive + room available, GET `/api/rooms`.
- **Fix:** thêm relation filter `branch: {status: active}`.
- **Test:** inactive branch fixture.
- **Release blocker:** No.

#### API-002 — Query admin sai bị bỏ qua

- **Bằng chứng:** `next-app/src/lib/admin-queries.ts:6-19,95-98` dùng `.catch(default)` cho page/pageSize/status/sort/order.
- **Impact:** client gửi giá trị sai không nhận 400, che bug và tạo kết quả bất ngờ.
- **Tái hiện:** `?page=abc&status=not-a-status`.
- **Fix:** `safeParse` và trả 400; chỉ default khi param absent.
- **Test:** invalid/duplicate/oversized query tests.
- **Release blocker:** No.

#### PRICING-002 — Giá client không dùng pricing service

- **Bằng chứng:** `next-app/src/app/booking/page.tsx:1201-1207` tính `hourlyRate * duration`; server dùng `calculateRoomPrice` và snapshot tại `next-app/src/lib/booking-service.ts:211-254`.
- **Impact:** weekend/holiday/multi-band price khác số khách vừa thấy.
- **Tái hiện:** tạo rule rate khác base rồi book.
- **Fix:** availability/quote API trả server-calculated quote + expiry/version; UI ghi rõ breakdown.
- **Test:** quote vs booking snapshot parity.
- **Release blocker:** No.

#### UI-001 — Availability lỗi giữ rooms cũ

- **Bằng chứng:** `next-app/src/app/booking/page.tsx:260-290`; catch chỉ set error, không clear rooms. Submit chỉ disable theo `isSubmitting` tại dòng 958-960/1004-1007.
- **Impact:** UI vẫn gợi ý phòng cũ sau khi đổi ngày/giờ nhưng request mới lỗi.
- **Tái hiện:** load availability thành công, đổi giờ, làm API timeout.
- **Fix:** clear result ngay khi input đổi/lỗi; disable submit khi availability đang lỗi/loading hoặc chưa có quote.
- **Test:** fake timer/abort/timeout/stale response.
- **Release blocker:** No; backend vẫn recheck.

#### UI-002 — Global error bị hỏng chữ

- **Bằng chứng:** `next-app/src/app/global-error.tsx:14-25` chứa literal `T?m th?i...`.
- **Impact:** trang lỗi nghiêm trọng hiển thị nội dung không đọc được.
- **Tái hiện:** throw ở root error boundary.
- **Fix:** lưu UTF-8 đúng và thêm render test.
- **Test:** component snapshot/text assertion.
- **Release blocker:** No.

#### SEO-001 — Structured data không hợp lệ/chưa đúng branch

- **Bằng chứng:** `next-app/src/lib/seo.ts:11-14` dùng `@type: "Karaoke"` và URL luôn là `/`; branch pages dùng component tại `next-app/src/app/branches/[slug]/page.tsx:6-10`. Schema.org định nghĩa `LocalBusiness` cho một địa điểm/chi nhánh; không có bằng chứng `Karaoke` là type chuẩn.
- **Impact:** rich result parser có thể bỏ structured data; mọi branch tự nhận homepage URL.
- **Tái hiện:** chạy Schema.org/Google validator trên branch page.
- **Fix:** dùng `LocalBusiness` hoặc subtype chuẩn được xác minh; URL riêng từng branch; chỉ publish dữ liệu thật.
- **Test:** JSON-LD schema snapshot + external validator in release checklist.
- **Nguồn chuẩn:** https://schema.org/LocalBusiness
- **Release blocker:** No.

#### REPO-001 — Working tree không phải release artifact

- **Bằng chứng:** Git status liệt kê 6 modified và 2 untracked file, gồm booking/payment production code.
- **Impact:** CI của `origin/main` không chứng minh đúng source đang audit; file test guard chưa tracked.
- **Tái hiện:** `git status --short --branch`.
- **Fix:** review/commit theo PR nhỏ; CI trên commit SHA; tạo immutable artifact.
- **Test:** full gates trên clean checkout.
- **Release blocker:** Yes.

#### TEST-001 — Test pyramid thiếu

- **Bằng chứng:** không có Playwright/Cypress/E2E file; không có coverage config/threshold; chỉ 6 component test declarations; core public/admin pages phần lớn không có component tests.
- **Impact:** responsive, keyboard, real browser hydration, auth cookie và booking end-to-end không được bảo vệ.
- **Tái hiện:** inventory test/config.
- **Fix:** E2E critical path, a11y smoke, coverage theo risk chứ không chỉ tổng phần trăm.
- **Test:** xem Test gap matrix.
- **Release blocker:** No.

#### PRIVACY-001 — Thiếu chính sách public

- **Bằng chứng:** route build không có privacy/terms/cancellation; footer không link các trang này. `next-app/src/lib/retention.ts:5-27` chỉ chọn candidate/dry-run guard, không có production anonymization/deletion job.
- **Impact:** khách không biết mục đích, retention, quyền xóa dữ liệu hay điều kiện hủy.
- **Tái hiện:** inventory routes/source.
- **Fix:** business/legal phê duyệt policy; công bố trang; implement DSAR/anonymization workflow.
- **Test:** route/link crawl và retention integration test.
- **Release blocker:** No, nhưng cần legal decision trước public có thu PII.

#### MEDIA-001 — Delete media không atomic qua DB/storage

- **Bằng chứng:** `next-app/src/app/api/admin/media/route.ts:8` commit DB delete/update trước rồi mới `deleteObject`; lỗi storage sau commit làm response fail dù DB đã đổi và object có thể còn.
- **Impact:** orphan object, retry khó hiểu, chi phí/rò rỉ asset.
- **Tái hiện:** làm storage delete trả lỗi.
- **Fix:** outbox/garbage-collection job idempotent; trả trạng thái DB và schedule cleanup.
- **Test:** provider failure/retry/orphan sweep.
- **Release blocker:** No.

#### DOC-001 — README drift

- **Bằng chứng:** root README Node 20+/npm; app README Node 18+/npm hoặc bun, hướng dẫn `npm install`; CI Node 22; app tree mô tả các thư mục top-level không đúng.
- **Impact:** onboarding/deploy chạy sai tool/version.
- **Fix:** pin `.nvmrc`/engines/packageManager và một nguồn tài liệu.
- **Test:** docs command smoke trên clean checkout.
- **Release blocker:** No.

#### API-003 — Room count không lọc available

- **Bằng chứng:** `next-app/src/app/api/branches/route.ts:23-40` `_count.rooms` đếm mọi status.
- **Impact:** public count có thể cao hơn phòng có thể đặt.
- **Fix:** filtered relation count hoặc field đặt tên `totalRooms`.
- **Test:** mixed room status fixture.
- **Release blocker:** No.

#### DEP-001 — Root dependency thừa

- **Bằng chứng:** root `package.json:13-22` chứa UI dependencies nhưng root không có source, chỉ proxy scripts; app khai báo lại các package.
- **Impact:** lockfile/attack surface và update noise không cần thiết.
- **Fix:** sau audit riêng usage/CI, bỏ khỏi root trong PR cleanup.
- **Test:** root scripts sau clean install.
- **Release blocker:** No.

#### DB-002 — Prisma comments mojibake

- **Bằng chứng:** comment quanh `next-app/prisma/schema.prisma:12,36,60,78...` bị double-encoded.
- **Impact:** giảm khả năng review schema, không ảnh hưởng generated client.
- **Fix:** chỉ sửa comment encoding trong PR riêng.
- **Test:** `prisma validate`.
- **Release blocker:** No.

#### PAYMENT-002 — Payment chưa end-to-end

- **Bằng chứng:** có webhook/model nhưng không có API tạo payment, checkout/redirect, refund endpoint hay UI; `next-app/README.md` cũng ghi chưa có payment processing.
- **Impact:** không được quảng bá thanh toán online.
- **Fix:** chỉ triển khai sau business/provider/security design.
- **Test:** provider sandbox E2E, webhook signature/idempotency/refund.
- **Release blocker:** No nếu payment bị tắt.

#### AUTH-002 — Chưa có recovery/customer auth

- **Bằng chứng:** route inventory chỉ có credentials admin Auth.js; không có forgot/reset/register/customer session.
- **Impact:** đây là tính năng chưa có, không phải bypass hiện tại.
- **Fix:** cần quyết định business; nếu thêm phải có single-use token, expiry, enumeration-safe response.
- **Test:** recovery abuse/race/session revoke.
- **Release blocker:** No.

## API inventory

| Nhóm | Routes | Bảo vệ chính | Kết luận |
|---|---|---|---|
| Public catalog | `/api/branches`, `/api/rooms`, `/api/menu-items`, `/api/availability` | Zod strict, max 100, public cache | Cơ bản tốt; lỗi inactive branch ở rooms |
| Public mutation/lookup | `/api/bookings`, `/api/contact`, `/api/booking/lookup` | same-origin cho mutation, size limit, DB rate limit, idempotency | Backend recheck booking tốt; lookup masked |
| Auth | `/api/auth/[...nextauth]` | Credentials, shared DB limiter, admin 2FA | Session policy có idle/absolute expiry; 2FA management bypass revoke |
| Admin booking | list/detail/calendar/transition/reassign/notes | auth + permission | Có branch-scope IDOR |
| Admin contact | list/detail/status/notes | auth + permission | Không có branch model; quyền cần business quyết định |
| Admin ops | dashboard/outbox/retry/pricing/staff/media | permission + same-origin cho mutation | Dashboard global; pricing/media issues |
| Internal jobs | expire/reminder/outbox | timing-safe Bearer `CRON_SECRET`, limiter/audit | Code guard tốt; scheduler chưa chứng minh |
| Payment | `/api/payments/webhook` | HMAC, body limit, amount check | Có race; provider hiện chưa cấu hình |
| Health | `/api/health/live`, `/api/health/ready` | readiness DB + proxy config | Tốt ở code; chưa có monitoring evidence |

## C. Business rules chưa rõ

1. Staff chỉ quản lý một branch hay có lúc được xem toàn hệ thống? Manager là global hay cũng assigned branch?
2. Pending giữ phòng 15 phút là chính sách thật hay chỉ default kỹ thuật?
3. Khách có chọn chính xác room hay chỉ chọn tier để hệ thống tự gán room đầu tiên?
4. Khi pending hết hạn đúng lúc staff confirm, UX/thông báo nào là nguồn sự thật?
5. Chính sách hủy, no-show, check-in muộn, check-out và hoàn tất booking.
6. Giá weekend/holiday/special, priority và cách xử lý rule chồng lấn.
7. Làm tròn tiền theo segment hay tổng booking.
8. Tiền cọc, phụ phí, service, promotion/combo có vào `totalAmount` lúc nào.
9. Payment status có tự đổi booking status không; refund có hủy booking không.
10. Dữ liệu branch/room/menu/promotion nào đã được chủ doanh nghiệp duyệt.
11. Retention cho booking/customer/contact/audit/payment và quy trình xóa/ẩn danh.
12. Contact request có thuộc branch không; nếu không, staff nào được xem.

Rule đã xác định từ code:

- Giữ phòng: `pending`, `confirmed`, `checkedIn` (`booking-domain.ts:13-17`).
- Không giữ phòng: `completed`, `cancelled`, `rejected`, `expired`.
- Pending default: 15 phút (`server-config.ts:9-11`).
- Expiry: cron/job `expireDueBookings`; không tự chạy nếu operator không cấu hình scheduler.
- Giá booking được snapshot ở `roomAmount`, `totalAmount`, `priceSnapshot`.
- Booking qua nửa đêm được biểu diễn bằng `TIMESTAMPTZ` và pricing chia segment theo ngày.

## D. Test gap matrix

| Luồng | Unit | Component | Integration | E2E | Manual | Gap |
|---|---|---|---|---|---|---|
| Booking validation/timezone | Có | Một phần | Có nhưng chưa chạy | Không | Chưa | High |
| Concurrent booking/exclusion | Có mock | Không | Có nhưng chưa chạy | Không | Chưa | Critical |
| Idempotency booking/contact | Có | Không | Có nhưng chưa chạy | Không | Chưa | High |
| Dynamic pricing | Có | Không | Thiếu DB/concurrent rule create | Không | Chưa | High |
| Admin branch RBAC | Một phần | Không | Thiếu mutation cross-branch | Không | Chưa | Critical |
| Login/2FA/session revoke | Có | Một phần | Thiếu revoked 2FA routes | Không | Chưa | High |
| Payment webhook | Có | Không | Thiếu concurrency | Không | Chưa | Critical nếu bật |
| Outbox/jobs | Có | Không | Có nhưng chưa chạy | Không | Chưa | High |
| Public pages/content/SEO | Một phần | Rất ít | Không | Không | Chưa | High |
| Responsive 375/768/1024/desktop | Không | Không | Không | Không | Chưa | High |
| Keyboard/screen reader/contrast | Không | Rất ít | Không | Không | Chưa | High |
| DB outage/timeout/recovery | Có mapping | Không | Chưa chạy | Không | Chưa | High |
| Migration from baseline | Unit text checks | Không | Chưa chạy | N/A | Chưa | Critical |
| Backup/restore/rollback | Không | N/A | N/A | N/A | Chưa có evidence | Critical |

Coverage không được tạo; vì vậy không thể kết luận phần trăm bao phủ. 224 tests pass không chứng minh critical paths đã được cover.

## E. Danh sách biến môi trường

Không ghi giá trị secret.

| Biến/nhóm | Nơi dùng | Bắt buộc | Loại | Có `.env.example` | Validation/default |
|---|---|---|---|---|---|
| `DATABASE_URL` | Prisma/config | Yes | Secret | Yes | Runtime TLS check; verifier mạnh |
| `DATABASE_SSL_CA_BASE64/PEM/FILE` | DB TLS | Prod | Secret | Yes | Chỉ một source; parse cert trong verifier |
| `DATABASE_SSL_ALLOW_UNVERIFIED` | DB TLS | No | Private | Yes | Production bỏ qua/reject verifier |
| `DATABASE_POOL_MAX` | pg pool | No | Private | **No** | int 1..50, default 5 |
| `DATABASE_*_TIMEOUT_MS`, `DATABASE_CONNECTION_LIFETIME_SECONDS` | pg/Prisma | No | Private | **No** | bounded defaults |
| `AUTH_SECRET` | Auth/hash fallback | Yes | Secret | Yes | length check trong verifier |
| `SECURITY_EVENT_HASH_SECRET` | PII hashing | Prod | Secret | Yes | fallback AUTH/ephemeral; verifier yêu cầu |
| `TOTP_ENCRYPTION_KEY` | 2FA | Admin prod | Secret | Yes | 32-byte base64 khi dùng/verifier |
| `RECOVERY_CODE_HASH_SECRET` | 2FA recovery | Admin prod | Secret | Yes | fallback; verifier yêu cầu riêng |
| `AUTH_URL`, `AUTH_TRUST_HOST` | Auth.js | Prod | Private | Yes | verifier canonical HTTPS |
| `PRODUCTION_CANONICAL_ORIGIN` | CSRF/same-origin | Prod | Public config | Yes | verifier |
| `TRUSTED_PROXY_MODE`, `PRODUCTION_EXPECTED_PROXY_MODE` | client IP | Prod | Private | Yes | allowlist/match |
| `CRON_SECRET` | Internal jobs | If HTTP cron | Secret | Yes | timing-safe compare, length verifier |
| `BOOKING_HOLD_MINUTES` | Booking | No/business | Private | **No** | positive int, default 15 |
| `BOOKING_REMINDER_MINUTES`, `JOB_BATCH_SIZE` | Jobs | No | Private | **No** | positive/default; batch max 100 |
| `EMAIL_PROVIDER/FROM/WEBHOOK_URL/API_KEY` | Notifications | Prod if enabled | Mixed/secret | Yes | fail on provider use; verifier only warn |
| `ADMIN_NOTIFICATION_EMAIL` | Contact alerts | If alerts | Private PII | Yes | presence not centrally validated |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | Payment webhook | If enabled | Mixed/secret | Yes | both required by feature check |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Media | If media enabled | Mixed/secret | Yes | validated on use |
| `NEXT_PUBLIC_SITE_URL`, brand/contact/social/opening variables | Public pages/SEO | Prod | Public | Yes | nhiều fallback nguy hiểm; verifier chỉ check site URL/hotline |
| `TEST_DATABASE_URL`, `PRODUCTION_DATABASE_HOSTS`, `ALLOW_REMOTE_TEST_DATABASE` | Integration guard | Test only | Secret/private | Yes | strong guard |
| `ALLOW_ADMIN_BOOTSTRAP`, `BOOTSTRAP_ADMIN_*` | Bootstrap CLI | One-time | Secret/private | **No** | explicit guard; verifier đòi absent sau dùng |
| `ALLOW_DEV_ADMIN_SEED`, `ADMIN_SEED_*` | Dev seed | Dev only | Secret/private | **No** | production reject |
| `NODE_ENV`, `NEXT_PHASE` | Framework/runtime | System | Private | No | framework/runtime |

## F. Release checklist

### Phải sửa trước khi public

- [ ] PROD-001, CONTENT-001.
- [ ] AUTHZ-001/002 và AUTH-001.
- [ ] PRICING-001, DB-001, DATA-001.
- [ ] Provision DB test và chạy integration/migration suite.
- [ ] Commit/review toàn bộ production code; release từ clean SHA.
- [ ] Cung cấp nội dung/asset/brand/giá/địa chỉ đã phê duyệt.
- [ ] Backup/PITR, restore rehearsal, monitoring và alerts.
- [ ] Nếu bật payment: sửa PAYMENT-001 và hoàn tất provider sandbox evidence.

### Phải cấu hình thủ công

- [ ] HTTPS domain/canonical origin/Auth URL/trusted proxy.
- [ ] Aiven CA verify-full, least-privilege DB user, pool/timeouts.
- [ ] Auth/security/TOTP/recovery/cron secrets độc lập và rotation plan.
- [ ] Email/storage provider và scheduler cho ba jobs.
- [ ] Admin bootstrap một lần, xóa bootstrap env, bắt buộc password change + 2FA.
- [ ] Backup retention/encryption/access/alerts; external log/error tracking.

### Có thể làm sau khi public

- [ ] Comment encoding/README/root dependency cleanup.
- [ ] Nâng UX error, image polish sau khi content thật đã có.
- [ ] Customer account/payment UI chỉ sau quyết định business.

### Cần quyết định nghiệp vụ

- [ ] Branch scope staff/manager.
- [ ] Hold/cancel/no-show/check-in/check-out.
- [ ] Pricing priority/rounding/weekend/holiday/promotion/deposit.
- [ ] Payment ↔ booking state/refund.
- [ ] Privacy/retention/deletion policy.

### Không thể kiểm tra trong môi trường hiện tại

- [ ] Integration/PostgreSQL migrations vì không có DB test riêng.
- [ ] Production env verifier với secret thật.
- [ ] `npm audit`, outdated và license advisory online.
- [ ] Responsive/browser E2E vì khởi chạy app sẽ gọi managed remote DB; không được phép chạm target đó.
- [ ] Aiven backup/PITR/SSL certificate, deployment platform, DNS/HTTPS, provider email/storage/payment.
- [ ] Restore/rollback/load test và external monitoring.

## G. Kế hoạch sửa theo PR nhỏ

| PR | Phạm vi/file dự kiến | Migration | Rủi ro | Test | Phụ thuộc |
|---|---|---|---|---|---|
| PR-01 `fix/admin-branch-scope` | admin-api, admin-queries, calendar-query, admin-booking-service/routes, dashboard | No | High | cross-branch API/integration | None |
| PR-02 `fix/session-revoke-2fa` | 2FA routes, admin auth helper | No | High | revoked JWT tests | None |
| PR-03 `fix/pricing-rule-integrity` | pricing-service/route/schema validation | Có: FK + overlap strategy | High | concurrency/migration/pricing | DB test |
| PR-04 `fix/payment-webhook-serialization` | webhook, provider transition, event ledger | Có thể | High | concurrent webhook integration | DB test |
| PR-05 `unify-public-catalog` | public pages/components/sitemap/data layer | Có thể không | High content | contract/SEO/render | Approved business data |
| PR-06 `production-content-assets` | public assets, site config, seed split | Data migration có thể | Medium | link/image/content validation | Business approval |
| PR-07 `production-env-gate` | env schema, CI, README, deployment manifest | No | Medium | valid/invalid env matrix | Platform choice |
| PR-08 `ops-observability-backup` | log drain/error tracking/alerts/runbooks/evidence | No | Operational | failure injection/restore drill | Platform access |
| PR-09 `booking-quote-ux` | quote API, booking page stale-state handling | No/possible quote table | Medium | quote parity/timeout | PR-03 |
| PR-10 `privacy-legal-retention` | public policy routes, footer, approved retention job | Có thể | Legal/data | retention dry-run/integration | Legal decision |
| PR-11 `e2e-release-gates` | Playwright/a11y/coverage/CI | No | Low | critical path suite | PR-01..10 stable |
| PR-12 `repo-doc-dependency-cleanup` | README, engines/packageManager, root deps, comments | No | Low | clean install/lint/build | Last |

Ưu tiên: PR-01 → PR-02 → PR-03 → PR-04 → PR-05/06 → PR-07/08 → phần còn lại.

## Điểm tích cực đã xác minh

- Root scripts trỏ đúng app chính, không có `|| true`, `--no-verify`, TypeScript/ESLint bypass.
- Lint, typecheck, 224 tests và production build đều pass.
- Booking backend dùng idempotency key, Serializable transaction, advisory lock và PostgreSQL exclusion constraint.
- Booking status giữ phòng được tập trung trong một constant; expiry/outbox có job, retry, dead-letter và `SKIP LOCKED`.
- Public mutations có same-origin, body-size limit, validation và shared DB rate limiting.
- Login dùng dummy bcrypt hash, account/IP limit, 2FA cho admin, recovery code one-time và sessionVersion ở phần lớn admin APIs.
- Public catalog mặc định chỉ active/available và reject unknown/duplicate query, ngoại trừ lỗi branch relation nêu trên.
- Security headers, no-store admin cache, HSTS production, CSP baseline, reduced-motion và image fallback đã có.
- Logging có structured JSON và recursive key redaction; audit/security tables tồn tại.

Những điểm tốt này chưa bù được các blocker/high nêu trên.
