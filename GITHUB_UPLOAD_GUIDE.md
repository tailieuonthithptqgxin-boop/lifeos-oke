# Hướng Dẫn Đẩy Code Lên GitHub (LifeOS)

Repository của bạn đã được dọn dẹp sạch sẽ và cấu hình `.gitignore` chuẩn.
Toàn bộ mã nguồn chỉ khoảng **350 KB** (đã loại bỏ `node_modules`, các tệp nhị phân PostgreSQL và dữ liệu tạm thời vượt giới hạn 100MB của GitHub).

---

## Cách 1: Đẩy code qua dòng lệnh Git (Khuyên dùng - Nhanh nhất)

Nếu bạn đã tạo một repository mới trên GitHub (ví dụ: `https://github.com/username/lifeos.git`):

### Bước 1: Liên kết với repository GitHub của bạn
Chạy lệnh sau (thay thế URL bằng link repository của bạn):
```bash
git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/TÊN_REPO.git
```
*(Nếu đã có remote origin từ trước, bạn có thể cập nhật bằng: `git remote set-url origin <URL>`)*

### Bước 2: Đẩy toàn bộ mã nguồn lên nhánh `main`
```bash
git branch -M main
git push -u origin main --force
```

---

## Cách 2: Tải về máy và đẩy lên GitHub bằng GitHub Desktop hoặc Git Bash

Nếu bạn đang làm việc trên máy tính cá nhân:
1. **Lưu ý quan trọng**: Tuyệt đối **KHÔNG** kéo thả trực tiếp thư mục `node_modules` hoặc `postgres_data` lên giao diện web của GitHub vì GitHub chỉ cho phép tải lên tối đa 100 tệp (trong khi `node_modules` có hơn 30.000 tệp).
2. Tệp `.gitignore` đã được cấu hình tự động bỏ qua:
   - `node_modules/`
   - `dist/`, `build/`
   - `pg_bin/`, `postgres_data/`, `pgdata_local/`
   - `.env` (bảo vệ mật khẩu bí mật)
3. Bạn chỉ cần commit các tệp mã nguồn sạch đã được chuẩn bị sẵn.

---

## Kiểm tra trạng thái hiện tại
- Nhánh hiện tại: `main`
- Trạng thái: `working tree clean` (Toàn bộ 71 tệp mã nguồn đã được commit gọn gàng).
