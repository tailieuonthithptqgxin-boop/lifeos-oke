# QUY TRÌNH KIỂM TOÁN PHÁP LÝ & WCAG TRƯỚC KHI PHÁT HÀNH BẢN CẬP NHẬT
## (LIFEOS PRE-RELEASE LEGAL & COMPLIANCE CHECKLIST)

> **Cảnh báo bắt buộc:** Bất kỳ tính năng mới nào được phát triển đều tiềm ẩn rủi ro về quyền riêng tư và pháp lý mới. Trước khi merge PR hoặc release lên production (`quanlicanhan.online`), đội ngũ phát triển và Product Owner bắt buộc phải kiểm tra và đánh dấu đủ 20 hạng mục dưới đây.

---

### NHÓM 1: 4 TRANG PHÁP LÝ BẮT BUỘC (LEGAL PAGES INTEGRITY)
- [ ] **1. Chính sách bảo mật (`/privacy-policy`):** Đường dẫn hoạt động bình thường, nội dung cập nhật đầy đủ các quyền theo Điều 9 Nghị định 13/2023/NĐ-CP và nêu rõ mục đích xử lý dữ liệu cho tính năng mới.
- [ ] **2. Điều khoản dịch vụ (`/terms-of-service`):** Khẳng định quyền sở hữu dữ liệu thuộc 100% về người dùng; giữ nguyên điều khoản miễn trừ trách nhiệm tư vấn tài chính và khuyến cáo gợi ý AI chỉ mang tính tham khảo.
- [ ] **3. Chính sách Cookie & Lưu trữ (`/cookie-policy`):** Báo cáo đầy đủ danh mục khóa mới trong HttpOnly Cookie, LocalStorage, IndexedDB hoặc Service Worker Cache nếu tính năng mới có sử dụng lưu trữ tại client.
- [ ] **4. Chính sách hoàn tiền (`/refund-policy`):** Giữ vững cam kết hoàn tiền 14 ngày không phí ẩn, quy trình tiếp nhận trong 24h và hoàn tất trong 3-5 ngày làm việc.

---

### NHÓM 2: TUÂN THỦ NGHỊ ĐỊNH 13/2023/NĐ-CP (DATA PROTECTION & PRIVACY)
- [ ] **5. Tối thiểu hóa dữ liệu (Data Minimization):** Kiểm tra `schema.prisma` và Google OAuth Scope (chỉ giữ `openid email profile`), không thu thập trường dữ liệu nhạy cảm dư thừa ngoài phạm vi tính năng.
- [ ] **6. Checkbox đồng ý riêng biệt:** Các form đăng ký / tạo tài khoản / nâng cấp bắt buộc để `defaultChecked={false}` cho điều khoản và chính sách bảo mật; khóa nút Submit nếu người dùng chưa chủ động tick chọn.
- [ ] **7. Khai báo mục đích trước khi thu thập:** Có đoạn văn giải thích lý do thu thập dữ liệu ngay tại giao diện nhập liệu (ví dụ: dữ liệu thu chi chỉ dùng cho thống kê cá nhân của chủ tài khoản).
- [ ] **8. Quyền xóa dữ liệu (Cascading Deletion):** Đảm bảo API `DELETE /api/auth/account` xóa sạch toàn bộ bản ghi liên quan trong transaction, không để lại dữ liệu mồ côi (orphaned data).
- [ ] **9. Minh bạch bên thứ 3:** Liệt kê đầy đủ mọi bên thứ ba mới tích hợp (API, cổng thanh toán, AI provider) vào bảng nhà cung cấp trong Chính sách bảo mật.

---

### NHÓM 3: BẢN QUYỀN NỘI DUNG, TUYÊN BỐ & ĐỊNH DANH ĐƠN VỊ VẬN HÀNH
- [ ] **10. Bản quyền tài nguyên (`LEGAL_ASSETS_LICENSE.md`):** Kiểm tra giấy phép mọi hình ảnh, icon, âm thanh pomodoro, avatar mascot Bé Lumi đưa vào thư mục `public/` hoặc `src/assets/`.
- [ ] **11. Không review ảo (Zero Fake Testimonials):** Tuyệt đối không hardcode đánh giá người dùng giả, không bịa đặt số liệu bình chọn của khách hàng.
- [ ] **12. Không dùng từ ngữ tuyệt đối:** Không sử dụng các từ "Số 1", "Tốt nhất Việt Nam" hoặc khẳng định tuyệt đối không có chứng nhận pháp lý.
- [ ] **13. Thông tin định danh tại Footer:** Component `LegalFooter.tsx` hiển thị đầy đủ Tên doanh nghiệp/Hộ kinh doanh, Mã số thuế, Địa chỉ trụ sở, Hotline và Email DPO đọc từ biến môi trường `.env`.

---

### NHÓM 4: CHUẨN TIẾP CẬN & TRẢI NGHIỆM NGƯỜI DÙNG (WCAG 2.1 AA)
- [ ] **14. Thuộc tính `alt` cho mọi thẻ `<img>`:** Toàn bộ ảnh đại diện, logo, mã QR ngân hàng, biểu đồ đều có mô tả văn bản rõ ràng cho trình đọc màn hình.
- [ ] **15. Độ tương phản màu chữ Dark Mode:** Màu chữ phụ trên nền đen Obsidian `#090D16` / `#0F172A` phải đạt chuẩn độ tương phản $\ge 4.5:1$ (sử dụng `text-slate-300`, `text-slate-200` thay vì `text-slate-500` mờ).
- [ ] **16. Điều hướng bàn phím (Tab Key Navigation):** Mọi ô nhập liệu, nút bấm và checkbox đều có viền sáng khi focus (`focus-visible:ring-2 focus-visible:ring-emerald-500`) và thứ tự tabIndex hợp lý.
- [ ] **17. Nút bấm CTA mô tả hành động cụ thể:** Ghi rõ nhãn hành động ("Bắt đầu Pomodoro", "Lưu giao dịch", "Xuất dữ liệu cá nhân"), không dùng "Click here", "OK".

---

### NHÓM 5: BẢO VỆ CUỐI CÙNG & KIỂM THỬ TRƯỚC KHI PUBLIC
- [ ] **18. Banner Cookie (`CookieConsentBanner`):** Chặn hoàn toàn mã theo dõi phân tích cho đến khi người dùng chủ động nhấn "Đồng ý", ghi nhớ quyết định trong `localStorage`.
- [ ] **19. Quyền xuất dữ liệu (Data Portability):** Nút và API `GET /api/auth/export-data` hoạt động ổn định, xuất file JSON chuẩn chứa toàn bộ dữ liệu người dùng.
- [ ] **20. Chạy toàn bộ Test Suite:** Thực thi `node scripts/test_auth_suite.mjs` đạt `34/34 PASS` và không có lỗi biên dịch TypeScript (`npm run build`).

---
*Ký duyệt kiểm toán bởi Chuyên gia Pháp lý Công nghệ & Trưởng nhóm Kỹ thuật LifeOS.*
