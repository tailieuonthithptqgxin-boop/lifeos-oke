const fs = require('fs');
const path = require('path');

// ==========================================
// 1. PRISMA SCHEMA INVENTORY
// ==========================================
const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf-8');
const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;

const models = [];
let match;
while ((match = modelRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const body = match[2];
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'));
  
  const fields = [];
  const relations = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      const fieldType = parts[1];
      const rest = parts.slice(2).join(' ');
      if (rest.includes('@relation') || line.includes('@relation')) {
        relations.push({ field: fieldName, type: fieldType, details: rest });
      } else {
        fields.push({ field: fieldName, type: fieldType, details: rest });
      }
    }
  }
  models.push({ name: modelName, fieldCount: fields.length + relations.length, relations, fields });
}

const enums = [];
while ((match = enumRegex.exec(schemaContent)) !== null) {
  const enumName = match[1];
  const values = match[2].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  enums.push({ name: enumName, values });
}

// ==========================================
// 2. SERVERMAIN MOUNT POINTS & REST ROUTES
// ==========================================
const serverMainContent = fs.readFileSync('src/backend/serverMain.ts', 'utf-8');
const serverMainLines = serverMainContent.split('\n');

const mounts = [];
serverMainLines.forEach((line, idx) => {
  const l = line.trim();
  if (l.startsWith('app.use(') || l.startsWith('app.get(') || l.startsWith('app.post(') || l.startsWith('app.all(')) {
    mounts.push({ line: idx + 1, code: l });
  }
});

const routeFiles = fs.readdirSync('src/backend/routes').filter(f => f.endsWith('.ts'));

const allEndpoints = [];

