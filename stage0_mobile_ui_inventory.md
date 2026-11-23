# BẢNG KIỂM KÊ 100% GIAO DIỆN & KẾ HOẠCH TỐI GIẢN MOBILE (GIAI ĐOẠN 0)
> **Vai trò:** Principal Mobile UX/UI Designer & Senior Frontend Engineer  
> **Mục tiêu:** Rà soát và tối ưu hóa 100% toàn bộ giao diện trên điện thoại (360px – 430px) theo triết lý **"Đơn giản, thoáng mắt, ít nút rườm rà, dễ bấm bằng một ngón cái"** — giữ nguyên 100% giao diện và tính năng trên Desktop (từ 1024px trở lên).  
> **Nguyên tắc:** Zero-Skip Policy — Kiểm kê đầy đủ 100% màn hình, không tóm tắt, không lược bỏ.

---

## I. BẢNG KIỂM KÊ 100% MÀN HÌNH, KHU VỰC & PHƯƠNG ÁN TỐI GIẢN (MOBILE 375PX)

| STT | Tên Trang / Khu Vực & Đường Dẫn File | Dạng Giao Diện | Hiện Trạng Rườm Rà / Dễ Vỡ Trên Mobile 375px | Đề Xuất Cắt Gọn Cho Mobile (Giữ gì, Gom gì vào nút ⋯ / Bottom Sheet, Thu gọn gì) |
|---|---|---|---|---|
| 1 | **Khung Điều Hướng Tổng, Header & Bottom Bar**<br/>`src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`, `src/components/BottomNav.tsx`, `src/components/CommandCenter.tsx` | Dạng 1 – Thanh điều hướng & Menu tổng | - TopBar trên mobile có quá nhiều nút (Logo, Chuỗi kỷ luật Flame, Nút đổi Theme, Chuông thông báo, Avatar profile) gây chật chội trên 375px.<br/>- Sidebar dạng off-canvas trượt ngang với 20+ danh mục gây ngợp mắt.<br/>- BottomNav chứa menu popover nhỏ dễ bấm lệch, chưa tối ưu cho ngón cái.<br/>- Các thanh dính đáy dùng `h-screen` dễ bị thanh địa chỉ trình duyệt Safari/Chrome che mất nút. | - **Giữ nổi bật:** TopBar mobile chỉ giữ Logo + Chuông thông báo + Avatar chạm mở hồ sơ nhanh. BottomNav giữ cố định 4 tab thường dùng nhất: `Học tập`, `Lịch & Việc`, `Cộng đồng`, `Tài chính` + 1 tab `Menu ⋯`.<br/>- **Gom vào Bottom Sheet:** Bấm tab `Menu ⋯` sẽ trượt bảng **Bottom Sheet Menu Toàn Diện** từ đáy lên (dạng lưới icon to 44px dễ bấm bằng ngón cái, phân nhóm rõ ràng) thay cho Sidebar trượt ngang.<br/>- **Thu gọn bớt:** Nút đổi theme, phím tắt Zen Focus, chỉ số phụ đưa gọn vào Menu Bottom Sheet. Thay toàn bộ `h-screen` thành `100dvh` và thêm khoảng đệm an toàn `pb-[env(safe-area-inset-bottom)]`. |
| 2 | **Bảng Điều Khiển Tổng Quan (Dashboard)**<br/>`src/components/DashboardView.tsx`, `src/components/dashboard/LifeHarmonyBento.tsx`, `src/components/dashboard/LifeHarmonyDetailModal.tsx` | Dạng 3 – Trang tổng quan, Thống kê, Biểu đồ | - Lưới Bento Grid nhiều cột (`grid-cols-2`, `grid-cols-3`) làm nát tỷ lệ trên 375px.<br/>- Hơn 100+ hiệu ứng `hover:` chỉ chạy khi rê chuột máy tính, trên điện thoại chạm vào dễ bị kẹt trạng thái hover.<br/>- Các widget số liệu nhỏ chen chúc khiến ngón cái khó thao tác. | - **Giữ nổi bật:** 1 thẻ chào mừng tinh gọn + Thanh tiến độ chuỗi ngày (Streak) + 1 thẻ Trọng tâm hôm nay (Nhiệm vụ số 1 cần làm).<br/>- **Gom vào Bottom Sheet:** Nút `Chi tiết chỉ số` mở Bottom Sheet phân tích hài hòa cuộc sống (Life Harmony); Cửa hàng năng lượng Focus Shop mở dạng trượt từ dưới lên.<br/>- **Thu gọn bớt:** Chuyển toàn bộ Bento Grid sang dạng thẻ đơn 1 cột dọc (`flex flex-col gap-3.5`). Bỏ hover, chuyển sang hiệu ứng tap active 98% nhẹ nhàng. |
| 3 | **Lịch Biểu & Quản Lý Công Việc (Schedule & Tasks)**<br/>`src/components/ScheduleAndTasksView.tsx`, `src/components/tasks/TaskListView.tsx` | Dạng 2 – Bảng dữ liệu, Lịch biểu, Thời khóa biểu nhiều cột | - Bảng lịch dạng tháng 7 cột gây tràn ngang hoặc ô ngày bị co lại dưới 30px không thể đọc chữ.<br/>- Danh sách nhiệm vụ có quá nhiều nút hành động trên mỗi dòng (gắn cờ, sửa, đổi hạn, xóa, gán dự án) gây rối mắt.<br/>- Thanh bộ lọc (Trạng thái, Ưu tiên, Thẻ tag, Dự án) dàn hàng ngang chiếm nửa màn hình. | - **Giữ nổi bật:** Thanh chọn ngày dạng dải trượt ngang 7 ngày gần nhất (Week Strip) + Danh sách thẻ công việc dọc 1 cột + Nút tròn Thêm Nhanh (+) to 52px ở góc dưới ngón cái.<br/>- **Gom vào Bottom Sheet:** Nút `Lọc & Sắp xếp` mở Bottom Sheet chọn trạng thái/ưu tiên; Chạm vào nút `⋯` trên từng task để Sửa/Xóa/Đổi ngày.<br/>- **Thu gọn bớt:** Chế độ xem Lịch tháng (Calendar Month) trên mobile chuyển sang dạng danh sách Agenda theo dòng thời gian (Timeline List), không ép 7 cột trên 375px. |
| 4 | **Quản Lý Tài Chính & Ngân Sách (Finance)**<br/>`src/components/FinanceView.tsx`, `src/components/finance/AccountModal.tsx`, `src/components/finance/TransactionModal.tsx` | Dạng 3 – Trang tổng quan, Thống kê, Biểu đồ | - Bảng kê giao dịch nhiều cột (Ngày, Mô tả, Danh mục, Tài khoản, Số tiền, Thao tác) gây tràn ngang hoặc ép chữ xuống dòng.<br/>- Biểu đồ tròn và biểu đồ cột chiếm diện tích lớn, đẩy các giao dịch mới xuống sâu.<br/>- Các modal thêm giao dịch trên mobile bị chật, bàn phím ảo che mất nút Lưu. | - **Giữ nổi bật:** Thẻ Tổng số dư to rõ + 2 nút bấm lớn tiện ngón cái: `+ Thu nhập` và `- Chi tiêu` + Danh sách 5 giao dịch gần nhất dạng thẻ dọc 1 cột.<br/>- **Gom vào Bottom Sheet:** Modal thêm giao dịch đổi sang Bottom Sheet trượt từ đáy (chiếm 85% chiều cao, nút Lưu dính đáy phía trên bàn phím ảo); Xem chi tiết tài khoản/khoản nợ qua Bottom Sheet.<br/>- **Thu gọn bớt:** Biểu đồ tài chính đưa vào tab con `Báo cáo` hoặc dạng Accordion thu gọn mặc định, mở ra khi cần. |
| 5 | **Phòng Tập Trung Cá Nhân & Nhạc Focus (Focus & Zen)**<br/>`src/components/FocusView.tsx`, `src/components/focus/ZenFocusOverlay.tsx`, `src/components/focus/GlobalFocusMusicPlayer.tsx` | Dạng 5 – Không gian tương tác trực tiếp / Tập trung | - Đồng hồ Pomodoro, danh sách nhạc lofi, thanh điều chỉnh âm lượng thiên nhiên và mục tiêu học chen chúc trong một màn hình.<br/>- Trình phát nhạc toàn cầu (GlobalFocusMusicPlayer) nổi ở góc dưới có thể che mất các nút quan trọng của trang.<br/>- Chữ số trên 375px có thể tràn lề nếu cài đặt font quá lớn. | - **Giữ nổi bật:** Đồng hồ đếm ngược Pomodoro cực đại ở trung tâm + 2 nút điều khiển lớn tối giản (`Bắt đầu / Tạm dừng` và `Bỏ qua`).<br/>- **Gom vào Bottom Sheet:** Nút `Nhạc Focus & Âm thanh thiên nhiên` mở Bottom Sheet chọn bài hát / chỉnh volume; Nút `Cài đặt Pomodoro` (đổi phút học/nghỉ) mở Bottom Sheet.<br/>- **Thu gọn bớt:** Ẩn toàn bộ thanh công cụ rườm rà khi phiên tập trung đang chạy (Zen Mode tự động), chạm nhẹ vào màn hình mới hiện nút điều khiển. |
| 6 | **Quản Lý Dự Án & Tiến Độ (Projects)**<br/>`src/components/ProjectsView.tsx`, `src/components/projects/ProjectDetailView.tsx` | Dạng 4 – Danh sách có nhiều nút công cụ, tìm kiếm & bộ lọc | - Bảng Kanban 4-5 cột (To Do, In Progress, Review, Done) trên mobile bắt buộc phải cuộn ngang liên tục rất mỏi tay và dễ bấm nhầm.<br/>- Các nhãn tiến độ, avatar thành viên và ngày hạn chen chúc. | - **Giữ nổi bật:** Thanh Tab chuyển đổi trạng thái cột (`Chờ làm` | `Đang làm` | `Hoàn thành`) hiển thị 1 cột duy nhất tại một thời điểm + Thẻ dự án dọc thoáng mắt.<br/>- **Gom vào Bottom Sheet:** Nút `Lọc dự án` và `Thêm dự án mới` mở Bottom Sheet; Nút `⋯` trên từng thẻ dự án để sửa thông tin/xóa.<br/>- **Thu gọn bớt:** Lược bỏ các thanh trạng thái phụ, chỉ hiện thanh tiến độ % ngắn gọn và số lượng việc đã xong (VD: `8/12 việc`). |
| 7 | **Trung Tâm Học Tập & Từ Vựng (Study & Vocab Master)**<br/>`src/components/StudyView.tsx`, `src/components/vocab/ChineseVocabMasterView.tsx`, `src/components/vocab/GenZVocabStudyModal.tsx` | Dạng 4 – Danh sách có nhiều nút công cụ, tìm kiếm & bộ lọc | - Màn hình học từ vựng có nhiều nút chọn bộ từ, chế độ flashcard, phát âm, viết chữ Hán, dịch nghĩa chồng chéo nhau.<br/>- Các modal ôn tập từ vựng bị co hẹp hai bên, phím bấm lật thẻ nhỏ. | - **Giữ nổi bật:** Thẻ Flashcard to rõ ở trung tâm (vuốt hoặc chạm một ngón cái để lật) + 2 nút đánh giá lớn ở đáy: `Chưa nhớ` (đỏ) & `Đã thuộc` (xanh).<br/>- **Gom vào Bottom Sheet:** Danh sách chọn bộ từ vựng, cài đặt âm thanh, và tra cứu từ điển đưa vào Bottom Sheet trượt từ đáy.<br/>- **Thu gọn bớt:** Ẩn các thông số thuật toán SRS (Spaced Repetition) phức tạp, chỉ hiển thị số từ cần ôn hôm nay (VD: `Cần ôn: 15 từ`). |
| 8 | **Phòng Học Chung Trực Tuyến 100+ Người (Study Space & Meet)**<br/>`src/components/study/StudySpaceView.tsx`, `src/components/study-space/LayoutSettingsModal.tsx`, `src/components/study-space/RoomSettingsModal.tsx` | Dạng 5 – Không gian tương tác trực tiếp / Phòng đông người | - Chế độ lưới 16-49 ô thành viên của Google Meet trên máy tính sẽ làm nát màn hình điện thoại (ô quá bé không thấy mặt/avatar).<br/>- Thanh điều khiển đáy có quá nhiều nút: Mic, Cam, Giơ tay, Đổi bố cục, Chat, Cài đặt phòng, Rời phòng.<br/>- Khung chat mở cạnh bên ép khung video lại còn 150px. | - **Giữ nổi bật:** Chế độ Auto trên mobile tự động giới hạn tối đa **4–6 ô thành viên** đại diện (kèm ô `+X người khác`) + Đồng hồ Pomodoro chung ở trên đầu.<br/>- **Giữ thanh điều khiển đáy tối đa 4 nút:** `Mic/Cam`, `Giơ tay`, `Chat`, và `Nút đỏ Rời phòng`.<br/>- **Gom vào Bottom Sheet:** Khung Chat, Đổi bố cục, Danh sách thành viên, Cài đặt phòng (chủ phòng) đều mở dạng Bottom Sheet trượt từ đáy lên che 80% màn hình, đóng lại bằng 1 chạm vuốt xuống. |
| 9 | **Lớp Học Trực Tuyến & Google Calendar (Classroom)**<br/>`src/components/classroom/OnlineClassroomView.tsx`, `src/components/study/AssignmentModal.tsx`, `src/components/study/ExamModal.tsx` | Dạng 5 – Không gian tương tác trực tiếp / Lớp học | - Danh sách lớp học hiển thị dạng bảng nhiều thông tin: Giảng viên, Giờ học, Link Google Meet, Bài tập, Thi cử.<br/>- Các nút tham gia và đồng bộ lịch dàn trải làm vỡ lề. | - **Giữ nổi bật:** Thẻ lớp học sắp diễn ra gần nhất nổi bật trên cùng + Nút lớn `Vào Lớp Ngay` (chạm 1 chạm mở Meet).<br/>- **Gom vào Bottom Sheet:** Danh sách bài tập về nhà, lịch thi cử, và cấu hình đồng bộ Google Calendar mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Chuyển danh sách các lớp học thành danh sách thẻ dọc 1 cột có badge trạng thái (Đang diễn ra, Sắp tới, Đã kết thúc). |
| 10 | **Mạng Xã Hội, Bảng Tin & Trò Chuyện (Connect & Feed)**<br/>`src/components/connect/LifeOsConnectView.tsx`, `src/components/GlobalChatWidget.tsx` | Dạng 5 – Bảng tin, Chat, Mạng xã hội | - Bố cục 3 cột (Menu cộng đồng trái - Bảng tin giữa - Bạn bè/tin nhắn phải) trên máy tính không thể hiển thị trên mobile.<br/>- Ô nhập tin nhắn dính đáy dễ bị bàn phím ảo che mất.<br/>- Nút tương tác bài viết (Thích, Bình luận, Tiếp lửa, Chia sẻ) quá sát nhau. | - **Giữ nổi bật:** 1 cột bảng tin chính giữa (Feed) cuộn mượt mà + Thanh tạo bài viết nhanh ở trên đầu.<br/>- **Gom vào Bottom Sheet:** Bấm `Bình luận` mở Bottom Sheet bình luận có khung nhập cố định nổi trên bàn phím ảo (`safe-area`); Bấm `Cộng đồng` hoặc `Tin nhắn trực tiếp` chuyển tab mượt mà.<br/>- **Thu gọn bớt:** Nút tương tác cách nhau tối thiểu 12px, vùng bấm tối thiểu 44px để không bao giờ bấm nhầm. |
| 11 | **Mục Tiêu Cuộc Đời & OKRs (Goals)**<br/>`src/components/GoalsView.tsx` | Dạng 4 – Danh sách có nhiều nút công cụ & Tiến độ | - Bảng ma trận mục tiêu (Mục tiêu lớn, Cột mốc Milestones, Hành động Actions) lồng nhau nhiều cấp gây tràn màn hình.<br/>- Có bảng table và các nút chỉnh sửa nhỏ. | - **Giữ nổi bật:** Danh sách mục tiêu dạng thẻ dọc hiển thị tên mục tiêu, thanh tiến độ % và hạn chót.<br/>- **Gom vào Bottom Sheet:** Chạm vào thẻ để mở Bottom Sheet xem danh sách Cột mốc & Hành động cần làm; Nút `Thêm mục tiêu mới` mở Bottom Sheet nhập liệu.<br/>- **Thu gọn bớt:** Thay thế bảng table bằng danh sách thẻ dọc có thể gập/mở (Accordion). |
| 12 | **Sổ Tay & Quản Trị Tri Thức (Notes & Knowledge)**<br/>`src/components/NotesView.tsx` | Dạng 4 – Danh sách thẻ & Trình soạn thảo văn bản | - Giao diện chia 2 cột: Cột danh sách ghi chú bên trái và Khung soạn thảo Markdown bên phải.<br/>- Trên 375px, hai cột bị ép méo mó hoặc thanh công cụ soạn thảo có 15+ nút icon tràn lề. | - **Giữ nổi bật:** Chế độ xem phân trang thông minh: Khi duyệt xem -> Chỉ hiện danh sách ghi chú 1 cột thoáng mắt; Khi bấm vào 1 ghi chú -> Chuyển sang chế độ Toàn Màn Hình soạn thảo với nút `← Quay lại` to rõ.<br/>- **Gom vào Bottom Sheet:** Thanh công cụ định dạng nâng cao (Bảng, Code block, Quote) đưa vào nút `Tùy chọn soạn thảo ⋯` mở Bottom Sheet.<br/>- **Thu gọn bớt:** Chỉ giữ 4 nút định dạng cơ bản trên bàn phím: Đậm, Nghiêng, Gạch đầu dòng, Đính kèm ảnh. |
| 13 | **Theo Dõi Thói Quen & Chuỗi Kỷ Luật (Habits & Streaks)**<br/>`src/components/HabitsView.tsx` | Dạng 2 – Bảng dữ liệu ma trận thói quen theo tuần/tháng | - Ma trận điểm danh thói quen theo cả tháng (30 cột ngày) hoặc tuần (7 cột) làm vỡ layout ngang trên điện thoại.<br/>- Các nút bấm check-in ngày nhỏ dưới 24px khiến ngón cái khó bấm trúng. | - **Giữ nổi bật:** Danh sách thói quen hôm nay dạng thẻ dọc 1 cột kèm nút Check-in cực đại (To 48px, chạm 1 chạm để hoàn thành kèm hiệu ứng âm thanh).<br/>- **Gom vào Bottom Sheet:** Xem lịch sử chuỗi ngày (Heatmap/Streak) và cài đặt thói quen mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Không hiển thị bảng 30 ngày trên mobile; chỉ hiển thị 5 ngày gần nhất dạng chấm tròn trượt ngang nếu cần đối chiếu. |
| 14 | **Hành Trình RPG & Đấu Trùm (Journey & Gamification)**<br/>`src/components/JourneyView.tsx`, `src/components/journey/MonsterCombatModal.tsx`, `src/components/journey/RPGSkillTreeModal.tsx` | Dạng 3 – Thống kê, Bảng thành tích & Game hóa | - Cây kỹ năng (Skill Tree) nhiều nhánh và sàn đấu quái vật (Combat Arena) có nhiều hiệu ứng đồ họa, thanh máu, nút kỹ năng bị tràn khung.<br/>- Chữ số chỉ số nhân vật nhỏ dưới 11px. | - **Giữ nổi bật:** Thẻ nhân vật chính (Avatar Hero, Level, Thanh kinh nghiệm XP) + Nút lớn `Chiến Đấu Quái Vật Hôm Nay`.<br/>- **Gom vào Bottom Sheet:** Sổ tay kỹ năng (Skill Tree), Kho đồ trang bị (Inventory), và Bảng xếp hạng tuần mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Đơn giản hóa sàn đấu quái vật thành dạng thẻ đối kháng dọc (Quái vật ở trên, Nhân vật ở dưới, 3 nút kỹ năng to ở đáy). |
| 15 | **Tiếp Thị Liên Kết & Hoa Hồng (Affiliate & Referral)**<br/>`src/components/ReferralView.tsx` | Dạng 3 – Thống kê thu nhập, Bảng số liệu & Chia sẻ link | - Bảng lịch sử hoa hồng và yêu cầu rút tiền hiển thị dạng `<table>` nhiều cột gây tràn ngang.<br/>- Ô sao chép link giới thiệu dài khó bấm copy. | - **Giữ nổi bật:** Thẻ Tổng hoa hồng khả dụng + Nút bấm lớn `Sao chép Link Giới thiệu` (1 chạm copy ngay) + Nút `Yêu cầu rút tiền`.<br/>- **Gom vào Bottom Sheet:** Form nhập tài khoản ngân hàng rút tiền mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Chuyển bảng lịch sử giao dịch nhiều cột thành danh sách thẻ dọc: Tên người mua, Ngày, Số tiền nhận được. |
| 16 | **Ma Trận Quyết Định Thông Minh (Decision Engine)**<br/>`src/components/DecisionEngineView.tsx` | Dạng 6 – Biểu mẫu nhập tiêu chí & Bảng so sánh điểm số | - Bảng ma trận so sánh các phương án và tiêu chí (Criteria Matrix) có dạng bảng 2 chiều rất khó thao tác trên 375px.<br/>- Các ô input chấm điểm bị co dúm. | - **Giữ nổi bật:** Thẻ so sánh phương án theo dạng từng bước (Step-by-step Wizard): Bước 1 Nhập phương án -> Bước 2 Đánh giá tiêu chí -> Bước 3 Kết quả xếp hạng.<br/>- **Gom vào Bottom Sheet:** Quản lý danh sách tiêu chí và trọng số đưa vào Bottom Sheet.<br/>- **Thu gọn bớt:** Hiển thị kết quả bằng thanh xếp hạng trực quan (Phương án 1 đoạt Quán quân với điểm số cao nhất) thay cho bảng ma trận rườm rà. |
| 17 | **Động Cơ Tự Động Hóa Tác Vụ (Automation Engine)**<br/>`src/components/AutomationEngineView.tsx` | Dạng 6 – Cấu hình quy tắc Nếu-Thì (Trigger-Action) | - Khối cấu hình Nếu (Trigger) - Thì (Action) với nhiều dropdown lựa chọn điều kiện và tham số làm rối mắt người dùng di động.<br/>- Nút gạt bật/tắt (Toggle) nhỏ. | - **Giữ nổi bật:** Danh sách các quy tắc tự động hóa đang chạy dạng thẻ dọc 1 cột với nút gạt bật/tắt to rõ (44px) + Nút tròn (+) thêm quy tắc mới ở đáy.<br/>- **Gom vào Bottom Sheet:** Trình tạo quy tắc tự động mới mở toàn màn hình hoặc Bottom Sheet 90% chiều cao theo từng khối dễ hiểu.<br/>- **Thu gọn bớt:** Giấu các thông số JSON/webhook nâng cao vào nút `Cài đặt nâng cao ⋯`. |
| 18 | **Chợ Mẫu & Giỏ Hàng Mua Sắm (Marketplace & Cart)**<br/>`src/components/MarketplaceView.tsx`, `src/components/CartView.tsx` | Dạng 4 – Lưới sản phẩm & Giỏ hàng thanh toán | - Lưới sản phẩm 3-4 cột bị vỡ trên mobile.<br/>- Trang giỏ hàng hiển thị bảng danh sách sản phẩm kèm nút số lượng, xóa và tổng tiền bị lệch lề. | - **Giữ nổi bật:** Lưới sản phẩm 1 cột dọc (hoặc 2 cột so le dạng thẻ tối giản) + Nút Lọc danh mục trượt ngang trên đầu + Nút Giỏ hàng cố định nổi.<br/>- **Gom vào Bottom Sheet:** Chi tiết mẫu template và đánh giá mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Trang Giỏ hàng hiển thị danh sách thẻ sản phẩm dọc, nút `Thanh toán ngay` cố định to rõ ở đáy màn hình. |
| 19 | **Hồ Sơ Cá Nhân & Quản Lý Gói Dịch Vụ (Account & Billing)**<br/>`src/components/MyAccountView.tsx`, `src/components/SubscriptionManagementView.tsx`, `src/components/CheckoutView.tsx` | Dạng 6 – Biểu mẫu thông tin tài khoản & Bảng giá gói | - Trang hồ sơ có nhiều tab (Thông tin cá nhân, Bảo mật, Phiên đăng nhập, Khóa 2 lớp, Thiết bị) xếp ngang gây tràn lề.<br/>- Bảng giá gói PRO/TEAM so sánh 15+ tính năng dạng bảng nhiều cột không thể đọc trên 375px.<br/>- Bảng lịch sử đăng nhập hiển thị dạng `<table>` vỡ khung. | - **Giữ nổi bật:** Thẻ hồ sơ tóm tắt (Avatar to rõ, Tên, Gói hiện tại) + Menu điều hướng dạng danh sách dọc (List Menu) quen thuộc trên iOS/Android.<br/>- **Gom vào Bottom Sheet:** Bấm đổi mật khẩu, quản lý phiên đăng nhập mở qua Bottom Sheet.<br/>- **Thu gọn bớt:** Bảng so sánh gói chuyển thành dạng Thẻ trượt ngang (Carousel/Cards) cho từng gói (FREE, PRO, TEAM), mỗi thẻ tóm tắt 4 ưu điểm nổi bật nhất và nút `Nâng cấp ngay`. |
| 20 | **Bảng Điều Khiển Quản Trị Hệ Thống (Admin Control Panel)**<br/>`src/components/AdminView.tsx`, `src/components/AdminCustomModulesTab.tsx`, `src/components/admin/UserDetailModal.tsx` | Dạng 4 – Bảng quản trị người dùng, doanh thu & cấu hình | - Bảng người dùng, đơn hàng và nhật ký hệ thống hiển thị dạng `<table>` với 8-10 cột bị tràn ngang nghiêm trọng trên điện thoại.<br/>- Các nút hành động (Khóa, Mở, Phân quyền, Xem chi tiết) quá nhỏ. | - **Giữ nổi bật:** 1 thanh tìm kiếm người dùng nhanh + Bộ số liệu tổng quan (Tổng user, Doanh thu, Đơn mới) dạng thẻ 1 cột.<br/>- **Gom vào Bottom Sheet:** Chạm vào bất kỳ người dùng nào sẽ mở **User Detail Bottom Sheet** hiển thị đầy đủ thông tin, lịch sử và nút hành động to rõ.<br/>- **Thu gọn bớt:** Bỏ chế độ xem bảng table trên mobile, chuyển 100% sang danh sách thẻ dọc có badge phân loại (Admin, Pro, User). |
| 21 | **Module Tùy Biến Động (Dynamic Custom Modules)**<br/>`src/components/DynamicModuleView.tsx` | Dạng 4 – Bảng dữ liệu động & Biểu mẫu linh hoạt | - Bảng dữ liệu do người dùng tự tạo trường (fields) không cố định số cột, dễ bị tràn ngang và lỗi layout trên màn hình nhỏ. | - **Giữ nổi bật:** Danh sách bản ghi dạng thẻ dọc (hiển thị 2 trường dữ liệu chính đầu tiên) + Nút bấm Thêm bản ghi mới dính đáy.<br/>- **Gom vào Bottom Sheet:** Chạm vào bản ghi để mở Bottom Sheet xem/sửa toàn bộ các trường dữ liệu chi tiết.<br/>- **Thu gọn bớt:** Bộ lọc các trường động đưa vào Bottom Sheet `Lọc dữ liệu`. |
| 22 | **Không Gian 3D Đảo Nổi & Vũ Trụ (Spatial 3D & Universe)**<br/>`src/components/spatial/CyberCozyIslandSpace.tsx`, `src/components/spatial/Spatial3DUniverseView.tsx` | Dạng 5 – Không gian 3D tương tác cảm ứng | - Khung Canvas 3D nặng hiệu ứng blur và xử lý cảm ứng đa điểm có thể giật lag trên thiết bị tầm trung.<br/>- Nút thoát không gian hoặc tương tác chạm nhỏ, dễ bấm nhầm. | - **Giữ nổi bật:** Nút `Thoát không gian` to rõ ở góc trên an toàn (`safe-area-pt`) + Cụm joystick/điều hướng cảm ứng 1 ngón cái mượt mà.<br/>- **Gom vào Bottom Sheet:** Bảng thông tin các trạm đảo nổi (Station Bento) mở qua Bottom Sheet trượt từ đáy.<br/>- **Thu gọn bớt:** Tối ưu độ phân giải Canvas trên mobile (hạ pixel ratio trên màn hình điện thoại để giữ 60fps). |
| 23 | **Landing Page, Đăng Nhập, Khảo Sát & Pháp Lý (Public, Auth & Legal)**<br/>`src/components/PublicLandingView.tsx`, `src/components/LoginView.tsx`, `src/components/OnboardingView.tsx`, `src/components/legal/LegalLayout.tsx` | Dạng 6 – Trang đích giới thiệu, Form đăng nhập & Văn bản pháp lý | - Trang Landing Page có một số khối so sánh nhiều cột.<br/>- Form Đăng nhập & Đăng ký có các ô input chữ nhỏ hơn 16px dễ gây zoom tự động trên Safari iPhone.<br/>- Trang điều khoản pháp lý thiếu mục lục di động dễ cuộn mỏi tay. | - **Giữ nổi bật:** Trang Landing Page xếp 1 cột dọc rõ ràng với nút `Bắt đầu miễn phí` to 48px cố định ở đáy; Form đăng nhập các ô `input` tối thiểu `text-base` (16px) chống zoom.<br/>- **Gom vào Bottom Sheet:** Nút `Xem các điều khoản pháp lý` mở Bottom Sheet mục lục nhanh.<br/>- **Thu gọn bớt:** Thu gọn các khối giới thiệu dài thành dạng Accordion có thể mở rộng khi muốn xem chi tiết. |

