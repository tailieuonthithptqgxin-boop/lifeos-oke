const fs = require('fs');
const path = require('path');

// Let's find all view components and navigation components
const filesToAnalyze = [
  // 1. Navigation & App Shell
  { name: 'App Shell & Main Layout', file: 'src/App.tsx', type: 1 },
  { name: 'Sidebar / Mobile Navigation Bar', file: 'src/components/Sidebar.tsx', type: 1 },
  { name: 'Command Center & Quick Action Bar', file: 'src/components/CommandCenter.tsx', type: 1 },
  { name: 'Header / Top Navigation Bar', file: 'src/components/Header.tsx', type: 1 },

  // 2. Core Views in App.tsx
  { name: 'Dashboard Tổng Quan', file: 'src/components/DashboardView.tsx', type: 3 },
  { name: 'Lịch Biểu & Công Việc (Schedule & Tasks)', file: 'src/components/ScheduleAndTasksView.tsx', type: 2 },
  { name: 'Tài Chính Cá Nhân (Finance View)', file: 'src/components/FinanceView.tsx', type: 3 },
  { name: 'Phòng Tập Trung Cá Nhân (Focus View)', file: 'src/components/FocusView.tsx', type: 5 },
  { name: 'Quản Lý Dự Án (Projects View)', file: 'src/components/ProjectsView.tsx', type: 4 },
  { name: 'Học Tập & Quản Lý Môn Học (Study View)', file: 'src/components/StudyView.tsx', type: 4 },
  { name: 'Phòng Học Chung 100+ Người (Study Space & Meet)', file: 'src/components/study-space/StudySpaceView.tsx', type: 5 },
  { name: 'Lớp Học Trực Tuyến (Online Classroom View)', file: 'src/components/classroom/OnlineClassroomView.tsx', type: 5 },
  { name: 'Mạng Xã Hội & Cộng Đồng (Connect / Community Feed)', file: 'src/components/connect/LifeOsConnectView.tsx', type: 5 },
  { name: 'Mục Tiêu Cuộc Đời (Goals View)', file: 'src/components/GoalsView.tsx', type: 4 },
  { name: 'Sổ Tay & Tri Thức (Notes View)', file: 'src/components/NotesView.tsx', type: 4 },
  { name: 'Theo Dõi Thói Quen (Habits View)', file: 'src/components/HabitsView.tsx', type: 2 },
  { name: 'Hành Trình Game Hóa & Đấu Trùm (Journey / RPG View)', file: 'src/components/JourneyView.tsx', type: 3 },
  { name: 'Tiếp Thị Liên Kết & Thu Nhập (Affiliate & Referral View)', file: 'src/components/ReferralView.tsx', type: 3 },
  { name: 'Động Cơ Ra Quyết Định (Decision Engine View)', file: 'src/components/DecisionEngineView.tsx', type: 6 },
  { name: 'Tự Động Hóa Tác Vụ (Automation Engine View)', file: 'src/components/AutomationEngineView.tsx', type: 6 },
  { name: 'Chợ Mẫu & Tài Nguyên (Marketplace View)', file: 'src/components/MarketplaceView.tsx', type: 4 },
  { name: 'Giỏ Hàng & Mua Sắm (Cart View)', file: 'src/components/CartView.tsx', type: 6 },
  { name: 'Hồ Sơ & Bảo Mật Cá Nhân (My Account View)', file: 'src/components/MyAccountView.tsx', type: 6 },
  { name: 'Quản Lý Gói Dịch Vụ (Subscription Management View)', file: 'src/components/SubscriptionManagementView.tsx', type: 6 },
  { name: 'Cổng Thanh Toán QR Code (Checkout View)', file: 'src/components/CheckoutView.tsx', type: 6 },
  { name: 'Trang Quản Trị Hệ Thống (Admin View)', file: 'src/components/AdminView.tsx', type: 4 },
  { name: 'Module Tùy Biến Mở Rộng (Custom Module View)', file: 'src/components/CustomModuleView.tsx', type: 4 },
  { name: 'Không Gian 3D Đảo Nổi (Cyber Cozy Island Space)', file: 'src/components/spatial/CyberCozyIslandSpace.tsx', type: 5 },
  { name: 'Vũ Trụ Không Gian 3D (Spatial 3D Universe View)', file: 'src/components/spatial/Spatial3DUniverseView.tsx', type: 5 },
  { name: 'Trang Giới Thiệu Công Khai (Public Landing View)', file: 'src/components/PublicLandingView.tsx', type: 3 },
  { name: 'Màn Hình Đăng Nhập & Đăng Ký (Login View)', file: 'src/components/LoginView.tsx', type: 6 },
  { name: 'Quy Trình Khảo Sát Người Dùng Mới (Onboarding View)', file: 'src/components/OnboardingView.tsx', type: 6 },
  { name: 'Các Trang Chính Sách Pháp Lý (Privacy, Terms, Cookies, Refund)', file: 'src/components/legal/LegalViews.tsx', type: 6 }
];

// Check if these files actually exist on disk
const validFiles = [];
filesToAnalyze.forEach(f => {
  if (fs.existsSync(f.file)) {
    validFiles.push({ ...f, exists: true });
  } else {
    // try to find where it is
    const base = path.basename(f.file);
    let foundPath = null;
    function search(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
          search(path.join(dir, item.name));
        } else if (item.isFile() && item.name === base) {
          foundPath = path.join(dir, item.name).replace(/\\/g, '/');
        }
      }
    }
    search('src');
    if (foundPath) {
      validFiles.push({ ...f, file: foundPath, exists: true });
    } else {
      validFiles.push({ ...f, exists: false });
    }
  }
});

console.log('Analyzed files count:', validFiles.length);
validFiles.forEach(f => {
  console.log(`${f.exists ? 'OK' : 'MISSING'}: [${f.name}] -> ${f.file}`);
});

fs.writeFileSync('scripts/valid_files.json', JSON.stringify(validFiles, null, 2));
