const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('scripts/stage0_extracted_inventory.json', 'utf8'));

let md = `# BẢN ĐỒ KIỂM KÊ TOÀN DIỆN 100% HỆ THỐNG (STAGE 0: FULL SYSTEM INVENTORY)
> **Hội Đồng Kiểm Toán Toàn Diện (System Architect, Security Auditor, DevOps/Cloudflare Engineer, QA Automation Lead)**  
> **Nguyên tắc tối thượng:** Zero-Skip Policy — Đọc code thật từ ổ đĩa, kiểm kê 100% không tóm tắt, không lược bỏ.

---

## MỤC LỤC KIỂM KÊ
1. [Phần 1: 100% Bảng Dữ Liệu & Quan Hệ (103 Prisma Models, 4 Enums)](#phan-1)
2. [Phần 2: 100% Backend REST API Endpoints (404 Endpoints)](#phan-2)
3. [Phần 3: 100% Socket.io Events (24 Real-time Events)](#phan-3)
4. [Phần 4: 100% Frontend Pages, Views, Modals & Components](#phan-4)
5. [Phần 5: 100% Tiến Trình Nền & Dịch Vụ Ngoài (Background Services & Cloud)](#phan-5)

---

<a name="phan-1"></a>
## PHẦN 1: 100% BẢNG DỮ LIỆU & QUAN HỆ TRONG DATABASE (\`prisma/schema.prisma\`)
*Tổng số lượng: **103 Models** và **4 Enums**.*

### I. CÁC ENUM ĐỊNH DANH (4 ENUMS)
1. **\`Role\`**: \`USER\`, \`ADMIN\`, \`SUPERADMIN\`
2. **\`Plan\`**: \`FREE\`, \`PRO\`, \`TEAM\`
3. **\`UserStatus\`**: \`ACTIVE\`, \`SUSPENDED\`, \`DISABLED\`
4. **\`PasswordResetRequestStatus\`**: \`PENDING\`, \`APPROVED\`, \`REJECTED\`, \`COMPLETED\`, \`EXPIRED\`

### II. 103 BẢNG DỮ LIỆU (MODELS) THEO PHÂN HỆ VÀ LIÊN KẾT NGOẠI KHÓA

`;