// Direct serverMain routes
serverMainLines.forEach((line, idx) => {
  const l = line.trim();
  const directMatch = l.match(/^app\.(get|post|put|delete|patch|all)\(\s*['"`]([^'"`]+)['"`]/i);
  if (directMatch) {
    allEndpoints.push({
      file: 'src/backend/serverMain.ts',
      line: idx + 1,
      method: directMatch[1].toUpperCase(),
      path: directMatch[2],
      fullPath: directMatch[2],
      middlewares: 'Public / CORS',
      auth: directMatch[2].includes('/auth/') ? 'Public / OAuth Redirect' : 'Public'
    });
  }
});

const mountMap = {
  'auth.ts': ['/api/auth', '/api/user'],
  'classroom.routes.ts': ['/api/classroom'],
  'pet.routes.ts': ['/api/pet'],
  'studySpace.routes.ts': ['/api/study-space', '/api/study'],
  'connect.routes.ts': ['/api/connect'],
  'analytics.routes.ts': ['/api/analytics'],
  'notifications.routes.ts': ['/api/notifications'],
  'cron.routes.ts': ['/api/cron'],
  'r2.routes.ts': ['/api/r2'],
  'customModules.routes.ts': ['/api/custom-modules'],
  'vocab.routes.ts': ['/api/vocab'],
  'ai.routes.ts': ['/api/ai'],
  'testLab.routes.ts': ['/api/admin/test-lab'],
  'api.ts': ['/api'],
  'storageAudit.routes.ts': ['(Unmounted in serverMain.ts)'],
  'widget.routes.ts': ['(Unmounted in serverMain.ts)']
};

for (const file of routeFiles) {
  const filePath = path.join('src/backend/routes', file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileMounts = mountMap[file] || ['/api'];

  let routerLevelAuth = null;
  lines.forEach(l => {
    if (l.includes('router.use(requireAuth)') || l.includes('router.use(authenticateUser)')) {
      routerLevelAuth = 'requireAuth (Router Level)';
    }
  });

  lines.forEach((line, idx) => {
    const l = line.trim();
    const routeMatch = l.match(/router\.(get|post|put|delete|patch|all)\(\s*['"`]([^'"`]+)['"`](.*)/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const routePath = routeMatch[2];
      const afterMatch = routeMatch[3];
      
      let middleware = [];
      if (afterMatch.includes('requireAuth')) middleware.push('requireAuth');
      if (afterMatch.includes('requireAdmin') || afterMatch.includes('adminRoleMiddleware')) middleware.push('requireAdmin');
      if (afterMatch.includes('upload.')) middleware.push('multer-upload');
      if (afterMatch.includes('limiter')) middleware.push('rate-limit');
      if (afterMatch.includes('requireSubscription')) middleware.push('requireSubscription');
      if (afterMatch.includes('verifyOwnership')) middleware.push('verifyOwnership');

      let authStatus = 'Public';
      if (routerLevelAuth) {
        authStatus = routerLevelAuth;
      }
      if (middleware.includes('requireAdmin')) {
        authStatus = 'Superadmin / Admin (requireAdmin)';
      } else if (middleware.includes('requireAuth')) {
        authStatus = 'Authenticated User (requireAuth)';
      }

      for (const mPrefix of fileMounts) {
        let full = mPrefix === '/' ? routePath : (routePath === '/' ? mPrefix : `${mPrefix}${routePath}`);
        allEndpoints.push({
          file: `src/backend/routes/${file}`,
          line: idx + 1,
          method,
          subPath: routePath,
          fullPath: full,
          middlewares: middleware.length ? middleware.join(', ') : (routerLevelAuth ? 'Router Auth' : 'None'),
          auth: authStatus
        });
      }
    }
  });
}

// ==========================================
// 3. SOCKET.IO EVENTS
// ==========================================
const socketEvents = {
  clientToServer: [
    { event: 'room:join', payload: '{ roomId: string, user: { id: string, name: string, avatar?: string, isHost?: boolean }, initialStatus?: string }', desc: 'User tham gia phòng học, nhận snapshot phòng và phát thông báo người mới' },
    { event: 'room:leave', payload: '{ roomId: string }', desc: 'User chủ động thoát khỏi phòng học' },
    { event: 'room:meet_status', payload: '{ roomId: string, isMicOn: boolean, isCamOn: boolean, isHandRaised: boolean, currentTask?: string }', desc: 'Cập nhật trạng thái Micro, Camera, Giơ tay hoặc Nhiệm vụ trọng tâm của cá nhân' },
    { event: 'room:update_goal', payload: '{ roomId: string, goal: { title: string, targetMinutes: number, completedMinutes: number } }', desc: 'Cập nhật mục tiêu học tập cá nhân trong phòng' },
    { event: 'room:pomodoro_action', payload: '{ roomId: string, action: "START" | "PAUSE" | "RESUME" | "RESET" | "SKIP" }', desc: 'Chủ phòng (Host) điều khiển chu kỳ đồng hồ Pomodoro' },
    { event: 'room:kudos', payload: '{ roomId: string, toUserId: string, reactionType: string }', desc: 'Gửi tương tác động viên / tiếp lửa / thả tim (Được server throttle gom nhóm 1.5s/lần)' },
    { event: 'room:chat_message', payload: '{ roomId: string, message: { text: string, senderName: string, senderAvatar?: string } }', desc: 'Gửi tin nhắn trò chuyện (Tự động drop nếu phòng đang ở phase FOCUS; slow-mode 5s trong phase BREAK)' },
    { event: 'room:webrtc_signal', payload: '{ roomId: string, targetUserId: string, signalData: any, type: "offer"|"answer"|"ice-candidate" }', desc: 'Chuyển tiếp gói tin tín hiệu WebRTC P2P Mesh kết nối Camera / Audio' },
    { event: 'room:kick_user', payload: '{ roomId: string, targetUserId: string, reason?: string }', desc: 'Chủ phòng (Host) kích thành viên vi phạm ra khỏi phòng' },
    { event: 'room:update_settings', payload: '{ roomId: string, settings: { isPrivate?: boolean, maxMembers?: number, allowChatInFocus?: boolean, defaultPomodoroConfig?: any } }', desc: 'Chủ phòng cập nhật cấu hình phòng học' },
    { event: 'disconnect', payload: 'None', desc: 'Sự kiện Socket ngắt kết nối do rớt mạng hoặc đóng tab (Hệ thống tự dọn Participant sau grace period)' }
  ],
  serverToClient: [
    { event: 'room:snapshot', payload: '{ roomId: string, roomInfo: any, participants: Participant[], timerState: PomodoroState, energyCounter: number, hostId: string }', desc: 'Gửi toàn bộ snapshot trạng thái phòng khi người dùng mới kết nối thành công' },
    { event: 'room:user_joined', payload: '{ user: Participant }', desc: 'Delta broadcast cho cả phòng khi có một thành viên mới tham gia' },
    { event: 'room:user_left', payload: '{ userId: string, reason?: string }', desc: 'Delta broadcast khi có một thành viên rời khỏi phòng' },
    { event: 'room:user_meet_status', payload: '{ userId: string, isMicOn: boolean, isCamOn: boolean, isHandRaised: boolean, currentTask?: string }', desc: 'Delta broadcast trạng thái Mic/Cam/Giơ tay/Nhiệm vụ của một thành viên' },
    { event: 'room:user_goal_updated', payload: '{ userId: string, goal: any }', desc: 'Delta broadcast mục tiêu học tập mới của một thành viên' },
    { event: 'room:pomodoro_state', payload: '{ phase: "FOCUS"|"BREAK"|"PAUSED", serverTimeNow: number, endTimeUTC: number, cycleCount: number, isPaused: boolean }', desc: 'Đồng bộ đồng hồ Pomodoro theo Timestamp (Không bắn mỗi giây)' },
    { event: 'room:kudos_batched', payload: '{ batchReactions: Array<{ fromUserId: string, toUserId: string, type: string, count: number }>, roomEnergyTotal: number }', desc: 'Broadcast danh sách tương tác tiếp lửa đã gom nhóm sau chu kỳ 1.5s' },
    { event: 'room:chat_message', payload: '{ id: string, userId: string, userName: string, userAvatar?: string, text: string, timestamp: number }', desc: 'Broadcast tin nhắn chat đến tất cả thành viên trong phòng' },
    { event: 'room:webrtc_signal', payload: '{ fromUserId: string, signalData: any, type: string }', desc: 'Chuyển tiếp gói tin WebRTC từ người gửi đến người nhận đích danh' },
    { event: 'room:kicked', payload: '{ reason: string }', desc: 'Gửi riêng cho người bị kích để thông báo và điều hướng ra khỏi phòng' },
    { event: 'room:user_kicked', payload: '{ kickedUserId: string, reason?: string }', desc: 'Broadcast cho cả phòng biết thành viên nào vừa bị mời ra' },
    { event: 'room:settings_updated', payload: '{ settings: any }', desc: 'Broadcast cấu hình phòng mới cập nhật cho tất cả thành viên' },
    { event: 'room:error', payload: '{ code: string, message: string }', desc: 'Báo lỗi socket (Không có quyền host, phòng đầy, vi phạm slow-mode...)' }
  ]
};

// ==========================================
// 4. FRONTEND VIEWS & MODALS
// ==========================================
function findComponentsInDir(dir, pattern) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const items = fs.readdirSync(d, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(d, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
        if (pattern.test(item.name)) {
          results.push({ name: item.name, path: full.replace(/\\/g, '/') });
        }
      }
    }
  }
  walk(dir);
  return results;
}

