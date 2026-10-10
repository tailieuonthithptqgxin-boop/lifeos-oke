/**
 * Scope Guard & Adaptive Dynamic Knowledge Engine for AI Study Companion
 * Strictly enforces relevant scope (LifeOS features & Study/Learning topics).
 * Prevents hallucination of non-existent features and rejects off-topic queries gracefully.
 * 
 * Features:
 * - Multi-Intent Analysis (How-To, Pro-Tips, Troubleshooting, Comparison, Real-world Scenarios)
 * - Session-Based Angle Rotation (Prevents repetitive answers across consecutive queries)
 * - Persona Voice Modulation (Tailors responses according to each character's unique personality)
 * - Proactive Follow-up Actions (Always offers next steps, never passive or dead-ended)
 */

import { CompanionCharacterProfile } from './characterRegistry';

export type QueryIntentCategory = 
  | 'APP_HELP'           // Questions about using LifeOS features, billing, settings
  | 'STUDY_SUPPORT'      // Questions about learning, vocab, pomodoro, motivation, habits
  | 'OFF_TOPIC'          // Irrelevant trivia, outside world, unrelated tech, random banter
  | 'NON_EXISTENT_FEATURE'; // Questions asking for fake features LifeOS doesn't have

export type DetailedIntentType =
  | 'HOW_TO'             // "Làm sao", "Cách dùng", "Hướng dẫn thao tác"
  | 'PRO_TIPS'           // "Mẹo", "Bí quyết", "Tối ưu hóa", "Nhanh nhất"
  | 'TROUBLESHOOT'       // "Sự cố", "Lỗi", "Nếu bị...", "Không chạy", "Quên"
  | 'COMPARISON'         // "Khác nhau giữa", "So sánh", "Nên chọn cái nào"
  | 'SCENARIO'           // "Ví dụ", "Kịch bản thực tế", "Tình huống áp dụng"
  | 'GENERAL';

export interface ScopeEvaluationResult {
  isAllowed: boolean;
  category: QueryIntentCategory;
  detailedIntent?: DetailedIntentType;
  response: string;
  suggestedActionView?: string;
  roleHint?: 'STUDY_COMPANION' | 'APP_ASSISTANT';
}

/**
 * Real LifeOS Knowledge Base: Validated modules, views, and workflows
 */
export const LIFEOS_OFFICIAL_FEATURES = [
  'dashboard',           // Tổng quan
  'study',               // Study OS, Vocabulary Master (3000 từ tiếng Anh, 10.000 từ HSK tiếng Trung, Spaced Repetition)
  'focus',               // Focus Pomodoro (25/5, 50/10, lofi sound, log)
  'tasks',               // Quản lý nhiệm vụ, Kanban board, ưu tiên
  'calendar',            // Lịch biểu, time blocking
  'finance',             // Quản lý tài chính cá nhân, thu chi, ngân sách, báo cáo
  'habits',              // Habit Tracker, chuỗi streak hàng ngày
  'goals',               // Mục tiêu, OKRs, milestones
  'notes',               // Ghi chú học tập, tài liệu
  'decision',            // Decision Engine, ma trận quyết định trọng số
  'automation',          // Động cơ tự động hóa, quy tắc trigger-action
  'account',             // Cài đặt tài khoản, hồ sơ, backup data, companion settings
  'subscription',        // Gói hội viên: Free, Pro, Team, Lifetime
  'checkout',            // Quét mã QR thanh toán VietQR / MoMo
  'admin'                // Quản trị viên: duyệt kích hoạt, cập nhật QR
] as const;

/**
 * List of typical non-existent features to explicitly catch and refute
 */
const KNOWN_NON_EXISTENT_KEYWORDS = [
  'đặt vé máy bay', 'mua vé máy bay', 'flight booking',
  'gọi xe', 'đặt xe', 'grab', 'uber', 'taxi',
  'giao đồ ăn', 'order đồ ăn', 'food delivery', 'mua trà sữa',
  'chứng khoán phái sinh', 'sàn crypto', 'đào bitcoin',
  'hẹn hò', 'tinder', 'tìm người yêu',
  'xem phim chiếu rạp', 'mua vé xem phim'
];

/**
 * Off-topic signals (completely outside study, productivity, and LifeOS)
 */
const OFF_TOPIC_REGEX = [
  /thời tiết (hôm nay|ngày mai|ở đâu|tại)/i,
  /chính trị|bầu cử tổng thống|chiến tranh thế giới/i,
  /giải trí showbiz|scandal|người mẫu|diễn viên/i,
  /viết code|lập trình|c\+\+|java spring|unity|flappy bird|hack|game/i,
  /công thức nấu|nấu (phở|bún chả|lẩu|bánh)/i,
  /tử vi|bói toán|cung hoàng đạo/i
];

export class CompanionScopeGuard {
  // Session memory for rotation: prevents consecutive identical responses on the same topic
  private topicRotationMap: Map<string, number> = new Map();

  private getNextAngleIndex(topicKey: string, totalAngles: number): number {
    const current = this.topicRotationMap.get(topicKey) || 0;
    const next = (current + 1) % totalAngles;
    this.topicRotationMap.set(topicKey, next);
    return current;
  }