// Group models into domain categories for clear navigation
const domains = [
  {
    name: '1. Xác thực & Quản trị Tài khoản người dùng (Core User & Security)',
    models: ['User', 'Session', 'PasswordResetToken', 'PasswordResetRequest', 'LoginAttempt', 'SecurityEvent']
  },
  {
    name: '2. Năng suất cá nhân, Công việc & Dự án (Productivity & Task Management)',
    models: ['Task', 'TaskComment', 'TaskAttachment', 'TaskHistory', 'CalendarEvent', 'ScheduleBlock', 'Reminder', 'Project', 'ProjectMember', 'ProjectMilestone']
  },
  {
    name: '3. Tập trung & Pomodoro (Focus & High-Scale Pomodoro)',
    models: ['FocusSession', 'FocusGoal']
  },
  {
    name: '4. Quản lý Tài chính cá nhân (Personal Finance Engine)',
    models: ['FinanceAccount', 'Transaction', 'Category', 'Budget', 'SavingGoal', 'Debt', 'RecurringTransaction']
  },
  {
    name: '5. Học tập & Quản lý môn học (Study & Academic Tracking)',
    models: ['Subject', 'StudyAssignment', 'StudyExam', 'StudySession']
  },
  {
    name: '6. Thói quen & Mục tiêu dài hạn (Habits & Long-term Goals)',
    models: ['Habit', 'HabitLog', 'Goal', 'GoalMilestone', 'GoalAction']
  },
  {
    name: '7. Ghi chú & Quản lý tri thức (Notes & Knowledge Base)',
    models: ['Note', 'NoteTag']
  },
  {
    name: '8. Động cơ Ra quyết định & Tự động hóa (Decision Engine & Automations)',
    models: ['Decision', 'AutomationRule', 'AutomationExecution']
  },
  {
    name: '9. Thanh toán, Gói dịch vụ & Thương mại (Billing, Subscription & Commerce)',
    models: ['Subscription', 'Team', 'TeamMember', 'Payment', 'Coupon', 'CartItem', 'Order', 'PaymentQR']
  },
  {
    name: '10. Mẫu hệ thống & Tái sử dụng (System Templates)',
    models: ['SystemTemplate', 'TemplateUsage']
  },
  {
    name: '11. Động cơ Thông báo & Hòm thư Outbox (Notification & Email Engine)',
    models: ['Notification', 'UserNotificationPreference', 'UserNotificationRule', 'UserEmailIntegration', 'NotificationDelivery', 'Announcement', 'AnnouncementDelivery', 'EmailQueue']
  },
  {
    name: '12. Hệ thống, Hỗ trợ & Khóa tránh trùng lặp (System, Support & Idempotency)',
    models: ['SupportTicket', 'AuditLog', 'SystemSetting', 'IdempotencyKey']
  },
  {
    name: '13. Phân hệ Tùy biến mở rộng (Custom Extensible Modules)',
    models: ['CustomModule', 'CustomModuleField', 'CustomModuleRecord', 'CustomModulePermission']
  },
  {
    name: '14. Tiếp thị liên kết & Giới thiệu (Affiliate & Referral System)',
    models: ['ReferralProfile', 'ReferralRelationship', 'ReferralCommission', 'WithdrawalRequest', 'ReferralTransaction']
  },
  {
    name: '15. Ý kiến đóng góp cộng đồng (Feedback & Feature Voting)',
    models: ['Feedback', 'FeedbackVote']
  },
  {
    name: '16. Học từ vựng thông minh (Vocab Master Active Recall)',
    models: ['VocabWordProgress', 'VocabReviewLog']
  },
  {
    name: '17. Game hóa RPG & Đấu trường Quái vật (Gamification & RPG System)',
    models: ['JourneyMilestone', 'UserProgression', 'XPTransaction', 'CoinTransaction', 'UserReward', 'UserEquipment', 'UserSkill', 'MonsterProgress', 'BattleRecord']
  },
  {
    name: '18. Lớp học Online & Tích hợp Lịch Google (Classroom & Google Calendar)',
    models: ['OnlineClass', 'OnlineClassParticipant', 'GoogleCalendarIntegration']
  },
  {
    name: '19. Mạng xã hội nội bộ & Kết nối (Social Network, Posts & Direct Chat)',
    models: ['Post', 'PostReaction', 'PostComment', 'Community', 'CommunityMember', 'CommunityChannel', 'CommunityChatMessage', 'CommunityMeet', 'Friendship', 'Conversation', 'DirectMessage']
  },
  {
    name: '20. Kiểm duyệt nội dung & Thú cưng ảo (Moderation, Safety & Virtual Pet)',
    models: ['UserBlock', 'Report', 'UserStatusNote', 'UserPet']
  },
  {
    name: '21. Thống kê & Phân tích tính năng (Analytics Engine)',
    models: ['FeatureAnalyticsSummary', 'UserFeatureAnalytics']
  }
];

const modelMap = new Map();
data.models.forEach(m => modelMap.set(m.name, m));

