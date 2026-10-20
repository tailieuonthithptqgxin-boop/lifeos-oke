export type AdminTab = 
  | 'requests' 
  | 'subscriptions'
  | 'plans' 
  | 'languages' 
  | 'users' 
  | 'password_resets'
  | 'bank_config' 
  | 'storage' 
  | 'custom_modules' 
  | 'gmail_config'
  | 'referrals'
  | 'feedback'
  | 'announcements'
  | 'live_test_lab';

export interface PasswordResetRequestItem {
  id: string;
  ticketCode: string;
  userId: string;
  email: string;
  verificationNote?: string | null;
  backupPin?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED';
  expiresAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar?: string | null;
  };
  approvedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: 'GENERAL' | 'MAINTENANCE' | 'FEATURE' | 'SECURITY' | 'PROMOTION';
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  targetAudience: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ROLE_ADMIN' | 'ROLE_USER' | 'PLAN_PRO' | 'PLAN_FREE' | 'PLAN_TEAM' | 'SELECTED_USERS';
  targetUserIds?: string | null;
  channels: 'WEB' | 'EMAIL' | 'BOTH';
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'CANCELLED' | 'ARCHIVED';
  scheduledFor?: string | null;
  expiresAt?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  stats?: {
    webTotal: number;
    emailTotal: number;
    emailSent: number;
    emailFailed: number;
  };
  deliveries?: AnnouncementDeliveryItem[];
}

export interface AnnouncementDeliveryItem {
  id: string;
  announcementId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  channel: 'WEB' | 'EMAIL';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}


export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planType: string;
  planName: string;
  amount: number;
  durationDays: number;
  paymentStatus: string;
  status: string;
  txReference?: string;
  paymentId?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    avatar?: string;
  };
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  avatar?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  customerEmail: string;
  orderId: string;
  planRequested: string;
  amount: number;
  method: string;
  status: string; // PENDING | APPROVED | REJECTED | CANCELLED
  txReference: string;
  billingCycle: string;
  note?: string | null;
  rejectedReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    avatar?: string;
  };
}

export interface BankConfig {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferPrefix: string;
  bankCode: string;
  qrImageUrl?: string;
  isActive?: boolean;
}

export interface ServicePlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  price?: number;
  monthlyPrice: number;
  yearlyPrice: number;
  durationDays?: number;
  type?: 'PERSONAL' | 'TEAM';
  maxTeamMembers?: number;
  billingCycle: string;
  status: 'ACTIVE' | 'INACTIVE';
  order: number;
  features: string[];
  quota?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LanguageItem {
  code: string;
  name: string;
  flag: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

export interface PlanAuditLog {
  id: string;
  adminId: string;
  action: string;
  beforeState: string | null;
  afterState: string | null;
  timestamp: string;
}

export interface GmailConfig {
  enabled: boolean;
  serviceType: 'gmail' | 'smtp' | 'resend';
  apiKey?: string;
  user: string;
  appPassword?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  notifyTaskOverdue: boolean;
  notifyTaskUpcoming: boolean;
  notifyCalendarUpcoming: boolean;
  notifyBudgetThreshold: boolean;
  notifySubscriptionExpiry: boolean;
  notifyPaymentStatus: boolean;
  notifySecurityAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxRemindersPerDay: number;
}