---

## II. KẾ HOẠCH PHÂN CHIA LÔ THỰC HIỆN CUỐN CHIẾU (12 BATCHES + 1 BATCH AUDIT)
*Mỗi batch chỉ xử lý từ 2 đến 4 khu vực liên quan mật thiết để đảm bảo chất lượng, không làm ẩu, có dừng kiểm tra và xác nhận sau từng batch.*

### 🚀 BATCH 1: KHUNG ĐIỀU HƯỚNG TỔNG & HỆ THỐNG BOTTOM SHEET DÙNG CHUNG (BẮT BUỘC ĐẦU TIÊN)
- **Khu vực sở hữu:**
  1. `src/components/common/MobileBottomSheet.tsx` *(Xây dựng component chuẩn dùng chung cho toàn bộ app trên mobile: hỗ trợ vuốt xuống đóng, chiếm 75%-90% chiều cao, có nút đóng rõ ràng, chuẩn iOS/Android)*.
  2. `src/App.tsx` & `src/components/Sidebar.tsx` *(Tách biệt desktop/mobile, ẩn sidebar trên mobile, chuyển toàn bộ danh mục vào Mobile Menu Bottom Sheet)*.
  3. `src/components/TopBar.tsx` *(Tối giản thanh tiêu đề mobile còn Logo + Chuông + Avatar, đưa các nút phụ vào Menu)*.
  4. `src/components/BottomNav.tsx` *(Chuẩn hóa thanh đáy 4 tab chính + 1 tab Menu ⋯ mở Bottom Sheet danh mục, bấm ngón cái cực nhạy)*.
  5. `src/components/CommandCenter.tsx` *(Tối ưu khung tìm kiếm nhanh toàn cầu hiển thị toàn màn hình trên mobile với bàn phím)*.

