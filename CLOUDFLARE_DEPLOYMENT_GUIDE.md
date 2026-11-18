# LIFEOS — CLOUDFLARE PRODUCTION DEPLOYMENT & ARCHITECTURE GUIDE

Tài liệu hướng dẫn triển khai toàn diện LifeOS trên hạ tầng Cloudflare (Cloudflare Pages, Workers, Hyperdrive, R2, Zero Trust Tunnel).

---

## 1. TỔNG QUAN KIẾN TRÚC CLOUDFLARE

LifeOS áp dụng mô hình **Hybrid Edge + Dedicated Engine** tối ưu cho cả chi phí và hiệu năng:

```
[ Người dùng Internet / Mobile / Web ]
                 │
                 ▼
       ┌──────────────────┐
       │ Cloudflare Edge  │ ── (CDN Cache / DDoS / WAF / SSL)
       └──────────────────┘
         │              │
         │ (Assets/SPA) │ (/api/* requests)
         ▼              ▼
┌──────────────────┐  ┌───────────────────────────────────┐
│ Cloudflare Pages │  │ Cloudflare Worker (Edge Gateway)  │
│  Static Assets   │  │  - CORS & Rate Limiting           │
│  (SPA Fallback)  │  │  - Cron Triggers (1m reminders)   │
└──────────────────┘  └───────────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │ Cloudflare Tunnel / Origin  │
                 ▼                             ▼
       ┌──────────────────┐          ┌───────────────────┐
       │ PostgreSQL DB    │          │ Cloudflare R2     │
       │ (Hyperdrive Pool)│          │ (Object Storage)  │
       └──────────────────┘          └───────────────────┘
```

---

## 2. PHÂN LOẠI TƯƠNG THÍCH CÔNG NGHỆ (COMPATIBILITY MATRIX)

| Thành phần | Công nghệ hiện tại | Đánh giá Cloudflare | Giải pháp triển khai |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 6 + Tailwind v4 | `CLOUDFLARE COMPATIBLE` | Deploy lên **Cloudflare Pages / Workers Assets** với file `_routes.json`, `_redirects` (SPA 200) và `_headers` |
| **Object Storage** | S3 Client + Local FS | `CLOUDFLARE COMPATIBLE` | Đã tích hợp **Cloudflare R2** (`CloudflareR2Service`) qua S3 API & R2 Bucket binding |
| **Database** | PostgreSQL 16 + Prisma v6 | `NEEDS CONFIGURATION` | Giữ nguyên PostgreSQL để bảo toàn 50+ quan hệ phức tạp; sử dụng **Cloudflare Hyperdrive** để tăng tốc truy vấn tại Edge |
| **Authentication** | JWT + Cookie + Bcrypt | `CLOUDFLARE COMPATIBLE` | `bcryptjs` & `jsonwebtoken` 100% JS, hoạt động chuẩn xác |
| **Google OAuth** | Google OpenID / GIS | `CLOUDFLARE COMPATIBLE` | Sử dụng Web Fetch API chuẩn (`oauth2.googleapis.com`), hỗ trợ hoàn toàn |
| **Email Service** | SMTP + Resend API | `CLOUDFLARE COMPATIBLE` | Sử dụng **Resend REST API (HTTPS Cổng 443)** trong `gmailNotification.service.ts` để bypass triệt để giới hạn cổng SMTP |
| **Background Jobs** | In-process timer | `CLOUDFLARE COMPATIBLE` | Tích hợp **Cloudflare Cron Triggers** (`triggers.crons: ["* * * * *"]`) kích hoạt qua `scheduled` handler |
| **Realtime / SSE** | Server-Sent Events | `CLOUDFLARE COMPATIBLE` | Đã cấu hình `X-Accel-Buffering: no` và `Cache-Control: no-transform` để Cloudflare không buffer stream |

---

## 3. CÁC TỆP TIN CẤU HÌNH ĐÃ TẠO

1. **`wrangler.jsonc`**: Cấu hình chuẩn Cloudflare Worker, khai báo Static Assets, Cron Triggers, Environment Variables và R2 bindings.
2. **`public/_redirects`**: Định tuyến SPA Fallback (`/* /index.html 200`) tránh lỗi 404 khi người dùng tải lại trang trên các URL con.
3. **`public/_headers`**: Thiết lập chính sách bảo mật Edge (CSP, HSTS, X-Content-Type-Options) và cache bất biến 1 năm (`max-age=31536000, immutable`) cho `/assets/*`.
4. **`public/_routes.json`**: Tối ưu chi phí bằng cách chỉ định tuyến `/api/*` qua Worker, toàn bộ ảnh/js/css được phục vụ thẳng từ CDN 0ms với chi phí 0đ.
5. **`src/cloudflare/worker.ts`**: Entry point cho Cloudflare Worker xử lý Edge Routing, GeoIP headers, CORS, và Scheduled Cron.
6. **`worker-configuration.d.ts`**: TypeScript definitions tự động tạo bởi Wrangler để kiểm tra kiểu chặt chẽ.

---

## 4. QUY TRÌNH DEPLOY LÊN CLOUDFLARE (TỪNG BƯỚC)

### Bước 1: Build Frontend và kiểm tra Types
```bash
# Tạo types cho Cloudflare Worker
npm run cloudflare:types

# Kiểm tra cú pháp và dry-run deploy
npm run cloudflare:dry-run
```

### Bước 2: Thiết lập Cloudflare Secrets (Không bao giờ commit vào Git)
Đăng nhập Cloudflare bằng lệnh:
```bash
npx wrangler login
```
Thiết lập các biến bí mật:
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put DATABASE_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

### Bước 3: Tạo Bucket R2 trên Cloudflare Dashboard
1. Truy cập Cloudflare Dashboard -> **R2 Object Storage**.
2. Bấm **Create Bucket** -> Đặt tên: `lifeos-assets`.
3. Bật **Allow Public Access** hoặc gắn Custom Domain nếu muốn người dùng truy cập trực tiếp URL avatar/ảnh.

### Bước 4: Deploy Production
```bash
# Triển khai toàn bộ Frontend & Edge Worker lên Cloudflare
npm run cloudflare:deploy
```
Hoặc nếu triển khai riêng Cloudflare Pages:
```bash
npm run cloudflare:pages
```

---

## 5. HƯỚNG DẪN ROLLBACK (KHI CẦN THIẾT)

Nếu cần quay lại phiên bản trước đó:
1. **Rollback trên Cloudflare Dashboard**:
   - Truy cập **Workers & Pages** -> Chọn Worker `lifeos` -> Tab **Deployments**.
   - Tìm bản deployment hoạt động ổn định trước đó và bấm **Rollback**.
2. **Rollback qua CLI**:
   ```bash
   npx wrangler rollback [DEPLOYMENT_ID]
   ```
3. Hệ thống sẽ hoàn nguyên mã nguồn và cấu hình ngay lập tức trong vòng 1-2 giây trên toàn bộ mạng lưới CDN toàn cầu của Cloudflare.
