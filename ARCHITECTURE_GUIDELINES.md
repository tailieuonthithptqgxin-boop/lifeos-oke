# STUDY OS — SOFTWARE ENGINEERING & ARCHITECTURAL GUIDELINES

> **Tiêu chuẩn Kỹ thuật Phần mềm & Quy chuẩn Kiến trúc Hệ thống Study OS**  
> Áp dụng bắt buộc cho toàn bộ các module, tính năng mới, quy trình sửa lỗi và refactor.

---

## 1. NGUYÊN TẮC KIẾN TRÚC & PHÂN TÁCH MODULE (MODULARITY)

Mỗi chức năng lớn trong Study OS là một **module chuyên trách** độc lập, có trách nhiệm rõ ràng, khép kín và có thể kiểm thử độc lập:
* **Dashboard:** Bảng điều khiển KPI, tổng quan ngày học, nhịp sinh học.
* **Grade Forecast:** Dự báo điểm số, trọng số môn học, tính toán GPA mục tiêu.
* **Vocabulary Master:**
  * `3000 từ thông dụng` (Oxford 3000™ Core).
  * `10.000 từ tiếng Trung` (HSK 1 - HSK 7-9).
  * `Từ vựng cá nhân` (我的词汇 / Personal Words).
  * `Kiểm định ngôn ngữ` (Verification & Quality Control).
  * `Spaced Repetition Engine` (Thuật toán SM-2, đường cong quên Ebbinghaus).
  * `Active Recall Engine` (7 chế độ truy xuất trí nhớ chủ động).
* **Focus Mode & Companion:** Pomodoro, trạng thái tập trung, mascot AI Companion.
* **User Profile & Settings:** Cấu hình cá nhân, phân quyền, bảo mật.
* **Analytics & Retention:** Tracking sự kiện, thống kê streak, XP, Quest.

### Cấu trúc chuẩn của mỗi Module:
```
[module-name]/
├── components/       # Giao diện UI hiển thị & nhận tương tác (View, Modal, Card)
├── lib/              # Pure Business Logic, thuật toán, xử lý dữ liệu lõi
├── services/         # API client, database access, synchronization
├── validation/       # Schema validation, guardrails, kiểm tra dữ liệu đầu vào
├── types/            # Type definitions, interfaces, data models
└── __tests__/        # Unit tests, integration tests, regression test suites
```

---

## 2. NGUYÊN TẮC SINGLE RESPONSIBILITY (SRP)

* **Một thực thể — Một trách nhiệm:** Mỗi component, function, hook, service chỉ đảm nhận một vai trò duy nhất.
* **Tuyệt đối không tạo file "kitchen-sink":** Cấm gộp UI + API + Database + Business Logic + AI + Validation vào cùng một file.
* **Ngưỡng tách module:** Khi một file vượt quá 300-400 dòng hoặc có dấu hiệu ôm đồm nhiều trách nhiệm, chủ động bóc tách thành các submodule nhỏ trước khi viết tiếp.

---

## 3. QUY TẮC BẢO VỆ CODEBASE & TRÁNH TRÙNG LẶP (DRY)

Trước khi viết bất kỳ dòng code mới nào:
1. Quét kiểm tra cấu trúc hiện tại (`src/lib/`, `src/components/`, `src/backend/`).
2. Tái sử dụng các service/hook/engine đã có nếu phù hợp.
3. Không copy-paste logic để "làm cho nhanh".
4. Nếu phát hiện code cũ đang lộn xộn, chỉ ra nguyên nhân và đề xuất refactor nhỏ, an toàn, có test bảo vệ trước khi mở rộng.

---

## 4. QUY TRÌNH PHÂN TÍCH TRƯỚC KHI CODE (PRE-CODING PROTOCOL)

* **Tuyệt đối không code theo suy đoán:** Nếu yêu cầu còn mơ hồ hoặc có nhiều cách hiểu kỹ thuật, phân tích các phương án và hỏi lại người dùng để chốt quyết định thiết kế.
* **Checklist tính năng mới:**
  - Mục đích tính năng.
  - Module chịu trách nhiệm sở hữu.
  - Input / Output.
  - Business rules & Data model.
  - Xử lý các trạng thái: `Loading`, `Error`, `Empty`, `Success`.
  - Phân quyền & Bảo mật (Data isolation giữa các user).
  - Test cases kiểm thử.

