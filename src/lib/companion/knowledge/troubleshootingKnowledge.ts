/**
 * LifeOS Troubleshooting Knowledge
 * Diagnostic guides, error handling, permission lock resolution, and common real-world fixes.
 */

export interface TroubleshootingTopic {
  issueId: string;
  problemStatement: string;
  symptoms: string[];
  rootCauses: string[];
  resolutionSteps: string[];
  suggestedActionView?: string;
}

export const TROUBLESHOOTING_KNOWLEDGE_MAP: Record<string, TroubleshootingTopic> = {
  feature_locked_permission: {
    issueId: 'feature_locked_permission',
    problemStatement: 'Tính năng bị khóa hoặc không xem được (Báo cần nâng cấp gói Pro/Team)',
    symptoms: [
      'Giao diện hiển thị biểu tượng ổ khóa 🔒 hoặc thông báo yêu cầu nâng cấp gói',
      'Không thể nhấn vào tab hoặc tạo thêm dữ liệu trong Động cơ Tự động hóa hoặc Ma trận Quyết định',
      'Không xem được toàn bộ 10.240 từ vựng HSK tiếng Trung cao cấp'
    ],
    rootCauses: [
      'Tài khoản đang ở gói Free hoặc gói đăng ký Pro/Team trước đó đã hết hạn',
      'Tính năng hiện tại (Automation Engine, Decision Matrix, HSK Full) là tính năng trả phí độc quyền'
    ],
    resolutionSteps: [
      '1. Nhấp vào nút "Nâng cấp" trên màn hình hoặc vào menu "Gói Hội Viên" (Subscription).',
      '2. Chọn gói cước phù hợp (Gói Pro cho cá nhân hoặc Gói Team cho nhóm 5 người).',
      '3. Quét mã VietQR chuyển khoản với đúng nội dung được cung cấp.',
      '4. Hệ thống sẽ tự động kích hoạt tài khoản và mở khóa toàn bộ tính năng chỉ sau vài phút!'
    ],
    suggestedActionView: 'subscription'
  },

  automation_rule_not_firing: {
    issueId: 'automation_rule_not_firing',
    problemStatement: 'Quy tắc tự động không kích hoạt khi sự kiện xảy ra',
    symptoms: [
      'Sự kiện xảy ra (ví dụ hoàn thành task) nhưng hành động tiếp theo không tự động chạy',
      'Không nhận được thông báo tự động mong muốn'
    ],
    rootCauses: [
      'Công tắc kích hoạt (toggle) trong tab Rules đang bị TẮT (màu xám)',
      'Quy tắc có mức độ nhạy cảm cao và hành động đang nằm trong tab "Approvals" chờ bạn bấm duyệt tay',
      'Điều kiện lọc (Conditions) bị trả về FALSE do dữ liệu không khớp chính xác',
      'Đang bị giới hạn bởi thời gian hồi (Cooldown - ví dụ chỉ chạy 1 lần/ngày)',
      'Hệ thống phát hiện xung đột và tạm khóa quy tắc tại tab "Conflicts"'
    ],
    resolutionSteps: [
      '1. Vào tab "Rules" kiểm tra xem công tắc kích hoạt của quy tắc có đang BẬT (màu xanh) hay không.',
      '2. Vào tab "Approvals" xem có lệnh nào đang chờ bạn bấm nút phê duyệt hay không.',
      '3. Mở tab "History" để tra cứu nhật ký: xem dòng log gần nhất để biết điều kiện nào bị sai.',
      '4. Chuyển sang tab "Simulation" để chạy thử nghiệm dry-run với dữ liệu giả định và kiểm tra logic.'
    ],
    suggestedActionView: 'automation'
  },

  payment_missing_order_code: {
    issueId: 'payment_missing_order_code',
    problemStatement: 'Đã chuyển khoản VietQR nhưng quên ghi mã đơn hàng trong nội dung',
    symptoms: [
      'Đã trừ tiền ngân hàng nhưng sau 10 phút tài khoản LifeOS vẫn chưa được nâng cấp',
      'Trạng thái đơn hàng vẫn hiển thị "Đang chờ thanh toán"'
    ],
    rootCauses: [
      'Nội dung chuyển khoản bị thiếu hoặc sai mã định danh DUOTECH ORD_..., khiến hệ thống webhook tự động không thể khớp nối với tài khoản'
    ],
    resolutionSteps: [
      '1. Đừng lo lắng! Tiền của bạn không bị mất, chỉ cần Admin duyệt thủ công.',
      '2. Mở app ngân hàng, chụp lại ảnh màn hình Biên lai giao dịch thành công (thấy rõ mã giao dịch, số tiền và thời gian).',
      '3. Vào mục Hỗ trợ hoặc liên hệ Quản trị viên (Admin) gửi ảnh biên lai kèm email tài khoản để Admin duyệt kích hoạt ngay.'
    ],
    suggestedActionView: 'checkout'
  },

  high_risk_task_warning: {
    issueId: 'high_risk_task_warning',
    problemStatement: 'Nhiệm vụ bị gắn cờ đỏ "Rủi ro cao" (High Risk)',
    symptoms: [
      'Thẻ nhiệm vụ xuất hiện huy hiệu cờ đỏ hoặc viền cảnh báo rủi ro'
    ],
    rootCauses: [
      'Nhiệm vụ đã vượt quá hạn chót (Overdue) mà chưa chuyển sang trạng thái Hoàn thành',
      'Nhiệm vụ đến hạn hoàn thành trong hôm nay nhưng có mức độ ưu tiên Cao/Nghiêm trọng hoặc thời lượng dự kiến > 3 giờ'
    ],
    resolutionSteps: [
      '1. Lọc danh sách công việc theo cờ Rủi ro cao.',
      '2. Nếu việc còn làm được: Bật ngay một phiên Focus Pomodoro 25-50 phút để giải quyết dứt điểm.',
      '3. Nếu khối lượng quá lớn: Chia nhỏ thành các Subtasks hoặc thương lượng dời lại hạn chót (Reschedule).'
    ],
    suggestedActionView: 'tasks'
  },

  vocab_overwhelmed_due_cards: {
    issueId: 'vocab_overwhelmed_due_cards',
    problemStatement: 'Số lượng từ vựng cần ôn tập hôm nay quá nhiều, cảm thấy quá tải',
    symptoms: [
      'Danh sách "Học hôm nay" hiển thị hàng chục hoặc hàng trăm từ đến hạn',
      'Cảm giác nản lòng và sợ không hoàn thành được mục tiêu'
    ],
    rootCauses: [
      'Bỏ bẵng việc ôn tập trong nhiều ngày khiến các từ bị dồn ứ theo đường cong quên lãng'
    ],
    resolutionSteps: [
      '1. Đừng cố học dồn tất cả trong một buổi! Hãy chia nhỏ thành các phiên ngắn 15 phút (khoảng 20 từ mỗi phiên).',
      '2. Vào tab "Học hôm nay" để hệ thống ưu tiên những từ sắp rơi vào vùng quên sâu nhất trước.',
      '3. Đánh giá trung thực: Từ nào quên hẳn thì bấm 1 (Lại) mà không cần tự trách bản thân, não bộ cần lặp lại nhiều lần để nhớ lâu.'
    ],
    suggestedActionView: 'study'
  }
};
