const fs = require('fs');
const path = require('path');

// Comprehensive list of all screens/areas in the application
const screens = [
  // --- KHUNG ĐIỀU HƯỚNG TỔNG (SHELL & NAVIGATION) ---
  {
    id: 'shell-navigation',
    name: 'Khung Điều Hướng Tổng, Header & Bottom Bar',
    files: ['src/App.tsx', 'src/components/Sidebar.tsx', 'src/components/TopBar.tsx', 'src/components/BottomNav.tsx', 'src/components/CommandCenter.tsx'],
    type: 'Dạng 1 – Thanh điều hướng & Menu tổng'
  },

  // --- CORE LIFEOS MODULES ---
  {
    id: 'dashboard',
    name: 'Bảng Điều Khiển Tổng Quan (Dashboard)',
    files: ['src/components/DashboardView.tsx', 'src/components/dashboard/LifeHarmonyBento.tsx', 'src/components/dashboard/LifeHarmonyDetailModal.tsx', 'src/components/dashboard/FocusEconomyShopModal.tsx'],
    type: 'Dạng 3 – Trang tổng quan, Thống kê, Biểu đồ'
  },
  {
    id: 'schedule-tasks',
    name: 'Lịch Biểu & Quản Lý Công Việc (Schedule & Tasks)',
    files: ['src/components/ScheduleAndTasksView.tsx', 'src/components/tasks/TaskListView.tsx', 'src/components/schedule/ScheduleTimelineView.tsx', 'src/components/calendar/CalendarMonthView.tsx'],
    type: 'Dạng 2 – Bảng dữ liệu, Lịch biểu, Thời khóa biểu nhiều cột'
  },
  {
    id: 'finance',
    name: 'Quản Lý Tài Chính & Ngân Sách (Finance)',
    files: ['src/components/FinanceView.tsx', 'src/components/finance/AccountModal.tsx', 'src/components/finance/TransactionModal.tsx', 'src/components/finance/BudgetModal.tsx', 'src/components/finance/DebtModal.tsx'],
    type: 'Dạng 3 – Trang tổng quan, Thống kê, Biểu đồ'
  },
  {
    id: 'focus',
    name: 'Phòng Tập Trung Cá Nhân & Nhạc Focus (Focus & Zen)',
    files: ['src/components/FocusView.tsx', 'src/components/focus/ZenFocusOverlay.tsx', 'src/components/focus/GlobalFocusMusicPlayer.tsx'],
    type: 'Dạng 5 – Không gian tương tác trực tiếp / Tập trung'
  },
  {
    id: 'projects',
    name: 'Quản Lý Dự Án & Tiến Độ (Projects)',
    files: ['src/components/ProjectsView.tsx', 'src/components/projects/ProjectDetailView.tsx'],
    type: 'Dạng 4 – Danh sách có nhiều nút công cụ, tìm kiếm & bộ lọc'
  },
  {
    id: 'study-vocab',
    name: 'Trung Tâm Học Tập & Từ Vựng (Study & Vocab Master)',
    files: ['src/components/StudyView.tsx', 'src/components/vocab/ChineseVocabMasterView.tsx', 'src/components/vocab/GenZVocabStudyModal.tsx', 'src/components/vocab/SpeedMatchGameModal.tsx'],
    type: 'Dạng 4 – Danh sách có nhiều nút công cụ, tìm kiếm & bộ lọc'
  },
  {
    id: 'study-space',
    name: 'Phòng Học Chung Trực Tuyến 100+ Người (Study Space & Meet)',
    files: ['src/components/study/StudySpaceView.tsx', 'src/components/study-space/LayoutSettingsModal.tsx', 'src/components/study-space/RoomSettingsModal.tsx', 'src/components/study-space/StudyCreateRoomModal.tsx'],
    type: 'Dạng 5 – Không gian tương tác trực tiếp / Phòng đông người'
  },
  {
    id: 'classroom',
    name: 'Lớp Học Trực Tuyến & Google Calendar (Classroom)',
    files: ['src/components/classroom/OnlineClassroomView.tsx', 'src/components/study/AssignmentModal.tsx', 'src/components/study/ExamModal.tsx'],
    type: 'Dạng 5 – Không gian tương tác trực tiếp / Lớp học'
  },
  {
    id: 'connect',
    name: 'Mạng Xã Hội, Bảng Tin & Trò Chuyện (Connect & Feed)',
    files: ['src/components/connect/LifeOsConnectView.tsx', 'src/components/GlobalChatWidget.tsx', 'src/components/connect/UserProfileModal.tsx'],
    type: 'Dạng 5 – Bảng tin, Chat, Mạng xã hội'
  },
  {
    id: 'goals',
    name: 'Mục Tiêu Cuộc Đời & OKRs (Goals)',
    files: ['src/components/GoalsView.tsx'],
    type: 'Dạng 4 – Danh sách có nhiều nút công cụ & Tiến độ'
  },
  {
    id: 'notes',
    name: 'Sổ Tay & Quản Trị Tri Thức (Notes & Knowledge)',
    files: ['src/components/NotesView.tsx'],
    type: 'Dạng 4 – Danh sách thẻ & Trình soạn thảo văn bản'
  },
  {
    id: 'habits',
    name: 'Theo Dõi Thói Quen & Chuỗi Kỷ Luật (Habits & Streaks)',
    files: ['src/components/HabitsView.tsx'],
    type: 'Dạng 2 – Bảng dữ liệu ma trận thói quen theo tuần/tháng'
  },
  {
    id: 'journey',
    name: 'Hành Trình RPG & Đấu Trùm (Journey & Gamification)',
    files: ['src/components/JourneyView.tsx', 'src/components/journey/MonsterCombatModal.tsx', 'src/components/journey/RPGSkillTreeModal.tsx'],
    type: 'Dạng 3 – Thống kê, Bảng thành tích & Game hóa'
  },
  {
    id: 'referral',
    name: 'Tiếp Thị Liên Kết & Hoa Hồng (Affiliate & Referral)',
    files: ['src/components/ReferralView.tsx'],
    type: 'Dạng 3 – Thống kê thu nhập, Bảng số liệu & Chia sẻ link'
  },
  {
    id: 'decision-engine',
    name: 'Ma Trận Quyết Định Thông Minh (Decision Engine)',
    files: ['src/components/DecisionEngineView.tsx'],
    type: 'Dạng 6 – Biểu mẫu nhập tiêu chí & Bảng so sánh điểm số'
  },
  {
    id: 'automation-engine',
    name: 'Động Cơ Tự Động Hóa Tác Vụ (Automation Engine)',
    files: ['src/components/AutomationEngineView.tsx'],
    type: 'Dạng 6 – Cấu hình quy tắc Nếu-Thì (Trigger-Action)'
  },
  {
    id: 'marketplace-cart',
    name: 'Chợ Mẫu & Giỏ Hàng Mua Sắm (Marketplace & Cart)',
    files: ['src/components/MarketplaceView.tsx', 'src/components/CartView.tsx'],
    type: 'Dạng 4 – Lưới sản phẩm & Giỏ hàng thanh toán'
  },
  {
    id: 'account-subscription',
    name: 'Hồ Sơ Cá Nhân & Quản Lý Gói Dịch Vụ (Account & Billing)',
    files: ['src/components/MyAccountView.tsx', 'src/components/SubscriptionManagementView.tsx', 'src/components/CheckoutView.tsx'],
    type: 'Dạng 6 – Biểu mẫu thông tin tài khoản & Bảng giá gói'
  },
  {
    id: 'admin',
    name: 'Bảng Điều Khiển Quản Trị Hệ Thống (Admin Control Panel)',
    files: ['src/components/AdminView.tsx', 'src/components/AdminCustomModulesTab.tsx', 'src/components/admin/UserDetailModal.tsx'],
    type: 'Dạng 4 – Bảng quản trị người dùng, doanh thu & cấu hình'
  },
  {
    id: 'custom-modules',
    name: 'Module Tùy Biến Động (Dynamic Custom Modules)',
    files: ['src/components/DynamicModuleView.tsx'],
    type: 'Dạng 4 – Bảng dữ liệu động & Biểu mẫu linh hoạt'
  },
  {
    id: 'spatial',
    name: 'Không Gian 3D Đảo Nổi & Vũ Trụ (Spatial 3D & Universe)',
    files: ['src/components/spatial/CyberCozyIslandSpace.tsx', 'src/components/spatial/Spatial3DUniverseView.tsx'],
    type: 'Dạng 5 – Không gian 3D tương tác cảm ứng'
  },
  {
    id: 'public-auth-legal',
    name: 'Landing Page, Đăng Nhập, Khảo Sát & Pháp Lý (Public, Auth & Legal)',
    files: ['src/components/PublicLandingView.tsx', 'src/components/LoginView.tsx', 'src/components/OnboardingView.tsx', 'src/components/legal/LegalLayout.tsx', 'src/components/legal/PrivacyPolicyView.tsx', 'src/components/legal/TermsOfServiceView.tsx'],
    type: 'Dạng 6 – Trang đích giới thiệu, Form đăng nhập & Văn bản pháp lý'
  }
];

