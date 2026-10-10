/**
 * App-Aware AI Study Companion Brain
 * Unified cognitive engine for LifeOS: context enrichment, deictic resolution,
 * multi-level knowledge retrieval, anti-hallucination validation, and persona voice modulation.
 */

import { CompanionCharacterProfile, getCharacterProfile } from './characterRegistry';
import { 
  APP_OVERVIEW,
  ROUTE_KNOWLEDGE_MAP, 
  FEATURE_KNOWLEDGE_MAP, 
  ACTION_KNOWLEDGE_MAP, 
  WORKFLOW_KNOWLEDGE_MAP, 
  TROUBLESHOOTING_KNOWLEDGE_MAP 
} from './knowledge';
import { companionTelemetry } from './companionTelemetry';

export type CompanionRole = 'STUDY_COMPANION' | 'APP_ASSISTANT';

export interface ClickedElementContext {
  id?: string;
  label?: string;
  action?: string;
  role?: string;
  tabId?: string;
}

export interface UserStateContext {
  role?: 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'SUPER_ADMIN';
  subscriptionStatus?: 'FREE' | 'PRO' | 'TEAM' | 'EXPIRED';
  teamStatus?: { isOwner: boolean; memberCount: number; maxMembers: number };
  streakDays?: number;
  todayCompletedFocus?: number;
  vocabDueToday?: number;
}

export interface ChatHistoryTurn {
  sender: 'user' | 'companion';
  text: string;
  timestamp: number;
}

export interface CompanionUIContext {
  currentView: string;
  activeTab?: string;
  clickedElement?: ClickedElementContext;
  userState?: UserStateContext;
  conversationHistory?: ChatHistoryTurn[];
}

export interface ProcessedQueryResult {
  isAllowed: boolean;
  category: 'APP_HELP' | 'STUDY_SUPPORT' | 'OFF_TOPIC' | 'NON_EXISTENT_FEATURE';
  role: CompanionRole;
  text: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  actionView?: string;
  actionLabel?: string;
  suggestedFollowUps?: string[];
}

// Explicit non-existent feature list
const NON_EXISTENT_KEYWORDS: Array<{ keyword: string; displayName: string }> = [
  { keyword: 'gửi email hàng loạt', displayName: 'Gửi email hàng loạt (Bulk/Mass Email Campaign)' },
  { keyword: 'email marketing', displayName: 'Email Marketing' },
  { keyword: 'đặt vé máy bay', displayName: 'Đặt vé máy bay' },
  { keyword: 'mua vé máy bay', displayName: 'Đặt vé máy bay' },
  { keyword: 'gọi xe', displayName: 'Gọi xe công nghệ' },
  { keyword: 'đặt xe', displayName: 'Đặt xe' },
  { keyword: 'grab', displayName: 'Gọi xe Grab' },
  { keyword: 'giao đồ ăn', displayName: 'Giao đồ ăn' },
  { keyword: 'order đồ ăn', displayName: 'Đặt đồ ăn' },
  { keyword: 'mua trà sữa', displayName: 'Mua trà sữa' },
  { keyword: 'chứng khoán phái sinh', displayName: 'Giao dịch chứng khoán phái sinh' },
  { keyword: 'đào coin', displayName: 'Đào tiền ảo/Crypto' },
  { keyword: 'đào bitcoin', displayName: 'Đào Bitcoin' },
  { keyword: 'sàn crypto', displayName: 'Sàn Crypto' },
  { keyword: 'tìm người yêu', displayName: 'Hẹn hò / Tìm người yêu' },
  { keyword: 'tinder', displayName: 'Ứng dụng hẹn hò' }
];