---

### 📦 BATCH 2: TRỌNG TÂM NĂNG SUẤT (DASHBOARD, LỊCH BIỂU & CÔNG VIỆC)
- **Khu vực sở hữu:**
  1. `src/components/DashboardView.tsx` & các Bento widgets con (Chuyển Bento sang 1 cột dọc, thẻ Trọng tâm ngày to rõ, nút Chi tiết mở Bottom Sheet).
  2. `src/components/ScheduleAndTasksView.tsx` & `src/components/tasks/TaskListView.tsx` (Dải 7 ngày trượt ngang, danh sách task 1 cột, nút ⋯ trên từng task, nút tròn Thêm Nhanh dính đáy).

---

### 📦 BATCH 3: TÀI CHÍNH CÁ NHÂN & THEO DÕI THÓI QUEN (FINANCE & HABITS)
- **Khu vực sở hữu:**
  1. `src/components/FinanceView.tsx` & Finance modals (Thẻ tổng số dư, 2 nút lớn Thu/Chi, danh sách giao dịch 1 cột, modal chuyển thành Bottom Sheet).
  2. `src/components/HabitsView.tsx` (Thẻ thói quen kèm nút check-in to 48px, bỏ bảng ma trận 30 ngày trên mobile, chi tiết mở Bottom Sheet).

