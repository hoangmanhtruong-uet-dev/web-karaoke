# Workspace cleanup plan

Ngày audit: 2026-07-29.

## Ứng dụng chính

`next-app` là ứng dụng chính:

- là app duy nhất được root Git theo dõi;
- workflow `.github/workflows/next-app-security.yml` chạy trong `next-app`;
- chứa Prisma schema, migrations, seed, API, UI và test đang hoạt động;
- các lệnh trong root `package.json` đều chuyển tiếp tới thư mục này.

Root không dùng npm workspaces. Ba cây package không được liên kết với nhau.

## Kết quả theo thư mục

### `next-app` — giữ lại

- Package riêng: có `package.json` và `package-lock.json`.
- Git history: thuộc root repository.
- Dữ liệu/database: có `data/`, `src/data/`, `prisma/schema.prisma`, seed và migrations.
- Tham chiếu: được CI, README và root scripts tham chiếu.

### `karaoke-luxury` — ứng viên archive/xóa

- Package riêng: Next.js template độc lập, có package và lockfile riêng.
- Git history: nested Git repo sạch, một commit `82c7cea` (`Initial commit from Create Next App`), không có remote.
- Dữ liệu/migration riêng: không có.
- Tham chiếu/import: không có tham chiếu từ source, package, CI hoặc app chính.
- Trạng thái hiện tại: bị root `.gitignore` loại trừ; chưa đổi tên hoặc xóa.

### `next-monorepo` — ứng viên archive/xóa

- Package riêng: Turborepo template với các workspace `apps/*`, `packages/*`, package và lockfile riêng.
- Git history: nested Git repo sạch, một commit `e42c1d6` (`feat: initial commit`), không có remote.
- Dữ liệu/migration riêng: không có.
- Tham chiếu/import: không có tham chiếu từ source, package, CI hoặc app chính.
- Trạng thái hiện tại: bị root `.gitignore` loại trừ; chưa đổi tên hoặc xóa.

## Kế hoạch an toàn

1. Tạo bundle dự phòng cho từng nested repo, hoặc push commit duy nhất lên một remote lưu trữ được phê duyệt.
2. Xác nhận không có IDE/task runner bên ngoài trỏ vào hai đường dẫn template.
3. Có thể đổi tên thành `archive-karaoke-luxury` và `archive-next-monorepo` trong một chu kỳ kiểm tra ngắn.
4. Chạy `npm run lint`, `npm run typecheck`, `npm test` và `npm run build` từ root; xác nhận CI vẫn chỉ dùng `next-app`.
5. Chỉ sau xác nhận của chủ repository mới xóa hai thư mục archive.

Với bằng chứng trong repo hiện tại, cả hai template đều có thể xóa về mặt dependency. Lý do chưa xóa ngay là mỗi thư mục vẫn chứa `.git` history độc lập chưa có remote, nên xóa sẽ làm mất bản sao duy nhất của history đó.
