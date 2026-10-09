import { Role } from '@prisma/client';

export type SecurityRole = 'PUBLIC' | 'USER' | 'PREMIUM_USER' | 'TEAM_MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM';

export interface ResourcePermission {
  create: SecurityRole[];
  read: SecurityRole[];
  update: SecurityRole[];
  delete: SecurityRole[];
  ownership: 'USER' | 'SYSTEM' | 'PUBLIC';
  /** Fields that client is forbidden from setting or modifying */
  immutableFields?: string[];
  /** Allowed writable fields whitelist (if defined, only these can be written) */
  writableFields?: string[];
  /** Maximum items returned per page */
  maxLimit?: number;
}

// Global list of sensitive / protected fields that client can NEVER overwrite directly
export const FORBIDDEN_CLIENT_FIELDS = new Set([
  'id',
  'userId',
  'user_id',
  'role',
  'plan',
  'status',
  'paymentStatus',
  'subscriptionStatus',
  'verified',
  'approved',
  'approvedAt',
  'approvedBy',
  'admin',
  'superAdmin',
  'isSuperAdmin',
  'isAdmin',
  'passwordHash',
  'token',
  'createdAt',
  'updatedAt'
]);

/**
 * Collection Security Registry
 * Centralized, declarative security rules for all API collections.
 * Enforces ownership, role checks, and prevents mass assignment.
 */