---

### 📦 BATCH 4: TẬP TRUNG SÂU & HỌC TẬP TỪ VỰNG (FOCUS, STUDY & VOCAB MASTER)
- **Khu vực sở hữu:**
  1. `src/components/FocusView.tsx`, `ZenFocusOverlay.tsx`, `GlobalFocusMusicPlayer.tsx` (Đồng hồ Pomodoro cực đại, 2 nút điều khiển lớn, nhạc & âm thanh thiên nhiên mở qua Bottom Sheet).
  2. `src/components/StudyView.tsx` & `src/components/vocab/ChineseVocabMasterView.tsx` (Thẻ flashcard to ở giữa, 2 nút Đã nhớ / Chưa nhớ ở đáy, chọn bộ từ vựng qua Bottom Sheet).

---

### 📦 BATCH 5: PHÒNG HỌC CHUNG TRỰC TUYẾN 100+ NGƯỜI & LỚP HỌC (STUDY SPACE & CLASSROOM)
- **Khu vực sở hữu:**
  1. `src/components/study/StudySpaceView.tsx` & modals phòng học (Giới hạn 4–6 ô video chuẩn mobile, thanh điều khiển đáy 4 nút, Chat/Thành viên/Cài đặt mở qua Bottom Sheet).
  2. `src/components/classroom/OnlineClassroomView.tsx` (Thẻ lớp học sắp tới nổi bật với nút Vào Lớp Ngay, đồng bộ lịch Google qua Bottom Sheet).

