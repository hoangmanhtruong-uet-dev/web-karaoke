# Production readiness checklist

Ngày kiểm tra: 2026-07-29 (Asia/Saigon)  
App phát hành: `next-app`  
Kết luận: **CHƯA production-ready**. Vẫn còn blocker/high chưa xử lý hoặc chưa có bằng chứng môi trường.

## Bằng chứng command

| Kiểm tra từ root | Kết quả |
| --- | --- |
| `npm run lint` | PASS, 0 error, 0 warning |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 52 test files / 224 tests |
| `npm run test:integration` | SKIPPED an toàn: chưa có `TEST_DATABASE_URL`; không có migration/test nào chạy trên database khác |
| Guard database test | PASS, 5 unit tests chặn sai `NODE_ENV`, thiếu URL, trùng DB, hostname production, Aiven/Render và tên không có `_test` |
| `npm run build` | PASS, Next.js 16.2.11 build 56 route/page entries |
| `npm --prefix next-app run verify:production-env` | FAIL theo thiết kế vì shell kiểm tra chưa có bộ production env hoàn chỉnh |

Môi trường chạy bằng Node.js `v26.1.0`, npm `11.13.0`, Windows/PowerShell.

## Blocker

### B1 — Integration suite chưa được chạy

- Trạng thái: chưa sửa/thiếu hạ tầng.
- Bằng chứng: `TEST_DATABASE_URL` không được cấu hình; runner không được gọi để tránh fallback hoặc chạm production.
- Ảnh hưởng: các test PostgreSQL cho login, RBAC, booking, idempotency, double-booking, availability, public filter và booking lookup đã có nhưng chưa có bằng chứng pass trên schema thật.
- Cách tái hiện/hoàn tất:
  1. Tạo PostgreSQL database riêng có tên kết thúc `_test` và role chỉ có quyền trên database đó.
  2. Đặt `TEST_DATABASE_URL` trong environment hoặc `next-app/.env.test.local`.
  3. Chạy `npm run test:integration` từ root.
  4. Lưu log migration/test; không đặt `ALLOW_REMOTE_TEST_DATABASE=true` nếu chưa review host.

### B2 — Production environment chưa xác minh

- Trạng thái: chưa sửa/thiếu cấu hình deploy.
- Bằng chứng: verifier báo FAIL cho production mode/database CA/canonical origin/public URL/hotline và các secret không được export trong shell kiểm tra.
- Ảnh hưởng: `next start` local trong production mode fail closed với `Production database TLS requires a CA certificate`; đây là hành vi bảo vệ đúng nhưng chứng minh cấu hình deploy hiện chưa sẵn sàng.
- Cách tái hiện: export bộ production env thực, sau đó chạy `npm --prefix next-app run verify:production-env`. Chỉ deploy khi `RESULT=PASS` và notification provider có bằng chứng gửi nhận.

## High

### H1 — Public media/content chưa sẵn sàng

- Trạng thái: chưa sửa vì chưa có asset/brand data thật được phê duyệt.
- Bằng chứng: 50 đường dẫn `/images/...` được tham chiếu nhưng 46 file không tồn tại; chỉ có 4 SVG placeholder. `NEXT_PUBLIC_HOTLINE` và `NEXT_PUBLIC_SITE_URL` chưa được cấu hình trong local `.env`, nên fallback hiện tại là hotline `1900 0000` và localhost.
- Ảnh hưởng: browser phải nhận 404 rồi mới fallback; gallery/room/menu/branch không có ảnh production và CTA có thể hiển thị số giả.
- Đã giảm rủi ro: production-env verifier mới từ chối localhost và hotline placeholder.
- Cách tái hiện: đối chiếu string `/images/...` trong `next-app/src`/`prisma` với `next-app/public`; mở `/`, `/rooms`, `/branches`, `/menu`, `/gallery` và theo dõi 404 ảnh.
- Trước deploy: cung cấp asset có quyền sử dụng, cập nhật URL/storage, khai báo hotline/site URL thật và chạy lại scan.

### H2 — Responsive, keyboard và end-to-end UI chưa có bằng chứng browser

- Trạng thái: chưa sửa/không thể xác minh tự động trong phiên này.
- Bằng chứng: browser automation không khởi tạo được do lỗi Windows sandbox ACL. Source có breakpoint mobile-first và lint/build pass nhưng đó không thay thế kiểm tra trực quan.
- Cách tái hiện/hoàn tất: kiểm tra `/`, `/booking`, `/booking/lookup`, `/admin/login` và các admin flow tại 375, 768, 1024 và desktop; tab qua toàn bộ control, kiểm tra focus visible, Escape/menu, label/error live region, zoom 200% và không có horizontal scroll.

