# Hướng dẫn Database — Prisma + PostgreSQL

## 1. Yêu cầu

- Node.js >= 18
- PostgreSQL đang chạy (local hoặc remote)

## 2. Cấu hình database

File `.env` (nằm ở `next-app/.env`):

```
DATABASE_URL="postgresql://user:password@localhost:5432/web_karaoke?schema=public"
```

Thay `user`, `password`, `localhost`, `5432` bằng thông tin PostgreSQL của bạn.

## 3. Chạy migration

Tạo (hoặc đồng bộ) schema database từ Prisma schema:

```bash
cd next-app
npx prisma migrate dev --name init
```

Lệnh này sẽ:
- So sánh schema Prisma với database hiện tại
- Tạo file migration trong thư mục `prisma/migrations/`
- Áp dụng migration vào database

> **Lần đầu chạy**: dùng `--name init` để tạo migration đầu tiên.
> **Sau này** nếu sửa schema: `npx prisma migrate dev --name mo-ta-thay-doi`

## 4. Seed dữ liệu mẫu

Sau khi migration thành công, chạy seed để nạp dữ liệu branch/room/menu:

### Cách 1 — Seed script (khuyên dùng)

```bash
cd next-app
npx prisma db seed
```

Script seed nằm ở `prisma/seeds/data.ts` và được cấu hình trong `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seeds/data.ts"
}
```

### Cách 2 — Seed qua API (nếu đang chạy dev server)

Nếu dev server đang chạy (`npm run dev`), truy cập:

```
http://localhost:3000/api/seed
```

hoặc dùng curl:

```bash
curl http://localhost:3000/api/seed
```

API này sẽ insert dữ liệu mẫu vào database.

## 5. Kiểm tra dữ liệu

Sau seed, kiểm tra qua API:

- `GET /api/branches` — danh sách chi nhánh
- `GET /api/rooms` — danh sách phòng
- `GET /api/menu-items` — danh sách menu

Hoặc dùng Prisma Studio (giao diện web xem database):

```bash
cd next-app
npx prisma studio
```

Mở `http://localhost:5555` để xem và sửa dữ liệu trực quan.

## 6. Reset database (nếu cần)

Xoá hết dữ liệu và migration, tạo lại từ đầu:

```bash
cd next-app
npx prisma migrate reset --force
```

Lệnh này sẽ:
- Xoá database hiện tại
- Tạo lại database từ schema
- Chạy seed tự động (nếu đã cấu hình)

## 7. Cập nhật schema

Khi thay đổi file `prisma/schema.prisma`:

1. Sửa schema
2. Chạy `npx prisma migrate dev --name mo-ta`
3. Chạy `npx prisma db seed` nếu cần cập nhật seed

## 8. Lưu ý

- File `.env` chứa `DATABASE_URL` — **không commit** lên git (đã có trong `.gitignore`)
- Nếu dùng local PostgreSQL, tạo database trước: `CREATE DATABASE web_karaoke;`
- Script seed dùng `tsx` (TypeScript executor), nếu chưa có: `npm install -D tsx`