---

### 📦 BATCH 6: MẠNG XÃ HỘI, BẢNG TIN & TRÒ CHUYỆN (CONNECT, COMMUNITY & CHAT)
- **Khu vực sở hữu:**
  1. `src/components/connect/LifeOsConnectView.tsx` (Bảng tin 1 cột dọc cuộn mượt, nút tương tác to, bình luận mở Bottom Sheet có khung nhập nổi trên bàn phím ảo).
  2. `src/components/GlobalChatWidget.tsx` & `ScratchpadWidget.tsx` (Cố định an toàn không che nút, mở toàn khung dạng Bottom Sheet).

---

### 📦 BATCH 7: MỤC TIÊU CUỘC ĐỜI & QUẢN TRỊ DỰ ÁN (GOALS & PROJECTS)
- **Khu vực sở hữu:**
  1. `src/components/GoalsView.tsx` (Danh sách mục tiêu dọc 1 cột, Cột mốc & Hành động mở qua Bottom Sheet).
  2. `src/components/ProjectsView.tsx` (Tab chuyển đổi trạng thái cột 1 cột duy nhất, thẻ dự án thoáng mắt).

---

### 📦 BATCH 8: SỔ TAY TRI THỨC, ĐỘNG CƠ QUYẾT ĐỊNH & TỰ ĐỘNG HÓA (NOTES, DECISION & AUTOMATION)
- **Khu vực sở hữu:**
  1. `src/components/NotesView.tsx` (Tách 2 chế độ: Duyệt danh sách 1 cột & Soạn thảo toàn màn hình kèm nút Quay lại to).
  2. `src/components/DecisionEngineView.tsx` (Ma trận quyết định chuyển sang dạng Wizard từng bước).
  3. `src/components/AutomationEngineView.tsx` (Thẻ quy tắc dọc với nút gạt to 44px, trình tạo quy tắc mở Bottom Sheet).

