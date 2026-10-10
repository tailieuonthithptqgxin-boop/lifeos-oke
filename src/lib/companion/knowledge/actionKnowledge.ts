/**
 * LifeOS Action Knowledge
 * Catalog of UI buttons, interactive elements, action IDs, and their exact functions.
 */

export interface ActionMeta {
  actionId: string;
  name: string;
  elementSelectorHint?: string;
  viewId: string;
  category: 'click' | 'toggle' | 'navigation' | 'form';
  description: string;
  whatHappensWhenClicked: string;
  permissionRequired?: 'FREE' | 'PRO' | 'TEAM' | 'ADMIN';
}

export const ACTION_KNOWLEDGE_MAP: Record<string, ActionMeta> = {
  // Automation actions
  test_simulation: {
    actionId: 'test_simulation',
    name: 'Chạy thử nghiệm (Run Test Simulation)',
    viewId: 'automation',
    category: 'click',
    description: 'Nút kiểm thử Dry-run trong tab Mô phỏng (Simulation) của Động cơ Tự động hóa.',
    whatHappensWhenClicked: 'Hệ thống sẽ chạy thử quy tắc với dữ liệu mẫu giả định để kiểm tra xem trigger có bắt đúng không và các điều kiện AND/OR có thỏa mãn hay không mà hoàn toàn KHÔNG làm ảnh hưởng đến dữ liệu thật.',
    permissionRequired: 'PRO'
  },
  create_rule: {
    actionId: 'create_rule',
    name: 'Tạo quy tắc mới (Create New Rule)',
    viewId: 'automation',
    category: 'click',
    description: 'Mở trình thiết lập quy tắc tự động 5 bước (Builder).',
    whatHappensWhenClicked: 'Chuyển bạn sang tab Builder để chọn Module, Trigger, Nhóm điều kiện, Hành động và Thời gian hồi (Cooldown).',
    permissionRequired: 'PRO'
  },
  toggle_rule_active: {
    actionId: 'toggle_rule_active',
    name: 'Bật/Tắt quy tắc tự động',
    viewId: 'automation',
    category: 'toggle',
    description: 'Công tắc toggle chuyển đổi trạng thái của quy tắc trong tab Rules.',
    whatHappensWhenClicked: 'Bật màu xanh để cho phép quy tắc lắng nghe sự kiện ngầm, hoặc gạt tắt sang màu xám để tạm dừng quy tắc.',
    permissionRequired: 'PRO'
  },

  // Vocab Master actions
  rate_word_again: {
    actionId: 'rate_word_again',
    name: 'Đánh giá 1 - Lại (Again)',
    viewId: 'study',
    category: 'click',
    description: 'Nút đánh giá độ nhớ mức 1 trong phiên ôn tập Flashcard Spaced Repetition.',
    whatHappensWhenClicked: 'Báo hiệu bạn chưa nhớ từ vựng này. Thuật toán SM-2 sẽ giữ nguyên hoặc giảm Ease Factor và cho thẻ xuất hiện lại ngay trong phiên học hôm nay.'
  },
  rate_word_hard: {
    actionId: 'rate_word_hard',
    name: 'Đánh giá 2 - Khó (Hard)',
    viewId: 'study',
    category: 'click',
    description: 'Nút đánh giá độ nhớ mức 2 trong phiên ôn tập Flashcard.',
    whatHappensWhenClicked: 'Báo hiệu bạn phải mất hơn 5 giây mới nhớ ra từ. Hệ thống sẽ đặt lịch ôn lại sau khoảng thời gian ngắn (1-2 ngày).'
  },
  rate_word_good: {
    actionId: 'rate_word_good',
    name: 'Đánh giá 3 - Tốt (Good)',
    viewId: 'study',
    category: 'click',
    description: 'Nút đánh giá độ nhớ mức 3 trong phiên ôn tập Flashcard.',
    whatHappensWhenClicked: 'Báo hiệu bạn nhớ chính xác từ vựng sau 2-3 giây suy nghĩ. Hệ thống sẽ giãn khoảng cách ôn tập theo hệ số tiêu chuẩn của thuật toán SM-2.'
  },
  rate_word_easy: {
    actionId: 'rate_word_easy',
    name: 'Đánh giá 4 - Dễ (Easy)',
    viewId: 'study',
    category: 'click',
    description: 'Nút đánh giá độ nhớ mức 4 trong phiên ôn tập Flashcard.',
    whatHappensWhenClicked: 'Báo hiệu từ này quá quen thuộc, bật ra tức thì dưới 1 giây. Hệ thống sẽ tăng Ease Factor và giãn khoảng cách ôn tập dài hơn đáng kể.'
  },
  flip_flashcard: {
    actionId: 'flip_flashcard',
    name: 'Lật mặt thẻ Flashcard (Active Recall)',
    viewId: 'study',
    category: 'click',
    description: 'Nhấp vào thẻ từ vựng để lật mặt sau.',
    whatHappensWhenClicked: 'Lật thẻ để hiển thị Pinyin, nghĩa tiếng Việt, từ loại, câu ví dụ và mở 4 nút đánh giá kết quả.'
  },

  // Focus actions
  start_pomodoro: {
    actionId: 'start_pomodoro',
    name: 'Bắt đầu đếm giờ Pomodoro',
    viewId: 'focus',
    category: 'click',
    description: 'Nút Play hình tam giác ở giữa vòng tròn đồng hồ Focus.',
    whatHappensWhenClicked: 'Bắt đầu đếm ngược thời gian tập trung (mặc định 25 phút), kích hoạt âm thanh lofi nền và đổi trạng thái nhân vật đồng hành sang tập trung cao độ.'
  },
  pause_pomodoro: {
    actionId: 'pause_pomodoro',
    name: 'Tạm dừng đếm giờ Pomodoro',
    viewId: 'focus',
    category: 'click',
    description: 'Nút Pause hai vạch kẻ trên đồng hồ Focus.',
    whatHappensWhenClicked: 'Tạm dừng đồng hồ đếm ngược khi bạn có việc bận đột xuất.'
  },

  // Tasks actions
  toggle_task_timer: {
    actionId: 'toggle_task_timer',
    name: 'Đếm giờ nhiệm vụ (Live Task Timer)',
    viewId: 'tasks',
    category: 'click',
    description: 'Nút icon đồng hồ ⏱️ trên từng thẻ nhiệm vụ.',
    whatHappensWhenClicked: 'Khởi động bộ đếm giờ thực tế (Actual Hours) cho nhiệm vụ đó, giúp bạn biết chính xác mình đã dành bao nhiêu thời gian cho công việc.'
  },
  add_subtask: {
    actionId: 'add_subtask',
    name: 'Thêm nhiệm vụ con (Add Subtask)',
    viewId: 'tasks',
    category: 'form',
    description: 'Ô nhập và nút thêm việc con trong chi tiết nhiệm vụ.',
    whatHappensWhenClicked: 'Thêm một đầu việc nhỏ vào checklist và tự động cập nhật thanh tiến độ % của nhiệm vụ cha.'
  },

  // Commerce & Subscription actions
  upgrade_plan: {
    actionId: 'upgrade_plan',
    name: 'Nâng cấp gói hội viên (Upgrade Subscription)',
    viewId: 'subscription',
    category: 'navigation',
    description: 'Nút Nâng Cấp tại các gói Pro hoặc Team.',
    whatHappensWhenClicked: 'Chuyển bạn đến trang Thanh Toán (Checkout) và tạo mã QR VietQR động để quét chuyển khoản.'
  },
  scan_vietqr: {
    actionId: 'scan_vietqr',
    name: 'Quét mã VietQR chuyển khoản',
    viewId: 'checkout',
    category: 'click',
    description: 'Mã QR hình vuông trên trang thanh toán.',
    whatHappensWhenClicked: 'Hiển thị mã QR chuẩn ngân hàng chứa số tài khoản, tên người nhận, số tiền và nội dung chuyển khoản duy nhất để quét bằng app ngân hàng.'
  }
};
