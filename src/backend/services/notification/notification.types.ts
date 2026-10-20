/**
 * Core Types & Interfaces for Notification Engine
 */

export type NotificationEventType =
  // Calendar Events
  | 'CALENDAR_UPCOMING'
  | 'CALENDAR_STARTING'
  | 'CALENDAR_ENDED'
  | 'CALENDAR_CHANGED'
  | 'CALENDAR_CANCELLED'
  // Task Events
  | 'TASK_CREATED'
  | 'TASK_DEADLINE_APPROACHING'
  | 'TASK_DUE_NOW'
  | 'TASK_OVERDUE'
  | 'TASK_UNCOMPLETED_AFTER_DEADLINE'
  | 'TASK_COMPLETED'
  | 'TASK_ASSIGNED_OR_CHANGED'
  // System & Financial Events
  | 'BUDGET_EXCEEDED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SECURITY_ALERT'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type DeliveryChannel = 'in_app' | 'email' | 'push' | 'telegram';

export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED';

export interface NotificationEventPayload {
  userId: string;
  eventType: NotificationEventType;
  entityId?: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  category?: 'CALENDAR' | 'TASK' | 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  triggerBucket?: string; // Unique time bucket for anti-duplication, e.g. "2026-10-20T19:00" or "overdue_2026-10-20"
}

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  deliveryId?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface NotificationProvider {
  readonly channel: DeliveryChannel;
  send(
    delivery: {
      id: string;
      userId: string;
      recipient: string;
      subject?: string | null;
      title: string;
      content: string;
      priority: string;
      actionUrl?: string | null;
      actionLabel?: string | null;
      metadata?: string | null;
    },
    userContext: {
      email: string;
      name?: string | null;
    }
  ): Promise<DeliveryResult>;
}

export interface UserNotificationRuleConfig {
  eventType: NotificationEventType;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultTimingMinutes: number;
  defaultPriority: NotificationPriority;
  supportedTimings: { label: string; minutes: number }[];
}