  /**
   * Identifies user's specific conversational intent
   */
  private detectDetailedIntent(text: string): DetailedIntentType {
    if (text.includes('mẹo') || text.includes('bí quyết') || text.includes('tối ưu') || text.includes('nhanh hơn') || text.includes('kinh nghiệm')) {
      return 'PRO_TIPS';
    }
    if (text.includes('lỗi') || text.includes('nếu bị') || text.includes('không chạy') || text.includes('sự cố') || text.includes('quên') || text.includes('thất bại')) {
      return 'TROUBLESHOOT';
    }
    if (text.includes('khác nhau') || text.includes('so sánh') || text.includes('nên chọn') || text.includes('hay là') || text.includes('vs')) {
      return 'COMPARISON';
    }
    if (text.includes('ví dụ') || text.includes('tình huống') || text.includes('kịch bản') || text.includes('thực tế')) {
      return 'SCENARIO';
    }
    if (text.includes('làm sao') || text.includes('cách') || text.includes('hướng dẫn') || text.includes('thế nào') || text.includes('bước')) {
      return 'HOW_TO';
    }
    return 'GENERAL';
  }

  /**
   * Applies personality tone and formatting wrappers
   */
  private applyPersonaTone(content: string, character: CompanionCharacterProfile): string {
    switch (character.id) {
      case 'bunny':
        return `🐰 **${character.name} đã sẵn sàng tiếp lửa cùng bạn!**\n\n${content}\n\n👉 *${character.sampleQuotes.study}* 🥕⚡`;
      case 'cat':
        return `🐱 **Góc nhìn Deep Work từ ${character.name}:**\n\n${content}\n\n🌙 *${character.tagline}*`;
      case 'bear':
        return `🐻 **${character.name} đồng hành kiên định cùng bạn:**\n\n${content}\n\n🛡️ *${character.sampleQuotes.study}* 🍯`;
      case 'fox':
        return `🦊 **Chiến lược tối ưu từ ${character.name}:**\n\n${content}\n\n💡 *${character.tagline}* 📖`;
      case 'panda':
        return `🐼 **${character.name} chia sẻ nhẹ nhàng:**\n\n${content}\n\n🎋 *${character.tagline}* ~`;
      case 'lumi':
      default:
        return `⭐ **${character.name} luôn ở đây thắp sáng cho bạn:**\n\n${content}\n\n✨ *${character.sampleQuotes.study}*`;
    }
  }

  /**
   * Evaluates a user query and returns structured classification and response
   */
  evaluate(
    query: string, 
    character: CompanionCharacterProfile,
    currentView: string
  ): ScopeEvaluationResult {
    const text = query.trim().toLowerCase();
    const detailedIntent = this.detectDetailedIntent(text);

    // 1. Check for questions asking for non-existent features
    for (const kw of KNOWN_NON_EXISTENT_KEYWORDS) {
      if (text.includes(kw)) {
        return {
          isAllowed: false,
          category: 'NON_EXISTENT_FEATURE',
          detailedIntent: 'TROUBLESHOOT',
          roleHint: 'APP_ASSISTANT',
          response: `${character.name} xin phép thông báo là LifeOS hiện **không có tính năng "${kw}"** bạn nhé! 

Hệ thống LifeOS là nền tảng tối ưu hóa học tập và cuộc sống cá nhân, tập trung vào:
- **Study OS & Vocabulary Master:** Ôn 3.000 từ tiếng Anh & 10.000 từ HSK tiếng Trung với Spaced Repetition.
- **Focus Pomodoro:** Tập trung sâu không xao nhãng.
- **Quản lý toàn diện:** Nhiệm vụ (Tasks), Tài chính (Finance), Thói quen (Habits), Mục tiêu (Goals).

Bạn có muốn mình hướng dẫn sử dụng các tính năng có sẵn này không? ⭐`
        };
      }
    }

    // 2. Check for off-topic queries
    for (const regex of OFF_TOPIC_REGEX) {
      if (regex.test(text)) {
        return {
          isAllowed: false,
          category: 'OFF_TOPIC',
          detailedIntent: 'GENERAL',
          roleHint: 'STUDY_COMPANION',
          response: `Chào bạn, mình là **${character.name}** (${character.title})! 

Mình chỉ chuyên đồng hành cùng bạn trong **học tập, rèn luyện thói quen** và **hướng dẫn sử dụng hệ thống LifeOS** thôi nè. Các chủ đề ngoài lề như vậy mình xin phép không thảo luận để giúp bạn giữ trọn sự tập trung cao độ nhé! 🌸

Bây giờ bạn muốn chúng mình cùng:
1. Tiếp tục ôn từ vựng với **Spaced Repetition**?
2. Bật một phiên **Focus Pomodoro** 25 phút?
3. Hay kiểm tra lại danh sách **Nhiệm vụ hôm nay**?`
        };
      }
    }

    // 3. Check for general short greetings
    if (/^(hi|hello|chào|hé lô|chào bạn|alo|hey)\b/i.test(text)) {
      return {
        isAllowed: true,
        category: 'STUDY_SUPPORT',
        detailedIntent: 'GENERAL',
        roleHint: 'STUDY_COMPANION',
        response: `${character.greeting} Bạn đang ở màn hình **${this.getFriendlyViewName(currentView)}**, bạn cần mình đồng hành học tập hay hỗ trợ thao tác gì trong app nè?`
      };
    }

    // 4. Check for App Help intent (navigation, payment, settings, features)
    const appHelpKeywords = [
      'gói', 'mua', 'nâng cấp', 'thanh toán', 'qr', 'vietqr', 'momo', 'pro', 'team', 'lifetime',
      'tính năng', 'cách dùng', 'ở đâu', 'làm sao', 'cài đặt', 'đổi nhân vật', 'sao lưu', 'backup',
      'nhiệm vụ', 'kanban', 'ngân sách', 'thu chi', 'ma trận', 'tự động hóa', 'admin', 'tài khoản'
    ];
    const isAppHelp = appHelpKeywords.some(kw => text.includes(kw));

    if (isAppHelp) {
      const rawHelp = this.generateDynamicAppHelpResponse(text, detailedIntent, character, currentView);
      return {
        isAllowed: true,
        category: 'APP_HELP',
        detailedIntent,
        roleHint: 'APP_ASSISTANT',
        response: this.applyPersonaTone(rawHelp, character)
      };
    }

    // 5. Default to Study Support intent
    const rawStudy = this.generateDynamicStudySupportResponse(text, detailedIntent, character, currentView);
    return {
      isAllowed: true,
      category: 'STUDY_SUPPORT',
      detailedIntent,
      roleHint: 'STUDY_COMPANION',
      response: this.applyPersonaTone(rawStudy, character)
    };
  }

