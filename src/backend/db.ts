import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://lifeos_user:secure_password_123@localhost:5432/lifeos_db?schema=public";
    }
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn'] : []
    });
  }
  return prismaClient;
}

export async function checkDbConnection(): Promise<boolean> {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    const check: any = await prisma.$queryRaw`
      SELECT 
        to_regclass('public.users') as users_table,
        to_regclass('public.sessions') as sessions_table,
        to_regclass('public.system_settings') as settings_table
    `;
    const row = check && check[0];
    if (!row?.users_table || !row?.sessions_table || !row?.settings_table) {
      if (isProduction) {
        console.error('❌ [DATABASE ERROR]: Database schema missing required tables in production. Run "npx prisma migrate deploy" before starting the server.');
        throw new Error('Database schema uninitialized. Run migrations with "prisma migrate deploy".');
      } else {
        console.log('⚠️ [DEV]: Database schema missing or incomplete. Synchronizing development Prisma schema...');
        const { execSync } = await import('child_process');
        execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Development database schema synchronized.');
      }
    }
  } catch (err: any) {
    if (isProduction) {
      throw err;
    }
    if (err.message && (err.message.includes('does not exist') || err.message.includes('relation') || err.code === 'P2021')) {
      try {
        console.log('⚠️ [DEV]: Running Prisma schema push to repair missing relations in development...');
        const { execSync } = await import('child_process');
        execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
      } catch (pushErr: any) {
        console.warn('Auto prisma db push attempt warning:', pushErr.message);
      }
    }
  }

  return true;
}

// Map frontend collection names to Prisma model delegates
function getModelDelegate(collectionName: string) {
  const prisma = getPrisma() as any;
  const mapping: Record<string, string> = {
    tasks: 'task',
    projects: 'project',
    goals: 'goal',
    habits: 'habit',
    notes: 'note',
    events: 'calendarEvent',
    calendarEvents: 'calendarEvent',
    routines: 'scheduleBlock',
    scheduleBlocks: 'scheduleBlock',
    reminders: 'reminder',
    focusSessions: 'focusSession',
    focusGoals: 'focusGoal',
    financeAccounts: 'financeAccount',
    transactions: 'transaction',
    budgets: 'budget',
    savingGoals: 'savingGoal',
    debts: 'debt',
    recurringTransactions: 'recurringTransaction',
    subjects: 'subject',
    studyTopics: 'studyAssignment',
    studyAssignments: 'studyAssignment',
    studyExams: 'studyExam',
    studySessions: 'studySession',
    habitRecords: 'habitLog',
    decisions: 'decision',
    decisionRules: 'automationRule',
    automationRules: 'automationRule',
    automationHistory: 'automationExecution',
    automationConflicts: 'automationExecution',
    subscriptions: 'subscription',
    cart: 'cartItem',
    cartItems: 'cartItem',
    orders: 'order',
    coupons: 'coupon',
    products: 'systemTemplate',
    inbox: 'supportTicket',
    supportTickets: 'supportTicket',
    notifications: 'notification'
  };

  const modelKey = mapping[collectionName] || collectionName;
  const delegate = prisma[modelKey];
  if (!delegate) {
    throw new Error(`Collection '${collectionName}' does not exist in PostgreSQL schema`);
  }
  return delegate;
}

