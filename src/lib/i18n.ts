import { fullTranslations } from './translations_dict.ts';

export type LanguageCode = 'vi' | 'en' | string;

export interface TranslationDictionary {
  [key: string]: string;
}

export const translations: Record<string, TranslationDictionary> = {
  vi: {
    // Navigation & Common App Bar
    Dashboard: 'Bảng điều khiển',
    Tasks: 'Công việc',
    Calendar: 'Lịch biểu',
    Finance: 'Tài chính',
    Focus: 'Tập trung',
    Projects: 'Dự án',
    Study: 'Học tập',
    Goals: 'Mục tiêu',
    Notes: 'Ghi chú',
    Habits: 'Thói quen',
    DecisionEngine: 'Bộ máy ra quyết định',
    Automation: 'Quy tắc tự động',
    MyAccount: 'Tài khoản của tôi',
    Marketplace: 'Thư viện mẫu',
    Cart: 'Giỏ hàng',
    Admin: 'Quản trị hệ thống',
    Daily: 'Hàng ngày',
    PlanningGoals: 'Kế hoạch & Mục tiêu',
    AdvancedTools: 'Công cụ nâng cao',
    Theme: 'Giao diện',
    Dark: 'Tối',
    Light: 'Sáng',
    Logout: 'Đăng xuất',
    SearchPlaceholder: 'Tìm kiếm nhanh hoặc mở Command Center (Ctrl+K)...',
    QuickCreate: 'Tạo nhanh',
    Notifications: 'Thông báo',
    Inbox: 'Hộp thư đến',
    MarkAllRead: 'Đánh dấu đã đọc',
    ClearAll: 'Xóa tất cả',

    // Common Actions
    Save: 'Lưu thay đổi',
    Cancel: 'Hủy bỏ',
    Delete: 'Xóa',
    Edit: 'Chỉnh sửa',
    Create: 'Tạo mới',
    Update: 'Cập nhật',
    Success: 'Thành công',
    Error: 'Lỗi',
    Loading: 'Đang tải...',
    EmptyData: 'Chưa có dữ liệu nào.',
    Close: 'Đóng',
    Confirm: 'Xác nhận',
    Search: 'Tìm kiếm',
    Filter: 'Bộ lọc',
    Refresh: 'Làm mới',
    Back: 'Quay lại',
    Next: 'Tiếp tục',

    // Status
    Active: 'Đang hoạt động',
    Inactive: 'Tắt / Tạm ngưng',
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Rejected: 'Từ chối',
    Cancelled: 'Đã hủy',
    Default: 'Mặc định',

    // Language Management
    Languages: 'Ngôn ngữ',
    LanguagesConfig: 'Cấu hình Ngôn ngữ Hệ thống',
    LanguagesDesc: 'Bật/tắt các ngôn ngữ hệ thống và chọn ngôn ngữ mặc định. Người dùng có thể chuyển đổi giữa các ngôn ngữ đang hoạt động.',
    AddLanguage: 'Thêm ngôn ngữ',
    LanguageName: 'Tên ngôn ngữ',
    LanguageCode: 'Mã ngôn ngữ (ISO Code)',
    LanguageFlag: 'Biểu tượng cờ',
    SetAsDefault: 'Đặt làm mặc định',
    Activate: 'Kích hoạt',
    Deactivate: 'Tắt',
    DefaultLanguage: 'Ngôn ngữ mặc định',
    ActiveLanguages: 'Đang hoạt động',
    LanguageList: 'Danh sách ngôn ngữ',

    // Package / Plan Management
    PlansManagement: 'Quản lý gói dịch vụ',
    PlansDesc: 'Chỉnh sửa tên gói, giá, chu kỳ thanh toán, danh sách tính năng và trạng thái. Thay đổi giá chỉ áp dụng cho giao dịch mới, giao dịch cũ giữ nguyên snapshot an toàn.',
    PlanName: 'Tên gói',
    PlanPrice: 'Giá gói',
    PlanCycle: 'Chu kỳ',
    PlanStatus: 'Trạng thái',
    PlanActions: 'Thao tác',
    EditPlan: 'Chỉnh sửa gói',
    PriceSafetyNote: 'An toàn giá: Thay đổi giá không ảnh hưởng đến các giao dịch đã tạo trước đó. Các yêu cầu thanh toán đang chờ duyệt vẫn giữ nguyên giá snapshot cũ.',
    AuditHistory: 'Lịch sử thay đổi',
    AuditHistoryDesc: 'Nhật ký chi tiết các lần thay đổi giá và thông tin gói dịch vụ.',
    PriceMonthly: 'Giá hàng tháng',
    PriceYearly: 'Giá hàng năm',
    BillingCycle: 'Chu kỳ thanh toán',
    PlanFeatures: 'Danh sách tính năng',
    PlanQuota: 'Giới hạn sử dụng / Quota',
    AddFeature: 'Thêm tính năng',

    // Payment & Checkout
    Checkout: 'Thanh toán & Nâng cấp',
    UpgradePlan: 'Nâng cấp gói dịch vụ',
    TransferAmount: 'Số tiền thanh toán',
    TransactionCode: 'Nội dung chuyển khoản',
    BankInfo: 'Thông tin tài khoản ngân hàng',
    PaidConfirm: 'Tôi đã chuyển khoản thành công',
    PendingPaymentBanner: 'Yêu cầu thanh toán của bạn đang được quản trị viên đối chiếu và duyệt trong ít phút.'
  },
  en: {
    // English Keys
    Dashboard: 'Dashboard',
    Tasks: 'Tasks',
    Calendar: 'Calendar',
    Finance: 'Finance',
    Focus: 'Focus',
    Projects: 'Projects',
    Study: 'Study',
    Goals: 'Goals',
    Notes: 'Notes',
    Habits: 'Habits',
    DecisionEngine: 'Decision Engine',
    Automation: 'Automation Rules',
    MyAccount: 'My Account',
    Marketplace: 'Template Market',
    Cart: 'Cart',
    Admin: 'System Admin',
    Daily: 'Daily',
    PlanningGoals: 'Planning & Goals',
    AdvancedTools: 'Advanced Tools',
    Theme: 'Theme',
    Dark: 'Dark',
    Light: 'Light',
    Logout: 'Log out',
    SearchPlaceholder: 'Quick search or open Command Center (Ctrl+K)...',
    QuickCreate: 'Quick Create',
    Notifications: 'Notifications',
    Inbox: 'Inbox',
    MarkAllRead: 'Mark all read',
    ClearAll: 'Clear all',

    // Common Actions
    Save: 'Save changes',
    Cancel: 'Cancel',
    Delete: 'Delete',
    Edit: 'Edit',
    Create: 'Create new',
    Update: 'Update',
    Success: 'Success',
    Error: 'Error',
    Loading: 'Loading...',
    EmptyData: 'No data available.',
    Close: 'Close',
    Confirm: 'Confirm',
    Search: 'Search',
    Filter: 'Filter',
    Refresh: 'Refresh',
    Back: 'Back',
    Next: 'Next',

    // Status
    Active: 'Active',
    Inactive: 'Inactive',
    Pending: 'Pending',
    Approved: 'Approved',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
    Default: 'Default',

    // Language Management
    Languages: 'Languages',
    LanguagesConfig: 'System Language Configuration',
    LanguagesDesc: 'Enable or disable system languages and choose default language. Users can switch between any active languages.',
    AddLanguage: 'Add Language',
    LanguageName: 'Language Name',
    LanguageCode: 'Language Code (ISO Code)',
    LanguageFlag: 'Flag Symbol',
    SetAsDefault: 'Set as Default',
    Activate: 'Activate',
    Deactivate: 'Disable',
    DefaultLanguage: 'Default Language',
    ActiveLanguages: 'Active',
    LanguageList: 'Languages List',

    // Package / Plan Management
    PlansManagement: 'Service Plans Management',
    PlansDesc: 'Edit plan name, pricing, billing cycle, features, and active status. Price modifications only apply to new transactions; existing requests preserve historical snapshots.',
    PlanName: 'Plan',
    PlanPrice: 'Price',
    PlanCycle: 'Cycle',
    PlanStatus: 'Status',
    PlanActions: 'Actions',
    EditPlan: 'Edit Plan',
    PriceSafetyNote: 'Price Safety: Modifying a plan price will never alter previously created payment requests or historical transactions.',
    AuditHistory: 'Change History',
    AuditHistoryDesc: 'Audit log of price changes and plan modifications.',
    PriceMonthly: 'Monthly Price',
    PriceYearly: 'Yearly Price',
    BillingCycle: 'Billing Cycle',
    PlanFeatures: 'Plan Features',
    PlanQuota: 'Quota & Limits',
    AddFeature: 'Add feature',

    // Payment & Checkout
    Checkout: 'Checkout & Upgrade',
    UpgradePlan: 'Upgrade Subscription Plan',
    TransferAmount: 'Transfer Amount',
    TransactionCode: 'Transfer Memo',
    BankInfo: 'Bank Account Information',
    PaidConfirm: 'I have transferred successfully',
    PendingPaymentBanner: 'Your payment request is pending administrator verification and will be activated shortly.',

    // =========================================================================
    // VIETNAMESE TO ENGLISH DIRECT PHRASE MAPPINGS (Comprehensive Coverage)
    // =========================================================================

    // Navigation & App Chrome
    'Bảng điều khiển': 'Dashboard',
    'Tổng quan': 'Dashboard',
    'Công việc': 'Tasks',
    'Lịch biểu': 'Calendar',
    'Tài chính': 'Finance',
    'Tập trung': 'Focus',
    'Dự án': 'Projects',
    'Học tập': 'Study',
    'Mục tiêu': 'Goals',
    'Ghi chú': 'Notes',
    'Thói quen': 'Habits',
    'Bộ máy ra quyết định': 'Decision Engine',
    'Hỗ trợ ra quyết định': 'Decision Engine',
    'Quy tắc tự động': 'Automation Rules',
    'Tài khoản của tôi': 'My Account',
    'Tài khoản': 'Account',
    'Thư viện mẫu': 'Template Market',
    'Giỏ hàng': 'Cart',
    'Giỏ hàng & Đơn hàng': 'Cart & Orders',
    'Quản trị hệ thống': 'System Admin',
    'Bảng điều khiển Quản trị': 'Admin Dashboard',
    'Hàng ngày': 'Daily',
    'Kế hoạch & Mục tiêu': 'Planning & Goals',
    'Công cụ nâng cao': 'Advanced Tools',
    'Lưu trữ đám mây R2': 'Cloud Storage (R2)',
    'Lưu trữ R2': 'Cloud Storage (R2)',
    'Lưu trữ tập tin': 'File Storage',
    'Giao diện': 'Theme',
    'Sáng': 'Light',
    'Tối': 'Dark',
    'Đăng xuất': 'Sign Out',
    'Đăng nhập': 'Sign In',
    'Đăng ký': 'Sign Up',
    'Đăng ký ngay': 'Sign up now',
    'Tạo tài khoản': 'Create account',
    'Tìm kiếm...': 'Search...',
    'Tìm kiếm nhanh...': 'Quick search...',
    'Tìm kiếm nhanh hoặc mở Command Center (Ctrl+K)...': 'Quick search or press Ctrl+K...',
    'Tạo mới': 'Create New',
    'Công việc mới': 'New Task',
    'Khoản thu / chi tiêu': 'Income / Expense',
    'Sự kiện lịch': 'Calendar Event',
    'Mục tiêu mới': 'New Goal',
    'Ghi chú mới': 'New Note',
    'Thông báo': 'Notifications',
    'Hộp thư đến': 'Inbox',
    'Hộp thư nhanh': 'Quick Inbox',
    'Đã đọc tất cả': 'Mark all as read',
    'Xóa tất cả': 'Clear all',
    'Bạn đã xem hết mọi thông báo.': "You're all caught up.",
    'Chưa có thông báo nào.': 'No notifications yet.',
    'Chưa có thư mới': 'No new messages',

    // User Roles & Status Badges
    'Người dùng': 'User',
    'Quản trị viên': 'Administrator',
    'Đã kích hoạt': 'Active',
    'Chưa kích hoạt': 'Inactive',
    'Chưa kích hoạt gói': 'No active subscription',
    'Gói đã hết hạn': 'Subscription expired',
    'Vĩnh viễn': 'Lifetime',
    'Chưa làm': 'To Do',
    'Đang làm': 'In Progress',
    'Hoàn thành': 'Completed',
    'Đã xong': 'Done',
    'Đang chờ': 'Waiting',
    'Đã hoãn': 'Deferred',
    'Đã hủy': 'Cancelled',
    'Hủy': 'Cancel',
    'Mới tạo': 'New',
    'Đang phân tích': 'Analyzing',
    'Đã quyết định': 'Decided',
    'Đang hoạt động': 'Active',
    'Tắt / Tạm ngưng': 'Inactive',
    'Khóa': 'Locked',
    'Tạm khóa': 'Suspended',
    'Vô hiệu hóa': 'Disabled',
    'Chờ duyệt': 'Pending Review',
    'Đã duyệt': 'Approved',
    'Từ chối': 'Rejected',
    'Mặc định': 'Default',
    'Cao': 'High',
    'Trung bình': 'Medium',
    'Thấp': 'Low',
    'Khẩn cấp': 'Urgent',
    'Nghiêm trọng': 'Critical',

    // Common Buttons & Actions
    'Lưu thay đổi': 'Save Changes',
    'Lưu': 'Save',
    'Lưu lại': 'Save',
    'Hủy bỏ': 'Cancel',
    'Đóng': 'Close',
    'Xác nhận': 'Confirm',
    'Xóa': 'Delete',
    'Chỉnh sửa': 'Edit',
    'Sửa': 'Edit',
    'Cập nhật': 'Update',
    'Thêm': 'Add',
    'Thêm mới': 'Add New',
    'Thêm công việc': 'Add Task',
    'Thêm giao dịch': 'Add Transaction',
    'Thêm sự kiện': 'Add Event',
    'Thêm thói quen': 'Add Habit',
    'Thêm mục tiêu': 'Add Goal',
    'Thêm dự án': 'Add Project',
    'Thêm môn học': 'Add Subject',
    'Thêm quy tắc': 'Add Rule',
    'Thêm phương án': 'Add Option',
    'Thêm tiêu chí': 'Add Criterion',
    'Thêm người dùng': 'Add User',
    'Xem chi tiết': 'View Details',
    'Xem tất cả': 'View All',
    'Tải lên': 'Upload',
    'Tải tập tin': 'Upload File',
    'Tải xuống': 'Download',
    'Sao chép': 'Copy',
    'Đã sao chép': 'Copied',
    'Làm mới': 'Refresh',
    'Quay lại': 'Back',
    'Tiếp tục': 'Continue',
    'Bộ lọc': 'Filters',
    'Tất cả': 'All',
    'Thành công': 'Success',
    'Lỗi': 'Error',
    'Đang tải...': 'Loading...',
    'Đang xử lý...': 'Processing...',
    'Chưa có dữ liệu nào.': 'No data available.',
    'Không tìm thấy dữ liệu': 'No data found',
    'Không có kết quả nào phù hợp.': 'No matching results found.',
    'Thao tác': 'Actions',
    'Hành động': 'Action',

    // Paywall Gate & Access Control
    'Truy cập bị từ chối': 'Access Denied',
    'Bạn không có quyền Admin. Vui lòng đăng nhập bằng tài khoản có quyền quản trị để truy cập khu vực này.': 'You do not have Administrator permissions. Please sign in with an administrator account to access this area.',
    'Gói Dịch Vụ Đã Hết Hạn': 'Subscription Has Expired',
    'Yêu Cầu Mua Gói Trả Phí': 'Paid Subscription Required',
    'Toàn Bộ Tính Năng Yêu Cầu Gói Dịch Vụ': 'All Features Require a Subscription',
    'Hệ thống LifeOS hoạt động theo mô hình trả phí toàn diện. Bạn cần kích hoạt Gói Cá Nhân (từ 15.000 ₫/tháng) hoặc Gói Đội Ngũ (50.000 ₫/tháng) để sử dụng các công cụ.': 'LifeOS operates as a premium productivity platform. Please activate a Personal Plan (from 15,000 VND/mo) or Team Plan (50,000 VND/mo) to unlock workspace tools.',
    'Xem Bảng Giá & Kích Hoạt Gói (Từ 15.000 ₫)': 'View Pricing & Activate Plan',
    'Xem Bảng Giá & Kích Hoạt Gói': 'View Pricing & Activate Plan',
    'Nâng cấp Gói dịch vụ': 'Upgrade Subscription Plan',
    'Trạng thái:': 'Status:',
    'Trạng thái': 'Status',
    'Chưa mua gói': 'No active plan',
    'Đang tải dữ liệu Life OS...': 'Loading Life OS data...',

    // Landing Page
    'Hệ Điều Hành Cuộc Sống Toàn Diện': 'Comprehensive Life Operating System',
    'Life OS là hệ thống quản lý cá nhân toàn diện: công việc, thời gian, học tập, tài chính và mục tiêu.': 'Life OS is a comprehensive personal management system: tasks, schedule, learning, finance, and goals.',
    'Quản lý công việc, thời gian, tài chính, thói quen và mục tiêu cuộc sống trên một nền tảng duy nhất, đồng bộ và bảo mật.': 'Manage tasks, time, finance, habits, and life goals on a single, synchronized, and secure platform.',
    'Bắt đầu ngay hôm nay': 'Get Started Today',
    'Bắt đầu ngay': 'Get Started',
    'Khám phá tính năng': 'Explore Features',
    'Đăng nhập hệ thống': 'Sign In to System',
    'Đã bao gồm 500+ người dùng tin cậy': 'Trusted by 500+ active users',
    'Tính năng cốt lõi': 'Core Features',
    'Bảng giá dịch vụ': 'Pricing Plans',
    'Chọn gói phù hợp với nhu cầu phát triển bản thân và đội ngũ': 'Choose the plan tailored for your personal growth or team',
    'Phổ biến nhất': 'Most Popular',
    'Tiết kiệm nhất': 'Best Value',
    'Dành cho Đội ngũ': 'For Teams',
    'Chọn gói này': 'Choose this plan',
    'Kích hoạt ngay': 'Activate Now',
    'Đã bao gồm': 'Includes',
    'Hàng tháng': 'Monthly',
    'Hàng năm': 'Yearly',
    'Chu kỳ': 'Cycle',
    'Giá': 'Price',

    // Authentication & Onboarding
    'Chào mừng bạn quay trở lại!': 'Welcome back!',
    'Đăng nhập vào tài khoản LifeOS của bạn để tiếp tục.': 'Sign in to your LifeOS account to continue.',
    'Email hoặc Tên đăng nhập': 'Email or Username',
    'Mật khẩu': 'Password',
    'Nhập mật khẩu': 'Enter password',
    'Nhập lại mật khẩu': 'Re-enter password',
    'Quên mật khẩu?': 'Forgot password?',
    'Đặt lại mật khẩu': 'Reset Password',
    'Gửi liên kết đặt lại': 'Send Reset Link',
    'Bạn chưa có tài khoản?': "Don't have an account?",
    'Bạn đã có tài khoản?': 'Already have an account?',
    'Đăng nhập ngay': 'Sign in now',
    'Họ và tên': 'Full Name',
    'Nhập họ và tên của bạn': 'Enter your full name',
    'Chào mừng đến với LifeOS!': 'Welcome to LifeOS!',
    'Thiết lập không gian làm việc của bạn trong vài bước đơn giản.': 'Set up your workspace in a few simple steps.',
    'Lĩnh vực trọng tâm': 'Core Focus Areas',
    'Chọn các mục tiêu ưu tiên': 'Select your priority goals',
    'Bắt đầu sử dụng': 'Get Started',

    // Dashboard View
    'Tổng quan ngày': "Today's Overview",
    'Hôm nay': 'Today',
    'Chào buổi sáng': 'Good morning',
    'Chào buổi chiều': 'Good afternoon',
    'Chào buổi tối': 'Good evening',
    'Điểm năng suất': 'Productivity Score',
    'Điểm số cuộc sống': 'Life Score',
    'Công việc cần làm hôm nay': "Today's Priority Tasks",
    'Thói quen cần thực hiện': 'Daily Habits to Complete',
    'Sự kiện trong ngày': "Today's Schedule & Events",
    'Dòng thời gian': 'Timeline',
    'Hoạt động gần đây': 'Recent Activity',
    'Tiến độ mục tiêu': 'Goal Progress',
    'Tài chính nhanh': 'Quick Finance',
    'Tổng số dư': 'Total Balance',
    'Thu trong tháng': 'Monthly Income',
    'Chi trong tháng': 'Monthly Expenses',
    'Chưa có công việc nào hôm nay.': 'No tasks scheduled for today.',
    'Tất cả thói quen hôm nay đã hoàn thành!': 'All habits completed for today!',
    'Không có sự kiện nào hôm nay.': 'No events scheduled for today.',

    // Tasks & Kanban View
    'Quản lý công việc': 'Tasks Management',
    'Danh sách': 'List',
    'Bảng Kanban': 'Kanban Board',
    'Lịch': 'Calendar',
    'Bộ lọc & Tìm kiếm': 'Filter & Search',
    'Tiêu đề công việc': 'Task Title',
    'Nhập tiêu đề công việc...': 'Enter task title...',
    'Mô tả': 'Description',
    'Mô tả chi tiết...': 'Detailed description...',
    'Hạn chót': 'Due Date',
    'Ngày bắt đầu': 'Start Date',
    'Dự án liên quan': 'Related Project',
    'Mục tiêu liên quan': 'Linked Goal',
    'Độ ưu tiên': 'Priority',
    'Thời gian ước tính (giờ)': 'Estimated Hours',
    'Giờ thực tế': 'Actual Hours',
    'Thẻ (cách nhau bởi dấu phẩy)': 'Tags (comma separated)',
    'Lặp lại': 'Recurrence',
    'Không lặp lại': 'None',
    'Hàng tuần': 'Weekly',
    'Xóa công việc': 'Delete Task',
    'Bạn có chắc chắn muốn xóa công việc này không?': 'Are you sure you want to delete this task?',
    'Chưa có công việc nào trong danh sách.': 'No tasks in this list.',

    // Calendar View
    'Lịch trình & Thời gian biểu': 'Calendar & Schedule',
    'Tháng': 'Month',
    'Tuần': 'Week',
    'Ngày': 'Day',
    'Tiêu đề sự kiện': 'Event Title',
    'Thời gian bắt đầu': 'Start Time',
    'Thời gian kết thúc': 'End Time',
    'Cả ngày': 'All Day',
    'Địa điểm': 'Location',
    'Nhắc nhở': 'Reminder',
    'Không có sự kiện nào trong khoảng thời gian này.': 'No events found in this timeframe.',

    // Finance View
    'Quản lý tài chính cá nhân': 'Personal Finance Management',
    'Tài khoản & Ví': 'Accounts & Wallets',
    'Giao dịch': 'Transactions',
    'Ngân sách chi tiêu': 'Budgets',
    'Mục tiêu tiết kiệm': 'Saving Goals',
    'Các khoản nợ': 'Debts & Loans',
    'Thu nhập': 'Income',
    'Chi tiêu': 'Expense',
    'Chuyển khoản': 'Transfer',
    'Số tiền': 'Amount',
    'Số dư': 'Balance',
    'Số dư ban đầu': 'Initial Balance',
    'Tài khoản nguồn': 'Source Account',
    'Tài khoản đích': 'Destination Account',
    'Danh mục thu/chi': 'Category',
    'Ngày giao dịch': 'Transaction Date',
    'Ghi chú giao dịch': 'Transaction Note',
    'Ví tiền mặt': 'Cash Wallet',
    'Tài khoản ngân hàng': 'Bank Account',
    'Thẻ tín dụng': 'Credit Card',
    'Ví điện tử': 'E-Wallet',
    'Đã chi tiêu': 'Spent',
    'Hạn mức': 'Budget Limit',
    'Còn lại': 'Remaining',
    'Chưa có giao dịch nào được ghi nhận.': 'No transactions recorded yet.',

    // Focus View (Pomodoro)
    'Đồng hồ tập trung': 'Focus Timer',
    'Thời gian tập trung': 'Focus Duration',
    'Nghỉ ngắn': 'Short Break',
    'Nghỉ dài': 'Long Break',
    'Bắt đầu': 'Start',
    'Tạm dừng': 'Pause',
    'Đặt lại': 'Reset',
    'Phiên tập trung hoàn thành': 'Focus Sessions Completed',
    'Tổng thời gian tập trung': 'Total Focus Time',
    'Âm thanh nền': 'Ambient Sound',
    'Mưa rơi': 'Rain',
    'Sóng biển': 'Ocean Waves',
    'Rừng cây': 'Forest',
    'Quán cà phê': 'Café',
    'Tiếng trắng': 'White Noise',
    'Mục tiêu tập trung trong ngày': 'Daily Focus Goal',

    // Habits View
    'Xây dựng & Theo dõi thói quen': 'Habits Tracker',
    'Tên thói quen': 'Habit Name',
    'Tần suất': 'Frequency',
    'Mục tiêu hàng ngày': 'Daily Target',
    'Đơn vị đo lường': 'Unit of Measurement',
    'Chuỗi hiện tại': 'Current Streak',
    'Kỷ lục chuỗi': 'Best Streak',
    'ngày': 'days',
    'lần': 'times',
    'Hôm nay đã hoàn thành': 'Completed today',
    'Chưa hoàn thành hôm nay': 'Not done today',

    // Goals View
    'Mục tiêu cuộc sống': 'Life Goals',
    'Tên mục tiêu': 'Goal Title',
    'Lĩnh vực': 'Category',
    'Tiến độ': 'Progress',
    'Giá trị hiện tại': 'Current Value',
    'Giá trị mục tiêu': 'Target Value',
    'Hạn hoàn thành': 'Target Deadline',
    'Cột mốc quan trọng': 'Key Milestones',
    'Thêm cột mốc': 'Add Milestone',
    'Hành động tiếp theo': 'Next Actions',

    // Projects View
    'Dự án & Kế hoạch': 'Projects & Planning',
    'Tên dự án': 'Project Name',
    'Mô tả dự án': 'Project Description',
    'Sức khỏe dự án': 'Project Health',
    'Tốt': 'Healthy',
    'Cảnh báo': 'At Risk',
    'Chậm trễ': 'Delayed',
    'Ngân sách dự án': 'Project Budget',
    'Thành viên dự án': 'Project Members',
    'Nhiệm vụ thuộc dự án': 'Project Tasks',

    // Notes View
    'Sổ tay & Ghi chú': 'Notes & Knowledge Base',
    'Tiêu đề ghi chú...': 'Note title...',
    'Nội dung ghi chú (Hỗ trợ Markdown)...': 'Note content (Markdown supported)...',
    'Thư mục': 'Folders',
    'Tất cả ghi chú': 'All Notes',
    'Ghim lên đầu': 'Pin to Top',
    'Đã ghim': 'Pinned',
    'Chưa có ghi chú nào.': 'No notes yet.',

    // Study View
    'Không gian học tập': 'Study Workspace',
    'Môn học': 'Subjects',
    'Tên môn học': 'Subject Name',
    'Bài tập & Deadline': 'Assignments & Deadlines',
    'Kỳ thi & Lịch kiểm tra': 'Exams & Test Schedule',
    'Tài liệu học tập': 'Study Materials',
    'Thời gian học hôm nay': 'Study Time Today',

    // Decision Engine View
    'Bộ máy hỗ trợ ra quyết định': 'Decision Support Engine',
    'Tên quyết định': 'Decision Title',
    'Vấn đề cần giải quyết': 'Problem Statement',
    'Tại sao cần ra quyết định': 'Why this decision matters',
    'Ràng buộc & Giới hạn': 'Constraints & Limits',
    'Mức độ quan trọng': 'Importance',
    'Tiêu chí đánh giá': 'Evaluation Criteria',
    'Phương án lựa chọn': 'Available Options',
    'Trọng số': 'Weight',
    'Chi phí ước tính': 'Estimated Cost',
    'Điểm tổng kết': 'Overall Score',
    'Chọn phương án này': 'Select this Option',
    'Chuyển thành Dự án & Công việc': 'Convert to Project & Tasks',
    'Chưa có quyết định nào được chọn.': 'No decision selected yet.',

    // Automation Engine View
    'Quy tắc tự động hóa': 'Automation Rules',
    'Tên quy tắc': 'Rule Name',
    'Sự kiện kích hoạt (Trigger)': 'Trigger Event',
    'Điều kiện (Conditions)': 'Conditions',
    'Hành động thực thi (Actions)': 'Execution Actions',
    'Thời gian chờ lặp lại (Cooldown)': 'Cooldown Period',
    'Kích hoạt quy tắc': 'Enable Rule',
    'Tắt quy tắc': 'Disable Rule',
    'Lịch sử thực thi tự động': 'Execution Logs',
    'Đang chạy': 'Running',
    'Thất bại': 'Failed',

    // Cloudflare R2 View
    'Quản lý tập tin đám mây': 'Cloud File Storage (R2)',
    'Tải lên tập tin mới': 'Upload New File',
    'Kéo thả tập tin vào đây hoặc nhấp để chọn': 'Drag & drop files here or click to browse',
    'Kích thước tối đa: 50MB': 'Maximum size: 50MB',
    'Tên tệp': 'File Name',
    'Kích thước': 'Size',
    'Ngày tải lên': 'Upload Date',
    'Lấy liên kết tải xuống': 'Get Download Link',
    'Xóa tệp tin': 'Delete File',
    'Chưa có tệp tin nào được tải lên.': 'No files uploaded yet.',

    // Template Market & Cart & Checkout
    'Thư viện mẫu LifeOS': 'LifeOS Template Library',
    'Cài đặt mẫu này': 'Install Template',
    'Mẫu miễn phí': 'Free Template',
    'Mẫu trả phí': 'Premium Template',
    'Thêm vào giỏ hàng': 'Add to Cart',
    'Xem giỏ hàng': 'View Cart',
    'Giỏ hàng của bạn': 'Your Shopping Cart',
    'Mã giảm giá (Coupon)': 'Discount Coupon',
    'Áp dụng': 'Apply',
    'Tạm tính': 'Subtotal',
    'Giảm giá': 'Discount',
    'Tổng cộng': 'Total',
    'Tiến hành thanh toán': 'Proceed to Checkout',
    'Giỏ hàng đang trống.': 'Your cart is empty.',
    'Thông tin chuyển khoản ngân hàng': 'Bank Transfer Information',
    'Quét mã QR để thanh toán nhanh': 'Scan QR Code for Quick Payment',
    'Số tài khoản:': 'Account Number:',
    'Chủ tài khoản:': 'Account Holder:',
    'Ngân hàng:': 'Bank:',
    'Số tiền:': 'Amount:',
    'Nội dung chuyển khoản:': 'Transfer Memo:',
    'Tôi đã chuyển khoản thành công': 'I have completed the transfer',
    'Yêu cầu thanh toán đang chờ quản trị viên duyệt': 'Payment request is pending administrator approval',

    // My Account & Settings
    'Thông tin cá nhân': 'Personal Information',
    'Đổi mật khẩu': 'Change Password',
    'Mật khẩu hiện tại': 'Current Password',
    'Mật khẩu mới': 'New Password',
    'Xác nhận mật khẩu mới': 'Confirm New Password',
    'Gói dịch vụ & Đăng ký': 'Subscription & Plans',
    'Thời hạn gói': 'Plan Validity',
    'Phiên đăng nhập': 'Active Sessions',
    'Đăng xuất khỏi tất cả thiết bị': 'Sign Out from All Devices',

    // Admin View
    'Bảng Quản Trị Hệ Thống': 'System Administration',
    'Duyệt thanh toán': 'Payment Requests',
    'Quản lý gói dịch vụ': 'Service Plans',
    'Cấu hình ngôn ngữ': 'Languages Config',
    'Quản lý người dùng': 'Users Management',
    'Cấu hình ngân hàng': 'Bank Configuration',
    'Lưu trữ Cloudflare R2': 'Cloudflare R2 Storage',
    'Module tùy chỉnh (Admin)': 'Custom Modules',
    'Nhật ký hệ thống': 'Audit Logs',
    'Duyệt': 'Approve',
    'Đổi vai trò': 'Change Role',
    'Đổi gói': 'Change Plan',
    'Khóa tài khoản': 'Suspend Account',
    'Mở khóa tài khoản': 'Activate Account',
    'Mật khẩu mới:': 'New Password:',
    'Cập nhật cấu hình': 'Update Configuration',
    'Lưu cấu hình': 'Save Configuration',
    'Đã lưu cấu hình thành công!': 'Configuration saved successfully!',

    // Common Messages & Toasts
    'Cập nhật thành công!': 'Updated successfully!',
    'Tạo mới thành công!': 'Created successfully!',
    'Đã lưu thay đổi.': 'Changes saved.',
    ...fullTranslations
  }
};