---

### 📦 BATCH 9: GAME HÓA RPG, TIẾP THỊ LIÊN KẾT & CHỢ MẪU (JOURNEY, REFERRAL, MARKETPLACE & CART)
- **Khu vực sở hữu:**
  1. `src/components/JourneyView.tsx` (Thẻ Hero tóm tắt, nút Đấu trùm to, Kỹ năng/Đồ đạc mở qua Bottom Sheet).
  2. `src/components/ReferralView.tsx` (Thẻ hoa hồng, nút 1 chạm sao chép link, danh sách rút tiền 1 cột).
  3. `src/components/MarketplaceView.tsx` & `src/components/CartView.tsx` (Lưới sản phẩm 1 cột, giỏ hàng có nút Thanh toán dính đáy).

---

### 📦 BATCH 10: TÀI KHOẢN CÁ NHÂN, GÓI DỊCH VỤ & THANH TOÁN (ACCOUNT, SUBSCRIPTION & CHECKOUT)
- **Khu vực sở hữu:**
  1. `src/components/MyAccountView.tsx` (List Menu dọc chuẩn iOS/Android, đổi mật khẩu/bảo mật qua Bottom Sheet).
  2. `src/components/SubscriptionManagementView.tsx` (Thẻ giá gói trượt ngang dạng Carousel, tóm tắt 4 ưu điểm nổi bật).
  3. `src/components/CheckoutView.tsx` (Mã QR MoMo/Bank to rõ ở trung tâm, nút Đã chuyển khoản to ở đáy).

