import json
import re

with open("src/lib/translations_dict.ts", "r", encoding="utf-8") as f:
    content = f.read()

m = re.search(r"export const fullTranslations: Record<string, string> = (\{[\s\S]*?\});", content)
d = json.loads(m.group(1))

# Explicit translations dictionary for key terms and phrases
exact_translations = {
    "Hôm nay": "Today",
    "Hôm nay!": "Today!",
    "Hôm qua": "Yesterday",
    "Ngày mai": "Tomorrow",
    "Hôm nay bạn cần làm gì?": "What do you need to do today?",
    "HÔM NAY": "TODAY",
    "Đã hoàn thành hôm nay": "Completed today",
    "Quá hạn": "Overdue",
    "Cần xử lý khẩn cấp": "Urgent attention needed",
    "Rủi ro cao": "High Risk",
    "Hạn chót gấp / Tải lớn": "Tight Deadline / Heavy Load",
    "Tổng công việc": "Total Tasks",
    "Đang chờ xử lý": "Pending Processing",
    "Tất cả": "All",
    "Chưa làm": "To Do",
    "Đang làm": "In Progress",
    "Hoàn thành": "Completed",
    "Đang chờ": "Waiting",
    "Hủy": "Cancelled",
    "Nghiêm trọng": "Critical",
    "Cao": "High",
    "Trung bình": "Medium",
    "Thấp": "Low",
    "Đang lọc bảng Kanban theo:": "Filtering Kanban board by:",
    "công việc": "tasks",
    "công việc tìm thấy": "tasks found",
    "Xem dạng danh sách": "View List Mode",
    "Hiển thị tất cả": "Show All",
    "Thêm công việc": "Add Task",
    "Thêm Công việc Mới": "Add New Task",
    "Chỉnh sửa Công việc": "Edit Task",
    "Thêm nhanh công việc mới... (Nhập tên rồi nhấn Enter để lưu)": "Quick add task... (Enter title then press Enter to save)",
    "Thêm ngay": "Add Now",
    "Kéo thả hoặc thêm việc vào đây": "Drag & drop or add tasks here",
    "Xóa nhanh": "Quick delete",
    "Đánh dấu chưa hoàn thành": "Mark as incomplete",
    "Đánh dấu hoàn thành": "Mark as completed",
    "Đo thời gian làm việc": "Track work hours",
    "Bắt đầu": "Start",
    "Chỉnh sửa chi tiết": "Edit details",
    "Xóa công việc": "Delete task",
    "Xóa tìm kiếm": "Clear search",
    "Xóa bộ lọc": "Clear filters",
    "Không tìm thấy công việc nào khớp với từ khóa": "No tasks found matching keyword",
    "Không có công việc nào thuộc danh mục lọc": "No tasks found in category",
    "Chưa có công việc nào. Hãy thêm công việc đầu tiên ở ô trên!": "No tasks yet. Add your first task in the box above!",
    "Lập kế hoạch, theo dõi tiến độ và tối ưu thời gian thực hiện tác vụ": "Plan, track progress, and optimize task execution time",
    "Quản lý Công việc": "Tasks Management",
    "+ Chuyển thành Task": "+ Convert to Task",
    "+ Chuyển thành Task thật": "+ Convert to Real Task",
    "+ Thêm Section": "+ Add Section",
    "+ Thêm tài khoản thực tế": "+ Add Real Account",
    "+ Tạo nhanh": "+ Quick Create",
    "1. Nội dung 1\\n2. Nội dung 2": "1. Content 1\\n2. Content 2",
    "Bấm nút \"Thêm Dự án\" để khởi tạo dự án đầu tiên.": "Click \"Add Project\" to create your first project.",
    "Bấm nút \"Thêm Thói quen\" để bắt đầu theo dõi.": "Click \"Add Habit\" to start tracking.",
    "Ví dụ:\\nBudget <= 30 triệu\\nKhông ảnh hưởng Quỹ Tiết kiệm\\nDùng ổn định ít nhất 4 năm": "e.g.:\\nBudget <= 30M\\nDo not affect Savings\\nStable for at least 4 years",
    "có thể đã bị xóa hoặc tạm ngưng hoạt động.": "may have been deleted or temporarily suspended.",
    "cùng toàn bộ dữ liệu người dùng trong module này? Thao tác không thể hoàn tác.": "along with all user data in this module? This action cannot be undone.",
    "không?": "no?",
    "khỏi nhóm? Người dùng này sẽ lập tức mất quyền truy cập trả phí.": "from team? This user will immediately lose premium access.",
    "thành công vào không gian làm việc của bạn!": "successfully into your workspace!",
    "thành công! Giá mới sẽ áp dụng an toàn cho các đơn hàng tạo sau thời điểm này.": "successfully! The new price will apply safely to future orders.",
    "thành công!": "successfully!",
    "thành công.": "successfully.",
    "vào hệ thống!": "into the system!",
    "yêu cầu tài khoản đã kích hoạt gói dịch vụ. Vui lòng kích hoạt gói để sử dụng toàn bộ mẫu.": "requires an active subscription. Please activate a plan to use all templates.",
    ": 'Tạo công việc mới: /task [tên công việc": ": 'Create new task: /task [task title]",
    "% của mục tiêu": "% of goal",
    "% hoàn thành": "% completed",
    "% hạn mức": "% of budget limit",
    "% kỷ luật": "% discipline",
    "% thấp hơn mức kỳ vọng theo hạn chót": "% below expected progress for deadline",
    "% | Hạn:": "% | Due:",
    "Bản quyền cá nhân": "Personal License",
    "Bật / Có": "Enabled / Yes",
    "cao hơn định mức thông thường": "higher than standard benchmark",
    "bạn cần:": "you need:",
    "xuất ngày:": "exported on:",
    "Chi phí:": "Cost:",
    "Ghi chép, liên kết ý tưởng, quản lý cuộc họp & xây dựng Knowledge Graph cá nhân.": "Record, connect ideas, manage meetings & build a personal Knowledge Graph.",
    "Hệ thống Ghi chú & Tri thức": "Notes & Knowledge System",
    "Tạo Ghi chú mới": "Create New Note"
}