// Common Curated Overrides (Always high precedence over fullTranslations generated map)
Object.assign(translations.en, {
  'Xóa': 'Delete',
  'xóa': 'delete',
  'Từ chối': 'Rejected',
  'từ chối': 'rejected',
  'Hủy bỏ': 'Cancel',
  'hủy bỏ': 'cancel',
  'Lưu thay đổi': 'Save Changes',
  'Đang hoạt động': 'Active',
  'Chờ duyệt': 'Pending Review',
  'Đã duyệt': 'Approved',
  'Mật khẩu không khớp.': 'Passwords do not match.',
  'Vui lòng nhập họ và tên của bạn.': 'Please enter your full name.',
  'Vui lòng nhập đầy đủ các trường bắt buộc.': 'Please fill in all required fields.',
  'Bạn có chắc chắn muốn thực hiện thao tác này?': 'Are you sure you want to proceed?',
  'Thao tác này không thể hoàn tác.': 'This action cannot be undone.',
  'Xóa thành công!': 'Deleted successfully!',
  'Đã xảy ra lỗi. Vui lòng thử lại.': 'An error occurred. Please try again.'
});

// Build reverse dictionary for Vietnamese lookup of English keys/phrases
const enToViMap: Record<string, string> = {};
for (const [vi, en] of Object.entries(translations.en)) {
  if (en && typeof en === 'string') {
    enToViMap[en] = vi;
    enToViMap[en.toLowerCase()] = vi;
  }
}