---

### 📦 BATCH 11: QUẢN TRỊ HỆ THỐNG, MODULE TÙY BIẾN & KHÔNG GIAN 3D (ADMIN, CUSTOM MODULES & SPATIAL)
- **Khu vực sở hữu:**
  1. `src/components/AdminView.tsx` (Bỏ table, chuyển sang danh sách thẻ dọc kèm nút User Detail mở Bottom Sheet).
  2. `src/components/DynamicModuleView.tsx` (Dữ liệu động chuyển sang thẻ 1 cột, thêm/sửa qua Bottom Sheet).
  3. `src/components/spatial/CyberCozyIslandSpace.tsx` & `Spatial3DUniverseView.tsx` (Tối ưu canvas 60fps, nút thoát an toàn ở safe-area).

---

### 📦 BATCH 12: TRANG GIỚI THIỆU, ĐĂNG NHẬP, KHẢO SÁT & PHÁP LÝ (PUBLIC LANDING, AUTH, ONBOARDING & LEGAL)
- **Khu vực sở hữu:**
  1. `src/components/PublicLandingView.tsx` (Khối giới thiệu 1 cột dọc, nút Bắt đầu miễn phí dính đáy).
  2. `src/components/LoginView.tsx` & `OnboardingView.tsx` (Input chuẩn 16px chống tự zoom trên iPhone, nút bấm to).
  3. `src/components/legal/LegalLayout.tsx` & 4 trang chính sách (Mục lục điều khoản mở qua Bottom Sheet).

