# TÀI LIỆU CẤU HÌNH BẢO MẬT CLOUDFLARE PRODUCTION 2026 CHO LIFEOS
**Tác giả:** Principal Application Security Engineer & Cloudflare Solutions Architect  
**Tiêu chuẩn tuân thủ:** OWASP Top 10:2025, OWASP ASVS 5.0 Level 2, NIST SP 800-63B-4, Zero Trust Edge Architecture  

---

## 1. QUY TẮC WAF (WEB APPLICATION FIREWALL) - BIỂU THỨC WIREFILTER

Truy cập **Cloudflare Dashboard > Security > WAF > Custom Rules** và tạo các quy tắc sau:

### Quy tắc 1: Bảo vệ Endpoint Cron Jobs (Chặn kích hoạt trái phép)
* **Rule Name:** `Enforce Secret on Cron Triggers`
* **Action:** `Block`
* **Expression:**
```wirefilter
(http.request.uri.path eq "/api/cron/trigger" and not any(http.request.headers["x-cron-secret"][*] eq "CRON_SECRET_PRODUCTION_KEY"))
```
*(Thay thế `CRON_SECRET_PRODUCTION_KEY` bằng giá trị bí mật đã cấu hình trong Cloudflare Workers/Pages secrets).*

### Quy tắc 2: Chống Brute Force Đăng nhập & Đăng ký (Rate Limiting)
* **Rule Name:** `Rate Limit Auth Endpoints`
* **Vị trí:** **Security > WAF > Rate Limiting Rules**
* **Expression:**
```wirefilter
(http.request.uri.path in {"/api/auth/login" "/api/auth/register" "/api/auth/reset-password"})
```
* **Characteristics:** `IP`
* **Requests / Period:** `5 requests per 1 minute`
* **Action:** `Managed Challenge` (hoặc `Block` trong 15 phút nếu vượt quá ngưỡng)

### Quy tắc 3: Bảo vệ API Dữ liệu Tài chính (High Sensitivity Rate Limit)
* **Rule Name:** `Protect Financial Ledger API`
* **Expression:**
```wirefilter
(http.request.uri.path matches "^/api/finance/.*")
```
* **Characteristics:** `IP + Cookie "token"`
* **Requests / Period:** `30 requests per 1 minute`
* **Action:** `Managed Challenge`

### Quy tắc 4: Chống Flood WebSocket Handshake (Phòng học ảo > 100 người)
* **Rule Name:** `Rate Limit WebSocket Handshake`
* **Expression:**
```wirefilter
(http.request.uri.path eq "/socket.io/" and http.request.headers["upgrade"][*] eq "websocket")
```
* **Characteristics:** `IP`
* **Requests / Period:** `20 requests per 10 seconds`
* **Action:** `Block` (Mitigate connection exhaustion DoS)

### Quy tắc 5: Chặn Quét Lỗ Hổng & Known Malicious Payloads (OWASP Core Rule Integration)
* **Rule Name:** `Block Common Attack Vectors & Scanners`
* **Action:** `Block`
* **Expression:**
```wirefilter
(
  http.request.uri.path contains "../" or 
  http.request.uri.path contains "..%2f" or
  http.request.uri.path contains "%00" or
  http.request.uri.path contains ".env" or
  http.request.uri.path contains ".git" or
  http.request.uri.query contains "<script" or
  http.request.uri.query contains "javascript:" or
  http.request.uri.query contains "union%20select" or
  cf.threat_score gt 30
)
```

---

## 2. CHÍNH SÁCH CLOUDFLARE ZERO TRUST (CLOUDFLARE ACCESS)

Để đảm bảo nguyên tắc đặc quyền tối thiểu (Least Privilege), toàn bộ đường dẫn quản trị và báo cáo tài chính nội bộ phải đi qua cổng xác thực **Cloudflare Zero Trust Access**:

### Thiết lập Access Application:
1. Vào **Cloudflare Zero Trust Dashboard > Access > Applications > Add an application**.
2. Chọn **Self-hosted**.
3. **Application Name:** `LifeOS Production Admin & Finance Gate`
4. **Application domain:** `admin.lifeos.vn` (hoặc path `lifeos.vn/admin*`, `lifeos.vn/api/finance/export*`).
5. **Session Duration:** `4 hours`.

### Thiết lập Access Policy:
* **Rule Name:** `SuperAdmin & Financial Officers Only`
* **Action:** `Allow`
* **Include:**
  - `Emails` / `Email Domains`: Điền danh sách email quản trị viên được phê duyệt (ví dụ: `admin@lifeos.vn`, `cfo@lifeos.vn`).
* **Authentication Method:**
  - Bật **One-Time PIN (OTP)** gửi về email công vụ hoặc liên kết **Google Workspace SAML / OIDC**.
  - Bắt buộc kích hoạt **2FA (FIDO2 WebAuthn / Passkey / TOTP)** trên tài khoản Cloudflare.

---

## 3. CẤU HÌNH BOT MANAGEMENT & CLOUDFLARE TURNSTILE

1. **Tạo Turnstile Widget:**
   - Vào **Cloudflare Dashboard > Turnstile > Add site**.
   - **Site name:** `LifeOS Production Web`
   - **Domain:** `lifeos.vn`
   - **Widget Mode:** `Managed` (Cloudflare tự động điều chỉnh độ khó dựa trên rủi ro của phiên truy cập).
2. **Cập nhật Biến Môi Trường:**
   - Client-side Site Key: Thêm vào file `.env` hoặc hệ thống build: `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...`
   - Worker / Edge Secret Key: Đẩy vào Cloudflare Secret:
     ```bash
     wrangler secret put TURNSTILE_SECRET_KEY
     ```
3. **Kích hoạt Xác minh Server-side:**
   - Endpoint `/api/auth/turnstile/verify` trên Cloudflare Pages Function xác thực trực tiếp với `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

---

## 4. QUẢN LÝ BIẾN MÔI TRƯỜNG & SECRETS TRÊN CLOUDFLARE

### A. Biến Công Khai (Public Environment Variables) - Khai báo trong `wrangler.toml`:
```toml
[vars]
NODE_ENV = "production"
APP_URL = "https://lifeos.vn"
API_BACKEND_URL = "https://api.lifeos.vn"
```

### B. Biến Bí Mật (Production Secrets) - Tuyệt đối không commit vào Git:
Chạy các lệnh sau trên terminal đã đăng nhập tài khoản Cloudflare:
```bash
# 1. Mã bí mật ký xác thực JWT (tối thiểu 64 ký tự ngẫu nhiên)
wrangler secret put JWT_SECRET

# 2. Khóa xác thực Cloudflare Turnstile
wrangler secret put TURNSTILE_SECRET_KEY

# 3. Mã bí mật kích hoạt Cron Jobs tự động
wrangler secret put CRON_SECRET

# 4. Google OAuth 2.0 Client Secret
wrangler secret put GOOGLE_CLIENT_SECRET

# 5. Mật khẩu khởi tạo quản trị viên ban đầu
wrangler secret put INITIAL_ADMIN_PASSWORD
```