const OFF_TOPIC_PATTERNS = [
  /thời tiết (hôm nay|ngày mai|ở đâu|tại|như thế nào)/i,
  /chính trị|bầu cử tổng thống|chiến tranh thế giới/i,
  /giải trí showbiz|scandal showbiz|người mẫu|diễn viên/i,
  /viết code (java|c\+\+|c#|python backend|spring boot|unity|flappy bird|hack)/i,
  /công thức nấu (phở|bún bò|bún chả|lẩu|bánh)/i,
  /tử vi|bói toán|cung hoàng đạo hôm nay/i
];

export class CompanionBrain {
  /**
   * Deictic Word Resolver:
   * Resolves indexical expressions like "nút này", "cái này", "ở đây", "nó", "tab này"
   * using current UI context and conversation history.
   */
  private resolveDeicticSubject(
    query: string, 
    context: CompanionUIContext
  ): { resolvedSubject: string; source: 'ELEMENT' | 'TAB' | 'VIEW' | 'HISTORY' | 'NONE' } {
    const q = query.toLowerCase();

    // Check for "nút này", "cái này", "chức năng này" with clicked element
    if (q.includes('nút này') || q.includes('nút này làm gì') || q.includes('chỗ này làm gì') || q.includes('nút đó')) {
      if (context.clickedElement) {
        if (context.clickedElement.action && ACTION_KNOWLEDGE_MAP[context.clickedElement.action]) {
          return { resolvedSubject: context.clickedElement.action, source: 'ELEMENT' };
        }
        if (context.clickedElement.label) {
          return { resolvedSubject: context.clickedElement.label, source: 'ELEMENT' };
        }
      }
      // If user asks "nút này làm gì" while looking at simulation in automation
      if (context.currentView === 'automation' && context.activeTab === 'simulation') {
        return { resolvedSubject: 'test_simulation', source: 'TAB' };
      }
    }

    // Check for "tab này", "phần này" with activeTab
    if (q.includes('tab này') || q.includes('tab mô phỏng') || q.includes('mô phỏng trong automation') || q.includes('tab')) {
      if (context.activeTab) {
        return { resolvedSubject: context.activeTab, source: 'TAB' };
      }
    }

    // Check for "trang này", "ở đây", "màn hình này"
    if (q.includes('trang này') || q.includes('màn hình này') || q.includes('chỗ này') || q.includes('ở đây làm gì')) {
      return { resolvedSubject: context.currentView, source: 'VIEW' };
    }

    // Check for pronouns like "nó", "cái đó" in conversation memory
    if (q.includes('nó') || q.includes('bật nó') || q.includes('dùng nó') || q.includes('ở đâu')) {
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        // Find last discussed topic in user or companion history
        for (let i = context.conversationHistory.length - 1; i >= 0; i--) {
          const prev = context.conversationHistory[i].text.toLowerCase();
          if (prev.includes('focus') || prev.includes('pomodoro')) {
            return { resolvedSubject: 'focus', source: 'HISTORY' };
          }
          if (prev.includes('từ vựng') || prev.includes('study') || prev.includes('hsk')) {
            return { resolvedSubject: 'study', source: 'HISTORY' };
          }
          if (prev.includes('nhiệm vụ') || prev.includes('task') || prev.includes('kanban')) {
            return { resolvedSubject: 'tasks', source: 'HISTORY' };
          }
          if (prev.includes('tự động') || prev.includes('automation')) {
            return { resolvedSubject: 'automation', source: 'HISTORY' };
          }
        }
      }
    }

    return { resolvedSubject: '', source: 'NONE' };
  }

  /**
   * Applies persona voice formatting and signature touch
   */
  private applyPersonaVoice(
    text: string, 
    character: CompanionCharacterProfile,
    role: CompanionRole
  ): string {
    const isCompanion = role === 'STUDY_COMPANION';

    switch (character.id) {
      case 'bunny':
        return isCompanion
          ? `🐰 **${character.name} cùng bạn bứt phá:**\n\n${text}\n\n🥕⚡ *${character.sampleQuotes.study}*`
          : `🐰 **${character.name} hướng dẫn nhanh:**\n\n${text}`;

      case 'cat':
        return isCompanion
          ? `🐱 **${character.name} nhắc bạn giữ nhịp thở tĩnh tại:**\n\n${text}\n\n🌙 *${character.tagline}*`
          : `🐱 **Góc nhìn LifeOS từ ${character.name}:**\n\n${text}`;

      case 'bear':
        return isCompanion
          ? `🐻 **${character.name} kiên trì bên bạn:**\n\n${text}\n\n🍯 *${character.sampleQuotes.study}*`
          : `🐻 **${character.name} hỗ trợ thao tác:**\n\n${text}`;

      case 'fox':
        return isCompanion
          ? `🦊 **Chiến thuật thông minh từ ${character.name}:**\n\n${text}\n\n💡 *${character.tagline}*`
          : `🦊 **${character.name} chỉ điểm tính năng:**\n\n${text}`;

      case 'panda':
        return isCompanion
          ? `🐼 **${character.name} đồng hành thư thái:**\n\n${text}\n\n🎋 *${character.sampleQuotes.rest}*`
          : `🐼 **${character.name} hướng dẫn chi tiết:**\n\n${text}`;

      case 'lumi':
      default:
        return isCompanion
          ? `⭐ **${character.name} thắp sáng hành trình học của bạn:**\n\n${text}\n\n✨ *${character.sampleQuotes.study}*`
          : `⭐ **${character.name} hỗ trợ bạn:**\n\n${text}`;
    }
  }

  /**
   * Main cognitive pipeline:
   * Process incoming query with full UI Context, Deictic Resolver, 6-level Knowledge Retrieval, and Anti-Hallucination
   */
  processQuery(
    rawQuery: string,
    context: CompanionUIContext,
    characterProfile?: CompanionCharacterProfile
  ): ProcessedQueryResult {
    const query = (rawQuery || '').trim().slice(0, 500);
    const qLower = query.toLowerCase();
    const character = characterProfile || getCharacterProfile('lumi');

    // -------------------------------------------------------------
    // STAGE 1: NON-EXISTENT FEATURE CHECK (STRICT ANTI-HALLUCINATION)
    // -------------------------------------------------------------
    for (const item of NON_EXISTENT_KEYWORDS) {
      if (qLower.includes(item.keyword)) {
        const responseText = `Không, ứng dụng LifeOS **không có tính năng "${item.displayName}"** bạn nhé!

LifeOS là hệ điều hành tập trung chuyên sâu vào **Học tập và Năng suất cá nhân**, bao gồm:
- **Study OS & Vocabulary Master:** Học 3.000 từ tiếng Anh & 10.240 từ HSK tiếng Trung với Spaced Repetition (SM-2).
- **Focus Pomodoro:** Tập trung sâu không gián đoạn với âm thanh lofi.
- **Quản lý công việc & cuộc sống:** Nhiệm vụ (Kanban), Tài chính (50/30/20), Thói quen (Streak), Mục tiêu và Động cơ Tự động hóa.

Hệ thống hoàn toàn không hỗ trợ các tính năng ngoài lề như gửi email marketing hàng loạt hay dịch vụ ngoài đời thực.`;

        return {
          isAllowed: false,
          category: 'NON_EXISTENT_FEATURE',
          role: 'APP_ASSISTANT',
          confidence: 'HIGH',
          text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
          suggestedFollowUps: ['LifeOS có những tính năng cốt lõi nào?', 'Làm sao để học từ vựng?']
        };
      }
    }

    // -------------------------------------------------------------
    // STAGE 2: OFF-TOPIC CHECK
    // -------------------------------------------------------------
    for (const pattern of OFF_TOPIC_PATTERNS) {
      if (pattern.test(qLower)) {
        const responseText = `Mình là **${character.name}** (${character.title})! 

Mình chỉ chuyên đồng hành cùng bạn trong **học tập, rèn luyện thói quen** và **hướng dẫn sử dụng hệ thống LifeOS**. Để giúp bạn duy trì sự tập trung tối đa cho mục tiêu của mình, mình xin phép không thảo luận các chủ đề ngoài lề nhé! 🌸

Bây giờ bạn muốn chúng mình cùng:
1. Tiếp tục ôn từ vựng với **Spaced Repetition**?
2. Bật một phiên **Focus Pomodoro** 25 phút?
3. Hay kiểm tra lại danh sách **Nhiệm vụ hôm nay**?`;

        return {
          isAllowed: false,
          category: 'OFF_TOPIC',
          role: 'STUDY_COMPANION',
          confidence: 'HIGH',
          text: this.applyPersonaVoice(responseText, character, 'STUDY_COMPANION'),
          actionView: 'focus',
          actionLabel: 'Bật Focus 25 phút',
          suggestedFollowUps: ['Vào học từ vựng', 'Xem danh sách nhiệm vụ']
        };
      }
    }

    // -------------------------------------------------------------
    // STAGE 3: EMOTIONAL & STUDY COMPANION EMPATHY CHECK
    // (e.g. "Hôm nay tôi mệt quá không muốn học")
    // -------------------------------------------------------------
    if (qLower.includes('mệt') || qLower.includes('nản') || qLower.includes('áp lực') || qLower.includes('buồn') || qLower.includes('không muốn học') || qLower.includes('chán')) {
      const responseText = `Mình hiểu cảm giác này mà! Ai trong chúng ta cũng có những ngày năng lượng xuống thấp, và việc cảm thấy mệt mỏi là hoàn toàn bình thường.

🌿 **Lời khuyên nhỏ từ ${character.name}:**
1. **Đừng ép buộc bản thân:** Hôm nay bạn không cần phải học dồn 50 từ hay hoàn thành những việc quá nặng nề.
2. **Quy tắc 5 phút:** Nếu vẫn muốn giữ chuỗi Streak, bạn chỉ cần mở Study OS ôn nhẹ đúng 3-5 từ, hoặc đơn giản là bật 5 phút nghe nhạc lofi thư giãn ở màn hình Focus.
3. **Nghỉ ngơi để nạp lại năng lượng:** ${character.sampleQuotes.rest}

Mình luôn ở đây đồng hành cùng bạn. Hãy uống một ngụm nước ấm và nghỉ ngơi một chút nhé! 🌸`;

      return {
        isAllowed: true,
        category: 'STUDY_SUPPORT',
        role: 'STUDY_COMPANION',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'STUDY_COMPANION'),
        actionView: 'focus',
        actionLabel: 'Mở Nhạc Thư Giãn',
        suggestedFollowUps: ['Bật nhạc lofi thư giãn', 'Xem chuỗi Streak của tôi']
      };
    }

    // -------------------------------------------------------------
    // STAGE 4: GENERAL GREETING OR LIFEOS OVERVIEW CHECK
    // -------------------------------------------------------------
    if (qLower.includes('lifeos là gì') || qLower.includes('web này là gì') || qLower.includes('ứng dụng này là gì') || qLower.includes('giới thiệu lifeos')) {
      const responseText = `**${APP_OVERVIEW.name}** là ${APP_OVERVIEW.tagline.toLowerCase()}.

Hệ thống được thiết kế theo triết lý đồng nhất:
1. **Study OS & Vocabulary Master:** Ôn tập 3.000 từ tiếng Anh & 10.240 từ HSK tiếng Trung bằng thuật toán Spaced Repetition (SM-2) và Active Recall.
2. **Focus Pomodoro & Deep Work:** Đồng hồ tập trung 25/5 hoặc 50/10 kết hợp âm thanh lofi khử xao nhãng.
3. **Quản trị công việc (Tasks & Kanban):** Đếm giờ làm việc thực tế, chia nhỏ subtasks checklist và cảnh báo rủi ro deadline.
4. **Quản trị cuộc sống cá nhân:** Tài chính cá nhân (50/30/20), Thói quen (Streak), Mục tiêu (OKRs) và Ma trận quyết định.
5. **Động cơ Tự động hóa (Automation Engine):** Tự động kích hoạt hành động thông minh giữa các module.`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'dashboard',
        actionLabel: 'Khám Phá Bảng Điều Khiển',
        suggestedFollowUps: ['Làm sao để học từ vựng?', 'Động cơ tự động hóa là gì?']
      };
    }

    // -------------------------------------------------------------
    // STAGE 5: DEICTIC REFERENCE RESOLUTION (Contextual Indexicals)
    // -------------------------------------------------------------
    const deictic = this.resolveDeicticSubject(qLower, context);

    // Case 5A: "Nút này làm gì?" with clicked element or simulation button
    if (deictic.resolvedSubject === 'test_simulation' || (qLower.includes('nút này') && (context.currentView === 'automation' || context.activeTab === 'simulation'))) {
      const action = ACTION_KNOWLEDGE_MAP['test_simulation'];
      const responseText = `Nút **"${action.name}"** dùng để **chạy thử nghiệm (Dry-run)** quy tắc tự động hóa.

Khi bạn bấm nút này:
1. Hệ thống sẽ lấy dữ liệu mẫu giả định (mock event payload) để kiểm tra xem Trigger có bắt đúng sự kiện hay không.
2. Đánh giá từng bước trong nhóm điều kiện (Conditions) xem kết quả là TRUE hay FALSE.
3. Dự đoán hành động (Action) sẽ thực thi mà **hoàn toàn KHÔNG làm thay đổi dữ liệu thật** trong ứng dụng của bạn.

👉 *Mẹo:* Bạn luôn nên bấm nút này trong tab Simulation trước khi gạt công tắc BẬT quy tắc ở tab Rules!`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'automation',
        actionLabel: 'Xem Tab Simulation',
        suggestedFollowUps: ['Cách thiết lập quy tắc tự động?', 'Tab Simulation dùng để làm gì?']
      };
    }

    // Case 5B: "Tab Mô phỏng trong Automation dùng để làm gì?" or activeTab = simulation
    if (qLower.includes('tab mô phỏng') || (qLower.includes('mô phỏng') && qLower.includes('automation')) || (deictic.resolvedSubject === 'simulation')) {
      const sim = FEATURE_KNOWLEDGE_MAP.automation.subFeatures.simulation;
      const responseText = `Tab **${sim.name}** trong Động cơ Tự động hóa là **phòng thí nghiệm kiểm thử Dry-run an toàn**:

- **Mục đích:** Giúp bạn chạy thử nghiệm quy tắc với dữ liệu giả lập trước khi đưa vào hoạt động thực tế.
- **Cách dùng:**
  1. Chọn quy tắc bạn muốn thử nghiệm.
  2. Nhập các tham số giả định hoặc chọn kịch bản mẫu.
  3. Bấm nút **"Chạy thử nghiệm (Run Test Simulation)"**.
  4. Hệ thống sẽ phân tích và hiển thị trực quan điều kiện nào đạt (TRUE) hay không đạt (FALSE).
- **Lợi ích cốt lõi:** Đảm bảo quy tắc hoạt động chính xác 100% mà không làm bẩn hoặc xáo trộn dữ liệu công việc và tài chính thật của bạn!`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'automation',
        actionLabel: 'Mở Tab Mô Phỏng',
        suggestedFollowUps: ['Cách tạo quy tắc mới trong Automation?', 'Tại sao quy tắc tự động không chạy?']
      };
    }

    // Case 5C: "Trang này là gì?" when on /automation or specific view
    if (qLower.includes('trang này là gì') || qLower.includes('màn hình này là gì') || (deictic.source === 'VIEW' && qLower.includes('là gì'))) {
      const currentRoute = ROUTE_KNOWLEDGE_MAP[context.currentView] || ROUTE_KNOWLEDGE_MAP['dashboard'];

      if (context.currentView === 'automation') {
        const auto = FEATURE_KNOWLEDGE_MAP.automation;
        const responseText = `Bạn đang ở trang **${currentRoute.displayName}**!

Đây là trung tâm điều phối các quy tắc tự động hóa trong LifeOS (Trigger -> Điều kiện -> Hành động). Trang gồm **10 tab chuyên biệt**:
1. **Dashboard:** Tổng quan KPI và hiệu suất tự động hóa.
2. **Rules:** Danh sách và công tắc bật/tắt các quy tắc.
3. **Builder:** Trình tạo quy tắc mới qua 5 bước chuẩn kỹ thuật.
4. **Templates:** Kho mẫu kịch bản có sẵn dùng ngay.
5. **Approvals:** Hàng đợi phê duyệt các lệnh nhạy cảm.
6. **Simulation:** Phòng giả lập dry-run an toàn.
7. **Scheduled:** Lịch trình chạy tác vụ định kỳ.
8. **Analytics:** Phân tích tần suất và độ tin cậy.
9. **History:** Nhật ký audit log chi tiết từng lượt chạy.
10. **Conflicts:** Tự động phát hiện và cảnh báo xung đột logic.`;

        return {
          isAllowed: true,
          category: 'APP_HELP',
          role: 'APP_ASSISTANT',
          confidence: 'HIGH',
          text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
          actionView: 'automation',
          actionLabel: 'Tạo Quy Tắc Mới',
          suggestedFollowUps: ['Tab Mô phỏng dùng để làm gì?', 'Cách tạo quy tắc tự động 5 bước?']
        };
      }

      // Other routes
      const responseText = `Bạn đang ở màn hình **${currentRoute.displayName}**.

- **Chức năng:** ${currentRoute.description}
- **Quyền hạn:** Dành cho tài khoản cấp độ **${currentRoute.requiredTier}**.
- **Các thao tác chính:** Bạn có thể sử dụng các thanh công cụ và tab chức năng ở phía trên để thao tác.`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: currentRoute.defaultRole,
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, currentRoute.defaultRole),
        actionView: context.currentView,
        actionLabel: 'Khám phá ngay'
      };
    }

    // Case 5D: "Bật nó ở đâu?" after asking about Focus Mode (Deictic word + Conversation memory)
    if ((qLower.includes('bật nó ở đâu') || qLower.includes('dùng nó ở đâu') || qLower.includes('mở nó ở đâu')) && deictic.resolvedSubject === 'focus') {
      const responseText = `Bạn có thể bật **Focus Mode** rất dễ dàng bằng 2 cách:

1. **Cách 1 (Trực tiếp):** Nhấp vào mục **"Focus"** (hoặc biểu tượng ngọn lửa 🔥) trên thanh menu điều hướng bên trái màn hình, sau đó bấm nút Play ở giữa đồng hồ để bắt đầu đếm ngược 25 hoặc 50 phút.
2. **Cách 2 (Từ Bảng điều khiển):** Ngay tại trang Dashboard, bạn có nút tắt *"Bật Focus 25m"* để vào phiên tức thì.

👉 Bạn có muốn mình chuyển ngay sang trang Focus Mode để bạn bắt đầu tập trung không nè?`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'focus',
        actionLabel: 'Mở Focus Mode Ngay',
        suggestedFollowUps: ['Focus Mode khác gì với Timer thường?', 'Nên chọn chu kỳ 25/5 hay 50/10?']
      };
    }

    // -------------------------------------------------------------
    // STAGE 6: EXPLICIT QUESTIONS MATCHING (Core Workflows & Diagnostics)
    // -------------------------------------------------------------

    // Query: "Tôi muốn học từ vựng thì làm thế nào?"
    if (qLower.includes('học từ vựng') || qLower.includes('cách học từ vựng') || qLower.includes('bắt đầu học từ vựng')) {
      const flow = WORKFLOW_KNOWLEDGE_MAP['study_vocab_sm2'];
      const responseText = `Để học từ vựng hiệu quả trong **Study OS & Vocabulary Master**, bạn thực hiện theo các bước sau:

1. **Vào Study OS:** Nhấp vào mục **"Study"** trên thanh menu bên trái.
2. **Chọn kho từ:** 
   - Tab *3000 từ thông dụng* (Oxford A1-C1) cho tiếng Anh.
   - Tab *Kho 10.000 từ HSK* cho tiếng Trung (HSK 1 đến 6).
   - Hoặc tab *Học hôm nay* để ôn những từ đến hạn.
3. **Mở phiên học (Flashcard):** Bấm nút **"Bắt đầu phiên học"**.
4. **Thực hành Active Recall:** Nhìn từ vựng, tự gợi nhớ Pinyin và nghĩa TRƯỚC KHI nhấp lật thẻ.
5. **Đánh giá độ nhớ bằng 4 nút SM-2:**
   - **1 (Lại):** Quên từ $\\to$ học lại ngay trong phiên.
   - **2 (Khó):** Mất hơn 5s mới nhớ $\\to$ ôn lại sau 1-2 ngày.
   - **3 (Tốt):** Nhớ chuẩn $\\to$ giãn cách theo thuật toán chuẩn.
   - **4 (Dễ):** Nhớ tức thì dưới 1s $\\to$ tăng Ease Factor và giãn xa hơn.`;

      return {
        isAllowed: true,
        category: 'STUDY_SUPPORT',
        role: 'STUDY_COMPANION',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'STUDY_COMPANION'),
        actionView: 'study',
        actionLabel: 'Vào Học Từ Vựng Ngay',
        suggestedFollowUps: ['Spaced Repetition là gì?', 'Mẹo ghi nhớ Hán tự nhanh?']
      };
    }

    // Query: "Làm sao để tạo một task có checklist?"
    if (qLower.includes('checklist') || qLower.includes('tạo task có checklist') || qLower.includes('nhiệm vụ con') || qLower.includes('subtask')) {
      const flow = WORKFLOW_KNOWLEDGE_MAP['create_task_with_checklist'];
      const responseText = `Để tạo một nhiệm vụ có checklist việc con (Subtasks) trong LifeOS:

1. Vào mục **"Nhiệm vụ" (Tasks)** trên thanh menu bên trái.
2. Bấm nút **"+ Thêm nhiệm vụ"** ở góc trên bên phải màn hình.
3. Điền **Tiêu đề**, chọn **Mức độ ưu tiên** (Thấp / Vừa / Cao / Nghiêm trọng) và **Hạn chót**.
4. Cuộn xuống phần **"Nhiệm vụ con (Subtasks)"**:
   - Gõ tên từng đầu việc nhỏ cần làm (ví dụ: *Đọc tài liệu, Viết dàn ý, Nộp bài*).
   - Nhấn phím Enter hoặc nút Thêm để đưa vào checklist.
5. Bấm **"Lưu nhiệm vụ"**.

✨ *Điểm tuyệt vời:* Khi bạn làm việc và tích chọn từng việc con, thanh tiến độ % của nhiệm vụ cha sẽ tự động tăng dần lên!`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'tasks',
        actionLabel: 'Mở Trang Nhiệm Vụ',
        suggestedFollowUps: ['Chế độ Kanban khác gì Danh sách?', 'Nhiệm vụ có cờ đỏ nghĩa là gì?']
      };
    }

    // Query: "Tại sao tôi không xem được phần này?" (Locked features / Permission)
    if (qLower.includes('không xem được') || qLower.includes('tại sao bị khóa') || qLower.includes('bị khóa') || qLower.includes('nâng cấp gói') || qLower.includes('ổ khóa')) {
      const lockHelp = TROUBLESHOOTING_KNOWLEDGE_MAP['feature_locked_permission'];
      const responseText = `Tính năng này hiện **đang bị khóa vì yêu cầu gói hội viên Pro hoặc Team** (ví dụ: Động cơ Tự động hóa, Ma trận Quyết định, hoặc trọn bộ 10.240 từ HSK tiếng Trung nâng cao).

Để mở khóa sử dụng không giới hạn:
1. Nhấp vào mục **"Gói Hội Viên" (Subscription)** trên menu bên trái (hoặc bấm nút bên dưới).
2. Chọn gói nâng cấp phù hợp:
   - **Gói Pro (Cá nhân):** Mở khóa toàn bộ tính năng cao cấp cho 1 tài khoản.
   - **Gói Team (Đội nhóm):** Dành cho nhóm tối đa 5 người, có mã mời riêng.
3. Mở app ngân hàng quét **Mã VietQR tự động** và giữ nguyên nội dung chuyển khoản.
4. Tài khoản của bạn sẽ được kích hoạt tự động chỉ trong 1-3 phút!`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'subscription',
        actionLabel: 'Xem Các Gói Nâng Cấp',
        suggestedFollowUps: ['Gói Pro và Team khác nhau thế nào?', 'Thanh toán VietQR có an toàn không?']
      };
    }

    // Query: "Focus Mode khác gì với Timer thường?"
    if (qLower.includes('khác gì với timer') || (qLower.includes('focus mode') && qLower.includes('khác'))) {
      const responseText = `**Focus Mode trong LifeOS** vượt trội hơn một chiếc đồng hồ bấm giờ thông thường ở 4 điểm cốt lõi:

1. **Môi trường Deep Work toàn diện:** Tích hợp bộ âm thanh môi trường thư giãn (nhạc lofi, tiếng mưa rơi, tiếng rừng) giúp khử tạp âm và đưa não bộ vào trạng thái tập trung sâu.
2. **Tự động liên kết Nhiệm vụ:** Bạn có thể chọn nhiệm vụ đang làm để hệ thống tự động cộng dồn số giờ làm việc thực tế (Actual Hours) vào nhiệm vụ đó.
3. **Nhật ký & Thống kê thông minh:** Tự động ghi lại thời gian học thực tế vào cơ sở dữ liệu, nuôi dưỡng chuỗi Streak ngày liên tục.
4. **Bạn đồng hành AI tiếp sức:** Trong suốt phiên học, nhân vật AI Companion sẽ chuyển sang chế độ tập trung cùng bạn và gửi lời động viên đúng lúc!`;

      return {
        isAllowed: true,
        category: 'STUDY_SUPPORT',
        role: 'STUDY_COMPANION',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'STUDY_COMPANION'),
        actionView: 'focus',
        actionLabel: 'Trải Nghiệm Focus Mode',
        suggestedFollowUps: ['Nên chọn chu kỳ 25/5 hay 50/10?', 'Bật nó ở đâu?']
      };
    }

    // Query: "Tại sao quy tắc tự động không chạy?"
    if (qLower.includes('không chạy') || qLower.includes('không kích hoạt') || qLower.includes('rule không chạy')) {
      const tb = TROUBLESHOOTING_KNOWLEDGE_MAP['automation_rule_not_firing'];
      const responseText = `Khi quy tắc tự động không kích hoạt, bạn hãy kiểm tra nhanh **4 nguyên nhân phổ biến sau**:

1. **Công tắc Rules chưa bật:** Mở tab *Rules*, kiểm tra xem nút gạt của quy tắc đang ở màu xanh (BẬT) hay màu xám (TẮT).
2. **Đang chờ duyệt tay (Approvals):** Nếu quy tắc có độ nhạy cảm cao, lệnh đang nằm trong tab *Approvals* để chờ bạn bấm nút phê duyệt.
3. **Điều kiện lọc không khớp:** Mở tab *History*, xem dòng log gần nhất để biết điều kiện logic (AND/OR) nào bị trả về FALSE.
4. **Thời gian hồi (Cooldown) hoặc Xung đột:** Quy tắc có thể đang trong thời gian giãn cách (ví dụ 1 lần/ngày) hoặc bị tab *Conflicts* tạm dừng do đối nghịch logic.`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: 'APP_ASSISTANT',
        confidence: 'HIGH',
        text: this.applyPersonaVoice(responseText, character, 'APP_ASSISTANT'),
        actionView: 'automation',
        actionLabel: 'Kiểm Tra Tab Rules',
        suggestedFollowUps: ['Cách dùng tab Simulation để kiểm tra?', 'Thời gian hồi Cooldown là gì?']
      };
    }

    // -------------------------------------------------------------
    // STAGE 7: ROUTE-BASED OR FEATURE-BASED CONTEXTUAL FALLBACK
    // -------------------------------------------------------------
    const matchedRoute = ROUTE_KNOWLEDGE_MAP[context.currentView];
    if (matchedRoute) {
      const responseText = `Bạn đang ở khu vực **${matchedRoute.displayName}**.

${matchedRoute.description}

Bạn có thể:
1. Xem thông tin hoặc thao tác trực tiếp trên các tab chức năng.
2. Hỏi mình quy trình chi tiết (ví dụ: *"Cách tạo nhiệm vụ mới"*, *"Cách thanh toán VietQR"*).

Bạn muốn mình hướng dẫn cụ thể bước nào tiếp theo nè?`;

      return {
        isAllowed: true,
        category: 'APP_HELP',
        role: matchedRoute.defaultRole,
        confidence: 'MEDIUM',
        text: this.applyPersonaVoice(responseText, character, matchedRoute.defaultRole),
        actionView: context.currentView,
        actionLabel: 'Khám phá ngay'
      };
    }

    // -------------------------------------------------------------
    // STAGE 8: LOW CONFIDENCE HONEST FALLBACK (NEVER INVENT NON-EXISTENT CAPABILITIES)
    // -------------------------------------------------------------
    companionTelemetry.recordUnknownQuestion({
      query,
      viewId: context.currentView,
      activeTab: context.activeTab,
      confidenceScore: 'LOW',
      fallbackReason: 'No direct knowledge match found in official LifeOS specs',
      userRole: context.userState?.role
    });

    const fallbackText = `Mình chưa tìm thấy thông tin chính xác về nội dung này trong hệ thống LifeOS hiện tại.

Để đảm bảo thông tin luôn chuẩn xác và không suy đoán sai, bạn có thể:
- Hỏi về các chức năng có sẵn: **Study OS (Từ vựng SM-2)**, **Focus Pomodoro**, **Quản lý nhiệm vụ (Tasks & Kanban)**, **Tài chính**, **Thói quen**, **Mục tiêu**, hoặc **Động cơ Tự động hóa**.
- Kiểm tra tài liệu trong menu Cài đặt & Trợ giúp.

Bạn cần mình hỗ trợ về tính năng nào trong số các mục trên không nè?`;

    return {
      isAllowed: true,
      category: 'APP_HELP',
      role: 'APP_ASSISTANT',
      confidence: 'LOW',
      text: this.applyPersonaVoice(fallbackText, character, 'APP_ASSISTANT'),
      actionView: 'dashboard',
      actionLabel: 'Về Bảng Điều Khiển'
    };
  }
}

export const companionBrain = new CompanionBrain();