# Update dictionary with exact translations
for k, v in exact_translations.items():
    d[k] = v
    # Also case-variations
    d[k.lower()] = v.lower() if not v[0].isupper() else v
    d[k.upper()] = v.upper()

# Scan for any remaining Vietnamese values
vi_regex = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]", re.I)

terms = [
    ("thành công", "successful"),
    ("hoàn thành", "completed"),
    ("công việc", "tasks"),
    ("dự án", "projects"),
    ("mục tiêu", "goals"),
    ("thói quen", "habits"),
    ("tài chính", "finance"),
    ("ghi chú", "notes"),
    ("hôm nay", "today"),
    ("quá hạn", "overdue"),
    ("chưa làm", "to do"),
    ("đang làm", "in progress"),
    ("đang chờ", "waiting"),
    ("tất cả", "all"),
    ("quản lý", "management"),
    ("thêm", "add"),
    ("xóa", "delete"),
    ("sửa", "edit"),
    ("lưu", "save"),
    ("hủy", "cancel"),
    ("xác nhận", "confirm"),
    ("cảnh báo", "warning"),
    ("thông báo", "notification"),
    ("tài khoản", "account"),
    ("ngân hàng", "bank"),
    ("chuyển khoản", "transfer"),
    ("thanh toán", "payment"),
    ("gói", "plan"),
    ("người dùng", "user"),
    ("khách hàng", "customer"),
    ("thành viên", "member"),
    ("hệ thống", "system")
]

cleaned_dict = {}
for k, v in d.items():
    clean_k = k.strip(" \t\r\n`'\",;()")
    val = v
    if vi_regex.search(val):
        if clean_k in exact_translations:
            val = exact_translations[clean_k]
        elif k in exact_translations:
            val = exact_translations[k]
        else:
            # Vocabulary replacement
            trans_val = val
            for vi, en in terms:
                trans_val = re.sub(re.escape(vi), en, trans_val, flags=re.I)
            val = trans_val
    
    cleaned_dict[k] = val
    if clean_k != k:
        cleaned_dict[clean_k] = val

out_ts = f"""// Autogenerated comprehensive translation dictionary for LifeOS
export const fullTranslations: Record<string, string> = {json.dumps(cleaned_dict, indent=2, ensure_ascii=False)};
"""

with open("src/lib/translations_dict.ts", "w", encoding="utf-8") as f:
    f.write(out_ts)

print("Saved updated src/lib/translations_dict.ts")
