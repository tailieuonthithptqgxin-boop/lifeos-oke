/**
 * LifeOS Feature Knowledge
 * Deep functional specification of key modules, sub-tabs, algorithms, and parameters.
 */

export interface FeatureDetail {
  featureId: string;
  name: string;
  viewId: string;
  purpose: string;
  requiredTier: 'FREE' | 'PRO' | 'TEAM' | 'ADMIN';
  whoCanUse: string;
  coreLogic: string;
  subFeatures: Record<string, {
    name: string;
    description: string;
    howToUse: string;
    keyPoints: string[];
  }>;
  commonQuestions: Array<{
    q: string;
    a: string;
  }>;
}

export const FEATURE_KNOWLEDGE_MAP: Record<string, FeatureDetail> = {
  automation: {
    featureId: 'automation',
    name: 'Động Cơ Tự Động Hóa (Automation Engine)',
    viewId: 'automation',
    purpose: 'Tự động hóa các tác vụ lặp đi lặp lại giữa các module trong LifeOS (Trigger -> Conditions -> Actions).',
    requiredTier: 'PRO',
    whoCanUse: 'Tài khoản gói Pro, Team hoặc Admin.',
    coreLogic: 'Lắng nghe các sự kiện (Domain Events) từ các module Task, Finance, Habits, Focus, Goal. Khi có sự kiện phù hợp, hệ thống đánh giá nhóm điều kiện logic (AND/OR). Nếu thỏa mãn, hành động (Action) sẽ được thực thi theo giới hạn Cooldown và chính sách Phê duyệt (Approval policy).',
    subFeatures: {
      dashboard: {
        name: 'Dashboard Tổng quan',
        description: 'Hiển thị các chỉ số KPI: Tổng quy tắc, Quy tắc đang bật, Tỷ lệ thực thi thành công (%), Số lượt chạy hôm nay.',
        howToUse: 'Truy cập tab đầu tiên để xem sức khỏe hệ thống tự động hóa.',
        keyPoints: ['Thống kê thời gian thực', 'Biểu đồ hoạt động 7 ngày gần nhất', 'Cảnh báo nhanh nếu có lỗi']
      },
      rules: {
        name: 'Danh sách Quy tắc (Rules)',
        description: 'Quản lý toàn bộ các kịch bản tự động đã cấu hình trong hệ sinh thái.',
        howToUse: 'Bật/tắt công tắc (toggle switch) màu xanh để kích hoạt hoặc tạm dừng một quy tắc. Bấm biểu tượng cây bút để sửa, thùng rác để xóa.',
        keyPoints: ['Công tắc bật/tắt tức thì', 'Gắn nhãn Module tương ứng', 'Xem trạng thái nhạy cảm (Sensitivity)']
      },
      builder: {
        name: 'Trình tạo quy tắc (Builder)',
        description: 'Quy trình tạo quy tắc 5 bước chuẩn kỹ thuật.',
        howToUse: 'Đi qua 5 bước: 1. Đặt tên & chọn Module -> 2. Chọn Trigger sự kiện -> 3. Đặt điều kiện lọc AND/OR -> 4. Chọn Hành động thực thi -> 5. Đặt thời gian hồi (Cooldown) và yêu cầu phê duyệt.',
        keyPoints: [
          'Bước 1 (Thông tin): Tên quy tắc, Module mục tiêu, Mức độ nhạy cảm (Thấp/Vừa/Cao).',
          'Bước 2 (Trigger): Sự kiện kích hoạt (Ví dụ: Khi Task đổi sang Done, Khi thêm giao dịch chi tiêu, Khi chuỗi thói quen tăng).',
          'Bước 3 (Điều kiện): Lập nhóm logic AND/OR với các toán tử so sánh (bằng, lớn hơn, chứa, nằm trong danh sách).',
          'Bước 4 (Action): Hành động hệ thống (Tạo Task mới, Bắn thông báo chuông, Tạo giao dịch tự động, Ghi nhật ký).',
          'Bước 5 (An toàn): Cooldown (once_per_hour, once_per_day) chống lặp vô tận, cờ require_approval cho lệnh nhạy cảm.'
        ]
      },
      templates: {
        name: 'Mẫu kịch bản có sẵn (Templates)',
        description: 'Thư viện các công thức tự động hóa phổ biến do LifeOS thiết kế sẵn.',
        howToUse: 'Bấm nút "Sử dụng mẫu này" -> xem trước thông số -> bấm Lưu để kích hoạt ngay.',
        keyPoints: ['Mẫu nhắc việc quá hạn', 'Mẫu chúc mừng khi giữ Streak', 'Mẫu cảnh báo vượt 80% ngân sách']
      },
      approvals: {
        name: 'Hàng đợi Phê duyệt (Approvals)',
        description: 'Khu vực quản lý các tác vụ tự động cần con người xác nhận trước khi thực hiện.',
        howToUse: 'Kiểm tra danh sách các lệnh đang chờ, bấm "Phê duyệt" để chạy hoặc "Từ chối" để hủy bỏ.',
        keyPoints: ['Bảo vệ an toàn cho các tác vụ nhạy cảm (như xóa dữ liệu, tạo giao dịch lớn)', 'Ngăn chặn tác vụ tự ý chạy ngoài ý muốn']
      },
      simulation: {
        name: 'Phòng Giả Lập (Simulation)',
        description: 'Môi trường kiểm thử Dry-run với dữ liệu giả lập (mock payload) mà không ảnh hưởng đến dữ liệu thật.',
        howToUse: 'Chọn một quy tắc -> Nhập thông số giả lập -> Bấm "Chạy thử nghiệm (Run Test Simulation)" -> Xem kết quả đánh giá điều kiện và dự đoán hành động.',
        keyPoints: [
          'Chạy thử an toàn 100% không làm bẩn dữ liệu thật',
          'Hiển thị trực quan từng bước điều kiện: TRUE hay FALSE',
          'Phát hiện lỗi logic trước khi đưa vào chạy ngầm'
        ]
      },
      scheduled: {
        name: 'Tác vụ Định kỳ (Scheduled Jobs)',
        description: 'Quản lý các quy tắc chạy theo lịch trình thời gian cố định (Cron-style).',
        howToUse: 'Xem các mốc giờ chạy tự động hàng ngày/hàng tuần như tổng kết ngày lúc 21:00.',
        keyPoints: ['Lịch chạy định kỳ', 'Thời gian lần chạy tiếp theo']
      },
      analytics: {
        name: 'Phân tích Hiệu suất (Analytics)',
        description: 'Đo lường tần suất kích hoạt, thời gian phản hồi trung bình và tỷ lệ lỗi.',
        howToUse: 'Xem biểu đồ đường và cột phân tích theo tuần hoặc theo tháng.',
        keyPoints: ['Thời gian phản hồi', 'Tỷ lệ thành công', 'Top quy tắc hoạt động nhiều nhất']
      },
      history: {
        name: 'Nhật ký Thực thi (Execution History)',
        description: 'Audit log chi tiết từng lượt chạy trong quá khứ.',
        howToUse: 'Tìm kiếm theo tên quy tắc hoặc lọc theo trạng thái Thành công / Thất bại. Bấm vào từng dòng để xem Input payload và Output log.',
        keyPoints: ['Thời gian chính xác đến từng giây', 'Lý do thất bại nếu có lỗi', 'Lưu vết kiểm toán đầy đủ']
      },
      conflicts: {
        name: 'Phát hiện Xung đột (Conflict Detection)',
        description: 'Thuật toán tự động quét và cảnh báo các quy tắc đối nghịch nhau hoặc tạo vòng lặp luẩn quẩn.',
        howToUse: 'Kiểm tra xem có thẻ cảnh báo xung đột nào không. Nếu có, làm theo hướng dẫn sửa điều kiện loại trừ.',
        keyPoints: ['Chống vòng lặp vô tận (Infinite Loops)', 'Chống quy tắc mâu thuẫn (Ví dụ: Quy tắc A bật task X, Quy tắc B đóng task X)']
      }
    },
    commonQuestions: [
      {
        q: 'Tại sao quy tắc tự động của tôi không kích hoạt?',
        a: 'Bạn hãy kiểm tra 4 điểm sau: 1. Đảm bảo toggle công tắc ở tab Rules đang BẬT. 2. Kiểm tra tab Approvals xem lệnh có đang chờ duyệt tay không. 3. Mở tab History xem điều kiện có bị trả về FALSE hoặc vướng Cooldown không. 4. Kiểm tra tab Conflicts xem có bị tạm khóa do xung đột logic không.'
      },
      {
        q: 'Tab Mô phỏng (Simulation) dùng để làm gì?',
        a: 'Tab Simulation là phòng thí nghiệm Dry-run an toàn: cho phép bạn đưa dữ liệu giả lập vào để kiểm tra xem trigger và điều kiện của quy tắc có chạy chuẩn xác hay không mà hoàn toàn KHÔNG làm thay đổi dữ liệu thật trong app!'
      }
    ]
  },
  study: {
    featureId: 'study',
    name: 'Study OS & Vocabulary Master',
    viewId: 'study',
    purpose: 'Hệ thống học từ vựng tiếng Anh và tiếng Trung thông minh với thuật toán Spaced Repetition (SM-2) và Active Recall.',
    requiredTier: 'FREE',
    whoCanUse: 'Người dùng Free có thể học các tính năng cơ bản; mở khóa trọn vẹn 10.240 từ HSK 1-6 với gói Pro.',
    coreLogic: 'Áp dụng đường cong quên lãng Ebbinghaus kết hợp thuật toán SM-2: Khoảng cách ôn tập I(n) được tính toán dựa trên số lần ôn lặp lại n và hệ số dễ Ease Factor (EF). Mỗi lần người dùng đánh giá (1-Lại, 2-Khó, 3-Tốt, 4-Dễ), hệ thống sẽ tính lại ngày ôn tập tiếp theo.',
    subFeatures: {
      dashboard: {
        name: 'Tổng quan (Dashboard)',
        description: 'Báo cáo chỉ số học tập: Số từ đã thuộc, Từ cần ôn hôm nay, Tỷ lệ nhớ chính xác (%), Chuỗi Streak ngày liên tiếp.',
        howToUse: 'Xem đầu ngày để nắm khối lượng học tập cần hoàn thành.',
        keyPoints: ['Chỉ số Streak động lực', 'Tỷ lệ thuộc từ dài hạn', 'Đề xuất số từ nên học hôm nay']
      },
      today: {
        name: 'Học hôm nay (Today Study)',
        description: 'Danh sách các từ vựng ưu tiên cần ôn trong ngày theo lịch trình SM-2.',
        howToUse: 'Bấm nút "Bắt đầu phiên học" để mở phiên flashcard giải quyết hết các từ đến hạn.',
        keyPoints: ['Tự động lọc từ sắp rơi vào vùng quên', 'Giới hạn số từ hợp lý tránh quá tải']
      },
      memory: {
        name: 'Đường cong trí nhớ (Memory Curve)',
        description: 'Biểu đồ phân loại từ vựng thành các cấp độ trí nhớ từ Vừa học -> Ngắn hạn -> Trung hạn -> Dài hạn vĩnh viễn.',
        howToUse: 'Quan sát sự dịch chuyển của các từ vựng sang nhóm trí nhớ dài hạn theo thời gian.',
        keyPoints: ['Mô hình trực quan hóa đường cong Ebbinghaus', 'Thước đo tiến bộ thực tế']
      },
      oxford3000: {
        name: '3000 Từ Oxford thông dụng',
        description: 'Bộ 3000 từ vựng cốt lõi tiếng Anh bao quát 85% hội thoại đời sống, phân cấp từ A1 đến C1.',
        howToUse: 'Tìm kiếm từ khóa, nghe audio phát âm chuẩn, bấm dấu cộng để lưu vào bộ sưu tập cá nhân.',
        keyPoints: ['Chuẩn CEFR A1-C1', 'Có phiên âm IPA và audio', 'Ví dụ câu chuẩn ngữ cảnh']
      },
      chineseHsk: {
        name: 'Kho 10.000 Từ HSK Tiếng Trung',
        description: 'Kho dữ liệu 10.240 từ HSK tiếng Trung đầy đủ từ HSK 1 đến HSK 6.',
        howToUse: 'Chọn bộ lọc cấp độ HSK 1 - 6, tra cứu theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt.',
        keyPoints: [
          'Hán tự Giản thể và Phồn thể chính xác',
          'Pinyin đầy đủ thanh điệu chuẩn',
          'Nghĩa tiếng Việt rõ ràng, kèm phân loại từ loại',
          'Câu ví dụ tiếng Trung kèm Pinyin và dịch nghĩa tiếng Việt',
          'Đã qua kiểm định dữ liệu và loại bỏ hoàn toàn hallucination'
        ]
      },
      personal: {
        name: 'Từ vựng cá nhân (Personal Vocab)',
        description: 'Nơi người dùng tự thêm các từ vựng riêng trong quá trình đọc sách, xem phim, làm việc.',
        howToUse: 'Bấm "Thêm từ mới" -> Nhập từ, phiên âm, nghĩa và ví dụ -> Bấm Lưu.',
        keyPoints: ['Hỗ trợ thêm từ tự do', 'Tích hợp vào phiên Spaced Repetition như từ chuẩn']
      },
      collections: {
        name: 'Bộ sưu tập (Collections)',
        description: 'Gom các từ vựng thành từng chủ đề riêng (Ví dụ: Từ vựng Du lịch, Kinh doanh, Y khoa).',
        howToUse: 'Tạo bộ sưu tập mới -> Thêm các từ vựng vào album -> Chọn học riêng theo bộ sưu tập.',
        keyPoints: ['Phân nhóm linh hoạt', 'Dễ dàng ôn tập theo mục tiêu cụ thể']
      },
      study: {
        name: 'Phiên học & Luyện tập (Study Session)',
        description: 'Giao diện tương tác lật thẻ Flashcard Active Recall, Trắc nghiệm 4 đáp án và Gõ chính tả.',
        howToUse: 'Nhìn từ -> Tự nhớ lại nghĩa -> Nhấp để lật thẻ -> Bấm 1 trong 4 nút đánh giá (1: Lại, 2: Khó, 3: Tốt, 4: Dễ).',
        keyPoints: [
          'Nút 1 (Lại): Chưa nhớ ra -> Hệ thống sẽ cho xuất hiện lại ngay trong phiên.',
          'Nút 2 (Khó): Nhớ vất vả -> Ôn lại sau 1-2 ngày.',
          'Nút 3 (Tốt): Nhớ chính xác -> Giãn cách theo thuật toán chuẩn.',
          'Nút 4 (Dễ): Nhớ tức thì dưới 1 giây -> Tăng Ease Factor và giãn khoảng cách xa hơn.'
        ]
      },
      audit: {
        name: 'Kiểm định dữ liệu (Quality Audit)',
        description: 'Khu vực kiểm tra tính xác thực của từ vựng, rà soát Pinyin, thanh điệu và câu ví dụ do AI hỗ trợ.',
        howToUse: 'Xem trạng thái kiểm định (Đã duyệt / Chờ kiểm tra / Cần hiệu đính). Người dùng có thể báo cáo từ sai để cập nhật.',
        keyPoints: ['Đảm bảo độ chính xác học thuật 100%', 'Minh bạch nguồn gốc dữ liệu']
      }
    },
    commonQuestions: [
      {
        q: 'Spaced Repetition hoạt động như thế nào trong Study OS?',
        a: 'Thuật toán SM-2 tính toán thời điểm bạn sắp sửa quên từ vựng để đưa ra ôn tập. Nếu bạn bấm nút 3 (Tốt) hoặc 4 (Dễ), khoảng cách ôn sẽ giãn từ 1 ngày -> 3 ngày -> 7 ngày -> 16 ngày... Bạn chỉ mất 10-15 phút mỗi ngày nhưng nhớ từ vĩnh viễn!'
      },
      {
        q: 'Bốn nút đánh giá 1-Lại, 2-Khó, 3-Tốt, 4-Dễ nên bấm như thế nào?',
        a: 'Bấm 1 (Lại) khi quên hoàn toàn; bấm 2 (Khó) khi mất hơn 5 giây mới nhớ ra; bấm 3 (Tốt) khi nhớ chuẩn sau 2-3 giây; bấm 4 (Dễ) khi từ bật ra tức thì trong đầu dưới 1 giây.'
      }
    ]
  },
  tasks: {
    featureId: 'tasks',
    name: 'Quản Lý Nhiệm Vụ & Kanban (Tasks)',
    viewId: 'tasks',
    purpose: 'Quản lý danh sách công việc hàng ngày, theo dõi tiến độ Kanban, đo lường thời gian thực tế và cảnh báo rủi ro deadline.',
    requiredTier: 'FREE',
    whoCanUse: 'Tất cả người dùng.',
    coreLogic: 'Quản lý vòng đời công việc theo 5 trạng thái: Chưa làm (To Do), Đang làm (In Progress), Đang chờ (Blocked), Hoàn thành (Done), Hủy. Tự động tính tỷ lệ % hoàn thành dựa trên số lượng Subtasks.',
    subFeatures: {
      list: {
        name: 'Chế độ Danh sách (List View)',
        description: 'Hiển thị công việc theo hàng dọc với bộ lọc theo Hạn chót, Mức độ ưu tiên, Dự án và Thẻ tag.',
        howToUse: 'Quét nhanh các công việc cần làm, tích vào ô tròn để đánh dấu hoàn thành nhanh.',
        keyPoints: ['Lọc nhanh theo ngày hôm nay', 'Sắp xếp theo độ ưu tiên', 'Hiển thị thanh tiến độ subtasks']
      },
      kanban: {
        name: 'Bảng Kanban (Kanban Board)',
        description: 'Giao diện trực quan 4 cột trạng thái: Chưa làm, Đang làm, Đang chờ, Hoàn thành.',
        howToUse: 'Kéo thả thẻ nhiệm vụ từ cột này sang cột khác để cập nhật tiến độ.',
        keyPoints: ['Kéo thả mượt mà', 'Xem nhanh khối lượng công việc ở từng giai đoạn']
      },
      taskTimer: {
        name: 'Bộ đếm giờ nhiệm vụ (Live Task Timer)',
        description: 'Đồng hồ bấm giờ trực tiếp gắn trên mỗi thẻ nhiệm vụ.',
        howToUse: 'Bấm nút Play ⏱️ khi bắt đầu làm task để đồng hồ chạy ngầm, bấm Pause khi dừng.',
        keyPoints: ['Ghi nhận giờ làm thực tế (Actual Hours)', 'So sánh với giờ ước tính (Estimated Hours)']
      },
      subtasks: {
        name: 'Checklist Nhiệm vụ con (Subtasks)',
        description: 'Chia nhỏ nhiệm vụ lớn thành các đầu việc nhỏ cụ thể.',
        howToUse: 'Mở chi tiết nhiệm vụ -> Nhập nội dung subtask và bấm Thêm -> Tích chọn khi làm xong.',
        keyPoints: ['Tự động tính % hoàn thành', 'Giúp giải quyết tâm lý trì hoãn']
      },
      highRisk: {
        name: 'Cảnh báo Rủi ro cao (High Risk Flag)',
        description: 'Hệ thống tự động gắn nhãn cờ đỏ cảnh báo rủi ro.',
        howToUse: 'Lọc các task có cờ đỏ để ưu tiên xử lý trước.',
        keyPoints: [
          'Gắn cờ khi nhiệm vụ đã quá hạn (Overdue)',
          'Gắn cờ khi nhiệm vụ đến hạn hôm nay có mức ưu tiên Cao/Nghiêm trọng hoặc thời gian dự kiến > 3 giờ'
        ]
      }
    },
    commonQuestions: [
      {
        q: 'Làm sao để tạo một task có checklist việc con?',
        a: 'Bạn vào mục Nhiệm vụ -> Bấm "Thêm nhiệm vụ" (hoặc nhấp vào một task đã có) -> Cuộn xuống phần "Nhiệm vụ con (Subtasks)" -> Gõ tên từng đầu việc nhỏ và nhấn Enter. Khi bạn tích hoàn thành từng mục, thanh tiến độ % của task sẽ tự động tăng lên!'
      }
    ]
  },
  focus: {
    featureId: 'focus',
    name: 'Focus Pomodoro & Deep Work',
    viewId: 'focus',
    purpose: 'Không gian chuyên biệt cho làm việc và học tập tập trung sâu, loại bỏ xao nhãng.',
    requiredTier: 'FREE',
    whoCanUse: 'Tất cả người dùng.',
    coreLogic: 'Đồng hồ đếm ngược với 2 chế độ chuẩn: Pomodoro cổ điển (25 phút tập trung / 5 phút nghỉ) hoặc Deep Work dài (50 phút tập trung / 10 phút nghỉ). Tự động ghi log vào cơ sở dữ liệu khi hoàn thành phiên.',
    subFeatures: {
      timer: {
        name: 'Đồng hồ đếm ngược',
        description: 'Giao diện vòng tròn đếm ngược tối giản, hiển thị thời gian còn lại.',
        howToUse: 'Bấm Bắt đầu để đồng hồ chạy, Tạm dừng khi cần gián đoạn, Đặt lại để chạy lại từ đầu.',
        keyPoints: ['Chế độ 25/5 hoặc 50/10', 'Thông báo chuông khi hết phiên']
      },
      soundscapes: {
        name: 'Âm thanh môi trường (Soundscapes)',
        description: 'Nhạc nền lofi nhẹ nhàng, tiếng mưa rơi, tiếng rừng cây hoặc tiếng sóng biển.',
        howToUse: 'Bấm vào biểu tượng loa để chọn bài nhạc/âm thanh môi trường yêu thích.',
        keyPoints: ['Tạo nhịp điệu tập trung', 'Khử tạp âm môi trường xung quanh']
      },
      sessionLog: {
        name: 'Nhật ký phiên tập trung',
        description: 'Thống kê tổng số phút tập trung đã đạt được trong ngày và chuỗi phiên liên tiếp.',
        howToUse: 'Xem biểu đồ cột các phiên tập trung trong ngày tại phần dưới của trang.',
        keyPoints: ['Liên kết với nhiệm vụ đang làm', 'Cộng dồn vào chỉ số Streak']
      }
    },
    commonQuestions: [
      {
        q: 'Focus Mode khác gì với một chiếc Timer đồng hồ thông thường?',
        a: 'Focus Mode trong LifeOS không chỉ đếm giờ đơn thuần mà là một môi trường Deep Work hoàn chỉnh: 1. Tích hợp nhạc lofi/âm thanh môi trường khử tạp âm; 2. Tự động ghi nhận số giờ học thực tế vào Nhật ký; 3. Liên kết trực tiếp với Nhiệm vụ đang làm để tự cộng giờ thực tế; 4. Nuôi dưỡng chuỗi Streak và kích hoạt bé AI Companion đồng hành tiếp sức!'
      }
    ]
  },
  decision: {
    featureId: 'decision',
    name: 'Ma Trận Quyết Định (Decision Engine)',
    viewId: 'decision',
    purpose: 'Giải quyết các tình huống phân vân lựa chọn bằng phương pháp chấm điểm ma trận trọng số khách quan.',
    requiredTier: 'PRO',
    whoCanUse: 'Tài khoản gói Pro, Team hoặc Admin.',
    coreLogic: 'Công thức tính điểm trọng số: Điểm tổng của phương án = Tổng của (Điểm tiêu chí x Trọng số tiêu chí). Phương án có tổng điểm cao nhất sẽ được hệ thống đề xuất.',
    subFeatures: {
      matrix: {
        name: 'Bảng Ma trận Chấm điểm',
        description: 'Ma trận gồm các dòng là Phương án lựa chọn và các cột là Tiêu chí đánh giá kèm trọng số (1-10).',
        howToUse: 'Thêm ít nhất 2 phương án -> Thêm các tiêu chí và gán trọng số -> Chấm điểm từng ô từ 1 đến 10 -> Xem bảng xếp hạng tự động.',
        keyPoints: ['Tính toán tự động theo thời gian thực', 'Biểu đồ thanh so sánh trực quan', 'Loại bỏ định kiến cảm xúc']
      }
    },
    commonQuestions: [
      {
        q: 'Ma trận quyết định hoạt động như thế nào?',
        a: 'Bạn nhập các phương án muốn chọn (ví dụ: Công việc A vs B), nhập các tiêu chí (Thu nhập, Cơ hội học hỏi, Môi trường...) kèm trọng số từ 1-10. Sau đó chấm điểm từng phương án từ 1-10. Hệ thống nhân điểm với trọng số và tính tổng để chỉ ra phương án tối ưu nhất!'
      }
    ]
  },
  subscription: {
    featureId: 'subscription',
    name: 'Gói Hội Viên & Quyền Lợi',
    viewId: 'subscription',
    purpose: 'Cung cấp các gói dịch vụ nâng cấp mở khóa toàn bộ tính năng cao cấp của LifeOS.',
    requiredTier: 'FREE',
    whoCanUse: 'Tất cả người dùng.',
    coreLogic: 'Kiểm soát truy cập dựa trên gói cước: FREE, PRO, TEAM. Mua gói thông qua quét mã VietQR tự động.',
    subFeatures: {
      tiers: {
        name: 'Bảng giá và Quyền lợi',
        description: 'So sánh các gói dịch vụ:',
        howToUse: 'Bấm nút "Nâng cấp" tại gói mong muốn để chuyển sang trang quét mã thanh toán VietQR.',
        keyPoints: [
          'Gói Free: Sử dụng các tính năng cơ bản, giới hạn số từ vựng nâng cao và tự động hóa.',
          'Gói Pro (Cá nhân): Mở khóa trọn bộ 10.240 từ HSK tiếng Trung, Automation Engine 10 tab, Decision Engine, Focus nâng cao.',
          'Gói Team (Đội nhóm): Đầy đủ tính năng Pro cho tối đa 5 thành viên, Admin quản trị thành viên và cấp mã mời.'
        ]
      },
      vietqr: {
        name: 'Thanh toán VietQR Tự Động',
        description: 'Tạo mã QR thanh toán động có gắn sẵn số tiền và mã đơn hàng duy nhất.',
        howToUse: 'Mở app ngân hàng bất kỳ -> Quét mã QR -> Giữ nguyên nội dung chuyển khoản -> Xác nhận chuyển tiền.',
        keyPoints: ['Tự động duyệt và kích hoạt tài khoản trong vài phút', 'An toàn, chính xác tuyệt đối']
      }
    },
    commonQuestions: [
      {
        q: 'Tại sao tôi không xem được phần này (Bị khóa)?',
        a: 'Tính năng này yêu cầu tài khoản nâng cấp gói Pro hoặc Team (ví dụ như Động cơ Tự Động Hóa, Ma Trận Quyết Định hoặc kho từ vựng nâng cao). Bạn chỉ cần vào mục "Gói Hội Viên", chọn gói phù hợp và quét mã VietQR chuyển khoản là tài khoản sẽ được mở khóa ngay lập tức!'
      }
    ]
  }
};