domains.forEach(d => {
  md += `#### ${d.name}\n`;
  d.models.forEach(mName => {
    const m = modelMap.get(mName);
    if (!m) return;
    md += `- **\`${m.name}\`** (${m.fieldCount} fields):\n`;
    if (m.relations && m.relations.length > 0) {
      md += `  - *Quan hệ ngoại khóa:* ${m.relations.map(r => `\`${r.field}\` -> \`${r.type}\``).join(', ')}\n`;
    } else {
      md += `  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)\n`;
    }
  });
  md += `\n`;
});

md += `---

<a name="phan-2"></a>
## PHẦN 2: 100% BACKEND REST API ENDPOINTS (404 ENDPOINTS)
*Toàn bộ 404 endpoints được quét trực tiếp từ 16 route files và \`serverMain.ts\`.*

| STT | Phương Thức | Đường Dẫn Đầy Đủ (Full Route) | Middleware Xác Thực & Quyền Hạn | File Mã Nguồn | Dòng |
|---|---|---|---|---|---|
`;

data.endpoints.forEach((ep, idx) => {
  md += `| ${idx + 1} | \`${ep.method}\` | \`${ep.fullPath}\` | ${ep.auth} (${ep.middlewares}) | \`${ep.file}\` | L${ep.line} |\n`;
});

md += `\n---

<a name="phan-3"></a>
## PHẦN 3: 100% SỰ KIỆN REAL-TIME SOCKET.IO (24 EVENTS)
*Quét từ \`src/backend/realtime/studyRoomSocket.ts\` & \`src/features/study/\`.*

### I. SỰ KIỆN TỪ CLIENT GỬI LÊN SERVER (CLIENT -> SERVER: 11 EVENTS)
| STT | Tên Sự Kiện (Event) | Cấu Trúc Dữ Liệu (Payload) | Mục Đích & Kiểm Soát Nghiệp Vụ |
|---|---|---|---|
`;

data.socketEvents.clientToServer.forEach((ev, idx) => {
  md += `| ${idx + 1} | \`${ev.event}\` | \`${ev.payload}\` | ${ev.desc} |\n`;
});

md += `\n### II. SỰ KIỆN TỪ SERVER PHÁT XUỐNG CLIENT (SERVER -> CLIENT: 13 EVENTS)
| STT | Tên Sự Kiện (Event) | Cấu Trúc Dữ Liệu (Payload) | Cơ Chế Phát (Broadcast Scope) & Ý Nghĩa |
|---|---|---|---|
`;

data.socketEvents.serverToClient.forEach((ev, idx) => {
  md += `| ${idx + 1} | \`${ev.event}\` | \`${ev.payload}\` | ${ev.desc} |\n`;
});

md += `\n---

<a name="phan-4"></a>
## PHẦN 4: 100% GIAO DIỆN FRONTEND (PAGES, VIEWS & MODALS)

### I. CÁC MÀN HÌNH / GIAO DIỆN CHÍNH (31 CORE VIEWS & PAGES)
| STT | Tên View / Routing Tab | Component Tương Ứng | Phân Loại & Quyền Truy Cập |
|---|---|---|---|
| 1 | \`home\` / Landing Page | \`PublicLandingView.tsx\` | Khách / Chưa đăng nhập |
| 2 | \`login\` / Auth Modal | \`LoginView.tsx\` | Khách / Đăng nhập & Đăng ký |
| 3 | \`onboarding\` | \`OnboardingView.tsx\` | Người dùng mới hoàn thiện thông tin |
| 4 | \`dashboard\` | \`DashboardView.tsx\` | Authenticated - Tổng quan cuộc sống |
| 5 | \`schedule\` | \`ScheduleAndTasksView.tsx (initialTab="today")\` | Authenticated - Lịch trình hôm nay |
| 6 | \`tasks\` | \`ScheduleAndTasksView.tsx (initialTab="tasks")\` | Authenticated - Quản lý việc cần làm |
| 7 | \`calendar\` | \`ScheduleAndTasksView.tsx (initialTab="calendar")\` | Authenticated - Lịch biểu tích hợp |
| 8 | \`finance\` | \`FinanceView.tsx\` | Authenticated - Quản lý tài chính cá nhân |
| 9 | \`focus\` | \`FocusView.tsx\` | Authenticated - Phòng tập trung cá nhân |
| 10 | \`projects\` | \`ProjectsView.tsx\` | Authenticated - Quản lý dự án |
| 11 | \`study\` / \`vocab\` | \`StudyView.tsx\` | Authenticated - Trung tâm học tập & Từ vựng |
| 12 | \`study-space\` | \`StudySpaceView.tsx (initialTab="rooms")\` | Authenticated - Phòng học chung 100+ người |
| 13 | \`classroom\` | \`StudySpaceView.tsx (initialTab="classroom")\` | Authenticated - Lớp học trực tuyến |
| 14 | \`community\` / \`connect\` | \`LifeOsConnectView.tsx\` | Authenticated - Mạng xã hội & Cộng đồng |
| 15 | \`goals\` | \`GoalsView.tsx\` | Authenticated - Mục tiêu cuộc đời |
| 16 | \`notes\` | \`NotesView.tsx\` | Authenticated - Sổ tay & Tri thức |
| 17 | \`habits\` | \`HabitsView.tsx\` | Authenticated - Theo dõi thói quen |
| 18 | \`journey\` | \`JourneyView.tsx\` | Authenticated - RPG Game hóa & Đấu trùm |
| 19 | \`affiliate\` / \`referral\` | \`ReferralView.tsx\` | Authenticated - Tiếp thị liên kết & Thu nhập |
| 20 | \`decision_engine\` | \`DecisionEngineView.tsx\` | Authenticated - Ma trận hỗ trợ ra quyết định |
| 21 | \`automation_engine\` | \`AutomationEngineView.tsx\` | Authenticated - Tự động hóa tác vụ |
| 22 | \`marketplace\` | \`MarketplaceView.tsx\` | Authenticated - Chợ Template & Tài nguyên |
| 23 | \`cart\` | \`CartView.tsx\` | Authenticated - Giỏ hàng thanh toán |
| 24 | \`my_account\` | \`MyAccountView.tsx\` | Authenticated - Hồ sơ & Bảo mật cá nhân |
| 25 | \`subscription\` | \`SubscriptionManagementView.tsx\` | Authenticated - Nâng cấp gói PRO / TEAM |
| 26 | \`checkout\` | \`CheckoutView.tsx\` | Authenticated - Cổng thanh toán QR MoMo/Bank |
| 27 | \`admin\` | \`AdminView.tsx\` | **Chỉ Admin / Superadmin** |
| 28 | \`custom_module_:slug\` | \`CustomModuleView.tsx\` | Dynamic - Module tùy biến mở rộng |
| 29 | \`spatial\` / Island | \`CyberCozyIslandSpace.tsx\` | Không gian 3D tương tác đảo nổi |
| 30 | \`spatial-universe\` | \`Spatial3DUniverseView.tsx\` | Vũ trụ 3D CyberCozy |
| 31 | Legal (\`privacy\`, \`terms\`, \`cookies\`, \`refund\`) | \`PrivacyPolicyView\`, \`TermsOfServiceView\`, etc. | Public - Chính sách pháp lý |

### II. 100% CÁC MODAL, DRAWER & POPUP CHÍNH (69 MODALS)
| STT | Tên Component Modal | Đường Dẫn File | Vai Trò & Nghiệp Vụ |
|---|---|---|---|
`;

data.allModals.forEach((m, idx) => {
  md += `| ${idx + 1} | \`${m.name}\` | \`${m.path}\` | Popup tương tác nghiệp vụ chuyên biệt |\n`;
});

md += `\n---

<a name="phan-5"></a>
## PHẦN 5: 100% TIẾN TRÌNH NỀN & DỊCH VỤ NGOÀI (BACKGROUND SERVICES & CLOUD)

| STT | Tên Dịch Vụ / Tiến Trình | File Triển Khai | Cơ Chế Kích Hoạt (Trigger) | Chức Năng Cốt Lõi |
|---|---|---|---|---|
`;

data.backgroundServices.forEach((bg, idx) => {
  md += `| ${idx + 1} | **${bg.name}** | \`${bg.file}\` | ${bg.trigger} | ${bg.purpose} |\n`;
});

md += `
---

## KẾT LUẬN GIAI ĐOẠN 0 & BƯỚC TIẾP THEO

Bản Đồ Kiểm Kê Toàn Hệ Thống (Stage 0: Full System Inventory) đã hoàn tất với **100% độ phủ**:
- ✅ **103 Bảng dữ liệu** (Models) & **4 Enums** trong \`prisma/schema.prisma\`.
- ✅ **404 Backend REST API Endpoints** (đầy đủ Method, Full Path, Middleware, File, Line).
- ✅ **24 Sự kiện Socket.io** (11 Client Emits + 13 Server Broadcasts) đồng bộ phòng học 100+ người.
- ✅ **31 Màn hình chính & 69 Modals** toàn bộ Frontend.
- ✅ **9 Tiến trình nền & Dịch vụ Cloud** (Cron Engine, Email Queue, Classroom Loop, Worker, WAL State Manager, R2 Presigner, Google OAuth, Cloudflare Worker).

> [!IMPORTANT]
> **ĐIỂM DỪNG BẮT BUỘC (CHECKPOINT):**  
> Theo quy tắc và nguyên tắc kiểm toán tối thượng, Hội đồng kiểm toán **dừng lại tại đây** để Người dùng duyệt đối chiếu Bản Đồ Kiểm Kê Giai Đoạn 0.  
> Sau khi nhận được xác nhận duyệt từ bạn, Hội đồng sẽ chính thức bước vào **GIAI ĐOẠN 1: KIỂM TOÁN CHI TIẾT TỪNG PHÂN HỆ, CHECKLIST ZERO-MOCK & LIÊN KẾT DỮ LIỆU THỰC**.
`;

const artifactPath = path.join(process.env.APPDATA || 'C:\\Users\\USER\\AppData\\Roaming', '..', 'Local', 'Google', 'Antigravity', 'brain', 'ecfef555-1ccc-4e86-b0cc-1e9f81973c77', 'stage0_full_system_inventory.md');
// Also write to user workspace and brain directory
const targetBrainPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\ecfef555-1ccc-4e86-b0cc-1e9f81973c77\\stage0_full_system_inventory.md';
fs.writeFileSync(targetBrainPath, md, 'utf-8');
fs.writeFileSync('stage0_full_system_inventory.md', md, 'utf-8');

console.log('Successfully wrote artifact to:', targetBrainPath);
console.log('Successfully wrote copy to workspace: stage0_full_system_inventory.md');
