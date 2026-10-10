/**
 * LifeOS Route Knowledge
 * Maps every single view/route to its structural metadata, access level, sub-tabs, and key actions.
 */

export interface RouteMeta {
  viewId: string;
  path: string;
  displayName: string;
  moduleCategory: 'study' | 'productivity' | 'system' | 'commerce';
  description: string;
  requiredTier: 'FREE' | 'PRO' | 'TEAM' | 'ADMIN';
  defaultRole: 'STUDY_COMPANION' | 'APP_ASSISTANT';
  subTabs?: Array<{ id: string; name: string; description: string }>;
  keyActions: string[];
}

export const ROUTE_KNOWLEDGE_MAP: Record<string, RouteMeta> = {
  dashboard: {
    viewId: 'dashboard',
    path: '/dashboard',
    displayName: 'Bảng Điều Khiển Tổng Quan',
    moduleCategory: 'productivity',
    description: 'Bảng điều khiển trung tâm hiển thị tiến độ học tập, chuỗi Streak, danh sách việc cần làm hôm nay, chỉ số tài chính và các phím tắt nhanh.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['start_today_study', 'open_quick_pomodoro', 'create_quick_task', 'view_streak']
  },
  study: {
    viewId: 'study',
    path: '/study',
    displayName: 'Study OS & Vocabulary Master',
    moduleCategory: 'study',
    description: 'Hệ thống học từ vựng chuyên sâu với 3.000 từ tiếng Anh thông dụng và 10.240 từ HSK tiếng Trung kèm thuật toán Spaced Repetition (SM-2) và Active Recall.',
    requiredTier: 'FREE',
    defaultRole: 'STUDY_COMPANION',
    subTabs: [
      { id: 'dashboard', name: 'Tổng quan', description: 'Thống kê tổng số từ đã học, tỷ lệ nhớ, số từ cần ôn hôm nay và biểu đồ tiến độ.' },
      { id: 'today', name: 'Học hôm nay', description: 'Danh sách các từ mới mục tiêu và từ đến hạn ôn tập dựa theo đường cong quên lãng.' },
      { id: 'memory', name: 'Đường cong trí nhớ', description: 'Trực quan hóa cấp độ ghi nhớ từ ngắn hạn đến dài hạn theo thuật toán SM-2.' },
      { id: 'oxford3000', name: '3000 Từ thông dụng', description: 'Bộ từ vựng tiếng Anh Oxford A1-C1 có phát âm audio và ví dụ.' },
      { id: 'chineseHsk', name: 'Kho 10.000 Từ HSK', description: '10.240 từ HSK 1 đến 6 tiếng Trung gồm giản thể, phồn thể, Pinyin, nghĩa và câu ví dụ.' },
      { id: 'personal', name: 'Từ vựng cá nhân', description: 'Quản lý từ vựng tự tạo, chỉnh sửa nghĩa, phiên âm và ví dụ riêng.' },
      { id: 'collections', name: 'Bộ sưu tập', description: 'Gom nhóm các từ vựng theo chủ đề, ngành nghề hoặc kỳ thi.' },
      { id: 'study', name: 'Phiên học (Flashcard)', description: 'Chế độ lật thẻ Active Recall, trắc nghiệm và đánh giá độ nhớ 1-Lại, 2-Khó, 3-Tốt, 4-Dễ.' },
      { id: 'audit', name: 'Kiểm định dữ liệu', description: 'Kiểm tra độ chính xác Pinyin, thanh điệu, ngữ pháp câu ví dụ và đóng góp hiệu chỉnh.' }
    ],
    keyActions: ['start_review_session', 'rate_sm2_card', 'switch_vocab_tab', 'filter_hsk_level', 'verify_vocab_item']
  },
  focus: {
    viewId: 'focus',
    path: '/focus',
    displayName: 'Focus Pomodoro & Deep Work',
    moduleCategory: 'study',
    description: 'Không gian tập trung sâu với đồng hồ Pomodoro (25/5 hoặc 50/10), âm thanh môi trường thư giãn (lofi/mưa/rừng), và nhật ký ghi nhận giờ học thực tế.',
    requiredTier: 'FREE',
    defaultRole: 'STUDY_COMPANION',
    keyActions: ['start_pomodoro', 'pause_pomodoro', 'reset_pomodoro', 'change_soundscape', 'log_completed_session']
  },
  tasks: {
    viewId: 'tasks',
    path: '/tasks',
    displayName: 'Quản Lý Nhiệm Vụ (Tasks & Kanban)',
    moduleCategory: 'productivity',
    description: 'Quản lý công việc chuyên nghiệp dạng Danh sách và Bảng Kanban 4 cột, hỗ trợ đồng hồ đếm giờ trực tiếp, subtasks checklist %, và cờ cảnh báo rủi ro cao.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    subTabs: [
      { id: 'list', name: 'Dạng danh sách', description: 'Xem và sắp xếp nhiệm vụ theo hạn chót, mức độ ưu tiên và thời gian ước tính.' },
      { id: 'kanban', name: 'Bảng Kanban', description: 'Kéo thả thẻ nhiệm vụ giữa các trạng thái: Chưa làm -> Đang làm -> Đang chờ -> Hoàn thành.' }
    ],
    keyActions: ['create_task', 'toggle_task_timer', 'toggle_subtask', 'drag_kanban_card', 'filter_high_risk']
  },
  calendar: {
    viewId: 'calendar',
    path: '/calendar',
    displayName: 'Lịch Biểu & Time Blocking',
    moduleCategory: 'productivity',
    description: 'Xem lịch trình cá nhân theo Ngày, Tuần, Tháng, hỗ trợ phương pháp Time Blocking cho các phiên học tập và sự kiện quan trọng.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['create_event', 'switch_calendar_view', 'link_task_to_calendar']
  },
  finance: {
    viewId: 'finance',
    path: '/finance',
    displayName: 'Quản Lý Tài Chính (Finance)',
    moduleCategory: 'productivity',
    description: 'Ghi chép thu chi hàng ngày, thiết lập hạn mức ngân sách thông minh (cảnh báo vàng 80%, đỏ 100%), và phân tích dòng tiền theo quy tắc 50/30/20.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    subTabs: [
      { id: 'overview', name: 'Tổng quan dòng tiền', description: 'Biểu đồ thu chi tháng, số dư hiện tại và cơ cấu chi tiêu.' },
      { id: 'transactions', name: 'Lịch sử giao dịch', description: 'Danh sách các khoản thu và chi tiền, phân loại theo danh mục.' },
      { id: 'budgets', name: 'Hạn mức ngân sách', description: 'Thiết lập ngân sách trần theo từng danh mục, tự động cảnh báo khi vượt ngưỡng.' }
    ],
    keyActions: ['create_transaction', 'set_budget_limit', 'filter_finance_category']
  },
  habits: {
    viewId: 'habits',
    path: '/habits',
    displayName: 'Theo Dõi Thói Quen (Habit Tracker)',
    moduleCategory: 'study',
    description: 'Thiết lập và duy trì thói quen tích cực, theo dõi chuỗi Streak ngày liên tục, và biểu đồ ma trận nhiệt (heatmap) hoàn thành thói quen.',
    requiredTier: 'FREE',
    defaultRole: 'STUDY_COMPANION',
    keyActions: ['check_habit_today', 'create_new_habit', 'view_streak_history']
  },
  goals: {
    viewId: 'goals',
    path: '/goals',
    displayName: 'Mục Tiêu & OKRs',
    moduleCategory: 'productivity',
    description: 'Thiết lập mục tiêu dài hạn, chia nhỏ thành các kết quả then chốt (Key Results) và đo lường tiến độ tự động.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['create_goal', 'update_key_result_progress']
  },
  notes: {
    viewId: 'notes',
    path: '/notes',
    displayName: 'Ghi Chú Học Tập & Kiến Thức',
    moduleCategory: 'study',
    description: 'Soạn thảo văn bản ghi chép bài học, gắn thẻ tag, tóm tắt ý chính và tra cứu tri thức cá nhân.',
    requiredTier: 'FREE',
    defaultRole: 'STUDY_COMPANION',
    keyActions: ['create_note', 'tag_note', 'search_notes']
  },
  decision: {
    viewId: 'decision',
    path: '/decision',
    displayName: 'Ma Trận Quyết Định (Decision Engine)',
    moduleCategory: 'productivity',
    description: 'Hỗ trợ đưa ra lựa chọn lý tính bằng phương pháp chấm điểm ma trận trọng số (Weighted Scoring Matrix) giữa các phương án và tiêu chí.',
    requiredTier: 'PRO',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['create_decision_project', 'add_option', 'add_criterion', 'calculate_weighted_score']
  },
  automation: {
    viewId: 'automation',
    path: '/automation',
    displayName: 'Động Cơ Tự Động Hóa (Automation Engine)',
    moduleCategory: 'productivity',
    description: 'Hệ thống thiết lập quy tắc tự động hóa (Trigger -> Conditions -> Action) với 10 tab chuyên biệt, hỗ trợ kiểm tra xung đột và giả lập Dry-run.',
    requiredTier: 'PRO',
    defaultRole: 'APP_ASSISTANT',
    subTabs: [
      { id: 'dashboard', name: 'Tổng quan (Dashboard)', description: 'Thống kê quy tắc đang chạy, tỷ lệ chạy thành công, số tác vụ đã tiết kiệm.' },
      { id: 'rules', name: 'Danh sách quy tắc (Rules)', description: 'Xem, bật/tắt công tắc kích hoạt, chỉnh sửa hoặc xóa các quy tắc tự động.' },
      { id: 'builder', name: 'Trình tạo quy tắc (Builder)', description: 'Quy trình tạo quy tắc 5 bước chuẩn kỹ thuật: Module -> Trigger -> Điều kiện -> Hành động -> An toàn.' },
      { id: 'templates', name: 'Mẫu có sẵn (Templates)', description: 'Thư viện các kịch bản mẫu áp dụng ngay chỉ với 1 cú nhấp chuột.' },
      { id: 'approvals', name: 'Hàng đợi duyệt (Approvals)', description: 'Duyệt tay các quy tắc có mức độ nhạy cảm cao trước khi hệ thống thực thi.' },
      { id: 'simulation', name: 'Phòng giả lập (Simulation)', description: 'Chạy thử dry-run với dữ liệu giả lập để kiểm tra logic trước khi bật chính thức.' },
      { id: 'scheduled', name: 'Tác vụ định kỳ (Scheduled)', description: 'Theo dõi lịch chạy tự động theo mốc thời gian cố định.' },
      { id: 'analytics', name: 'Phân tích (Analytics)', description: 'Biểu đồ tần suất kích hoạt, thời gian phản hồi và độ tin cậy.' },
      { id: 'history', name: 'Nhật ký thực thi (History)', description: 'Audit log chi tiết từng lần chạy: thời gian, đầu vào, kết quả thành công/thất bại.' },
      { id: 'conflicts', name: 'Phát hiện xung đột (Conflicts)', description: 'Tự động phân tích cảnh báo các quy tắc có nguy cơ đối nghịch hoặc vòng lặp vô tận.' }
    ],
    keyActions: ['create_automation_rule', 'toggle_rule_active', 'run_simulation_test', 'approve_pending_action']
  },
  subscription: {
    viewId: 'subscription',
    path: '/subscription',
    displayName: 'Gói Hội Viên & Nâng Cấp',
    moduleCategory: 'commerce',
    description: 'Thông tin so sánh quyền lợi giữa các gói Free, Pro, Team và thanh toán quét mã QR VietQR / MoMo tự động.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['select_subscription_plan', 'proceed_to_checkout', 'copy_team_invite_code']
  },
  checkout: {
    viewId: 'checkout',
    path: '/checkout',
    displayName: 'Thanh Toán Đơn Hàng QR',
    moduleCategory: 'commerce',
    description: 'Màn hình hiển thị mã VietQR động kèm thông tin ngân hàng và mã thanh toán duy nhất (DUOTECH ORD_...).',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['scan_vietqr_code', 'confirm_payment_transfer', 'check_order_status']
  },
  account: {
    viewId: 'account',
    path: '/account',
    displayName: 'Tài Khoản & Cài Đặt Cá Nhân',
    moduleCategory: 'system',
    description: 'Quản lý thông tin hồ sơ cá nhân, đổi mật khẩu, cấu hình nhân vật AI Study Companion, âm thanh, chế độ yên tĩnh và sao lưu dữ liệu.',
    requiredTier: 'FREE',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['change_companion_mascot', 'toggle_quiet_mode', 'backup_export_data']
  },
  admin: {
    viewId: 'admin',
    path: '/admin',
    displayName: 'Trang Quản Trị Hệ Thống (Admin)',
    moduleCategory: 'system',
    description: 'Khu vực quản trị dành cho Admin/SuperAdmin: duyệt kích hoạt gói đăng ký thủ công, cập nhật mã QR ngân hàng nhận tiền và quản lý người dùng.',
    requiredTier: 'ADMIN',
    defaultRole: 'APP_ASSISTANT',
    keyActions: ['update_payment_qr', 'approve_subscription_order', 'manage_user_roles']
  }
};