### H3 — Trạng thái migration trên production chưa được đối chiếu

- Trạng thái: chưa sửa/không truy cập production theo yêu cầu an toàn.
- Bằng chứng source: có 10 migration, gồm 3 migration ngày 2026-07-29. Scan SQL không thấy lệnh active `DROP`, `TRUNCATE` hoặc `DELETE FROM`; từ “drop” duy nhất nằm trong comment rollback.
- Cách hoàn tất: backup + restore rehearsal, chạy read-only migration status bằng credential/operator được phê duyệt, review lock/downtime rồi mới `prisma migrate deploy`. Không chạy `migrate dev` hoặc reset trên production.

## Medium

### M1 — Rate limit chưa đồng nhất cho mọi mutation admin

- Auth, permission, validation và same-origin đã có trên các mutation chính; login/2FA/public booking/contact/cron có rate limit hoặc signed secret.
- Một số mutation admin dựa vào authenticated session + permission + same-origin nhưng chưa có quota riêng (booking transition/notes, contact status/notes, media, pricing, outbox retry, staff).
- Khuyến nghị: thêm quota theo actor/action cho các mutation nhạy cảm và alert khi vượt ngưỡng.

### M2 — Payment provider chưa có bằng chứng vận hành

- Webhook đã kiểm chữ ký, giới hạn 64 KiB, validate schema/amount, chặn trạng thái lùi và xử lý replay theo trạng thái.
- `PAYMENT_PROVIDER`/`PAYMENT_WEBHOOK_SECRET` để trống sẽ trả 503 có chủ đích.
- Trước khi bật payment: chạy sandbox webhook integration, duplicate/out-of-order event, refund, sai amount/signature và reconciliation.

## Low

- Root còn bốn dependency UI lịch sử nhưng root không chứa app code. Chưa gỡ để tránh thay đổi lockfile ngoài phạm vi; có thể dọn ở task riêng.
- `prisma/schema.prisma` còn comment mojibake cũ; không ảnh hưởng generated schema/runtime nhưng nên sửa để bảo trì dễ hơn.
- Node 26 đã chạy pass, nhưng CI/deploy nên pin một Node LTS được đội vận hành phê duyệt để giảm drift.

## Đã sửa trong vòng kiểm tra

- Xác định `next-app` là app chính; thêm README root, script root cross-platform, `.gitignore` và `WORKSPACE_CLEANUP_PLAN.md`.
- Không xóa/đổi tên `karaoke-luxury` hoặc `next-monorepo`; ghi rõ history/package/data/reference và kế hoạch archive.
- Thêm runner integration: guard fail-closed, `prisma migrate deploy`, fixture tối thiểu theo test, cleanup theo ID và command riêng.
- Bổ sung integration coverage cho login, RBAC, booking, idempotency, double-booking, availability, public filter và lookup.
- Sửa permission lặp, thông báo booking lỗi encoding, `any`/ESLint suppression và hai warning lint.
- Thêm same-origin cho pricing và 2FA; pricing dùng bounded JSON reader.
- Harden payment webhook chống payload lớn và event đến trễ làm lùi trạng thái.
- Production build không yêu cầu CA trong đúng `NEXT_PHASE=phase-production-build`; runtime production vẫn fail closed khi thiếu CA.
- Production-env verifier chặn canonical URL/hotline placeholder.

## Checklist trước deploy

- [x] App chính và command root rõ ràng.
- [x] Lint/typecheck/unit-component tests/build pass.
- [x] Public API dùng allow-list select và chỉ cho filter public hợp lệ.
- [x] Admin pages/API có auth; mutation chính có permission, validation và same-origin/secret phù hợp.
- [x] Security headers, no-store admin, logging redaction và migration source đã audit.
- [ ] Integration suite pass trên PostgreSQL `_test` biệt lập.
- [ ] Production environment verifier trả `RESULT=PASS`.
- [ ] 46 image reference thiếu được thay bằng asset thật; hotline/site URL thật được cấu hình.
- [ ] Responsive/keyboard/accessibility và booking/admin E2E được kiểm tra bằng browser.
- [ ] Production migration status, backup/restore và deploy window được operator xác nhận.
- [ ] Payment sandbox/reconciliation pass hoặc payment được giữ disabled rõ ràng.

Không public ứng dụng khi còn bất kỳ mục Blocker hoặc High phía trên.
