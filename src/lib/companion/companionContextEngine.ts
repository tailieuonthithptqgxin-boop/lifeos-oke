/**
 * Companion Context Engine
 * Senses active screen, feature, user role, and generates relevant suggestions.
 */

export type CompanionRole = 'STUDY_COMPANION' | 'APP_ASSISTANT';

export interface ScreenContextMeta {
  viewId: string;
  featureName: string;
  defaultRole: CompanionRole;
  description: string;
  suggestedQuestions: string[];
  quickActions?: { label: string; actionView: string; icon?: string }[];
  contextTip: string;
}

export const SCREEN_CONTEXT_MAP: Record<string, ScreenContextMeta> = {
  dashboard: {
    viewId: 'dashboard',
    featureName: 'Bảng Điều Khiển Tổng Quan',
    defaultRole: 'APP_ASSISTANT',
    description: 'Nơi hiển thị tổng quan tiến độ học tập, nhiệm vụ hôm nay, thói quen và tài chính.',
    suggestedQuestions: [
      'Hôm nay mình nên bắt đầu từ việc gì trước?',
      'Làm thế nào để duy trì chuỗi Streak học tập?',
      'LifeOS có những tính năng cốt lõi nào?',
      'Cách tùy biến bảng điều khiển cá nhân?'
    ],
    quickActions: [
      { label: 'Vào Học Ngay', actionView: 'study', icon: 'GraduationCap' },
      { label: 'Bật Focus 25m', actionView: 'focus', icon: 'Flame' },
      { label: 'Xem Nhiệm Vụ', actionView: 'tasks', icon: 'CheckSquare' }
    ],
    contextTip: 'Bảng điều khiển giúp bạn có cái nhìn toàn cảnh về mọi khía cạnh cuộc sống và học tập.'
  },
  study: {
    viewId: 'study',
    featureName: 'Study OS & Vocabulary Master',
    defaultRole: 'STUDY_COMPANION',
    description: 'Kho từ vựng 3000 từ tiếng Anh thông dụng và 10.000 từ HSK tiếng Trung kèm thuật toán Spaced Repetition.',
    suggestedQuestions: [
      'Phương pháp Spaced Repetition hoạt động như thế nào?',
      'Cách bắt đầu ôn 10.000 từ vựng HSK tiếng Trung?',
      'Làm sao đánh giá độ nhớ (Dễ, Tốt, Khó, Lại)?',
      'Mẹo ghi nhớ Hán tự và Pinyin nhanh nhất?'
    ],
    quickActions: [
      { label: 'Ôn Tập Spaced Repetition', actionView: 'study', icon: 'RotateCw' },
      { label: 'Bật Focus Học Từ', actionView: 'focus', icon: 'Flame' }
    ],
    contextTip: 'Học đều đặn 10-15 từ mỗi ngày với Spaced Repetition hiệu quả gấp 5 lần học dồn trước kỳ thi!'
  },
  focus: {
    viewId: 'focus',
    featureName: 'Focus Pomodoro & Deep Work',
    defaultRole: 'STUDY_COMPANION',
    description: 'Không gian tập trung sâu với đồng hồ Pomodoro, âm thanh lofi và thống kê thời gian tập trung.',
    suggestedQuestions: [
      'Nên chọn chu kỳ 25/5 hay 50/10 khi học?',
      'Cách xử lý khi bị xao nhãng trong phiên Focus?',
      'Tại sao cần nghỉ giải lao giữa các phiên Pomodoro?',
      'Cách ghi nhận kết quả sau phiên tập trung?'
    ],
    quickActions: [
      { label: 'Sang Học Từ Vựng', actionView: 'study', icon: 'BookOpen' },
      { label: 'Kiểm Tra Nhiệm Vụ', actionView: 'tasks', icon: 'CheckSquare' }
    ],
    contextTip: 'Trong phiên Focus, hãy tắt thông báo điện thoại và để tâm trí hoàn toàn đắm chìm vào công việc!'
  },
  tasks: {
    viewId: 'tasks',
    featureName: 'Quản Lý Nhiệm Vụ & Kanban',
    defaultRole: 'APP_ASSISTANT',
    description: 'Quản lý công việc theo danh sách hoặc bảng Kanban, phân loại theo độ ưu tiên và dự án.',
    suggestedQuestions: [
      'Cách chia nhỏ mục tiêu lớn thành các việc cần làm?',
      'Quy tắc ma trận Eisenhower (Khẩn cấp vs Quan trọng) dùng thế nào?',
      'Làm sao lọc nhiệm vụ theo hạn chót (Deadline)?',
      'Cách chuyển trạng thái thẻ Kanban?'
    ],
    quickActions: [
      { label: 'Lên Lịch Tuần', actionView: 'calendar', icon: 'Calendar' },
      { label: 'Tập Trung Làm Việc', actionView: 'focus', icon: 'Flame' }
    ],
    contextTip: 'Luôn chọn ra 1-3 việc quan trọng nhất (Most Important Tasks - MIT) để giải quyết vào đầu ngày.'
  },
  calendar: {
    viewId: 'calendar',
    featureName: 'Lịch Biểu & Kế Hoạch',
    defaultRole: 'APP_ASSISTANT',
    description: 'Xem tổng quan lịch trình, sự kiện theo ngày, tuần, tháng và phiên học đã hoàn thành.',
    suggestedQuestions: [
      'Cách lên lịch học tập không bị trùng deadline?',
      'Phương pháp Time Blocking có hiệu quả không?',
      'Xem lại lịch sử các buổi học ở đâu?'
    ],
    contextTip: 'Time Blocking giúp bạn dành riêng những khối thời gian bất khả xâm phạm cho việc học tập.'
  },
  finance: {
    viewId: 'finance',
    featureName: 'Quản Lý Tài Chính Cá Nhân',
    defaultRole: 'APP_ASSISTANT',
    description: 'Theo dõi thu chi, phân bổ ngân sách theo danh mục và xem biểu đồ dòng tiền.',
    suggestedQuestions: [
      'Cách ghi nhận một giao dịch thu chi mới?',
      'Quy tắc phân bổ ngân sách 50/30/20 là gì?',
      'Làm sao đặt hạn mức chi tiêu cho từng nhóm?',
      'Xem báo cáo tài chính tháng ở đâu?'
    ],
    quickActions: [
      { label: 'Về Bảng Điều Khiển', actionView: 'dashboard', icon: 'LayoutDashboard' }
    ],
    contextTip: 'Ghi chép đều đặn từng khoản chi nhỏ sẽ giúp bạn nhìn rõ bức tranh tài chính và tiết kiệm thông minh hơn.'
  },
  habits: {
    viewId: 'habits',
    featureName: 'Theo Dõi Thói Quen (Habit Tracker)',
    defaultRole: 'STUDY_COMPANION',
    description: 'Xây dựng thói quen tốt với chuỗi Streak hàng ngày, biểu đồ hoàn thành và nhắc nhở.',
    suggestedQuestions: [
      'Làm sao xây dựng thói quen đọc sách 15 phút mỗi ngày?',
      'Quy tắc 2 ngày: không bao giờ bỏ lỡ 2 ngày liên tiếp là gì?',
      'Cách theo dõi chuỗi thói quen hiệu quả?',
      'Thói quen nguyên tử (Atomic Habits) áp dụng thế nào?'
    ],
    quickActions: [
      { label: 'Bật Phiên Focus', actionView: 'focus', icon: 'Flame' }
    ],
    contextTip: 'Không cần hoàn hảo, chỉ cần liên tục. Đừng bao giờ bỏ lỡ thói quen 2 ngày liên tiếp!'
  },
  goals: {
    viewId: 'goals',
    featureName: 'Mục Tiêu & OKRs',
    defaultRole: 'APP_ASSISTANT',
    description: 'Thiết lập mục tiêu dài hạn, chia nhỏ thành các mốc kết quả then chốt (Key Results).',
    suggestedQuestions: [
      'Cách đặt mục tiêu theo nguyên tắc SMART?',
      'Sự khác nhau giữa Mục tiêu và Nhiệm vụ hàng ngày?',
      'Làm sao đánh giá tiến độ hoàn thành mục tiêu?'
    ],
    contextTip: 'Một mục tiêu rõ ràng kèm thời hạn cụ thể chính là ngọn hải đăng soi đường cho bạn mỗi ngày.'
  },
  notes: {
    viewId: 'notes',
    featureName: 'Ghi Chú & Cơ Sở Tri Thức',
    defaultRole: 'STUDY_COMPANION',
    description: 'Soạn thảo ghi chú bài học, lưu trữ tài liệu, liên kết ý tưởng và tóm tắt kiến thức.',
    suggestedQuestions: [
      'Cách ghi chép theo phương pháp Cornell để ôn thi?',
      'Làm thế nào để gắn thẻ (tag) và tìm kiếm ghi chú nhanh?',
      'Mẹo tóm tắt ý chính sau mỗi buổi học?'
    ],
    quickActions: [
      { label: 'Sang Học Từ Vựng', actionView: 'study', icon: 'BookOpen' }
    ],
    contextTip: 'Viết lại bằng lời của chính mình (Feynman Technique) là cách tốt nhất để kiểm tra độ hiểu bài.'
  },
  decision: {
    viewId: 'decision',
    featureName: 'Ma Trận Quyết Định (Decision Engine)',
    defaultRole: 'APP_ASSISTANT',
    description: 'Hỗ trợ đưa ra quyết định lý tính bằng phương pháp chấm điểm trọng số theo tiêu chí.',
    suggestedQuestions: [
      'Cách lập bảng so sánh các lựa chọn bằng điểm trọng số?',
      'Khi nào nên dùng ma trận quyết định?',
      'Làm sao đánh giá khách quan giữa hai hướng đi?'
    ],
    contextTip: 'Khi phân vân, hãy viết ra các tiêu chí quan trọng nhất và chấm điểm để tránh bị cảm xúc chi phối.'
  },
  automation: {
    viewId: 'automation',
    featureName: 'Động Cơ Tự Động Hóa (Automation)',
    defaultRole: 'APP_ASSISTANT',
    description: 'Thiết lập các kịch bản tự động lặp lại (Trigger $\\to$ Action) để tiết kiệm thời gian.',
    suggestedQuestions: [
      'Tự động hóa trong LifeOS hoạt động như thế nào?',
      'Cách tạo kịch bản nhắc nhở học tập tự động?',
      'Ví dụ về các luồng tự động hóa hữu ích?'
    ],
    contextTip: 'Tự động hóa những việc lặp lại giúp bạn giải phóng tối đa năng lượng tinh thần cho việc học sâu.'
  },
  subscription: {
    viewId: 'subscription',
    featureName: 'Gói Hội Viên & Quyền Truy Cập',
    defaultRole: 'APP_ASSISTANT',
    description: 'Thông tin các gói nâng cấp Free, Pro, Team, Lifetime và hướng dẫn thanh toán QR.',
    suggestedQuestions: [
      'Gói Pro và gói Team khác nhau như thế nào?',
      'Cách thanh toán bằng mã VietQR hoặc MoMo?',
      'Sau khi chuyển khoản bao lâu thì tài khoản được kích hoạt?',
      'Làm sao để thêm thành viên vào gói Team của mình?'
    ],
    quickActions: [
      { label: 'Đến Trang Nâng Cấp', actionView: 'checkout', icon: 'CreditCard' }
    ],
    contextTip: 'Sau khi quét mã QR chuyển khoản với đúng mã thanh toán, hệ thống sẽ tự động duyệt kích hoạt trong vài phút.'
  },
  checkout: {
    viewId: 'checkout',
    featureName: 'Thanh Toán Đơn Hàng',
    defaultRole: 'APP_ASSISTANT',
    description: 'Trang quét mã QR thanh toán nhanh VietQR / MoMo kèm mã chuyển khoản duy nhất.',
    suggestedQuestions: [
      'Làm sao để lấy mã QR thanh toán?',
      'Nếu chuyển khoản quên ghi nội dung thì xử lý thế nào?',
      'Kiểm tra trạng thái duyệt đơn hàng ở đâu?'
    ],
    contextTip: 'Vui lòng giữ nguyên nội dung chuyển khoản được hiển thị để giao dịch được xử lý nhanh nhất!'
  },
  account: {
    viewId: 'account',
    featureName: 'Tài Khoản & Cài Đặt Cá Nhân',
    defaultRole: 'APP_ASSISTANT',
    description: 'Quản lý thông tin hồ sơ, đổi mật khẩu, cấu hình AI Study Companion và sao lưu dữ liệu.',
    suggestedQuestions: [
      'Cách đổi nhân vật đồng hành yêu thích?',
      'Tắt/bật chế độ yên tĩnh (Quiet Mode) ở đâu?',
      'Làm sao sao lưu và xuất dữ liệu cá nhân?',
      'Cách đổi ngôn ngữ hoặc giao diện sáng/tối?'
    ],
    contextTip: 'Bạn có thể chọn bất kỳ bé đồng hành nào (Lumi, Bunny, Miu, Kuma, Kitsu, Bao) phù hợp với mood của mình!'
  },
  admin: {
    viewId: 'admin',
    featureName: 'Trang Quản Trị Hệ Thống (Admin)',
    defaultRole: 'APP_ASSISTANT',
    description: 'Quản lý người dùng, duyệt kích hoạt đơn hàng thủ công, cấu hình mã QR thanh toán.',
    suggestedQuestions: [
      'Cách cập nhật mã QR thanh toán tài khoản ngân hàng?',
      'Cách duyệt kích hoạt gói cho một thành viên?',
      'Xem danh sách các gói đăng ký đang hoạt động?'
    ],
    contextTip: 'Khu vực quản trị chỉ dành cho tài khoản có quyền Admin hoặc SuperAdmin.'
  }
};