const allModals = findComponentsInDir('src', /modal/i);
const allDrawers = findComponentsInDir('src', /drawer/i);
const allViews = findComponentsInDir('src', /view/i);

// ==========================================
// 5. BACKGROUND PROCESSES & EXTERNAL SERVICES
// ==========================================
const backgroundServices = [
  {
    name: 'Backend Cron Engine Service',
    file: 'src/backend/services/cronEngineService.ts',
    trigger: '24/7 background interval loop (quét mỗi phút)',
    purpose: 'Tự động kiểm tra và thực thi các Automation Rules: nhắc việc tự động, tổng kết tài chính cuối ngày, hạ hạng streak nếu không học, tạo recurring transactions, dọn dẹp tokens hết hạn.'
  },
  {
    name: 'Email Outbox Queue Worker',
    file: 'src/backend/services/emailQueueService.ts',
    trigger: 'Background loop (quét outbox mỗi 30 giây)',
    purpose: 'Gửi email bất đồng bộ qua SMTP / Gmail OAuth: xác minh email, khôi phục mật khẩu, thông báo lớp học, thông báo nạp/rút tiền affiliate, hóa đơn đăng ký gói PRO/TEAM.'
  },
  {
    name: 'Classroom Reminder Loop',
    file: 'src/backend/services/classroomReminderService.ts (hoặc serverMain init)',
    trigger: 'Interval loop (quét mỗi 60 giây)',
    purpose: 'Gửi thông báo và email trước 15 phút khi lớp học Online (Classroom) sắp diễn ra, đồng bộ lịch qua Google Calendar API.'
  },
  {
    name: 'General Background Worker Service',
    file: 'src/backend/services/workerService.ts',
    trigger: 'Interval loop (quét mỗi 300 giây / 5 phút)',
    purpose: 'Xử lý các tác vụ nền định kỳ: dọn dẹp phiên đăng nhập rác (expired sessions), tổng hợp phân tích tính năng (FeatureAnalyticsSummary), kiểm tra trạng thái thanh toán webhook quá hạn.'
  },
  {
    name: 'Schedule & In-App Notification Schedulers',
    file: 'src/backend/services/notificationService.ts / clientScheduler',
    trigger: 'Background intervals (30s - 60s)',
    purpose: 'Kiểm tra ScheduleBlock, Reminder, Task dueDate để phát thông báo đẩy In-App và Notification Bell cho người dùng.'
  },
  {
    name: 'High-Scale Study Room RAM State Manager & WAL Batcher',
    file: 'src/backend/realtime/highScaleRoomManager.ts',
    trigger: 'In-Memory State + Focus Cycle End DB Sync',
    purpose: 'Quản lý 100-500+ participants trên RAM (Map), đồng bộ Pomodoro timestamp, batch broadcast tim/tiếp lửa mỗi 1.5s, chỉ ghi DB SQLite (WAL) khi kết thúc phiên Focus.'
  },
  {
    name: 'Cloudflare R2 Cloud Storage Presigner',
    file: 'src/backend/services/r2StorageService.ts',
    trigger: 'Theo yêu cầu upload file / avatar / tài liệu đính kèm',
    purpose: 'Tạo S3 presigned URL bảo mật để trình duyệt upload trực tiếp lên Cloudflare R2 bucket, bypass server Node.js để không tốn băng thông.'
  },
  {
    name: 'Google OAuth 2.0 & Google Calendar API',
    file: 'src/backend/services/googleCalendarService.ts & authRouter',
    trigger: 'OAuth Flow & Lịch học',
    purpose: 'Đăng nhập Google Sign-In một chạm và tự động tạo sự kiện học trên Google Calendar của sinh viên.'
  },
  {
    name: 'Cloudflare Edge Worker & Reverse Proxy',
    file: 'src/cloudflare/worker.ts & nginx.conf',
    trigger: 'Mọi request từ Internet tới tên miền public',
    purpose: 'Cloudflare SSL/TLS, DDoS protection, CDN cache tài sản tĩnh (Vite build assets), và proxy WebSocket / REST API tới Node.js backend.'
  }
];

fs.writeFileSync('scripts/stage0_extracted_inventory.json', JSON.stringify({
  modelCount: models.length,
  enumCount: enums.length,
  models,
  enums,
  endpointCount: allEndpoints.length,
  endpoints: allEndpoints,
  socketEvents,
  views: allViews,
  allModals,
  allDrawers,
  backgroundServices
}, null, 2));

console.log('Successfully extracted inventory data!');
console.log(`- Models: ${models.length}`);
console.log(`- Enums: ${enums.length}`);
console.log(`- REST Endpoints: ${allEndpoints.length}`);
console.log(`- Client Socket Events: ${socketEvents.clientToServer.length}`);
console.log(`- Server Socket Events: ${socketEvents.serverToClient.length}`);
console.log(`- Background Services: ${backgroundServices.length}`);
console.log(`- Views: ${allViews.length}`);
console.log(`- Modals: ${allModals.length}`);
console.log(`- Drawers: ${allDrawers.length}`);