  private getFriendlyViewName(view: string): string {
    const map: Record<string, string> = {
      dashboard: 'Bảng Điều Khiển Tổng Quan',
      study: 'Study OS & Từ Vựng',
      focus: 'Focus Pomodoro',
      tasks: 'Nhiệm Vụ & Kanban',
      calendar: 'Lịch Biểu',
      finance: 'Quản Lý Tài Chính',
      habits: 'Thói Quen Hàng Ngày',
      goals: 'Mục Tiêu & OKRs',
      notes: 'Ghi Chú Học Tập',
      decision: 'Ma Trận Quyết Định',
      automation: 'Tự Động Hóa',
      subscription: 'Gói Hội Viên',
      checkout: 'Thanh Toán',
      account: 'Cài Đặt Tài Khoản',
      admin: 'Quản Trị Viên'
    };
    return map[view] || 'LifeOS';
  }

  /**
   * Multi-Perspective Dynamic App Help Generator with Rotation & Intent Adaptation
   */
  private generateDynamicAppHelpResponse(
    query: string,
    intent: DetailedIntentType,
    character: CompanionCharacterProfile,
    currentView: string
  ): string {
    const q = query.toLowerCase();

    // -------------------------------------------------------------
    // 1. AUTOMATION ENGINE / QUY TẮC TỰ ĐỘNG (10 tabs, rotation angles)
    // -------------------------------------------------------------
    if (q.includes('tự động') || q.includes('automation') || q.includes('quy tắc') || q.includes('trigger') || q.includes('action')) {
      const angle = intent === 'PRO_TIPS' ? 1 
                  : intent === 'SCENARIO' ? 2 
                  : intent === 'TROUBLESHOOT' ? 3 
                  : this.getNextAngleIndex('automation', 4);

      if (angle === 1 || intent === 'PRO_TIPS') {
        return `💡 **Mẹo Tối Ưu Hóa Khi Thiết Lập Quy Tắc Tự Động (Automation Pro Tips):**
1. **Dùng Phòng Giả Lập (Tab Simulation):** Trước khi bật một quy tắc chạy ngầm, hãy sang tab *Simulation* để chạy thử dry-run với dữ liệu giả lập, xem trigger có bắt đúng điều kiện hay không.
2. **Luôn đặt Cooldown Frequency:** Tránh để lặp lại vô tận bằng cách cấu hình hồi chiêu (*once_per_hour* hoặc *once_per_day*).
3. **Phân cấp độ nhạy cảm (Sensitivity):** Với các quy tắc tài chính hoặc xóa dữ liệu, hãy đặt độ nhạy *High* để hệ thống chuyển vào tab *Approvals* chờ bạn bấm duyệt tay thay vì tự chạy ngầm.
4. **Kiểm tra tab Conflicts định kỳ:** Thuật toán sẽ tự cảnh báo nếu bạn vô tình tạo 2 quy tắc đối nghịch nhau.`;
      }

      if (angle === 2 || intent === 'SCENARIO') {
        return `🌟 **3 Kịch Bản Tự Động Hóa Thực Tế Cực Kỳ Hữu Ích:**
- **Kịch bản 1 (Học tập):** *Khi chuỗi Streak thói quen đạt mốc 7 ngày* $\\to$ Tự động tạo một Task *"Thưởng cho bản thân một buổi thư giãn"* và bắn thông báo chúc mừng!
- **Kịch bản 2 (Tập trung & Công việc):** *Khi hoàn thành 1 phiên Focus Pomodoro 50 phút* $\\to$ Tự động chuyển trạng thái của nhiệm vụ đang liên kết sang *"Đang làm"* và ghi nhận số giờ thực tế.
- **Kịch bản 3 (Tài chính):** *Khi tổng chi tiêu tháng đạt 80% hạn mức ngân sách* $\\to$ Bắn thông báo cảnh báo vàng và đề xuất kiểm tra danh mục chi tiêu vượt mức.`;
      }

      if (angle === 3 || intent === 'TROUBLESHOOT') {
        return `🔧 **Xử Lý Sự Cố Khi Quy Tắc Tự Động Không Kích Hoạt:**
1. **Kiểm tra công tắc kích hoạt:** Vào tab *Rules*, đảm bảo nút toggle của quy tắc đang ở trạng thái BẬT (màu xanh).
2. **Kiểm tra tab Approvals:** Nếu quy tắc có độ nhạy cảm cao, hệ thống đang giữ lệnh ở hàng đợi duyệt để chờ bạn xác nhận.
3. **Soi nhật ký thực thi (Tab History):** Mở tab *History*, tìm dòng log gần nhất để xem:
   - Điều kiện nào (Conditions) bị trả về FALSE.
   - Có bị giới hạn bởi thời gian hồi (Cooldown) hay không.
4. **Kiểm tra tab Conflicts:** Xem quy tắc có bị tạm khóa do xung đột logic với một quy tắc khác không.`;
      }

      // Default Angle 0: Step-by-step Builder & 10 tabs overview
      return `Hướng dẫn chi tiết về **Động Cơ Tự Động Hóa (Automation Engine)** trong LifeOS:

Hệ thống gồm **10 tab chuyên biệt**:
1. **Dashboard:** Tổng quan KPI số quy tắc đang chạy, tỷ lệ thực thi thành công và nhật ký gần nhất.
2. **Danh sách quy tắc (Rules):** Xem toàn bộ quy tắc, bật/tắt công tắc kích hoạt, sao chép hoặc xóa.
3. **Trình tạo quy tắc (Builder):** Thiết lập quy tắc mới qua 5 bước chuẩn kỹ thuật:
   - *Bước 1 (Thông tin):* Đặt tên, chọn Module (Task, Finance, Habit, Focus, Goal, Project, Study) và mức độ nhạy cảm.
   - *Bước 2 (Trigger):* Chọn sự kiện kích hoạt (Khi đổi trạng thái Task, Khi thêm chi tiêu, Khi check Thói quen, Khi hoàn thành Focus, hoặc Lịch định kỳ).
   - *Bước 3 (Điều kiện):* Thiết lập nhóm điều kiện AND/OR (Ví dụ: Số tiền chi > 500.000đ HOẶC Ưu tiên = "Cao").
   - *Bước 4 (Action):* Hành động thực thi (Gửi thông báo, Tạo Task mới, Đổi trạng thái, Tạo giao dịch, Ghi log audit).
   - *Bước 5 (An toàn):* Đặt thời gian hồi (Cooldown) chống spam vòng lặp vô tận và chọn có cần duyệt tay (Approval) hay không.
4. **Mẫu có sẵn (Templates):** Cài đặt 1-chạm các kịch bản phổ biến (Nhắc task quá hạn, Tự động phân bổ ngân sách...).
5. **Hàng đợi phê duyệt (Approvals):** Duyệt các quy tắc nhạy cảm cao trước khi hệ thống chạy thực tế.
6. **Phòng giả lập (Simulation):** Chạy thử (Dry-run) với dữ liệu giả định để kiểm tra logic trước khi kích hoạt.
7. **Lịch trình (Scheduled):** Xem lịch chạy định kỳ của các tác vụ tự động.
8. **Phân tích (Analytics):** Biểu đồ đo lường hiệu suất và tần suất kích hoạt.
9. **Nhật ký (History):** Tra cứu audit log chi tiết từng lần chạy (thời gian, input, output, thành công/thất bại).
10. **Xung đột (Conflicts):** Tự động phát hiện nếu 2 quy tắc đối nghịch nhau gây xung đột dữ liệu.`;
    }

    // -------------------------------------------------------------
    // 2. TASKS / QUẢN LÝ NHIỆM VỤ (Kanban, List, High Risk, Timers)
    // -------------------------------------------------------------
    if (q.includes('nhiệm vụ') || q.includes('task') || q.includes('kanban') || q.includes('subtask') || q.includes('rủi ro') || q.includes('deadline')) {
      const angle = intent === 'PRO_TIPS' ? 1 
                  : intent === 'COMPARISON' ? 2 
                  : intent === 'TROUBLESHOOT' ? 3 
                  : this.getNextAngleIndex('tasks', 4);

      if (angle === 1 || intent === 'PRO_TIPS') {
        return `💡 **Bí Quyết Quản Lý Nhiệm Vụ Đỉnh Cao Trên LifeOS:**
1. **Quy tắc 3 MIT (Most Important Tasks):** Mỗi sáng, chỉ gắn nhãn ưu tiên *Cao (High)* cho tối đa 3 nhiệm vụ quan trọng nhất.
2. **Kích hoạt Live Timer trực tiếp:** Nhấp vào nút Play ⏱️ trên task khi bắt đầu làm để theo dõi thời gian thực tế so với thời gian ước tính.
3. **Phân rã thành Subtasks < 30 phút:** Khi một task lớn khiến bạn trì hoãn, hãy mở chi tiết task và tạo 3-5 subtask nhỏ. Hoàn thành từng việc nhỏ sẽ tạo đà tâm lý rất tốt!
4. **Theo dõi cờ Rủi ro đỏ (High Risk):** Ưu tiên giải quyết ngay các task bị gắn cờ đỏ vì đó là những việc quá hạn hoặc khối lượng lớn sắp chạm deadline.`;
      }

      if (angle === 2 || intent === 'COMPARISON') {
        return `⚖️ **So Sánh Chế Độ Danh Sách (List View) và Bảng Kanban:**
- **Dạng Danh Sách (List View):**
  * *Phù hợp khi:* Muốn quét nhanh danh sách theo hạn chót (Deadline), xem số giờ ước tính, lọc nhanh các task trong ngày.
  * *Thao tác nhanh:* Tích chọn checkbox để hoàn thành ngay, tìm kiếm nhanh theo từ khóa.
- **Bảng Kanban (Kanban Board):**
  * *Phù hợp khi:* Muốn quản lý luồng công việc trực quan (Workflow), theo dõi tiến độ từ *Chưa làm $\\to$ Đang làm $\\to$ Đang chờ $\\to$ Hoàn thành*.
  * *Thao tác kéo thả:* Kéo thả trực tiếp thẻ nhiệm vụ giữa các cột trạng thái.`;
      }

      if (angle === 3 || intent === 'TROUBLESHOOT') {
        return `🚨 **Làm Gì Khi Nhiệm Vụ Bị Quá Hạn Hoặc Dồn Ứ Quá Nhiều?**
1. **Lọc trạng thái rủi ro:** Hệ thống tự động gom các task quá hạn vào danh sách cảnh báo.
2. **Áp dụng Nguyên lý Ma trận Eisenhower:**
   - Việc *Khẩn cấp & Quan trọng*: Giải quyết đầu tiên trong phiên Pomodoro hôm nay.
   - Việc *Quan trọng nhưng không khẩn*: Lên lại lịch (Reschedule) sang ngày mai, đừng để dồn ngày cũ.
   - Việc *Không quan trọng*: Chuyển trạng thái sang *"Đang chờ"* hoặc *"Hủy"*.
3. **Đính kèm tài liệu tóm tắt:** Đính kèm file qua Cloudflare R2 để khi mở lại task bạn nắm ngay ngữ cảnh mà không phải tìm kiếm lại.`;
      }

      // Default Angle 0: Tasks comprehensive overview
      return `Hướng dẫn chi tiết về **Quản Lý Nhiệm Vụ (Tasks & Kanban)** trong LifeOS:

- **2 Chế độ hiển thị:** Chuyển đổi giữa **Dạng Danh Sách (List)** và **Bảng Kanban** bằng 2 nút ở góc trên bên phải.
- **5 Trạng thái chuẩn:** 
  1. *Chưa làm (To Do)* $\\to$ 2. *Đang làm (In Progress)* $\\to$ 3. *Đang chờ (Blocked/Waiting)* $\\to$ 4. *Hoàn thành (Done)* (hoặc *Hủy*). Trên Kanban bạn có thể kéo thả thẻ mượt mà giữa các cột.
- **4 Mức độ ưu tiên:** Thấp, Vừa, Cao, Nghiêm trọng.
- **Bộ đếm giờ trực tiếp (Task Timer):** Nhấp vào nút Play ⏱️ ngay trên thẻ nhiệm vụ để bắt đầu tính giờ làm việc thực tế (Actual Hours), nhấp Pause để dừng.
- **Nhiệm vụ con (Subtasks):** Mở chi tiết task $\\to$ Thêm danh sách việc con $\\to$ Đánh dấu hoàn thành từng mục để thanh tiến độ % tự động cập nhật.
- **Cảnh báo Rủi ro cao (High Risk):** Hệ thống tự động gắn nhãn cảnh báo đỏ nếu:
  1. Task đã bị quá hạn (Overdue).
  2. Task đến hạn hôm nay mà có mức ưu tiên là "Cao"/"Nghiêm trọng" hoặc thời gian dự kiến > 3 giờ.
- **Đính kèm tài liệu:** Hỗ trợ tải lên và tải xuống tài liệu trực tiếp thông qua Cloudflare R2 an toàn.`;
    }

    // -------------------------------------------------------------
    // 3. VOCABULARY MASTER & STUDY OS (8 tabs, SM-2, active recall)
    // -------------------------------------------------------------
    if (q.includes('từ vựng') || q.includes('hsk') || q.includes('3000') || q.includes('spaced repetition') || q.includes('flashcard') || q.includes('active recall') || q.includes('ôn tập')) {
      const angle = intent === 'PRO_TIPS' ? 1 
                  : intent === 'COMPARISON' ? 2 
                  : intent === 'TROUBLESHOOT' ? 3 
                  : this.getNextAngleIndex('vocab', 4);

      if (angle === 1 || intent === 'PRO_TIPS') {
        return `🧠 **Mẹo Ghi Nhớ 10.000 Từ Vựng Không Bị Quên (Spaced Repetition Pro Tips):**
1. **Đánh giá trung thực (Nút 1-4):**
   - Đừng ngại bấm nút *1 (Lại)* nếu bạn phải mất hơn 5 giây mới nhớ ra. Việc ôn lại sớm sẽ củng cố liên kết nơ-ron mạnh hơn gấp 3 lần việc tự đánh lừa là mình đã thuộc!
   - Chỉ bấm *4 (Dễ)* khi từ đó bật ra tức thì trong đầu bạn dưới 1 giây.
2. **Kỹ thuật Active Recall:** Hãy nhìn Hán tự/từ vựng, nhắm mắt tự đọc to Pinyin và nghĩa TRƯỚC KHI lật mặt sau của Flashcard.
3. **Học theo câu ví dụ ngữ cảnh:** Luôn đọc to câu ví dụ đi kèm để hiểu cách dùng từ trong câu thực tế, tránh học từ chết.`;
      }

      if (angle === 2 || intent === 'COMPARISON') {
        return `📚 **So Sánh Bộ 3000 Oxford và Kho 10.240 Từ HSK Tiếng Trung:**
- **Bộ 3000 Oxford (Tiếng Anh):**
  * Bao quát 85% ngữ cảnh giao tiếp, phim ảnh và báo chí hàng ngày.
  * Phân chia chuẩn theo khung tham chiếu châu Âu CEFR từ A1 (Căn bản) đến C1 (Chuyên sâu).
- **Kho 10.240 Từ HSK (Tiếng Trung):**
  * Bao quát toàn diện chuẩn HSK 1 đến HSK 6.
  * Tích hợp đồng thời: Hán tự Giản thể, Hán tự Phồn thể, Pinyin chuẩn thanh điệu, từ loại, nghĩa tiếng Việt và câu ví dụ ngữ cảnh chuẩn.
  * Đã qua quy trình kiểm định chất lượng nghiêm ngặt (Quality Audit).`;
      }

      if (angle === 3 || intent === 'TROUBLESHOOT') {
        return `🔍 **Làm Gì Khi Thấy Số Lượng Từ Cần Ôn Tập Hôm Nay Bị Quá Tải?**
1. **Vào tab "Học hôm nay":** Hệ thống đã tự động giới hạn và ưu tiên những từ sắp rơi vào đường cong quên lãng sâu nhất.
2. **Bật chế độ Focus Vocab:** Mở phiên học với đồng hồ Pomodoro 15 phút, giải quyết từng lượt 20 từ.
3. **Tận dụng tab "Kiểm định chất lượng (Audit)":** Nếu gặp từ vựng nghi ngờ phiên âm hoặc nghĩa chưa tự nhiên, bạn có thể kiểm tra trạng thái xác minh và đóng góp chỉnh sửa ngay tại tab này.`;
      }

      // Default Angle 0: 8 Tabs overview
      return `Hướng dẫn chi tiết về **Study OS & Vocabulary Master**:

Hệ thống gồm **8 tab chức năng chuyên sâu**:
1. **Tổng quan (Dashboard):** Thống kê số từ đã thuộc, số từ cần ôn hôm nay, tỷ lệ nhớ và chuỗi ngày học liên tục (Streak).
2. **Học hôm nay (Today Study):** Lập kế hoạch ngày gồm số từ mới mục tiêu + danh sách từ đến hạn ôn tập.
3. **Trí nhớ & Đường cong (Memory Curve):** Biểu đồ đường cong quên lãng Ebbinghaus phân loại từ theo cấp độ trí nhớ từ ngắn hạn đến dài hạn.
4. **3000 Từ thông dụng (Oxford 3000):** Dành cho tiếng Anh, phân loại từ A1 đến C1, có audio phát âm chuẩn và nút lưu vào bộ sưu tập cá nhân.
5. **Kho từ vựng HSK (10.240 từ):** Dành cho tiếng Trung từ HSK 1 đến HSK 6, hiển thị Hán tự giản thể, phồn thể, Pinyin, nghĩa tiếng Việt và câu ví dụ ngữ cảnh.
6. **Từ vựng cá nhân (Personal Vocab):** Thêm từ mới tự học, chỉnh sửa phiên âm, nghĩa, ví dụ, từ đồng nghĩa/trái nghĩa.
7. **Bộ sưu tập của tôi (Collections):** Tạo các album từ vựng theo chuyên ngành hoặc chủ đề riêng.
8. **Phiên học & Ôn tập (Study Session):** 
   - Hỗ trợ 3 chế độ: **Flashcard lật thẻ**, **Trắc nghiệm 4 đáp án**, **Luyện gõ chính tả**.
   - Đánh giá Spaced Repetition (SM-2):
     * *1 (Lại):* Chưa nhớ, ôn lại ngay trong phiên.
     * *2 (Khó):* Nhớ bập bõm, giãn khoảng cách ngắn (1-2 ngày).
     * *3 (Tốt):* Nhớ chuẩn xác, giãn khoảng cách chuẩn theo thuật toán.
     * *4 (Dễ):* Quá quen thuộc, tăng Ease Factor và giãn khoảng cách xa hơn.
9. **Kiểm định chất lượng (Audit):** Kiểm tra độ chính xác của Pinyin, thanh điệu, ngữ pháp câu ví dụ và quản lý trạng thái xác thực nội dung AI.`;
    }

    // -------------------------------------------------------------
    // 4. FINANCE / TÀI CHÍNH CÁ NHÂN (Transactions, Budgets, Analytics)
    // -------------------------------------------------------------
    if (q.includes('tài chính') || q.includes('chi tiêu') || q.includes('ngân sách') || q.includes('thu chi') || q.includes('tiết kiệm')) {
      const angle = intent === 'PRO_TIPS' ? 1 
                  : intent === 'SCENARIO' ? 2 
                  : this.getNextAngleIndex('finance', 3);

      if (angle === 1 || intent === 'PRO_TIPS') {
        return `💰 **Mẹo Quản Lý Tài Chính Cá Nhân Với Quy Tắc 50/30/20:**
1. **50% Nhu cầu thiết yếu (Needs):** Tiền trọ, ăn uống cơ bản, điện nước, xăng xe. Hãy đặt hạn mức ngân sách cứng cho nhóm này.
2. **30% Mong muốn linh hoạt (Wants):** Cafe, giải trí, mua sắm. Khi tab Ngân sách chuyển màu vàng (80%), hãy chủ động cắt giảm nhóm này trước!
3. **20% Tiết kiệm & Tích lũy (Savings):** Hãy chuyển tiền vào quỹ tiết kiệm ngay đầu tháng thay vì đợi đến cuối tháng mới tiết kiệm tiền thừa.`;
      }

      if (angle === 2 || intent === 'SCENARIO') {
        return `📊 **Quy Trình Quản Lý Chi Tiêu 1 Phút Mỗi Ngày:**
- **Mỗi khi có khoản chi:** Bấm **"Thêm giao dịch"** $\\to$ Chọn Chi tiền $\\to$ Nhập số tiền $\\to$ Chọn danh mục $\\to$ Bấm Lưu (chỉ mất 10 giây).
- **Cuối tuần:** Mở tab **Phân tích (Analytics)** để xem biểu đồ cơ cấu chi tiêu.
- **Cuối tháng:** Kiểm tra mức độ hoàn thành ngân sách tại tab **Ngân sách (Budgets)** để cân đối dòng tiền cho tháng tiếp theo.`;
      }

      return `Hướng dẫn chi tiết về **Quản Lý Tài Chính Cá Nhân (Finance)**:

- **Ghi nhận giao dịch (Transactions):**
  1. Nhấp **"Thêm giao dịch"**.
  2. Chọn loại: **Chi tiền (Expense)** hoặc **Thu tiền (Income)**.
  3. Nhập số tiền, chọn danh mục (Ăn uống, Học tập, Nhà ở, Mua sắm, Tiết kiệm...) và tài khoản thanh toán (Tiền mặt, Ngân hàng, Ví điện tử).
- **Hạn mức Ngân sách (Budgets):**
  - Thiết lập ngân sách tối đa cho từng nhóm chi tiêu trong tháng.
  - Hệ thống tự động đổi màu cảnh báo vàng khi đạt 80% và cảnh báo đỏ khi chạm 100% hạn mức.
- **Phân tích dòng tiền (Analytics):**
  - Xem biểu đồ thu nhập vs chi tiêu theo từng tháng.
  - Phân tích cơ cấu chi tiêu theo nguyên tắc vàng 50/30/20 (50% Thiết yếu - 30% Linh hoạt - 20% Tiết kiệm/Đầu tư).`;
    }

    // -------------------------------------------------------------
    // 5. DECISION ENGINE / MA TRẬN QUYẾT ĐỊNH
    // -------------------------------------------------------------
    if (q.includes('ma trận') || q.includes('quyết định') || q.includes('decision') || q.includes('trọng số')) {
      return `Hướng dẫn chi tiết về **Ma Trận Quyết Định (Decision Engine)**:

Phương pháp giúp bạn đưa ra lựa chọn lý tính khi phân vân giữa nhiều phương án:
1. **Bước 1:** Nhập các phương án lựa chọn cần so sánh (Ví dụ: Học tiếng Trung vs Học tiếng Anh; Chọn công việc A vs B).
2. **Bước 2:** Đưa ra các tiêu chí đánh giá (Ví dụ: Chi phí, Thời gian, Cơ hội phát triển, Mức độ yêu thích) và gán **Trọng số từ 1 đến 10** theo mức độ quan trọng.
3. **Bước 3:** Chấm điểm từng phương án theo từng tiêu chí (Thang điểm 1-10).
4. **Bước 4:** Hệ thống tự động tính **Điểm tổng có trọng số** ($Weighted\\ Score = \\sum Score \\times Weight$) và xếp hạng phương án tối ưu nhất, kèm biểu đồ trực quan giúp bạn quyết định không bị cảm xúc chi phối!`;
    }

    // -------------------------------------------------------------
    // 6. SUBSCRIPTION & PAYMENT / GÓI HỘI VIÊN & THANH TOÁN
    // -------------------------------------------------------------
    if (q.includes('gói') || q.includes('nâng cấp') || q.includes('thanh toán') || q.includes('qr') || q.includes('pro') || q.includes('team') || q.includes('momo') || q.includes('vietqr')) {
      return `Hướng dẫn chi tiết về **Gói Hội Viên & Thanh Toán QR**:

- **Các gói dịch vụ:**
  * *Gói Free:* Tính năng cơ bản.
  * *Gói Pro (Cá nhân):* Mở khóa toàn bộ 10.240 từ HSK tiếng Trung, Spaced Repetition không giới hạn, Focus Pomodoro nâng cao, đồng bộ dữ liệu.
  * *Gói Team (Đội nhóm):* Tối đa 5 thành viên, Admin quản trị thành viên, cấp mã mời (Invite Code).
  * *Gói Lifetime:* Sở hữu vĩnh viễn không cần gia hạn.
- **Quy trình thanh toán:**
  1. Vào menu **Gói Hội Viên** $\\to$ Bấm **Nâng Cấp**.
  2. Màn hình thanh toán sẽ tạo một **Mã VietQR động** chứa sẵn số tiền và nội dung chuyển khoản duy nhất (Ví dụ: \`DUOTECH ORD_...\`).
  3. Mở app ngân hàng hoặc MoMo $\\to$ Quét mã QR $\\to$ Xác nhận chuyển khoản (giữ nguyên nội dung chuyển khoản).
  4. Hệ thống sẽ tự động xác nhận và kích hoạt tài khoản trong vài phút!`;
    }

    // -------------------------------------------------------------
    // 7. COMPANION SETTINGS / TÙY CHỈNH BẠN ĐỒNG HÀNH
    // -------------------------------------------------------------
    if (q.includes('đổi nhân vật') || q.includes('cài đặt') || q.includes('yên tĩnh') || q.includes('âm thanh')) {
      return `Hướng dẫn tùy chỉnh **AI Study Companion**:
1. Nhấp vào icon bánh răng ⚙️ trên thanh công cụ của nhân vật (hoặc vào mục **Tài Khoản $\\to$ AI Study Companion**).
2. **Chọn 1 trong 6 nhân vật:** Lumi (Bé Sao), Bunny (Thỏ Ngọc), Miu (Mèo Thiền), Kuma (Gấu Nâu), Kitsu (Cáo Cam), Bao (Gấu Trúc).
3. **Chế độ tương tác:**
   - *Tiêu chuẩn (Normal):* Động viên 2-3 phút/lần.
   - *Yên tĩnh (Quiet):* Giãn chu kỳ 6-8 phút, tắt âm thanh, giữ không gian Deep Work.
   - *Tối giản (Minimal):* Chỉ chuyển động nền nhẹ, chỉ phản ứng khi có sự kiện quan trọng.
4. **Vị trí:** Chọn Góc dưới phải hoặc Góc dưới trái (trên mobile luôn tự động cách đáy 80px để không che menu).`;
    }

    // Default View Fallback
    return `Bạn đang ở màn hình **${this.getFriendlyViewName(currentView)}**.
- Để thao tác, bạn hãy sử dụng các tab và thanh công cụ chức năng ở phía trên màn hình.
- Bạn cần mình hướng dẫn chi tiết quy trình cụ thể nào ở màn hình này không? Hãy gõ câu hỏi cụ thể, mình sẽ hướng dẫn từng bước 1-2-3 nhé! ${character.avatarIcon}`;
  }

