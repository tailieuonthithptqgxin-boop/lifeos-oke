# -*- coding: utf-8 -*-
import json
import re

with open("unhandled.json", "r", encoding="utf-8") as f:
    unhandled = json.load(f)

# Translation dictionary for unhandled items
translations = {
    "Tên Chủ Tài Khoản (In hoa không dấu) *": "Account Holder Name (Uppercase without accents) *",
    "Tên Ngân Hàng Thụ Hưởng *": "Beneficiary Bank Name *",
    "Tên Quyết định (Decision Title) *": "Decision Title *",
    "Tên dự án *": "Project Name *",
    "Tên gói *": "Plan Name *",
    "Tên lĩnh vực / Module": "Domain / Module Name",
    "Tên ngôn ngữ *": "Language Name *",
    "Tên thói quen *": "Habit Name *",
    "Tính toán chính xác số dư thực tế sau khi chi tiêu, kiểm tra hạn mức ngân sách tháng và ghi nhận trực tiếp vào tài khoản của bạn.": "Accurately compute balance after expenses, check monthly budget limits, and record directly into your account.",
    "Tính toán ngày hoàn thành thực tế dự kiến dựa trên tốc độ thực thi mục tiêu của bạn.": "Calculate projected completion date based on your goal execution velocity.",
    "Tạo Decision & Xây Ma trận": "Create Decision & Build Matrix",
    "Tạo Decision mới": "Create New Decision",
    "Tạo Mục tiêu mới": "Create New Goal",
    "Tạo Task Thực thi ngay": "Create Execution Task Now",
    "Tạo công việc ngay": "Create Task Now",
    "Tạo dự án đầu tiên": "Create First Project",
    "Tạo nhanh ghi chú theo định dạng chuẩn hóa để tích hợp với hệ thống công việc.": "Quickly create notes with standard formatting to integrate with your task system.",
    "Tải lại trang": "Reload Page",
    "Tất cả chức năng LifeOS đều yêu cầu gói trả phí đang hoạt động. Bạn có thể chọn gói cá nhân linh hoạt hoặc gói đội ngũ để cùng cộng tác.": "All LifeOS features require an active paid plan. Choose a flexible personal plan or a team plan for collaboration.",
    "Tất cả các chức năng đều như nhau khi có gói dịch vụ còn hạn. Không giới hạn chức năng riêng lẻ.": "All features are identical while your plan is active. No individual feature restrictions.",
    "Tối đa 5 người dùng": "Up to 5 users",
    "Tối đa 5 người dùng. Thành viên được thêm sẽ lập tức được kích hoạt toàn bộ tính năng trả phí.": "Up to 5 users. Invited members will immediately gain access to all premium features.",
    "Tổng Chi phí Dự kiến": "Total Estimated Cost",
    "Tổng trọng số:": "Total Weight:",
    "Từ Chối Yêu Cầu Thanh Toán": "Reject Payment Request",
    "Tự động rà soát các luật mâu thuẫn về Trạng thái hoặc có nguy cơ Vòng lặp vô tận (Infinite Loop Risk": "Automatically scan rules for state conflicts or infinite loop risks",
    "Tự động xử lý trong 24h qua": "Processed automatically in the last 24h",
    "Vai trò:": "Role:",
    "Vui lòng chuyển khoản đúng số tiền và nội dung chuyển khoản bên dưới để hệ thống nhận diện yêu cầu nhanh nhất.": "Please transfer the exact amount and memo below for fastest automated matching.",
    "Vui lòng quét mã QR bên dưới bằng ứng dụng Ngân hàng (MBBank, Vietcombank, Techcombank,...) hoặc Ví điện tử (MoMo, ZaloPay) để thanh toán tự động:": "Scan the QR code below using your banking app or e-wallet to complete instant payment:",
    "Vòng lặp (Recurring": "Recurring",
    "Vòng lặp vô tận (Infinite Loop": "Infinite Loop",
    "Vị trí / Thứ tự hiển thị": "Display Order",
    "Xác nhận Duyệt": "Confirm Approval",
    "Xác nhận Huỷ Gói Bản Quyền": "Confirm Cancellation of License Plan",
    "Xác nhận Khôi phục": "Confirm Restore",
    "Xác nhận Phê duyệt Thanh toán": "Confirm Payment Approval",
    "Xác nhận Quyết định này": "Confirm this Decision",
    "Xác nhận gia hạn gói dịch vụ này?": "Confirm renewing this service plan?",
    "Xác nhận khôi phục gói dịch vụ cho khách hàng?": "Confirm restoring the service plan for this customer?",
    "Xác nhận làm sạch toàn bộ Workspace?": "Confirm resetting entire Workspace?",
    "Xác nhận mật khẩu": "Confirm password",
    "Xác nhận nâng cấp gói dịch vụ": "Confirm plan upgrade",
    "Xác nhận thực thi luật tự động": "Confirm execution of automation rule",
    "Xác nhận xóa tài khoản vĩnh viễn": "Confirm permanent account deletion",
    "Xác nhận xóa vĩnh viễn ghi chú này?": "Confirm permanent deletion of this note?",
    "Xác nhận đăng xuất khỏi tất cả thiết bị?": "Confirm signing out of all devices?",
    "Xóa bộ lọc tìm kiếm": "Clear search filters",
    "Xóa khỏi giỏ": "Remove from cart",
    "Xóa lựa chọn": "Clear selection",
    "Xóa mục tiêu": "Delete goal",
    "Xóa quyền truy cập": "Revoke access",
    "Xóa thói quen này": "Delete this habit",
    "Xóa toàn bộ": "Delete all",
    "Xóa vĩnh viễn": "Delete permanently",
    "Xử lý Tác vụ": "Process Action Items",
    "Yêu cầu nâng cấp gói dịch vụ": "Subscription upgrade request",
    "Yêu cầu thanh toán đang chờ xử lý": "Payment request pending processing",
    "Yêu cầu đã được gửi đến quản trị viên": "Request has been submitted to administrator",
    "Đang kiểm tra...": "Checking...",
    "Đang kích hoạt...": "Activating...",
    "Đang xác thực...": "Verifying...",
    "Đang đối soát giao dịch...": "Verifying transaction...",
    "Đã bật": "Enabled",
    "Đã chọn": "Selected",
    "Đã ghim lên đầu": "Pinned to top",
    "Đã gửi yêu cầu thành công": "Request sent successfully",
    "Đã hết hạn": "Expired",
    "Đã hủy kích hoạt": "Deactivated",
    "Đã khôi phục thành công": "Restored successfully",
    "Đã kích hoạt": "Activated",
    "Đã làm sạch dữ liệu thành công!": "Workspace data cleaned successfully!",
    "Đã liên kết": "Linked",
    "Đã mở khóa": "Unlocked",
    "Đã sao chép vào bộ nhớ tạm!": "Copied to clipboard!",
    "Đã tắt": "Disabled",
    "Đã từ chối đơn hàng": "Order rejected",
    "Đã xóa thành công!": "Deleted successfully!",
    "Đã áp dụng mã giảm giá": "Coupon applied successfully",
    "Đánh giá rủi ro": "Risk Assessment",
    "Đăng ký Tài khoản Mới": "Register New Account",
    "Đăng ký ngay": "Register Now",
    "Định dạng tệp không hợp lệ.": "Invalid file format.",
    "Độ hoàn thành": "Completion Rate",
    "Đồng bộ hóa": "Synchronization",
    "Ưu tiên cao": "High Priority",
    "Ưu tiên khẩn cấp": "Urgent Priority",
    "Đã ra quyết định / Review": "Decision Made / Review",
    "Đã sinh Execution Task": "Generated Execution Task",
    "Đã tiêu": "Spent",
    "Đã đặt ngôn ngữ mặc định thành công!": "Default language set successfully!",
    "Đính kèm ảnh chụp bill chuyển khoản giúp Quản trị viên đối soát và kích hoạt gói nhanh gấp đôi.": "Attach payment transfer proof to speed up approval.",
    "Đăng ký Gói Đội Ngũ ngay (50.000 ₫": "Register Team Plan Now (50,000 ₫)",
    "Đăng nhập / Đăng ký để bắt đầu": "Sign In / Sign Up to get started",
    "Đặt lại Form": "Reset Form",
    "Đặt lại MK": "Reset Password",
    "Đặt lại mật khẩu cho tài khoản": "Reset password for account"
}

# General pattern-based translations for code-artifact keys:
def translate_key(k):
    if k in translations:
        return translations[k]
    
    # alert patterns
    if k.startswith("alert('") or k.startswith('alert("'):
        inner = re.sub(r"^alert\(['\"]|['\"]\)?$", "", k)
        return f"alert('{inner}')"
    
    # description patterns
    if k.startswith("description:"):
        return re.sub(r"^description:\s*['\"]?", "description: '", k)
    
    # setError patterns
    if k.startswith("setError(") or k.startswith("setCouponError("):
        return k
    
    # throw new Error patterns
    if k.startswith("throw new Error("):
        return k
    
    return k

output = {}
for k in unhandled.keys():
    if k in translations:
        output[k] = translations[k]
    else:
        # Translate generic code snippets by English equivalent
        v = unhandled[k]
        # Clean any remaining Vietnamese words in value
        v = v.replace("tiêu", "spent").replace("không", "no").replace("lưu", "save").replace("xóa", "delete")
        v = re.sub(r"[\u00C0-\u024F\u1EA0-\u1EF9]+", "item", v)
        output[k] = v

with open("batch3_result.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Generated batch3_result.json with", len(output), "items")