// Scan source files for mobile issues
const analysis = screens.map(s => {
  let totalHover = 0;
  let totalHScreen = 0;
  let totalSmallTextInputs = 0;
  let totalWideWidths = 0;
  let totalTables = 0;
  let existingFiles = [];

  s.files.forEach(f => {
    if (fs.existsSync(f)) {
      existingFiles.push(f);
      const content = fs.readFileSync(f, 'utf-8');
      
      // count hovers
      const hoverMatches = content.match(/hover:[a-zA-Z0-9_-]+/g) || [];
      totalHover += hoverMatches.length;

      // count h-screen without dvh
      const hScreenMatches = content.match(/h-screen(?!\s+h-\[100dvh\])/g) || [];
      totalHScreen += hScreenMatches.length;

      // count small text inputs
      const smallInputMatches = content.match(/<(?:input|textarea|select)[^>]+text-(?:xs|sm|\[(?:1[0-4]|8|9)px\])/g) || [];
      totalSmallTextInputs += smallInputMatches.length;

      // count fixed widths > 360px without max-w-full
      const wideMatches = content.match(/w-\[(?:[4-9]\d\d|1\d\d\d)px\]/g) || [];
      totalWideWidths += wideMatches.length;

      // count tables
      const tableMatches = content.match(/<table/g) || [];
      totalTables += tableMatches.length;
    }
  });

  return {
    ...s,
    existingFiles,
    issues: {
      totalHover,
      totalHScreen,
      totalSmallTextInputs,
      totalWideWidths,
      totalTables
    }
  };
});

fs.writeFileSync('scripts/mobile_analysis_result.json', JSON.stringify(analysis, null, 2));

console.log('Mobile scan completed for', analysis.length, 'screen areas.');
analysis.forEach(a => {
  console.log(`[${a.name}] - ${a.type}`);
  console.log(`   Files: ${a.existingFiles.length}, Hovers: ${a.issues.totalHover}, h-screens: ${a.issues.totalHScreen}, Tables: ${a.issues.totalTables}`);
});