export const SYSTEM_NOTIFICATION_RULES: Record<NotificationEventType, UserNotificationRuleConfig> = {
  CALENDAR_UPCOMING: {
    eventType: 'CALENDAR_UPCOMING',
    label: 'Lịch sắp diễn ra',
    description: 'Nhắc nhở trước khi sự kiện trên lịch/thời gian biểu bắt đầu',
    defaultEnabled: true,
    defaultTimingMinutes: 15,
    defaultPriority: 'HIGH',
    supportedTimings: [
      { label: 'Trước 5 phút', minutes: 5 },
      { label: 'Trước 15 phút', minutes: 15 },
      { label: 'Trước 30 phút', minutes: 30 },
      { label: 'Trước 1 giờ', minutes: 60 },
      { label: 'Trước 1 ngày', minutes: 1440 }
    ]
  },
  CALENDAR_STARTING: {
    eventType: 'CALENDAR_STARTING',
    label: 'Lịch bắt đầu diễn ra',
    description: 'Thông báo đúng thời điểm sự kiện bắt đầu',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'HIGH',
    supportedTimings: [{ label: 'Đúng giờ bắt đầu', minutes: 0 }]
  },
  CALENDAR_ENDED: {
    eventType: 'CALENDAR_ENDED',
    label: 'Lịch kết thúc',
    description: 'Gợi ý ghi chú và tổng kết sau khi kết thúc sự kiện',
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: 'LOW',
    supportedTimings: [{ label: 'Ngay khi kết thúc', minutes: 0 }]
  },
  CALENDAR_CHANGED: {
    eventType: 'CALENDAR_CHANGED',
    label: 'Lịch bị thay đổi',
    description: 'Cảnh báo khi thời gian, ngày hoặc tiêu đề lịch bị cập nhật',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'NORMAL',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  },
  CALENDAR_CANCELLED: {
    eventType: 'CALENDAR_CANCELLED',
    label: 'Lịch bị hủy',
    description: 'Thông báo khi một sự kiện đã lên lịch bị xóa hoặc hủy',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'NORMAL',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  },
  TASK_CREATED: {
    eventType: 'TASK_CREATED',
    label: 'Nhiệm vụ mới được tạo',
    description: 'Xác nhận khi có nhiệm vụ mới được thêm vào danh sách',
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: 'LOW',
    supportedTimings: [{ label: 'Ngay khi tạo', minutes: 0 }]
  },
  TASK_DEADLINE_APPROACHING: {
    eventType: 'TASK_DEADLINE_APPROACHING',
    label: 'Hạn chót nhiệm vụ sắp đến',
    description: 'Cảnh báo trước khi nhiệm vụ chạm deadline',
    defaultEnabled: true,
    defaultTimingMinutes: 1440, // 1 day before
    defaultPriority: 'HIGH',
    supportedTimings: [
      { label: 'Trước 1 giờ', minutes: 60 },
      { label: 'Trước 3 giờ', minutes: 180 },
      { label: 'Trước 1 ngày', minutes: 1440 },
      { label: 'Trước 2 ngày', minutes: 2880 }
    ]
  },
  TASK_DUE_NOW: {
    eventType: 'TASK_DUE_NOW',
    label: 'Nhiệm vụ đến hạn hôm nay',
    description: 'Nhắc việc tổng hợp vào buổi sáng đối với các việc đến hạn',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'HIGH',
    supportedTimings: [{ label: 'Buổi sáng ngày đến hạn', minutes: 0 }]
  },
  TASK_OVERDUE: {
    eventType: 'TASK_OVERDUE',
    label: 'Nhiệm vụ quá hạn',
    description: 'Cảnh báo khẩn khi công việc đã vượt quá ngày hạn chót mà chưa xong',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'CRITICAL',
    supportedTimings: [{ label: 'Ngay khi quá hạn', minutes: 0 }]
  },
  TASK_UNCOMPLETED_AFTER_DEADLINE: {
    eventType: 'TASK_UNCOMPLETED_AFTER_DEADLINE',
    label: 'Nhắc nhở công việc tồn đọng',
    description: 'Định kỳ nhắc nhở các task quá hạn lâu ngày cần xử lý gấp',
    defaultEnabled: true,
    defaultTimingMinutes: 1440,
    defaultPriority: 'HIGH',
    supportedTimings: [{ label: 'Mỗi 24 giờ', minutes: 1440 }]
  },
  TASK_COMPLETED: {
    eventType: 'TASK_COMPLETED',
    label: 'Nhiệm vụ hoàn thành',
    description: 'Chúc mừng và ghi nhận điểm thưởng khi hoàn thành công việc',
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: 'LOW',
    supportedTimings: [{ label: 'Ngay khi hoàn tất', minutes: 0 }]
  },
  TASK_ASSIGNED_OR_CHANGED: {
    eventType: 'TASK_ASSIGNED_OR_CHANGED',
    label: 'Nhiệm vụ được giao hoặc sửa',
    description: 'Thông báo khi task của bạn được điều chỉnh tiến độ hoặc phân công',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'NORMAL',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  },
  BUDGET_EXCEEDED: {
    eventType: 'BUDGET_EXCEEDED',
    label: 'Cảnh báo vượt ngân sách',
    description: 'Cảnh báo khi chi tiêu chạm hoặc vượt hạn mức ngân sách',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'HIGH',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  },
  SUBSCRIPTION_EXPIRING: {
    eventType: 'SUBSCRIPTION_EXPIRING',
    label: 'Gói dịch vụ sắp hết hạn',
    description: 'Nhắc nhở gia hạn trước khi gói Pro/Team hết hiệu lực',
    defaultEnabled: true,
    defaultTimingMinutes: 4320, // 3 days before
    defaultPriority: 'HIGH',
    supportedTimings: [
      { label: 'Trước 1 ngày', minutes: 1440 },
      { label: 'Trước 3 ngày', minutes: 4320 },
      { label: 'Trước 7 ngày', minutes: 10080 }
    ]
  },
  SECURITY_ALERT: {
    eventType: 'SECURITY_ALERT',
    label: 'Cảnh báo bảo mật tài khoản',
    description: 'Thông báo đăng nhập bất thường, đổi mật khẩu hoặc xác thực 2 lớp',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'CRITICAL',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  },
  SYSTEM_ALERT: {
    eventType: 'SYSTEM_ALERT',
    label: 'Thông báo hệ thống quan trọng',
    description: 'Bảo trì hệ thống, nâng cấp phiên bản hoặc thông báo từ Quản trị',
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: 'HIGH',
    supportedTimings: [{ label: 'Ngay lập tức', minutes: 0 }]
  }
};
