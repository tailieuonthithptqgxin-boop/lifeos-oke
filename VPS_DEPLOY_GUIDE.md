# Hướng Dẫn Vận Hành Thực Tế LifeOS Trên VPS

Tài liệu này hướng dẫn chi tiết cách đưa dự án **Life OS** lên máy chủ ảo (VPS) để vận hành thực tế 24/7, loại bỏ hoàn toàn chế độ demo, không phụ thuộc vào AI/Gemini, bảo mật cơ sở dữ liệu PostgreSQL và hỗ trợ nhiều người dùng.

---

## 1. Yêu Cầu Cấu Hình VPS Tối Thiểu
- **Hệ điều hành:** Ubuntu 22.04 LTS / Ubuntu 24.04 LTS hoặc Debian 11/12
- **CPU:** 1 Core trở lên (khuyên dùng 2 Cores)
- **RAM:** 2 GB trở lên (khuyên dùng 4 GB cho hiệu năng tối ưu)
- **Ổ cứng:** 20 GB SSD
- **Mở các cổng mạng (Firewall / Security Group):**
  - Cổng `22` (SSH)
  - Cổng `80` (HTTP)
  - Cổng `443` (HTTPS)

---

## 2. Chuẩn Bị Mã Nguồn Trên VPS

### Bước 2.1: Kết nối vào VPS qua SSH
```bash
ssh root@<IP_VPS_CUA_BAN>
```

### Bước 2.2: Tải mã nguồn lên VPS
Bạn có thể dùng Git clone hoặc giải nén file ZIP dự án vào thư mục `/var/www/lifeos`:
```bash
mkdir -p /var/www/lifeos
cd /var/www/lifeos

# (Sao chép hoặc giải nén toàn bộ thư mục dự án vào đây)
```

---

## 3. Cách 1: Vận Hành Tự Động Bằng Docker (Khuyên Dùng)

Dự án đã được tích hợp sẵn bộ 3 dịch vụ Docker khép kín:
1. **PostgreSQL 16:** Lưu trữ cơ sở dữ liệu an toàn, tự động mount volume `postgres_data` bền vững.
2. **LifeOS Backend & Frontend:** Đã build sẵn, tự động chạy migrate bảng dữ liệu (`npx prisma db push`) khi khởi động.
3. **Nginx Reverse Proxy:** Điều hướng cổng 80/443, nén Gzip, giới hạn tần suất request (Rate limiting chống DDoS), gắn các HTTP Security Headers.

### Lệnh triển khai duy nhất:
```bash
cd /var/www/lifeos
chmod +x deploy.sh
./deploy.sh
```

Kịch bản `deploy.sh` sẽ tự động:
- Kiểm tra và cài đặt Docker & Docker Compose nếu VPS chưa có.
- Khởi tạo file `.env` với các chuỗi bí mật `JWT_SECRET` và mật khẩu PostgreSQL ngẫu nhiên an toàn.
- Build container và kích hoạt toàn bộ dịch vụ.
- Tự động tạo tài khoản Quản trị viên SuperAdmin ban đầu:
  - **Email:** `admin@lifeos.com` (hoặc email cấu hình trong file `.env`)
  - **Mật khẩu:** Được sinh ngẫu nhiên an toàn khi chạy script và hiển thị trực tiếp trên màn hình terminal (cũng được lưu trong file `.env`)

### Quản lý dịch vụ Docker sau khi chạy:
- **Xem trạng thái:** `docker compose ps`
- **Xem log thời gian thực:** `docker compose logs -f api`
- **Khởi động lại:** `docker compose restart`
- **Dừng hệ thống:** `docker compose down`

---

## 4. Cách 2: Vận Hành Trực Tiếp Bằng Node.js + PM2 + PostgreSQL (Không Dùng Docker)

Nếu bạn muốn chạy trực tiếp trên hệ điều hành VPS mà không qua container:

### Bước 4.1: Cài đặt Node.js 20 và PostgreSQL
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential postgresql postgresql-contrib

