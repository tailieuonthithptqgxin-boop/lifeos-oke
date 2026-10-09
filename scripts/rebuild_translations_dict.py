# -*- coding: utf-8 -*-
import json
import re
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append('.')

with open("src/lib/translations_dict.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Load all corrections
from corrections import CORRECTIONS
from remaining_corrections import REMAINING_CORRECTIONS
with open("batch3_result.json", "r", encoding="utf-8") as f:
    batch3 = json.load(f)

# Additional task & view specific keys to guarantee 100% translation
CRITICAL_TASK_KEYS = {
    # TasksView keys
    "Hôm nay": "Today",
    "hôm nay": "today",
    "Đã hoàn thành hôm nay": "Completed today",
    "Quá hạn": "Overdue",
    "Cần xử lý khẩn cấp": "Urgent action required",
    "Rủi ro cao": "High Risk",
    "Hạn chót gấp / Tải lớn": "Tight deadline / Heavy load",
    "Tổng công việc": "Total Tasks",
    "Đang chờ xử lý": "Pending Processing",
    "Chưa làm": "To Do",
    "Đang làm": "In Progress",
    "Hoàn thành": "Completed",
    "Đang chờ": "Blocked",
    "Đã hoãn": "Deferred",
    "Hủy": "Cancelled",
    "Thấp": "Low",
    "Trung bình": "Medium",
    "Cao": "High",
    "Nghiêm trọng": "Critical",
    "Tất cả": "All",
    "Thêm công việc": "Add Task",
    "Quản lý Công việc": "Tasks Management",
    "Lập kế hoạch, theo dõi tiến độ và tối ưu thời gian thực hiện tác vụ": "Plan, track progress, and optimize task execution time",
    "Tìm kiếm công việc theo tên, mô tả hoặc thẻ (#deadline, #baocao)...": "Search tasks by title, description or tag (#deadline, #report)...",
    "Xóa tìm kiếm": "Clear search",
    "Dạng danh sách": "List View",
    "Dạng Kanban": "Kanban View",
    "Thẻ:": "Tags:",
    "Kết quả tìm kiếm cho:": "Search results for:",
    "công việc tìm thấy": "tasks found",
    "Thêm nhanh công việc mới... (Nhập tên rồi nhấn Enter để lưu)": "Quick add new task... (Type title and press Enter to save)",
    "Thêm ngay": "Add now",
    "Không tìm thấy công việc nào khớp với từ khóa": "No tasks found matching keyword",
    "Không có công việc nào thuộc danh mục lọc": "No tasks found in filter category",
    "Chưa có công việc nào. Hãy thêm công việc đầu tiên ở ô trên!": "No tasks yet. Add your first task above!",
    "Xóa bộ lọc": "Clear filter",
    "Đang lọc bảng Kanban theo:": "Filtering Kanban board by:",
    "công việc": "tasks",
    "Xem dạng danh sách": "View as list",
    "Hiển thị tất cả": "Show all",
    "Đánh dấu chưa hoàn thành": "Mark as incomplete",
    "Đánh dấu hoàn thành": "Mark as completed",
    "Lọc theo thẻ": "Filter by tag",
    "Đo thời gian làm việc": "Track working time",
    "Bắt đầu": "Start",
    "Chỉnh sửa chi tiết": "Edit details",
    "Xóa công việc": "Delete task",
    "Kéo thả hoặc thêm việc vào đây": "Drag & drop or add tasks here",
    "Xóa nhanh": "Quick delete",
    "Chỉnh sửa Công việc": "Edit Task",
    "Thêm Công việc Mới": "Add New Task",
    "Tên công việc": "Task Title",
    "VD: Soạn thảo đề xuất kế hoạch quý 4...": "e.g., Draft Q4 planning proposal...",
    "Trạng thái": "Status",
    "Độ ưu tiên": "Priority",
    "Hạn chót": "Deadline",
    "Hạn chót (Deadline)": "Deadline",
    "Dự án liên kết": "Linked Project",
    "Không thuộc dự án nào": "No project assigned",
    "Mục tiêu liên kết": "Linked Goal",
    "Không liên kết mục tiêu": "No linked goal",
    "Thời gian dự kiến": "Estimated Time",
    "Thời gian dự kiến (Giờ)": "Estimated Time (Hours)",
    "Giờ": "Hours",
    "Lặp lại": "Recurring",
    "Lặp lại (Recurring)": "Recurring",
    "Không lặp lại": "Do not repeat",
    "Hàng ngày": "Daily",
    "Hàng tuần": "Weekly",
    "Hàng tháng": "Monthly",
    "Thẻ phân loại": "Category Tags",
    "Thẻ phân loại (Tags)": "Tags",
    "Phân cách các thẻ bằng dấu phẩy (,)": "Separate tags with commas (,)",
    "Mô tả & Ghi chú chi tiết": "Description & Detailed Notes",
    "Nội dung chi tiết, tài liệu tham khảo, tiêu chí hoàn thành...": "Detailed content, references, completion criteria...",
    "Tệp đính kèm": "Attachments",
    "Tệp đính kèm (Lưu trữ Cloudflare R2)": "Attachments (Cloudflare R2 Storage)",
    "Đang tải lên...": "Uploading...",
    "Thêm tệp đính kèm": "Add attachment",
    "Đang tải tệp...": "Loading files...",
    "Chưa có tệp nào được đính kèm. Bạn có thể tải lên tài liệu, hình ảnh, PDF để lưu trữ không giới hạn trên R2.": "No files attached yet. You can upload documents, images, and PDFs for unlimited storage on R2.",
    "Tải về / Mở tệp": "Download / Open file",
    "Xóa tệp": "Delete file",
    "Lưu ý: Bạn có thể đính kèm tập tin và hình ảnh (Cloudflare R2) sau khi lưu công việc này.": "Note: You can attach files and images (Cloudflare R2) after saving this task.",
    "Lưu Công việc": "Save Task",
    "Hủy": "Cancel",
    "Kích thước tệp không được vượt quá 20MB": "File size must not exceed 20MB",
    "Không thể tải tệp lên:": "Failed to upload file:",
    "Lỗi khi đọc tệp:": "Error reading file:",
    "Bạn có chắc chắn muốn xóa tệp này?": "Are you sure you want to delete this file?",
    "Lỗi khi xóa tệp:": "Error deleting file:",
    "Đóng": "Close",

    # DashboardView keys
    "Tổng quan hôm nay": "Overview Today",
    "Ngày trước": "Previous Day",
    "Ngày sau": "Next Day",
    "Thêm việc": "Add Task",
    "Tùy chọn khác": "More Options",
    "Viết nhật ký / Đánh giá ngày": "Write Journal / Daily Review",
    "0 việc hôm nay": "0 tasks today",
    "hoàn thành": "completed",
    "Chưa có công việc nào được lên lịch cho ngày này.": "No tasks scheduled for this day.",
    "Thêm công việc thực tế": "Add Real Task",
    "Thêm Công việc Thực tế": "Add Real Task",
    "Mức ưu tiên": "Priority Level",
    "Thời lượng ước tính (h)": "Estimated Duration (h)",
    "VD: Soạn tài liệu tuần, gọi điện đối tác...": "e.g., Draft weekly doc, call partner...",
    "Quá tải: Kế hoạch": "Overloaded: Planned",
    "vượt Capacity": "exceeds Capacity",
    "Nhiều task quan trọng chưa hoàn thành": "Multiple high-priority tasks not completed",
    "Chi tiêu hôm nay": "Today's Expenses",
    "vượt ngân sách cảnh báo.": "exceeds alert budget threshold.",
    "Không có sự kiện lịch nào hôm nay.": "No calendar events scheduled for today.",
    "Làm sạch dữ liệu hôm nay": "Reset today's data",
    "dự kiến": "estimated",
    "Start": "Start",

    # NotesView keys
    "Ghi chép, liên kết ý tưởng, quản lý cuộc họp & xây dựng Knowledge Graph cá nhân.": "Record, connect ideas, manage meetings & build a personal Knowledge Graph.",
    "Hệ thống Ghi chú & Tri thức": "Notes & Knowledge System",
    "Mạng lưới liên kết 2 chiều giữa Ghi chú, Dự án, Mục tiêu & Công việc.": "Bidirectional link network between Notes, Projects, Goals & Tasks.",
    "Tạo Daily Note hôm nay": "Create Daily Note for Today",
    "🎯 Việc quan trọng hôm nay": "🎯 Today's Priority Tasks",
    "Ghi chép nhanh các sự kiện, việc quan trọng, ý tưởng phát sinh và suy ngẫm trong ngày.": "Quickly record daily events, important tasks, emerging ideas, and reflections.",

    # CalendarView & GoalsView
    "Sự kiện hôm nay": "Today's Events",
    "Không có sự kiện nào được lên lịch cho hôm nay.": "No events scheduled for today.",
    "Lịch sử hôm nay": "Today's History",
    "Thực thi Mục tiêu hôm nay": "Execute Goals Today",
    "Thực thi danh sách hôm nay": "Execute Today's List",
    "Thực thi hôm nay": "Execute Today",
    "Thời gian Focus (Hôm nay)": "Focus Time (Today)",
    "Số lượt Chạy Hôm nay": "Runs Today"
}

# Parse original fullTranslations
pattern = re.compile(r"\"([^\"]+)\":\s*\"([^\"]+)\"")
entries = dict(pattern.findall(text))

# Apply all fixes in order
entries.update(batch3)
entries.update(REMAINING_CORRECTIONS)
entries.update(CORRECTIONS)
entries.update(CRITICAL_TASK_KEYS)

# Real Vietnamese characters regex
vi_letters = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]")

# Check if any value still contains Vietnamese letters
still_bad = {}
for k, v in entries.items():
    if vi_letters.search(v):
        still_bad[k] = v

print(f"Total merged keys: {len(entries)}")
print(f"Entries still having Vietnamese letters: {len(still_bad)}")
if still_bad:
    for k, v in list(still_bad.items())[:20]:
        print("  Bad:", repr(k), "=>", repr(v))

# Write out the new src/lib/translations_dict.ts
lines = [
    "// Complete, pristine translations dictionary for Life OS (100% English)",
    "export const fullTranslations: Record<string, string> = {"
]

for k, v in sorted(entries.items()):
    clean_k = k.replace('\\', '\\\\').replace('"', '\\"')
    clean_v = v.replace('\\', '\\\\').replace('"', '\\"')
    lines.append(f'  "{clean_k}": "{clean_v}",')

lines.append("};")
lines.append("")

with open("src/lib/translations_dict.ts", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Successfully wrote src/lib/translations_dict.ts!")