export class CompanionContextEngine {
  /**
   * Resolves screen context metadata for any route or view slug
   */
  getScreenContext(viewId: string): ScreenContextMeta {
    if (viewId in SCREEN_CONTEXT_MAP) {
      return SCREEN_CONTEXT_MAP[viewId];
    }

    // Default fallback
    return {
      viewId,
      featureName: 'LifeOS Workspace',
      defaultRole: 'APP_ASSISTANT',
      description: 'Không gian làm việc và tối ưu năng suất LifeOS.',
      suggestedQuestions: [
        'Làm sao sử dụng tính năng này hiệu quả nhất?',
        'Có những phím tắt nào trong LifeOS?',
        'Cách đồng bộ dữ liệu giữa các thiết bị?'
      ],
      contextTip: 'LifeOS kết hợp quản lý cuộc sống và học tập thành một hệ thống đồng nhất.'
    };
  }

  /**
   * Determines if a view is primarily a study/learning view
   */
  isStudyView(viewId: string): boolean {
    return ['study', 'focus', 'habits', 'notes'].includes(viewId);
  }

  private liveContext: {
    viewId: string;
    activeTab?: string;
    clickedElement?: {
      id?: string;
      label?: string;
      action?: string;
      role?: string;
      tabId?: string;
    };
  } = {
    viewId: 'dashboard'
  };

  /**
   * Updates live active UI context from views and interaction events
   */
  setLiveContext(ctx: {
    viewId?: string;
    activeTab?: string;
    clickedElement?: {
      id?: string;
      label?: string;
      action?: string;
      role?: string;
      tabId?: string;
    };
  }): void {
    if (ctx.viewId) this.liveContext.viewId = ctx.viewId;
    if (ctx.activeTab !== undefined) this.liveContext.activeTab = ctx.activeTab;
    if (ctx.clickedElement !== undefined) this.liveContext.clickedElement = ctx.clickedElement;
  }

  /**
   * Retrieves current live UI context snapshot
   */
  getLiveContext() {
    return { ...this.liveContext };
  }

  /**
   * Clears transient clicked element context
   */
  clearClickedElement(): void {
    this.liveContext.clickedElement = undefined;
  }
}

export const companionContextEngine = new CompanionContextEngine();

export function getScreenContextMeta(viewId: string): ScreenContextMeta {
  return SCREEN_CONTEXT_MAP[viewId] || SCREEN_CONTEXT_MAP.dashboard;
}

export function generateDynamicSuggestions(viewId: string): string[] {
  const meta = getScreenContextMeta(viewId);
  return meta.suggestedQuestions;
}