export const COLLECTION_REGISTRY: Record<string, ResourcePermission> = {
  // ------------------------------------------------------------------------
  // USER-OWNED WORKSPACE RESOURCES (Standard User Ownership)
  // ------------------------------------------------------------------------
  tasks: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'description', 'status', 'priority', 'dueDate', 'startDate', 'estimatedHours', 'actualHours', 'tags', 'recurring', 'recurrence', 'notes', 'projectId', 'linkedGoalId'],
    maxLimit: 100
  },
  projects: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['name', 'description', 'status', 'health', 'progress', 'startDate', 'deadline', 'budget', 'color'],
    maxLimit: 100
  },
  notes: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'content', 'folder', 'category', 'pinned', 'tags', 'sections', 'type'],
    maxLimit: 100
  },
  habits: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['name', 'category', 'target', 'unitLabel', 'unit', 'streak', 'bestStreak', 'status', 'completedDates', 'scheduleTime'],
    maxLimit: 100
  },
  habitRecords: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['habitId', 'date', 'value', 'completed'],
    maxLimit: 100
  },
  goals: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'category', 'progress', 'status', 'targetValue', 'currentValue', 'deadline', 'streak', 'score', 'tier'],
    maxLimit: 100
  },
  events: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'description', 'date', 'startTime', 'endTime', 'type', 'status', 'color', 'reminder'],
    maxLimit: 100
  },
  calendarEvents: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'description', 'date', 'startTime', 'endTime', 'type', 'status', 'color', 'reminder'],
    maxLimit: 100
  },
  routines: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['date', 'startTime', 'endTime', 'label', 'category'],
    maxLimit: 100
  },
  scheduleBlocks: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['date', 'startTime', 'endTime', 'label', 'category'],
    maxLimit: 100
  },
  reminders: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'dueAt', 'channel', 'sent'],
    maxLimit: 100
  },
  focusSessions: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'mode', 'status', 'plannedDuration', 'actualDuration', 'startTime'],
    maxLimit: 100
  },
  focusGoals: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['type', 'targetHours', 'startDate'],
    maxLimit: 100
  },
  financeAccounts: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['name', 'type', 'balance', 'currency', 'color'],
    maxLimit: 100
  },
  transactions: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['accountId', 'toAccountId', 'amount', 'type', 'category', 'date', 'note', 'description'],
    maxLimit: 100
  },
  budgets: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['category', 'limit', 'period', 'spent'],
    maxLimit: 100
  },
  savingGoals: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'targetAmount', 'currentAmount', 'deadline'],
    maxLimit: 100
  },
  debts: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'person', 'amount', 'type', 'dueDate', 'status'],
    maxLimit: 100
  },
  recurringTransactions: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['accountId', 'amount', 'type', 'category', 'frequency', 'nextDate', 'active'],
    maxLimit: 100
  },
  subjects: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['name', 'targetGrade', 'currentGrade', 'progress', 'color'],
    maxLimit: 100
  },
  studyTopics: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['subjectId', 'title', 'dueDate', 'status', 'estimatedHours', 'actualHours', 'grade'],
    maxLimit: 100
  },
  studyAssignments: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['subjectId', 'title', 'dueDate', 'status', 'estimatedHours', 'actualHours', 'grade'],
    maxLimit: 100
  },
  studyExams: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['subjectId', 'title', 'examDate', 'targetScore', 'actualScore', 'status'],
    maxLimit: 100
  },
  studySessions: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['subjectId', 'durationMinutes', 'date', 'notes'],
    maxLimit: 100
  },
  decisions: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'problem', 'category', 'importance', 'status', 'selectedOptionId', 'score', 'outcome', 'expectedResult', 'actualResult', 'reviewDate', 'options', 'criteria', 'risks', 'scenarios'],
    maxLimit: 100
  },
  automationRules: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['name', 'description', 'module', 'triggerType', 'conditions', 'actions', 'priority', 'active', 'cooldownMinutes'],
    maxLimit: 100
  },
  supportTickets: {
    ownership: 'USER',
    create: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['ADMIN', 'SUPER_ADMIN'],
    writableFields: ['title', 'category', 'priority', 'status', 'messages'],
    maxLimit: 50
  },
  notifications: {
    ownership: 'USER',
    create: ['SYSTEM', 'ADMIN', 'SUPER_ADMIN'],
    read: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'], // User can mark as read
    delete: ['USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    writableFields: ['read'],
    maxLimit: 100
  },

  // ------------------------------------------------------------------------
  // SENSITIVE SYSTEM / COMMERCE RESOURCES (Strictly Protected from Generic CRUD)
  // ------------------------------------------------------------------------
  subscriptions: {
    ownership: 'SYSTEM',
    create: ['SYSTEM'], // Handled solely by SubscriptionService upon payment
    read: ['ADMIN', 'SUPER_ADMIN'],
    update: ['SYSTEM', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['SYSTEM', 'SUPER_ADMIN'],
    maxLimit: 50
  },
  payments: {
    ownership: 'SYSTEM',
    create: ['SYSTEM'], // Handled solely by Payment Flow
    read: ['ADMIN', 'SUPER_ADMIN'],
    update: ['SYSTEM', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['SUPER_ADMIN'],
    maxLimit: 50
  },
  orders: {
    ownership: 'SYSTEM',
    create: ['SYSTEM'], // Handled solely by Checkout Service
    read: ['ADMIN', 'SUPER_ADMIN'],
    update: ['SYSTEM', 'ADMIN', 'SUPER_ADMIN'],
    delete: ['SUPER_ADMIN'],
    maxLimit: 50
  },
  coupons: {
    ownership: 'SYSTEM',
    create: ['ADMIN', 'SUPER_ADMIN'], // Only Admins can create coupons
    read: ['ADMIN', 'SUPER_ADMIN'],   // Users only validate via /api/coupons/validate
    update: ['ADMIN', 'SUPER_ADMIN'],
    delete: ['ADMIN', 'SUPER_ADMIN'],
    writableFields: ['code', 'discountPercent', 'status', 'maxUses', 'expiresAt'],
    maxLimit: 50
  },
  products: {
    ownership: 'PUBLIC',
    create: ['ADMIN', 'SUPER_ADMIN'],
    read: ['PUBLIC', 'USER', 'PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'],
    update: ['ADMIN', 'SUPER_ADMIN'],
    delete: ['ADMIN', 'SUPER_ADMIN'],
    maxLimit: 50
  },
  auditLogs: {
    ownership: 'SYSTEM',
    create: ['SYSTEM'],
    read: ['ADMIN', 'SUPER_ADMIN'],
    update: [], // Append-only
    delete: [], // Never deletable
    maxLimit: 100
  },
  systemSettings: {
    ownership: 'SYSTEM',
    create: ['SUPER_ADMIN'],
    read: ['ADMIN', 'SUPER_ADMIN'],
    update: ['SUPER_ADMIN'],
    delete: ['SUPER_ADMIN'],
    maxLimit: 50
  }
};

/**
 * Check if a role has the required permission for an operation on a collection.
 */
export function checkPermission(
  collectionName: string,
  operation: 'create' | 'read' | 'update' | 'delete',
  userRole: string,
  userPlan: string = 'FREE'
): { allowed: boolean; reason?: string } {
  const config = COLLECTION_REGISTRY[collectionName];
  if (!config) {
    return { allowed: false, reason: `Danh mục '${collectionName}' không nằm trong danh mục bảo vệ hợp lệ.` };
  }

  const normalizedRole = (userRole || '').toUpperCase();
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN';
  const isAdmin = normalizedRole === 'ADMIN' || isSuperAdmin;
  const role: SecurityRole = (normalizedRole as SecurityRole);

  // SuperAdmins always pass
  if (isSuperAdmin) return { allowed: true };

  const allowedRoles = config[operation];
  if (!allowedRoles || allowedRoles.length === 0) {
    return { allowed: false, reason: `Thao tác '${operation}' bị cấm trên danh mục '${collectionName}'.` };
  }

  // System-only guard
  if (allowedRoles.includes('SYSTEM') && !allowedRoles.includes('USER') && !allowedRoles.includes('ADMIN')) {
    if (!isAdmin) {
      return {
        allowed: false,
        reason: `Dữ liệu '${collectionName}' được quản lý tự động bởi hệ thống, không thể thao tác trực tiếp qua API CRUD.`
      };
    }
  }

  // Admin permission
  if (isAdmin && (allowedRoles.includes('ADMIN') || allowedRoles.includes('SUPER_ADMIN'))) {
    return { allowed: true };
  }

  // Standard user permission
  if (allowedRoles.includes('USER') || allowedRoles.includes('PREMIUM_USER')) {
    return { allowed: true };
  }

  return { allowed: false, reason: `Bạn không có quyền '${operation}' trên danh mục '${collectionName}'.` };
}

/**
 * Sanitize client write payload by removing forbidden & unapproved fields (Anti-Mass Assignment).
 */
export function sanitizePayload(collectionName: string, rawPayload: Record<string, any>): Record<string, any> {
  const config = COLLECTION_REGISTRY[collectionName];
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(rawPayload)) {
    // 1. Strip hard forbidden fields
    if (FORBIDDEN_CLIENT_FIELDS.has(key)) {
      continue;
    }

    // 2. If whitelist exists, only allow whitelisted fields
    if (config?.writableFields && !config.writableFields.includes(key)) {
      continue;
    }

    clean[key] = value;
  }

  return clean;
}
