# CHECKPOINT DỰ ÁN (LƯU TRỮ TIẾN ĐỘ)

**Thời điểm checkpoint:** 2026-10-11 17:23 (Chiều)  
**Trạng thái Git:** Commit `c894981` ("feat: complete dynamic vocab language localization and practice methods") - **Working tree clean (100% đã commit)**.

---

## 1. CÁC NỘI DUNG ĐÃ HOÀN TẤT & ĐÃ LƯU

### A. Hệ thống 4 Phương pháp Luyện tập Vocab (Đã kiểm thử 9/9 Pass):
1. **Flashcard Chủ động (Active Recall):** 
   - Ẩn nghĩa tiếng Việt, bấm lật xem đáp án.
   - 4 nút đánh giá SM-2: Lại (Again) / Khó (Hard) / Tốt (Good) / Dễ (Easy).
   - Tự động thích ứng: `Flashcard: Trung → Việt` khi học Tiếng Trung, `Flashcard: Anh → Việt` khi học Tiếng Anh.
2. **Flashcard Đảo chiều:** 
   - Độc lập, hiện nghĩa tiếng Việt trước, nhớ lại từ ngoại ngữ. Tự động phát âm khi lật thẻ.
   - Thích ứng: `Việt → Trung` (nhớ Hán tự/Pinyin) vs `Việt → Anh`.
3. **Trắc nghiệm 4 đáp án (Quiz):** 
   - Lấy câu hỏi và 3 đáp án sai từ kho từ thực tế (10,240 từ HSK hoặc 3,522 từ Oxford).
   - Random vị trí, chống trùng lặp, bôi xanh/đỏ trực quan, tính điểm & lưu lịch sử.
4. **Luyện gõ chính tả (Spelling):** 
   - Ẩn mặt chữ, tự động phát âm Web Speech API, kiểm tra độ chính xác, bỏ qua khoảng trắng thừa và phân biệt hoa/thường hợp lý.

### B. Đồng bộ hóa đa ngôn ngữ (Tiếng Trung 🇨🇳 vs Tiếng Anh 🇬🇧):
- Toàn bộ giao diện từ Dashboard, Thiết lập phiên học (`VocabStudyTab`), Phiên học trực tiếp (`StudySessionScreen`), Lịch học hôm nay (`TodayStudyTab`), và Tháp trí nhớ (`MemoryDashboardTab`) đã chuyển đổi tự động theo `activeLang`.
- Khi chọn tiếng Trung: Toàn bộ nút hiển thị `Trung → Việt`, `Việt → Trung`, `Kho chuẩn HSK (10,240 từ)`.

### C. Backend & Database:
- Schema Prisma đã bổ sung model `VocabLearningLog` cho Spaced Repetition SM-2.
- Endpoint `/api/vocab/history` và `/api/vocab/review` hoạt động chuẩn.
- TypeScript biên dịch `tsc --noEmit` đạt 0 lỗi.
- Vite build production đã test thành công.

---

## 2. HƯỚNG DẪN KHI BẬT MÁY LÀM TIẾP (BUỔI TỐI)

1. Mở terminal tại thư mục dự án và khởi động server:
   ```bash
   npm run dev
   ```
2. Mở trình duyệt tại `http://localhost:3000` (hoặc cổng hiển thị trên console).
3. Nhấn **`Ctrl + F5`** trên trình duyệt để nạp giao diện mới nhất đã build.