---

## 5. QUY TRÌNH SỬA LỖI 5 BƯỚC BẮT BUỘC (MANDATORY BUG-FIXING PROTOCOL)

Khi nhận thông báo lỗi, tuyệt đối không sửa mò theo cảm tính:
1. **Bước 1 — Reproduce:** Xác định chính xác điều kiện và vị trí phát sinh lỗi.
2. **Bước 2 — Test Case:** Viết test case (Given / When / Then) tái hiện lỗi.
3. **Bước 3 — Root Cause:** Tìm nguyên nhân gốc rễ (Root Cause Analysis), không chỉ che triệu chứng.
4. **Bước 4 — Fix:** Sửa trực tiếp trong module chịu trách nhiệm. Không sửa lan sang module khác.
5. **Bước 5 — Regression Test:** Chạy lại toàn bộ test case liên quan để đảm bảo không phá vỡ tính năng cũ.

---

## 6. PHÂN TÁCH GIAO DIỆN (UI) VÀ LOGIC NGHIỆP VỤ (BUSINESS LOGIC)

* **UI Components:** Chỉ chịu trách nhiệm render trạng thái, nhận sự kiện người dùng và gọi service.
* **Business Logic:** Toàn bộ thuật toán (tính điểm GPA, SM-2 next review date, parsing Hán tự/Pinyin, kiểm tra ngữ pháp) phải nằm trong các pure functions / services thuộc `src/lib/`.
* **Khả năng thay thế:** Thay đổi giao diện UI không được ảnh hưởng đến business logic; nâng cấp thuật toán không được làm vỡ UI.

---

## 7. TIÊU CHUẨN KIỂM THỬ (TESTING IS A CORE FEATURE)

Mỗi tính năng quan trọng đều phải đi kèm test:
* **Unit Tests:** Kiểm thử các hàm tính toán, validation, parsing, thuật toán.
* **Data Isolation Tests:** Đảm bảo dữ liệu người dùng không bao giờ bị rò rỉ chéo.
* **Regression Tests:** Chạy sau mỗi lần sửa lỗi hoặc refactor.

---

## 8. QUY TRÌNH REFACTOR AN TOÀN

1. Xác định vấn đề cụ thể (code smell, vi phạm SRP, coupling cao).
2. Đánh giá phạm vi ảnh hưởng.
3. Thực hiện refactor từng bước nhỏ (Incremental Refactoring).
4. Chạy kiểm thử tự động xác minh tính nguyên vẹn.
5. Kiểm tra build sản xuất (`npx vite build && npm run build:server`).

---

## 9. QUY CHUẨN GIAO TIẾP KỸ THUẬT

Mọi phản hồi kỹ thuật tuân thủ format cô đọng, rõ ràng:
* **Vấn đề:** (Mô tả chính xác lỗi / yêu cầu).
* **Nguyên nhân gốc:** (Phân tích kỹ thuật).
* **Test Case:** (Điều kiện kiểm thử).
* **Module chịu trách nhiệm:** (File / Hàm liên quan).
* **Giải pháp & Code thay đổi:** (Diff hoặc mã cụ thể).
* **Kết quả xác minh:** (Trạng thái test & build).

---

## 10. TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE - DOD)

Một công việc chỉ được coi là hoàn thành khi:
1. [x] Code chạy thực tế không lỗi runtime / console error.
2. [x] Thuộc đúng module chịu trách nhiệm.
3. [x] Không trùng lặp code với các hàm hiện có.
4. [x] Xử lý đầy đủ các trạng thái `loading`, `error`, `empty`.
5. [x] Có test cases xác minh và vượt qua 100%.
6. [x] Không làm hỏng bất kỳ chức năng cũ nào (0 regression).
7. [x] Bản build sản xuất biên dịch thành công (`0 error`).
