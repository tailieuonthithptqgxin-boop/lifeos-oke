/**
 * LifeOS Overview Knowledge
 * High-level architecture, purpose, audience, and core capabilities.
 */

export interface LifeOSAppOverview {
  name: string;
  tagline: string;
  purpose: string;
  targetAudience: string[];
  corePhilosophy: string;
  totalModules: number;
  keyModules: Array<{
    id: string;
    name: string;
    summary: string;
    primaryRole: 'STUDY_COMPANION' | 'APP_ASSISTANT';
  }>;
  nonExistentFeaturesNotice: string[];
}

export const APP_OVERVIEW: LifeOSAppOverview = {
  name: 'LifeOS',
  tagline: 'Hệ điều hành tối ưu hóa học tập, công việc và cuộc sống cá nhân',
  purpose: 'Tích hợp toàn diện giữa học tập chuyên sâu (Study OS, Từ vựng, Focus Pomodoro) và quản lý cuộc sống (Nhiệm vụ Kanban, Tài chính, Thói quen, Mục tiêu, Tự động hóa) thành một hệ sinh thái đồng nhất.',
  targetAudience: [
    'Học sinh, sinh viên luyện thi ngoại ngữ (IELTS, HSK 1-6) và quản lý bài học',
    'Người đi làm, người tự học nâng cao kỹ năng (Lifelong Learners)',
    'Người muốn kiểm soát dòng tiền, xây dựng thói quen và tối ưu hóa năng suất cá nhân (Deep Work)'
  ],
  corePhilosophy: 'Tập trung sâu, học tập ngắt quãng (Spaced Repetition & Active Recall), quản lý lý tính (Decision Matrix) và giảm thiểu thao tác lặp lại (Automation Engine).',
  totalModules: 14,
  keyModules: [
    {
      id: 'dashboard',
      name: 'Bảng Điều Khiển (Dashboard)',
      summary: 'Trung tâm tổng quan KPI học tập, chuỗi Streak, nhiệm vụ hôm nay và dòng tiền.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'study',
      name: 'Study OS & Vocabulary Master',
      summary: 'Học 3.000 từ Oxford tiếng Anh và 10.240 từ HSK tiếng Trung với Spaced Repetition (SM-2) và Active Recall.',
      primaryRole: 'STUDY_COMPANION'
    },
    {
      id: 'focus',
      name: 'Focus Pomodoro & Deep Work',
      summary: 'Đồng hồ tập trung 25/5 hoặc 50/10, âm thanh lofi thư giãn, ghi nhận số giờ học thực tế.',
      primaryRole: 'STUDY_COMPANION'
    },
    {
      id: 'tasks',
      name: 'Quản Lý Nhiệm Vụ (Tasks & Kanban)',
      summary: 'Quản lý công việc dạng Danh sách & Kanban, đếm giờ trực tiếp, subtasks checklist, cảnh báo rủi ro cao.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'calendar',
      name: 'Lịch Biểu & Time Blocking',
      summary: 'Lên lịch theo ngày/tuần/tháng, khối thời gian học tập và kết nối hạn chót nhiệm vụ.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'finance',
      name: 'Quản Lý Tài Chính (Finance)',
      summary: 'Ghi chép thu chi, hạn mức ngân sách thông minh (cảnh báo 80% & 100%), phân bổ 50/30/20.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'habits',
      name: 'Theo Dõi Thói Quen (Habit Tracker)',
      summary: 'Xây dựng thói quen hàng ngày, theo dõi chuỗi Streak, biểu đồ hoàn thành và nhắc nhở.',
      primaryRole: 'STUDY_COMPANION'
    },
    {
      id: 'goals',
      name: 'Mục Tiêu & OKRs',
      summary: 'Thiết lập mục tiêu dài hạn, chia nhỏ thành các kết quả then chốt (Key Results).',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'notes',
      name: 'Ghi Chú Học Tập & Kiến Thức',
      summary: 'Soạn thảo ghi chú bài học, liên kết ý tưởng, phương pháp Cornell và gắn thẻ.',
      primaryRole: 'STUDY_COMPANION'
    },
    {
      id: 'decision',
      name: 'Ma Trận Quyết Định (Decision Engine)',
      summary: 'Đưa ra lựa chọn khách quan bằng phương pháp chấm điểm trọng số theo tiêu chí.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'automation',
      name: 'Động Cơ Tự Động Hóa (Automation Engine)',
      summary: '10 tab quản lý quy tắc Trigger-Action, giả lập Dry-run, phê duyệt và chống xung đột.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'subscription',
      name: 'Gói Hội Viên & Thanh Toán VietQR',
      summary: 'Gói Free, Pro, Team (tối đa 5 thành viên), tạo mã QR động quét chuyển khoản tự động kích hoạt.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'account',
      name: 'Tài Khoản & Cài Đặt Cá Nhân',
      summary: 'Tùy chọn 6 nhân vật AI Companion, cấu hình Quiet Mode, sao lưu và đồng bộ dữ liệu.',
      primaryRole: 'APP_ASSISTANT'
    },
    {
      id: 'admin',
      name: 'Trang Quản Trị Hệ Thống (Admin)',
      summary: 'Duyệt kích hoạt đơn hàng thủ công, cấu hình mã VietQR ngân hàng, quản lý tài khoản.',
      primaryRole: 'APP_ASSISTANT'
    }
  ],
  nonExistentFeaturesNotice: [
    'LifeOS KHÔNG phải là ứng dụng gửi email hàng loạt (Bulk/Mass Email Campaign).',
    'LifeOS KHÔNG hỗ trợ giao đồ ăn, đặt xe (Grab/Uber), đặt phòng khách sạn hay vé máy bay.',
    'LifeOS KHÔNG phải sàn giao dịch chứng khoán, tiền số hay đầu tư mạo hiểm.',
    'LifeOS KHÔNG phải mạng xã hội hẹn hò hay xem phim trực tuyến.'
  ]
};
