/**
 * LifeOS Workflow Knowledge
 * Prescribes end-to-end, multi-step procedures for core capabilities.
 */

export interface WorkflowGuide {
  workflowId: string;
  name: string;
  summary: string;
  targetView: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    actionDetail: string;
    screenLocationHint?: string;
  }>;
  tips: string[];
}

export const WORKFLOW_KNOWLEDGE_MAP: Record<string, WorkflowGuide> = {
  study_vocab_sm2: {
    workflowId: 'study_vocab_sm2',
    name: 'Quy trình học từ vựng với Spaced Repetition (SM-2)',
    summary: 'Cách học từ vựng hiệu quả nhất, kết hợp Active Recall và thuật toán lặp lại ngắt quãng.',
    targetView: 'study',
    steps: [
      {
        stepNumber: 1,
        title: 'Mở tab Học hôm nay hoặc Phiên học',
        actionDetail: 'Vào menu Study OS -> Chọn tab "Học hôm nay" (Today Study) để xem các từ đến hạn ôn tập, sau đó bấm nút "Bắt đầu phiên học".',
        screenLocationHint: 'Góc trên tab bar của màn hình Study OS.'
      },
      {
        stepNumber: 2,
        title: 'Thực hành Active Recall với mặt trước thẻ',
        actionDetail: 'Nhìn vào Hán tự hoặc từ vựng tiếng Anh. Trước khi nhấp lật thẻ, hãy tự phát âm to trong đầu hoặc đọc thành tiếng Pinyin và nghĩa tiếng Việt.',
        screenLocationHint: 'Thẻ Flashcard lớn ở trung tâm màn hình.'
      },
      {
        stepNumber: 3,
        title: 'Lật thẻ và đối chiếu kết quả',
        actionDetail: 'Nhấp vào giữa thẻ flashcard để hiển thị mặt sau (Pinyin, nghĩa tiếng Việt, từ loại và câu ví dụ minh họa).',
        screenLocationHint: 'Nhấp trực tiếp lên thân thẻ Flashcard.'
      },
      {
        stepNumber: 4,
        title: 'Đánh giá độ nhớ bằng 4 nút SM-2',
        actionDetail: 'Bấm 1 (Lại) nếu quên; 2 (Khó) nếu mất hơn 5s mới nhớ; 3 (Tốt) nếu nhớ chuẩn sau 2-3s; 4 (Dễ) nếu nhớ ngay dưới 1s.',
        screenLocationHint: 'Dãy 4 nút màu sắc ở đáy thẻ Flashcard.'
      },
      {
        stepNumber: 5,
        title: 'Hoàn thành phiên và nhận điểm kinh nghiệm',
        actionDetail: 'Khi hoàn thành hết thẻ của ngày, hệ thống sẽ tổng kết tỷ lệ nhớ và cộng điểm duy trì chuỗi Streak học tập!',
        screenLocationHint: 'Màn hình tổng kết cuối phiên.'
      }
    ],
    tips: [
      'Đánh giá trung thực để thuật toán xếp lịch ôn tập chuẩn xác nhất.',
      'Dành 10-15 phút mỗi ngày thay vì dồn cả tuần học một lần.'
    ]
  },

  create_task_with_checklist: {
    workflowId: 'create_task_with_checklist',
    name: 'Quy trình tạo nhiệm vụ có checklist việc con (Subtasks)',
    summary: 'Cách chia nhỏ một mục tiêu lớn thành các việc con và theo dõi tiến độ hoàn thành %.',
    targetView: 'tasks',
    steps: [
      {
        stepNumber: 1,
        title: 'Mở trang Nhiệm vụ',
        actionDetail: 'Nhấp vào mục "Nhiệm vụ" (Tasks) trên menu điều hướng bên trái.',
        screenLocationHint: 'Thanh điều hướng Sidebar bên trái.'
      },
      {
        stepNumber: 2,
        title: 'Bấm nút Thêm nhiệm vụ',
        actionDetail: 'Bấm nút "+ Thêm nhiệm vụ" ở góc trên bên phải màn hình.',
        screenLocationHint: 'Góc trên bên phải trang Nhiệm vụ.'
      },
      {
        stepNumber: 3,
        title: 'Nhập thông tin cơ bản',
        actionDetail: 'Điền Tiêu đề nhiệm vụ, chọn Mức độ ưu tiên (Thấp / Vừa / Cao / Nghiêm trọng) và Hạn chót hoàn thành.',
        screenLocationHint: 'Biểu mẫu pop-up tạo nhiệm vụ.'
      },
      {
        stepNumber: 4,
        title: 'Thêm danh sách việc con (Subtasks)',
        actionDetail: 'Cuộn xuống phần "Nhiệm vụ con (Subtasks)", nhập tên từng việc nhỏ cần làm và nhấn nút Thêm hoặc Enter.',
        screenLocationHint: 'Khu vực Checklist bên trong modal chi tiết nhiệm vụ.'
      },
      {
        stepNumber: 5,
        title: 'Lưu và theo dõi tiến độ',
        actionDetail: 'Bấm "Lưu nhiệm vụ". Khi làm việc, mỗi lần bạn tích chọn một việc con, thanh tiến độ % của nhiệm vụ cha sẽ tự động tăng lên.',
        screenLocationHint: 'Nút Lưu ở góc dưới form.'
      }
    ],
    tips: [
      'Nên chia các việc con có thời lượng dưới 30 phút để dễ bắt tay vào làm.',
      'Nhấp vào icon ⏱️ trên thẻ nhiệm vụ để bấm giờ làm việc thực tế.'
    ]
  },

  build_automation_rule: {
    workflowId: 'build_automation_rule',
    name: 'Quy trình tạo quy tắc tự động hóa 5 bước (Builder)',
    summary: 'Hướng dẫn thiết lập một luồng tự động từ Trigger đến Action an toàn.',
    targetView: 'automation',
    steps: [
      {
        stepNumber: 1,
        title: 'Vào Động cơ Tự động hóa và chọn tab Builder',
        actionDetail: 'Truy cập mục Tự động hóa -> Chọn tab "Trình tạo quy tắc (Builder)" (hoặc bấm nút "Tạo quy tắc mới").',
        screenLocationHint: 'Tab thứ 3 trên thanh tab bar Automation.'
      },
      {
        stepNumber: 2,
        title: 'Bước 1: Thiết lập thông tin chung',
        actionDetail: 'Đặt tên quy tắc, chọn Module đích (Tasks, Finance, Habits, Focus...) và chọn mức độ nhạy cảm (Thấp, Vừa, Cao).',
        screenLocationHint: 'Form Bước 1: General Info.'
      },
      {
        stepNumber: 3,
        title: 'Bước 2: Chọn Trigger sự kiện kích hoạt',
        actionDetail: 'Chọn sự kiện bắt đầu (Ví dụ: Khi trạng thái Task chuyển sang Hoàn thành, hoặc Khi chi tiêu mới được tạo).',
        screenLocationHint: 'Form Bước 2: Trigger Selection.'
      },
      {
        stepNumber: 4,
        title: 'Bước 3: Thiết lập nhóm điều kiện lọc (Conditions)',
        actionDetail: 'Tạo các điều kiện AND/OR (Ví dụ: Ưu tiên bằng "Cao" VÀ Thời gian dự kiến > 2 giờ).',
        screenLocationHint: 'Form Bước 3: Conditions Logic Builder.'
      },
      {
        stepNumber: 5,
        title: 'Bước 4: Chọn Hành động thực thi (Actions)',
        actionDetail: 'Chọn việc hệ thống cần làm (Ví dụ: Gửi thông báo chúc mừng, Tạo nhiệm vụ theo dõi, hoặc Ghi nhật ký audit).',
        screenLocationHint: 'Form Bước 4: Action Configuration.'
      },
      {
        stepNumber: 6,
        title: 'Bước 5: Cấu hình an toàn & Chạy thử nghiệm',
        actionDetail: 'Chọn thời gian hồi (Cooldown) như 1 giờ hoặc 1 ngày. Sau đó chuyển sang tab "Simulation" để chạy thử dữ liệu mẫu trước khi gạt công tắc BẬT.',
        screenLocationHint: 'Form Bước 5: Safety & Tab Simulation.'
      }
    ],
    tips: [
      'Luôn sang tab Simulation để test dry-run trước khi bật chính thức.',
      'Kiểm tra tab Conflicts để đảm bảo không bị xung đột với quy tắc cũ.'
    ]
  },

  upgrade_subscription_vietqr: {
    workflowId: 'upgrade_subscription_vietqr',
    name: 'Quy trình nâng cấp gói hội viên qua VietQR',
    summary: 'Cách thanh toán nhanh chóng bằng mã QR động chuẩn ngân hàng.',
    targetView: 'subscription',
    steps: [
      {
        stepNumber: 1,
        title: 'Mở trang Gói Hội Viên',
        actionDetail: 'Vào menu "Gói Hội Viên" (Subscription) trên thanh điều hướng bên trái.',
        screenLocationHint: 'Sidebar bên trái.'
      },
      {
        stepNumber: 2,
        title: 'Chọn gói cước mong muốn',
        actionDetail: 'Chọn gói Pro (Cá nhân) hoặc Team (Đội nhóm tối đa 5 người) -> Bấm nút "Nâng cấp ngay".',
        screenLocationHint: 'Thẻ bảng giá trên trang Subscription.'
      },
      {
        stepNumber: 3,
        title: 'Quét mã VietQR trên app ngân hàng',
        actionDetail: 'Màn hình sẽ hiển thị mã VietQR động. Mở ứng dụng ngân hàng hoặc MoMo -> Chọn Quét QR -> Hướng camera vào mã.',
        screenLocationHint: 'Màn hình Thanh toán (Checkout).'
      },
      {
        stepNumber: 4,
        title: 'Xác nhận chuyển khoản và giữ nguyên nội dung',
        actionDetail: 'Kiểm tra đúng số tiền và ĐẶC BIỆT GIỮ NGUYÊN nội dung chuyển khoản (có dạng DUOTECH ORD_...) -> Xác nhận chuyển tiền.',
        screenLocationHint: 'App ngân hàng trên điện thoại.'
      },
      {
        stepNumber: 5,
        title: 'Tự động kích hoạt tài khoản',
        actionDetail: 'Sau khi ngân hàng báo thành công, hệ thống LifeOS sẽ tự động nhận diện giao dịch và mở khóa tài khoản trong 1-3 phút!',
        screenLocationHint: 'Thông báo trên giao diện web.'
      }
    ],
    tips: [
      'Không chỉnh sửa nội dung chuyển khoản để hệ thống đối soát tự động tức thì.',
      'Nếu lỡ quên ghi mã, hãy chụp biên lai và gửi cho Admin ở mục Hỗ trợ để duyệt tay.'
    ]
  }
};