---

### 🏁 BATCH CUỐI: AUDIT AUTOMATION & TỔNG KIỂM TRA TOÀN DIỆN
- **Khu vực sở hữu:**
  1. Xây dựng script `scripts/audit/mobile-ux-check.js` quét tự động 100% file mã nguồn:
     - Không còn `h-screen` thiếu `dvh`.
     - Không còn tương tác ẩn sau `hover:` trên mobile.
     - Không còn `input/select/textarea` có font < 16px.
     - Không còn width cứng vượt 360px gây tràn ngang.
  2. Chạy kiểm thử tự động, dọn dẹp sạch sẽ 100% cảnh báo.

---

## III. ĐIỂM DỪNG BẮT BUỘC (CHECKPOINT GIAI ĐOẠN 0)

Bản kiểm kê 100% giao diện đã hoàn tất với đầy đủ:
- **23 Phân vùng giao diện lớn** bao quát **100% ứng dụng**.
- **Phân loại chính xác theo 6 Dạng giao diện chuẩn**.
- **Chỉ rõ hiện trạng rườm rà / lỗi vỡ trên màn hình 375px** của từng màn hình.
- **Đề xuất cắt gọn cụ thể:** Cái gì giữ nổi bật, cái gì gom vào nút ⋯ / Bottom Sheet, cái gì thu gọn.
- **Kế hoạch chia 12 Batches thực thi cuốn chiếu + 1 Batch kiểm thử tự động**.

> [!IMPORTANT]
> **Hội đồng thiết kế & kỹ thuật DỪNG LẠI TẠI ĐÂY** để bạn kiểm tra và duyệt bản kế hoạch Giai đoạn 0.  
> Ngay khi bạn gửi xác nhận (ví dụ: *"Xác nhận"* hoặc *"Bắt đầu Batch 1"*), chúng tôi sẽ lập tức tiến hành thi công **BATCH 1: KHUNG ĐIỀU HƯỚNG TỔNG & HỆ THỐNG BOTTOM SHEET DÙNG CHUNG**.