  /**
   * Multi-Perspective Dynamic Study Support Generator with Rotation & Intent Adaptation
   */
  private generateDynamicStudySupportResponse(
    query: string,
    intent: DetailedIntentType,
    character: CompanionCharacterProfile,
    currentView: string
  ): string {
    const q = query.toLowerCase();

    if (q.includes('spaced repetition') || q.includes('lặp lại ngắt quãng')) {
      const angle = this.getNextAngleIndex('study_sr', 3);
      if (angle === 1 || intent === 'PRO_TIPS') {
        return `🧠 **Nguyên Lý Não Bộ Của Spaced Repetition (Lặp Lại Ngắt Quãng):**
- **Tại sao lại hiệu quả?** Não người được lập trình để đào thải thông tin không được tái kích hoạt. Khi bạn ôn lại từ vào đúng thời điểm *sắp sửa quên*, nỗ lực gợi nhớ (retrieval effort) sẽ tạo ra một cú hích làm đường dẫn nơ-ron dày lên gấp bội.
- **Khoảng cách tối ưu:** 1 ngày $\\to$ 3 ngày $\\to$ 7 ngày $\\to$ 16 ngày $\\to$ 35 ngày...
- Mỗi lần bạn bấm "Dễ", thuật toán SM-2 sẽ nhân hệ số Ease Factor để kéo dài khoảng cách ôn tiếp theo.`;
      }
      if (angle === 2 || intent === 'SCENARIO') {
        return `📖 **Ví dụ Thực Tế Về Spaced Repetition Trong Study OS:**
- Hôm nay bạn học từ **"学习" (học tập)**.
- Ngày mai hệ thống đưa từ này vào danh sách *"Học hôm nay"*. Bạn nhớ tốt $\\to$ Bấm nút 3 (Tốt).
- 3 ngày sau hệ thống mới nhắc lại. Bạn vẫn nhớ $\\to$ Bấm nút 4 (Dễ).
- Lần tới bạn sẽ chỉ phải gặp lại từ này sau 10 ngày! Tiết kiệm 80% thời gian so với việc ngày nào cũng chép phạt từ vựng!`;
      }
      return `**Spaced Repetition (Lặp lại ngắt quãng)** là phương pháp vàng giúp bẻ gãy đường cong quên lãng của Ebbinghaus:
1. Bạn học một từ vựng mới hôm nay.
2. Hệ thống sẽ nhắc bạn ôn lại sau: 1 ngày $\\to$ 3 ngày $\\to$ 7 ngày $\\to$ 16 ngày $\\to$ 35 ngày...
3. Mỗi lần bạn trả lời "Dễ", khoảng cách sẽ giãn dài ra. Nếu bạn quên ("Lại"), hệ thống sẽ kéo từ đó về ôn sớm hơn.
Nhờ đó bạn chỉ mất ít thời gian nhưng ghi nhớ vĩnh viễn vào trí nhớ dài hạn! 🧠✨`;
    }

    if (q.includes('pomodoro') || q.includes('tập trung') || q.includes('xao nhãng')) {
      const angle = this.getNextAngleIndex('study_pomodoro', 3);
      if (angle === 1 || intent === 'PRO_TIPS') {
        return `🍅 **Mẹo Thực Chiến Pomodoro Để Không Bị Kiệt Sức:**
1. **Quy tắc "Một Tab Duy Nhất":** Trong 25 phút, chỉ mở đúng tài liệu đang học. Nếu nảy ra ý nghĩ khác (ví dụ: cần mua đồ), hãy ghi nhanh vào giấy nháp và quay lại làm việc ngay.
2. **Nghỉ 5 phút thật sự (Zero Screen):** Đừng lướt điện thoại trong 5 phút giải lao! Hãy đứng lên, nhìn xa ra cửa sổ, uống nước và hít thở sâu để mắt và não bộ hồi phục.
3. **Chọn chu kỳ phù hợp:** Dùng 25/5 cho bài học nhẹ/từ vựng; dùng 50/10 cho giải đề thi hoặc viết luận chuyên sâu.`;
      }
      return `Mẹo để có một phiên Pomodoro hoàn hảo cùng ${character.name}:
- **25 phút tập trung:** Đặt điện thoại ra xa, chỉ mở đúng 1 tab bài học cần làm.
- **5 phút nghỉ ngắn:** Rời khỏi màn hình, uống một ngụm nước, vươn vai thư giãn.
- Sau 4 chu kỳ 25 phút, bạn hãy tự thưởng cho mình một kỳ nghỉ dài 15-20 phút nhé! 🍅`;
    }

    if (q.includes('mệt') || q.includes('nản') || q.includes('áp lực') || q.includes('buồn')) {
      return `${character.sampleQuotes.mistake}
${character.sampleQuotes.rest}
Đừng quá khắt khe với bản thân hôm nay nhé. Học tập là cuộc chạy marathon chứ không phải chạy nước rút. ${character.name} luôn ở ngay đây cùng bạn! 🌸`;
    }

    // General supportive response
    return `${character.sampleQuotes.study}
Bạn đang làm rất tốt việc rèn luyện tính kỷ luật mỗi ngày. Có câu hỏi cụ thể nào về bài học hay tính năng app cần ${character.name} hỗ trợ thêm không nè? ⭐`;
  }
}

export const companionScopeGuard = new CompanionScopeGuard();