// Helper to serialize array/object fields to JSON strings for Postgres text fields
function formatIncomingData(collectionName: string, data: any) {
  const payload = { ...data };

  // Remove internal/relation props if any
  delete payload.user;
  delete payload.project;
  delete payload.goal;
  delete payload.account;
  delete payload.subject;

  if (collectionName === 'decisions') {
    if (!payload.title && payload.name) payload.title = payload.name;
    if (payload.title) payload.title = String(payload.title).trim();

    // Map problemStatement -> problem
    if (payload.problemStatement !== undefined && !payload.problem) {
      payload.problem = String(payload.problemStatement).trim();
    }
    if (payload.problem) {
      payload.problem = String(payload.problem).trim();
    }

    const hasMetaFields = 
      payload.constraints !== undefined ||
      payload.threshold !== undefined ||
      payload.deadline !== undefined ||
      payload.createdTaskId !== undefined ||
      payload.opportunityCosts !== undefined ||
      payload.review !== undefined ||
      payload.whyReason !== undefined ||
      payload.tags !== undefined ||
      payload.owner !== undefined ||
      payload.goalId !== undefined ||
      payload.projectId !== undefined ||
      payload.history !== undefined ||
      payload.decisionNotes !== undefined ||
      payload.scenarios !== undefined;

    if (hasMetaFields) {
      const meta: any = {
        constraints: Array.isArray(payload.constraints) ? payload.constraints : (payload.constraints ? [payload.constraints] : []),
        threshold: payload.threshold || 'Standard',
        deadline: payload.deadline || null,
        createdTaskId: payload.createdTaskId || null,
        opportunityCosts: Array.isArray(payload.opportunityCosts) ? payload.opportunityCosts : [],
        review: payload.review || null,
        whyReason: payload.whyReason || null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        owner: payload.owner || null,
        goalId: payload.goalId || null,
        projectId: payload.projectId || null,
        history: Array.isArray(payload.history) ? payload.history : [],
        decisionNotes: payload.decisionNotes || null
      };

      if (Array.isArray(payload.scenarios)) {
        meta.rawScenarios = payload.scenarios;
      }

      payload.scenarios = JSON.stringify(meta);
    }

    if (payload.options !== undefined) {
      if (Array.isArray(payload.options) || (typeof payload.options === 'object' && payload.options !== null)) {
        payload.options = JSON.stringify(payload.options);
      }
    }

    if (payload.criteria !== undefined) {
      if (Array.isArray(payload.criteria) || (typeof payload.criteria === 'object' && payload.criteria !== null)) {
        payload.criteria = JSON.stringify(payload.criteria);
      }
    }

    if (payload.risks !== undefined) {
      if (Array.isArray(payload.risks) || (typeof payload.risks === 'object' && payload.risks !== null)) {
        payload.risks = JSON.stringify(payload.risks);
      }
    }

    if (payload.score !== undefined) {
      payload.score = parseFloat(payload.score) || 0;
    }

    // Strip client-only, relation, and non-model fields so Prisma validation succeeds
    delete payload.problemStatement;
    delete payload.whyReason;
    delete payload.deadline;
    delete payload.constraints;
    delete payload.threshold;
    delete payload.tags;
    delete payload.owner;
    delete payload.goalId;
    delete payload.projectId;
    delete payload.history;
    delete payload.decisionNotes;
    delete payload.opportunityCosts;
    delete payload.createdTaskId;
    delete payload.review;
    delete payload.name;
  } else if (collectionName === 'habits') {
    if (!payload.name && payload.title) payload.name = payload.title;
    delete payload.title;
    if (Array.isArray(payload.completedDates)) payload.completedDates = JSON.stringify(payload.completedDates);
  } else if (collectionName === 'tasks') {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;

    // Foreign key safety: empty strings -> null
    if (payload.projectId === '') payload.projectId = null;
    if (payload.linkedGoalId === '') payload.linkedGoalId = null;
    if (payload.goalId && !payload.linkedGoalId) payload.linkedGoalId = payload.goalId;
    delete payload.goalId;

    if (payload.dueDate === '') payload.dueDate = null;
    if (payload.startDate === '') payload.startDate = null;

    // Normalize status to standard Vietnamese names
    if (payload.status) {
      const s = String(payload.status).trim().toLowerCase();
      if (['done', 'completed', 'hoàn thành', 'đã xong'].includes(s)) {
        payload.status = 'Hoàn thành';
      } else if (['to do', 'todo', 'to-do', 'to_do', 'chưa làm', 'cần làm'].includes(s)) {
        payload.status = 'Chưa làm';
      } else if (['in progress', 'in_progress', 'doing', 'đang làm'].includes(s)) {
        payload.status = 'Đang làm';
      } else if (['blocked', 'đang chờ', 'đã hoãn', 'deferred', 'kế hoạch', 'waiting'].includes(s)) {
        payload.status = 'Đang chờ';
      } else if (['cancelled', 'canceled', 'hủy'].includes(s)) {
        payload.status = 'Hủy';
      }
    }

    // Normalize priority
    if (payload.priority) {
      const p = String(payload.priority).trim();
      if (p === 'High' || p === 'high' || p === 'Urgent' || p === 'urgent') {
        payload.priority = 'Cao';
      } else if (p === 'Critical' || p === 'critical') {
        payload.priority = 'Nghiêm trọng';
      } else if (p === 'Medium' || p === 'medium' || p === 'normal') {
        payload.priority = 'Trung bình';
      } else if (p === 'Low' || p === 'low') {
        payload.priority = 'Thấp';
      }
    }

    // Map recurrence -> recurring (Prisma model has `recurring String?`)
    if (payload.recurrence !== undefined) {
      if (!payload.recurring) payload.recurring = String(payload.recurrence);
      delete payload.recurrence;
    }

    // Map tags: array -> JSON string
    if (Array.isArray(payload.tags) || (typeof payload.tags === 'object' && payload.tags !== null)) {
      payload.tags = JSON.stringify(payload.tags);
    } else if (typeof payload.tags === 'string' && !payload.tags.startsWith('[')) {
      const arr = payload.tags.split(',').map((t: string) => t.trim().replace(/^#/, '')).filter(Boolean);
      payload.tags = JSON.stringify(arr);
    }

    // Handle notes: append to description if provided
    if (payload.notes) {
      if (!payload.description) {
        payload.description = payload.notes;
      } else if (!payload.description.includes(payload.notes)) {
        payload.description = `${payload.description}\n\n[Ghi chú]: ${payload.notes}`;
      }
      delete payload.notes;
    }

    // Numeric coercions
    if (payload.estimatedHours !== undefined) {
      payload.estimatedHours = Number(payload.estimatedHours) || 0;
    }
    if (payload.actualHours !== undefined) {
      payload.actualHours = Number(payload.actualHours) || 0;
    }

    // Clean client-only presentation fields
    delete payload.projectName;
    delete payload.goalTitle;
    delete payload.timerActive;
    delete payload.timerSeconds;
    delete payload.createdAt;
    delete payload.updatedAt;
  } else if (collectionName === 'projects') {
    if (!payload.name && payload.title) payload.name = payload.title;
    delete payload.title;
    delete payload.category;
    delete payload.priority;
  } else if (collectionName === 'goals' || collectionName === 'focusGoals') {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (payload.target !== undefined && payload.targetValue === undefined) {
      payload.targetValue = Number(payload.target) || 100;
    }
    delete payload.target;
  } else if (collectionName === 'savingGoals') {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    delete payload.category;
  } else if (collectionName === 'notes') {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (Array.isArray(payload.tags)) payload.tags = JSON.stringify(payload.tags);
  } else if (collectionName === 'automationRules' || collectionName === 'decisionRules') {
    // 1. Ensure name is present
    if (!payload.name) {
      payload.name = payload.title || payload.id || 'Quy tắc tự động';
    }

    // 2. Ensure triggerType is present
    if (!payload.triggerType) {
      if (typeof payload.trigger === 'string') {
        payload.triggerType = payload.trigger;
      } else if (payload.trigger && typeof payload.trigger === 'object' && payload.trigger.type) {
        payload.triggerType = payload.trigger.type;
      } else {
        payload.triggerType = 'Manual';
      }
    }

    // 3. Ensure module is present
    if (!payload.module) {
      payload.module = payload.category || (payload.trigger && typeof payload.trigger === 'object' ? payload.trigger.targetModule : null) || 'Tasks';
    }

    // 4. Ensure active is a boolean
    if (payload.active === undefined && payload.enabled !== undefined) {
      payload.active = Boolean(payload.enabled);
    }
    if (payload.active === undefined) {
      payload.active = true;
    }

    // 5. Serialize conditions
    const conditionsData = payload.conditions || payload.conditionGroups || [];
    payload.conditions = typeof conditionsData === 'string' ? conditionsData : JSON.stringify(conditionsData);

    // 6. Serialize actions
    const actionsData = payload.actions || [];
    payload.actions = typeof actionsData === 'string' ? actionsData : JSON.stringify(actionsData);

    // 7. Ensure cooldownMinutes is a number
    if (payload.cooldownMinutes === undefined) {
      if (typeof payload.cooldownFrequency === 'string') {
        if (payload.cooldownFrequency.toLowerCase().includes('day')) payload.cooldownMinutes = 1440;
        else if (payload.cooldownFrequency.toLowerCase().includes('hour')) payload.cooldownMinutes = 60;
        else payload.cooldownMinutes = 0;
      } else {
        payload.cooldownMinutes = 0;
      }
    } else {
      payload.cooldownMinutes = parseInt(payload.cooldownMinutes, 10) || 0;
    }

    // 8. Delete frontend-only fields not present in Prisma AutomationRule model
    delete payload.title;
    delete payload.enabled;
    delete payload.category;
    delete payload.scope;
    delete payload.sensitivityLevel;
    delete payload.trigger;
    delete payload.conditionGroups;
    delete payload.cooldownFrequency;
    delete payload.exceptionHandling;
    delete payload.successCount;
    delete payload.failureCount;
    delete payload.timeSavedMinutes;
  } else if (collectionName === 'orders') {
    if (Array.isArray(payload.items) || typeof payload.items === 'object') payload.items = JSON.stringify(payload.items);
  } else if (collectionName === 'supportTickets') {
    if (Array.isArray(payload.messages) || typeof payload.messages === 'object') payload.messages = JSON.stringify(payload.messages);
  } else if (collectionName === 'subjects') {
    if (payload.code) {
      if (!payload.name.includes(payload.code)) {
        payload.name = `${payload.name} (${payload.code})`;
      }
      delete payload.code;
    }
    if (payload.targetGrade !== undefined) payload.targetGrade = parseFloat(payload.targetGrade) || 8;
    if (payload.currentGrade !== undefined) payload.currentGrade = parseFloat(payload.currentGrade) || 0;
    if (payload.progress !== undefined) payload.progress = parseFloat(payload.progress) || 0;
  } else if (collectionName === 'studyAssignments' || collectionName === 'studyTopics') {
    delete payload.weight;
    if (payload.subjectId === '') payload.subjectId = null;
    if (payload.grade !== undefined && payload.grade !== null && payload.grade !== '') {
      payload.grade = parseFloat(payload.grade) || null;
    } else {
      payload.grade = null;
    }
  } else if (collectionName === 'studyExams') {
    if (payload.date && !payload.examDate) payload.examDate = payload.date;
    delete payload.date;
    delete payload.weight;
    if (payload.targetScore !== undefined) payload.targetScore = parseFloat(payload.targetScore) || 8;
    if (payload.actualScore !== undefined && payload.actualScore !== null && payload.actualScore !== '') {
      payload.actualScore = parseFloat(payload.actualScore) || null;
    } else {
      payload.actualScore = null;
    }
  } else if (collectionName === 'studySessions') {
    if (payload.durationMinutes !== undefined) payload.durationMinutes = parseInt(payload.durationMinutes, 10) || 60;
  } else if (collectionName === 'budgets') {
    delete payload.color;
    if (payload.limit !== undefined) payload.limit = parseFloat(payload.limit) || 0;
    if (payload.spent !== undefined) payload.spent = parseFloat(payload.spent) || 0;
  } else if (collectionName === 'debts') {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (!payload.person && payload.counterpart) payload.person = payload.counterpart;
    delete payload.counterpart;
    if (payload.amount !== undefined) payload.amount = parseFloat(payload.amount) || 0;
  }

  // Type coercions
  if (typeof payload.estimatedHours === 'string') payload.estimatedHours = parseFloat(payload.estimatedHours) || 0;
  if (typeof payload.actualHours === 'string') payload.actualHours = parseFloat(payload.actualHours) || 0;
  if (typeof payload.amount === 'string') payload.amount = parseFloat(payload.amount) || 0;
  if (typeof payload.balance === 'string') payload.balance = parseFloat(payload.balance) || 0;
  if (typeof payload.progress === 'string') payload.progress = parseFloat(payload.progress) || 0;
  if (typeof payload.targetAmount === 'string') payload.targetAmount = parseFloat(payload.targetAmount) || 0;
  if (typeof payload.currentAmount === 'string') payload.currentAmount = parseFloat(payload.currentAmount) || 0;
  if (typeof payload.targetValue === 'string') payload.targetValue = parseFloat(payload.targetValue) || 0;
  if (typeof payload.currentValue === 'string') payload.currentValue = parseFloat(payload.currentValue) || 0;
  if (typeof payload.limit === 'string') payload.limit = parseFloat(payload.limit) || 0;
  if (typeof payload.spent === 'string') payload.spent = parseFloat(payload.spent) || 0;
  if (typeof payload.subtotal === 'string') payload.subtotal = parseFloat(payload.subtotal) || 0;
  if (typeof payload.total === 'string') payload.total = parseFloat(payload.total) || 0;

  return payload;
}

// Helper to deserialize JSON strings back to arrays/objects for frontend consumers
function formatOutgoingData(collectionName: string, item: any) {
  if (!item) return null;
  const record = { ...item };

  if (collectionName === 'decisions') {
    try { record.options = JSON.parse(record.options || '[]'); } catch (e) { record.options = []; }
    try { record.criteria = JSON.parse(record.criteria || '[]'); } catch (e) { record.criteria = []; }
    try { record.risks = JSON.parse(record.risks || '[]'); } catch (e) { record.risks = []; }
    try {
      const parsedScenarios = JSON.parse(record.scenarios || '{}');
      if (parsedScenarios && typeof parsedScenarios === 'object' && !Array.isArray(parsedScenarios)) {
        record.constraints = parsedScenarios.constraints || [];
        record.threshold = parsedScenarios.threshold || 'Standard';
        record.deadline = parsedScenarios.deadline || null;
        record.createdTaskId = parsedScenarios.createdTaskId || null;
        record.opportunityCosts = parsedScenarios.opportunityCosts || [];
        record.review = parsedScenarios.review || null;
        record.whyReason = parsedScenarios.whyReason || null;
        record.tags = parsedScenarios.tags || [];
        record.owner = parsedScenarios.owner || null;
        record.goalId = parsedScenarios.goalId || null;
        record.projectId = parsedScenarios.projectId || null;
        record.history = parsedScenarios.history || [];
        record.decisionNotes = parsedScenarios.decisionNotes || null;
        record.scenarios = parsedScenarios.rawScenarios || [];
      } else if (Array.isArray(parsedScenarios)) {
        record.scenarios = parsedScenarios;
        record.constraints = [];
        record.threshold = 'Standard';
      }
    } catch (e) {
      record.scenarios = [];
      record.constraints = [];
      record.threshold = 'Standard';
    }

    record.problemStatement = record.problem || record.problemStatement || '';
    if (!record.problem) record.problem = record.problemStatement;
  } else if (collectionName === 'habits') {
    try { record.completedDates = JSON.parse(record.completedDates || '[]'); } catch (e) { record.completedDates = []; }
  } else if (collectionName === 'tasks') {
    if (record.tags) {
      try {
        record.tags = JSON.parse(record.tags);
      } catch (e) {
        if (typeof record.tags === 'string') {
          record.tags = record.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else {
          record.tags = [];
        }
      }
    } else {
      record.tags = [];
    }
    record.recurrence = record.recurring || 'none';
    record.goalId = record.linkedGoalId;

    // Normalize status on output so Kanban, list, and filters always work
    const s = String(record.status || '').trim().toLowerCase();
    if (['done', 'completed', 'hoàn thành', 'đã xong'].includes(s)) {
      record.status = 'Hoàn thành';
    } else if (['to do', 'todo', 'to-do', 'to_do', 'chưa làm', 'cần làm'].includes(s)) {
      record.status = 'Chưa làm';
    } else if (['in progress', 'in_progress', 'doing', 'đang làm'].includes(s)) {
      record.status = 'Đang làm';
    } else if (['blocked', 'đang chờ', 'đã hoãn', 'deferred', 'kế hoạch', 'waiting'].includes(s)) {
      record.status = 'Đang chờ';
    } else if (['cancelled', 'canceled', 'hủy'].includes(s)) {
      record.status = 'Hủy';
    }

    // Normalize priority on output
    const p = String(record.priority || '').trim();
    if (p === 'High' || p === 'high' || p === 'Urgent' || p === 'urgent') {
      record.priority = 'Cao';
    } else if (p === 'Critical' || p === 'critical') {
      record.priority = 'Nghiêm trọng';
    } else if (p === 'Medium' || p === 'medium' || p === 'normal') {
      record.priority = 'Trung bình';
    } else if (p === 'Low' || p === 'low') {
      record.priority = 'Thấp';
    }
  } else if (collectionName === 'notes') {
    try { record.tags = JSON.parse(record.tags || '[]'); } catch (e) { record.tags = []; }
  } else if (collectionName === 'automationRules' || collectionName === 'decisionRules') {
    record.title = record.name;
    record.enabled = record.active;
    record.category = record.module;
    try { record.conditions = JSON.parse(record.conditions || '[]'); } catch (e) { record.conditions = []; }
    try { record.actions = JSON.parse(record.actions || '[]'); } catch (e) { record.actions = []; }
    record.conditionGroups = record.conditions;
    record.trigger = { type: record.triggerType, targetModule: record.module };
  } else if (collectionName === 'orders') {
    try { record.items = JSON.parse(record.items || '[]'); } catch (e) { record.items = []; }
  } else if (collectionName === 'supportTickets') {
    try { record.messages = JSON.parse(record.messages || '[]'); } catch (e) { record.messages = []; }
  } else if (collectionName === 'habitRecords') {
    if (record.status === undefined) {
      record.status = record.completed ? 'Completed' : 'Skipped';
    }
  }

  return record;
}

export const dbService = {
  // ==========================================
  // USERS & IDENTITY
  // ==========================================
  async findUserByEmail(email: string) {
    const prisma = getPrisma();
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
    } catch (e: any) {
      console.warn('findUserByEmail warning:', e.message);
      return null;
    }
  },

  async findUserByEmailOrUsername(identifier: string) {
    const prisma = getPrisma();
    const clean = identifier.toLowerCase().trim();
    try {
      const userByEmail = await prisma.user.findUnique({
        where: { email: clean }
      });
      if (userByEmail) return userByEmail;

      return await prisma.user.findFirst({
        where: {
          OR: [
            { username: clean },
            { email: { contains: clean, mode: 'insensitive' } }
          ]
        }
      });
    } catch (e: any) {
      console.warn('findUserByEmailOrUsername warning:', e.message);
      return null;
    }
  },

  async findUserById(id: string) {
    const prisma = getPrisma();
    try {
      return await prisma.user.findUnique({
        where: { id }
      });
    } catch (e: any) {
      console.warn('findUserById warning:', e.message);
      return null;
    }
  },

  async createUser(data: {
    name: string;
    email: string;
    username?: string | null;
    passwordHash: string;
    role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
    plan?: 'FREE' | 'PRO' | 'TEAM';
    status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    avatar?: string | null;
    planExpiresAt?: Date | null;
  }) {
    const prisma = getPrisma();
    return await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        username: data.username ? data.username.toLowerCase().trim() : null,
        passwordHash: data.passwordHash,
        role: data.role || 'USER',
        plan: data.plan || 'FREE',
        status: data.status || 'ACTIVE',
        avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
        planExpiresAt: data.planExpiresAt || null
      }
    });
  },

  async updateUser(id: string, updates: any) {
    const prisma = getPrisma();
    return await prisma.user.update({
      where: { id },
      data: updates
    });
  },

  async getUsers(filters: {
    search?: string;
    role?: string;
    plan?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = getPrisma();
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    if (filters.role && filters.role !== 'All') where.role = filters.role;
    if (filters.plan && filters.plan !== 'All') where.plan = filters.plan;
    if (filters.status && filters.status !== 'All') where.status = filters.status;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          plan: true,
          status: true,
          avatar: true,
          planExpiresAt: true,
          onboardingCompleted: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async countUsers() {
    const prisma = getPrisma();
    return await prisma.user.count();
  },

  // ==========================================
  // SESSIONS & SECURITY
  // ==========================================
  async createSession(userId: string, token: string, expiresAt: Date) {
    const prisma = getPrisma();
    return await prisma.session.create({
      data: { userId, token, expiresAt }
    });
  },

  async findSessionByToken(token: string) {
    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { token } }).catch(() => {});
      return null;
    }
    return session;
  },

  async deleteSession(token: string) {
    const prisma = getPrisma();
    try {
      await prisma.session.delete({ where: { token } });
    } catch (e) {}
  },

  async deleteAllUserSessions(userId: string) {
    const prisma = getPrisma();
    await prisma.session.deleteMany({ where: { userId } });
  },

  async recordLoginAttempt(email: string, success: boolean, reason?: string, ip?: string, userId?: string) {
    const prisma = getPrisma();
    try {
      await prisma.loginAttempt.create({
        data: {
          email: email.toLowerCase().trim(),
          success,
          reason,
          ip: ip || null,
          userId: userId || null
        }
      });
    } catch (e: any) {
      console.warn('Failed to log login attempt:', e?.message || e);
    }
  },

  async getRecentFailedAttempts(email: string, windowMinutes: number = 15): Promise<number> {
    const prisma = getPrisma();
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    try {
      return await prisma.loginAttempt.count({
        where: {
          email: email.toLowerCase().trim(),
          success: false,
          createdAt: { gte: since }
        }
      });
    } catch (e: any) {
      console.warn('getRecentFailedAttempts warning:', e.message);
      return 0;
    }
  },

  async createResetToken(userId: string, token: string, expiresAt: Date) {
    const prisma = getPrisma();
    return await prisma.passwordResetToken.create({
      data: { userId, token, expiresAt }
    });
  },

  async findResetToken(token: string) {
    const prisma = getPrisma();
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return record;
  },

  async markResetTokenUsed(token: string) {
    const prisma = getPrisma();
    return await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });
  },

  // ==========================================
  // GENERIC USER-OWNED COLLECTIONS
  // ==========================================
  async getUserCollection(collectionName: string, userId: string) {
    const delegate = getModelDelegate(collectionName);

    // Habit records belong to Habit which is owned by User
    if (collectionName === 'habitRecords') {
      const items = await delegate.findMany({
        where: {
          habit: { userId }
        },
        orderBy: { createdAt: 'desc' }
      });
      return items.map((item: any) => formatOutgoingData(collectionName, item));
    }

    // Automation executions sort by executedAt
    if (collectionName === 'automationHistory' || collectionName === 'automationConflicts') {
      const items = await delegate.findMany({
        where: { userId },
        orderBy: { executedAt: 'desc' }
      });
      return items.map((item: any) => formatOutgoingData(collectionName, item));
    }

    // Products (SystemTemplates) are active catalog items
    if (collectionName === 'products') {
      const items = await delegate.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      return items.map((item: any) => formatOutgoingData(collectionName, item));
    }

    if (collectionName === 'coupons') {
      const items = await delegate.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return items.map((item: any) => formatOutgoingData(collectionName, item));
    }

    const items = await delegate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return items.map((item: any) => formatOutgoingData(collectionName, item));
  },

  async addItemToUserCollection(collectionName: string, userId: string, rawData: any) {
    const delegate = getModelDelegate(collectionName);

    if (collectionName === 'habitRecords') {
      const prisma = getPrisma();
      if (!rawData.habitId) {
        throw new Error('Thiếu thông tin habitId khi ghi nhận thói quen');
      }
      const habit = await prisma.habit.findFirst({
        where: { id: rawData.habitId, userId }
      });
      if (!habit) {
        throw new Error(`Không tìm thấy thói quen ${rawData.habitId} thuộc về tài khoản này`);
      }
      const payload = formatIncomingData(collectionName, rawData);
      delete payload.userId;
      if (payload.status !== undefined && payload.completed === undefined) {
        payload.completed = payload.status === 'Completed';
      }
      delete payload.status;
      const created = await delegate.create({ data: payload });
      return formatOutgoingData(collectionName, created);
    }

    if (collectionName === 'coupons') {
      const payload = formatIncomingData(collectionName, rawData);
      delete payload.userId;
      const created = await delegate.create({ data: payload });
      return formatOutgoingData(collectionName, created);
    }

    const payload = formatIncomingData(collectionName, {
      ...rawData,
      userId
    });
    delete payload.createdAt;
    delete payload.updatedAt;

    if (collectionName === 'decisions') {
      if (!payload.title) payload.title = 'Chưa đặt tiêu đề';
      if (!payload.problem) payload.problem = payload.title || 'Chưa xác định vấn đề';
      if (!payload.options) payload.options = '[]';
      if (!payload.criteria) payload.criteria = '[]';
      if (!payload.risks) payload.risks = '[]';
      if (!payload.scenarios) payload.scenarios = '{}';
    }

    if (collectionName === 'studyExams' || collectionName === 'studySessions') {
      if (!payload.subjectId) {
        const prisma = getPrisma();
        const firstSub = await prisma.subject.findFirst({ where: { userId } });
        if (firstSub) {
          payload.subjectId = firstSub.id;
        } else {
          const defaultSub = await prisma.subject.create({
            data: { userId, name: 'Môn học chung', color: '#3b82f6' }
          });
          payload.subjectId = defaultSub.id;
        }
      }
    }

    const created = await delegate.create({ data: payload });
    return formatOutgoingData(collectionName, created);
  },

  async updateUserCollectionItem(collectionName: string, userId: string, id: string, rawUpdates: any, userRole?: string) {
    const delegate = getModelDelegate(collectionName);
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

    if (collectionName === 'habitRecords') {
      const existing = isAdmin
        ? await delegate.findUnique({ where: { id } })
        : await delegate.findFirst({
            where: { id, habit: { userId } }
          });
      if (!existing) {
        throw new Error(`Record ${id} not found or you do not have permission to modify it`);
      }
      const payload = formatIncomingData(collectionName, rawUpdates);
      delete payload.id;
      delete payload.userId;
      delete payload.createdAt;
      delete payload.updatedAt;
      if (payload.status !== undefined) {
        payload.completed = payload.status === 'Completed';
        delete payload.status;
      }
      const updated = await delegate.update({
        where: { id },
        data: payload
      });
      return formatOutgoingData(collectionName, updated);
    }
    
    if (collectionName === 'coupons') {
      const payload = formatIncomingData(collectionName, rawUpdates);
      delete payload.id;
      delete payload.userId;
      delete payload.createdAt;
      delete payload.updatedAt;
      const updated = await delegate.update({
        where: { id },
        data: payload
      });
      return formatOutgoingData(collectionName, updated);
    }
    
    // Ownership verification (or Admin override)
    const existing = isAdmin
      ? await delegate.findUnique({ where: { id } })
      : await delegate.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new Error(`Record ${id} not found or you do not have permission to modify it`);
    }

    const payload = formatIncomingData(collectionName, rawUpdates);
    delete payload.id;
    delete payload.userId;
    delete payload.createdAt;
    delete payload.updatedAt;

    const updated = await delegate.update({
      where: { id },
      data: payload
    });
    return formatOutgoingData(collectionName, updated);
  },

  async deleteUserCollectionItem(collectionName: string, userId: string, id: string, userRole?: string) {
    const delegate = getModelDelegate(collectionName);
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

    if (collectionName === 'habitRecords') {
      const existing = isAdmin
        ? await delegate.findUnique({ where: { id } })
        : await delegate.findFirst({
            where: { id, habit: { userId } }
          });
      if (!existing) {
        const anyRecord = await delegate.findUnique({ where: { id } });
        if (!anyRecord) return null; // Idempotent delete
        throw new Error(`Record ${id} not found or you do not have permission to delete it`);
      }
      return await delegate.delete({ where: { id } });
    }

    if (collectionName === 'coupons') {
      return await delegate.delete({ where: { id } });
    }

    // Ownership verification (or Admin override)
    const existing = isAdmin
      ? await delegate.findUnique({ where: { id } })
      : await delegate.findFirst({ where: { id, userId } });
    if (!existing) {
      const anyRecord = await delegate.findUnique({ where: { id } });
      if (!anyRecord) return null; // Idempotent delete if already gone
      throw new Error(`Record ${id} not found or you do not have permission to delete it`);
    }

    return await delegate.delete({ where: { id } });
  },

  // ==========================================
  // FINANCE TRANSACTIONS (ATOMIC ACID GUARANTEE)
  // ==========================================
  async executeFinanceTransaction(userId: string, txData: {
    type: 'Thu nhập' | 'Chi tiêu' | 'Chuyển tiền';
    amount: number;
    accountId: string;
    toAccountId?: string;
    category?: string;
    date: string;
    note?: string;
  }) {
    if (!txData.amount || txData.amount <= 0) {
      throw new Error('Số tiền giao dịch phải lớn hơn 0');
    }

    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      // 1. Validate source account ownership
      const sourceAcc = await tx.financeAccount.findFirst({
        where: { id: txData.accountId, userId }
      });
      if (!sourceAcc) throw new Error('Tài khoản nguồn không tồn tại hoặc không thuộc về bạn');

      // 2. Compute new source balance
      let newSourceBalance = sourceAcc.balance;
      if (txData.type === 'Thu nhập') {
        newSourceBalance += txData.amount;
      } else if (txData.type === 'Chi tiêu' || txData.type === 'Chuyển tiền') {
        newSourceBalance -= txData.amount;
      }

      await tx.financeAccount.update({
        where: { id: sourceAcc.id },
        data: { balance: newSourceBalance }
      });

      // 3. Handle Transfer destination account
      if (txData.type === 'Chuyển tiền') {
        if (!txData.toAccountId) {
          throw new Error('Giao dịch chuyển tiền yêu cầu chọn tài khoản đích');
        }
        if (txData.toAccountId === txData.accountId) {
          throw new Error('Tài khoản đích không được trùng với tài khoản nguồn');
        }

        const destAcc = await tx.financeAccount.findFirst({
          where: { id: txData.toAccountId, userId }
        });
        if (!destAcc) throw new Error('Tài khoản đích không tồn tại hoặc không thuộc về bạn');

        await tx.financeAccount.update({
          where: { id: destAcc.id },
          data: { balance: destAcc.balance + txData.amount }
        });
      }

      // 4. Update related Budget if expense
      if (txData.type === 'Chi tiêu' && txData.category) {
        const matchingBudget = await tx.budget.findFirst({
          where: { userId, category: txData.category }
        });
        if (matchingBudget) {
          await tx.budget.update({
            where: { id: matchingBudget.id },
            data: { spent: matchingBudget.spent + txData.amount }
          });
        }
      }

      // 5. Create transaction record
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          accountId: txData.accountId,
          toAccountId: txData.toAccountId || null,
          amount: txData.amount,
          type: txData.type,
          category: txData.category || 'Chung',
          date: txData.date,
          note: txData.note || null
        }
      });

      return createdTx;
    });
  },

  async deleteFinanceTransaction(userId: string, txId: string) {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: txId, userId }
      });
      if (!transaction) throw new Error('Giao dịch không tồn tại hoặc không thuộc về bạn');

      // Revert source account balance
      const sourceAcc = await tx.financeAccount.findFirst({
        where: { id: transaction.accountId, userId }
      });
      if (sourceAcc) {
        let revertedBalance = sourceAcc.balance;
        if (transaction.type === 'Thu nhập') revertedBalance -= transaction.amount;
        else if (transaction.type === 'Chi tiêu' || transaction.type === 'Chuyển tiền') revertedBalance += transaction.amount;

        await tx.financeAccount.update({
          where: { id: sourceAcc.id },
          data: { balance: revertedBalance }
        });
      }

      // Revert transfer destination account balance
      if (transaction.type === 'Chuyển tiền' && transaction.toAccountId) {
        const destAcc = await tx.financeAccount.findFirst({
          where: { id: transaction.toAccountId, userId }
        });
        if (destAcc) {
          await tx.financeAccount.update({
            where: { id: destAcc.id },
            data: { balance: destAcc.balance - transaction.amount }
          });
        }
      }

      // Revert related budget spent
      if (transaction.type === 'Chi tiêu' && transaction.category) {
        const matchingBudget = await tx.budget.findFirst({
          where: { userId, category: transaction.category }
        });
        if (matchingBudget) {
          await tx.budget.update({
            where: { id: matchingBudget.id },
            data: { spent: Math.max(0, matchingBudget.spent - transaction.amount) }
          });
        }
      }

      await tx.transaction.delete({ where: { id: txId } });
      return { success: true };
    });
  },

  // ==========================================
  // ADMIN DASHBOARD & AUDIT LOGS
  // ==========================================
  async getAdminStats() {
    const prisma = getPrisma();
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTasks,
      totalTransactions,
      totalOrders,
      totalPayments,
      successfulPayments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: { in: ['SUSPENDED', 'DISABLED'] } } }),
      prisma.task.count(),
      prisma.transaction.count(),
      prisma.order.count(),
      prisma.payment.count(),
      prisma.payment.findMany({ where: { status: 'Success' }, select: { amount: true } })
    ]);

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTasks,
      totalTransactions,
      totalOrders,
      totalPayments,
      totalRevenue
    };
  },

  async addAuditLog(data: {
    adminId: string;
    targetUserId?: string | null;
    action: string;
    beforeState?: any;
    afterState?: any;
    reason?: string;
    result?: string;
  }) {
    const prisma = getPrisma();
    return await prisma.auditLog.create({
      data: {
        adminId: data.adminId,
        targetUserId: data.targetUserId || null,
        action: data.action,
        beforeState: data.beforeState ? JSON.stringify(data.beforeState) : null,
        afterState: data.afterState ? JSON.stringify(data.afterState) : null,
        reason: data.reason || null,
        result: data.result || 'Success'
      }
    });
  },

  async getAuditLogs(limit: number = 100) {
    const prisma = getPrisma();
    return await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    });
  },

  // ==========================================
  // PAYMENTS & COMMERCE
  // ==========================================
  async getPayments() {
    const prisma = getPrisma();
    return await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
  },

  async createPayment(paymentData: any) {
    const prisma = getPrisma();
    return await prisma.payment.create({ data: paymentData });
  },

  async updatePaymentStatus(id: string, status: string) {
    const prisma = getPrisma();
    return await prisma.payment.update({
      where: { id },
      data: { status }
    });
  },

  async getCoupons() {
    const prisma = getPrisma();
    return await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  async createCoupon(data: {
    code: string;
    discountPercent: number;
    maxUses?: number;
    expiresAt?: Date | null;
  }) {
    const prisma = getPrisma();
    return await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        discountPercent: data.discountPercent,
        maxUses: data.maxUses || 100,
        expiresAt: data.expiresAt || null
      }
    });
  },

  async getSystemTemplates() {
    const prisma = getPrisma();
    return await prisma.systemTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  async seedTemplates(templates: any[]) {
    const prisma = getPrisma();
    for (const tpl of templates) {
      await prisma.systemTemplate.upsert({
        where: { id: tpl.id },
        update: {
          title: tpl.title,
          description: tpl.description,
          tier: tpl.tier || 'Free',
          category: tpl.category || 'General',
          tags: JSON.stringify(tpl.tags || []),
          author: tpl.author || 'LifeOS Team',
          price: tpl.price || 0,
          isFree: tpl.isFree ?? true
        },
        create: {
          id: tpl.id,
          title: tpl.title,
          description: tpl.description,
          tier: tpl.tier || 'Free',
          category: tpl.category || 'General',
          tags: JSON.stringify(tpl.tags || []),
          author: tpl.author || 'LifeOS Team',
          price: tpl.price || 0,
          isFree: tpl.isFree ?? true
        }
      });
    }
  },

  async createAuditLog(userId: string, action: string, targetCollection?: string, targetId?: string, before?: any, after?: any) {
    const prisma = getPrisma();
    try {
      await prisma.auditLog.create({
        data: {
          adminId: userId,
          targetUserId: targetId || null,
          action,
          beforeState: before ? JSON.stringify(before) : null,
          afterState: after ? JSON.stringify(after) : null,
          reason: targetCollection || null,
          result: 'Success'
        }
      });
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  },

  async getUserSettings(userId: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, avatar: true, onboardingCompleted: true }
    });
    return user || {};
  },

  async updateUserSettings(userId: string, data: any) {
    const prisma = getPrisma();
    const allowed = ['name', 'avatar', 'onboardingCompleted'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    return await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  },

  async clearUserWorkspace(userId: string) {
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.financeAccount.deleteMany({ where: { userId } }),
      prisma.task.deleteMany({ where: { userId } }),
      prisma.calendarEvent.deleteMany({ where: { userId } }),
      prisma.scheduleBlock.deleteMany({ where: { userId } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.habit.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.focusSession.deleteMany({ where: { userId } }),
      prisma.focusGoal.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.savingGoal.deleteMany({ where: { userId } }),
      prisma.debt.deleteMany({ where: { userId } }),
      prisma.subject.deleteMany({ where: { userId } }),
      prisma.studyAssignment.deleteMany({ where: { userId } }),
      prisma.studyExam.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.decision.deleteMany({ where: { userId } }),
      prisma.automationRule.deleteMany({ where: { userId } }),
      prisma.cartItem.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.supportTicket.deleteMany({ where: { userId } })
    ]);
  },

  async seedUserSampleData(userId: string) {
    const prisma = getPrisma();
    const today = new Date().toISOString().split('T')[0];

    // Seed sample account
    let account = await prisma.financeAccount.findFirst({ where: { userId } });
    if (!account) {
      account = await prisma.financeAccount.create({
        data: {
          userId,
          name: 'Tài khoản chính (Vietcombank)',
          type: 'Ngân hàng',
          balance: 25000000,
          currency: 'VND',
          color: '#10b981'
        }
      });
    }

    // Seed sample project
    const project = await prisma.project.create({
      data: {
        userId,
        name: 'Dự án Nâng cấp Hệ thống',
        description: 'Tối ưu hóa năng suất và hiệu quả cá nhân cùng LifeOS',
        status: 'Đang làm',
        health: 'Tốt',
        progress: 35
      }
    });

    // Seed sample tasks
    await prisma.task.createMany({
      data: [
        {
          userId,
          projectId: project.id,
          title: 'Thiết lập quy trình làm việc mỗi sáng',
          description: 'Lên danh sách việc cần làm và phân bổ thời gian Deep Work',
          status: 'Done',
          priority: 'High',
          dueDate: today,
          estimatedHours: 1,
          actualHours: 1
        },
        {
          userId,
          projectId: project.id,
          title: 'Xem xét báo cáo tài chính tháng này',
          description: 'Đối chiếu thu chi và cân đối ngân sách tiết kiệm',
          status: 'To Do',
          priority: 'Medium',
          dueDate: today,
          estimatedHours: 2,
          actualHours: 0
        }
      ]
    });

    // Seed sample habit
    await prisma.habit.create({
      data: {
        userId,
        name: 'Đọc sách 30 phút',
        category: 'Personal',
        streak: 5,
        target: 1,
        completedDates: JSON.stringify([today])
      }
    });

    // Seed sample calendar event
    await prisma.calendarEvent.create({
      data: {
        userId,
        title: 'Họp chiến lược & Kế hoạch tuần',
        date: today,
        startTime: '09:00',
        endTime: '10:30',
        type: 'Công việc',
        status: 'Đã lên lịch',
        color: '#3b82f6'
      }
    });
  },

  async setupUserPersonalizedWorkspace(userId: string, selections: {
    purpose?: string;
    domain?: string;
    focus?: string[];
    schedule?: string;
    budget?: string;
  }) {
    const prisma = getPrisma();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const domain = selections.domain || 'worker';
    const focusList = Array.isArray(selections.focus) ? selections.focus : [];
    const schedule = selections.schedule || 'Sáng (6:00 - 11:00)';
    const budgetStr = selections.budget || '5.000.000đ - 10.000.000đ';

    // 1. Calculate Monthly Target Budget
    let targetMonthly = 8000000;
    if (budgetStr.includes('Dưới 5')) targetMonthly = 4500000;
    else if (budgetStr.includes('5.000.000')) targetMonthly = 8000000;
    else if (budgetStr.includes('10.000.000')) targetMonthly = 15000000;
    else if (budgetStr.includes('Trên 20')) targetMonthly = 25000000;

    // FUNC-003 FIX: Prevent accidental deletion of user data if onboarding was already completed
    const userState = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true }
    });
    if (userState?.onboardingCompleted && !(selections as any).forceReset) {
      throw new Error('Không gian làm việc của bạn đã được thiết lập. Hãy dùng tính năng làm sạch không gian làm việc nếu bạn thực sự muốn đặt lại từ đầu.');
    }

    // 2. Clear any preexisting empty template data for this user
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { userId } }),
      prisma.calendarEvent.deleteMany({ where: { userId } }),
      prisma.scheduleBlock.deleteMany({ where: { userId } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.habit.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.focusGoal.deleteMany({ where: { userId } }),
      prisma.financeAccount.deleteMany({ where: { userId } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.subject.deleteMany({ where: { userId } })
    ]);

    // 3. Create Tailored Finance Accounts & Budgets (Start with 0 balance)
    const mainAccount = await prisma.financeAccount.create({
      data: {
        userId,
        name: 'Ví Chi tiêu Chính',
        type: 'Tiền mặt',
        balance: 0,
        currency: 'VND',
        color: '#10b981'
      }
    });

    await prisma.financeAccount.create({
      data: {
        userId,
        name: 'Tài khoản Ngân hàng & Dự phòng',
        type: 'Ngân hàng',
        balance: 0,
        currency: 'VND',
        color: '#3b82f6'
      }
    });

    // Create 4 standard 50/30/20 category budgets
    await prisma.budget.createMany({
      data: [
        {
          userId,
          category: 'Ăn uống & Sinh hoạt',
          limit: Math.round(targetMonthly * 0.45),
          period: 'monthly',
          spent: 0
        },
        {
          userId,
          category: 'Học tập & Phát triển',
          limit: Math.round(targetMonthly * 0.25),
          period: 'monthly',
          spent: 0
        },
        {
          userId,
          category: 'Quỹ Tiết kiệm & Đầu tư',
          limit: Math.round(targetMonthly * 0.20),
          period: 'monthly',
          spent: 0
        },
        {
          userId,
          category: 'Giải trí & Mua sắm',
          limit: Math.round(targetMonthly * 0.10),
          period: 'monthly',
          spent: 0
        }
      ]
    });

    // 4. Create Tailored Project & Tasks based on Domain
    let projectName = 'Dự án Công việc & Tối ưu Năng suất';
    let projectColor = '#0ea5e9';
    let domainTasks: Array<{ title: string; priority: string; status: string; dueDate?: string }> = [];

    if (domain === 'student') {
      projectName = 'Kế hoạch Học tập & Phát triển Kỹ năng';
      projectColor = '#3b82f6';
      domainTasks = [
        {
          title: 'Tổng hợp danh sách giáo trình và tài liệu ôn tập kỳ này',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: tomorrow
        },
        {
          title: 'Lập thời khóa biểu tự học và bài tập lớn tuần này',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: inSevenDays
        },
        {
          title: 'Luyện tập Tiếng Anh chuyên ngành 30 phút mỗi ngày',
          priority: 'Trung bình',
          status: 'Đang làm',
          dueDate: today
        }
      ];

      // Create tailored Subjects
      const mathSub = await prisma.subject.create({
        data: {
          userId,
          name: 'Toán & Tư duy Logic (MATH101)',
          targetGrade: 9.0,
          currentGrade: 8.5,
          progress: 60,
          color: '#3b82f6'
        }
      });

      await prisma.subject.create({
        data: {
          userId,
          name: 'Tiếng Anh & Giao tiếp (ENG201)',
          targetGrade: 8.5,
          currentGrade: 8.0,
          progress: 50,
          color: '#8b5cf6'
        }
      });

      await prisma.studyAssignment.create({
        data: {
          userId,
          subjectId: mathSub.id,
          title: 'Bài tập nghiên cứu ứng dụng phương pháp giải tích',
          dueDate: inSevenDays,
          status: 'In Progress',
          estimatedHours: 4
        }
      });
    } else if (domain === 'freelancer') {
      projectName = 'Dự án Khách hàng & Phát triển Thương hiệu';
      projectColor = '#8b5cf6';
      domainTasks = [
        {
          title: 'Chuẩn bị bản báo giá và hợp đồng cho khách hàng mới',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: tomorrow
        },
        {
          title: 'Lên lịch nội dung truyền thông và cập nhật portfolio cá nhân',
          priority: 'Trung bình',
          status: 'Đang làm',
          dueDate: inSevenDays
        },
        {
          title: 'Gửi sản phẩm nghiệm thu giai đoạn 1 và đối soát thanh toán',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: inSevenDays
        }
      ];
    } else {
      // Default: worker
      projectName = 'Dự án Công việc & Tối ưu Năng suất';
      projectColor = '#0ea5e9';
      domainTasks = [
        {
          title: 'Lập kế hoạch mục tiêu quý (OKR) và đầu việc ưu tiên tuần này',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: tomorrow
        },
        {
          title: 'Tối ưu hóa quy trình làm việc hàng ngày & checklist bàn giao',
          priority: 'Trung bình',
          status: 'Đang làm',
          dueDate: inSevenDays
        },
        {
          title: 'Tổng hợp báo cáo tuần và đề xuất cải tiến công việc',
          priority: 'Cao',
          status: 'Chưa làm',
          dueDate: inSevenDays
        }
      ];
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: projectName,
        description: `Không gian quản lý trọng tâm được cá nhân hóa tự động theo vai trò ${domain === 'student' ? 'Học sinh/Sinh viên' : domain === 'freelancer' ? 'Freelancer/Creator' : 'Người đi làm'}.`,
        status: 'Đang làm',
        health: 'Tốt',
        progress: 20,
        color: projectColor,
        startDate: today,
        deadline: inSevenDays
      }
    });

    for (const t of domainTasks) {
      await prisma.task.create({
        data: {
          userId,
          projectId: project.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          estimatedHours: 2,
          actualHours: 0
        }
      });
    }

    // 5. Create Tailored Habits & Goals based on 'focus'
    const habitsToCreate: Array<{ name: string; category: string; target: number; unitLabel: string }> = [];
    const goalsToCreate: Array<{ title: string; category: string; targetValue: number; currentValue: number }> = [];

    // Focus mapping
    const hasTimeMgmt = focusList.some(f => f.includes('thời gian') || f.includes('Giảm tải'));
    const hasExpense = focusList.some(f => f.includes('chi tiêu') || f.includes('thu nhập'));
    const hasHabit = focusList.some(f => f.includes('thói quen'));
    const hasBalance = focusList.some(f => f.includes('Cân bằng'));
    const hasScore = focusList.some(f => f.includes('điểm cao'));

    if (hasTimeMgmt) {
      habitsToCreate.push({
        name: 'Lập danh sách 3 việc quan trọng nhất ngày (MIT)',
        category: 'Năng suất',
        target: 1,
        unitLabel: 'lần'
      });
      await prisma.focusGoal.create({
        data: {
          userId,
          type: 'daily',
          targetHours: 2.5,
          startDate: today
        }
      });
    }

    if (hasExpense) {
      habitsToCreate.push({
        name: 'Ghi chép và đối soát mọi khoản chi trong ngày',
        category: 'Tài chính',
        target: 1,
        unitLabel: 'lần'
      });
      goalsToCreate.push({
        title: 'Tích lũy Quỹ Dự phòng Khẩn cấp 3 Tháng',
        category: 'Tài chính',
        targetValue: targetMonthly * 3,
        currentValue: Math.round(targetMonthly * 0.5)
      });
    }

    if (hasHabit) {
      habitsToCreate.push({
        name: 'Uống đủ 2 lít nước mỗi ngày',
        category: 'Sức khỏe',
        target: 2000,
        unitLabel: 'ml'
      });
      habitsToCreate.push({
        name: 'Tập thể dục / Vận động 20 phút',
        category: 'Sức khỏe',
        target: 20,
        unitLabel: 'phút'
      });
    }

    if (hasBalance) {
      habitsToCreate.push({
        name: 'Tắt màn hình & Đi ngủ trước 23:00',
        category: 'Đời sống',
        target: 1,
        unitLabel: 'lần'
      });
      habitsToCreate.push({
        name: 'Dành 15 phút đọc sách / tĩnh tâm cuối ngày',
        category: 'Đời sống',
        target: 15,
        unitLabel: 'phút'
      });
    }

    if (hasScore) {
      goalsToCreate.push({
        title: 'Đạt thành tích học tập xuất sắc toàn khóa kỳ này',
        category: 'Học tập',
        targetValue: 100,
        currentValue: 35
      });
    }

    // Default fallbacks if empty
    if (habitsToCreate.length === 0) {
      habitsToCreate.push({
        name: 'Uống đủ 2 lít nước mỗi ngày',
        category: 'Sức khỏe',
        target: 2000,
        unitLabel: 'ml'
      });
      habitsToCreate.push({
        name: 'Tổng kết ngày và chuẩn bị cho ngày mai',
        category: 'Năng suất',
        target: 1,
        unitLabel: 'lần'
      });
    }

    if (goalsToCreate.length === 0) {
      goalsToCreate.push({
        title: 'Hoàn thành 100% mục tiêu quý và duy trì kỷ luật cá nhân',
        category: 'Cá nhân',
        targetValue: 100,
        currentValue: 20
      });
    }

    for (const h of habitsToCreate) {
      await prisma.habit.create({
        data: {
          userId,
          name: h.name,
          category: h.category,
          target: h.target,
          unitLabel: h.unitLabel,
          streak: 0,
          bestStreak: 0,
          status: 'Active',
          completedDates: JSON.stringify([])
        }
      });
    }

    for (const g of goalsToCreate) {
      await prisma.goal.create({
        data: {
          userId,
          title: g.title,
          category: g.category,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          progress: Math.round((g.currentValue / g.targetValue) * 100),
          status: 'In Progress',
          tier: 'Tier 1',
          deadline: inSevenDays
        }
      });
    }

    // 6. Create Calendar Event and Schedule Block based on 'schedule'
    let eventTitle = 'Khung giờ Tập trung Buổi sáng & Khởi động Ngày mới';
    let eventStart = '07:30';
    let eventEnd = '09:00';
    let eventColor = '#3b82f6';
    let blockCategory = 'Deep Work';

    if (schedule.includes('Chiều')) {
      eventTitle = 'Khung giờ Xử lý Công việc & Học tập Buổi chiều';
      eventStart = '14:00';
      eventEnd = '16:00';
      eventColor = '#0ea5e9';
    } else if (schedule.includes('Tối')) {
      eventTitle = 'Khung giờ Học tập, Đọc sách & Phát triển Bản thân';
      eventStart = '19:30';
      eventEnd = '21:00';
      eventColor = '#8b5cf6';
    } else if (schedule.includes('Đêm')) {
      eventTitle = 'Khung giờ Tĩnh lặng, Lập Kế hoạch & Tổng kết Ngày';
      eventStart = '22:15';
      eventEnd = '23:00';
      eventColor = '#6366f1';
      blockCategory = 'Review';
    }

    await prisma.calendarEvent.create({
      data: {
        userId,
        title: eventTitle,
        description: `Lịch biểu được khởi tạo tự động theo khung giờ rảnh bạn đã chọn (${schedule}).`,
        date: today,
        startTime: eventStart,
        endTime: eventEnd,
        type: 'Tập trung',
        status: 'Đã lên lịch',
        color: eventColor
      }
    });

    await prisma.scheduleBlock.create({
      data: {
        userId,
        date: today,
        startTime: eventStart,
        endTime: eventEnd,
        label: eventTitle,
        category: blockCategory
      }
    });

    // 7. Create Personalized Welcome Note
    const domainLabel = domain === 'student' ? 'Học sinh / Sinh viên' : domain === 'freelancer' ? 'Freelancer / Creator' : 'Người đi làm';
    await prisma.note.create({
      data: {
        userId,
        title: `Chào mừng bạn đến với LifeOS - Lộ trình khởi động cho ${domainLabel}`,
        content: `### Xin chào!\n\nHệ thống LifeOS của bạn đã được thiết lập tự động dựa trên câu trả lời khảo sát ban đầu:\n\n- **Vai trò định hướng:** ${domainLabel}\n- **Khung giờ tập trung lý tưởng:** ${schedule}\n- **Hạn mức ngân sách tháng:** ${targetMonthly.toLocaleString('vi-VN')} đ\n- **Các mục tiêu ưu tiên:** ${focusList.join(', ') || 'Năng suất & Cân bằng'}\n\n#### Các phân hệ đã được chuẩn bị sẵn cho bạn:\n1. **Công việc & Dự án:** Đã tạo dự án *${projectName}* kèm danh sách nhiệm vụ ưu tiên.\n2. **Thói quen & Mục tiêu:** Đã khởi tạo ${habitsToCreate.length} thói quen và mục tiêu theo dõi tương ứng.\n3. **Tài chính:** Đã phân bổ ngân sách 4 danh mục theo công thức 50/30/20 và tạo sẵn Ví chi tiêu.\n4. **Lịch biểu:** Đã thiết lập khung giờ vàng *${eventTitle}* trên lịch.\n\nChúc bạn có những trải nghiệm tuyệt vời cùng LifeOS!`,
        category: 'Hướng dẫn',
        pinned: true,
        tags: JSON.stringify(['LifeOS', 'KhoiDong', domain])
      }
    });

    // 8. Create Welcome Notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Thiết lập không gian thành công!',
        message: `Hệ thống đã tự động cấu hình dự án, ${habitsToCreate.length} thói quen, ngân sách ${targetMonthly.toLocaleString('vi-VN')}đ và lịch biểu theo khảo sát của bạn.`,
        type: 'SUCCESS',
        read: false
      }
    });

    // 9. Update user onboardingCompleted = true
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true }
    });

    return {
      success: true,
      domainLabel,
      projectName,
      tasksCount: domainTasks.length,
      habitsCount: habitsToCreate.length,
      monthlyBudget: targetMonthly,
      schedule
    };
  },

  async exportCollectionToCSV(collectionName: string) {
    const delegate = getModelDelegate(collectionName);
    const items = await delegate.findMany({ take: 1000 });
    if (!items.length) return 'No data';
    const SENSITIVE_FIELDS = new Set(['passwordHash', 'token', 'resetToken', 'salt']);
    const keys = Object.keys(items[0]).filter(k => !SENSITIVE_FIELDS.has(k));
    const header = keys.join(',');
    const rows = items.map((item: any) =>
      keys.map(k => {
        let val = String(item[k] ?? '').replace(/"/g, '""');
        // Prevent CSV formula injection in spreadsheet software
        if (/^[=+\-@\t\r]/.test(val)) {
          val = `'${val}`;
        }
        return `"${val}"`;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }
};
