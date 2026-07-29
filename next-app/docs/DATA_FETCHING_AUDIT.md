# Audit data fetching và trạng thái UI

## Page/component có data fetching

- `src/app/booking/page.tsx`: fetch `/api/branches`, `/api/rooms`, `/api/menu-items` khi mở trang; fetch `/api/availability` khi thay đổi branch/ngày/giờ/thời lượng/số khách/hạng phòng; POST `/api/bookings` khi submit.
- `src/app/booking/lookup/page.tsx`: GET `/api/booking/lookup` khi tra cứu.
- `src/app/contact/page.tsx`: POST `/api/contact` khi submit.
- `src/app/admin/**`: các màn hình quản trị fetch API admin; được cô lập bởi admin layout và không xuất hiện trong sitemap.
- Các trang public catalog (`branches`, `rooms`, `menu`, `gallery`, `promotions`) hiện render từ data/config local; không có client fetch trực tiếp.

## Trạng thái đã kiểm tra

- Global `loading.tsx` và `error.tsx` tránh trắng trang, có thông báo thân thiện và nút thử lại.
- Booking có loading catalog, empty state, lỗi offline, retry availability/catalog, partial UI khi menu không có dữ liệu, field error và submit error.
- Booking/contact disable submit trong lúc gửi, có submission lock và idempotency key.
- Lỗi được quy về validation, conflict, rate limit, dependency unavailable hoặc lỗi tạm thời; không hiển thị message kỹ thuật.
- Lookup đã có loading/empty/error và disable submit.

## Performance audit nhanh

- Framer Motion đang được dùng ở hero và các section/filter; các animation đơn giản có thể tiếp tục chạy qua CSS khi refactor tiếp theo.
- Mobile giảm backdrop blur xuống 6px và tôn trọng `prefers-reduced-motion`.
- Ảnh catalog dùng `SafeImage`/`next/image` với `sizes`; không xóa dependency trước khi bundle profiling thực tế.