# Cài đặt PM2 (Trình quản lý tiến trình nền)
sudo npm install -g pm2
```

### Bước 4.2: Cấu hình cơ sở dữ liệu PostgreSQL
```bash
sudo -u postgres psql
```
Trong giao diện psql, thực thi các lệnh sau:
```sql
CREATE DATABASE lifeos_db;
CREATE USER lifeos_user WITH ENCRYPTED PASSWORD 'MatKhauBaoMat123!';
GRANT ALL PRIVILEGES ON DATABASE lifeos_db TO lifeos_user;
ALTER DATABASE lifeos_db OWNER TO lifeos_user;
\q
```

### Bước 4.3: Cấu hình biến môi trường `.env`
Tạo file `.env` tại thư mục gốc `/var/www/lifeos`:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://lifeos_user:MatKhauBaoMat123!@localhost:5432/lifeos_db?schema=public"
INITIAL_ADMIN_EMAIL="admin@yourdomain.com"
INITIAL_ADMIN_PASSWORD="ThayDoiMatKhauNgauNhienManhO_Day_2026!"
```

### Bước 4.4: Build ứng dụng và khởi tạo cơ sở dữ liệu
```bash
cd /var/www/lifeos
npm install
npx prisma generate
npx prisma db push
npm run build
```

### Bước 4.5: Chạy nền với PM2
```bash
pm2 start dist/server.cjs --name "lifeos"
pm2 save
pm2 startup
```

---

## 5. Cấu Hình Tên Miền & Chứng Chỉ SSL HTTPS (Let's Encrypt Miễn Phí)

Để bảo mật tuyệt đối cho dữ liệu người dùng và đăng nhập mượt mà:

### Bước 5.1: Trỏ DNS tên miền
- Tạo bản ghi `A` trỏ từ domain của bạn (ví dụ: `app.yourdomain.com`) về địa chỉ IP của VPS.

### Bước 5.2: Cài đặt Certbot và cấp chứng chỉ SSL
Nếu chạy Nginx trên VPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com
```
Certbot sẽ tự động gia hạn SSL sau mỗi 90 ngày.

---

## 6. Sao Lưu Dữ Liệu Tự Động (PostgreSQL Backup)

Để đảm bảo không bao giờ mất dữ liệu hoạt động thực tế, bạn có thể thiết lập cronjob sao lưu hàng ngày lúc 2 giờ sáng:

```bash
# Mở crontab
crontab -e

# Dán dòng sau vào cuối file (sao lưu với Docker):
0 2 * * * docker exec lifeos_postgres pg_dump -U lifeos_user lifeos_db | gzip > /var/backups/lifeos_$(date +\%F).sql.gz

# (Hoặc sao lưu nếu không dùng Docker):
# 0 2 * * * pg_dump -U lifeos_user -d lifeos_db | gzip > /var/backups/lifeos_$(date +\%F).sql.gz
```

---

## 7. Kiểm Tra Danh Mục Tính Năng Vận Hành

| Phân hệ | Trạng thái | Ghi chú vận hành |
|---|---|---|
| **Cơ sở dữ liệu** | ✅ PostgreSQL + Prisma | Lưu trữ vĩnh viễn, phân quyền cách ly theo `userId` |
| **Xác thực & Bảo mật** | ✅ JWT + HttpOnly Cookie | Hash mật khẩu bcrypt, chống tấn công Brute-force |
| **Tài khoản SuperAdmin** | ✅ Sẵn sàng | Khởi tạo tự động từ biến môi trường `INITIAL_ADMIN_EMAIL` |
| **Không AI / Gemini** | ✅ Đã loại bỏ hoàn toàn | Không yêu cầu API Key Gemini, chạy hoàn toàn độc lập |
| **Chế độ Demo** | ✅ Đã loại bỏ | Giao diện đăng nhập thực tế, không để lộ thông tin mẫu |
| **Tự động hóa & Lập lịch** | ✅ Worker Service | Chạy nền 60s/lần quét nhắc việc, hạn chót, đồng bộ |
| **Admin Console** | ✅ Đầy đủ | Quản lý người dùng, khóa/kích hoạt, phân hạng gói, xem Audit Log, xuất CSV |

Sau khi đăng nhập lần đầu tiên với tài khoản Quản trị viên, bạn hãy vào **Cài đặt / Tài khoản** để cập nhật mật khẩu quản trị viên định kỳ nhằm bảo mật tối đa cho hệ thống.
