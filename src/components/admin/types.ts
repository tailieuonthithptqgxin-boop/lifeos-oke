export type AdminTab = 
  | 'requests' 
  | 'plans' 
  | 'languages' 
  | 'users' 
  | 'bank_config' 
  | 'storage' 
  | 'custom_modules' 
  | 'gmail_config'
  | 'referrals'
  | 'feedback';

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
  monthlyPrice: number;
  yearlyPrice: number;
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
  serviceType: 'gmail' | 'smtp';
  user: string;
  appPassword?: string;
  fromName: string;
  fromEmail: string;
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