// Pre-sorted phrases for substring replacement (longest first)
const sortedPhrases = Object.keys(translations.en)
  .filter(k => k.length >= 4 && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(k))
  .sort((a, b) => b.length - a.length);

/**
 * Intelligent Translation function:
 * Translates explicit keys or direct Vietnamese strings into English when language === 'en'.
 * In Vietnamese mode, preserves Vietnamese strings and translates English keys.
 */
export function t(key: string, language: LanguageCode = 'en'): string {
  if (!key) return '';
  const lang = (language || 'en').toLowerCase();
  
  if (lang === 'vi') {
    const viVal = translations.vi[key] || translations.vi[key.trim()];
    if (viVal) return viVal;
    if (enToViMap[key]) return enToViMap[key];
    if (enToViMap[key.trim()]) return enToViMap[key.trim()];
    const lower = key.trim().toLowerCase();
    if (enToViMap[lower]) return enToViMap[lower];
    return key;
  }

  // English translation mode
  const dict = translations.en || {};
  const trimmed = key.trim();

  // 1. Direct dictionary lookup
  if (dict[key]) return dict[key];
  if (dict[trimmed]) return dict[trimmed];

  // 2. Case-insensitive lookup
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(dict)) {
    if (k.toLowerCase() === lower) return v;
  }

  // 3. Dynamic numeric pattern: "Thông báo (3)" -> "Notifications (3)"
  const parenMatch = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const base = parenMatch[1].trim();
    const count = parenMatch[2].trim();
    const transBase = dict[base] || dict[base.toLowerCase()];
    if (transBase) {
      return `${transBase} (${count})`;
    }
  }

  // 4. Colon pattern: "Trạng thái: Đang hoạt động" -> "Status: Active"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();
      const transLeft = dict[left] || dict[left.toLowerCase()] || left;
      const transRight = dict[right] || dict[right.toLowerCase()] || right;
      if (transLeft !== left || transRight !== right) {
        return `${transLeft}: ${transRight}`;
      }
    }
  }

  // 5. Common Day / Date replacement
  let res = trimmed;
  res = res
    .replace(/\bThứ Hai\b/g, 'Monday')
    .replace(/\bThứ Ba\b/g, 'Tuesday')
    .replace(/\bThứ Tư\b/g, 'Wednesday')
    .replace(/\bThứ Năm\b/g, 'Thursday')
    .replace(/\bThứ Sáu\b/g, 'Friday')
    .replace(/\bThứ Bảy\b/g, 'Saturday')
    .replace(/\bChủ Nhật\b/g, 'Sunday')
    .replace(/\btháng (\d+)\b/gi, 'Month $1')
    .replace(/\bTháng (\d+)\b/g, 'Month $1')
    .replace(/\b(\d+)\s*ngày\b/gi, '$1 days')
    .replace(/\b(\d+)\s*giờ\b/gi, '$1 hours')
    .replace(/\b(\d+)\s*phút\b/gi, '$1 mins')
    .replace(/\b(\d+)\s*giây\b/gi, '$1 secs');

  if (res !== trimmed && dict[res]) return dict[res];

  // 6. Substring phrase replacement for compound sentences if Vietnamese characters still exist
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(res)) {
    for (const phrase of sortedPhrases) {
      if (res.includes(phrase)) {
        res = res.split(phrase).join(dict[phrase]);
        if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(res)) {
          break;
        }
      }
    }
  }

  // 7. Word-boundary fallback for core common terms if Vietnamese characters remain
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(res)) {
    const wordMap: Record<string, string> = {
      'Hôm nay': 'Today', 'hôm nay': 'today',
      'Hôm qua': 'Yesterday', 'hôm qua': 'yesterday',
      'Ngày mai': 'Tomorrow', 'ngày mai': 'tomorrow',
      'Hoàn thành': 'Completed', 'hoàn thành': 'completed',
      'Chưa làm': 'To Do', 'chưa làm': 'to do',
      'Đang làm': 'In Progress', 'đang làm': 'in progress',
      'Đang chờ': 'Pending', 'đang chờ': 'pending',
      'Đã xong': 'Done', 'đã xong': 'done',
      'Hủy': 'Cancelled', 'hủy': 'cancelled',
      'Xóa': 'Delete', 'xóa': 'delete',
      'Sửa': 'Edit', 'sửa': 'edit',
      'Tạo': 'Create', 'tạo': 'create',
      'Thêm': 'Add', 'thêm': 'add',
      'Lưu': 'Save', 'lưu': 'save',
      'Đóng': 'Close', 'đóng': 'close',
      'Xem': 'View', 'xem': 'view',
      'Tất cả': 'All', 'tất cả': 'all',
      'Tổng quan': 'Overview', 'tổng quan': 'overview',
      'Thu nhập': 'Income', 'thu nhập': 'income',
      'Chi tiêu': 'Expense', 'chi tiêu': 'expense',
      'Ngân sách': 'Budget', 'ngân sách': 'budget',
      'Tiết kiệm': 'Savings', 'tiết kiệm': 'savings',
      'Số dư': 'Balance', 'số dư': 'balance',
      'Giao dịch': 'Transactions', 'giao dịch': 'transactions',
      'Tài khoản': 'Account', 'tài khoản': 'account',
      'Thói quen': 'Habits', 'thói quen': 'habits',
      'Mục tiêu': 'Goals', 'mục tiêu': 'goals',
      'Công việc': 'Tasks', 'công việc': 'tasks',
      'Dự án': 'Projects', 'dự án': 'projects',
      'Học tập': 'Study', 'học tập': 'study',
      'Ghi chú': 'Notes', 'ghi chú': 'notes',
      'Lịch biểu': 'Calendar', 'lịch biểu': 'calendar',
      'Tập trung': 'Focus', 'tập trung': 'focus',
      'Cài đặt': 'Settings', 'cài đặt': 'settings',
      'Thông báo': 'Notifications', 'thông báo': 'notifications',
      'Đăng xuất': 'Log out', 'đăng xuất': 'log out',
      'Đăng nhập': 'Log in', 'đăng nhập': 'log in',
      'Tìm kiếm': 'Search', 'tìm kiếm': 'search',
      'Lọc': 'Filter', 'lọc': 'filter',
      'Ưu tiên': 'Priority', 'ưu tiên': 'priority',
      'Hạn chót': 'Deadline', 'hạn chót': 'deadline',
      'Trạng thái': 'Status', 'trạng thái': 'status',
      'An toàn': 'Safe', 'an toàn': 'safe',
      'Vượt hạn mức': 'Over Budget', 'vượt hạn mức': 'over budget',
      'Đã duyệt': 'Approved', 'đã duyệt': 'approved',
      'Chờ duyệt': 'Pending Review', 'chờ duyệt': 'pending review',
      'Từ chối': 'Rejected', 'từ chối': 'rejected',
      'Kỳ trước': 'Previous period', 'kỳ trước': 'previous period',
      'Tháng trước': 'Last month', 'tháng trước': 'last month',
      'Tháng này': 'This month', 'tháng này': 'this month',
      'Năm nay': 'This year', 'năm nay': 'this year',
      'Trung bình': 'Average', 'trung bình': 'average',
      'Dự kiến': 'Projected', 'dự kiến': 'projected',
      'Giữ lại': 'Retained', 'giữ lại': 'retained'
    };

    for (const [w, repl] of Object.entries(wordMap)) {
      if (res.includes(w)) {
        res = res.split(w).join(repl);
      }
    }
  }

  return res;
}

/**
 * React Hook for translations:
 * Can be called with no arguments `useTranslation()` (reactively tracks store language)
 * or with an explicit language code `useTranslation('en')`.
 */
export function useTranslation(overrideLang?: LanguageCode) {
  let activeLang: LanguageCode = overrideLang || 'en';
  
  if (!overrideLang) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lifeos_lang');
      if (saved) activeLang = saved;
    }
  }

  return (key: string): string => {
    return t(key, activeLang);
  };
}
