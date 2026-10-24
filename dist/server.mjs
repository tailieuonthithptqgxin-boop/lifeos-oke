var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/backend/db.ts
var db_exports = {};
__export(db_exports, {
  COLLECTION_TO_MODEL_NAME: () => COLLECTION_TO_MODEL_NAME,
  checkDbConnection: () => checkDbConnection,
  dbService: () => dbService,
  ensureSchemaExtensions: () => ensureSchemaExtensions,
  getPrisma: () => getPrisma,
  sanitizePayloadForModel: () => sanitizePayloadForModel
});
import { PrismaClient, Prisma } from "@prisma/client";
function getPrisma() {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://lifeos_user:secure_password_123@localhost:5432/lifeos_db?schema=public";
    }
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn"] : []
    });
  }
  return prismaClient;
}
async function checkDbConnection() {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  const isProduction2 = process.env.NODE_ENV === "production";
  try {
    const check = await prisma.$queryRaw`
      SELECT 
        to_regclass('public.users') as users_table,
        to_regclass('public.sessions') as sessions_table,
        to_regclass('public.system_settings') as settings_table
    `;
    const row = check && check[0];
    if (!row?.users_table || !row?.sessions_table || !row?.settings_table) {
      if (isProduction2) {
        console.error('\u274C [DATABASE ERROR]: Database schema missing required tables in production. Run "npx prisma migrate deploy" before starting the server.');
        throw new Error('Database schema uninitialized. Run migrations with "prisma migrate deploy".');
      } else {
        console.log("\u26A0\uFE0F [DEV]: Database schema missing or incomplete. Synchronizing development Prisma schema...");
        const { execSync: execSync2 } = await import("child_process");
        execSync2("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });
        console.log("\u2705 Development database schema synchronized.");
      }
    }
  } catch (err) {
    if (isProduction2) {
      throw err;
    }
    if (err.message && (err.message.includes("does not exist") || err.message.includes("relation") || err.code === "P2021")) {
      try {
        console.log("\u26A0\uFE0F [DEV]: Running Prisma schema push to repair missing relations in development...");
        const { execSync: execSync2 } = await import("child_process");
        execSync2("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });
      } catch (pushErr) {
        console.warn("Auto prisma db push attempt warning:", pushErr.message);
      }
    }
  }
  await ensureSchemaExtensions(prisma);
  return true;
}
async function ensureSchemaExtensions(prisma) {
  const statements = [
    'ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "finance_accounts" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3)',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT UNIQUE',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_started_at" TIMESTAMP(3)',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3)',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_used" BOOLEAN NOT NULL DEFAULT false',
    'CREATE INDEX IF NOT EXISTS "idx_users_trial_ends_at" ON "users"("trial_ends_at")',
    `CREATE TABLE IF NOT EXISTS "idempotency_keys" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "user_id" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL,
      "request_hash" TEXT NOT NULL,
      "response_code" INTEGER NOT NULL,
      "response_body" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMP(3) NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS "idx_idempotency_key" ON "idempotency_keys"("key")',
    'CREATE INDEX IF NOT EXISTS "idx_idempotency_user_id" ON "idempotency_keys"("user_id")',
    'CREATE INDEX IF NOT EXISTS "idx_idempotency_expires_at" ON "idempotency_keys"("expires_at")',
    'CREATE INDEX IF NOT EXISTS "idx_tasks_user_deleted" ON "tasks"("userId", "deleted_at")',
    'CREATE INDEX IF NOT EXISTS "idx_transactions_user_deleted" ON "transactions"("userId", "deleted_at")',
    'CREATE INDEX IF NOT EXISTS "idx_transactions_user_date_type" ON "transactions"("userId", "date", "type")',
    'CREATE INDEX IF NOT EXISTS "idx_finance_user_deleted" ON "finance_accounts"("userId", "deleted_at")',
    'CREATE INDEX IF NOT EXISTS "idx_habits_user_deleted" ON "habits"("userId", "deleted_at")',
    'CREATE INDEX IF NOT EXISTS "idx_goals_user_deleted" ON "goals"("userId", "deleted_at")',
    'CREATE INDEX IF NOT EXISTS "idx_notes_user_deleted" ON "notes"("userId", "deleted_at")'
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn(`[Schema Sync Notice] ${sql.substring(0, 40)}...: ${err.message}`);
    }
  }
  console.log("\u2705 C\u01A1 s\u1EDF d\u1EEF li\u1EC7u: Soft Delete columns, Idempotency table v\xE0 Compound Indexes \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u1ED3ng b\u1ED9 h\xF3a.");
}
function getModelDelegate(collectionName) {
  const prisma = getPrisma();
  const mapping = {
    tasks: "task",
    projects: "project",
    goals: "goal",
    habits: "habit",
    notes: "note",
    events: "calendarEvent",
    calendarEvents: "calendarEvent",
    routines: "scheduleBlock",
    scheduleBlocks: "scheduleBlock",
    reminders: "reminder",
    focusSessions: "focusSession",
    focusGoals: "focusGoal",
    financeAccounts: "financeAccount",
    transactions: "transaction",
    budgets: "budget",
    savingGoals: "savingGoal",
    debts: "debt",
    recurringTransactions: "recurringTransaction",
    subjects: "subject",
    studyTopics: "studyAssignment",
    studyAssignments: "studyAssignment",
    studyExams: "studyExam",
    studySessions: "studySession",
    habitRecords: "habitLog",
    decisions: "decision",
    decisionRules: "automationRule",
    automationRules: "automationRule",
    automationHistory: "automationExecution",
    automationConflicts: "automationExecution",
    subscriptions: "subscription",
    cart: "cartItem",
    cartItems: "cartItem",
    orders: "order",
    coupons: "coupon",
    products: "systemTemplate",
    inbox: "supportTicket",
    supportTickets: "supportTicket",
    notifications: "notification"
  };
  const modelKey = mapping[collectionName] || collectionName;
  const delegate = prisma[modelKey];
  if (!delegate) {
    throw new Error(`Collection '${collectionName}' does not exist in PostgreSQL schema`);
  }
  return delegate;
}
function sanitizePayloadForModel(collectionName, payload) {
  if (!payload || typeof payload !== "object") return payload;
  const modelName = COLLECTION_TO_MODEL_NAME[collectionName];
  if (!modelName) return payload;
  const validFields = MODEL_SCALAR_FIELDS_MAP[modelName];
  if (!validFields) return payload;
  for (const key of Object.keys(payload)) {
    if (!validFields.has(key)) {
      delete payload[key];
    }
  }
  return payload;
}
function formatIncomingData(collectionName, data) {
  const payload = { ...data };
  delete payload.user;
  delete payload.project;
  delete payload.goal;
  delete payload.account;
  delete payload.subject;
  if (collectionName === "decisions") {
    if (!payload.title && payload.name) payload.title = payload.name;
    if (payload.title) payload.title = String(payload.title).trim();
    if (payload.problemStatement !== void 0 && !payload.problem) {
      payload.problem = String(payload.problemStatement).trim();
    }
    if (payload.problem) {
      payload.problem = String(payload.problem).trim();
    }
    const hasMetaFields = payload.constraints !== void 0 || payload.threshold !== void 0 || payload.deadline !== void 0 || payload.createdTaskId !== void 0 || payload.opportunityCosts !== void 0 || payload.review !== void 0 || payload.whyReason !== void 0 || payload.tags !== void 0 || payload.owner !== void 0 || payload.goalId !== void 0 || payload.projectId !== void 0 || payload.history !== void 0 || payload.decisionNotes !== void 0 || payload.scenarios !== void 0;
    if (hasMetaFields) {
      const meta = {
        constraints: Array.isArray(payload.constraints) ? payload.constraints : payload.constraints ? [payload.constraints] : [],
        threshold: payload.threshold || "Standard",
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
    if (payload.options !== void 0) {
      if (Array.isArray(payload.options) || typeof payload.options === "object" && payload.options !== null) {
        payload.options = JSON.stringify(payload.options);
      }
    }
    if (payload.criteria !== void 0) {
      if (Array.isArray(payload.criteria) || typeof payload.criteria === "object" && payload.criteria !== null) {
        payload.criteria = JSON.stringify(payload.criteria);
      }
    }
    if (payload.risks !== void 0) {
      if (Array.isArray(payload.risks) || typeof payload.risks === "object" && payload.risks !== null) {
        payload.risks = JSON.stringify(payload.risks);
      }
    }
    if (payload.score !== void 0) {
      payload.score = parseFloat(payload.score) || 0;
    }
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
  } else if (collectionName === "habits") {
    if (!payload.name && payload.title) payload.name = payload.title;
    delete payload.title;
    if (Array.isArray(payload.completedDates)) payload.completedDates = JSON.stringify(payload.completedDates);
  } else if (collectionName === "tasks") {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (payload.projectId === "") payload.projectId = null;
    if (payload.linkedGoalId === "") payload.linkedGoalId = null;
    if (payload.goalId && !payload.linkedGoalId) payload.linkedGoalId = payload.goalId;
    delete payload.goalId;
    if (payload.dueDate === "") payload.dueDate = null;
    if (payload.startDate === "") payload.startDate = null;
    if (payload.status) {
      const s = String(payload.status).trim().toLowerCase();
      if (["done", "completed", "ho\xE0n th\xE0nh", "\u0111\xE3 xong"].includes(s)) {
        payload.status = "Ho\xE0n th\xE0nh";
      } else if (["to do", "todo", "to-do", "to_do", "ch\u01B0a l\xE0m", "c\u1EA7n l\xE0m"].includes(s)) {
        payload.status = "Ch\u01B0a l\xE0m";
      } else if (["in progress", "in_progress", "doing", "\u0111ang l\xE0m"].includes(s)) {
        payload.status = "\u0110ang l\xE0m";
      } else if (["blocked", "\u0111ang ch\u1EDD", "\u0111\xE3 ho\xE3n", "deferred", "k\u1EBF ho\u1EA1ch", "waiting"].includes(s)) {
        payload.status = "\u0110ang ch\u1EDD";
      } else if (["cancelled", "canceled", "h\u1EE7y"].includes(s)) {
        payload.status = "H\u1EE7y";
      }
    }
    if (payload.priority) {
      const p = String(payload.priority).trim();
      if (p === "High" || p === "high" || p === "Urgent" || p === "urgent") {
        payload.priority = "Cao";
      } else if (p === "Critical" || p === "critical") {
        payload.priority = "Nghi\xEAm tr\u1ECDng";
      } else if (p === "Medium" || p === "medium" || p === "normal") {
        payload.priority = "Trung b\xECnh";
      } else if (p === "Low" || p === "low") {
        payload.priority = "Th\u1EA5p";
      }
    }
    if (payload.recurrence !== void 0) {
      if (!payload.recurring) payload.recurring = String(payload.recurrence);
      delete payload.recurrence;
    }
    if (Array.isArray(payload.tags) || typeof payload.tags === "object" && payload.tags !== null) {
      payload.tags = JSON.stringify(payload.tags);
    } else if (typeof payload.tags === "string" && !payload.tags.startsWith("[")) {
      const arr = payload.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
      payload.tags = JSON.stringify(arr);
    }
    if (payload.notes && typeof payload.notes === "string" && payload.notes.trim()) {
      const cleanNotes = payload.notes.trim();
      if (!payload.description) {
        payload.description = cleanNotes;
      } else if (!payload.description.includes(cleanNotes)) {
        payload.description = `${payload.description}

[Ghi ch\xFA]: ${cleanNotes}`;
      }
    }
    delete payload.notes;
    if (payload.estimatedHours !== void 0) {
      payload.estimatedHours = Number(payload.estimatedHours) || 0;
    }
    if (payload.actualHours !== void 0) {
      payload.actualHours = Number(payload.actualHours) || 0;
    }
    const VALID_TASK_FIELDS = /* @__PURE__ */ new Set([
      "id",
      "userId",
      "projectId",
      "linkedGoalId",
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "startDate",
      "estimatedHours",
      "actualHours",
      "tags",
      "recurring"
    ]);
    for (const key of Object.keys(payload)) {
      if (!VALID_TASK_FIELDS.has(key)) {
        delete payload[key];
      }
    }
  } else if (collectionName === "projects") {
    if (!payload.name && payload.title) payload.name = payload.title;
    delete payload.title;
    delete payload.category;
    delete payload.priority;
  } else if (collectionName === "goals") {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (payload.target !== void 0 && payload.targetValue === void 0) {
      payload.targetValue = Number(payload.target) || 100;
    }
    delete payload.target;
  } else if (collectionName === "focusGoals") {
    if (payload.targetHours !== void 0) payload.targetHours = parseFloat(payload.targetHours) || 3;
    else if (payload.target !== void 0) payload.targetHours = parseFloat(payload.target) || 3;
    delete payload.target;
    delete payload.title;
    delete payload.name;
    const VALID_FOCUS_GOAL_FIELDS = /* @__PURE__ */ new Set([
      "id",
      "userId",
      "type",
      "targetHours",
      "startDate",
      "createdAt",
      "updatedAt"
    ]);
    for (const key of Object.keys(payload)) {
      if (!VALID_FOCUS_GOAL_FIELDS.has(key)) {
        delete payload[key];
      }
    }
  } else if (collectionName === "savingGoals") {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    delete payload.category;
  } else if (collectionName === "notes") {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (Array.isArray(payload.tags)) payload.tags = JSON.stringify(payload.tags);
  } else if (collectionName === "automationRules" || collectionName === "decisionRules") {
    if (!payload.name) {
      payload.name = payload.title || payload.id || "Quy t\u1EAFc t\u1EF1 \u0111\u1ED9ng";
    }
    if (!payload.triggerType) {
      if (typeof payload.trigger === "string") {
        payload.triggerType = payload.trigger;
      } else if (payload.trigger && typeof payload.trigger === "object" && payload.trigger.type) {
        payload.triggerType = payload.trigger.type;
      } else {
        payload.triggerType = "Manual";
      }
    }
    if (!payload.module) {
      payload.module = payload.category || (payload.trigger && typeof payload.trigger === "object" ? payload.trigger.targetModule : null) || "Tasks";
    }
    if (payload.active === void 0 && payload.enabled !== void 0) {
      payload.active = Boolean(payload.enabled);
    }
    if (payload.active === void 0) {
      payload.active = true;
    }
    const conditionsData = payload.conditions || payload.conditionGroups || [];
    payload.conditions = typeof conditionsData === "string" ? conditionsData : JSON.stringify(conditionsData);
    const actionsData = payload.actions || [];
    payload.actions = typeof actionsData === "string" ? actionsData : JSON.stringify(actionsData);
    if (payload.cooldownMinutes === void 0) {
      if (typeof payload.cooldownFrequency === "string") {
        if (payload.cooldownFrequency.toLowerCase().includes("day")) payload.cooldownMinutes = 1440;
        else if (payload.cooldownFrequency.toLowerCase().includes("hour")) payload.cooldownMinutes = 60;
        else payload.cooldownMinutes = 0;
      } else {
        payload.cooldownMinutes = 0;
      }
    } else {
      payload.cooldownMinutes = parseInt(payload.cooldownMinutes, 10) || 0;
    }
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
  } else if (collectionName === "orders") {
    if (Array.isArray(payload.items) || typeof payload.items === "object") payload.items = JSON.stringify(payload.items);
  } else if (collectionName === "supportTickets") {
    if (Array.isArray(payload.messages) || typeof payload.messages === "object") payload.messages = JSON.stringify(payload.messages);
  } else if (collectionName === "subjects") {
    if (payload.code) {
      if (!payload.name.includes(payload.code)) {
        payload.name = `${payload.name} (${payload.code})`;
      }
    }
    delete payload.code;
    if (payload.targetGrade !== void 0) payload.targetGrade = parseFloat(payload.targetGrade) || 8;
    if (payload.currentGrade !== void 0) payload.currentGrade = parseFloat(payload.currentGrade) || 0;
    if (payload.progress !== void 0) payload.progress = parseFloat(payload.progress) || 0;
  } else if (collectionName === "studyAssignments" || collectionName === "studyTopics") {
    delete payload.weight;
    if (payload.subjectId === "") payload.subjectId = null;
    if (payload.grade !== void 0 && payload.grade !== null && payload.grade !== "") {
      payload.grade = parseFloat(payload.grade) || null;
    } else {
      payload.grade = null;
    }
  } else if (collectionName === "studyExams") {
    if (payload.date && !payload.examDate) payload.examDate = payload.date;
    delete payload.date;
    delete payload.weight;
    if (payload.targetScore !== void 0) payload.targetScore = parseFloat(payload.targetScore) || 8;
    if (payload.actualScore !== void 0 && payload.actualScore !== null && payload.actualScore !== "") {
      payload.actualScore = parseFloat(payload.actualScore) || null;
    } else {
      payload.actualScore = null;
    }
  } else if (collectionName === "focusSessions") {
    if (!payload.title) {
      payload.title = payload.notes || payload.description || "Phi\xEAn t\u1EADp trung";
    }
    if (payload.duration !== void 0) {
      if (payload.plannedDuration === void 0) payload.plannedDuration = parseFloat(payload.duration) || 25;
      if (payload.actualDuration === void 0) payload.actualDuration = parseFloat(payload.duration) || 25;
    }
    if (payload.plannedDuration !== void 0) payload.plannedDuration = parseFloat(payload.plannedDuration) || 25;
    if (payload.actualDuration !== void 0) payload.actualDuration = parseFloat(payload.actualDuration) || 0;
    if (Array.isArray(payload.interruptions) || typeof payload.interruptions === "object" && payload.interruptions !== null) {
      payload.interruptions = JSON.stringify(payload.interruptions);
    }
    const VALID_FOCUS_FIELDS = /* @__PURE__ */ new Set([
      "id",
      "userId",
      "title",
      "mode",
      "status",
      "plannedDuration",
      "actualDuration",
      "startTime",
      "endTime",
      "taskId",
      "notes",
      "reflection",
      "interruptions",
      "createdAt"
    ]);
    for (const key of Object.keys(payload)) {
      if (!VALID_FOCUS_FIELDS.has(key)) {
        delete payload[key];
      }
    }
  } else if (collectionName === "studySessions") {
    if (payload.durationMinutes !== void 0) payload.durationMinutes = parseInt(payload.durationMinutes, 10) || 60;
  } else if (collectionName === "budgets") {
    delete payload.color;
    if (payload.limit !== void 0) payload.limit = parseFloat(payload.limit) || 0;
    if (payload.spent !== void 0) payload.spent = parseFloat(payload.spent) || 0;
  } else if (collectionName === "debts") {
    if (!payload.title && payload.name) payload.title = payload.name;
    delete payload.name;
    if (!payload.person && payload.counterpart) payload.person = payload.counterpart;
    delete payload.counterpart;
    if (payload.amount !== void 0) payload.amount = parseFloat(payload.amount) || 0;
  } else if (collectionName === "transactions") {
    if (payload.projectId) {
      const projNote = `[D\u1EF1 \xE1n]: ${payload.projectId}`;
      if (payload.note && typeof payload.note === "string" && payload.note.trim()) {
        if (!payload.note.includes(payload.projectId)) {
          payload.note = `${payload.note} \xB7 ${projNote}`;
        }
      } else {
        payload.note = projNote;
      }
    }
    delete payload.projectId;
    delete payload.status;
    delete payload.account;
    delete payload.user;
    if (payload.accountId === "") delete payload.accountId;
    if (payload.toAccountId === "") payload.toAccountId = null;
    if (payload.amount !== void 0) payload.amount = parseFloat(payload.amount) || 0;
    const VALID_TX_FIELDS = /* @__PURE__ */ new Set([
      "id",
      "userId",
      "accountId",
      "toAccountId",
      "amount",
      "type",
      "category",
      "date",
      "note"
    ]);
    for (const key of Object.keys(payload)) {
      if (!VALID_TX_FIELDS.has(key)) {
        delete payload[key];
      }
    }
  }
  if (typeof payload.estimatedHours === "string") payload.estimatedHours = parseFloat(payload.estimatedHours) || 0;
  if (typeof payload.actualHours === "string") payload.actualHours = parseFloat(payload.actualHours) || 0;
  if (typeof payload.amount === "string") payload.amount = parseFloat(payload.amount) || 0;
  if (typeof payload.balance === "string") payload.balance = parseFloat(payload.balance) || 0;
  if (typeof payload.progress === "string") payload.progress = parseFloat(payload.progress) || 0;
  if (typeof payload.targetAmount === "string") payload.targetAmount = parseFloat(payload.targetAmount) || 0;
  if (typeof payload.currentAmount === "string") payload.currentAmount = parseFloat(payload.currentAmount) || 0;
  if (typeof payload.targetValue === "string") payload.targetValue = parseFloat(payload.targetValue) || 0;
  if (typeof payload.currentValue === "string") payload.currentValue = parseFloat(payload.currentValue) || 0;
  if (typeof payload.limit === "string") payload.limit = parseFloat(payload.limit) || 0;
  if (typeof payload.spent === "string") payload.spent = parseFloat(payload.spent) || 0;
  if (typeof payload.subtotal === "string") payload.subtotal = parseFloat(payload.subtotal) || 0;
  if (typeof payload.total === "string") payload.total = parseFloat(payload.total) || 0;
  sanitizePayloadForModel(collectionName, payload);
  return payload;
}
function formatOutgoingData(collectionName, item) {
  if (!item) return null;
  const record = { ...item };
  if (collectionName === "decisions") {
    try {
      record.options = JSON.parse(record.options || "[]");
    } catch (e) {
      record.options = [];
    }
    try {
      record.criteria = JSON.parse(record.criteria || "[]");
    } catch (e) {
      record.criteria = [];
    }
    try {
      record.risks = JSON.parse(record.risks || "[]");
    } catch (e) {
      record.risks = [];
    }
    try {
      const parsedScenarios = JSON.parse(record.scenarios || "{}");
      if (parsedScenarios && typeof parsedScenarios === "object" && !Array.isArray(parsedScenarios)) {
        record.constraints = parsedScenarios.constraints || [];
        record.threshold = parsedScenarios.threshold || "Standard";
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
        record.threshold = "Standard";
      }
    } catch (e) {
      record.scenarios = [];
      record.constraints = [];
      record.threshold = "Standard";
    }
    record.problemStatement = record.problem || record.problemStatement || "";
    if (!record.problem) record.problem = record.problemStatement;
  } else if (collectionName === "habits") {
    try {
      record.completedDates = JSON.parse(record.completedDates || "[]");
    } catch (e) {
      record.completedDates = [];
    }
  } else if (collectionName === "tasks") {
    if (record.tags) {
      try {
        record.tags = JSON.parse(record.tags);
      } catch (e) {
        if (typeof record.tags === "string") {
          record.tags = record.tags.split(",").map((t) => t.trim()).filter(Boolean);
        } else {
          record.tags = [];
        }
      }
    } else {
      record.tags = [];
    }
    record.recurrence = record.recurring || "none";
    record.goalId = record.linkedGoalId;
    const s = String(record.status || "").trim().toLowerCase();
    if (["done", "completed", "ho\xE0n th\xE0nh", "\u0111\xE3 xong"].includes(s)) {
      record.status = "Ho\xE0n th\xE0nh";
    } else if (["to do", "todo", "to-do", "to_do", "ch\u01B0a l\xE0m", "c\u1EA7n l\xE0m"].includes(s)) {
      record.status = "Ch\u01B0a l\xE0m";
    } else if (["in progress", "in_progress", "doing", "\u0111ang l\xE0m"].includes(s)) {
      record.status = "\u0110ang l\xE0m";
    } else if (["blocked", "\u0111ang ch\u1EDD", "\u0111\xE3 ho\xE3n", "deferred", "k\u1EBF ho\u1EA1ch", "waiting"].includes(s)) {
      record.status = "\u0110ang ch\u1EDD";
    } else if (["cancelled", "canceled", "h\u1EE7y"].includes(s)) {
      record.status = "H\u1EE7y";
    }
    const p = String(record.priority || "").trim();
    if (p === "High" || p === "high" || p === "Urgent" || p === "urgent") {
      record.priority = "Cao";
    } else if (p === "Critical" || p === "critical") {
      record.priority = "Nghi\xEAm tr\u1ECDng";
    } else if (p === "Medium" || p === "medium" || p === "normal") {
      record.priority = "Trung b\xECnh";
    } else if (p === "Low" || p === "low") {
      record.priority = "Th\u1EA5p";
    }
  } else if (collectionName === "notes") {
    try {
      record.tags = JSON.parse(record.tags || "[]");
    } catch (e) {
      record.tags = [];
    }
  } else if (collectionName === "automationRules" || collectionName === "decisionRules") {
    record.title = record.name;
    record.enabled = record.active;
    record.category = record.module;
    try {
      record.conditions = JSON.parse(record.conditions || "[]");
    } catch (e) {
      record.conditions = [];
    }
    try {
      record.actions = JSON.parse(record.actions || "[]");
    } catch (e) {
      record.actions = [];
    }
    record.conditionGroups = record.conditions;
    record.trigger = { type: record.triggerType, targetModule: record.module };
  } else if (collectionName === "orders") {
    try {
      record.items = JSON.parse(record.items || "[]");
    } catch (e) {
      record.items = [];
    }
  } else if (collectionName === "supportTickets") {
    try {
      record.messages = JSON.parse(record.messages || "[]");
    } catch (e) {
      record.messages = [];
    }
  } else if (collectionName === "habitRecords") {
    if (record.status === void 0) {
      record.status = record.completed ? "Completed" : "Skipped";
    }
  } else if (collectionName === "focusSessions") {
    if (record.interruptions && typeof record.interruptions === "string") {
      try {
        record.interruptions = JSON.parse(record.interruptions);
      } catch (e) {
        record.interruptions = [];
      }
    } else if (!record.interruptions) {
      record.interruptions = [];
    }
  }
  return record;
}
var prismaClient, COLLECTION_TO_MODEL_NAME, MODEL_SCALAR_FIELDS_MAP, dbService;
var init_db = __esm({
  "src/backend/db.ts"() {
    prismaClient = null;
    COLLECTION_TO_MODEL_NAME = {
      tasks: "Task",
      projects: "Project",
      goals: "Goal",
      habits: "Habit",
      notes: "Note",
      events: "CalendarEvent",
      calendarEvents: "CalendarEvent",
      routines: "ScheduleBlock",
      scheduleBlocks: "ScheduleBlock",
      reminders: "Reminder",
      focusSessions: "FocusSession",
      focusGoals: "FocusGoal",
      financeAccounts: "FinanceAccount",
      transactions: "Transaction",
      budgets: "Budget",
      savingGoals: "SavingGoal",
      debts: "Debt",
      recurringTransactions: "RecurringTransaction",
      subjects: "Subject",
      studyTopics: "StudyAssignment",
      studyAssignments: "StudyAssignment",
      studyExams: "StudyExam",
      studySessions: "StudySession",
      habitRecords: "HabitLog",
      decisions: "Decision",
      decisionRules: "AutomationRule",
      automationRules: "AutomationRule",
      automationHistory: "AutomationExecution",
      automationConflicts: "AutomationExecution",
      subscriptions: "Subscription",
      cart: "CartItem",
      cartItems: "CartItem",
      orders: "Order",
      coupons: "Coupon",
      products: "SystemTemplate",
      inbox: "SupportTicket",
      supportTickets: "SupportTicket",
      notifications: "Notification"
    };
    MODEL_SCALAR_FIELDS_MAP = (() => {
      const map = {};
      try {
        const models = Prisma?.dmmf?.datamodel?.models || [];
        for (const m of models) {
          const scalarFields = /* @__PURE__ */ new Set();
          for (const f of m.fields || []) {
            if (!f.relationName) {
              scalarFields.add(f.name);
            }
          }
          map[m.name] = scalarFields;
          map[m.name.toLowerCase()] = scalarFields;
        }
      } catch (err) {
        console.warn("Failed to parse Prisma DMMF models", err);
      }
      return map;
    })();
    dbService = {
      // ==========================================
      // USERS & IDENTITY
      // ==========================================
      async findUserByEmail(email) {
        const prisma = getPrisma();
        try {
          return await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
          });
        } catch (e) {
          console.warn("findUserByEmail warning:", e.message);
          return null;
        }
      },
      async findUserByEmailOrUsername(identifier) {
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
                { email: { contains: clean, mode: "insensitive" } }
              ]
            }
          });
        } catch (e) {
          console.warn("findUserByEmailOrUsername warning:", e.message);
          return null;
        }
      },
      async findUserById(id) {
        const prisma = getPrisma();
        try {
          return await prisma.user.findUnique({
            where: { id }
          });
        } catch (e) {
          console.warn("findUserById warning:", e.message);
          return null;
        }
      },
      async createUser(data) {
        const prisma = getPrisma();
        return await prisma.user.create({
          data: {
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            username: data.username ? data.username.toLowerCase().trim() : null,
            passwordHash: data.passwordHash,
            role: data.role || "USER",
            plan: data.plan || "FREE",
            status: data.status || "ACTIVE",
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
            planExpiresAt: data.planExpiresAt || null,
            googleId: data.googleId || null,
            trialStartedAt: data.trialStartedAt || null,
            trialEndsAt: data.trialEndsAt || null,
            trialUsed: data.trialUsed ?? false
          }
        });
      },
      async updateUser(id, updates) {
        const prisma = getPrisma();
        return await prisma.user.update({
          where: { id },
          data: updates
        });
      },
      async getUsers(filters) {
        const prisma = getPrisma();
        const where = {};
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } }
          ];
        }
        if (filters.role && filters.role !== "All") where.role = filters.role;
        if (filters.plan && filters.plan !== "All") where.plan = filters.plan;
        if (filters.status && filters.status !== "All") where.status = filters.status;
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(100, Math.max(1, filters.limit || 20));
        const [data, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
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
      async createSession(userId, token, expiresAt) {
        const prisma = getPrisma();
        return await prisma.session.create({
          data: { userId, token, expiresAt }
        });
      },
      async findSessionByToken(token) {
        const prisma = getPrisma();
        const session = await prisma.session.findUnique({
          where: { token },
          include: { user: true }
        });
        if (!session) return null;
        if (session.expiresAt.getTime() < Date.now()) {
          await prisma.session.delete({ where: { token } }).catch(() => {
          });
          return null;
        }
        return session;
      },
      async deleteSession(token) {
        const prisma = getPrisma();
        try {
          await prisma.session.delete({ where: { token } });
        } catch (e) {
        }
      },
      async deleteAllUserSessions(userId) {
        const prisma = getPrisma();
        await prisma.session.deleteMany({ where: { userId } });
      },
      async recordLoginAttempt(email, success, reason, ip, userId) {
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
        } catch (e) {
          console.warn("Failed to log login attempt:", e?.message || e);
        }
      },
      async getRecentFailedAttempts(email, windowMinutes = 15) {
        const prisma = getPrisma();
        const since = new Date(Date.now() - windowMinutes * 60 * 1e3);
        try {
          return await prisma.loginAttempt.count({
            where: {
              email: email.toLowerCase().trim(),
              success: false,
              createdAt: { gte: since }
            }
          });
        } catch (e) {
          console.warn("getRecentFailedAttempts warning:", e.message);
          return 0;
        }
      },
      async createResetToken(userId, token, expiresAt) {
        const prisma = getPrisma();
        return await prisma.passwordResetToken.create({
          data: { userId, token, expiresAt }
        });
      },
      async findResetToken(token) {
        const prisma = getPrisma();
        const record = await prisma.passwordResetToken.findUnique({ where: { token } });
        if (!record || record.used || record.expiresAt.getTime() < Date.now()) {
          return null;
        }
        return record;
      },
      async markResetTokenUsed(token) {
        const prisma = getPrisma();
        return await prisma.passwordResetToken.update({
          where: { token },
          data: { used: true }
        });
      },
      // ==========================================
      // GENERIC USER-OWNED COLLECTIONS
      // ==========================================
      async getUserCollection(collectionName, userId) {
        const delegate = getModelDelegate(collectionName);
        if (collectionName === "habitRecords") {
          const items2 = await delegate.findMany({
            where: {
              habit: { userId }
            },
            orderBy: { createdAt: "desc" },
            take: 365
          });
          return items2.map((item) => formatOutgoingData(collectionName, item));
        }
        if (collectionName === "automationHistory" || collectionName === "automationConflicts") {
          const items2 = await delegate.findMany({
            where: { userId },
            orderBy: { executedAt: "desc" },
            take: 100
          });
          return items2.map((item) => formatOutgoingData(collectionName, item));
        }
        if (collectionName === "products") {
          const items2 = await delegate.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" }
          });
          return items2.map((item) => formatOutgoingData(collectionName, item));
        }
        if (collectionName === "coupons") {
          const items2 = await delegate.findMany({
            orderBy: { createdAt: "desc" }
          });
          return items2.map((item) => formatOutgoingData(collectionName, item));
        }
        const isHighVolume = collectionName === "notifications" || collectionName === "inbox";
        const isSoftDeletable = ["tasks", "financeAccounts", "transactions", "habits", "goals", "notes"].includes(collectionName);
        const items = await delegate.findMany({
          where: {
            userId,
            ...isSoftDeletable ? { deletedAt: null } : {}
          },
          orderBy: { createdAt: "desc" },
          ...isHighVolume ? { take: 100 } : {}
        });
        return items.map((item) => formatOutgoingData(collectionName, item));
      },
      async addItemToUserCollection(collectionName, userId, rawData) {
        const delegate = getModelDelegate(collectionName);
        if (collectionName === "habitRecords") {
          const prisma = getPrisma();
          if (!rawData.habitId) {
            throw new Error("Thi\u1EBFu th\xF4ng tin habitId khi ghi nh\u1EADn th\xF3i quen");
          }
          const habit = await prisma.habit.findFirst({
            where: { id: rawData.habitId, userId }
          });
          if (!habit) {
            throw new Error(`Kh\xF4ng t\xECm th\u1EA5y th\xF3i quen ${rawData.habitId} thu\u1ED9c v\u1EC1 t\xE0i kho\u1EA3n n\xE0y`);
          }
          const payload2 = formatIncomingData(collectionName, rawData);
          delete payload2.userId;
          if (payload2.status !== void 0 && payload2.completed === void 0) {
            payload2.completed = payload2.status === "Completed";
          }
          delete payload2.status;
          sanitizePayloadForModel(collectionName, payload2);
          const created2 = await delegate.create({ data: payload2 });
          return formatOutgoingData(collectionName, created2);
        }
        if (collectionName === "coupons") {
          const payload2 = formatIncomingData(collectionName, rawData);
          delete payload2.userId;
          sanitizePayloadForModel(collectionName, payload2);
          const created2 = await delegate.create({ data: payload2 });
          return formatOutgoingData(collectionName, created2);
        }
        const payload = formatIncomingData(collectionName, {
          ...rawData,
          userId
        });
        delete payload.createdAt;
        delete payload.updatedAt;
        if (collectionName === "decisions") {
          if (!payload.title) payload.title = "Ch\u01B0a \u0111\u1EB7t ti\xEAu \u0111\u1EC1";
          if (!payload.problem) payload.problem = payload.title || "Ch\u01B0a x\xE1c \u0111\u1ECBnh v\u1EA5n \u0111\u1EC1";
          if (!payload.options) payload.options = "[]";
          if (!payload.criteria) payload.criteria = "[]";
          if (!payload.risks) payload.risks = "[]";
          if (!payload.scenarios) payload.scenarios = "{}";
        }
        if (collectionName === "studyExams" || collectionName === "studySessions") {
          if (!payload.subjectId) {
            const prisma = getPrisma();
            const firstSub = await prisma.subject.findFirst({ where: { userId } });
            if (firstSub) {
              payload.subjectId = firstSub.id;
            } else {
              const defaultSub = await prisma.subject.create({
                data: { userId, name: "M\xF4n h\u1ECDc chung", color: "#3b82f6" }
              });
              payload.subjectId = defaultSub.id;
            }
          }
        }
        if (collectionName === "transactions") {
          const prisma = getPrisma();
          if (!payload.accountId || payload.accountId === "") {
            const firstAcc = await prisma.financeAccount.findFirst({ where: { userId } });
            if (firstAcc) {
              payload.accountId = firstAcc.id;
            } else {
              const defaultAcc = await prisma.financeAccount.create({
                data: { userId, name: "V\xED Ti\u1EC1n M\u1EB7t", type: "Ti\u1EC1n m\u1EB7t", balance: 0, currency: "VND" }
              });
              payload.accountId = defaultAcc.id;
            }
          }
          if (payload.toAccountId === "") {
            payload.toAccountId = null;
          }
          if (!payload.date) {
            payload.date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          }
          if (!payload.type) {
            payload.type = "Chi ti\xEAu";
          }
          if (!payload.category) {
            payload.category = "Chung";
          }
          const created2 = await this.executeFinanceTransaction(userId, payload);
          return formatOutgoingData(collectionName, created2);
        }
        sanitizePayloadForModel(collectionName, payload);
        const created = await delegate.create({ data: payload });
        return formatOutgoingData(collectionName, created);
      },
      async updateUserCollectionItem(collectionName, userId, id, rawUpdates, userRole) {
        if (!id || id === "undefined" || id === "null" || typeof id !== "string" || !id.trim()) {
          throw new Error(`M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu.`);
        }
        const delegate = getModelDelegate(collectionName);
        const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
        if (collectionName === "habitRecords") {
          const existing2 = isAdmin ? await delegate.findUnique({ where: { id } }) : await delegate.findFirst({
            where: { id, habit: { userId } }
          });
          if (!existing2) {
            throw new Error(`Record ${id} not found or you do not have permission to modify it`);
          }
          const payload2 = formatIncomingData(collectionName, rawUpdates);
          delete payload2.id;
          delete payload2.userId;
          delete payload2.createdAt;
          delete payload2.updatedAt;
          if (payload2.status !== void 0) {
            payload2.completed = payload2.status === "Completed";
            delete payload2.status;
          }
          sanitizePayloadForModel(collectionName, payload2);
          const updated2 = await delegate.update({
            where: { id },
            data: payload2
          });
          return formatOutgoingData(collectionName, updated2);
        }
        if (collectionName === "coupons") {
          const payload2 = formatIncomingData(collectionName, rawUpdates);
          delete payload2.id;
          delete payload2.userId;
          delete payload2.createdAt;
          delete payload2.updatedAt;
          sanitizePayloadForModel(collectionName, payload2);
          const updated2 = await delegate.update({
            where: { id },
            data: payload2
          });
          return formatOutgoingData(collectionName, updated2);
        }
        const existing = isAdmin ? await delegate.findUnique({ where: { id } }) : await delegate.findFirst({ where: { id, userId } });
        if (!existing) {
          throw new Error(`Record ${id} not found or you do not have permission to modify it`);
        }
        const payload = formatIncomingData(collectionName, rawUpdates);
        delete payload.id;
        delete payload.userId;
        delete payload.createdAt;
        delete payload.updatedAt;
        sanitizePayloadForModel(collectionName, payload);
        if (collectionName === "transactions") {
          const prisma = getPrisma();
          const updatedTx = await prisma.$transaction(async (tx) => {
            const oldTx = existing;
            const newPayload = { ...oldTx, ...payload };
            const oldSourceAcc = await tx.financeAccount.findFirst({ where: { id: oldTx.accountId, userId } });
            if (oldSourceAcc) {
              let revertedBalance = oldSourceAcc.balance;
              if (oldTx.type === "Thu nh\u1EADp") revertedBalance -= oldTx.amount;
              else if (oldTx.type === "Chi ti\xEAu" || oldTx.type === "Chuy\u1EC3n ti\u1EC1n") revertedBalance += oldTx.amount;
              await tx.financeAccount.update({ where: { id: oldSourceAcc.id }, data: { balance: revertedBalance } });
            }
            if (oldTx.type === "Chuy\u1EC3n ti\u1EC1n" && oldTx.toAccountId) {
              const oldDestAcc = await tx.financeAccount.findFirst({ where: { id: oldTx.toAccountId, userId } });
              if (oldDestAcc) {
                await tx.financeAccount.update({ where: { id: oldDestAcc.id }, data: { balance: oldDestAcc.balance - oldTx.amount } });
              }
            }
            if (oldTx.type === "Chi ti\xEAu" && oldTx.category) {
              const oldBudget = await tx.budget.findFirst({ where: { userId, category: oldTx.category } });
              if (oldBudget) {
                await tx.budget.update({ where: { id: oldBudget.id }, data: { spent: Math.max(0, oldBudget.spent - oldTx.amount) } });
              }
            }
            const targetAccountId = newPayload.accountId || oldTx.accountId;
            const newSourceAcc = await tx.financeAccount.findFirst({ where: { id: targetAccountId, userId } });
            if (newSourceAcc) {
              let newBalance = newSourceAcc.balance;
              if (newPayload.type === "Thu nh\u1EADp") newBalance += newPayload.amount;
              else if (newPayload.type === "Chi ti\xEAu" || newPayload.type === "Chuy\u1EC3n ti\u1EC1n") newBalance -= newPayload.amount;
              await tx.financeAccount.update({ where: { id: newSourceAcc.id }, data: { balance: newBalance } });
            }
            if (newPayload.type === "Chuy\u1EC3n ti\u1EC1n" && newPayload.toAccountId) {
              const newDestAcc = await tx.financeAccount.findFirst({ where: { id: newPayload.toAccountId, userId } });
              if (newDestAcc) {
                await tx.financeAccount.update({ where: { id: newDestAcc.id }, data: { balance: newDestAcc.balance + newPayload.amount } });
              }
            }
            if (newPayload.type === "Chi ti\xEAu" && newPayload.category) {
              const newBudget = await tx.budget.findFirst({ where: { userId, category: newPayload.category } });
              if (newBudget) {
                await tx.budget.update({ where: { id: newBudget.id }, data: { spent: newBudget.spent + newPayload.amount } });
              }
            }
            return await tx.transaction.update({
              where: { id },
              data: payload
            });
          });
          return formatOutgoingData(collectionName, updatedTx);
        }
        const updated = await delegate.update({
          where: { id },
          data: payload
        });
        return formatOutgoingData(collectionName, updated);
      },
      async deleteUserCollectionItem(collectionName, userId, id, userRole) {
        if (!id || id === "undefined" || id === "null" || typeof id !== "string" || !id.trim()) {
          throw new Error(`M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu.`);
        }
        const delegate = getModelDelegate(collectionName);
        const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
        if (collectionName === "habitRecords") {
          const existing2 = isAdmin ? await delegate.findUnique({ where: { id } }) : await delegate.findFirst({
            where: { id, habit: { userId } }
          });
          if (!existing2) {
            const anyRecord = await delegate.findUnique({ where: { id } });
            if (!anyRecord) return null;
            throw new Error(`Record ${id} not found or you do not have permission to delete it`);
          }
          return await delegate.delete({ where: { id } });
        }
        if (collectionName === "coupons") {
          return await delegate.delete({ where: { id } });
        }
        const existing = isAdmin ? await delegate.findUnique({ where: { id } }) : await delegate.findFirst({ where: { id, userId } });
        if (!existing) {
          const anyRecord = await delegate.findUnique({ where: { id } });
          if (!anyRecord) return null;
          throw new Error(`Record ${id} not found or you do not have permission to delete it`);
        }
        if (collectionName === "transactions") {
          return await this.deleteFinanceTransaction(userId, id);
        }
        if (["tasks", "financeAccounts", "habits", "goals", "notes"].includes(collectionName)) {
          return await delegate.update({
            where: { id },
            data: { deletedAt: /* @__PURE__ */ new Date() }
          });
        }
        return await delegate.delete({ where: { id } });
      },
      // ==========================================
      // FINANCE TRANSACTIONS (ATOMIC ACID GUARANTEE)
      // ==========================================
      async executeFinanceTransaction(userId, txData) {
        if (!txData.amount || txData.amount <= 0) {
          throw new Error("S\u1ED1 ti\u1EC1n giao d\u1ECBch ph\u1EA3i l\u1EDBn h\u01A1n 0");
        }
        const prisma = getPrisma();
        return await prisma.$transaction(async (tx) => {
          const sourceAcc = await tx.financeAccount.findFirst({
            where: { id: txData.accountId, userId }
          });
          if (!sourceAcc) throw new Error("T\xE0i kho\u1EA3n ngu\u1ED3n kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c kh\xF4ng thu\u1ED9c v\u1EC1 b\u1EA1n");
          let newSourceBalance = sourceAcc.balance;
          if (txData.type === "Thu nh\u1EADp") {
            newSourceBalance += txData.amount;
          } else if (txData.type === "Chi ti\xEAu" || txData.type === "Chuy\u1EC3n ti\u1EC1n") {
            newSourceBalance -= txData.amount;
          }
          await tx.financeAccount.update({
            where: { id: sourceAcc.id },
            data: { balance: newSourceBalance }
          });
          if (txData.type === "Chuy\u1EC3n ti\u1EC1n") {
            if (!txData.toAccountId) {
              throw new Error("Giao d\u1ECBch chuy\u1EC3n ti\u1EC1n y\xEAu c\u1EA7u ch\u1ECDn t\xE0i kho\u1EA3n \u0111\xEDch");
            }
            if (txData.toAccountId === txData.accountId) {
              throw new Error("T\xE0i kho\u1EA3n \u0111\xEDch kh\xF4ng \u0111\u01B0\u1EE3c tr\xF9ng v\u1EDBi t\xE0i kho\u1EA3n ngu\u1ED3n");
            }
            const destAcc = await tx.financeAccount.findFirst({
              where: { id: txData.toAccountId, userId }
            });
            if (!destAcc) throw new Error("T\xE0i kho\u1EA3n \u0111\xEDch kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c kh\xF4ng thu\u1ED9c v\u1EC1 b\u1EA1n");
            await tx.financeAccount.update({
              where: { id: destAcc.id },
              data: { balance: destAcc.balance + txData.amount }
            });
          }
          if (txData.type === "Chi ti\xEAu" && txData.category) {
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
          const createdTx = await tx.transaction.create({
            data: {
              userId,
              accountId: txData.accountId,
              toAccountId: txData.toAccountId || null,
              amount: txData.amount,
              type: txData.type,
              category: txData.category || "Chung",
              date: txData.date,
              note: txData.note || null
            }
          });
          return createdTx;
        });
      },
      async deleteFinanceTransaction(userId, txId) {
        const prisma = getPrisma();
        return await prisma.$transaction(async (tx) => {
          const transaction = await tx.transaction.findFirst({
            where: { id: txId, userId }
          });
          if (!transaction) throw new Error("Giao d\u1ECBch kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c kh\xF4ng thu\u1ED9c v\u1EC1 b\u1EA1n");
          const sourceAcc = await tx.financeAccount.findFirst({
            where: { id: transaction.accountId, userId }
          });
          if (sourceAcc) {
            let revertedBalance = sourceAcc.balance;
            if (transaction.type === "Thu nh\u1EADp") revertedBalance -= transaction.amount;
            else if (transaction.type === "Chi ti\xEAu" || transaction.type === "Chuy\u1EC3n ti\u1EC1n") revertedBalance += transaction.amount;
            await tx.financeAccount.update({
              where: { id: sourceAcc.id },
              data: { balance: revertedBalance }
            });
          }
          if (transaction.type === "Chuy\u1EC3n ti\u1EC1n" && transaction.toAccountId) {
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
          if (transaction.type === "Chi ti\xEAu" && transaction.category) {
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
          await tx.transaction.update({
            where: { id: txId },
            data: { deletedAt: /* @__PURE__ */ new Date() }
          });
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
          prisma.user.count({ where: { status: "ACTIVE" } }),
          prisma.user.count({ where: { status: { in: ["SUSPENDED", "DISABLED"] } } }),
          prisma.task.count(),
          prisma.transaction.count(),
          prisma.order.count(),
          prisma.payment.count(),
          prisma.payment.findMany({ where: { status: "Success" }, select: { amount: true } })
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
      async addAuditLog(data) {
        const prisma = getPrisma();
        return await prisma.auditLog.create({
          data: {
            adminId: data.adminId,
            targetUserId: data.targetUserId || null,
            action: data.action,
            beforeState: data.beforeState ? JSON.stringify(data.beforeState) : null,
            afterState: data.afterState ? JSON.stringify(data.afterState) : null,
            reason: data.reason || null,
            result: data.result || "Success"
          }
        });
      },
      async getAuditLogs(limit = 100) {
        const prisma = getPrisma();
        return await prisma.auditLog.findMany({
          take: limit,
          orderBy: { timestamp: "desc" }
        });
      },
      // ==========================================
      // PAYMENTS & COMMERCE
      // ==========================================
      async getPayments() {
        const prisma = getPrisma();
        return await prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } }
        });
      },
      async createPayment(paymentData) {
        const prisma = getPrisma();
        return await prisma.payment.create({ data: paymentData });
      },
      async updatePaymentStatus(id, status) {
        const prisma = getPrisma();
        return await prisma.payment.update({
          where: { id },
          data: { status }
        });
      },
      async getCoupons() {
        const prisma = getPrisma();
        return await prisma.coupon.findMany({
          orderBy: { createdAt: "desc" }
        });
      },
      async createCoupon(data) {
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
          orderBy: { createdAt: "desc" }
        });
      },
      async seedTemplates(templates) {
        const prisma = getPrisma();
        for (const tpl of templates) {
          await prisma.systemTemplate.upsert({
            where: { id: tpl.id },
            update: {
              title: tpl.title,
              description: tpl.description,
              tier: tpl.tier || "Free",
              category: tpl.category || "General",
              tags: JSON.stringify(tpl.tags || []),
              author: tpl.author || "LifeOS Team",
              price: tpl.price || 0,
              isFree: tpl.isFree ?? true
            },
            create: {
              id: tpl.id,
              title: tpl.title,
              description: tpl.description,
              tier: tpl.tier || "Free",
              category: tpl.category || "General",
              tags: JSON.stringify(tpl.tags || []),
              author: tpl.author || "LifeOS Team",
              price: tpl.price || 0,
              isFree: tpl.isFree ?? true
            }
          });
        }
      },
      async createAuditLog(userId, action, targetCollection, targetId, before, after) {
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
              result: "Success"
            }
          });
        } catch (e) {
          console.error("Audit log failed:", e);
        }
      },
      async getUserSettings(userId) {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, avatar: true, onboardingCompleted: true }
        });
        return user || {};
      },
      async updateUserSettings(userId, data) {
        const prisma = getPrisma();
        const allowed = ["name", "avatar", "onboardingCompleted"];
        const updateData = {};
        for (const key of allowed) {
          if (data[key] !== void 0) updateData[key] = data[key];
        }
        return await prisma.user.update({
          where: { id: userId },
          data: updateData
        });
      },
      async clearUserWorkspace(userId) {
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
      async seedUserSampleData(userId) {
        const prisma = getPrisma();
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        let account = await prisma.financeAccount.findFirst({ where: { userId } });
        if (!account) {
          account = await prisma.financeAccount.create({
            data: {
              userId,
              name: "T\xE0i kho\u1EA3n ch\xEDnh (Vietcombank)",
              type: "Ng\xE2n h\xE0ng",
              balance: 25e6,
              currency: "VND",
              color: "#10b981"
            }
          });
        }
        const project = await prisma.project.create({
          data: {
            userId,
            name: "D\u1EF1 \xE1n N\xE2ng c\u1EA5p H\u1EC7 th\u1ED1ng",
            description: "T\u1ED1i \u01B0u h\xF3a n\u0103ng su\u1EA5t v\xE0 hi\u1EC7u qu\u1EA3 c\xE1 nh\xE2n c\xF9ng LifeOS",
            status: "\u0110ang l\xE0m",
            health: "T\u1ED1t",
            progress: 35
          }
        });
        await prisma.task.createMany({
          data: [
            {
              userId,
              projectId: project.id,
              title: "Thi\u1EBFt l\u1EADp quy tr\xECnh l\xE0m vi\u1EC7c m\u1ED7i s\xE1ng",
              description: "L\xEAn danh s\xE1ch vi\u1EC7c c\u1EA7n l\xE0m v\xE0 ph\xE2n b\u1ED5 th\u1EDDi gian Deep Work",
              status: "Done",
              priority: "High",
              dueDate: today,
              estimatedHours: 1,
              actualHours: 1
            },
            {
              userId,
              projectId: project.id,
              title: "Xem x\xE9t b\xE1o c\xE1o t\xE0i ch\xEDnh th\xE1ng n\xE0y",
              description: "\u0110\u1ED1i chi\u1EBFu thu chi v\xE0 c\xE2n \u0111\u1ED1i ng\xE2n s\xE1ch ti\u1EBFt ki\u1EC7m",
              status: "To Do",
              priority: "Medium",
              dueDate: today,
              estimatedHours: 2,
              actualHours: 0
            }
          ]
        });
        await prisma.habit.create({
          data: {
            userId,
            name: "\u0110\u1ECDc s\xE1ch 30 ph\xFAt",
            category: "Personal",
            streak: 5,
            target: 1,
            completedDates: JSON.stringify([today])
          }
        });
        await prisma.calendarEvent.create({
          data: {
            userId,
            title: "H\u1ECDp chi\u1EBFn l\u01B0\u1EE3c & K\u1EBF ho\u1EA1ch tu\u1EA7n",
            date: today,
            startTime: "09:00",
            endTime: "10:30",
            type: "C\xF4ng vi\u1EC7c",
            status: "\u0110\xE3 l\xEAn l\u1ECBch",
            color: "#3b82f6"
          }
        });
      },
      async setupUserPersonalizedWorkspace(userId, selections) {
        const prisma = getPrisma();
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
        const inSevenDays = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
        const domain = selections.domain || "worker";
        const focusList = Array.isArray(selections.focus) ? selections.focus : [];
        const schedule = selections.schedule || "S\xE1ng (6:00 - 11:00)";
        const budgetStr = selections.budget || "5.000.000\u0111 - 10.000.000\u0111";
        let targetMonthly = 8e6;
        if (budgetStr.includes("D\u01B0\u1EDBi 5")) targetMonthly = 45e5;
        else if (budgetStr.includes("5.000.000")) targetMonthly = 8e6;
        else if (budgetStr.includes("10.000.000")) targetMonthly = 15e6;
        else if (budgetStr.includes("Tr\xEAn 20")) targetMonthly = 25e6;
        const userState = await prisma.user.findUnique({
          where: { id: userId },
          select: { onboardingCompleted: true }
        });
        if (userState?.onboardingCompleted && !selections.forceReset) {
          throw new Error("Kh\xF4ng gian l\xE0m vi\u1EC7c c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp. H\xE3y d\xF9ng t\xEDnh n\u0103ng l\xE0m s\u1EA1ch kh\xF4ng gian l\xE0m vi\u1EC7c n\u1EBFu b\u1EA1n th\u1EF1c s\u1EF1 mu\u1ED1n \u0111\u1EB7t l\u1EA1i t\u1EEB \u0111\u1EA7u.");
        }
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
        const mainAccount = await prisma.financeAccount.create({
          data: {
            userId,
            name: "V\xED Chi ti\xEAu Ch\xEDnh",
            type: "Ti\u1EC1n m\u1EB7t",
            balance: 0,
            currency: "VND",
            color: "#10b981"
          }
        });
        await prisma.financeAccount.create({
          data: {
            userId,
            name: "T\xE0i kho\u1EA3n Ng\xE2n h\xE0ng & D\u1EF1 ph\xF2ng",
            type: "Ng\xE2n h\xE0ng",
            balance: 0,
            currency: "VND",
            color: "#3b82f6"
          }
        });
        await prisma.budget.createMany({
          data: [
            {
              userId,
              category: "\u0102n u\u1ED1ng & Sinh ho\u1EA1t",
              limit: Math.round(targetMonthly * 0.45),
              period: "monthly",
              spent: 0
            },
            {
              userId,
              category: "H\u1ECDc t\u1EADp & Ph\xE1t tri\u1EC3n",
              limit: Math.round(targetMonthly * 0.25),
              period: "monthly",
              spent: 0
            },
            {
              userId,
              category: "Qu\u1EF9 Ti\u1EBFt ki\u1EC7m & \u0110\u1EA7u t\u01B0",
              limit: Math.round(targetMonthly * 0.2),
              period: "monthly",
              spent: 0
            },
            {
              userId,
              category: "Gi\u1EA3i tr\xED & Mua s\u1EAFm",
              limit: Math.round(targetMonthly * 0.1),
              period: "monthly",
              spent: 0
            }
          ]
        });
        let projectName = "D\u1EF1 \xE1n C\xF4ng vi\u1EC7c & T\u1ED1i \u01B0u N\u0103ng su\u1EA5t";
        let projectColor = "#0ea5e9";
        let domainTasks = [];
        if (domain === "student") {
          projectName = "K\u1EBF ho\u1EA1ch H\u1ECDc t\u1EADp & Ph\xE1t tri\u1EC3n K\u1EF9 n\u0103ng";
          projectColor = "#3b82f6";
          domainTasks = [
            {
              title: "T\u1ED5ng h\u1EE3p danh s\xE1ch gi\xE1o tr\xECnh v\xE0 t\xE0i li\u1EC7u \xF4n t\u1EADp k\u1EF3 n\xE0y",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: tomorrow
            },
            {
              title: "L\u1EADp th\u1EDDi kh\xF3a bi\u1EC3u t\u1EF1 h\u1ECDc v\xE0 b\xE0i t\u1EADp l\u1EDBn tu\u1EA7n n\xE0y",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: inSevenDays
            },
            {
              title: "Luy\u1EC7n t\u1EADp Ti\u1EBFng Anh chuy\xEAn ng\xE0nh 30 ph\xFAt m\u1ED7i ng\xE0y",
              priority: "Trung b\xECnh",
              status: "\u0110ang l\xE0m",
              dueDate: today
            }
          ];
          const mathSub = await prisma.subject.create({
            data: {
              userId,
              name: "To\xE1n & T\u01B0 duy Logic (MATH101)",
              targetGrade: 9,
              currentGrade: 8.5,
              progress: 60,
              color: "#3b82f6"
            }
          });
          await prisma.subject.create({
            data: {
              userId,
              name: "Ti\u1EBFng Anh & Giao ti\u1EBFp (ENG201)",
              targetGrade: 8.5,
              currentGrade: 8,
              progress: 50,
              color: "#8b5cf6"
            }
          });
          await prisma.studyAssignment.create({
            data: {
              userId,
              subjectId: mathSub.id,
              title: "B\xE0i t\u1EADp nghi\xEAn c\u1EE9u \u1EE9ng d\u1EE5ng ph\u01B0\u01A1ng ph\xE1p gi\u1EA3i t\xEDch",
              dueDate: inSevenDays,
              status: "In Progress",
              estimatedHours: 4
            }
          });
        } else if (domain === "freelancer") {
          projectName = "D\u1EF1 \xE1n Kh\xE1ch h\xE0ng & Ph\xE1t tri\u1EC3n Th\u01B0\u01A1ng hi\u1EC7u";
          projectColor = "#8b5cf6";
          domainTasks = [
            {
              title: "Chu\u1EA9n b\u1ECB b\u1EA3n b\xE1o gi\xE1 v\xE0 h\u1EE3p \u0111\u1ED3ng cho kh\xE1ch h\xE0ng m\u1EDBi",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: tomorrow
            },
            {
              title: "L\xEAn l\u1ECBch n\u1ED9i dung truy\u1EC1n th\xF4ng v\xE0 c\u1EADp nh\u1EADt portfolio c\xE1 nh\xE2n",
              priority: "Trung b\xECnh",
              status: "\u0110ang l\xE0m",
              dueDate: inSevenDays
            },
            {
              title: "G\u1EEDi s\u1EA3n ph\u1EA9m nghi\u1EC7m thu giai \u0111o\u1EA1n 1 v\xE0 \u0111\u1ED1i so\xE1t thanh to\xE1n",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: inSevenDays
            }
          ];
        } else {
          projectName = "D\u1EF1 \xE1n C\xF4ng vi\u1EC7c & T\u1ED1i \u01B0u N\u0103ng su\u1EA5t";
          projectColor = "#0ea5e9";
          domainTasks = [
            {
              title: "L\u1EADp k\u1EBF ho\u1EA1ch m\u1EE5c ti\xEAu qu\xFD (OKR) v\xE0 \u0111\u1EA7u vi\u1EC7c \u01B0u ti\xEAn tu\u1EA7n n\xE0y",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: tomorrow
            },
            {
              title: "T\u1ED1i \u01B0u h\xF3a quy tr\xECnh l\xE0m vi\u1EC7c h\xE0ng ng\xE0y & checklist b\xE0n giao",
              priority: "Trung b\xECnh",
              status: "\u0110ang l\xE0m",
              dueDate: inSevenDays
            },
            {
              title: "T\u1ED5ng h\u1EE3p b\xE1o c\xE1o tu\u1EA7n v\xE0 \u0111\u1EC1 xu\u1EA5t c\u1EA3i ti\u1EBFn c\xF4ng vi\u1EC7c",
              priority: "Cao",
              status: "Ch\u01B0a l\xE0m",
              dueDate: inSevenDays
            }
          ];
        }
        const project = await prisma.project.create({
          data: {
            userId,
            name: projectName,
            description: `Kh\xF4ng gian qu\u1EA3n l\xFD tr\u1ECDng t\xE2m \u0111\u01B0\u1EE3c c\xE1 nh\xE2n h\xF3a t\u1EF1 \u0111\u1ED9ng theo vai tr\xF2 ${domain === "student" ? "H\u1ECDc sinh/Sinh vi\xEAn" : domain === "freelancer" ? "Freelancer/Creator" : "Ng\u01B0\u1EDDi \u0111i l\xE0m"}.`,
            status: "\u0110ang l\xE0m",
            health: "T\u1ED1t",
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
        const habitsToCreate = [];
        const goalsToCreate = [];
        const hasTimeMgmt = focusList.some((f) => f.includes("th\u1EDDi gian") || f.includes("Gi\u1EA3m t\u1EA3i"));
        const hasExpense = focusList.some((f) => f.includes("chi ti\xEAu") || f.includes("thu nh\u1EADp"));
        const hasHabit = focusList.some((f) => f.includes("th\xF3i quen"));
        const hasBalance = focusList.some((f) => f.includes("C\xE2n b\u1EB1ng"));
        const hasScore = focusList.some((f) => f.includes("\u0111i\u1EC3m cao"));
        if (hasTimeMgmt) {
          habitsToCreate.push({
            name: "L\u1EADp danh s\xE1ch 3 vi\u1EC7c quan tr\u1ECDng nh\u1EA5t ng\xE0y (MIT)",
            category: "N\u0103ng su\u1EA5t",
            target: 1,
            unitLabel: "l\u1EA7n"
          });
          await prisma.focusGoal.create({
            data: {
              userId,
              type: "daily",
              targetHours: 2.5,
              startDate: today
            }
          });
        }
        if (hasExpense) {
          habitsToCreate.push({
            name: "Ghi ch\xE9p v\xE0 \u0111\u1ED1i so\xE1t m\u1ECDi kho\u1EA3n chi trong ng\xE0y",
            category: "T\xE0i ch\xEDnh",
            target: 1,
            unitLabel: "l\u1EA7n"
          });
          goalsToCreate.push({
            title: "T\xEDch l\u0169y Qu\u1EF9 D\u1EF1 ph\xF2ng Kh\u1EA9n c\u1EA5p 3 Th\xE1ng",
            category: "T\xE0i ch\xEDnh",
            targetValue: targetMonthly * 3,
            currentValue: Math.round(targetMonthly * 0.5)
          });
        }
        if (hasHabit) {
          habitsToCreate.push({
            name: "U\u1ED1ng \u0111\u1EE7 2 l\xEDt n\u01B0\u1EDBc m\u1ED7i ng\xE0y",
            category: "S\u1EE9c kh\u1ECFe",
            target: 2e3,
            unitLabel: "ml"
          });
          habitsToCreate.push({
            name: "T\u1EADp th\u1EC3 d\u1EE5c / V\u1EADn \u0111\u1ED9ng 20 ph\xFAt",
            category: "S\u1EE9c kh\u1ECFe",
            target: 20,
            unitLabel: "ph\xFAt"
          });
        }
        if (hasBalance) {
          habitsToCreate.push({
            name: "T\u1EAFt m\xE0n h\xECnh & \u0110i ng\u1EE7 tr\u01B0\u1EDBc 23:00",
            category: "\u0110\u1EDDi s\u1ED1ng",
            target: 1,
            unitLabel: "l\u1EA7n"
          });
          habitsToCreate.push({
            name: "D\xE0nh 15 ph\xFAt \u0111\u1ECDc s\xE1ch / t\u0129nh t\xE2m cu\u1ED1i ng\xE0y",
            category: "\u0110\u1EDDi s\u1ED1ng",
            target: 15,
            unitLabel: "ph\xFAt"
          });
        }
        if (hasScore) {
          goalsToCreate.push({
            title: "\u0110\u1EA1t th\xE0nh t\xEDch h\u1ECDc t\u1EADp xu\u1EA5t s\u1EAFc to\xE0n kh\xF3a k\u1EF3 n\xE0y",
            category: "H\u1ECDc t\u1EADp",
            targetValue: 100,
            currentValue: 35
          });
        }
        if (habitsToCreate.length === 0) {
          habitsToCreate.push({
            name: "U\u1ED1ng \u0111\u1EE7 2 l\xEDt n\u01B0\u1EDBc m\u1ED7i ng\xE0y",
            category: "S\u1EE9c kh\u1ECFe",
            target: 2e3,
            unitLabel: "ml"
          });
          habitsToCreate.push({
            name: "T\u1ED5ng k\u1EBFt ng\xE0y v\xE0 chu\u1EA9n b\u1ECB cho ng\xE0y mai",
            category: "N\u0103ng su\u1EA5t",
            target: 1,
            unitLabel: "l\u1EA7n"
          });
        }
        if (goalsToCreate.length === 0) {
          goalsToCreate.push({
            title: "Ho\xE0n th\xE0nh 100% m\u1EE5c ti\xEAu qu\xFD v\xE0 duy tr\xEC k\u1EF7 lu\u1EADt c\xE1 nh\xE2n",
            category: "C\xE1 nh\xE2n",
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
              status: "Active",
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
              progress: Math.round(g.currentValue / g.targetValue * 100),
              status: "In Progress",
              tier: "Tier 1",
              deadline: inSevenDays
            }
          });
        }
        let eventTitle = "Khung gi\u1EDD T\u1EADp trung Bu\u1ED5i s\xE1ng & Kh\u1EDFi \u0111\u1ED9ng Ng\xE0y m\u1EDBi";
        let eventStart = "07:30";
        let eventEnd = "09:00";
        let eventColor = "#3b82f6";
        let blockCategory = "Deep Work";
        if (schedule.includes("Chi\u1EC1u")) {
          eventTitle = "Khung gi\u1EDD X\u1EED l\xFD C\xF4ng vi\u1EC7c & H\u1ECDc t\u1EADp Bu\u1ED5i chi\u1EC1u";
          eventStart = "14:00";
          eventEnd = "16:00";
          eventColor = "#0ea5e9";
        } else if (schedule.includes("T\u1ED1i")) {
          eventTitle = "Khung gi\u1EDD H\u1ECDc t\u1EADp, \u0110\u1ECDc s\xE1ch & Ph\xE1t tri\u1EC3n B\u1EA3n th\xE2n";
          eventStart = "19:30";
          eventEnd = "21:00";
          eventColor = "#8b5cf6";
        } else if (schedule.includes("\u0110\xEAm")) {
          eventTitle = "Khung gi\u1EDD T\u0129nh l\u1EB7ng, L\u1EADp K\u1EBF ho\u1EA1ch & T\u1ED5ng k\u1EBFt Ng\xE0y";
          eventStart = "22:15";
          eventEnd = "23:00";
          eventColor = "#6366f1";
          blockCategory = "Review";
        }
        await prisma.calendarEvent.create({
          data: {
            userId,
            title: eventTitle,
            description: `L\u1ECBch bi\u1EC3u \u0111\u01B0\u1EE3c kh\u1EDFi t\u1EA1o t\u1EF1 \u0111\u1ED9ng theo khung gi\u1EDD r\u1EA3nh b\u1EA1n \u0111\xE3 ch\u1ECDn (${schedule}).`,
            date: today,
            startTime: eventStart,
            endTime: eventEnd,
            type: "T\u1EADp trung",
            status: "\u0110\xE3 l\xEAn l\u1ECBch",
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
        const domainLabel = domain === "student" ? "H\u1ECDc sinh / Sinh vi\xEAn" : domain === "freelancer" ? "Freelancer / Creator" : "Ng\u01B0\u1EDDi \u0111i l\xE0m";
        await prisma.note.create({
          data: {
            userId,
            title: `Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi LifeOS - L\u1ED9 tr\xECnh kh\u1EDFi \u0111\u1ED9ng cho ${domainLabel}`,
            content: `### Xin ch\xE0o!

H\u1EC7 th\u1ED1ng LifeOS c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp t\u1EF1 \u0111\u1ED9ng d\u1EF1a tr\xEAn c\xE2u tr\u1EA3 l\u1EDDi kh\u1EA3o s\xE1t ban \u0111\u1EA7u:

- **Vai tr\xF2 \u0111\u1ECBnh h\u01B0\u1EDBng:** ${domainLabel}
- **Khung gi\u1EDD t\u1EADp trung l\xFD t\u01B0\u1EDFng:** ${schedule}
- **H\u1EA1n m\u1EE9c ng\xE2n s\xE1ch th\xE1ng:** ${targetMonthly.toLocaleString("vi-VN")} \u0111
- **C\xE1c m\u1EE5c ti\xEAu \u01B0u ti\xEAn:** ${focusList.join(", ") || "N\u0103ng su\u1EA5t & C\xE2n b\u1EB1ng"}

#### C\xE1c ph\xE2n h\u1EC7 \u0111\xE3 \u0111\u01B0\u1EE3c chu\u1EA9n b\u1ECB s\u1EB5n cho b\u1EA1n:
1. **C\xF4ng vi\u1EC7c & D\u1EF1 \xE1n:** \u0110\xE3 t\u1EA1o d\u1EF1 \xE1n *${projectName}* k\xE8m danh s\xE1ch nhi\u1EC7m v\u1EE5 \u01B0u ti\xEAn.
2. **Th\xF3i quen & M\u1EE5c ti\xEAu:** \u0110\xE3 kh\u1EDFi t\u1EA1o ${habitsToCreate.length} th\xF3i quen v\xE0 m\u1EE5c ti\xEAu theo d\xF5i t\u01B0\u01A1ng \u1EE9ng.
3. **T\xE0i ch\xEDnh:** \u0110\xE3 ph\xE2n b\u1ED5 ng\xE2n s\xE1ch 4 danh m\u1EE5c theo c\xF4ng th\u1EE9c 50/30/20 v\xE0 t\u1EA1o s\u1EB5n V\xED chi ti\xEAu.
4. **L\u1ECBch bi\u1EC3u:** \u0110\xE3 thi\u1EBFt l\u1EADp khung gi\u1EDD v\xE0ng *${eventTitle}* tr\xEAn l\u1ECBch.

Ch\xFAc b\u1EA1n c\xF3 nh\u1EEFng tr\u1EA3i nghi\u1EC7m tuy\u1EC7t v\u1EDDi c\xF9ng LifeOS!`,
            category: "H\u01B0\u1EDBng d\u1EABn",
            pinned: true,
            tags: JSON.stringify(["LifeOS", "KhoiDong", domain])
          }
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "Thi\u1EBFt l\u1EADp kh\xF4ng gian th\xE0nh c\xF4ng!",
            message: `H\u1EC7 th\u1ED1ng \u0111\xE3 t\u1EF1 \u0111\u1ED9ng c\u1EA5u h\xECnh d\u1EF1 \xE1n, ${habitsToCreate.length} th\xF3i quen, ng\xE2n s\xE1ch ${targetMonthly.toLocaleString("vi-VN")}\u0111 v\xE0 l\u1ECBch bi\u1EC3u theo kh\u1EA3o s\xE1t c\u1EE7a b\u1EA1n.`,
            type: "SUCCESS",
            read: false
          }
        });
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
      async exportCollectionToCSV(collectionName) {
        const delegate = getModelDelegate(collectionName);
        const items = await delegate.findMany({ take: 1e3 });
        if (!items.length) return "No data";
        const SENSITIVE_FIELDS = /* @__PURE__ */ new Set(["passwordHash", "token", "resetToken", "salt"]);
        const keys = Object.keys(items[0]).filter((k) => !SENSITIVE_FIELDS.has(k));
        const header = keys.join(",");
        const rows = items.map(
          (item) => keys.map((k) => {
            let val = String(item[k] ?? "").replace(/"/g, '""');
            if (/^[=+\-@\t\r]/.test(val)) {
              val = `'${val}`;
            }
            return `"${val}"`;
          }).join(",")
        );
        return [header, ...rows].join("\n");
      }
    };
  }
});

// src/backend/services/gmailNotification.service.ts
import nodemailer from "nodemailer";
import dns from "dns";
import net from "net";
async function resolveHostToIPv4(hostname) {
  if (!hostname) return "smtp.gmail.com";
  if (net.isIP(hostname)) return hostname;
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        return resolve(addresses[0]);
      }
      dns.lookup(hostname, { family: 4 }, (err2, address) => {
        if (!err2 && address) {
          return resolve(address);
        }
        resolve(hostname);
      });
    });
  });
}
function getAppBaseUrl() {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://www.quanlicanhan.online";
  }
  return "http://localhost:5173";
}
var DEFAULT_GMAIL_CONFIG, GmailNotificationService, gmailService;
var init_gmailNotification_service = __esm({
  "src/backend/services/gmailNotification.service.ts"() {
    init_db();
    try {
      if (dns.setDefaultResultOrder) {
        dns.setDefaultResultOrder("ipv4first");
      }
    } catch (e) {
    }
    DEFAULT_GMAIL_CONFIG = {
      enabled: false,
      serviceType: "gmail",
      apiKey: "",
      user: "",
      appPassword: "",
      fromName: "Life OS Notification Assistant",
      fromEmail: "",
      replyTo: "",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpSecure: true,
      notifyTaskOverdue: true,
      notifyTaskUpcoming: true,
      notifyCalendarUpcoming: true,
      notifyBudgetThreshold: true,
      notifySubscriptionExpiry: true,
      notifyPaymentStatus: true,
      notifySecurityAlerts: true,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      maxRemindersPerDay: 5
    };
    GmailNotificationService = class {
      constructor() {
        this.cachedConfig = null;
        this.cachedTransporter = null;
        this.inMemoryLogs = [];
        this.MAX_LOGS = 100;
      }
      // Retrieve current Gmail config from DB or env fallback
      async getConfig() {
        try {
          const prisma = getPrisma();
          const setting = await prisma.systemSetting.findUnique({
            where: { key: "gmail_notification_config" }
          });
          if (setting && setting.value) {
            const parsed = JSON.parse(setting.value);
            this.cachedConfig = { ...DEFAULT_GMAIL_CONFIG, ...parsed };
            return this.cachedConfig;
          }
        } catch (err) {
          console.warn("[GmailNotificationService] Error loading config from database:", err);
        }
        const envUser = process.env.SMTP_USER || process.env.GMAIL_USER || "";
        const envPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
        this.cachedConfig = {
          ...DEFAULT_GMAIL_CONFIG,
          enabled: !!(envUser && envPass),
          user: envUser,
          appPassword: envPass ? envPass.replace(/\s+/g, "") : "",
          fromEmail: envUser || "notifications@lifeos.local",
          fromName: "Life OS Assistant"
        };
        return this.cachedConfig;
      }
      // Alias updateConfig to saveConfig
      async updateConfig(newConfig, adminUserId) {
        return this.saveConfig(newConfig, adminUserId);
      }
      // Save new configuration securely to Database
      async saveConfig(newConfig, adminUserId) {
        const current = await this.getConfig();
        let passwordToSave = current.appPassword || "";
        if (newConfig.appPassword && newConfig.appPassword !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          passwordToSave = newConfig.appPassword.replace(/\s+/g, "");
        }
        let apiKeyToSave = current.apiKey || "";
        if (newConfig.apiKey && newConfig.apiKey !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          apiKeyToSave = newConfig.apiKey.trim();
        }
        const merged = {
          ...current,
          ...newConfig,
          serviceType: newConfig.serviceType || current.serviceType || "gmail",
          user: newConfig.user !== void 0 ? newConfig.user.trim() : current.user,
          fromEmail: newConfig.fromEmail !== void 0 ? newConfig.fromEmail.trim() : current.fromEmail,
          fromName: newConfig.fromName !== void 0 ? newConfig.fromName.trim() : current.fromName,
          replyTo: newConfig.replyTo !== void 0 ? newConfig.replyTo.trim() : current.replyTo || "",
          smtpHost: newConfig.smtpHost !== void 0 ? newConfig.smtpHost.trim() : current.smtpHost || "smtp.gmail.com",
          smtpPort: newConfig.smtpPort !== void 0 ? Number(newConfig.smtpPort) : current.smtpPort || 465,
          smtpSecure: newConfig.smtpSecure !== void 0 ? Boolean(newConfig.smtpSecure) : current.smtpSecure,
          appPassword: passwordToSave,
          apiKey: apiKeyToSave
        };
        try {
          const prisma = getPrisma();
          await prisma.systemSetting.upsert({
            where: { key: "gmail_notification_config" },
            update: { value: JSON.stringify(merged) },
            create: { key: "gmail_notification_config", value: JSON.stringify(merged) }
          });
        } catch (err) {
          console.error("[GmailNotificationService] Failed to save config to database:", err);
          throw new Error(`Kh\xF4ng th\u1EC3 l\u01B0u c\u1EA5u h\xECnh Gmail: ${err.message}`);
        }
        this.cachedConfig = merged;
        this.cachedTransporter = null;
        return merged;
      }
      // Helper to create transport instance with IPv4 forced and proper timeouts
      async createTransporterInstance(config, overridePort, overrideSecure) {
        const cleanPassword = (config.appPassword || "").replace(/\s+/g, "");
        const isGmail = config.serviceType === "gmail" || !config.smtpHost || config.smtpHost.includes("gmail");
        const originalHost = isGmail ? "smtp.gmail.com" : config.smtpHost || "smtp.gmail.com";
        const port = overridePort !== void 0 ? overridePort : Number(config.smtpPort) || (isGmail ? 465 : 587);
        const isSecure = overrideSecure !== void 0 ? overrideSecure : config.smtpSecure !== void 0 ? Boolean(config.smtpSecure) : port === 465;
        const ipv4Host = await resolveHostToIPv4(originalHost);
        return nodemailer.createTransport({
          host: ipv4Host,
          port,
          secure: isSecure,
          auth: {
            user: config.user.trim(),
            pass: cleanPassword
          },
          family: 4,
          // Force IPv4
          connectionTimeout: 15e3,
          greetingTimeout: 15e3,
          socketTimeout: 2e4,
          tls: {
            servername: originalHost,
            // CRITICAL: Provide SNI hostname for TLS handshake so Google SSL verification succeeds
            rejectUnauthorized: false
          }
        });
      }
      // Create transporter based on active configuration
      async getTransporter() {
        const config = await this.getConfig();
        if (!config.enabled) {
          return null;
        }
        if (config.serviceType === "resend") {
          const key = (config.apiKey || config.appPassword || "").trim();
          if (!key) return null;
          return { transporter: null, config };
        }
        if (!config.user || !config.appPassword) {
          return null;
        }
        if (this.cachedTransporter) {
          return { transporter: this.cachedTransporter, config };
        }
        try {
          this.cachedTransporter = await this.createTransporterInstance(config);
          return { transporter: this.cachedTransporter, config };
        } catch (err) {
          console.error("[GmailNotificationService] Transporter initialization failed:", err);
          return null;
        }
      }
      // Send email via Resend REST API (Port 443 HTTPS - Works 100% on Railway Hobby & all cloud hosts)
      async sendViaResend(config, to, subject, html) {
        const key = (config.apiKey || config.appPassword || "").trim();
        if (!key) {
          return { sent: false, message: "Thi\u1EBFu API Key c\u1EE7a Resend (v\xED d\u1EE5: re_xxxx...). Vui l\xF2ng t\u1EA1o t\u1EA1i resend.com." };
        }
        try {
          let fromAddress = config.fromEmail?.trim() || "onboarding@resend.dev";
          if (!fromAddress.includes("@")) {
            fromAddress = "onboarding@resend.dev";
          }
          const fromHeader = config.fromName ? `${config.fromName} <${fromAddress}>` : fromAddress;
          const payload = {
            from: fromHeader,
            to: [to],
            subject,
            html
          };
          if (config.replyTo && config.replyTo.includes("@")) {
            payload.reply_to = [config.replyTo.trim()];
          }
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.id) {
            return { sent: true, message: `Email \u0111\xE3 g\u1EEDi th\xE0nh c\xF4ng qua Resend API (ID: ${data.id})` };
          } else {
            const errMsg = data?.message || data?.error?.message || `HTTP ${res.status}`;
            return { sent: false, message: `L\u1ED7i Resend API: ${errMsg}` };
          }
        } catch (err) {
          return { sent: false, message: `L\u1ED7i k\u1EBFt n\u1ED1i Resend API: ${err.message}` };
        }
      }
      // Verify connection to Gmail SMTP / Resend server with auto-fallback
      async testConnection(testToEmail) {
        const config = await this.getConfig();
        if (!config.enabled) {
          return {
            success: false,
            message: "D\u1ECBch v\u1EE5 Email ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt trong trang Qu\u1EA3n tr\u1ECB."
          };
        }
        if (config.serviceType === "resend") {
          const key = (config.apiKey || config.appPassword || "").trim();
          if (!key) {
            return {
              success: false,
              message: "Ch\u01B0a nh\u1EADp Resend API Key (v\xED d\u1EE5: re_xxxx). Vui l\xF2ng \u0111\u0103ng k\xFD mi\u1EC5n ph\xED t\u1EA1i resend.com \u0111\u1EC3 l\u1EA5y key."
            };
          }
          const testHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">\u26A1 Life OS Notification System</h1>
            <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Ki\u1EC3m tra k\u1EBFt n\u1ED1i Resend API th\xE0nh c\xF4ng (C\u1ED5ng 443 HTTPS)</p>
          </div>
          <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 15px; margin-top: 0;">Xin ch\xE0o Qu\u1EA3n tr\u1ECB vi\xEAn,</p>
            <p style="font-size: 14px; color: #475569;">Email n\xE0y \u0111\u01B0\u1EE3c g\u1EEDi t\u1EF1 \u0111\u1ED9ng qua Resend REST API (C\u1ED5ng 443 HTTPS b\u1EA3o m\u1EADt chu\u1EA9n web). Ho\u1EA1t \u0111\u1ED9ng 100% \u1ED5n \u0111\u1ECBnh tr\xEAn m\u1ECDi n\u1EC1n t\u1EA3ng hosting (Railway, VPS, Docker) m\xE0 kh\xF4ng b\u1ECB gi\u1EDBi h\u1EA1n c\u1ED5ng SMTP.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #166534;">
              <strong>Tr\u1EA1ng th\xE1i:</strong> S\u1EB5n s\xE0ng t\u1EF1 \u0111\u1ED9ng g\u1EEDi nh\u1EAFc vi\u1EC7c, c\u1EA3nh b\xE1o ng\xE2n s\xE1ch, l\u1ECBch bi\u1EC3u v\xE0 th\xF4ng b\xE1o \u0111\u01A1n h\xE0ng.
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Th\u1EDDi gian ki\u1EC3m tra: ${(/* @__PURE__ */ new Date()).toLocaleString("vi-VN")}</p>
          </div>
        </div>
      `;
          if (testToEmail) {
            const sendRes = await this.sendViaResend(
              config,
              testToEmail,
              "\u2705 [Life OS] Ki\u1EC3m tra k\u1EBFt n\u1ED1i Resend API th\xE0nh c\xF4ng",
              testHtml
            );
            this.addLog({
              id: "test_" + Date.now(),
              recipientEmail: testToEmail,
              subject: "Ki\u1EC3m tra k\u1EBFt n\u1ED1i Resend API",
              category: "TEST_CONNECTION",
              status: sendRes.sent ? "SENT" : "FAILED",
              errorMessage: sendRes.sent ? void 0 : sendRes.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return {
              success: sendRes.sent,
              message: sendRes.sent ? `K\u1EBFt n\u1ED1i Resend API th\xE0nh c\xF4ng qua c\u1ED5ng 443 HTTPS! Email th\u1EED nghi\u1EC7m \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi ${testToEmail}.` : sendRes.message
            };
          }
          try {
            const verifyRes = await fetch("https://api.resend.com/api-keys", {
              headers: { "Authorization": `Bearer ${key}` }
            });
            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              return {
                success: false,
                message: `Kh\xF3a Resend API kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a: ${errData.message || verifyRes.statusText}`
              };
            }
            return {
              success: true,
              message: "X\xE1c th\u1EF1c Resend API Key th\xE0nh c\xF4ng qua c\u1ED5ng 443 HTTPS! S\u1EB5n s\xE0ng g\u1EEDi th\xF4ng b\xE1o t\u1EF1 \u0111\u1ED9ng."
            };
          } catch (err) {
            return { success: false, message: `L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 Resend: ${err.message}` };
          }
        }
        if (!config.user || !config.appPassword) {
          return {
            success: false,
            message: "Gmail ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt ho\u1EB7c thi\u1EBFu T\xE0i kho\u1EA3n Gmail / M\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng (App Password)."
          };
        }
        let activeTransporter = null;
        let usedPort = Number(config.smtpPort) || 465;
        let usedSecure = config.smtpSecure !== void 0 ? Boolean(config.smtpSecure) : usedPort === 465;
        try {
          activeTransporter = await this.createTransporterInstance(config, usedPort, usedSecure);
          await activeTransporter.verify();
          this.cachedTransporter = activeTransporter;
        } catch (primaryErr) {
          console.warn(`[GmailNotificationService] Primary verify on port ${usedPort} failed: ${primaryErr.message}. Attempting alternate port fallback...`);
          const fallbackPort = usedPort === 465 ? 587 : 465;
          const fallbackSecure = fallbackPort === 465;
          try {
            const fallbackTransporter = await this.createTransporterInstance(config, fallbackPort, fallbackSecure);
            await fallbackTransporter.verify();
            activeTransporter = fallbackTransporter;
            this.cachedTransporter = activeTransporter;
            usedPort = fallbackPort;
            usedSecure = fallbackSecure;
            await this.updateConfig({
              smtpPort: fallbackPort,
              smtpSecure: fallbackSecure
            });
            console.log(`[GmailNotificationService] Successfully switched and saved working SMTP port: ${fallbackPort} (secure: ${fallbackSecure})`);
          } catch (fallbackErr) {
            this.addLog({
              id: "test_err_" + Date.now(),
              recipientEmail: testToEmail || "test@verify.local",
              subject: "Ki\u1EC3m tra k\u1EBFt n\u1ED1i Gmail",
              category: "TEST_CONNECTION",
              status: "FAILED",
              errorMessage: primaryErr.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            const isAuthError = primaryErr.message?.includes("Invalid login") || primaryErr.message?.includes("535") || primaryErr.message?.includes("Username and Password not accepted") || primaryErr.message?.includes("BadCredentials") || primaryErr.code === "EAUTH";
            const isNetworkError = primaryErr.message?.includes("ENETUNREACH") || primaryErr.message?.includes("ETIMEDOUT") || primaryErr.message?.includes("ECONNREFUSED") || primaryErr.message?.includes("Connection timeout") || primaryErr.message?.includes("timeout") || primaryErr.code === "ETIMEDOUT";
            let hint = "";
            if (isAuthError) {
              hint = ' Google t\u1EEB ch\u1ED1i t\xE0i kho\u1EA3n ho\u1EB7c m\u1EADt kh\u1EA9u. B\u1EA1n h\xE3y t\u1EA1o v\xE0 d\xF9ng "M\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng" (App Password 16 k\xFD t\u1EF1, v\xED d\u1EE5: abcd efgh ijkl mnop) t\u1EA1i myaccount.google.com/apppasswords thay v\xEC m\u1EADt kh\u1EA9u \u0111\u0103ng nh\u1EADp th\xF4ng th\u01B0\u1EDDng.';
            } else if (isNetworkError) {
              hint = ' M\xE1y ch\u1EE7 hosting (nh\u01B0 g\xF3i mi\u1EC5n ph\xED / Hobby c\u1EE7a Railway) ch\u1EB7n k\u1EBFt n\u1ED1i ra ngo\xE0i \u1EDF c\xE1c c\u1ED5ng SMTP 465 v\xE0 587 \u0111\u1EC3 ph\xF2ng ch\u1ED1ng spam. KHUY\u1EBEN NGH\u1ECA: H\xE3y chuy\u1EC3n sang d\xF9ng "Resend API (C\u1ED5ng 443 HTTPS)" ho\xE0n to\xE0n mi\u1EC5n ph\xED (100 email/ng\xE0y) trong m\u1EE5c H\xECnh th\u1EE9c k\u1EBFt n\u1ED1i \u2014 c\u1ED5ng HTTPS web kh\xF4ng bao gi\u1EDD b\u1ECB ch\u1EB7n!';
            }
            return {
              success: false,
              message: `L\u1ED7i k\u1EBFt n\u1ED1i Gmail SMTP: ${primaryErr.message}.${hint}`
            };
          }
        }
        if (testToEmail) {
          try {
            const testHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">\u26A1 Life OS Notification System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Ki\u1EC3m tra k\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng</p>
            </div>
            <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">Xin ch\xE0o Qu\u1EA3n tr\u1ECB vi\xEAn,</p>
              <p style="font-size: 14px; color: #475569;">Email n\xE0y \u0111\u01B0\u1EE3c g\u1EEDi t\u1EF1 \u0111\u1ED9ng \u0111\u1EC3 ki\u1EC3m tra thi\u1EBFt l\u1EADp Gmail SMTP tr\xEAn trang Qu\u1EA3n tr\u1ECB Life OS. M\u1ECDi c\u1EA5u h\xECnh k\u1EBFt n\u1ED1i \u0111\xE3 ho\u1EA1t \u0111\u1ED9ng ho\xE0n to\xE0n ch\xEDnh x\xE1c (C\u1ED5ng k\u1EBFt n\u1ED1i: <b>${usedPort}</b>).</p>
              <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #0f766e;">
                <strong>Tr\u1EA1ng th\xE1i:</strong> S\u1EB5n s\xE0ng t\u1EF1 \u0111\u1ED9ng g\u1EEDi nh\u1EAFc vi\u1EC7c, c\u1EA3nh b\xE1o ng\xE2n s\xE1ch, l\u1ECBch bi\u1EC3u v\xE0 thanh to\xE1n.
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Th\u1EDDi gian ki\u1EC3m tra: ${(/* @__PURE__ */ new Date()).toLocaleString("vi-VN")}</p>
            </div>
          </div>
        `;
            await activeTransporter.sendMail({
              from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
              to: testToEmail,
              subject: "\u2705 [Life OS] Ki\u1EC3m tra k\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng",
              html: testHtml
            });
            this.addLog({
              id: "test_" + Date.now(),
              recipientEmail: testToEmail,
              subject: "\u2705 [Life OS] Ki\u1EC3m tra k\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng",
              category: "TEST_CONNECTION",
              status: "SENT",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return {
              success: true,
              message: `K\u1EBFt n\u1ED1i Gmail SMTP th\xE0nh c\xF4ng qua c\u1ED5ng ${usedPort}! Email th\u1EED nghi\u1EC7m \u0111\xE3 g\u1EEDi t\u1EDBi ${testToEmail}.`
            };
          } catch (sendErr) {
            return {
              success: false,
              message: `X\xE1c th\u1EF1c m\xE1y ch\u1EE7 th\xE0nh c\xF4ng qua c\u1ED5ng ${usedPort} nh\u01B0ng g\u1EEDi email th\u1EED nghi\u1EC7m th\u1EA5t b\u1EA1i: ${sendErr.message}`
            };
          }
        }
        return {
          success: true,
          message: `X\xE1c th\u1EF1c t\xE0i kho\u1EA3n Gmail SMTP th\xE0nh c\xF4ng qua c\u1ED5ng ${usedPort}!`
        };
      }
      // Check if current hour is within quiet hours
      isQuietHour(config) {
        if (!config.quietHoursEnabled) return false;
        const now = /* @__PURE__ */ new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentVal = currentH * 60 + currentM;
        const [startH, startM] = (config.quietHoursStart || "22:00").split(":").map(Number);
        const [endH, endM] = (config.quietHoursEnd || "07:00").split(":").map(Number);
        const startVal = startH * 60 + (startM || 0);
        const endVal = endH * 60 + (endM || 0);
        if (startVal > endVal) {
          return currentVal >= startVal || currentVal < endVal;
        } else {
          return currentVal >= startVal && currentVal < endVal;
        }
      }
      // Universal dispatch function for all modules
      async sendNotification(options) {
        const config = await this.getConfig();
        if (config.enabled) {
          if (options.category === "TASK_OVERDUE" && !config.notifyTaskOverdue) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "TASK_UPCOMING" && !config.notifyTaskUpcoming) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "CALENDAR" && !config.notifyCalendarUpcoming) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "BUDGET_ALERT" && !config.notifyBudgetThreshold) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "SUBSCRIPTION" && !config.notifySubscriptionExpiry) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "PAYMENT" && !config.notifyPaymentStatus) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (options.category === "SECURITY" && !config.notifySecurityAlerts) return { sent: false, message: "Danh m\u1EE5c th\xF4ng b\xE1o n\xE0y \u0111\xE3 t\u1EAFt" };
          if (this.isQuietHour(config) && options.category !== "SECURITY" && options.category !== "PAYMENT") {
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              recipientName: options.recipientName,
              subject: options.subject,
              category: options.category,
              status: "SKIPPED",
              errorMessage: "B\u1ECF qua do \u0111ang trong khung gi\u1EDD y\xEAn t\u0129nh (Quiet Hours)",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return { sent: false, message: "\u0110ang trong khung gi\u1EDD y\xEAn t\u0129nh (Quiet Hours)" };
          }
        }
        const setup = await this.getTransporter();
        const actionUrl = options.actionUrl || getAppBaseUrl();
        const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 28px; text-align: left; color: #ffffff;">
                    <div style="display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      ${options.badgeText || "TH\xD4NG B\xC1O T\u1EF0 \u0110\u1ED8NG"}
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.3; color: #ffffff;">
                      ${options.headline}
                    </h1>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.6;">
                    ${options.recipientName ? `<p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #0f172a;">Xin ch\xE0o ${options.recipientName},</p>` : ""}
                    
                    <div style="margin: 16px 0; color: #475569;">
                      ${options.content}
                    </div>

                    ${actionUrl ? `
                      <div style="margin-top: 28px; text-align: center;">
                        <a href="${actionUrl}" style="display: inline-block; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                          ${options.actionLabel || "Xem chi ti\u1EBFt trong Life OS"} &rarr;
                        </a>
                      </div>
                    ` : ""}

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 20px;" />

                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      \u0110\xE2y l\xE0 th\xF4ng b\xE1o t\u1EF1 \u0111\u1ED9ng t\u1EEB Life OS Personal Operating System.<br/>
                      B\u1EA1n c\xF3 th\u1EC3 t\xF9y ch\u1EC9nh c\xE0i \u0111\u1EB7t th\xF4ng b\xE1o trong menu T\xE0i kho\u1EA3n c\xE1 nh\xE2n.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
        if (setup) {
          if (setup.config.serviceType === "resend") {
            const res = await this.sendViaResend(setup.config, options.to, options.subject, emailHtml);
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              recipientName: options.recipientName,
              subject: options.subject,
              category: options.category,
              status: res.sent ? "SENT" : "FAILED",
              errorMessage: res.sent ? void 0 : res.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return res;
          }
          try {
            await setup.transporter.sendMail({
              from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
              replyTo: setup.config.replyTo || void 0,
              to: options.to,
              subject: options.subject,
              html: emailHtml
            });
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              recipientName: options.recipientName,
              subject: options.subject,
              category: options.category,
              status: "SENT",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return { sent: true, message: "\u0110\xE3 g\u1EEDi Gmail th\xF4ng b\xE1o th\xE0nh c\xF4ng!" };
          } catch (err) {
            console.error("[GmailNotificationService] Error sending mail:", err);
            const isNetworkErr = err.message?.includes("ENETUNREACH") || err.message?.includes("ETIMEDOUT") || err.message?.includes("ECONNREFUSED");
            if (isNetworkErr) {
              try {
                const currentPort = Number(setup.config.smtpPort) || 465;
                const altPort = currentPort === 465 ? 587 : 465;
                const altSecure = altPort === 465;
                const altTransporter = await this.createTransporterInstance(setup.config, altPort, altSecure);
                await altTransporter.sendMail({
                  from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
                  replyTo: setup.config.replyTo || void 0,
                  to: options.to,
                  subject: options.subject,
                  html: emailHtml
                });
                this.cachedTransporter = altTransporter;
                await this.updateConfig({ smtpPort: altPort, smtpSecure: altSecure });
                this.addLog({
                  id: "log_" + Date.now(),
                  recipientEmail: options.to,
                  recipientName: options.recipientName,
                  subject: options.subject,
                  category: options.category,
                  status: "SENT",
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
                return { sent: true, message: `\u0110\xE3 t\u1EF1 \u0111\u1ED9ng \u0111\u1ED5i sang c\u1ED5ng ${altPort} v\xE0 g\u1EEDi Gmail th\xE0nh c\xF4ng!` };
              } catch (altErr) {
                console.error("[GmailNotificationService] Alternate port also failed:", altErr);
              }
            }
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              recipientName: options.recipientName,
              subject: options.subject,
              category: options.category,
              status: "FAILED",
              errorMessage: err.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return { sent: false, message: `L\u1ED7i g\u1EEDi Gmail: ${err.message}` };
          }
        } else {
          this.addLog({
            id: "log_" + Date.now(),
            recipientEmail: options.to,
            recipientName: options.recipientName,
            subject: options.subject,
            category: options.category,
            status: "SIMULATED",
            errorMessage: "Gmail SMTP ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh. \u0110\xE3 ghi nh\u1EADn th\xF4ng b\xE1o v\xE0o h\xE0ng \u0111\u1EE3i h\u1EC7 th\u1ED1ng.",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          return {
            sent: false,
            message: "Gmail SMTP ch\u01B0a c\u1EA5u h\xECnh trong trang Admin. Th\xF4ng b\xE1o \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u tr\u1EEF trong nh\u1EADt k\xFD h\u1EC7 th\u1ED1ng."
          };
        }
      }
      // Universal raw email sender (used by auth password reset and direct mailer)
      async sendRawEmail(options) {
        if (!options.to || !options.to.includes("@")) {
          return { sent: false, message: "\u0110\u1ECBa ch\u1EC9 email ng\u01B0\u1EDDi nh\u1EADn kh\xF4ng h\u1EE3p l\u1EC7." };
        }
        const setup = await this.getTransporter();
        if (setup) {
          if (setup.config.serviceType === "resend") {
            const res = await this.sendViaResend(setup.config, options.to, options.subject, options.html);
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              subject: options.subject,
              category: options.category || "SYSTEM",
              status: res.sent ? "SENT" : "FAILED",
              errorMessage: res.sent ? void 0 : res.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return res;
          }
          try {
            const fromHeader = options.from || `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`;
            await setup.transporter.sendMail({
              from: fromHeader,
              to: options.to,
              replyTo: options.replyTo || setup.config.replyTo || void 0,
              subject: options.subject,
              html: options.html
            });
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              subject: options.subject,
              category: options.category || "SYSTEM",
              status: "SENT",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return { sent: true, message: "Email \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng qua SMTP provider." };
          } catch (err) {
            console.error("[GmailNotificationService] sendRawEmail error:", err);
            const isNetworkErr = err.message?.includes("ENETUNREACH") || err.message?.includes("ETIMEDOUT") || err.message?.includes("ECONNREFUSED");
            if (isNetworkErr) {
              try {
                const currentPort = Number(setup.config.smtpPort) || 465;
                const altPort = currentPort === 465 ? 587 : 465;
                const altSecure = altPort === 465;
                const altTransporter = await this.createTransporterInstance(setup.config, altPort, altSecure);
                const fromHeader = options.from || `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`;
                await altTransporter.sendMail({
                  from: fromHeader,
                  to: options.to,
                  replyTo: options.replyTo || setup.config.replyTo || void 0,
                  subject: options.subject,
                  html: options.html
                });
                this.cachedTransporter = altTransporter;
                await this.updateConfig({ smtpPort: altPort, smtpSecure: altSecure });
                this.addLog({
                  id: "log_" + Date.now(),
                  recipientEmail: options.to,
                  subject: options.subject,
                  category: options.category || "SYSTEM",
                  status: "SENT",
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
                return { sent: true, message: `Email \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng sau khi t\u1EF1 \u0111\u1ED9ng chuy\u1EC3n sang c\u1ED5ng ${altPort}.` };
              } catch (altErr) {
                console.error("[GmailNotificationService] Fallback transporter also failed:", altErr.message);
              }
            }
            this.addLog({
              id: "log_" + Date.now(),
              recipientEmail: options.to,
              subject: options.subject,
              category: options.category || "SYSTEM",
              status: "FAILED",
              errorMessage: err.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            return { sent: false, message: `L\u1ED7i g\u1EEDi email: ${err.message}` };
          }
        } else {
          this.addLog({
            id: "log_" + Date.now(),
            recipientEmail: options.to,
            subject: options.subject,
            category: options.category || "SYSTEM",
            status: "SIMULATED",
            errorMessage: "Gmail SMTP ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh ho\u1EB7c ch\u01B0a b\u1EADt trong trang Admin.",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          return { sent: false, message: "Gmail SMTP ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh ho\u1EB7c ch\u01B0a b\u1EADt trong trang Admin." };
        }
      }
      // Store logs in memory
      addLog(entry) {
        this.inMemoryLogs.unshift(entry);
        if (this.inMemoryLogs.length > this.MAX_LOGS) {
          this.inMemoryLogs.pop();
        }
      }
      // Get recent notification history
      getNotificationLogs() {
        return this.inMemoryLogs;
      }
    };
    gmailService = new GmailNotificationService();
  }
});

// src/backend/services/emailQueue.service.ts
import nodemailer2 from "nodemailer";
import { v4 as uuidv4 } from "uuid";
var RETRY_BACKOFF_SECONDS, MAX_RETRIES, EmailQueueService, emailQueueService;
var init_emailQueue_service = __esm({
  "src/backend/services/emailQueue.service.ts"() {
    init_db();
    init_gmailNotification_service();
    RETRY_BACKOFF_SECONDS = [15, 60, 300, 900, 1800];
    MAX_RETRIES = 5;
    EmailQueueService = class {
      constructor() {
        this.isProcessing = false;
        this.workerInterval = null;
        this.tableInitialized = false;
      }
      /**
       * Auto-heals / ensures the email_queue table exists in PostgreSQL
       */
      async initEmailQueueTable() {
        if (this.tableInitialized) return;
        try {
          const prisma = getPrisma();
          await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS email_queue (
          id VARCHAR(64) PRIMARY KEY,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          html_body TEXT NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
          retry_count INT DEFAULT 0 NOT NULL,
          last_error TEXT,
          next_retry_at TIMESTAMPTZ,
          metadata TEXT,
          is_test_data BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          sent_at TIMESTAMPTZ
        );
      `);
          await prisma.$executeRawUnsafe(`
        ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
      `).catch(() => {
          });
          await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry ON email_queue(status, next_retry_at);
      `);
          await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC);
      `);
          await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue(recipient);
      `);
          this.tableInitialized = true;
        } catch (err) {
          console.warn("[EmailQueueService] Table initialization note:", err.message);
        }
      }
      /**
       * Enqueues an email into the PostgreSQL Outbox queue and triggers immediate background processing.
       * Completely Non-blocking for the caller.
       */
      async enqueue(options) {
        await this.initEmailQueueTable();
        const id = "emq_" + uuidv4().replace(/-/g, "").slice(0, 20);
        const cleanRecipient = options.recipient.trim();
        const metadataStr = options.metadata ? JSON.stringify(options.metadata) : null;
        const isTestData = Boolean(options.isTestData);
        const now = /* @__PURE__ */ new Date();
        try {
          const prisma = getPrisma();
          await prisma.$executeRawUnsafe(`
        INSERT INTO email_queue (id, recipient, subject, html_body, event_type, status, retry_count, next_retry_at, metadata, is_test_data, created_at)
        VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6, $7, $8, $9)
      `, id, cleanRecipient, options.subject, options.htmlBody, options.eventType, now, metadataStr, isTestData, now);
          setImmediate(() => {
            this.processNextBatch().catch((err) => {
              console.error("[EmailQueueService] Error in immediate batch processing:", err);
            });
          });
          return id;
        } catch (err) {
          console.error("[EmailQueueService] Failed to enqueue email:", err);
          throw err;
        }
      }
      /**
       * Processes the next batch of pending or ready-to-retry emails
       */
      async processNextBatch(limit = 10) {
        if (this.isProcessing) {
          return { processed: 0, sent: 0, failed: 0 };
        }
        this.isProcessing = true;
        let processed = 0;
        let sent = 0;
        let failed = 0;
        try {
          await this.initEmailQueueTable();
          const prisma = getPrisma();
          const now = /* @__PURE__ */ new Date();
          const items = await prisma.$queryRawUnsafe(`
        UPDATE email_queue
        SET status = 'PROCESSING'
        WHERE id IN (
          SELECT id FROM email_queue
          WHERE (status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= $1))
             OR (status = 'FAILED' AND retry_count < ${MAX_RETRIES} AND next_retry_at <= $1)
          ORDER BY created_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, recipient, subject, html_body, event_type, status, retry_count, last_error, next_retry_at, metadata, created_at, sent_at
      `, now);
          if (!items || items.length === 0) {
            this.isProcessing = false;
            return { processed: 0, sent: 0, failed: 0 };
          }
          processed = items.length;
          for (const item of items) {
            try {
              const sendResult = await this.dispatchSingleEmail({
                id: item.id,
                recipient: item.recipient,
                subject: item.subject,
                htmlBody: item.html_body,
                eventType: item.event_type
              });
              if (sendResult.success) {
                sent++;
                const sentAt = /* @__PURE__ */ new Date();
                await prisma.$executeRawUnsafe(`
              UPDATE email_queue
              SET status = 'SENT', sent_at = $1, last_error = NULL
              WHERE id = $2
            `, sentAt, item.id);
                if (item.metadata) {
                  try {
                    const meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
                    if (meta?.announcementDeliveryId) {
                      await prisma.announcementDelivery.update({
                        where: { id: meta.announcementDeliveryId },
                        data: { status: "SENT", sentAt, errorMessage: null }
                      }).catch(() => {
                      });
                    }
                  } catch {
                  }
                }
              } else {
                failed++;
                await this.handleItemFailure(item, sendResult.error || "G\u1EEDi th\u1EA5t b\u1EA1i kh\xF4ng r\xF5 nguy\xEAn nh\xE2n");
              }
            } catch (itemErr) {
              failed++;
              await this.handleItemFailure(item, itemErr.message || String(itemErr));
            }
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch (err) {
          console.error("[EmailQueueService] Error processing email batch:", err);
        } finally {
          this.isProcessing = false;
        }
        return { processed, sent, failed };
      }
      /**
       * Handles failure with Exponential Backoff retry schedule
       */
      async handleItemFailure(item, errorMessage) {
        const prisma = getPrisma();
        const currentRetries = (item.retry_count || 0) + 1;
        const isExhausted = currentRetries >= MAX_RETRIES;
        const backoffSec = RETRY_BACKOFF_SECONDS[Math.min(currentRetries - 1, RETRY_BACKOFF_SECONDS.length - 1)];
        const nextRetryDate = isExhausted ? null : new Date(Date.now() + backoffSec * 1e3);
        const newStatus = isExhausted ? "FAILED" : "PENDING";
        await prisma.$executeRawUnsafe(`
      UPDATE email_queue
      SET status = $1,
          retry_count = $2,
          last_error = $3,
          next_retry_at = $4
      WHERE id = $5
    `, newStatus, currentRetries, errorMessage.slice(0, 2e3), nextRetryDate, item.id);
        if (item.metadata) {
          try {
            const meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata;
            if (meta?.announcementDeliveryId) {
              await prisma.announcementDelivery.update({
                where: { id: meta.announcementDeliveryId },
                data: {
                  status: isExhausted ? "FAILED" : "RETRYING",
                  errorMessage: `[L\u1EA7n th\u1EED ${currentRetries}/${MAX_RETRIES}] ${errorMessage.slice(0, 500)}`
                }
              }).catch(() => {
              });
            }
          } catch {
          }
        }
        console.warn(`[EmailQueueService] Email ${item.id} to ${item.recipient} failed (Attempt ${currentRetries}/${MAX_RETRIES}): ${errorMessage}. ${isExhausted ? "Marked as FAILED." : `Scheduled retry in ${backoffSec}s.`}`);
      }
      /**
       * Dispatches a single email through Nodemailer SMTP or Resend API
       */
      async dispatchSingleEmail(item) {
        const config = await gmailService.getConfig();
        if (!config.enabled) {
          return {
            success: false,
            error: "D\u1ECBch v\u1EE5 Email ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt trong c\u1EA5u h\xECnh Qu\u1EA3n tr\u1ECB."
          };
        }
        if (config.serviceType === "resend") {
          const res = await gmailService.sendViaResend(config, item.recipient, item.subject, item.htmlBody);
          return { success: res.sent, error: res.sent ? void 0 : res.message };
        }
        if (!config.user || !config.appPassword) {
          return {
            success: false,
            error: "Thi\u1EBFu th\xF4ng tin t\xE0i kho\u1EA3n SMTP ho\u1EB7c M\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng."
          };
        }
        const cleanPassword = (config.appPassword || "").replace(/\s+/g, "");
        const isGmail = config.serviceType === "gmail" || !config.smtpHost || config.smtpHost.includes("gmail");
        const originalHost = isGmail ? "smtp.gmail.com" : config.smtpHost || "smtp.gmail.com";
        const port = Number(config.smtpPort) || (isGmail ? 465 : 587);
        const isSecure = config.smtpSecure !== void 0 ? Boolean(config.smtpSecure) : port === 465;
        const ipv4Host = await resolveHostToIPv4(originalHost);
        const transporter = nodemailer2.createTransport({
          host: ipv4Host,
          port,
          secure: isSecure,
          auth: {
            user: config.user.trim(),
            pass: cleanPassword
          },
          family: 4,
          connectionTimeout: 1e4,
          greetingTimeout: 1e4,
          socketTimeout: 15e3,
          tls: {
            servername: originalHost,
            rejectUnauthorized: false
          }
        });
        try {
          const fromHeader = config.fromName ? `"${config.fromName}" <${config.fromEmail || config.user}>` : config.fromEmail || config.user;
          await transporter.sendMail({
            from: fromHeader,
            to: item.recipient,
            replyTo: config.replyTo || void 0,
            subject: item.subject,
            html: item.htmlBody
          });
          return { success: true };
        } catch (err) {
          return {
            success: false,
            error: err.message || "L\u1ED7i g\u1EEDi mail qua SMTP"
          };
        }
      }
      /**
       * Starts the background recurring sweep (every 30 seconds)
       */
      startQueueWorker(intervalMs = 3e4) {
        if (this.workerInterval) return;
        setTimeout(() => {
          this.processNextBatch().catch((err) => {
            console.error("[EmailQueueService] Error in initial queue sweep:", err);
          });
        }, 3e3);
        this.workerInterval = setInterval(() => {
          this.processNextBatch().catch((err) => {
            console.error("[EmailQueueService] Error in periodic queue sweep:", err);
          });
        }, intervalMs);
        console.log(`\u2705 [EmailQueueService] Outbox Queue Worker \u0111\xE3 k\xEDch ho\u1EA1t (qu\xE9t t\u1EF1 \u0111\u1ED9ng m\u1ED7i ${intervalMs / 1e3}s).`);
      }
      /**
       * Stops the background worker on graceful shutdown
       */
      stopQueueWorker() {
        if (this.workerInterval) {
          clearInterval(this.workerInterval);
          this.workerInterval = null;
        }
      }
      /**
       * Verifies SMTP connection on startup and outputs health status
       */
      async verifySmtpConnection() {
        try {
          const config = await gmailService.getConfig();
          if (!config.enabled) {
            return { ok: false, message: "SMTP ch\u01B0a b\u1EADt trong c\xE0i \u0111\u1EB7t." };
          }
          if (config.serviceType === "resend") {
            const hasKey = Boolean(config.apiKey || config.appPassword);
            return {
              ok: hasKey,
              message: hasKey ? "Resend API Key \u0111\xE3 c\u1EA5u h\xECnh." : "Ch\u01B0a nh\u1EADp Resend API Key."
            };
          }
          if (!config.user || !config.appPassword) {
            return { ok: false, message: "Thi\u1EBFu t\xE0i kho\u1EA3n ho\u1EB7c m\u1EADt kh\u1EA9u \u1EE9ng d\u1EE5ng SMTP." };
          }
          const cleanPassword = (config.appPassword || "").replace(/\s+/g, "");
          const isGmail = config.serviceType === "gmail" || !config.smtpHost || config.smtpHost.includes("gmail");
          const originalHost = isGmail ? "smtp.gmail.com" : config.smtpHost || "smtp.gmail.com";
          const port = Number(config.smtpPort) || (isGmail ? 465 : 587);
          const isSecure = config.smtpSecure !== void 0 ? Boolean(config.smtpSecure) : port === 465;
          const ipv4Host = await resolveHostToIPv4(originalHost);
          const transporter = nodemailer2.createTransport({
            host: ipv4Host,
            port,
            secure: isSecure,
            auth: {
              user: config.user.trim(),
              pass: cleanPassword
            },
            family: 4,
            connectionTimeout: 8e3,
            greetingTimeout: 8e3,
            socketTimeout: 1e4,
            tls: {
              servername: originalHost,
              rejectUnauthorized: false
            }
          });
          await transporter.verify();
          console.log(`\u2705 [GMAIL SMTP] K\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 ${originalHost}:${port} th\xE0nh c\xF4ng! H\xE0ng \u0111\u1EE3i Email s\u1EB5n s\xE0ng.`);
          return { ok: true, message: `K\u1EBFt n\u1ED1i SMTP ${originalHost}:${port} th\xE0nh c\xF4ng.` };
        } catch (err) {
          console.warn(`\u26A0\uFE0F [GMAIL SMTP] Ki\u1EC3m tra k\u1EBFt n\u1ED1i ban \u0111\u1EA7u ch\u01B0a ho\xE0n t\u1EA5t: ${err.message}`);
          return { ok: false, message: err.message };
        }
      }
      /**
       * Queries paginated queue items for Admin view
       */
      async getQueueItems(params) {
        await this.initEmailQueueTable();
        const prisma = getPrisma();
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
        const offset = (page - 1) * limit;
        const whereClauses = ["1=1"];
        const queryParams = [];
        if (params.status && params.status !== "ALL") {
          queryParams.push(params.status.toUpperCase());
          whereClauses.push(`status = $${queryParams.length}`);
        }
        if (params.search && params.search.trim()) {
          queryParams.push(`%${params.search.trim().toLowerCase()}%`);
          whereClauses.push(`(LOWER(recipient) LIKE $${queryParams.length} OR LOWER(subject) LIKE $${queryParams.length} OR LOWER(event_type) LIKE $${queryParams.length})`);
        }
        const whereSql = whereClauses.join(" AND ");
        const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM email_queue WHERE ${whereSql}
    `, ...queryParams);
        const total = countResult[0]?.count || 0;
        const rows = await prisma.$queryRawUnsafe(`
      SELECT id, recipient, subject, html_body as "htmlBody", event_type as "eventType",
             status, retry_count as "retryCount", last_error as "lastError",
             next_retry_at as "nextRetryAt", metadata, created_at as "createdAt", sent_at as "sentAt"
      FROM email_queue
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, ...queryParams);
        return {
          items: rows,
          total,
          page,
          limit
        };
      }
      /**
       * Aggregates statistics of the email queue
       */
      async getQueueStats() {
        await this.initEmailQueueTable();
        const prisma = getPrisma();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT status, COUNT(*)::int as count FROM email_queue GROUP BY status
    `);
        const stats = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
        for (const r of rows) {
          stats.total += r.count;
          if (r.status === "PENDING") stats.pending = r.count;
          else if (r.status === "PROCESSING") stats.processing = r.count;
          else if (r.status === "SENT") stats.sent = r.count;
          else if (r.status === "FAILED") stats.failed = r.count;
        }
        return stats;
      }
      /**
       * Manually retries a queued or failed email immediately
       */
      async retryItem(id) {
        await this.initEmailQueueTable();
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const result = await prisma.$queryRawUnsafe(`
      UPDATE email_queue
      SET status = 'PENDING', retry_count = 0, next_retry_at = $1, last_error = NULL
      WHERE id = $2
      RETURNING id
    `, now, id);
        if (result && result.length > 0) {
          setImmediate(() => {
            this.processNextBatch().catch((err) => {
              console.error("[EmailQueueService] Error processing retried item:", err);
            });
          });
          return true;
        }
        return false;
      }
      /**
       * Deletes a queue item by ID
       */
      async deleteItem(id) {
        await this.initEmailQueueTable();
        const prisma = getPrisma();
        const result = await prisma.$queryRawUnsafe(`
      DELETE FROM email_queue WHERE id = $1 RETURNING id
    `, id);
        return Boolean(result && result.length > 0);
      }
    };
    emailQueueService = new EmailQueueService();
  }
});

// src/backend/services/emailTemplate.service.ts
var emailTemplate_service_exports = {};
__export(emailTemplate_service_exports, {
  buildEmailHtml: () => buildEmailHtml
});
function buildEmailHtml(data) {
  const appUrl = getAppBaseUrl();
  const ctaUrl = data.ctaButton?.url || data.actionUrl || appUrl;
  const ctaLabel = data.ctaButton?.label || data.actionLabel || "Xem tr\xEAn LifeOS";
  const badgeColor = data.badgeColor || (data.priority === "CRITICAL" ? "#ef4444" : data.priority === "HIGH" ? "#f59e0b" : "#10b981");
  const badgeText = data.badgeText || (data.priority === "CRITICAL" ? "KH\u1EA8N C\u1EA4P" : data.priority === "HIGH" ? "\u01AFU TI\xCAN" : "TH\xD4NG B\xC1O T\u1EF0 \u0110\u1ED8NG");
  const rowsList = data.details || data.detailsTable || [];
  const detailsRows = rowsList.map(
    (d) => `
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; width: 35%; border-bottom: 1px solid #f1f5f9;">
          ${d.label}:
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">
          ${d.value}
        </td>
      </tr>
    `
  ).join("");
  const bodyContent = data.paragraphs && data.paragraphs.length > 0 ? data.paragraphs.map((p) => `<p style="margin: 0 0 12px; font-size: 14px; color: #334155; line-height: 1.65;">${p}</p>`).join("") : `<div style="margin: 0 0 20px; font-size: 14px; color: #334155; line-height: 1.65;">${data.summary || ""}</div>`;
  const greetingText = data.greeting || (data.recipientName ? `K\xEDnh g\u1EEDi ${data.recipientName},` : "");
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${data.headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Brand & Badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 5px 12px; background: ${badgeColor}; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
                      ${badgeText}
                    </span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.35; color: #ffffff; letter-spacing: -0.3px;">
                      ${data.headline}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 28px; color: #334155; font-size: 14px; line-height: 1.6;">
              ${greetingText ? `<p style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #0f172a;">${greetingText}</p>` : ""}
              
              ${bodyContent}

              ${rowsList.length > 0 ? `
                <div style="margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    ${detailsRows}
                  </table>
                </div>
              ` : ""}

              ${data.actionLabel || data.ctaButton ? `
                <div style="margin: 28px 0 10px; text-align: center;">
                  <a href="${ctaUrl}" style="display: inline-block; padding: 13px 32px; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                    ${ctaLabel} &rarr;
                  </a>
                </div>
              ` : ""}

              <!-- Security Footer Note -->
              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
                ${data.footerNote || "LifeOS System Notification &bull; \u0110\u01B0\u1EE3c g\u1EEDi t\u1EF1 \u0111\u1ED9ng t\u1EEB m\xE1y ch\u1EE7 b\u1EA3o m\u1EADt LifeOS Cloud"}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
var init_emailTemplate_service = __esm({
  "src/backend/services/emailTemplate.service.ts"() {
    init_gmailNotification_service();
  }
});

// src/backend/services/r2.service.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var ALLOWED_MIME_TYPES, DANGEROUS_EXTENSIONS, CloudflareR2Service, r2Service;
var init_r2_service = __esm({
  "src/backend/services/r2.service.ts"() {
    ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/x-zip-compressed"
      // SEC-008: Removed application/octet-stream — generic binary cannot be validated for malicious content
    ]);
    DANGEROUS_EXTENSIONS = /* @__PURE__ */ new Set([
      "exe",
      "bat",
      "cmd",
      "sh",
      "php",
      "phtml",
      "php3",
      "php4",
      "php5",
      "js",
      "mjs",
      "cjs",
      "html",
      "htm",
      "xhtml",
      "jsp",
      "asp",
      "aspx",
      "cgi",
      "pl",
      "py",
      "jar",
      "vbs",
      "scr",
      "ps1"
    ]);
    CloudflareR2Service = class {
      constructor() {
        this.client = null;
        this.accountId = "";
        this.accessKeyId = "";
        this.secretAccessKey = "";
        this.bucketName = "";
        this.publicUrl = "";
        this.initFromEnv();
      }
      initFromEnv() {
        this.accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
        this.accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
        this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
        this.bucketName = process.env.R2_BUCKET_NAME?.trim() || "";
        this.publicUrl = (process.env.R2_PUBLIC_URL?.trim() || "").replace(/\/+$/, "");
        if (this.accountId && this.accessKeyId && this.secretAccessKey) {
          this.client = new S3Client({
            region: "auto",
            endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: this.accessKeyId,
              secretAccessKey: this.secretAccessKey
            }
          });
        } else {
          this.client = null;
        }
      }
      isConfigured() {
        this.initFromEnv();
        return Boolean(this.client && this.bucketName);
      }
      getStatus() {
        this.initFromEnv();
        return {
          configured: this.isConfigured(),
          accountId: this.accountId ? `${this.accountId.substring(0, 6)}...` : "Ch\u01B0a c\u1EA5u h\xECnh",
          bucketName: this.bucketName || "Ch\u01B0a c\u1EA5u h\xECnh",
          hasAccessKey: Boolean(this.accessKeyId),
          hasSecretKey: Boolean(this.secretAccessKey),
          publicUrl: this.publicUrl || (this.accountId && this.bucketName ? `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}` : "Ch\u01B0a c\u1EA5u h\xECnh")
        };
      }
      async testConnection() {
        if (!this.isConfigured() || !this.client) {
          return {
            success: false,
            message: "Thi\u1EBFu th\xF4ng tin c\u1EA5u h\xECnh Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)."
          };
        }
        try {
          await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
          return {
            success: true,
            message: `K\u1EBFt n\u1ED1i th\xE0nh c\xF4ng t\u1EDBi R2 Bucket "${this.bucketName}"!`
          };
        } catch (err) {
          return {
            success: false,
            message: `Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i R2 Bucket "${this.bucketName}": ${err.message || "L\u1ED7i x\xE1c th\u1EF1c credentials"}`
          };
        }
      }
      /**
       * Sanitizes and builds a safe, isolated key within user namespace.
       * Path format: users/{userId}/{sanitizedSubfolder}/{timestamp}_{random}_{sanitizedFileName}
       */
      buildSafeKey(userId, subfolder, fileName) {
        const cleanSubfolder = subfolder.replace(/\\/g, "/").split("/").map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "")).filter((part) => Boolean(part) && part !== "." && part !== "..").join("/");
        const safeFolder = cleanSubfolder || "general";
        const ext = (fileName.split(".").pop() || "").toLowerCase();
        if (DANGEROUS_EXTENSIONS.has(ext)) {
          throw new Error(`\u0110u\xF4i t\u1EADp tin .${ext} b\u1ECB ch\u1EB7n v\xEC l\xFD do an ninh.`);
        }
        const baseName = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
        const sanitizedFileName = ext ? `${cleanBaseName}.${ext}` : cleanBaseName;
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `users/${userId}/${safeFolder}/${timestamp}_${randomStr}_${sanitizedFileName}`;
      }
      async uploadFile(fileBuffer, fileName, mimeType, userId, subfolder = "uploads") {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh bi\u1EBFn m\xF4i tr\u01B0\u1EDDng.");
        }
        const MAX_SIZE = 25 * 1024 * 1024;
        if (fileBuffer.length > MAX_SIZE) {
          throw new Error("K\xEDch th\u01B0\u1EDBc t\u1EADp tin v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a (25MB).");
        }
        const cleanMime = (mimeType || "application/octet-stream").toLowerCase().trim();
        if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
          throw new Error(`Lo\u1EA1i n\u1ED9i dung '${cleanMime}' kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p t\u1EA3i l\xEAn.`);
        }
        const key = this.buildSafeKey(userId, subfolder, fileName);
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: cleanMime
        });
        await this.client.send(command);
        const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;
        const url = `${publicDomain}/${key}`;
        return {
          success: true,
          key,
          url,
          size: fileBuffer.length
        };
      }
      async getPresignedUploadUrl(fileName, mimeType, userId, subfolder = "uploads", expiresInSeconds = 900) {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh bi\u1EBFn m\xF4i tr\u01B0\u1EDDng.");
        }
        const cleanMime = (mimeType || "application/octet-stream").toLowerCase().trim();
        if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
          throw new Error(`Lo\u1EA1i n\u1ED9i dung '${cleanMime}' kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p.`);
        }
        const key = this.buildSafeKey(userId, subfolder, fileName);
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: cleanMime
        });
        const uploadUrl = await getSignedUrl(this.client, command, {
          expiresIn: Math.min(expiresInSeconds, 900)
        });
        const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;
        const publicUrl = `${publicDomain}/${key}`;
        return { uploadUrl, key, publicUrl };
      }
      async deleteFile(key, requesterUserId, isAdmin = false) {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.");
        }
        const userPrefix = `users/${requesterUserId}/`;
        if (!isAdmin && !key.startsWith(userPrefix)) {
          throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a t\u1EADp tin c\u1EE7a ng\u01B0\u1EDDi d\xF9ng kh\xE1c.");
        }
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        await this.client.send(command);
        return true;
      }
      async listFiles(requesterUserId, isAdmin = false, userPrefix = "", maxKeys = 50) {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.");
        }
        let effectivePrefix = `users/${requesterUserId}/`;
        if (isAdmin) {
          effectivePrefix = userPrefix || "";
        } else if (userPrefix) {
          const cleanSub = userPrefix.replace(/[^a-zA-Z0-9_-]/g, "");
          effectivePrefix = `users/${requesterUserId}/${cleanSub}`;
        }
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: effectivePrefix,
          MaxKeys: Math.min(maxKeys, 100)
        });
        const response = await this.client.send(command);
        const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;
        return (response.Contents || []).map((item) => ({
          key: item.Key || "",
          size: item.Size || 0,
          lastModified: item.LastModified,
          url: `${publicDomain}/${item.Key}`
        }));
      }
      async getObjectMetadata(key, requesterUserId, isAdmin = false) {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.");
        }
        const userPrefix = `users/${requesterUserId}/`;
        if (!isAdmin && !key.startsWith(userPrefix)) {
          throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem th\xF4ng tin t\u1EADp tin c\u1EE7a ng\u01B0\u1EDDi d\xF9ng kh\xE1c.");
        }
        const command = new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        const metadata = await this.client.send(command);
        return {
          key,
          size: metadata.ContentLength || 0,
          contentType: metadata.ContentType || "application/octet-stream",
          lastModified: metadata.LastModified,
          etag: metadata.ETag
        };
      }
      async getPresignedDownloadUrl(key, requesterUserId, isAdmin = false, expiresInSeconds = 3600) {
        if (!this.isConfigured() || !this.client) {
          throw new Error("Cloudflare R2 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.");
        }
        const userPrefix = `users/${requesterUserId}/`;
        if (!isAdmin && !key.startsWith(userPrefix)) {
          throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n t\u1EA3i t\u1EADp tin c\u1EE7a ng\u01B0\u1EDDi d\xF9ng kh\xE1c.");
        }
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        const downloadUrl = await getSignedUrl(this.client, command, {
          expiresIn: Math.min(expiresInSeconds, 3600)
        });
        return { downloadUrl, key };
      }
    };
    r2Service = new CloudflareR2Service();
  }
});

// src/backend/services/referral.service.ts
var referral_service_exports = {};
__export(referral_service_exports, {
  ReferralService: () => ReferralService,
  referralService: () => referralService,
  validateQrImageBuffer: () => validateQrImageBuffer
});
function validateQrImageBuffer(buffer, mimeType, extension) {
  const cleanMime = (mimeType || "").toLowerCase().trim();
  const cleanExt = (extension || "").toLowerCase().trim();
  const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp"];
  if (!cleanMime || !ALLOWED_MIME.includes(cleanMime)) {
    return { valid: false, error: "\u0110\u1ECBnh d\u1EA1ng \u1EA3nh kh\xF4ng h\u1EE3p l\u1EC7. Ch\u1EC9 ch\u1EA5p nh\u1EADn PNG, JPG ho\u1EB7c WEBP." };
  }
  if (!cleanExt || !ALLOWED_EXT.some((ext) => cleanExt.endsWith(ext))) {
    return { valid: false, error: "\u0110u\xF4i t\u1EADp tin kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p (ch\u1EC9 ch\u1EA5p nh\u1EADn .png, .jpg, .jpeg, .webp)." };
  }
  if (buffer.length > 5 * 1024 * 1024) {
    return { valid: false, error: "K\xEDch th\u01B0\u1EDBc t\u1EADp tin v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a 5MB." };
  }
  if (cleanMime === "image/png") {
    if (buffer.length < 8 || buffer[0] !== 137 || buffer[1] !== 80 || buffer[2] !== 78 || buffer[3] !== 71) {
      return { valid: false, error: "T\u1EADp tin PNG kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB l\u1ED7i c\u1EA5u tr\xFAc." };
    }
  } else if (cleanMime === "image/jpeg" || cleanMime === "image/jpg") {
    if (buffer.length < 3 || buffer[0] !== 255 || buffer[1] !== 216 || buffer[2] !== 255) {
      return { valid: false, error: "T\u1EADp tin JPEG kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB l\u1ED7i c\u1EA5u tr\xFAc." };
    }
  } else if (cleanMime === "image/webp") {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff !== "RIFF" || webp !== "WEBP") {
      return { valid: false, error: "T\u1EADp tin WEBP kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB l\u1ED7i c\u1EA5u tr\xFAc." };
    }
  }
  return { valid: true };
}
var ReferralService, referralService;
var init_referral_service = __esm({
  "src/backend/services/referral.service.ts"() {
    init_db();
    init_r2_service();
    init_gmailNotification_service();
    ReferralService = class {
      /**
       * Generates a unique, aesthetic Gen Z referral code (e.g. "LIFE-8X92K")
       */
      generateReferralCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `LIFE-${code}`;
      }
      /**
       * Gets or initializes the referral profile for a user
       */
      async getOrCreateProfile(userId) {
        const prisma = getPrisma();
        let profile = await prisma.referralProfile.findUnique({
          where: { userId }
        });
        if (!profile) {
          let code = this.generateReferralCode();
          let exists = await prisma.referralProfile.findUnique({ where: { referralCode: code } });
          while (exists) {
            code = this.generateReferralCode();
            exists = await prisma.referralProfile.findUnique({ where: { referralCode: code } });
          }
          profile = await prisma.referralProfile.create({
            data: {
              userId,
              referralCode: code
            }
          });
        }
        return profile;
      }
      /**
       * Attaches a referred user to a referrer code upon signup
       */
      async bindReferral(referredUserId, referralCodeRaw) {
        if (!referralCodeRaw) return false;
        const cleanCode = referralCodeRaw.trim().toUpperCase();
        const prisma = getPrisma();
        const referrerProfile = await prisma.referralProfile.findUnique({
          where: { referralCode: cleanCode }
        });
        if (!referrerProfile) return false;
        if (referrerProfile.userId === referredUserId) {
          console.warn(`[Referral] Prevented self-referral for user ${referredUserId}`);
          return false;
        }
        const existing = await prisma.referralRelationship.findUnique({
          where: { referredUserId }
        });
        if (existing) return false;
        await prisma.$transaction([
          prisma.referralRelationship.create({
            data: {
              referrerId: referrerProfile.userId,
              referredUserId,
              referralCode: cleanCode
            }
          }),
          prisma.referralProfile.update({
            where: { id: referrerProfile.id },
            data: { totalReferred: { increment: 1 } }
          }),
          // Notify Referrer
          prisma.notification.create({
            data: {
              userId: referrerProfile.userId,
              title: "\u{1F389} B\u1EA1n c\xF3 1 ng\u01B0\u1EDDi b\u1EA1n m\u1EDBi \u0111\u0103ng k\xFD qua m\xE3 gi\u1EDBi thi\u1EC7u!",
              message: `M\u1ED9t ng\u01B0\u1EDDi b\u1EA1n v\u1EEBa \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n th\xE0nh c\xF4ng qua m\xE3 ${cleanCode}. Khi b\u1EA1n \u1EA5y ph\xE1t sinh \u0111\u01A1n h\xE0ng, b\u1EA1n s\u1EBD nh\u1EADn \u0111\u01B0\u1EE3c 20% hoa h\u1ED3ng!`,
              type: "info"
            }
          })
        ]);
        return true;
      }
      /**
       * Evaluates order payment approval: calculates 30% commission, records audit transaction
       */
      async processOrderApproved(orderId, orderAmount, customerUserId) {
        const prisma = getPrisma();
        const relationship = await prisma.referralRelationship.findUnique({
          where: { referredUserId: customerUserId }
        });
        if (!relationship) return null;
        if (relationship.referrerId === customerUserId) return null;
        const existingCommission = await prisma.referralCommission.findUnique({
          where: { orderId }
        });
        if (existingCommission) return null;
        const commissionRate = 0.2;
        const rewardAmount = Math.round(orderAmount * commissionRate);
        if (rewardAmount <= 0) return null;
        const referrerProfile = await this.getOrCreateProfile(relationship.referrerId);
        const [commission] = await prisma.$transaction([
          prisma.referralCommission.create({
            data: {
              referrerId: relationship.referrerId,
              referredUserId: customerUserId,
              orderId,
              orderAmount,
              commissionRate,
              rewardAmount,
              status: "Approved",
              approvedAt: /* @__PURE__ */ new Date()
            }
          }),
          prisma.referralProfile.update({
            where: { id: referrerProfile.id },
            data: {
              totalSales: { increment: orderAmount },
              totalCommission: { increment: rewardAmount },
              approvedReward: { increment: rewardAmount }
            }
          }),
          prisma.referralTransaction.create({
            data: {
              commissionId: "PENDING_ATTACH",
              // Replaced via custom step or separate insert
              type: "COMMISSION_APPROVED",
              amount: rewardAmount,
              previousBal: referrerProfile.approvedReward,
              newBal: referrerProfile.approvedReward + rewardAmount,
              reason: `Hoa h\u1ED3ng 20% t\u1EEB \u0111\u01A1n h\xE0ng ${orderId} (${orderAmount.toLocaleString("vi-VN")} \u20AB)`
            }
          }),
          // Send celebration notification to referrer
          prisma.notification.create({
            data: {
              userId: relationship.referrerId,
              title: "\u{1F4B0} Nh\u1EADn th\u01B0\u1EDFng hoa h\u1ED3ng gi\u1EDBi thi\u1EC7u 20%!",
              message: `Ch\xFAc m\u1EEBng b\u1EA1n! Ng\u01B0\u1EDDi b\u1EA1n b\u1EA1n gi\u1EDBi thi\u1EC7u v\u1EEBa thanh to\xE1n \u0111\u01A1n h\xE0ng. B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c +${rewardAmount.toLocaleString("vi-VN")} \u20AB hoa h\u1ED3ng v\xE0o v\xED th\u01B0\u1EDFng!`,
              type: "success"
            }
          })
        ]).catch(async () => {
          const comm = await prisma.referralCommission.create({
            data: {
              referrerId: relationship.referrerId,
              referredUserId: customerUserId,
              orderId,
              orderAmount,
              commissionRate,
              rewardAmount,
              status: "Approved",
              approvedAt: /* @__PURE__ */ new Date()
            }
          });
          await prisma.referralProfile.update({
            where: { id: referrerProfile.id },
            data: {
              totalSales: { increment: orderAmount },
              totalCommission: { increment: rewardAmount },
              approvedReward: { increment: rewardAmount }
            }
          });
          await prisma.referralTransaction.create({
            data: {
              commissionId: comm.id,
              type: "COMMISSION_APPROVED",
              amount: rewardAmount,
              previousBal: referrerProfile.approvedReward,
              newBal: referrerProfile.approvedReward + rewardAmount,
              reason: `Hoa h\u1ED3ng 20% t\u1EEB \u0111\u01A1n h\xE0ng ${orderId} (${orderAmount.toLocaleString("vi-VN")} \u20AB)`
            }
          });
          await prisma.notification.create({
            data: {
              userId: relationship.referrerId,
              title: "\u{1F4B0} Nh\u1EADn th\u01B0\u1EDFng hoa h\u1ED3ng gi\u1EDBi thi\u1EC7u 20%!",
              message: `Ch\xFAc m\u1EEBng b\u1EA1n! Ng\u01B0\u1EDDi b\u1EA1n b\u1EA1n gi\u1EDBi thi\u1EC7u v\u1EEBa thanh to\xE1n \u0111\u01A1n h\xE0ng. B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c +${rewardAmount.toLocaleString("vi-VN")} \u20AB hoa h\u1ED3ng v\xE0o v\xED th\u01B0\u1EDFng!`,
              type: "success"
            }
          });
          return [comm];
        });
        return commission;
      }
      /**
       * Adjusts / cancels commission when an order is cancelled or refunded
       */
      async processOrderCancelledOrRefunded(orderId, reasonText = "\u0110\u01A1n h\xE0ng b\u1ECB h\u1EE7y/ho\xE0n ti\u1EC1n") {
        const prisma = getPrisma();
        const commission = await prisma.referralCommission.findUnique({
          where: { orderId }
        });
        if (!commission || commission.status === "Cancelled") return false;
        const profile = await prisma.referralProfile.findUnique({
          where: { userId: commission.referrerId }
        });
        const deductAmount = commission.rewardAmount;
        await prisma.$transaction([
          prisma.referralCommission.update({
            where: { id: commission.id },
            data: {
              status: "Cancelled",
              cancelledAt: /* @__PURE__ */ new Date(),
              note: reasonText
            }
          }),
          ...profile ? [
            prisma.referralProfile.update({
              where: { id: profile.id },
              data: {
                totalSales: { decrement: commission.orderAmount },
                totalCommission: { decrement: deductAmount },
                approvedReward: { decrement: Math.min(profile.approvedReward, deductAmount) }
              }
            }),
            prisma.referralTransaction.create({
              data: {
                commissionId: commission.id,
                type: "COMMISSION_CANCELLED",
                amount: -deductAmount,
                previousBal: profile.approvedReward,
                newBal: Math.max(0, profile.approvedReward - deductAmount),
                reason: `H\u1EE7y th\u01B0\u1EDFng \u0111\u01A1n ${orderId}: ${reasonText}`
              }
            }),
            prisma.notification.create({
              data: {
                userId: commission.referrerId,
                title: "\u26A0\uFE0F \u0110i\u1EC1u ch\u1EC9nh hoa h\u1ED3ng gi\u1EDBi thi\u1EC7u",
                message: `Kho\u1EA3n hoa h\u1ED3ng ${deductAmount.toLocaleString("vi-VN")} \u20AB c\u1EE7a \u0111\u01A1n h\xE0ng ${orderId} \u0111\xE3 \u0111\u01B0\u1EE3c \u0111i\u1EC1u ch\u1EC9nh do: ${reasonText}.`,
                type: "warning"
              }
            })
          ] : []
        ]);
        return true;
      }
      /**
       * Retrieves full dashboard stats for a user
       */
      async getUserDashboard(userId, origin = "") {
        const prisma = getPrisma();
        const profile = await this.getOrCreateProfile(userId);
        const [relationships, commissions, paymentQr] = await Promise.all([
          prisma.referralRelationship.findMany({
            where: { referrerId: userId },
            include: {
              referredUser: {
                select: { name: true, email: true }
              }
            },
            orderBy: { createdAt: "desc" }
          }),
          prisma.referralCommission.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: "desc" }
          }),
          prisma.paymentQR.findUnique({
            where: { userId }
          })
        ]);
        const baseUrl = origin || getAppBaseUrl();
        const referralLink = `${baseUrl}/register?ref=${profile.referralCode}`;
        return {
          referralCode: profile.referralCode,
          referralLink,
          totalReferred: profile.totalReferred,
          totalSales: profile.totalSales,
          totalCommission: profile.totalCommission,
          pendingReward: profile.pendingReward,
          approvedReward: profile.approvedReward,
          withdrawalPending: profile.withdrawalPending,
          paidReward: profile.paidReward,
          paymentQr: paymentQr ? {
            id: paymentQr.id,
            qrUrl: paymentQr.qrUrl,
            fileName: paymentQr.fileName,
            fileSize: paymentQr.fileSize,
            mimeType: paymentQr.mimeType,
            bankName: paymentQr.bankName,
            bankAccount: paymentQr.bankAccount,
            accountHolder: paymentQr.accountHolder,
            status: paymentQr.status,
            rejectionReason: paymentQr.rejectionReason,
            uploadedAt: paymentQr.uploadedAt,
            updatedAt: paymentQr.updatedAt
          } : null,
          history: relationships.map((r) => ({
            id: r.id,
            referredUser: {
              name: r.referredUser.name || "Ng\u01B0\u1EDDi d\xF9ng",
              email: r.referredUser.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
              // Privacy mask
            },
            createdAt: r.createdAt
          })),
          commissions: commissions.map((c) => ({
            id: c.id,
            orderId: c.orderId,
            orderAmount: c.orderAmount,
            commissionRate: c.commissionRate,
            rewardAmount: c.rewardAmount,
            status: c.status,
            createdAt: c.createdAt,
            note: c.note
          }))
        };
      }
      /**
       * User requests bank withdrawal from available balance.
       * Atomically locks funds: reduces approvedReward and increases withdrawalPending.
       * Freezes snapshot of current active Payment QR.
       */
      async requestWithdrawal(userId, input) {
        const prisma = getPrisma();
        const { amount, bankName, bankAccount, accountHolder, transferNote, userNote } = input;
        if (!amount || amount <= 0) {
          throw new Error("S\u1ED1 ti\u1EC1n r\xFAt kh\xF4ng h\u1EE3p l\u1EC7");
        }
        if (amount < 5e4) {
          throw new Error("S\u1ED1 ti\u1EC1n r\xFAt t\u1ED1i thi\u1EC3u l\xE0 50.000 \u20AB");
        }
        if (!bankName || !bankAccount || !accountHolder) {
          throw new Error("Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin ng\xE2n h\xE0ng v\xE0 ch\u1EE7 t\xE0i kho\u1EA3n");
        }
        const profile = await this.getOrCreateProfile(userId);
        const [updatedProfile, request] = await prisma.$transaction(async (tx) => {
          const currentProfile = await tx.referralProfile.findUnique({
            where: { id: profile.id }
          });
          if (!currentProfile || currentProfile.approvedReward < amount) {
            throw new Error(`S\u1ED1 d\u01B0 kh\u1EA3 d\u1EE5ng kh\xF4ng \u0111\u1EE7 (${(currentProfile?.approvedReward || 0).toLocaleString("vi-VN")} \u20AB). Kh\xF4ng th\u1EC3 r\xFAt ${amount.toLocaleString("vi-VN")} \u20AB.`);
          }
          const activeQr = await tx.paymentQR.findUnique({
            where: { userId }
          });
          const updated = await tx.referralProfile.update({
            where: { id: profile.id },
            data: {
              approvedReward: { decrement: amount },
              withdrawalPending: { increment: amount }
            }
          });
          const newReq = await tx.withdrawalRequest.create({
            data: {
              userId,
              amount,
              bankName,
              bankAccount,
              accountHolder,
              transferNote: transferNote || `LifeOS Rut tien thuong - ${userId.substring(0, 8)}`,
              userNote,
              status: "PENDING",
              paymentQrUrl: activeQr?.qrUrl || null,
              balanceBefore: currentProfile.approvedReward
            }
          });
          await tx.referralTransaction.create({
            data: {
              userId,
              type: "WITHDRAWAL_REQUESTED",
              amount: -amount,
              previousBal: currentProfile.approvedReward,
              newBal: updated.approvedReward,
              reason: `Y\xEAu c\u1EA7u r\xFAt ${amount.toLocaleString("vi-VN")} \u20AB v\u1EC1 ${bankName} (${bankAccount})`
            }
          });
          await tx.auditLog.create({
            data: {
              adminId: userId,
              targetUserId: userId,
              action: "REFERRAL_WITHDRAWAL_REQUEST",
              beforeState: JSON.stringify({ approvedReward: currentProfile.approvedReward }),
              afterState: JSON.stringify({ requestId: newReq.id, amount, bankName, bankAccount }),
              result: "Success",
              reason: `Ng\u01B0\u1EDDi d\xF9ng t\u1EA1o y\xEAu c\u1EA7u r\xFAt ${amount.toLocaleString("vi-VN")} \u20AB`
            }
          });
          await tx.notification.create({
            data: {
              userId,
              title: "\u{1F4B8} \u0110\xE3 t\u1EA1o y\xEAu c\u1EA7u r\xFAt ti\u1EC1n",
              message: `Y\xEAu c\u1EA7u r\xFAt ${amount.toLocaleString("vi-VN")} \u20AB v\u1EC1 t\xE0i kho\u1EA3n ${bankName} - ${bankAccount} \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi. Admin s\u1EBD duy\u1EC7t v\xE0 gi\u1EA3i ng\xE2n s\u1EDBm!`,
              type: "info"
            }
          });
          return [updated, newReq];
        });
        return request;
      }
      /**
       * User: Get user's withdrawal requests
       */
      async getUserWithdrawals(userId) {
        const prisma = getPrisma();
        return prisma.withdrawalRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      }
      /**
       * Admin: List all withdrawal requests with user info and PaymentQR preview
       */
      async getAdminWithdrawals(status) {
        const prisma = getPrisma();
        const where = {};
        if (status && status !== "ALL") {
          where.status = status;
        }
        return prisma.withdrawalRequest.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                paymentQr: {
                  select: {
                    id: true,
                    qrUrl: true,
                    fileName: true,
                    status: true,
                    rejectionReason: true,
                    updatedAt: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        });
      }
      /**
       * Admin Approves Withdrawal: marks PAID, deducts withdrawalPending, adds to paidReward, logs txReference
       * Concurrency protected against race conditions, retries, and duplicate clicks (Idempotency).
       */
      async adminApproveWithdrawal(withdrawalId, adminEmail, txReference, proofUrl) {
        const prisma = getPrisma();
        const updatedRequest = await prisma.$transaction(async (tx) => {
          const existing = await tx.withdrawalRequest.findUnique({
            where: { id: withdrawalId },
            include: { user: true }
          });
          if (!existing) {
            throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u r\xFAt ti\u1EC1n");
          }
          if (existing.status !== "PENDING") {
            throw new Error(`Y\xEAu c\u1EA7u r\xFAt ti\u1EC1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD (tr\u1EA1ng th\xE1i: ${existing.status}). Kh\xF4ng th\u1EC3 th\u1EF1c hi\u1EC7n chi tr\u1EA3 tr\xF9ng.`);
          }
          const profile = await tx.referralProfile.findUnique({
            where: { userId: existing.userId }
          });
          if (!profile) {
            throw new Error("Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 hoa h\u1ED3ng c\u1EE7a ng\u01B0\u1EDDi d\xF9ng.");
          }
          const updated = await tx.withdrawalRequest.update({
            where: { id: withdrawalId },
            data: {
              status: "PAID",
              txReference: txReference || `TXN-${Date.now()}`,
              proofUrl: proofUrl || null,
              processedBy: adminEmail,
              processedAt: /* @__PURE__ */ new Date()
            }
          });
          await tx.referralProfile.update({
            where: { id: profile.id },
            data: {
              withdrawalPending: { decrement: Math.min(profile.withdrawalPending, existing.amount) },
              paidReward: { increment: existing.amount }
            }
          });
          await tx.referralTransaction.create({
            data: {
              withdrawalId,
              userId: existing.userId,
              type: "WITHDRAWAL_PAID",
              amount: existing.amount,
              previousBal: profile.approvedReward,
              newBal: profile.approvedReward,
              reason: `\u0110\xE3 gi\u1EA3i ng\xE2n chuy\u1EC3n kho\u1EA3n ${existing.amount.toLocaleString("vi-VN")} \u20AB (M\xE3 GD: ${txReference || "Chuy\u1EC3n kho\u1EA3n th\xE0nh c\xF4ng"})`
            }
          });
          await tx.auditLog.create({
            data: {
              adminId: adminEmail,
              targetUserId: existing.userId,
              action: "REFERRAL_WITHDRAWAL_PAID",
              beforeState: JSON.stringify({ status: existing.status, amount: existing.amount }),
              afterState: JSON.stringify({ status: "PAID", txReference: txReference || `TXN-${Date.now()}` }),
              result: "Success",
              reason: `Admin ${adminEmail} x\xE1c nh\u1EADn \u0111\xE3 chuy\u1EC3n kho\u1EA3n th\xE0nh c\xF4ng ${existing.amount.toLocaleString("vi-VN")} \u20AB`
            }
          });
          await tx.notification.create({
            data: {
              userId: existing.userId,
              title: "\u{1F389} Ti\u1EC1n th\u01B0\u1EDFng \u0111\xE3 \u0111\u01B0\u1EE3c chuy\u1EC3n kho\u1EA3n!",
              message: `Kho\u1EA3n r\xFAt ${existing.amount.toLocaleString("vi-VN")} \u20AB \u0111\xE3 \u0111\u01B0\u1EE3c chuy\u1EC3n t\u1EDBi ng\xE2n h\xE0ng ${existing.bankName} (${existing.bankAccount}). M\xE3 GD: ${txReference || "Th\xE0nh c\xF4ng"}.`,
              type: "success"
            }
          });
          return updated;
        });
        return updatedRequest;
      }
      /**
       * Admin Rejects Withdrawal: refunds locked money from withdrawalPending back to approvedReward
       * Concurrency protected.
       */
      async adminRejectWithdrawal(withdrawalId, adminEmail, reason) {
        const prisma = getPrisma();
        if (!reason || !reason.trim()) {
          throw new Error("Vui l\xF2ng nh\u1EADp l\xFD do t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u r\xFAt ti\u1EC1n");
        }
        const updatedRequest = await prisma.$transaction(async (tx) => {
          const existing = await tx.withdrawalRequest.findUnique({
            where: { id: withdrawalId },
            include: { user: true }
          });
          if (!existing) {
            throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u r\xFAt ti\u1EC1n");
          }
          if (existing.status !== "PENDING") {
            throw new Error(`Y\xEAu c\u1EA7u r\xFAt ti\u1EC1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c x\u1EED l\xFD (tr\u1EA1ng th\xE1i: ${existing.status}), kh\xF4ng th\u1EC3 t\u1EEB ch\u1ED1i.`);
          }
          const profile = await tx.referralProfile.findUnique({
            where: { userId: existing.userId }
          });
          if (!profile) {
            throw new Error("Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 hoa h\u1ED3ng c\u1EE7a ng\u01B0\u1EDDi d\xF9ng.");
          }
          const updated = await tx.withdrawalRequest.update({
            where: { id: withdrawalId },
            data: {
              status: "REJECTED",
              rejectReason: reason.trim(),
              processedBy: adminEmail,
              processedAt: /* @__PURE__ */ new Date()
            }
          });
          await tx.referralProfile.update({
            where: { id: profile.id },
            data: {
              withdrawalPending: { decrement: Math.min(profile.withdrawalPending, existing.amount) },
              approvedReward: { increment: existing.amount }
            }
          });
          await tx.referralTransaction.create({
            data: {
              withdrawalId,
              userId: existing.userId,
              type: "WITHDRAWAL_REJECTED",
              amount: existing.amount,
              previousBal: profile.approvedReward,
              newBal: profile.approvedReward + existing.amount,
              reason: `Ho\xE0n ti\u1EC1n y\xEAu c\u1EA7u r\xFAt b\u1ECB t\u1EEB ch\u1ED1i: ${reason.trim()}`
            }
          });
          await tx.auditLog.create({
            data: {
              adminId: adminEmail,
              targetUserId: existing.userId,
              action: "REFERRAL_WITHDRAWAL_REJECTED",
              beforeState: JSON.stringify({ status: existing.status, amount: existing.amount }),
              afterState: JSON.stringify({ status: "REJECTED", rejectReason: reason.trim() }),
              result: "Success",
              reason: reason.trim()
            }
          });
          await tx.notification.create({
            data: {
              userId: existing.userId,
              title: "\u26A0\uFE0F Y\xEAu c\u1EA7u r\xFAt ti\u1EC1n b\u1ECB t\u1EEB ch\u1ED1i - Ti\u1EC1n \u0111\xE3 ho\xE0n l\u1EA1i v\xED",
              message: `Y\xEAu c\u1EA7u r\xFAt ${existing.amount.toLocaleString("vi-VN")} \u20AB b\u1ECB t\u1EEB ch\u1ED1i: "${reason.trim()}". S\u1ED1 ti\u1EC1n \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n l\u1EA1i \u0111\u1EA7y \u0111\u1EE7 v\xE0o S\u1ED1 d\u01B0 kh\u1EA3 d\u1EE5ng.`,
              type: "warning"
            }
          });
          return updated;
        });
        return updatedRequest;
      }
      // =========================================================================
      // REQUIREMENT 133: PAYMENT QR (CUSTOMER & ADMIN MANAGEMENT)
      // =========================================================================
      /**
       * Retrieves user's active payment QR metadata
       */
      async getUserPaymentQr(userId) {
        const prisma = getPrisma();
        const qr = await prisma.paymentQR.findUnique({
          where: { userId }
        });
        return qr;
      }
      /**
       * Customer uploads or replaces their bank/payment QR image
       * Validates file format (PNG, JPG, WEBP), MIME type, extension, magic bytes, and max size (5MB).
       * Stores securely in Cloudflare R2 or secure base64 fallback.
       */
      async saveUserPaymentQr(userId, input) {
        const prisma = getPrisma();
        const { base64Data, fileName, mimeType, bankName, bankAccount, accountHolder } = input;
        if (!base64Data) {
          throw new Error("D\u1EEF li\u1EC7u \u1EA3nh QR kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.");
        }
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const ext = (fileName || "").substring((fileName || "").lastIndexOf("."));
        const validation = validateQrImageBuffer(buffer, mimeType || "image/png", ext);
        if (!validation.valid) {
          throw new Error(validation.error || "T\u1EADp tin \u1EA3nh kh\xF4ng h\u1EE3p l\u1EC7.");
        }
        let qrUrl = "";
        let storageKey = null;
        if (r2Service.isConfigured()) {
          try {
            const uploadResult = await r2Service.uploadFile(
              buffer,
              fileName || `qr-${Date.now()}.png`,
              mimeType || "image/png",
              userId,
              "payment-qrs"
            );
            qrUrl = uploadResult.url;
            storageKey = uploadResult.key;
          } catch (err) {
            console.warn("[PaymentQR] R2 upload error, falling back to base64 data URI:", err);
            qrUrl = `data:${mimeType};base64,${cleanBase64}`;
          }
        } else {
          qrUrl = `data:${mimeType};base64,${cleanBase64}`;
        }
        const paymentQr = await prisma.paymentQR.upsert({
          where: { userId },
          create: {
            userId,
            qrUrl,
            storageKey,
            fileName: fileName || "payment-qr.png",
            fileSize: buffer.length,
            mimeType: mimeType || "image/png",
            bankName: bankName?.trim() || null,
            bankAccount: bankAccount?.trim() || null,
            accountHolder: accountHolder?.trim()?.toUpperCase() || null,
            status: "PENDING_VERIFICATION"
          },
          update: {
            qrUrl,
            storageKey,
            fileName: fileName || "payment-qr.png",
            fileSize: buffer.length,
            mimeType: mimeType || "image/png",
            bankName: bankName?.trim() || null,
            bankAccount: bankAccount?.trim() || null,
            accountHolder: accountHolder?.trim()?.toUpperCase() || null,
            status: "PENDING_VERIFICATION",
            rejectionReason: null,
            verifiedBy: null,
            verifiedAt: null
          }
        });
        await prisma.auditLog.create({
          data: {
            adminId: userId,
            targetUserId: userId,
            action: "PAYMENT_QR_UPLOAD",
            afterState: JSON.stringify({ id: paymentQr.id, status: paymentQr.status, fileName }),
            result: "Success",
            reason: "Ng\u01B0\u1EDDi d\xF9ng t\u1EA3i l\xEAn/c\u1EADp nh\u1EADt QR nh\u1EADn hoa h\u1ED3ng"
          }
        });
        return paymentQr;
      }
      /**
       * Customer deletes their payment QR if not currently locked in an active processing payout
       */
      async deleteUserPaymentQr(userId) {
        const prisma = getPrisma();
        const qr = await prisma.paymentQR.findUnique({
          where: { userId }
        });
        if (!qr) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y m\xE3 QR thanh to\xE1n \u0111\u1EC3 x\xF3a.");
        }
        const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
          where: { userId, status: "PENDING" }
        });
        if (pendingWithdrawal) {
          throw new Error("B\u1EA1n \u0111ang c\xF3 y\xEAu c\u1EA7u r\xFAt ti\u1EC1n \u0111ang ch\u1EDD x\u1EED l\xFD. Kh\xF4ng th\u1EC3 x\xF3a m\xE3 QR l\xFAc n\xE0y.");
        }
        if (qr.storageKey && r2Service.isConfigured()) {
          try {
            await r2Service.deleteFile(qr.storageKey, userId, false);
          } catch (err) {
            console.warn("[PaymentQR] Failed to delete file from R2:", err);
          }
        }
        await prisma.paymentQR.delete({
          where: { userId }
        });
        await prisma.auditLog.create({
          data: {
            adminId: userId,
            targetUserId: userId,
            action: "PAYMENT_QR_DELETE",
            beforeState: JSON.stringify({ id: qr.id, fileName: qr.fileName }),
            result: "Success",
            reason: "Ng\u01B0\u1EDDi d\xF9ng x\xF3a m\xE3 QR nh\u1EADn hoa h\u1ED3ng"
          }
        });
        return true;
      }
      /**
       * Admin: List all customer payment QRs with filtering & search
       */
      async getAdminPaymentQrs(status, search) {
        const prisma = getPrisma();
        const where = {};
        if (status && status !== "ALL") {
          where.status = status;
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          where.user = {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          };
        }
        return prisma.paymentQR.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { updatedAt: "desc" }
        });
      }
      /**
       * Admin approves/verifies customer QR as valid for payouts
       */
      async adminVerifyPaymentQr(qrId, adminEmail) {
        const prisma = getPrisma();
        const qr = await prisma.paymentQR.findUnique({
          where: { id: qrId },
          include: { user: true }
        });
        if (!qr) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y m\xE3 QR.");
        }
        const updated = await prisma.paymentQR.update({
          where: { id: qrId },
          data: {
            status: "VERIFIED",
            verifiedBy: adminEmail,
            verifiedAt: /* @__PURE__ */ new Date(),
            rejectionReason: null
          }
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminEmail,
            targetUserId: qr.userId,
            action: "PAYMENT_QR_VERIFIED",
            beforeState: JSON.stringify({ status: qr.status }),
            afterState: JSON.stringify({ status: "VERIFIED", verifiedBy: adminEmail }),
            result: "Success",
            reason: "Admin x\xE1c nh\u1EADn m\xE3 QR h\u1EE3p l\u1EC7"
          }
        });
        await prisma.notification.create({
          data: {
            userId: qr.userId,
            title: "\u2705 QR nh\u1EADn hoa h\u1ED3ng \u0111\xE3 \u0111\u01B0\u1EE3c x\xE1c minh",
            message: "M\xE3 QR t\xE0i kho\u1EA3n nh\u1EADn ti\u1EC1n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c Admin x\xE1c minh h\u1EE3p l\u1EC7. B\u1EA1n c\xF3 th\u1EC3 y\xEAn t\xE2m nh\u1EADn hoa h\u1ED3ng!",
            type: "success"
          }
        });
        return updated;
      }
      /**
       * Admin rejects customer QR with mandatory reason and requests update
       */
      async adminRejectPaymentQr(qrId, adminEmail, reason) {
        const prisma = getPrisma();
        if (!reason || !reason.trim()) {
          throw new Error("B\u1EAFt bu\u1ED9c ph\u1EA3i nh\u1EADp l\xFD do t\u1EEB ch\u1ED1i ho\u1EB7c y\xEAu c\u1EA7u c\u1EADp nh\u1EADt QR.");
        }
        const qr = await prisma.paymentQR.findUnique({
          where: { id: qrId },
          include: { user: true }
        });
        if (!qr) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y m\xE3 QR.");
        }
        const updated = await prisma.paymentQR.update({
          where: { id: qrId },
          data: {
            status: "REJECTED",
            rejectionReason: reason.trim(),
            verifiedBy: adminEmail,
            verifiedAt: /* @__PURE__ */ new Date()
          }
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminEmail,
            targetUserId: qr.userId,
            action: "PAYMENT_QR_REJECTED",
            beforeState: JSON.stringify({ status: qr.status }),
            afterState: JSON.stringify({ status: "REJECTED", rejectionReason: reason.trim() }),
            result: "Success",
            reason: reason.trim()
          }
        });
        await prisma.notification.create({
          data: {
            userId: qr.userId,
            title: "\u26A0\uFE0F C\u1EA7n c\u1EADp nh\u1EADt l\u1EA1i QR nh\u1EADn hoa h\u1ED3ng",
            message: `M\xE3 QR c\u1EE7a b\u1EA1n c\u1EA7n \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt l\u1EA1i: "${reason.trim()}". Vui l\xF2ng t\u1EA3i l\xEAn \u1EA3nh QR r\xF5 n\xE9t h\u01A1n.`,
            type: "warning"
          }
        });
        return updated;
      }
      /**
       * Admin: List all referral programs & commissions
       */
      async getAdminOverview() {
        const prisma = getPrisma();
        const [profiles, allCommissions, totalStats, pendingWithdrawalsCount, totalPaidStats] = await Promise.all([
          prisma.referralProfile.findMany({
            include: {
              user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { totalCommission: "desc" },
            take: 50
          }),
          prisma.referralCommission.findMany({
            include: {
              referrer: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 100
          }),
          prisma.referralCommission.aggregate({
            _sum: { orderAmount: true, rewardAmount: true },
            _count: { id: true }
          }),
          prisma.withdrawalRequest.count({
            where: { status: "PENDING" }
          }),
          prisma.withdrawalRequest.aggregate({
            where: { status: "PAID" },
            _sum: { amount: true }
          })
        ]);
        return {
          totalOrders: totalStats._count.id || 0,
          totalSales: totalStats._sum.orderAmount || 0,
          totalCommissionGiven: totalStats._sum.rewardAmount || 0,
          pendingWithdrawalsCount,
          totalPaidOut: totalPaidStats._sum.amount || 0,
          profiles,
          commissions: allCommissions
        };
      }
    };
    referralService = new ReferralService();
  }
});

// src/backend/services/subscription.service.ts
var subscription_service_exports = {};
__export(subscription_service_exports, {
  OFFICIAL_PLANS: () => OFFICIAL_PLANS,
  subscriptionService: () => subscriptionService
});
var OFFICIAL_PLANS, subscriptionService;
var init_subscription_service = __esm({
  "src/backend/services/subscription.service.ts"() {
    init_db();
    init_gmailNotification_service();
    init_emailQueue_service();
    init_emailTemplate_service();
    OFFICIAL_PLANS = [
      {
        id: "PERSONAL_1M",
        name: "G\xF3i C\xE1 Nh\xE2n (1 Th\xE1ng)",
        type: "PERSONAL",
        durationDays: 30,
        price: 29e3,
        monthlyPrice: 29e3,
        yearlyPrice: 0,
        billingCycle: "1 th\xE1ng (30 ng\xE0y)",
        badge: "Ti\u1EBFt ki\u1EC7m",
        description: "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS trong 1 th\xE1ng (30 ng\xE0y). B\u1EAFt bu\u1ED9c c\xF3 g\xF3i tr\u1EA3 ph\xED \u0111\u1EC3 truy c\u1EADp h\u1EC7 th\u1ED1ng.",
        order: 1,
        status: "ACTIVE",
        features: [
          "To\xE0n b\u1ED9 t\xEDnh n\u0103ng Qu\u1EA3n l\xFD C\xF4ng vi\u1EC7c & D\u1EF1 \xE1n (Kanban, L\u1ECBch, B\u1ED9 l\u1ECDc)",
          "Qu\u1EA3n l\xFD T\xE0i ch\xEDnh, V\xED ti\u1EC1n, Ng\xE2n s\xE1ch v\xE0 B\xE1o c\xE1o thu chi",
          "Theo d\xF5i Th\xF3i quen, Chu\u1ED7i streak v\xE0 M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng",
          "Decision Engine & M\xF4 ph\u1ECFng k\u1ECBch b\u1EA3n What-if",
          "Automation Rules Engine k\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng",
          "Kh\xF4ng gian H\u1ECDc t\u1EADp, Pomodoro Focus v\xE0 Ghi ch\xFA kh\xF4ng gi\u1EDBi h\u1EA1n",
          "\u0110\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u th\u1EDDi gian th\u1EF1c v\xE0 t\u1EF1 \u0111\u1ED9ng sao l\u01B0u an to\xE0n"
        ],
        quota: "1 ng\u01B0\u1EDDi d\xF9ng, kh\xF4ng gi\u1EDBi h\u1EA1n t\xEDnh n\u0103ng"
      },
      {
        id: "PERSONAL_3M",
        name: "G\xF3i C\xE1 Nh\xE2n (3 Th\xE1ng)",
        type: "PERSONAL",
        durationDays: 90,
        price: 79e3,
        monthlyPrice: 79e3,
        yearlyPrice: 0,
        billingCycle: "3 th\xE1ng (90 ng\xE0y)",
        badge: "Ph\u1ED5 bi\u1EBFn nh\u1EA5t",
        description: "M\u1EDF kh\xF3a to\xE0n b\u1ED9 t\xEDnh n\u0103ng trong 3 th\xE1ng li\xEAn t\u1EE5c v\u1EDBi chi ph\xED ti\u1EBFt ki\u1EC7m h\u01A1n.",
        order: 2,
        status: "ACTIVE",
        features: [
          "Bao g\u1ED3m to\xE0n b\u1ED9 quy\u1EC1n l\u1EE3i c\u1EE7a G\xF3i C\xE1 Nh\xE2n 1 Th\xE1ng",
          "Th\u1EDDi h\u1EA1n s\u1EED d\u1EE5ng 90 ng\xE0y li\xEAn t\u1EE5c",
          "Ti\u1EBFt ki\u1EC7m 8.000 VN\u0110 so v\u1EDBi gia h\u1EA1n t\u1EEBng th\xE1ng",
          "\u0110\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u th\u1EDDi gian th\u1EF1c v\xE0 sao l\u01B0u t\u1EF1 \u0111\u1ED9ng",
          "H\u1ED7 tr\u1EE3 k\u1EF9 thu\u1EADt \u01B0u ti\xEAn 24/7"
        ],
        quota: "1 ng\u01B0\u1EDDi d\xF9ng, 90 ng\xE0y li\xEAn t\u1EE5c"
      },
      {
        id: "TEAM_1M",
        name: "G\xF3i \u0110\u1ED9i Ng\u0169 (Team 1 Th\xE1ng)",
        type: "TEAM",
        durationDays: 30,
        price: 99e3,
        monthlyPrice: 99e3,
        yearlyPrice: 0,
        billingCycle: "1 th\xE1ng (30 ng\xE0y)",
        badge: "D\xE0nh cho \u0110\u1ED9i ng\u0169",
        maxTeamMembers: 5,
        description: "D\xE0nh cho \u0111\u1ED9i ng\u0169 c\u1ED9ng t\xE1c. Ch\u1EE7 team \u0111\u01B0\u1EE3c m\u1EDDi th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng c\xF9ng s\u1EED d\u1EE5ng \u0111\u1EA7y \u0111\u1EE7 ch\u1EE9c n\u0103ng.",
        order: 3,
        status: "ACTIVE",
        features: [
          "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS cho Ch\u1EE7 Team",
          "Cho ph\xE9p Ch\u1EE7 Team th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng v\xE0o Team",
          "T\u1EA5t c\u1EA3 th\xE0nh vi\xEAn trong Team \u0111\u01B0\u1EE3c h\u01B0\u1EDFng to\xE0n b\u1ED9 t\xEDnh n\u0103ng tr\u1EA3 ph\xED",
          "Ch\u1EE7 Team c\xF3 to\xE0n quy\u1EC1n qu\u1EA3n tr\u1ECB, th\xEAm/x\xF3a th\xE0nh vi\xEAn linh ho\u1EA1t",
          "T\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 quy\u1EC1n h\u1EA1n khi g\xF3i Team c\xF2n h\u1EA1n"
        ],
        quota: "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn / nh\xF3m"
      },
      {
        id: "PRO",
        name: "Pro",
        type: "PERSONAL",
        durationDays: 30,
        price: 199e3,
        monthlyPrice: 199e3,
        yearlyPrice: 199e4,
        billingCycle: "30 ng\xE0y",
        badge: "Chuy\xEAn nghi\u1EC7p",
        description: "G\xF3i chuy\xEAn nghi\u1EC7p Pro cho c\xE1 nh\xE2n qu\u1EA3n l\xFD to\xE0n di\u1EC7n.",
        order: 4,
        status: "ACTIVE",
        features: [
          "To\xE0n b\u1ED9 t\xEDnh n\u0103ng Qu\u1EA3n l\xFD C\xF4ng vi\u1EC7c & D\u1EF1 \xE1n (Kanban, L\u1ECBch, B\u1ED9 l\u1ECDc)",
          "Qu\u1EA3n l\xFD T\xE0i ch\xEDnh, V\xED ti\u1EC1n, Ng\xE2n s\xE1ch v\xE0 B\xE1o c\xE1o thu chi",
          "Theo d\xF5i Th\xF3i quen, Chu\u1ED7i streak v\xE0 M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng",
          "Decision Engine & M\xF4 ph\u1ECFng k\u1ECBch b\u1EA3n What-if",
          "Automation Rules Engine k\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng",
          "Kh\xF4ng gian H\u1ECDc t\u1EADp, Pomodoro Focus v\xE0 Ghi ch\xFA kh\xF4ng gi\u1EDBi h\u1EA1n"
        ],
        quota: "1 ng\u01B0\u1EDDi d\xF9ng, kh\xF4ng gi\u1EDBi h\u1EA1n t\xEDnh n\u0103ng"
      },
      {
        id: "TEAM",
        name: "Team",
        type: "TEAM",
        durationDays: 30,
        price: 499e3,
        monthlyPrice: 499e3,
        yearlyPrice: 499e4,
        billingCycle: "30 ng\xE0y",
        badge: "D\xE0nh cho \u0110\u1ED9i ng\u0169",
        maxTeamMembers: 5,
        description: "D\xE0nh cho doanh nghi\u1EC7p v\xE0 \u0111\u1ED9i ng\u0169 c\u1ED9ng t\xE1c kh\xF4ng gi\u1EDBi h\u1EA1n.",
        order: 5,
        status: "ACTIVE",
        features: [
          "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS cho Ch\u1EE7 Team",
          "Cho ph\xE9p Ch\u1EE7 Team th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng v\xE0o Team"
        ],
        quota: "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn / nh\xF3m"
      }
    ];
    subscriptionService = {
      /**
       * Authoritative Single Source of Truth for Service Plans.
       * Dynamically loads from DB SystemSetting ('service_plans_config'),
       * ensuring Admin pricing and feature updates are immediately reflected everywhere.
       */
      async getPlans(includeInactive = false) {
        try {
          const prisma = getPrisma();
          const setting = await prisma.systemSetting.findUnique({
            where: { key: "service_plans_config" }
          });
          if (setting && setting.value) {
            const parsed = JSON.parse(setting.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map((p, idx) => {
                const id = String(p.id).toUpperCase();
                const isTeam = id.includes("TEAM") || p.type === "TEAM";
                const durationDays = Number(p.durationDays) || (id === "PERSONAL_3M" ? 90 : 30);
                const price = Number(p.monthlyPrice !== void 0 ? p.monthlyPrice : p.price ?? 0);
                const yearlyPrice = Number(p.yearlyPrice ?? 0);
                return {
                  id: p.id,
                  name: p.name || id,
                  type: isTeam ? "TEAM" : "PERSONAL",
                  durationDays,
                  price,
                  monthlyPrice: price,
                  yearlyPrice,
                  billingCycle: p.billingCycle || (durationDays === 90 ? "3 th\xE1ng (90 ng\xE0y)" : "1 th\xE1ng (30 ng\xE0y)"),
                  badge: p.badge || (isTeam ? "D\xE0nh cho \u0110\u1ED9i ng\u0169" : durationDays === 90 ? "Ph\u1ED5 bi\u1EBFn nh\u1EA5t" : "Ti\u1EBFt ki\u1EC7m"),
                  description: p.description || "",
                  features: Array.isArray(p.features) ? p.features : [],
                  quota: p.quota || (isTeam ? "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn" : "1 ng\u01B0\u1EDDi d\xF9ng"),
                  maxTeamMembers: isTeam ? p.maxTeamMembers || 5 : 0,
                  status: p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
                  order: Number(p.order ?? idx + 1),
                  updatedAt: p.updatedAt,
                  updatedBy: p.updatedBy
                };
              });
              const filtered = includeInactive ? mapped : mapped.filter((p) => p.status === "ACTIVE");
              return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
          }
        } catch (err) {
          console.warn("[subscriptionService] Could not read service_plans_config from DB:", err);
        }
        const filteredDefaults = includeInactive ? OFFICIAL_PLANS : OFFICIAL_PLANS.filter((p) => p.status !== "INACTIVE");
        return filteredDefaults.sort((a, b) => (a.order || 0) - (b.order || 0));
      },
      /**
       * Synchronous fallback getter for backward-compatibility with tests / offline initialization
       */
      getPlansSync() {
        return OFFICIAL_PLANS;
      },
      /**
       * Retrieve authoritative plan configuration by ID
       */
      async getPlanById(planId) {
        const cleanId = String(planId || "").toUpperCase().trim();
        const allPlans = await this.getPlans(true);
        let found = allPlans.find((p) => p.id.toUpperCase() === cleanId);
        if (!found) {
          if (cleanId === "PRO") found = allPlans.find((p) => p.id === "PERSONAL_1M" || p.id === "PRO");
          if (cleanId === "TEAM") found = allPlans.find((p) => p.id === "TEAM_1M" || p.id === "TEAM");
        }
        return found;
      },
      /**
       * Check whether Global Free Trial Mode is activated across the whole system.
       * Persisted in PostgreSQL database (system_settings table).
       */
      async isGlobalFreeMode() {
        const prisma = getPrisma();
        try {
          const setting = await prisma.systemSetting.findUnique({
            where: { key: "global_free_mode" }
          });
          return setting?.value === "true";
        } catch {
          return false;
        }
      },
      /**
       * Toggle Global Free Trial Mode ON/OFF.
       * Persisted in PostgreSQL database, logs audit trail, and automatically dispatches
       * guaranteed security email notification to Admin via persistent Outbox Queue.
       */
      async setGlobalFreeMode(enabled, adminUser) {
        const prisma = getPrisma();
        const strVal = enabled ? "true" : "false";
        const now = /* @__PURE__ */ new Date();
        const setting = await prisma.systemSetting.upsert({
          where: { key: "global_free_mode" },
          update: { value: strVal, updatedAt: now },
          create: { key: "global_free_mode", value: strVal, updatedAt: now }
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminUser.id,
            action: "TOGGLE_GLOBAL_FREE_MODE",
            beforeState: null,
            afterState: JSON.stringify({ enabled, updatedAt: now }),
            result: "Success",
            reason: `Admin ${adminUser.name} (${adminUser.email}) \u0111\xE3 ${enabled ? "B\u1EACT" : "T\u1EAET"} ch\u1EBF \u0111\u1ED9 D\xF9ng th\u1EED Free to\xE0n h\u1EC7 th\u1ED1ng.`
          }
        });
        const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.INITIAL_ADMIN_EMAIL || adminUser.email;
        const emailHtml = buildEmailHtml({
          headline: `C\u1EA2NH B\xC1O B\u1EA2O M\u1EACT: Ch\u1EBF \u0111\u1ED9 D\xF9ng Th\u1EED Mi\u1EC5n Ph\xED To\xE0n H\u1EC7 Th\u1ED1ng \u0111\xE3 \u0111\u01B0\u1EE3c ${enabled ? "B\u1EACT" : "T\u1EAET"}`,
          previewText: `Ch\u1EBF \u0111\u1ED9 D\xF9ng th\u1EED Free to\xE0n h\u1EC7 th\u1ED1ng \u0111\xE3 thay \u0111\u1ED5i th\xE0nh: ${enabled ? "B\u1EACT (M\u1EDF kh\xF3a 100%)" : "T\u1EAET (Kh\xF3a v\u1EDBi user ch\u01B0a mua)"}`,
          priority: "CRITICAL",
          badgeText: enabled ? "FREE TRIAL MODE ACTIVATED" : "FREE TRIAL MODE DEACTIVATED",
          greeting: `K\xEDnh g\u1EEDi Ban Qu\u1EA3n Tr\u1ECB LifeOS,`,
          paragraphs: [
            `C\xF4ng t\u1EAFc <strong>"Cho ph\xE9p t\u1EA5t c\u1EA3 m\u1ECDi ng\u01B0\u1EDDi d\xF9ng th\u1EED mi\u1EC5n ph\xED to\xE0n b\u1ED9 t\xEDnh n\u0103ng"</strong> v\u1EEBa \u0111\u01B0\u1EE3c thay \u0111\u1ED5i tr\u1EA1ng th\xE1i trong trang Qu\u1EA3n tr\u1ECB.`,
            enabled ? `\u26A0\uFE0F <strong>Tr\u1EA1ng th\xE1i hi\u1EC7n t\u1EA1i: \u0110ANG B\u1EACT</strong>. T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi d\xF9ng (k\u1EC3 c\u1EA3 ch\u01B0a mua g\xF3i) \u0111\u1EC1u c\xF3 quy\u1EC1n truy c\u1EADp 100% t\xEDnh n\u0103ng c\u1EE7a h\u1EC7 th\u1ED1ng. D\u1EEF li\u1EC7u g\xF3i c\u1EE7a nh\u1EEFng kh\xE1ch h\xE0ng \u0111\xE3 mua tr\u01B0\u1EDBc \u0111\xF3 v\u1EABn \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n.` : `\u{1F512} <strong>Tr\u1EA1ng th\xE1i hi\u1EC7n t\u1EA1i: \u0110ANG T\u1EAET</strong>. H\u1EC7 th\u1ED1ng \u0111\xE3 kh\xF3a l\u1EA1i quy\u1EC1n truy c\u1EADp \u0111\u1ED1i v\u1EDBi c\xE1c t\xE0i kho\u1EA3n ch\u01B0a mua g\xF3i tr\u1EA3 ph\xED. Nh\u1EEFng kh\xE1ch h\xE0ng \u0111\xE3 mua g\xF3i h\u1EE3p l\u1EC7 v\u1EABn ti\u1EBFp t\u1EE5c s\u1EED d\u1EE5ng b\xECnh th\u01B0\u1EDDng.`
          ],
          detailsTable: [
            { label: "Tr\u1EA1ng th\xE1i m\u1EDBi", value: enabled ? "B\u1EACT (Cho ph\xE9p d\xF9ng th\u1EED FREE)" : "T\u1EAET (B\u1EAFt bu\u1ED9c mua g\xF3i)" },
            { label: "Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n", value: `${adminUser.name} (${adminUser.email})` },
            { label: "\u0110\u1ECBa ch\u1EC9 IP", value: adminUser.ip || "Local / Internal" },
            { label: "Th\u1EDDi gian \xE1p d\u1EE5ng", value: now.toLocaleString("vi-VN") }
          ],
          ctaButton: {
            label: "M\u1EDF Trang Qu\u1EA3n Tr\u1ECB H\u1EC7 Th\u1ED1ng",
            url: (process.env.APP_URL || "http://localhost:3000") + "/admin"
          },
          footerNote: "\u0110\xE2y l\xE0 th\xF4ng b\xE1o an ninh quan tr\u1ECDng \u0111\u01B0\u1EE3c g\u1EEDi t\u1EF1 \u0111\u1ED9ng t\u1EEB LifeOS Security Center khi c\u1EA5u h\xECnh h\u1EC7 th\u1ED1ng thay \u0111\u1ED5i."
        });
        await emailQueueService.enqueue({
          recipient: adminNotificationEmail,
          subject: `[LifeOS Security] C\u1EA3nh b\xE1o: C\xF4ng t\u1EAFc D\xF9ng th\u1EED Free to\xE0n h\u1EC7 th\u1ED1ng \u0111\xE3 \u0111\u01B0\u1EE3c ${enabled ? "B\u1EACT" : "T\u1EAET"}`,
          htmlBody: emailHtml,
          eventType: "SECURITY_ALERT",
          metadata: { adminId: adminUser.id, action: "TOGGLE_GLOBAL_FREE_MODE", enabled }
        });
        return { enabled, updatedAt: setting.updatedAt };
      },
      /**
       * Zero-Trust Subscription Verification & Lazy Expiration Enforcement
       * 1. Checks current database state without relying on client localStorage or cookies.
       * 2. Automatically updates expired subscriptions to EXPIRED in the database upon check.
       * 3. Blocks expired accounts immediately, keeping access restricted to billing/renewal.
       */
      async checkUserSubscription(userId) {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            plan: true,
            planExpiresAt: true,
            status: true,
            trialStartedAt: true,
            trialEndsAt: true,
            trialUsed: true
          }
        });
        if (!user) {
          return {
            hasAccess: false,
            lifecycleStatus: "UNPAID",
            planId: "NONE",
            planType: "NONE",
            planName: "Kh\xF4ng x\xE1c \u0111\u1ECBnh",
            status: "NONE",
            remainingDays: 0
          };
        }
        if (user.status === "DISABLED") {
          return {
            hasAccess: false,
            lifecycleStatus: "DISABLED",
            planId: "DISABLED",
            planType: "NONE",
            planName: "T\xE0i kho\u1EA3n v\xF4 hi\u1EC7u h\xF3a",
            status: "NONE",
            remainingDays: 0,
            role: user.role
          };
        }
        if (user.status === "SUSPENDED") {
          return {
            hasAccess: false,
            lifecycleStatus: "SUSPENDED",
            planId: "SUSPENDED",
            planType: "NONE",
            planName: "T\xE0i kho\u1EA3n t\u1EA1m kh\xF3a",
            status: "NONE",
            remainingDays: 0,
            role: user.role
          };
        }
        if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
          return {
            hasAccess: true,
            lifecycleStatus: "ACTIVE",
            planId: "ADMIN",
            planType: "TEAM",
            planName: "Qu\u1EA3n tr\u1ECB vi\xEAn H\u1EC7 th\u1ED1ng",
            status: "ACTIVE",
            remainingDays: 9999,
            role: user.role
          };
        }
        const activePending = await prisma.payment.findFirst({
          where: { userId, status: "PENDING" },
          orderBy: { createdAt: "desc" }
        });
        const isFreeMode = await this.isGlobalFreeMode();
        if (isFreeMode) {
          return {
            hasAccess: true,
            lifecycleStatus: "ACTIVE",
            planId: user.plan === "FREE" ? "FREE_TRIAL_GLOBAL" : user.plan,
            planType: user.plan?.includes("TEAM") ? "TEAM" : "PERSONAL",
            planName: user.plan === "FREE" ? "D\xF9ng th\u1EED To\xE0n H\u1EC7 th\u1ED1ng (Admin Open)" : user.plan || "G\xF3i C\xE1 Nh\xE2n",
            status: "ACTIVE",
            remainingDays: 365,
            isGlobalFreeMode: true,
            role: user.role,
            activePending: activePending || null
          };
        }
        const expiredActiveSubs = await prisma.subscription.findMany({
          where: {
            userId,
            status: "ACTIVE",
            endDate: { lte: now }
          }
        });
        if (expiredActiveSubs.length > 0) {
          await prisma.subscription.updateMany({
            where: { id: { in: expiredActiveSubs.map((s) => s.id) } },
            data: { status: "EXPIRED" }
          });
          const remainingActiveSub = await prisma.subscription.findFirst({
            where: {
              userId,
              status: "ACTIVE",
              endDate: { gt: now }
            }
          });
          if (!remainingActiveSub) {
            await prisma.user.update({
              where: { id: userId },
              data: { plan: "FREE", planExpiresAt: null }
            });
            user.plan = "FREE";
            user.planExpiresAt = null;
          }
        }
        const directSub = await prisma.subscription.findFirst({
          where: {
            userId,
            paymentStatus: "PAID",
            status: "ACTIVE",
            endDate: { gt: now }
          },
          orderBy: { endDate: "desc" },
          include: {
            team: true
          }
        });
        if (directSub) {
          const remainingDays = Math.max(0, Math.ceil((new Date(directSub.endDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
          return {
            hasAccess: true,
            lifecycleStatus: "ACTIVE",
            planId: directSub.planId,
            planType: directSub.planType || (directSub.planId.includes("TEAM") ? "TEAM" : "PERSONAL"),
            planName: directSub.planName,
            status: "ACTIVE",
            amount: directSub.amount,
            startDate: directSub.startDate.toISOString(),
            endDate: directSub.endDate.toISOString(),
            remainingDays,
            isTeamOwner: directSub.planType === "TEAM" || directSub.planId.includes("TEAM"),
            isTeamMember: false,
            teamId: directSub.team?.id,
            teamName: directSub.team?.name,
            subscriptionId: directSub.id,
            activePending: activePending || null
          };
        }
        const membership = await prisma.teamMember.findFirst({
          where: { userId },
          include: {
            team: {
              include: {
                owner: { select: { id: true, email: true, name: true } },
                subscription: true
              }
            }
          }
        });
        if (membership && membership.team) {
          const team = membership.team;
          const teamSub = team.subscription;
          if (teamSub && teamSub.status === "ACTIVE" && teamSub.paymentStatus === "PAID" && new Date(teamSub.endDate).getTime() > now.getTime()) {
            const remainingDays = Math.max(0, Math.ceil((new Date(teamSub.endDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
            return {
              hasAccess: true,
              lifecycleStatus: "ACTIVE",
              planId: teamSub.planId,
              planType: "TEAM",
              planName: `${teamSub.planName} (Th\xE0nh vi\xEAn nh\xF3m)`,
              status: "ACTIVE",
              amount: teamSub.amount,
              startDate: teamSub.startDate.toISOString(),
              endDate: teamSub.endDate.toISOString(),
              remainingDays,
              isTeamOwner: false,
              isTeamMember: true,
              teamId: team.id,
              teamName: team.name,
              teamOwnerEmail: team.owner.email,
              subscriptionId: teamSub.id,
              activePending: activePending || null
            };
          }
        }
        const anySubRecord = await prisma.subscription.findFirst({ where: { userId } });
        if (!anySubRecord && user.plan && user.plan !== "FREE") {
          if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() > now.getTime()) {
            const remainingDays = Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
            return {
              hasAccess: true,
              lifecycleStatus: "ACTIVE",
              planId: user.plan,
              planType: user.plan === "TEAM" ? "TEAM" : "PERSONAL",
              planName: user.plan === "TEAM" ? "G\xF3i \u0110\u1ED9i Ng\u0169" : "G\xF3i Pro C\xE1 Nh\xE2n",
              status: "ACTIVE",
              remainingDays,
              role: user.role,
              activePending: activePending || null
            };
          } else {
            await prisma.user.update({
              where: { id: userId },
              data: { plan: "FREE", planExpiresAt: null }
            });
          }
        } else if (anySubRecord && user.plan !== "FREE") {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: "FREE", planExpiresAt: null }
          });
          user.plan = "FREE";
          user.planExpiresAt = null;
        }
        if (user.trialEndsAt) {
          const trialEndMs = new Date(user.trialEndsAt).getTime();
          const nowMs = now.getTime();
          if (trialEndMs > nowMs) {
            const remainingDiff = trialEndMs - nowMs;
            const remainingDays = Math.max(1, Math.ceil(remainingDiff / (1e3 * 60 * 60 * 24)));
            const remainingHours = Math.max(0, Math.ceil(remainingDiff / (1e3 * 60 * 60)));
            return {
              hasAccess: true,
              lifecycleStatus: "ACTIVE",
              planId: "FREE_TRIAL_7D",
              planType: "PERSONAL",
              planName: "D\xF9ng th\u1EED 7 Ng\xE0y Mi\u1EC5n Ph\xED",
              status: "ACTIVE",
              isTrial: true,
              isTrialActive: true,
              isTrialExpired: false,
              trialStartedAt: user.trialStartedAt?.toISOString(),
              trialEndsAt: user.trialEndsAt.toISOString(),
              startDate: user.trialStartedAt?.toISOString() || now.toISOString(),
              endDate: user.trialEndsAt.toISOString(),
              remainingDays,
              remainingHours,
              role: user.role,
              activePending: activePending || null
            };
          } else {
            return {
              hasAccess: false,
              lifecycleStatus: activePending ? "PENDING" : "EXPIRED",
              planId: "FREE_TRIAL_7D",
              planType: "PERSONAL",
              planName: "D\xF9ng th\u1EED 7 ng\xE0y \u0111\xE3 k\u1EBFt th\xFAc",
              status: "EXPIRED",
              isTrial: true,
              isTrialActive: false,
              isTrialExpired: true,
              trialStartedAt: user.trialStartedAt?.toISOString(),
              trialEndsAt: user.trialEndsAt.toISOString(),
              startDate: user.trialStartedAt?.toISOString(),
              endDate: user.trialEndsAt.toISOString(),
              remainingDays: 0,
              remainingHours: 0,
              role: user.role,
              activePending: activePending || null
            };
          }
        }
        const latestSub = await prisma.subscription.findFirst({
          where: { userId },
          orderBy: { endDate: "desc" }
        });
        if (latestSub) {
          return {
            hasAccess: false,
            lifecycleStatus: activePending ? "PENDING" : latestSub.status === "CANCELLED" ? "CANCELLED" : "EXPIRED",
            planId: latestSub.planId,
            planType: latestSub.planType || "PERSONAL",
            planName: latestSub.planName,
            status: latestSub.status || "EXPIRED",
            amount: latestSub.amount,
            startDate: latestSub.startDate.toISOString(),
            endDate: latestSub.endDate.toISOString(),
            remainingDays: 0,
            subscriptionId: latestSub.id,
            activePending: activePending || null
          };
        }
        return {
          hasAccess: false,
          lifecycleStatus: activePending ? "PENDING" : "UNPAID",
          planId: "NONE",
          planType: "NONE",
          planName: "Ch\u01B0a k\xEDch ho\u1EA1t g\xF3i",
          status: "NONE",
          remainingDays: 0,
          activePending: activePending || null
        };
      },
      /**
       * Activate or Extend a Subscription with:
       * 1. Exact 30-day / 90-day calculation on backend.
       * 2. Price snapshotting (preserves historical purchase price even if admin updates prices later).
       * 3. Stacking renewal: If user already has active days remaining, new duration is appended
       *    seamlessly to current endDate (no days lost).
       */
      async activateSubscription(userId, planId, paymentInfo) {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const plan = await this.getPlanById(planId);
        if (!plan) {
          throw new Error(`G\xF3i d\u1ECBch v\u1EE5 '${planId}' kh\xF4ng t\u1ED3n t\u1EA1i. Kh\xF4ng th\u1EC3 k\xEDch ho\u1EA1t.`);
        }
        if (paymentInfo?.paymentId) {
          const already = await prisma.subscription.findFirst({ where: { paymentId: paymentInfo.paymentId } });
          if (already) return already;
        }
        const durationDays = paymentInfo?.customDurationDays ?? plan.durationDays;
        if (!Number.isFinite(durationDays) || durationDays <= 0 || durationDays > 3660) {
          throw new Error(`Th\u1EDDi h\u1EA1n g\xF3i kh\xF4ng h\u1EE3p l\u1EC7: ${durationDays}`);
        }
        const snapshotAmount = paymentInfo?.amount !== void 0 ? paymentInfo.amount : plan.price;
        const existingActive = await prisma.subscription.findFirst({
          where: {
            userId,
            status: "ACTIVE",
            paymentStatus: "PAID",
            endDate: { gt: now }
          },
          orderBy: { endDate: "desc" }
        });
        const baseDate = existingActive ? new Date(existingActive.endDate) : now;
        const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
        if (existingActive) {
          await prisma.subscription.update({
            where: { id: existingActive.id },
            data: { status: "CANCELLED" }
          });
        }
        await prisma.subscription.updateMany({
          where: { userId, status: "ACTIVE" },
          data: { status: "CANCELLED" }
        });
        const subscription = await prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            planType: plan.type,
            planName: plan.name,
            amount: snapshotAmount,
            // Historic snapshot price preserved
            billingCycle: plan.billingCycle,
            durationDays,
            paymentStatus: "PAID",
            status: "ACTIVE",
            txReference: paymentInfo?.txReference || `ACT_${Date.now()}`,
            paymentId: paymentInfo?.paymentId || null,
            startDate: now,
            endDate,
            purchasedAt: now
          }
        });
        const mappedUserPlan = plan.type === "TEAM" ? "TEAM" : "PRO";
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: mappedUserPlan,
            planExpiresAt: endDate
          }
        });
        if (plan.type === "TEAM") {
          const existingTeam = await prisma.team.findFirst({ where: { ownerId: userId } });
          if (existingTeam) {
            await prisma.team.update({
              where: { id: existingTeam.id },
              data: {
                subscriptionId: subscription.id,
                maxMembers: plan.maxTeamMembers || 5
              }
            });
          } else {
            await prisma.team.create({
              data: {
                name: "Nh\xF3m l\xE0m vi\u1EC7c c\u1EE7a t\xF4i",
                ownerId: userId,
                subscriptionId: subscription.id,
                maxMembers: plan.maxTeamMembers || 5
              }
            });
          }
        }
        return subscription;
      },
      /**
       * Process Refund & Subscription Revocation (Requirement 9 & 10)
       * When an order/payment is refunded:
       * 1. Payment status set to REFUNDED.
       * 2. Order status set to REFUNDED.
       * 3. Linked subscription status set to CANCELLED and expired immediately.
       * 4. User reverted to FREE plan.
       * 5. Referral commissions cancelled/rolled back.
       */
      async cancelSubscriptionOnRefund(paymentId, reason, adminEmail) {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { user: true }
        });
        if (!payment) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u thanh to\xE1n c\u1EA7n ho\xE0n ti\u1EC1n.");
        }
        if (payment.status === "REFUNDED") {
          return { payment, message: "Thanh to\xE1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n tr\u01B0\u1EDBc \u0111\xF3." };
        }
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
            rejectedReason: `\u0110\xE3 ho\xE0n ti\u1EC1n: ${reason || "Theo ch\xEDnh s\xE1ch ho\xE0n ti\u1EC1n"} (B\u1EDFi ${adminEmail || "Qu\u1EA3n tr\u1ECB vi\xEAn"})`,
            updatedAt: now
          }
        });
        await prisma.order.updateMany({
          where: { orderId: payment.orderId },
          data: { status: "REFUNDED" }
        });
        await prisma.subscription.updateMany({
          where: {
            userId: payment.userId,
            OR: [
              { paymentId: payment.id },
              { txReference: payment.txReference },
              { status: "ACTIVE" }
            ]
          },
          data: {
            status: "CANCELLED",
            endDate: now
          }
        });
        const updatedUser = await prisma.user.update({
          where: { id: payment.userId },
          data: {
            plan: "FREE",
            planExpiresAt: null
          },
          select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
        });
        try {
          const { referralService: referralService2 } = await Promise.resolve().then(() => (init_referral_service(), referral_service_exports));
          await referralService2.processOrderCancelledOrRefunded(payment.orderId, `Ho\xE0n ti\u1EC1n: ${reason || "Admin ho\xE0n ti\u1EC1n"}`);
        } catch (refErr) {
          console.warn("[Referral] Rollback commission on refund error:", refErr);
        }
        await prisma.notification.create({
          data: {
            userId: payment.userId,
            title: "\u0110\u01A1n h\xE0ng \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n & G\xF3i d\u1ECBch v\u1EE5 \u0111\xE3 thu h\u1ED3i",
            message: `\u0110\u01A1n thanh to\xE1n ${payment.txReference} \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n ti\u1EC1n (${(payment.amount || 0).toLocaleString("vi-VN")} \u20AB). Quy\u1EC1n s\u1EED d\u1EE5ng g\xF3i ${payment.planRequested} \u0111\xE3 k\u1EBFt th\xFAc. L\xFD do: ${reason || "Theo y\xEAu c\u1EA7u ho\xE0n ti\u1EC1n"}.`,
            type: "Warning",
            read: false
          }
        });
        return { payment: updatedPayment, user: updatedUser };
      },
      /**
       * Background Worker Expiration Sweep (Requirement 5 & 6)
       * Sweeps all overdue ACTIVE subscriptions and marks them EXPIRED in the database.
       */
      async expireOverdueSubscriptions() {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const overdueSubs = await prisma.subscription.findMany({
          where: {
            status: "ACTIVE",
            endDate: { lte: now }
          },
          include: { user: { select: { id: true, email: true, name: true, plan: true } } }
        });
        if (overdueSubs.length === 0) return { expiredCount: 0 };
        const overdueIds = overdueSubs.map((s) => s.id);
        await prisma.subscription.updateMany({
          where: { id: { in: overdueIds } },
          data: { status: "EXPIRED" }
        });
        for (const sub of overdueSubs) {
          const remainingActive = await prisma.subscription.findFirst({
            where: {
              userId: sub.userId,
              status: "ACTIVE",
              endDate: { gt: now }
            }
          });
          if (!remainingActive) {
            await prisma.user.update({
              where: { id: sub.userId },
              data: { plan: "FREE", planExpiresAt: null }
            });
            try {
              await prisma.notification.create({
                data: {
                  userId: sub.userId,
                  title: "G\xF3i \u0111\u0103ng k\xFD \u0111\xE3 h\u1EBFt h\u1EA1n",
                  message: `G\xF3i ${sub.planName} c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt h\u1EA1n v\xE0o ng\xE0y ${new Date(sub.endDate).toLocaleDateString("vi-VN")}. Quy\u1EC1n truy c\u1EADp c\xE1c t\xEDnh n\u0103ng n\xE2ng cao \u0111\xE3 t\u1EA1m kh\xF3a. Vui l\xF2ng gia h\u1EA1n \u0111\u1EC3 ti\u1EBFp t\u1EE5c s\u1EED d\u1EE5ng.`,
                  type: "Warning",
                  read: false
                }
              });
            } catch (e) {
            }
            if (sub.user?.email) {
              gmailService.sendNotification({
                to: sub.user.email,
                recipientName: sub.user.name || "Qu\xFD kh\xE1ch",
                subject: `\u23F3 [Life OS] G\xF3i \u0111\u0103ng k\xFD ${sub.planName} c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt h\u1EA1n`,
                category: "SUBSCRIPTION",
                headline: "G\xF3i d\u1ECBch v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc chu k\u1EF3",
                content: `G\xF3i t\xE0i kho\u1EA3n <strong>${sub.planName}</strong> c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt th\u1EDDi h\u1EA1n s\u1EED d\u1EE5ng. T\xE0i kho\u1EA3n hi\u1EC7n \u0111\xE3 \u0111\u01B0\u1EE3c chuy\u1EC3n v\u1EC1 g\xF3i <strong>Mi\u1EC5n ph\xED (FREE)</strong>.<br/><br/>\u0110\u1EC3 ti\u1EBFp t\u1EE5c s\u1EED d\u1EE5ng \u0111\u1EA7y \u0111\u1EE7 c\xE1c t\xEDnh n\u0103ng th\xF4ng minh kh\xF4ng gi\u1EDBi h\u1EA1n, b\u1EA1n vui l\xF2ng gia h\u1EA1n ho\u1EB7c n\xE2ng c\u1EA5p g\xF3i m\u1EDBi.`,
                actionLabel: "Gia h\u1EA1n g\xF3i d\u1ECBch v\u1EE5",
                actionUrl: getAppBaseUrl(),
                badgeText: "H\u1EBFt h\u1EA1n g\xF3i",
                badgeColor: "#f59e0b"
              }).catch((e) => console.error("[Gmail Worker] Expiry email error:", e));
            }
          }
        }
        return { expiredCount: overdueSubs.length };
      },
      /**
       * Proactive Expiration Warning Notifications (Requirement 14)
       * Sends notices 7 days, 3 days, and 1 day before expiration.
       */
      async sendUpcomingExpiryWarnings() {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const activeSubs = await prisma.subscription.findMany({
          where: {
            status: "ACTIVE",
            paymentStatus: "PAID",
            endDate: { gt: now }
          },
          include: { user: { select: { id: true, email: true, name: true } } }
        });
        for (const sub of activeSubs) {
          const diffMs = new Date(sub.endDate).getTime() - now.getTime();
          const remainingDays = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
          if (remainingDays === 7 || remainingDays === 3 || remainingDays === 1) {
            const milestoneTag = `(c\xF2n ${remainingDays} ng\xE0y)`;
            const alreadySent = await prisma.notification.findFirst({
              where: {
                userId: sub.userId,
                title: { contains: milestoneTag },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) }
              }
            });
            if (!alreadySent) {
              const title = `G\xF3i d\u1ECBch v\u1EE5 s\u1EAFp h\u1EBFt h\u1EA1n ${milestoneTag}`;
              const message = `G\xF3i ${sub.planName} c\u1EE7a b\u1EA1n s\u1EBD h\u1EBFt h\u1EA1n v\xE0o ng\xE0y ${new Date(sub.endDate).toLocaleDateString("vi-VN")}. Vui l\xF2ng gia h\u1EA1n \u0111\u1EC3 duy tr\xEC to\xE0n b\u1ED9 t\xEDnh n\u0103ng v\xE0 d\u1EEF li\u1EC7u \u0111\u1ED3ng b\u1ED9.`;
              await prisma.notification.create({
                data: {
                  userId: sub.userId,
                  title,
                  message,
                  type: "Warning",
                  read: false
                }
              });
              if (sub.user?.email) {
                gmailService.sendNotification({
                  to: sub.user.email,
                  recipientName: sub.user.name || "Kh\xE1ch h\xE0ng",
                  subject: `\u26A0\uFE0F [Life OS] G\xF3i ${sub.planName} s\u1EAFp h\u1EBFt h\u1EA1n ${milestoneTag}`,
                  category: "SUBSCRIPTION",
                  headline: `Ch\u1EC9 c\xF2n ${remainingDays} ng\xE0y l\xE0 g\xF3i d\u1ECBch v\u1EE5 s\u1EBD k\u1EBFt th\xFAc`,
                  content: `G\xF3i t\xE0i kho\u1EA3n <strong>${sub.planName}</strong> c\u1EE7a b\u1EA1n s\u1EBD h\u1EBFt h\u1EA1n v\xE0o ng\xE0y <strong>${new Date(sub.endDate).toLocaleDateString("vi-VN")}</strong>.<br/><br/>H\xE3y gia h\u1EA1n ngay h\xF4m nay \u0111\u1EC3 duy tr\xEC chu\u1ED7i l\xE0m vi\u1EC7c v\xE0 d\u1EEF li\u1EC7u \u0111\u1ED3ng b\u1ED9 li\xEAn t\u1EE5c.`,
                  actionLabel: "Gia h\u1EA1n g\xF3i ngay",
                  actionUrl: getAppBaseUrl(),
                  badgeText: `C\xF2n ${remainingDays} ng\xE0y`,
                  badgeColor: "#3b82f6"
                }).catch((e) => console.error("[Gmail Worker] Warning email error:", e));
              }
            }
          }
        }
      },
      /**
       * Admin Subscription Management & Audit List (Requirement 13)
       */
      async getSubscriptionsList(options) {
        const prisma = getPrisma();
        const { status, search, planId, page = 1, limit = 50 } = options;
        const now = /* @__PURE__ */ new Date();
        await this.expireOverdueSubscriptions();
        const whereClause = {};
        if (status && status !== "ALL") {
          whereClause.status = status;
        }
        if (planId && planId !== "ALL") {
          whereClause.planId = planId;
        }
        if (search && search.trim()) {
          const q = search.trim();
          whereClause.OR = [
            { txReference: { contains: q, mode: "insensitive" } },
            { planName: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { name: { contains: q, mode: "insensitive" } } }
          ];
        }
        const [total, subscriptions, activeCount, expiredCount, cancelledCount, pendingPaymentsCount] = await Promise.all([
          prisma.subscription.count({ where: whereClause }),
          prisma.subscription.findMany({
            where: whereClause,
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, avatar: true }
              }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gt: now } } }),
          prisma.subscription.count({ where: { status: "EXPIRED" } }),
          prisma.subscription.count({ where: { status: "CANCELLED" } }),
          prisma.payment.count({ where: { status: "PENDING" } })
        ]);
        const allPaidSubs = await prisma.subscription.findMany({
          where: { paymentStatus: "PAID" },
          select: { amount: true }
        });
        const totalRevenue = allPaidSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
        return {
          subscriptions,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          },
          counts: {
            total,
            active: activeCount,
            expired: expiredCount,
            cancelled: cancelledCount,
            pending: pendingPaymentsCount
          },
          totalRevenue
        };
      },
      /**
       * Admin explicitly revokes a user's active subscription immediately
       */
      async revokeSubscription(userId, adminEmail, reason) {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        await prisma.subscription.updateMany({
          where: { userId, status: "ACTIVE" },
          data: {
            status: "CANCELLED",
            endDate: now
          }
        });
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "FREE",
            planExpiresAt: null
          },
          select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
        });
        await prisma.notification.create({
          data: {
            userId,
            title: "Quy\u1EC1n s\u1EED d\u1EE5ng g\xF3i d\u1ECBch v\u1EE5 \u0111\xE3 b\u1ECB thu h\u1ED3i",
            message: `Quy\u1EC1n truy c\u1EADp g\xF3i d\u1ECBch v\u1EE5 c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB thu h\u1ED3i b\u1EDFi qu\u1EA3n tr\u1ECB vi\xEAn (${adminEmail}). L\xFD do: ${reason || "Theo ch\xEDnh s\xE1ch v\u1EADn h\xE0nh"}.`,
            type: "Warning",
            read: false
          }
        });
        return updatedUser;
      },
      /**
       * Admin grants or extends a subscription manually
       */
      async grantSubscription(userId, planId, durationDays, adminEmail, reason) {
        const subscription = await this.activateSubscription(userId, planId, {
          txReference: `MANUAL_GRANT_${Date.now()}`,
          customDurationDays: durationDays,
          amount: 0
          // No money received — must not count as revenue
        });
        const prisma = getPrisma();
        await prisma.notification.create({
          data: {
            userId,
            title: `G\xF3i ${subscription.planName} \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5p th\xE0nh c\xF4ng`,
            message: `Qu\u1EA3n tr\u1ECB vi\xEAn (${adminEmail}) \u0111\xE3 c\u1EA5p quy\u1EC1n s\u1EED d\u1EE5ng g\xF3i ${subscription.planName} (${durationDays} ng\xE0y) cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n. H\u1EA1n d\xF9ng \u0111\u1EBFn ${new Date(subscription.endDate).toLocaleDateString("vi-VN")}.`,
            type: "Success",
            read: false
          }
        });
        return subscription;
      },
      /**
       * SaaS Operational Metrics & KPIs for Admin Dashboard
       */
      async getSaaSMetrics() {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const [totalUsers, activeSubCount, pendingPaymentsCount, allPayments, expiredSubsCount] = await Promise.all([
          prisma.user.count(),
          prisma.subscription.count({
            where: {
              status: "ACTIVE",
              paymentStatus: "PAID",
              endDate: { gt: now }
            }
          }),
          prisma.payment.count({
            where: { status: "PENDING" }
          }),
          prisma.payment.findMany({
            where: { status: { in: ["APPROVED", "Paid"] } },
            select: { amount: true, createdAt: true, planRequested: true }
          }),
          prisma.subscription.count({
            where: {
              status: { in: ["EXPIRED", "CANCELLED"] },
              endDate: { lte: now }
            }
          })
        ]);
        const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const activeSubs = await prisma.subscription.findMany({
          where: {
            status: "ACTIVE",
            paymentStatus: "PAID",
            endDate: { gt: now }
          },
          select: { amount: true, durationDays: true }
        });
        const mrr = activeSubs.reduce((sum, sub) => {
          const days = sub.durationDays || 30;
          const monthlyFactor = 30 / days;
          return sum + Math.round(sub.amount * monthlyFactor);
        }, 0);
        const unpaidUsers = Math.max(0, totalUsers - activeSubCount - pendingPaymentsCount);
        const conversionRatePercent = totalUsers > 0 ? Math.round(activeSubCount / totalUsers * 1e3) / 10 : 0;
        return {
          totalUsers,
          activeSubscribers: activeSubCount,
          unpaidUsers,
          pendingApprovalCount: pendingPaymentsCount,
          expiredUsers: expiredSubsCount,
          totalRevenue,
          mrr,
          conversionRatePercent
        };
      }
    };
  }
});

// src/backend/services/announcement.service.ts
var announcement_service_exports = {};
__export(announcement_service_exports, {
  announcementService: () => announcementService
});
var AnnouncementService, announcementService;
var init_announcement_service = __esm({
  "src/backend/services/announcement.service.ts"() {
    init_db();
    init_emailQueue_service();
    init_emailTemplate_service();
    AnnouncementService = class {
      /**
       * Determine target users strictly based on targetAudience specification
       */
      async resolveTargetUsers(targetAudience, targetUserIds) {
        const prisma = getPrisma();
        if (targetAudience === "SELECTED_USERS") {
          if (!targetUserIds || targetUserIds.length === 0) return [];
          return await prisma.user.findMany({
            where: { id: { in: targetUserIds } },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "ROLE_ADMIN") {
          return await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "ROLE_USER") {
          return await prisma.user.findMany({
            where: { role: "USER" },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "PLAN_PRO") {
          return await prisma.user.findMany({
            where: { plan: "PRO" },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "PLAN_TEAM") {
          return await prisma.user.findMany({
            where: { plan: "TEAM" },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "PLAN_FREE") {
          return await prisma.user.findMany({
            where: { plan: "FREE" },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "ACTIVE") {
          return await prisma.user.findMany({
            where: { status: "ACTIVE" },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        if (targetAudience === "INACTIVE") {
          return await prisma.user.findMany({
            where: { status: { in: ["SUSPENDED", "DISABLED"] } },
            select: { id: true, name: true, email: true, role: true, plan: true, status: true }
          });
        }
        return await prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true, plan: true, status: true }
        });
      }
      /**
       * Admin: Create Announcement record (Draft or Published)
       */
      async createAnnouncement(input, adminUser) {
        const prisma = getPrisma();
        const title = input.title.trim();
        const message = input.message.trim();
        if (!title || !message) {
          throw new Error("Title and message are required.");
        }
        const type = input.type || "GENERAL";
        const priority = input.priority || "NORMAL";
        const targetAudience = input.targetAudience || "ALL";
        const channels = input.channels || "WEB";
        const actionUrl = input.actionUrl?.trim() || null;
        const actionLabel = input.actionLabel?.trim() || null;
        const targetUserIdsStr = input.targetUserIds ? JSON.stringify(input.targetUserIds) : null;
        const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        const isScheduled = scheduledFor && scheduledFor.getTime() > Date.now();
        const status = isScheduled ? "SCHEDULED" : "DRAFT";
        const announcement = await prisma.announcement.create({
          data: {
            title,
            message,
            type,
            priority,
            targetAudience,
            targetUserIds: targetUserIdsStr,
            channels,
            status,
            scheduledFor,
            expiresAt,
            actionUrl,
            actionLabel,
            createdById: adminUser.id,
            createdByName: adminUser.name
          }
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminUser.id,
            action: "CREATE_ANNOUNCEMENT",
            beforeState: null,
            afterState: JSON.stringify({ id: announcement.id, title, targetAudience, channels, status }),
            result: "Success",
            reason: `Created announcement "${title}" (Status: ${status})`
          }
        });
        return announcement;
      }
      /**
       * Admin: Publish Announcement
       * Creates per-user in-app Notification records AND dispatches email delivery
       */
      async publishAnnouncement(id, adminUser) {
        const prisma = getPrisma();
        const announcement = await prisma.announcement.findUnique({
          where: { id }
        });
        if (!announcement) {
          throw new Error("Announcement not found.");
        }
        if (announcement.status === "PUBLISHED") {
          throw new Error("Announcement has already been published.");
        }
        await prisma.announcement.update({
          where: { id },
          data: { status: "PUBLISHING" }
        });
        try {
          let targetUserIdsParsed;
          if (announcement.targetUserIds) {
            try {
              targetUserIdsParsed = JSON.parse(announcement.targetUserIds);
            } catch {
              targetUserIdsParsed = void 0;
            }
          }
          const targetUsers = await this.resolveTargetUsers(announcement.targetAudience, targetUserIdsParsed);
          if (targetUsers.length === 0) {
            await prisma.announcement.update({
              where: { id },
              data: { status: "PUBLISHED", publishedAt: /* @__PURE__ */ new Date() }
            });
            return {
              announcement,
              targetedCount: 0,
              webDelivered: 0,
              emailDelivered: 0,
              emailFailed: 0
            };
          }
          const isWebEnabled = announcement.channels === "WEB" || announcement.channels === "BOTH";
          const isEmailEnabled = announcement.channels === "EMAIL" || announcement.channels === "BOTH";
          let webCount = 0;
          let emailSuccessCount = 0;
          let emailFailedCount = 0;
          if (isWebEnabled) {
            for (const user of targetUsers) {
              const existingWebDelivery = await prisma.announcementDelivery.findUnique({
                where: {
                  announcementId_userId_channel: {
                    announcementId: announcement.id,
                    userId: user.id,
                    channel: "WEB"
                  }
                }
              });
              if (!existingWebDelivery) {
                await prisma.notification.create({
                  data: {
                    userId: user.id,
                    announcementId: announcement.id,
                    title: announcement.title,
                    message: announcement.message,
                    type: announcement.type.toLowerCase(),
                    priority: announcement.priority,
                    actionUrl: announcement.actionUrl,
                    actionLabel: announcement.actionLabel,
                    read: false,
                    date: /* @__PURE__ */ new Date()
                  }
                });
                await prisma.announcementDelivery.create({
                  data: {
                    announcementId: announcement.id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    channel: "WEB",
                    status: "SENT",
                    sentAt: /* @__PURE__ */ new Date()
                  }
                });
                webCount++;
              }
            }
          }
          let emailEnqueuedCount = 0;
          let emailSkippedCount = 0;
          if (isEmailEnabled) {
            const userIds = targetUsers.map((u) => u.id);
            const prefs = await prisma.userNotificationPreference.findMany({
              where: { userId: { in: userIds } },
              select: { userId: true, emailEnabled: true }
            });
            const prefMap = new Map(prefs.map((p) => [p.userId, p.emailEnabled]));
            const isBypassPreference = announcement.priority === "CRITICAL" || announcement.priority === "IMPORTANT" || announcement.type === "SECURITY" || announcement.type === "MAINTENANCE";
            for (const user of targetUsers) {
              if (!user.email) continue;
              const existingEmailDelivery = await prisma.announcementDelivery.findUnique({
                where: {
                  announcementId_userId_channel: {
                    announcementId: announcement.id,
                    userId: user.id,
                    channel: "EMAIL"
                  }
                }
              });
              if (existingEmailDelivery && (existingEmailDelivery.status === "SENT" || existingEmailDelivery.status === "PENDING")) {
                continue;
              }
              const userEmailAllowed = prefMap.has(user.id) ? prefMap.get(user.id) : true;
              if (!userEmailAllowed && !isBypassPreference) {
                if (!existingEmailDelivery) {
                  await prisma.announcementDelivery.create({
                    data: {
                      announcementId: announcement.id,
                      userId: user.id,
                      userEmail: user.email,
                      userName: user.name,
                      channel: "EMAIL",
                      status: "SKIPPED",
                      errorMessage: "Ng\u01B0\u1EDDi d\xF9ng \u0111\xE3 t\u1EAFt nh\u1EADn email th\xF4ng b\xE1o th\xF4ng th\u01B0\u1EDDng trong c\xE0i \u0111\u1EB7t"
                    }
                  });
                } else {
                  await prisma.announcementDelivery.update({
                    where: { id: existingEmailDelivery.id },
                    data: {
                      status: "SKIPPED",
                      errorMessage: "Ng\u01B0\u1EDDi d\xF9ng \u0111\xE3 t\u1EAFt nh\u1EADn email th\xF4ng b\xE1o th\xF4ng th\u01B0\u1EDDng trong c\xE0i \u0111\u1EB7t"
                    }
                  });
                }
                emailSkippedCount++;
                continue;
              }
              const deliveryRecord = existingEmailDelivery ? await prisma.announcementDelivery.update({
                where: { id: existingEmailDelivery.id },
                data: { status: "PENDING", errorMessage: null }
              }) : await prisma.announcementDelivery.create({
                data: {
                  announcementId: announcement.id,
                  userId: user.id,
                  userEmail: user.email,
                  userName: user.name,
                  channel: "EMAIL",
                  status: "PENDING"
                }
              });
              const emailHtml = buildEmailHtml({
                headline: announcement.title,
                previewText: announcement.message.slice(0, 120),
                priority: announcement.priority === "CRITICAL" ? "CRITICAL" : announcement.priority === "IMPORTANT" ? "HIGH" : "NORMAL",
                badgeText: announcement.priority === "CRITICAL" ? "TH\xD4NG B\xC1O KH\u1EA8N C\u1EA4P" : announcement.type || "TH\xD4NG B\xC1O H\u1EC6 TH\u1ED0NG",
                greeting: `Xin ch\xE0o ${user.name || "b\u1EA1n"},`,
                paragraphs: [
                  announcement.message
                ],
                detailsTable: [
                  { label: "Lo\u1EA1i th\xF4ng b\xE1o", value: announcement.type },
                  { label: "M\u1EE9c \u0111\u1ED9 \u01B0u ti\xEAn", value: announcement.priority },
                  { label: "K\xEAnh ph\xE1t h\xE0nh", value: "Website & Gmail" }
                ],
                ctaButton: announcement.actionUrl ? {
                  label: announcement.actionLabel || "Xem tr\xEAn website",
                  url: announcement.actionUrl
                } : {
                  label: "M\u1EDF Life OS",
                  url: process.env.APP_URL || "http://localhost:3000"
                },
                footerNote: "\u0110\xE2y l\xE0 th\xF4ng b\xE1o ch\xEDnh th\u1EE9c t\u1EEB Ban Qu\u1EA3n tr\u1ECB Life OS. B\u1EA1n c\xF3 th\u1EC3 thay \u0111\u1ED5i t\xF9y ch\u1ECDn th\xF4ng b\xE1o trong trang C\xE0i \u0111\u1EB7t t\xE0i kho\u1EA3n."
              });
              await emailQueueService.enqueue({
                recipient: user.email,
                subject: `[Life OS] ${announcement.title}`,
                htmlBody: emailHtml,
                eventType: "ADMIN_BROADCAST",
                metadata: {
                  announcementId: announcement.id,
                  announcementDeliveryId: deliveryRecord.id,
                  userId: user.id
                }
              });
              emailEnqueuedCount++;
            }
          }
          const updated = await prisma.announcement.update({
            where: { id },
            data: {
              status: "PUBLISHED",
              publishedAt: /* @__PURE__ */ new Date()
            }
          });
          await prisma.auditLog.create({
            data: {
              adminId: adminUser.id,
              action: "PUBLISH_ANNOUNCEMENT",
              beforeState: JSON.stringify({ id, status: announcement.status }),
              afterState: JSON.stringify({
                id,
                status: "PUBLISHED",
                targeted: targetUsers.length,
                webDelivered: webCount,
                emailEnqueued: emailEnqueuedCount,
                emailSkipped: emailSkippedCount
              }),
              result: "Success",
              reason: `Published announcement "${announcement.title}" to ${targetUsers.length} users (Web: ${webCount}, Email enqueued: ${emailEnqueuedCount}, Skipped: ${emailSkippedCount}).`
            }
          });
          return {
            announcement: updated,
            targetedCount: targetUsers.length,
            webDelivered: webCount,
            emailEnqueued: emailEnqueuedCount,
            emailSkipped: emailSkippedCount
          };
        } catch (err) {
          await prisma.announcement.update({
            where: { id },
            data: { status: "DRAFT" }
          });
          throw err;
        }
      }
      /**
       * Admin: List announcements with delivery stats
       */
      async getAnnouncements(filters) {
        const prisma = getPrisma();
        const where = {};
        if (filters?.status && filters.status !== "ALL") {
          where.status = filters.status;
        }
        if (filters?.search) {
          where.OR = [
            { title: { contains: filters.search, mode: "insensitive" } },
            { message: { contains: filters.search, mode: "insensitive" } }
          ];
        }
        const list = await prisma.announcement.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            deliveries: {
              select: { id: true, channel: true, status: true }
            }
          }
        });
        return list.map((a) => {
          const webTotal = a.deliveries.filter((d) => d.channel === "WEB").length;
          const emailTotal = a.deliveries.filter((d) => d.channel === "EMAIL").length;
          const emailSent = a.deliveries.filter((d) => d.channel === "EMAIL" && d.status === "SENT").length;
          const emailFailed = a.deliveries.filter((d) => d.channel === "EMAIL" && d.status === "FAILED").length;
          return {
            id: a.id,
            title: a.title,
            message: a.message,
            type: a.type,
            priority: a.priority,
            targetAudience: a.targetAudience,
            channels: a.channels,
            status: a.status,
            scheduledFor: a.scheduledFor,
            expiresAt: a.expiresAt,
            actionUrl: a.actionUrl,
            actionLabel: a.actionLabel,
            createdById: a.createdById,
            createdByName: a.createdByName,
            createdAt: a.createdAt,
            publishedAt: a.publishedAt,
            stats: {
              webTotal,
              emailTotal,
              emailSent,
              emailFailed
            }
          };
        });
      }
      /**
       * Admin: Get announcement detail with full deliveries report
       */
      async getAnnouncementDetail(id) {
        const prisma = getPrisma();
        const a = await prisma.announcement.findUnique({
          where: { id },
          include: {
            deliveries: {
              orderBy: { createdAt: "desc" },
              take: 500
            }
          }
        });
        if (!a) throw new Error("Announcement not found.");
        return a;
      }
      /**
       * Admin: Update / Edit Announcement (Only when not PUBLISHED)
       */
      async updateAnnouncement(id, input, adminUser) {
        const prisma = getPrisma();
        const current = await prisma.announcement.findUnique({ where: { id } });
        if (!current) throw new Error("Announcement not found.");
        if (current.status === "PUBLISHED") {
          throw new Error("Cannot edit an announcement that has already been published.");
        }
        const data = {};
        if (input.title !== void 0) data.title = input.title.trim();
        if (input.message !== void 0) data.message = input.message.trim();
        if (input.type !== void 0) data.type = input.type;
        if (input.priority !== void 0) data.priority = input.priority;
        if (input.targetAudience !== void 0) data.targetAudience = input.targetAudience;
        if (input.channels !== void 0) data.channels = input.channels;
        if (input.actionUrl !== void 0) data.actionUrl = input.actionUrl?.trim() || null;
        if (input.actionLabel !== void 0) data.actionLabel = input.actionLabel?.trim() || null;
        if (input.targetUserIds !== void 0) data.targetUserIds = input.targetUserIds ? JSON.stringify(input.targetUserIds) : null;
        if (input.scheduledFor !== void 0) data.scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
        if (input.expiresAt !== void 0) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        const updated = await prisma.announcement.update({
          where: { id },
          data
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminUser.id,
            action: "UPDATE_ANNOUNCEMENT",
            beforeState: JSON.stringify(current),
            afterState: JSON.stringify(updated),
            result: "Success",
            reason: `Updated announcement "${updated.title}"`
          }
        });
        return updated;
      }
      /**
       * Admin: Cancel scheduled announcement or archive
       */
      async cancelOrArchiveAnnouncement(id, action, adminUser) {
        const prisma = getPrisma();
        const current = await prisma.announcement.findUnique({ where: { id } });
        if (!current) throw new Error("Announcement not found.");
        const newStatus = action === "CANCEL" ? "CANCELLED" : "ARCHIVED";
        const updated = await prisma.announcement.update({
          where: { id },
          data: { status: newStatus }
        });
        await prisma.auditLog.create({
          data: {
            adminId: adminUser.id,
            action: `${action}_ANNOUNCEMENT`,
            beforeState: JSON.stringify({ id, status: current.status }),
            afterState: JSON.stringify({ id, status: newStatus }),
            result: "Success",
            reason: `${action === "CANCEL" ? "Cancelled" : "Archived"} announcement "${current.title}"`
          }
        });
        return updated;
      }
      /**
       * Admin: Delete announcement
       */
      async deleteAnnouncement(id, adminUser) {
        const prisma = getPrisma();
        const current = await prisma.announcement.findUnique({ where: { id } });
        if (!current) throw new Error("Announcement not found.");
        await prisma.announcement.delete({ where: { id } });
        await prisma.auditLog.create({
          data: {
            adminId: adminUser.id,
            action: "DELETE_ANNOUNCEMENT",
            beforeState: JSON.stringify(current),
            afterState: null,
            result: "Success",
            reason: `Deleted announcement "${current.title}"`
          }
        });
        return true;
      }
      /**
       * Background sweep for scheduled announcements
       */
      async processScheduledAnnouncements() {
        const prisma = getPrisma();
        const now = /* @__PURE__ */ new Date();
        const scheduled = await prisma.announcement.findMany({
          where: {
            status: "SCHEDULED",
            scheduledFor: { lte: now }
          }
        });
        for (const item of scheduled) {
          try {
            await this.publishAnnouncement(item.id, {
              id: item.createdById,
              name: item.createdByName || "System Auto-Scheduler"
            });
          } catch (err) {
            console.error(`[AnnouncementService] Auto-publish scheduled announcement ${item.id} error:`, err);
          }
        }
      }
      /**
       * Admin: 1-Click Broadcast Now (Create + Validate + Enqueue Emails + Web Deliver)
       */
      async broadcastNow(input, adminUser) {
        const created = await this.createAnnouncement(input, adminUser);
        const publishResult = await this.publishAnnouncement(created.id, adminUser);
        return {
          success: true,
          announcement: publishResult.announcement,
          targetedCount: publishResult.targetedCount,
          webDelivered: publishResult.webDelivered,
          emailEnqueued: publishResult.emailEnqueued,
          emailSkipped: publishResult.emailSkipped
        };
      }
      /**
       * Admin: Retry a specific failed email delivery without duplicating web notifications
       */
      async retryDelivery(deliveryId, adminUser) {
        const prisma = getPrisma();
        const delivery = await prisma.announcementDelivery.findUnique({
          where: { id: deliveryId },
          include: { announcement: true }
        });
        if (!delivery) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi g\u1EEDi th\xF4ng b\xE1o n\xE0y.");
        if (delivery.channel !== "EMAIL") throw new Error("Ch\u1EC9 c\xF3 th\u1EC3 th\u1EED l\u1EA1i c\xE1c b\u1EA3n ghi g\u1EEDi qua k\xEAnh Email.");
        const announcement = delivery.announcement;
        if (!announcement) throw new Error("Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o g\u1ED1c t\u01B0\u01A1ng \u1EE9ng.");
        await prisma.announcementDelivery.update({
          where: { id: delivery.id },
          data: { status: "PENDING", errorMessage: null }
        });
        const emailHtml = buildEmailHtml({
          headline: announcement.title,
          previewText: announcement.message.slice(0, 120),
          priority: announcement.priority === "CRITICAL" ? "CRITICAL" : announcement.priority === "IMPORTANT" ? "HIGH" : "NORMAL",
          badgeText: announcement.priority === "CRITICAL" ? "TH\xD4NG B\xC1O KH\u1EA8N C\u1EA4P" : announcement.type || "TH\xD4NG B\xC1O H\u1EC6 TH\u1ED0NG",
          greeting: `Xin ch\xE0o ${delivery.userName || "b\u1EA1n"},`,
          paragraphs: [
            announcement.message
          ],
          detailsTable: [
            { label: "Lo\u1EA1i th\xF4ng b\xE1o", value: announcement.type },
            { label: "M\u1EE9c \u0111\u1ED9 \u01B0u ti\xEAn", value: announcement.priority },
            { label: "K\xEAnh ph\xE1t h\xE0nh", value: "Website & Gmail" }
          ],
          ctaButton: announcement.actionUrl ? {
            label: announcement.actionLabel || "Xem tr\xEAn website",
            url: announcement.actionUrl
          } : {
            label: "M\u1EDF Life OS",
            url: process.env.APP_URL || "http://localhost:3000"
          },
          footerNote: "\u0110\xE2y l\xE0 th\xF4ng b\xE1o ch\xEDnh th\u1EE9c t\u1EEB Ban Qu\u1EA3n tr\u1ECB Life OS."
        });
        await emailQueueService.enqueue({
          recipient: delivery.userEmail,
          subject: `[Life OS] ${announcement.title}`,
          htmlBody: emailHtml,
          eventType: "ADMIN_BROADCAST",
          metadata: {
            announcementId: announcement.id,
            announcementDeliveryId: delivery.id,
            userId: delivery.userId
          }
        });
        return { success: true, message: "\u0110\xE3 \u0111\u01B0a email v\xE0o h\xE0ng \u0111\u1EE3i g\u1EEDi l\u1EA1i th\xE0nh c\xF4ng." };
      }
      /**
       * Admin: Retry all failed email deliveries for a given announcement
       */
      async retryAllFailedDeliveries(announcementId, adminUser) {
        const prisma = getPrisma();
        const announcement = await prisma.announcement.findUnique({
          where: { id: announcementId }
        });
        if (!announcement) throw new Error("Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o.");
        const failedDeliveries = await prisma.announcementDelivery.findMany({
          where: {
            announcementId,
            channel: "EMAIL",
            status: "FAILED"
          }
        });
        let requeuedCount = 0;
        for (const delivery of failedDeliveries) {
          await this.retryDelivery(delivery.id, adminUser).catch(() => {
          });
          requeuedCount++;
        }
        return {
          success: true,
          requeuedCount,
          message: `\u0110\xE3 \u0111\u01B0a ${requeuedCount} email th\u1EA5t b\u1EA1i v\xE0o h\xE0ng \u0111\u1EE3i g\u1EEDi l\u1EA1i.`
        };
      }
    };
    announcementService = new AnnouncementService();
  }
});

// src/backend/mailer.ts
var mailer_exports = {};
__export(mailer_exports, {
  sendEmail: () => sendEmail
});
import nodemailer3 from "nodemailer";
async function getFallbackTransporter() {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtpConfig) {
    return null;
  }
  if (!cachedTransporter) {
    const originalHost = process.env.SMTP_HOST;
    const ipv4Host = await resolveHostToIPv4(originalHost);
    cachedTransporter = nodemailer3.createTransport({
      host: ipv4Host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      family: 4,
      // Force IPv4 to prevent ENETUNREACH
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 1e4,
      greetingTimeout: 1e4,
      socketTimeout: 15e3,
      tls: {
        servername: originalHost,
        rejectUnauthorized: false
      }
    });
  }
  return cachedTransporter;
}
var cachedTransporter, sendEmail;
var init_mailer = __esm({
  "src/backend/mailer.ts"() {
    init_gmailNotification_service();
    cachedTransporter = null;
    sendEmail = async (to, subject, html) => {
      try {
        const res = await gmailService.sendRawEmail({ to, subject, html });
        if (res.sent) {
          return res;
        }
        const fallbackTransporter = await getFallbackTransporter();
        if (fallbackTransporter) {
          await fallbackTransporter.sendMail({
            from: process.env.SMTP_FROM || '"LifeOS System" <no-reply@lifeos.com>',
            to,
            subject,
            html
          });
          return { sent: true, message: "Email \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng qua SMTP provider d\u1EF1 ph\xF2ng (ENV)." };
        }
        console.warn(`[SMTP Warning] SMTP ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh. Chi ti\u1EBFt email cho ${to}: Subject "${subject}"`);
        return { sent: false, message: "H\u1EC7 th\u1ED1ng ch\u01B0a c\u1EA5u h\xECnh Gmail/SMTP trong trang Qu\u1EA3n tr\u1ECB ho\u1EB7c ENV. Email \u0111\xE3 \u0111\u01B0\u1EE3c ghi nh\u1EADn v\xE0o nh\u1EADt k\xFD h\u1EC7 th\u1ED1ng." };
      } catch (error) {
        console.error("[sendEmail Error]:", error);
        return { sent: false, message: `L\u1ED7i g\u1EEDi email: ${error.message}` };
      }
    };
  }
});

// src/backend/serverMain.ts
import "dotenv/config";
import dns2 from "dns";
import express from "express";
import path2 from "path";
import fs from "fs";
import { execSync } from "child_process";
import cookieParser from "cookie-parser";
import bcrypt4 from "bcryptjs";
import { createServer as createViteServer } from "vite";

// src/backend/routes/auth.ts
init_db();
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";
import crypto from "crypto";

// src/backend/auth.middleware.ts
init_db();
import jwt from "jsonwebtoken";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production!");
    }
    return "dev_lifeos_secure_jwt_secret_key_2026";
  }
  return secret;
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const token = bearerToken || req.cookies?.token;
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "NO_TOKEN",
        message: "Ch\u01B0a \u0111\u0103ng nh\u1EADp. Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 ti\u1EBFp t\u1EE5c."
      },
      message: "Ch\u01B0a \u0111\u0103ng nh\u1EADp. Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 ti\u1EBFp t\u1EE5c."
    });
    return;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (jwtErr) {
    res.clearCookie("token", { path: "/" });
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
      },
      message: "Phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
    });
    return;
  }
  if (!decoded || !decoded.userId) {
    res.clearCookie("token", { path: "/" });
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Token kh\xF4ng h\u1EE3p l\u1EC7." },
      message: "Token kh\xF4ng h\u1EE3p l\u1EC7."
    });
    return;
  }
  try {
    const session = await dbService.findSessionByToken(token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      res.clearCookie("token", { path: "/" });
      res.status(401).json({
        success: false,
        error: {
          code: "SESSION_REVOKED",
          message: "Phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 k\u1EBFt th\xFAc ho\u1EB7c b\u1ECB h\u1EE7y. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
        },
        message: "Phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 k\u1EBFt th\xFAc ho\u1EB7c b\u1ECB h\u1EE7y. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
      });
      return;
    }
    const user = await dbService.findUserById(decoded.userId);
    if (!user) {
      await dbService.deleteSession(token);
      res.clearCookie("token", { path: "/" });
      res.status(401).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a." },
        message: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a."
      });
      return;
    }
    if (user.status === "DISABLED") {
      await dbService.deleteSession(token);
      res.clearCookie("token", { path: "/" });
      res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_DISABLED", message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn." },
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn."
      });
      return;
    }
    if (user.status === "SUSPENDED") {
      res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_SUSPENDED", message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB t\u1EA1m kh\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn." },
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB t\u1EA1m kh\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn."
      });
      return;
    }
    if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now() && user.plan !== "FREE") {
      await dbService.updateUser(user.id, { plan: "FREE", planExpiresAt: null });
      user.plan = "FREE";
    }
    req.userId = user.id;
    req.userRole = user.role;
    req.userPlan = user.plan;
    req.user = user;
    next();
  } catch (dbErr) {
    if (dbErr?.code === "P2021") {
      try {
        console.warn("requireAuth: Missing database relation detected (P2021). Attempting schema auto-sync...");
        const { checkDbConnection: checkDbConnection2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        await checkDbConnection2();
        const retrySession = await dbService.findSessionByToken(token);
        if (retrySession && retrySession.user && new Date(retrySession.expiresAt).getTime() > Date.now()) {
          req.userId = retrySession.user.id;
          req.userRole = retrySession.user.role;
          req.userPlan = retrySession.user.plan;
          req.user = retrySession.user;
          return next();
        }
      } catch (retryErr) {
        console.error("requireAuth auto-sync retry failed:", retryErr.message || retryErr);
      }
    }
    res.clearCookie("token", { path: "/" });
    console.warn("Session verification failed in requireAuth:", dbErr.message || dbErr);
    res.status(401).json({
      success: false,
      error: { code: "SESSION_INVALID", message: "Phi\xEAn l\xE0m vi\u1EC7c kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." },
      message: "Phi\xEAn l\xE0m vi\u1EC7c kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
    });
  }
};
var requireAdmin = (req, res, next) => {
  const role = req.userRole?.toUpperCase();
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN_ADMIN_ONLY", message: "Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i: C\u1EA7n quy\u1EC1n Qu\u1EA3n tr\u1ECB vi\xEAn." },
      message: "Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i: C\u1EA7n quy\u1EC1n Qu\u1EA3n tr\u1ECB vi\xEAn."
    });
    return;
  }
  next();
};
var requireActiveSubscription = async (req, res, next) => {
  const role = req.userRole?.toUpperCase();
  if (role === "ADMIN" || role === "SUPERADMIN") {
    return next();
  }
  try {
    const { subscriptionService: subscriptionService2 } = await Promise.resolve().then(() => (init_subscription_service(), subscription_service_exports));
    const subStatus = await subscriptionService2.checkUserSubscription(req.userId);
    if (!subStatus.hasAccess) {
      const isTrialExp = Boolean(subStatus.isTrialExpired);
      const code = isTrialExp ? "TRIAL_EXPIRED" : "SUBSCRIPTION_REQUIRED";
      const msg = isTrialExp ? "Th\u1EDDi gian d\xF9ng th\u1EED 7 ng\xE0y mi\u1EC5n ph\xED c\u1EE7a b\u1EA1n \u0111\xE3 k\u1EBFt th\xFAc. Vui l\xF2ng k\xEDch ho\u1EA1t g\xF3i d\u1ECBch v\u1EE5 \u0111\u1EC3 ti\u1EBFp t\u1EE5c s\u1EED d\u1EE5ng c\xE1c ph\xE2n h\u1EC7 cao c\u1EA5p c\u1EE7a LifeOS." : "T\u1EA5t c\u1EA3 c\xE1c ch\u1EE9c n\u0103ng c\u1EE7a LifeOS y\xEAu c\u1EA7u ng\u01B0\u1EDDi d\xF9ng mua g\xF3i tr\u1EA3 ph\xED \u0111ang ho\u1EA1t \u0111\u1ED9ng. Vui l\xF2ng ch\u1ECDn g\xF3i d\u1ECBch v\u1EE5 \u0111\u1EC3 ti\u1EBFp t\u1EE5c s\u1EED d\u1EE5ng.";
      res.status(403).json({
        success: false,
        error: {
          code,
          message: msg
        },
        message: msg,
        subscriptionStatus: subStatus
      });
      return;
    }
    req.subscription = subStatus;
    next();
  } catch (err) {
    console.error("requireActiveSubscription error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SUBSCRIPTION_CHECK_ERROR", message: "L\u1ED7i ki\u1EC3m tra quy\u1EC1n g\xF3i d\u1ECBch v\u1EE5." },
      message: "L\u1ED7i ki\u1EC3m tra quy\u1EC1n g\xF3i d\u1ECBch v\u1EE5."
    });
  }
};

// src/backend/routes/auth.ts
init_referral_service();

// src/backend/services/systemNotification.helper.ts
init_emailQueue_service();
init_emailTemplate_service();
init_gmailNotification_service();
init_db();
var SystemNotificationHelper = class {
  static async getAdminEmails() {
    try {
      const envAdmin = (process.env.ADMIN_NOTIFY_EMAIL || process.env.INITIAL_ADMIN_EMAIL || "").trim();
      const prisma = getPrisma();
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] }, status: "ACTIVE" },
        select: { email: true }
      });
      const emails = /* @__PURE__ */ new Set();
      if (envAdmin && envAdmin.includes("@")) emails.add(envAdmin);
      for (const u of adminUsers) {
        if (u.email && u.email.includes("@")) emails.add(u.email);
      }
      return Array.from(emails);
    } catch {
      return [process.env.ADMIN_NOTIFY_EMAIL || "admin@lifeos.com"];
    }
  }
  /**
   * 1. Khi người dùng mới đăng ký tài khoản
   */
  static async onUserRegistered(user, ip) {
    const appUrl = getAppBaseUrl();
    const userHtml = buildEmailHtml({
      headline: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi LifeOS!",
      recipientName: user.name,
      badgeText: "\u0110\u0102NG K\xDD TH\xC0NH C\xD4NG",
      badgeColor: "#10b981",
      summary: "T\xE0i kho\u1EA3n LifeOS c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c kh\u1EDFi t\u1EA1o th\xE0nh c\xF4ng. B\u1EA1n c\xF3 th\u1EC3 b\u1EAFt \u0111\u1EA7u thi\u1EBFt l\u1EADp m\u1EE5c ti\xEAu, qu\u1EA3n l\xFD c\xF4ng vi\u1EC7c v\xE0 t\u1ED1i \u01B0u h\xF3a nh\u1ECBp s\u1ED1ng c\u1EE7a m\xECnh ngay h\xF4m nay.",
      details: [
        { label: "H\u1ECD v\xE0 t\xEAn", value: user.name },
        { label: "Email t\xE0i kho\u1EA3n", value: user.email },
        { label: "G\xF3i c\u01B0\u1EDBc ban \u0111\u1EA7u", value: "B\u1EA3n D\xF9ng Th\u1EED / Mi\u1EC5n Ph\xED (Preview)" },
        { label: "Th\u1EDDi gian \u0111\u0103ng k\xFD", value: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN") }
      ],
      actionLabel: "M\u1EDF Kh\xF4ng Gian L\xE0m Vi\u1EC7c",
      actionUrl: `${appUrl}/?view=dashboard`,
      footerNote: "N\u1EBFu b\u1EA1n c\u1EA7n n\xE2ng c\u1EA5p g\xF3i \u0111\u1EC3 m\u1EDF kh\xF3a to\xE0n di\u1EC7n t\xEDnh n\u0103ng, vui l\xF2ng qu\xE9t m\xE3 VietQR t\u1EA1i trang G\xF3i C\u01B0\u1EDBc."
    });
    await emailQueueService.enqueue({
      recipient: user.email,
      subject: "\u{1F389} Ch\xE0o m\u1EEBng b\u1EA1n gia nh\u1EADp LifeOS \u2014 H\u1EC7 \u0110i\u1EC1u H\xE0nh Cu\u1ED9c S\u1ED1ng Th\u1EBF H\u1EC7 M\u1EDBi",
      htmlBody: userHtml,
      eventType: "AUTH_REGISTER_USER",
      metadata: { userId: user.id }
    }).catch((err) => console.error("[Notification] Error enqueuing user welcome mail:", err));
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: "C\xF3 Ng\u01B0\u1EDDi D\xF9ng M\u1EDBi V\u1EEBa \u0110\u0103ng K\xFD T\xE0i Kho\u1EA3n",
        badgeText: "TH\xC0NH VI\xCAN M\u1EDAI",
        badgeColor: "#6366f1",
        summary: `H\u1EC7 th\u1ED1ng v\u1EEBa ghi nh\u1EADn m\u1ED9t th\xE0nh vi\xEAn m\u1EDBi \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n tr\xEAn n\u1EC1n t\u1EA3ng LifeOS.`,
        details: [
          { label: "T\xEAn th\xE0nh vi\xEAn", value: user.name },
          { label: "\u0110\u1ECBa ch\u1EC9 Email", value: user.email },
          { label: "M\xE3 ng\u01B0\u1EDDi d\xF9ng", value: user.id },
          { label: "\u0110\u1ECBa ch\u1EC9 IP", value: ip || "Kh\xF4ng x\xE1c \u0111\u1ECBnh" },
          { label: "Th\u1EDDi gian \u0111\u0103ng k\xFD", value: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN") }
        ],
        actionLabel: "Xem Qu\u1EA3n Tr\u1ECB Ng\u01B0\u1EDDi D\xF9ng",
        actionUrl: `${appUrl}/?view=admin&tab=users`,
        priority: "NORMAL"
      });
      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `\u{1F464} [LifeOS] Th\xE0nh vi\xEAn m\u1EDBi \u0111\u0103ng k\xFD: ${user.name} (${user.email})`,
        htmlBody: adminHtml,
        eventType: "ADMIN_ALERT_NEW_USER",
        metadata: { userId: user.id }
      }).catch((err) => console.error("[Notification] Error enqueuing admin new user mail:", err));
    }
  }
  /**
   * 2. Khi khách hàng gửi yêu cầu thanh toán (báo đã chuyển khoản)
   */
  static async onPaymentRequested(payment) {
    const appUrl = getAppBaseUrl();
    const customerHtml = buildEmailHtml({
      headline: "\u0110\xE3 Ti\u1EBFp Nh\u1EADn Th\xF4ng Tin Chuy\u1EC3n Kho\u1EA3n G\xF3i C\u01B0\u1EDBc",
      recipientName: payment.userName || payment.userEmail,
      badgeText: "\u0110ANG X\u1EEC L\xDD THANH TO\xC1N",
      badgeColor: "#f59e0b",
      summary: `Ch\xFAng t\xF4i \u0111\xE3 ti\u1EBFp nh\u1EADn th\xF4ng tin chuy\u1EC3n kho\u1EA3n c\u1EE7a b\u1EA1n cho g\xF3i c\u01B0\u1EDBc <strong>${payment.planRequested}</strong>. \u0110\u1ED9i ng\u0169 qu\u1EA3n tr\u1ECB vi\xEAn s\u1EBD \u0111\u1ED1i so\xE1t v\xE0 k\xEDch ho\u1EA1t g\xF3i c\u01B0\u1EDBc cho b\u1EA1n trong th\u1EDDi gian s\u1EDBm nh\u1EA5t (th\u01B0\u1EDDng t\u1EEB 5 - 15 ph\xFAt).`,
      details: [
        { label: "M\xE3 \u0111\u01A1n h\xE0ng", value: payment.orderId },
        { label: "M\xE3 tham chi\u1EBFu GD", value: payment.txReference || payment.orderId },
        { label: "G\xF3i c\u01B0\u1EDBc y\xEAu c\u1EA7u", value: `${payment.planRequested} (${payment.billingCycle || "Theo th\xE1ng"})` },
        { label: "S\u1ED1 ti\u1EC1n thanh to\xE1n", value: `${payment.amount.toLocaleString("vi-VN")} \u20AB` },
        { label: "Tr\u1EA1ng th\xE1i", value: "Ch\u1EDD Qu\u1EA3n tr\u1ECB vi\xEAn duy\u1EC7t (Pending)" }
      ],
      actionLabel: "Ki\u1EC3m Tra Tr\u1EA1ng Th\xE1i \u0110\u01A1n H\xE0ng",
      actionUrl: `${appUrl}/?view=subscriptions`,
      footerNote: "Ngay khi thanh to\xE1n \u0111\u01B0\u1EE3c duy\u1EC7t th\xE0nh c\xF4ng, b\u1EA1n s\u1EBD nh\u1EADn \u0111\u01B0\u1EE3c email th\xF4ng b\xE1o k\xEDch ho\u1EA1t b\u1EA3n quy\u1EC1n."
    });
    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `\u{1F4CB} [LifeOS] X\xE1c nh\u1EADn ti\u1EBFp nh\u1EADn thanh to\xE1n g\xF3i ${payment.planRequested} (${payment.orderId})`,
      htmlBody: customerHtml,
      eventType: "PAYMENT_SUBMITTED_CUSTOMER",
      metadata: { orderId: payment.orderId, amount: payment.amount }
    }).catch((err) => console.error("[Notification] Error enqueuing customer payment submitted mail:", err));
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: "Y\xEAu C\u1EA7u Thanh To\xE1n G\xF3i C\u01B0\u1EDBc M\u1EDBi C\u1EA7n Duy\u1EC7t",
        badgeText: "DUY\u1EC6T THANH TO\xC1N",
        badgeColor: "#ef4444",
        priority: "HIGH",
        summary: `Kh\xE1ch h\xE0ng <strong>${payment.userEmail}</strong> v\u1EEBa b\u1EA5m x\xE1c nh\u1EADn \u0111\xE3 chuy\u1EC3n kho\u1EA3n th\xE0nh c\xF4ng. Vui l\xF2ng ki\u1EC3m tra t\xE0i kho\u1EA3n ng\xE2n h\xE0ng v\xE0 duy\u1EC7t \u0111\u01A1n.`,
        details: [
          { label: "M\xE3 \u0111\u01A1n h\xE0ng", value: payment.orderId },
          { label: "Kh\xE1ch h\xE0ng", value: `${payment.userName || ""} (${payment.userEmail})` },
          { label: "G\xF3i \u0111\u0103ng k\xFD", value: `${payment.planRequested} (${payment.billingCycle || ""})` },
          { label: "S\u1ED1 ti\u1EC1n c\u1EA7n ki\u1EC3m tra", value: `${payment.amount.toLocaleString("vi-VN")} \u20AB` },
          { label: "N\u1ED9i dung chuy\u1EC3n kho\u1EA3n", value: payment.txReference || payment.orderId },
          { label: "Ghi ch\xFA th\xEAm", value: payment.note || "Kh\xF4ng c\xF3" }
        ],
        actionLabel: "M\u1EDF Trang Duy\u1EC7t Thanh To\xE1n",
        actionUrl: `${appUrl}/?view=admin&tab=payment_requests`,
        footerNote: 'Vui l\xF2ng ki\u1EC3m tra sao k\xEA ng\xE2n h\xE0ng ch\xEDnh x\xE1c tr\u01B0\u1EDBc khi b\u1EA5m "X\xE1c nh\u1EADn duy\u1EC7t".'
      });
      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `\u{1F4B0} [DUY\u1EC6T G\u1EA4P] Thanh to\xE1n m\u1EDBi ${payment.amount.toLocaleString("vi-VN")} \u20AB t\u1EEB ${payment.userEmail}`,
        htmlBody: adminHtml,
        eventType: "ADMIN_ALERT_PAYMENT_PENDING",
        priority: "HIGH",
        metadata: { orderId: payment.orderId, amount: payment.amount }
      }).catch((err) => console.error("[Notification] Error enqueuing admin payment pending mail:", err));
    }
  }
  /**
   * 3. Khi Admin duyệt thành công đơn thanh toán
   */
  static async onPaymentApproved(payment) {
    const appUrl = getAppBaseUrl();
    const expiryStr = payment.expiresAt ? new Date(payment.expiresAt).toLocaleDateString("vi-VN") : "V\u0129nh vi\u1EC5n";
    const customerHtml = buildEmailHtml({
      headline: `Ch\xFAc M\u1EEBng! G\xF3i C\u01B0\u1EDBc ${payment.planName} \u0110\xE3 \u0110\u01B0\u1EE3c K\xEDch Ho\u1EA1t`,
      recipientName: payment.userName || payment.userEmail,
      badgeText: "K\xCDCH HO\u1EA0T TH\xC0NH C\xD4NG",
      badgeColor: "#10b981",
      summary: `Qu\u1EA3n tr\u1ECB vi\xEAn \u0111\xE3 x\xE1c nh\u1EADn thanh to\xE1n c\u1EE7a b\u1EA1n. T\xE0i kho\u1EA3n LifeOS \u0111\xE3 \u0111\u01B0\u1EE3c n\xE2ng c\u1EA5p ch\xEDnh th\u1EE9c l\xEAn g\xF3i <strong>${payment.planName}</strong> v\u1EDBi \u0111\u1EA7y \u0111\u1EE7 quy\u1EC1n truy c\u1EADp cao c\u1EA5p.`,
      details: [
        { label: "M\xE3 \u0111\u01A1n h\xE0ng", value: payment.orderId },
        { label: "G\xF3i d\u1ECBch v\u1EE5", value: payment.planName },
        { label: "S\u1ED1 ti\u1EC1n thanh to\xE1n", value: `${(payment.amount || 0).toLocaleString("vi-VN")} \u20AB` },
        { label: "Th\u1EDDi h\u1EA1n b\u1EA3n quy\u1EC1n", value: `\u0110\u1EBFn ng\xE0y ${expiryStr}` },
        { label: "Tr\u1EA1ng th\xE1i t\xE0i kho\u1EA3n", value: "HO\u1EA0T \u0110\u1ED8NG (PRO / ACTIVE)" }
      ],
      actionLabel: "B\u1EAFt \u0110\u1EA7u Tr\u1EA3i Nghi\u1EC7m Ngay",
      actionUrl: `${appUrl}/?view=dashboard`,
      footerNote: "C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 tin t\u01B0\u1EDFng s\u1EED d\u1EE5ng LifeOS l\xE0m h\u1EC7 \u0111i\u1EC1u h\xE0nh n\xE2ng t\u1EA7m cu\u1ED9c s\u1ED1ng!"
    });
    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `\u{1F389} [LifeOS] K\xEDch ho\u1EA1t th\xE0nh c\xF4ng g\xF3i c\u01B0\u1EDBc ${payment.planName} c\u1EE7a b\u1EA1n`,
      htmlBody: customerHtml,
      eventType: "PAYMENT_APPROVED_CUSTOMER",
      priority: "HIGH",
      metadata: { orderId: payment.orderId }
    }).catch((err) => console.error("[Notification] Error enqueuing payment approved mail:", err));
  }
  /**
   * 4. Khi Admin từ chối đơn thanh toán
   */
  static async onPaymentRejected(payment) {
    const appUrl = getAppBaseUrl();
    const customerHtml = buildEmailHtml({
      headline: "Th\xF4ng B\xE1o V\u1EC1 Giao D\u1ECBch Thanh To\xE1n G\xF3i C\u01B0\u1EDBc",
      recipientName: payment.userName || payment.userEmail,
      badgeText: "CH\u01AFA \u0110\u01AF\u1EE2C DUY\u1EC6T",
      badgeColor: "#ef4444",
      summary: `\u0110\u01A1n thanh to\xE1n g\xF3i <strong>${payment.planName}</strong> c\u1EE7a b\u1EA1n ch\u01B0a th\u1EC3 x\xE1c nh\u1EADn th\xE0nh c\xF4ng do l\xFD do sau: <em>"${payment.reason}"</em>.`,
      details: [
        { label: "M\xE3 \u0111\u01A1n h\xE0ng", value: payment.orderId },
        { label: "S\u1ED1 ti\u1EC1n", value: `${(payment.amount || 0).toLocaleString("vi-VN")} \u20AB` },
        { label: "L\xFD do t\u1EEB ch\u1ED1i", value: payment.reason },
        { label: "H\u01B0\u1EDBng x\u1EED l\xFD", value: "Vui l\xF2ng ki\u1EC3m tra l\u1EA1i giao d\u1ECBch ho\u1EB7c g\u1EEDi m\xE3 sao k\xEA cho ban qu\u1EA3n tr\u1ECB" }
      ],
      actionLabel: "Th\u1EF1c Hi\u1EC7n L\u1EA1i Thanh To\xE1n",
      actionUrl: `${appUrl}/?view=subscriptions`,
      footerNote: "N\u1EBFu b\u1EA1n \u0111\xE3 chuy\u1EC3n kho\u1EA3n th\xE0nh c\xF4ng nh\u01B0ng b\u1ECB t\u1EEB ch\u1ED1i, vui l\xF2ng li\xEAn h\u1EC7 tr\u1EF1c ti\u1EBFp b\u1ED9 ph\u1EADn h\u1ED7 tr\u1EE3."
    });
    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `\u26A0\uFE0F [LifeOS] Th\xF4ng tin v\u1EC1 \u0111\u01A1n thanh to\xE1n ${payment.orderId}`,
      htmlBody: customerHtml,
      eventType: "PAYMENT_REJECTED_CUSTOMER",
      metadata: { orderId: payment.orderId, reason: payment.reason }
    }).catch((err) => console.error("[Notification] Error enqueuing payment rejected mail:", err));
  }
  /**
   * 5. Khi có yêu cầu rút tiền hoa hồng Affiliate / CTV mới
   */
  static async onWithdrawalRequested(withdrawal) {
    const appUrl = getAppBaseUrl();
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: "Y\xEAu C\u1EA7u R\xFAt Ti\u1EC1n Hoa H\u1ED3ng C\u1ED9ng T\xE1c Vi\xEAn M\u1EDBi",
        badgeText: "R\xDAT TI\u1EC0N HOA H\u1ED2NG",
        badgeColor: "#8b5cf6",
        priority: "HIGH",
        summary: `C\u1ED9ng t\xE1c vi\xEAn <strong>${withdrawal.userEmail}</strong> v\u1EEBa t\u1EA1o y\xEAu c\u1EA7u r\xFAt s\u1ED1 ti\u1EC1n <strong>${withdrawal.amount.toLocaleString("vi-VN")} \u20AB</strong> hoa h\u1ED3ng t\xEDch l\u0169y.`,
        details: [
          { label: "M\xE3 y\xEAu c\u1EA7u", value: withdrawal.id },
          { label: "C\u1ED9ng t\xE1c vi\xEAn", value: `${withdrawal.userName || ""} (${withdrawal.userEmail})` },
          { label: "S\u1ED1 ti\u1EC1n r\xFAt", value: `${withdrawal.amount.toLocaleString("vi-VN")} \u20AB` },
          { label: "Ng\xE2n h\xE0ng nh\u1EADn", value: withdrawal.bankName },
          { label: "S\u1ED1 t\xE0i kho\u1EA3n", value: withdrawal.bankAccount },
          { label: "Ch\u1EE7 t\xE0i kho\u1EA3n", value: withdrawal.bankHolder }
        ],
        actionLabel: "Xem v\xE0 X\u1EED L\xFD Y\xEAu C\u1EA7u R\xFAt Ti\u1EC1n",
        actionUrl: `${appUrl}/?view=admin&tab=referrals`,
        footerNote: "Vui l\xF2ng ki\u1EC3m tra s\u1ED1 d\u01B0 hoa h\u1ED3ng h\u1EE3p l\u1EC7 tr\u01B0\u1EDBc khi b\u1EA5m x\xE1c nh\u1EADn chuy\u1EC3n kho\u1EA3n."
      });
      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `\u{1F4B8} [R\xDAT TI\u1EC0N] Y\xEAu c\u1EA7u r\xFAt ${withdrawal.amount.toLocaleString("vi-VN")} \u20AB t\u1EEB CTV ${withdrawal.userEmail}`,
        htmlBody: adminHtml,
        eventType: "ADMIN_ALERT_WITHDRAWAL_REQUEST",
        priority: "HIGH",
        metadata: { withdrawalId: withdrawal.id }
      }).catch((err) => console.error("[Notification] Error enqueuing admin withdrawal mail:", err));
    }
  }
  /**
   * 6. Khi người dùng gửi Phản hồi / Báo lỗi / Hỗ trợ
   */
  static async onFeedbackSubmitted(feedback) {
    const appUrl = getAppBaseUrl();
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: "Ph\u1EA3n H\u1ED3i / \u0110\xF3ng G\xF3p \xDD Ki\u1EBFn M\u1EDBi T\u1EEB Ng\u01B0\u1EDDi D\xF9ng",
        badgeText: "G\xD3P \xDD & B\xC1O L\u1ED6I",
        badgeColor: "#0ea5e9",
        summary: `Ng\u01B0\u1EDDi d\xF9ng <strong>${feedback.userEmail}</strong> v\u1EEBa g\u1EEDi m\u1ED9t ph\u1EA3n h\u1ED3i m\u1EDBi v\u1EC1 h\u1EC7 th\u1ED1ng.`,
        details: [
          { label: "Ng\u01B0\u1EDDi g\u1EEDi", value: `${feedback.userName || ""} (${feedback.userEmail})` },
          { label: "Danh m\u1EE5c", value: feedback.category },
          { label: "Ti\xEAu \u0111\u1EC1", value: feedback.subject },
          { label: "N\u1ED9i dung ph\u1EA3n h\u1ED3i", value: feedback.message.slice(0, 300) }
        ],
        actionLabel: "M\u1EDF Danh S\xE1ch Ph\u1EA3n H\u1ED3i",
        actionUrl: `${appUrl}/?view=admin&tab=feedbacks`
      });
      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `\u{1F4AC} [G\xF3p \xFD] [${feedback.category}] ${feedback.subject}`,
        htmlBody: adminHtml,
        eventType: "ADMIN_ALERT_FEEDBACK"
      }).catch((err) => console.error("[Notification] Error enqueuing feedback alert mail:", err));
    }
  }
  /**
   * 7. Khi có lỗi hệ thống 500 nghiêm trọng
   */
  static async onSystemCriticalError(error) {
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: "C\u1EA3nh B\xE1o L\u1ED7i M\xE1y Ch\u1EE7 500 Nghi\xEAm Tr\u1ECDng",
        badgeText: "L\u1ED6I H\u1EC6 TH\u1ED0NG",
        badgeColor: "#ef4444",
        priority: "CRITICAL",
        summary: `H\u1EC7 th\u1ED1ng v\u1EEBa b\u1EAFt \u0111\u01B0\u1EE3c m\u1ED9t ngo\u1EA1i l\u1EC7 500 ch\u01B0a \u0111\u01B0\u1EE3c x\u1EED l\xFD t\u1EA1i endpoint <code>${error.method} ${error.path}</code>.`,
        details: [
          { label: "Endpoint", value: `${error.method} ${error.path}` },
          { label: "Th\xF4ng b\xE1o l\u1ED7i", value: error.message },
          { label: "Ng\u01B0\u1EDDi d\xF9ng g\u1EB7p l\u1ED7i", value: error.userEmail || "Kh\xE1ch v\xE3ng lai / Kh\xE1ch ch\u01B0a \u0111\u0103ng nh\u1EADp" },
          { label: "Th\u1EDDi gian", value: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN") }
        ],
        footerNote: "Khuy\u1EBFn ngh\u1ECB: \u0110\u0103ng nh\u1EADp SSH VPS ho\u1EB7c ki\u1EC3m tra nh\u1EADt k\xFD log PM2 \u0111\u1EC3 ti\u1EBFn h\xE0nh kh\u1EAFc ph\u1EE5c."
      });
      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `\u{1F6A8} [CRITICAL ALERT] L\u1ED7i 500 t\u1EA1i ${error.method} ${error.path}`,
        htmlBody: adminHtml,
        eventType: "SYSTEM_ERROR_500",
        priority: "CRITICAL"
      }).catch((err) => console.error("[Notification] Error enqueuing 500 error alert mail:", err));
    }
  }
  /**
   * 8. Khi người dùng yêu cầu đặt lại mật khẩu qua Gmail
   */
  static async onPasswordResetRequested(data) {
    const userHtml = buildEmailHtml({
      headline: "Y\xEAu c\u1EA7u \u0110\u1EB7t l\u1EA1i M\u1EADt kh\u1EA9u T\xE0i kho\u1EA3n",
      recipientName: data.userName || "B\u1EA1n",
      badgeText: "B\u1EA2O M\u1EACT T\xC0I KHO\u1EA2N",
      badgeColor: "#ef4444",
      summary: `Ch\xFAng t\xF4i nh\u1EADn \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho t\xE0i kho\u1EA3n <strong>${data.email}</strong>. Vui l\xF2ng b\u1EA5m v\xE0o n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 t\u1EA1o m\u1EADt kh\u1EA9u m\u1EDBi an to\xE0n cho b\u1EA1n.`,
      details: [
        { label: "T\xE0i kho\u1EA3n", value: data.email },
        { label: "Th\u1EDDi h\u1EA1n li\xEAn k\u1EBFt", value: `${data.expiresMinutes} ph\xFAt` },
        { label: "M\xE3 x\xE1c th\u1EF1c th\u1EE7 c\xF4ng", value: data.resetToken },
        { label: "\u0110\u1ECBa ch\u1EC9 IP y\xEAu c\u1EA7u", value: data.ip || "B\u1EA3o m\u1EADt \u1EA9n danh" }
      ],
      actionLabel: "\u0110\u1EB7t L\u1EA1i M\u1EADt Kh\u1EA9u Ngay",
      actionUrl: data.resetUrl,
      footerNote: "N\u1EBFu b\u1EA1n KH\xD4NG y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, xin vui l\xF2ng b\u1ECF qua email n\xE0y. T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n v\u1EABn ho\xE0n to\xE0n an to\xE0n."
    });
    await emailQueueService.enqueue({
      recipient: data.email,
      subject: "\u{1F510} [LifeOS] H\u01B0\u1EDBng d\u1EABn \u0110\u1EB7t l\u1EA1i M\u1EADt kh\u1EA9u T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n",
      htmlBody: userHtml,
      eventType: "AUTH_PASSWORD_RESET",
      metadata: { userId: data.userId, expiresMinutes: data.expiresMinutes }
    }).catch((err) => console.error("[Notification] Error enqueuing password reset mail:", err));
  }
};

// src/backend/validation.ts
import { z } from "zod";
var LoginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, "M\u1EADt kh\u1EA9u kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng")
}).refine((data) => !!(data.identifier || data.email || data.username), {
  message: "Vui l\xF2ng cung c\u1EA5p email ho\u1EB7c t\xEAn \u0111\u0103ng nh\u1EADp"
});
var RegisterSchema = z.object({
  name: z.string().min(1, "H\u1ECD v\xE0 t\xEAn l\xE0 b\u1EAFt bu\u1ED9c").max(100),
  email: z.string().email("\u0110\u1ECBa ch\u1EC9 email kh\xF4ng h\u1EE3p l\u1EC7").max(150),
  password: z.string().min(6, "M\u1EADt kh\u1EA9u ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 6 k\xFD t\u1EF1").max(100)
});
var ForgotPasswordSchema = z.object({
  email: z.string().email("\u0110\u1ECBa ch\u1EC9 email kh\xF4ng h\u1EE3p l\u1EC7")
});
var ResetPasswordSchema = z.object({
  token: z.string().min(1, "M\xE3 kh\xF4i ph\u1EE5c kh\xF4ng h\u1EE3p l\u1EC7"),
  newPassword: z.string().min(6, "M\u1EADt kh\u1EA9u m\u1EDBi t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1")
});
var PasswordResetRequestSchema = z.object({
  email: z.string().email("\u0110\u1ECBa ch\u1EC9 email kh\xF4ng h\u1EE3p l\u1EC7"),
  verificationNote: z.string().max(500).optional().nullable(),
  claimToken: z.string().optional().nullable()
});
var PasswordResetConfirmSchema = z.object({
  ticketCode: z.string().min(1, "M\xE3 y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7"),
  claimToken: z.string().optional().nullable(),
  backupPin: z.string().optional().nullable(),
  newPassword: z.string().min(6, "M\u1EADt kh\u1EA9u m\u1EDBi t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1").max(100)
}).refine((data) => !!(data.claimToken || data.backupPin), {
  message: "Vui l\xF2ng cung c\u1EA5p m\xE3 phi\xEAn x\xE1c th\u1EF1c ho\u1EB7c m\xE3 PIN 6 s\u1ED1 t\u1EEB Admin"
});
var ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i"),
  newPassword: z.string().min(6, "M\u1EADt kh\u1EA9u m\u1EDBi t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1")
});
var FinanceTransactionSchema = z.object({
  accountId: z.string().min(1, "T\xE0i kho\u1EA3n ngu\u1ED3n l\xE0 b\u1EAFt bu\u1ED9c"),
  toAccountId: z.string().optional().nullable(),
  amount: z.number().positive("S\u1ED1 ti\u1EC1n ph\u1EA3i l\u1EDBn h\u01A1n 0"),
  type: z.enum(["Thu nh\u1EADp", "Chi ti\xEAu", "Chuy\u1EC3n ti\u1EC1n"]),
  category: z.string().default("Chung"),
  date: z.string().min(1, "Ng\xE0y giao d\u1ECBch l\xE0 b\u1EAFt bu\u1ED9c"),
  note: z.string().optional().nullable()
});
var CouponValidateSchema = z.object({
  code: z.string().min(1, "M\xE3 gi\u1EA3m gi\xE1 kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng")
});
var CartCheckoutSchema = z.object({
  couponCode: z.string().optional().nullable()
});
var SaaSCheckoutSessionSchema = z.object({
  plan: z.enum(["PERSONAL_1M", "PERSONAL_3M", "TEAM_1M", "PRO", "TEAM"]),
  cycle: z.enum(["monthly", "yearly", "1_MONTH", "3_MONTHS"]).default("monthly"),
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.enum(["vietqr", "card", "momo", "bank_transfer"]).default("vietqr")
});
var VerifyPaymentSchema = z.object({
  orderId: z.string().min(1, "M\xE3 \u0111\u01A1n h\xE0ng kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng"),
  txReference: z.string().optional().nullable()
});
var SubmitPaymentRequestSchema = z.object({
  orderId: z.string().min(1, "M\xE3 \u0111\u01A1n h\xE0ng kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng"),
  note: z.string().max(500, "Ghi ch\xFA t\u1ED1i \u0111a 500 k\xFD t\u1EF1").optional().nullable()
});
var AdminRejectPaymentSchema = z.object({
  reason: z.string().min(1, "Vui l\xF2ng cung c\u1EA5p l\xFD do t\u1EEB ch\u1ED1i").max(500)
});
var AdminUpdateBankConfigSchema = z.object({
  bankName: z.string().min(1, "T\xEAn ng\xE2n h\xE0ng l\xE0 b\u1EAFt bu\u1ED9c"),
  accountNumber: z.string().min(1, "S\u1ED1 t\xE0i kho\u1EA3n l\xE0 b\u1EAFt bu\u1ED9c"),
  accountHolder: z.string().min(1, "T\xEAn ch\u1EE7 t\xE0i kho\u1EA3n l\xE0 b\u1EAFt bu\u1ED9c"),
  transferPrefix: z.string().min(1, "C\xFA ph\xE1p n\u1ED9i dung chuy\u1EC3n kho\u1EA3n l\xE0 b\u1EAFt bu\u1ED9c").default("DUOTECH"),
  bankCode: z.string().optional().default("MB"),
  qrImageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true)
});
var UpgradePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "TEAM"]),
  cycle: z.enum(["monthly", "yearly"]).optional().default("monthly")
});
var AdminCreateUserSchema = z.object({
  name: z.string().min(1, "T\xEAn ng\u01B0\u1EDDi d\xF9ng l\xE0 b\u1EAFt bu\u1ED9c"),
  email: z.string().email("Email kh\xF4ng h\u1EE3p l\u1EC7"),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).default("USER"),
  plan: z.enum(["FREE", "PRO", "TEAM"]).default("FREE"),
  temporaryPassword: z.string().min(6, "M\u1EADt kh\u1EA9u t\u1EA1m th\u1EDDi t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1").default("Password123!")
});
var AdminUpdateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
  reason: z.string().optional().nullable()
});
var AdminChangePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "TEAM"]),
  durationMonths: z.number().optional().nullable(),
  reason: z.string().optional().nullable()
});
var AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "M\u1EADt kh\u1EA9u m\u1EDBi t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1"),
  reason: z.string().optional().nullable()
});
var AdminUpdatePlanSchema = z.object({
  name: z.string().min(1, "T\xEAn g\xF3i l\xE0 b\u1EAFt bu\u1ED9c"),
  description: z.string().min(1, "M\xF4 t\u1EA3 g\xF3i l\xE0 b\u1EAFt bu\u1ED9c"),
  monthlyPrice: z.number().min(0, "Gi\xE1 th\xE1ng kh\xF4ng \xE2m"),
  yearlyPrice: z.number().min(0, "Gi\xE1 n\u0103m kh\xF4ng \xE2m"),
  billingCycle: z.string().min(1, "Chu k\u1EF3 thanh to\xE1n l\xE0 b\u1EAFt bu\u1ED9c"),
  durationDays: z.number().min(1, "Th\u1EDDi h\u1EA1n t\u1ED1i thi\u1EC3u l\xE0 1 ng\xE0y").optional(),
  type: z.enum(["PERSONAL", "TEAM"]).optional(),
  maxTeamMembers: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  order: z.number().default(1),
  features: z.array(z.string()).default([]),
  quota: z.string().optional().nullable(),
  badge: z.string().optional().nullable()
});
var AdminUpdateLanguagesSchema = z.object({
  languages: z.array(z.object({
    code: z.string().min(2, "M\xE3 ng\xF4n ng\u1EEF t\u1ED1i thi\u1EC3u 2 k\xFD t\u1EF1"),
    name: z.string().min(1, "T\xEAn ng\xF4n ng\u1EEF l\xE0 b\u1EAFt bu\u1ED9c"),
    flag: z.string().min(1, "Bi\u1EC3u t\u01B0\u1EE3ng c\u1EDD l\xE0 b\u1EAFt bu\u1ED9c"),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    isDefault: z.boolean().default(false)
  }))
});
var CreateAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["GENERAL", "MAINTENANCE", "FEATURE", "SECURITY", "PROMOTION"]).default("GENERAL"),
  priority: z.enum(["NORMAL", "IMPORTANT", "CRITICAL"]).default("NORMAL"),
  targetAudience: z.enum(["ALL", "ACTIVE", "INACTIVE", "ROLE_ADMIN", "ROLE_USER", "PLAN_PRO", "PLAN_FREE", "PLAN_TEAM", "SELECTED_USERS"]).default("ALL"),
  targetUserIds: z.array(z.string()).optional(),
  channels: z.enum(["WEB", "EMAIL", "BOTH"]).default("WEB"),
  scheduledFor: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  actionLabel: z.string().optional().nullable()
});
var UpdateAnnouncementSchema = CreateAnnouncementSchema.partial();
var CreateTaskSchema = z.object({
  title: z.string().min(1, "Ti\xEAu \u0111\u1EC1 c\xF4ng vi\u1EC7c l\xE0 b\u1EAFt bu\u1ED9c").max(255, "Ti\xEAu \u0111\u1EC1 t\u1ED1i \u0111a 255 k\xFD t\u1EF1"),
  description: z.string().max(2e3, "M\xF4 t\u1EA3 t\u1ED1i \u0111a 2000 k\xFD t\u1EF1").optional().nullable(),
  status: z.enum(["Ch\u01B0a l\xE0m", "\u0110ang l\xE0m", "Ho\xE0n th\xE0nh", "T\u1EA1m ho\xE3n", "H\u1EE7y b\u1ECF", "TODO", "IN_PROGRESS", "DONE"]).default("Ch\u01B0a l\xE0m"),
  priority: z.enum(["Th\u1EA5p", "Trung b\xECnh", "Cao", "Kh\u1EA9n c\u1EA5p", "LOW", "MEDIUM", "HIGH", "URGENT"]).default("Trung b\xECnh"),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).default(0),
  actualHours: z.number().min(0).default(0),
  projectId: z.string().optional().nullable(),
  linkedGoalId: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  recurring: z.string().optional().nullable()
});
var UpdateTaskSchema = CreateTaskSchema.partial();
var CreateFinanceAccountSchema = z.object({
  name: z.string().min(1, "T\xEAn t\xE0i kho\u1EA3n l\xE0 b\u1EAFt bu\u1ED9c").max(100),
  type: z.enum(["Ti\u1EC1n m\u1EB7t", "Ng\xE2n h\xE0ng", "V\xED \u0111i\u1EC7n t\u1EED", "Th\u1EBB t\xEDn d\u1EE5ng", "\u0110\u1EA7u t\u01B0", "Kh\xE1c"]).default("Ti\u1EC1n m\u1EB7t"),
  balance: z.number().default(0),
  currency: z.string().default("VND"),
  color: z.string().default("#10b981")
});
var UpdateFinanceAccountSchema = CreateFinanceAccountSchema.partial();
var CreateTransactionSchema = z.object({
  accountId: z.string().min(1, "T\xE0i kho\u1EA3n l\xE0 b\u1EAFt bu\u1ED9c"),
  toAccountId: z.string().optional().nullable(),
  amount: z.number().positive("S\u1ED1 ti\u1EC1n ph\u1EA3i l\u1EDBn h\u01A1n 0"),
  type: z.enum(["Thu nh\u1EADp", "Chi ti\xEAu", "Chuy\u1EC3n ti\u1EC1n", "INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1, "Danh m\u1EE5c l\xE0 b\u1EAFt bu\u1ED9c").default("Chung"),
  date: z.string().min(1, "Ng\xE0y giao d\u1ECBch l\xE0 b\u1EAFt bu\u1ED9c"),
  note: z.string().max(500, "Ghi ch\xFA t\u1ED1i \u0111a 500 k\xFD t\u1EF1").optional().nullable()
});
var UpdateTransactionSchema = CreateTransactionSchema.partial();
var CreateHabitSchema = z.object({
  name: z.string().min(1, "T\xEAn th\xF3i quen l\xE0 b\u1EAFt bu\u1ED9c").max(150),
  category: z.string().default("Personal"),
  target: z.number().positive("M\u1EE5c ti\xEAu ph\u1EA3i l\u1EDBn h\u01A1n 0").default(1),
  unitLabel: z.string().default("l\u1EA7n"),
  unit: z.string().default("boolean"),
  scheduleTime: z.string().optional().nullable(),
  status: z.enum(["Active", "Archived", "Paused"]).default("Active")
});
var UpdateHabitSchema = CreateHabitSchema.partial();
var CreateGoalSchema = z.object({
  title: z.string().min(1, "Ti\xEAu \u0111\u1EC1 m\u1EE5c ti\xEAu l\xE0 b\u1EAFt bu\u1ED9c").max(200),
  category: z.string().default("Personal"),
  targetValue: z.number().positive().default(100),
  currentValue: z.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
  tier: z.string().default("Tier 1"),
  status: z.enum(["In Progress", "Completed", "Paused", "Behind"]).default("In Progress")
});
var UpdateGoalSchema = CreateGoalSchema.partial();
var CreateNoteSchema = z.object({
  title: z.string().min(1, "Ti\xEAu \u0111\u1EC1 ghi ch\xFA l\xE0 b\u1EAFt bu\u1ED9c").max(255),
  content: z.string().default(""),
  folder: z.string().default("Ghi ch\xFA chung"),
  category: z.string().default("C\xE1 nh\xE2n"),
  pinned: z.boolean().default(false),
  tags: z.string().default("[]")
});
var UpdateNoteSchema = CreateNoteSchema.partial();
var TaskAttachmentSchema = z.object({
  fileName: z.string().min(1, "T\xEAn t\u1EC7p l\xE0 b\u1EAFt bu\u1ED9c").max(255),
  fileUrl: z.string().url("\u0110\u01B0\u1EDDng d\u1EABn t\u1EC7p ph\u1EA3i l\xE0 URL h\u1EE3p l\u1EC7").refine((url) => url.startsWith("https://"), {
    message: "Ch\u1EC9 ch\u1EA5p nh\u1EADn t\u1EC7p l\u01B0u tr\u1EEF qua giao th\u1EE9c b\u1EA3o m\u1EADt HTTPS"
  }),
  fileSize: z.number().min(0).default(0)
});
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMsg = result.error.issues.map((e) => e.message).join("; ");
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: errorMsg,
          details: result.error.issues
        },
        message: errorMsg
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// src/backend/security/rateLimiter.ts
var MemoryRateLimiter = class {
  constructor(windowMs, max, message) {
    this.store = /* @__PURE__ */ new Map();
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    setInterval(() => this.cleanup(), 5 * 60 * 1e3).unref();
  }
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
  middleware(keyGenerator) {
    return (req, res, next) => {
      const now = Date.now();
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown_ip";
      const key = keyGenerator ? keyGenerator(req) : `${clientIp}`;
      const record = this.store.get(key);
      if (!record || now > record.resetTime) {
        this.store.set(key, {
          count: 1,
          resetTime: now + this.windowMs
        });
        res.setHeader("X-RateLimit-Limit", this.max);
        res.setHeader("X-RateLimit-Remaining", this.max - 1);
        next();
        return;
      }
      if (record.count >= this.max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1e3);
        res.setHeader("Retry-After", retryAfter);
        res.setHeader("X-RateLimit-Limit", this.max);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: this.message,
            retryAfterSeconds: retryAfter
          },
          message: this.message
        });
        return;
      }
      record.count += 1;
      res.setHeader("X-RateLimit-Limit", this.max);
      res.setHeader("X-RateLimit-Remaining", this.max - record.count);
      next();
    };
  }
};
var authRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1e3,
  10,
  "Qu\xE1 nhi\u1EC1u y\xEAu c\u1EA7u x\xE1c th\u1EF1c t\u1EEB \u0111\u1ECBa ch\u1EC9 IP n\xE0y. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt."
).middleware((req) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  const id = (req.body?.email || req.body?.identifier || req.body?.username || "").toLowerCase().trim();
  return `auth_${ip}_${id}`;
});
var passwordResetRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1e3,
  process.env.NODE_ENV === "test" ? 100 : 15,
  "Qu\xE1 nhi\u1EC1u y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt."
).middleware((req) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  return `pwd_${ip}_${req.path}`;
});
var paymentRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1e3,
  25,
  "Thao t\xE1c thanh to\xE1n qu\xE1 nhanh. Vui l\xF2ng ch\u1EDD v\xE0i ph\xFAt tr\u01B0\u1EDBc khi ti\u1EBFp t\u1EE5c."
).middleware((req) => {
  const userId = req.userId || req.user?.id || "guest";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  return `pay_${ip}_${userId}`;
});
var couponRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1e3,
  20,
  "B\u1EA1n \u0111\xE3 ki\u1EC3m tra m\xE3 gi\u1EA3m gi\xE1 qu\xE1 nhi\u1EC1u l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau."
).middleware((req) => {
  const userId = req.userId || req.user?.id || "guest";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  return `coupon_${ip}_${userId}`;
});
var uploadRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1e3,
  40,
  "T\u1EA7n su\u1EA5t t\u1EA3i l\xEAn t\u1EADp tin qu\xE1 cao. Vui l\xF2ng \u0111\u1EE3i trong gi\xE2y l\xE1t."
).middleware((req) => {
  const userId = req.userId || req.user?.id || "guest";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "ip";
  return `upload_${ip}_${userId}`;
});

// src/backend/routes/auth.ts
var authRouter = Router();
function setSessionCookie(req, res, token) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60 * 1e3
    // 14 days
  });
}
function clearSessionCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    path: "/"
  });
}
authRouter.post("/register", authRateLimiter, validateBody(RegisterSchema), async (req, res) => {
  try {
    const isRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION !== "false";
    if (!isRegistrationAllowed) {
      res.status(403).json({
        success: false,
        error: {
          code: "REGISTRATION_DISABLED",
          message: "Ch\u1EE9c n\u0103ng t\u1EF1 \u0111\u0103ng k\xFD hi\u1EC7n \u0111ang \u0111\xF3ng. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn \u0111\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p t\xE0i kho\u1EA3n."
        },
        message: "Ch\u1EE9c n\u0103ng t\u1EF1 \u0111\u0103ng k\xFD hi\u1EC7n \u0111ang \u0111\xF3ng. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn \u0111\u1EC3 \u0111\u01B0\u1EE3c c\u1EA5p t\xE0i kho\u1EA3n."
      });
      return;
    }
    const { name, email, password } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const rawPassword = String(password);
    const existing = await dbService.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng. Vui l\xF2ng \u0111\u0103ng nh\u1EADp ho\u1EB7c d\xF9ng email kh\xE1c."
        },
        message: "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng. Vui l\xF2ng \u0111\u0103ng nh\u1EADp ho\u1EB7c d\xF9ng email kh\xE1c."
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);
    const now = /* @__PURE__ */ new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
    const newUser = await dbService.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "USER",
      plan: "FREE",
      status: "ACTIVE",
      trialStartedAt: now,
      trialEndsAt,
      trialUsed: true
    });
    await referralService.getOrCreateProfile(newUser.id).catch((e) => console.warn("Referral profile init warning:", e));
    const referralCode = req.body.referralCode || req.query.ref;
    if (referralCode) {
      await referralService.bindReferral(newUser.id, String(referralCode)).catch((e) => console.warn("Referral bind warning:", e));
    }
    const token = jwt2.sign(
      { userId: newUser.id, role: newUser.role, email: newUser.email },
      getJwtSecret(),
      { expiresIn: "14d" }
    );
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await dbService.createSession(newUser.id, token, expiresAt);
    setSessionCookie(req, res, token);
    await dbService.createAuditLog(
      newUser.id,
      "USER_SELF_REGISTER",
      "users",
      newUser.id,
      null,
      { email: newUser.email, name: newUser.name, ip: clientIp }
    );
    const prisma = getPrisma();
    await prisma.notification.createMany({
      data: [
        {
          userId: newUser.id,
          title: "\u{1F389} K\xEDch ho\u1EA1t 7 ng\xE0y d\xF9ng th\u1EED mi\u1EC5n ph\xED LifeOS!",
          message: `Ch\xE0o m\u1EEBng b\u1EA1n! T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t 7 ng\xE0y d\xF9ng th\u1EED mi\u1EC5n ph\xED to\xE0n b\u1ED9 t\xEDnh n\u0103ng cao c\u1EA5p (h\u1EBFt h\u1EA1n v\xE0o ${trialEndsAt.toLocaleString("vi-VN")}).`,
          type: "info",
          read: false
        },
        {
          userId: newUser.id,
          title: "\u26A1 Tr\u1EA3i nghi\u1EC7m kh\xF4ng gi\u1EDBi h\u1EA1n",
          message: "B\u1EA1n c\xF3 th\u1EC3 t\u1EF1 do tr\u1EA3i nghi\u1EC7m Qu\u1EA3n l\xFD C\xF4ng vi\u1EC7c, T\xE0i ch\xEDnh, Th\xF3i quen, M\u1EE5c ti\xEAu v\xE0 Kh\xF4ng gian H\u1ECDc t\u1EADp. Sau 7 ng\xE0y, h\xE3y n\xE2ng c\u1EA5p g\xF3i \u0111\u1EC3 ti\u1EBFp t\u1EE5c \u0111\u1ED3ng b\u1ED9.",
          type: "success",
          read: false
        }
      ]
    }).catch((e) => console.warn("Registration notifications creation warning:", e));
    SystemNotificationHelper.onUserRegistered(
      { id: newUser.id, name: newUser.name, email: newUser.email },
      clientIp
    ).catch((e) => console.warn("[EmailQueue] Error enqueuing registration notification:", e));
    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      plan: newUser.plan,
      status: newUser.status,
      avatar: newUser.avatar,
      planExpiresAt: newUser.planExpiresAt,
      onboardingCompleted: newUser.onboardingCompleted,
      trialStartedAt: newUser.trialStartedAt,
      trialEndsAt: newUser.trialEndsAt
    };
    res.status(201).json({
      success: true,
      message: "Kh\u1EDFi t\u1EA1o t\xE0i kho\u1EA3n th\xE0nh c\xF4ng",
      user: safeUser
      // NOTE: token is intentionally NOT returned in body — use httpOnly cookie only
    });
  } catch (error) {
    console.error("Register error:", error);
    let errMsg = error.message || "";
    if (errMsg.includes("localhost:5432") || errMsg.includes("Can't reach database server") || errMsg.includes("P1001")) {
      errMsg = "Ch\u01B0a k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c C\u01A1 s\u1EDF d\u1EEF li\u1EC7u Cloud. Vui l\xF2ng ki\u1EC3m tra bi\u1EBFn m\xF4i tr\u01B0\u1EDDng DATABASE_URL trong m\u1EE5c Variables tr\xEAn Railway.";
    }
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "L\u1ED7i m\xE1y ch\u1EE7 khi kh\u1EDFi t\u1EA1o t\xE0i kho\u1EA3n: " + errMsg },
      message: "L\u1ED7i m\xE1y ch\u1EE7 khi kh\u1EDFi t\u1EA1o t\xE0i kho\u1EA3n: " + errMsg
    });
  }
});
authRouter.post("/login", authRateLimiter, validateBody(LoginSchema), async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const rawInput = (identifier || email || username || "").toString();
    const cleanInput = rawInput.toLowerCase().trim();
    const rawPassword = String(password);
    const failedAttempts = await dbService.getRecentFailedAttempts(cleanInput, 15);
    if (failedAttempts >= 5) {
      res.status(429).json({
        success: false,
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: "T\xE0i kho\u1EA3n t\u1EA1m th\u1EDDi b\u1ECB kh\xF3a do nh\u1EADp sai m\u1EADt kh\u1EA9u qu\xE1 5 l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt."
        },
        message: "T\xE0i kho\u1EA3n t\u1EA1m th\u1EDDi b\u1ECB kh\xF3a do nh\u1EADp sai m\u1EADt kh\u1EA9u qu\xE1 5 l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt."
      });
      return;
    }
    let user = await dbService.findUserByEmailOrUsername(cleanInput);
    if (!user && (cleanInput === "admin" || cleanInput === "superadmin")) {
      const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@lifeos.com").toLowerCase().trim();
      user = await dbService.findUserByEmail(adminEmail);
    }
    if (!user) {
      await dbService.recordLoginAttempt(cleanInput, false, "User not found", clientIp);
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email/T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c" },
        message: "Email/T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c"
      });
      return;
    }
    if (user.status === "DISABLED") {
      await dbService.recordLoginAttempt(cleanInput, false, "Account disabled", clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_DISABLED", message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Admin." },
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Admin."
      });
      return;
    }
    if (user.status === "SUSPENDED") {
      await dbService.recordLoginAttempt(cleanInput, false, "Account suspended", clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_SUSPENDED", message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB t\u1EA1m ng\u01B0ng." },
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB t\u1EA1m ng\u01B0ng."
      });
      return;
    }
    const isValidPassword = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!isValidPassword) {
      await dbService.recordLoginAttempt(cleanInput, false, "Invalid password", clientIp, user.id);
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email/T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c" },
        message: "Email/T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c"
      });
      return;
    }
    await dbService.recordLoginAttempt(cleanInput, true, "Success", clientIp, user.id);
    const token = jwt2.sign(
      { userId: user.id, role: user.role, email: user.email },
      getJwtSecret(),
      { expiresIn: "14d" }
    );
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await dbService.createSession(user.id, token, expiresAt);
    setSessionCookie(req, res, token);
    await dbService.createAuditLog(
      user.id,
      "USER_LOGIN",
      "users",
      user.id,
      null,
      { ip: clientIp, email: user.email }
    );
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      avatar: user.avatar,
      planExpiresAt: user.planExpiresAt,
      onboardingCompleted: user.onboardingCompleted
    };
    res.json({
      success: true,
      message: "\u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng",
      user: safeUser
      // NOTE: token is intentionally NOT returned in body — use httpOnly cookie only
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "L\u1ED7i m\xE1y ch\u1EE7 khi \u0111\u0103ng nh\u1EADp: " + error.message },
      message: "L\u1ED7i m\xE1y ch\u1EE7 khi \u0111\u0103ng nh\u1EADp: " + error.message
    });
  }
});
authRouter.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
  if (token) {
    await dbService.deleteSession(token);
  }
  clearSessionCookie(res);
  res.json({ success: true, message: "\u0110\u0103ng xu\u1EA5t th\xE0nh c\xF4ng" });
});
authRouter.post("/logout-all", requireAuth, async (req, res) => {
  const userId = req.userId;
  await dbService.deleteAllUserSessions(userId);
  clearSessionCookie(res);
  await dbService.createAuditLog(
    userId,
    "USER_LOGOUT_ALL_DEVICES",
    "users",
    userId,
    null,
    { reason: "User requested logout from all devices" }
  );
  res.json({ success: true, message: "\u0110\xE3 \u0111\u0103ng xu\u1EA5t kh\u1ECFi t\u1EA5t c\u1EA3 c\xE1c thi\u1EBFt b\u1ECB" });
});
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = req.user || await dbService.findUserById(req.userId);
    if (!user) {
      clearSessionCookie(res);
      res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" },
        message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng"
      });
      return;
    }
    const { subscriptionService: subscriptionService2 } = await Promise.resolve().then(() => (init_subscription_service(), subscription_service_exports));
    const subStatus = await subscriptionService2.checkUserSubscription(user.id);
    const verifiedPlan = user.role === "ADMIN" || user.role === "SUPERADMIN" ? user.plan : subStatus.hasAccess ? subStatus.planType === "TEAM" ? "TEAM" : "PRO" : "FREE";
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: verifiedPlan,
        status: user.status,
        avatar: user.avatar,
        planExpiresAt: subStatus.endDate || user.planExpiresAt || null,
        onboardingCompleted: user.onboardingCompleted,
        trialStartedAt: user.trialStartedAt || null,
        trialEndsAt: user.trialEndsAt || null,
        isTrial: Boolean(subStatus.isTrial)
      },
      subscriptionStatus: subStatus,
      token: req.headers.authorization?.split(" ")[1] || req.cookies?.token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
      message: error.message
    });
  }
});
authRouter.put("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, avatar, onboardingCompleted } = req.body;
    const updates = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof avatar === "string") updates.avatar = avatar.trim();
    if (typeof onboardingCompleted === "boolean") updates.onboardingCompleted = onboardingCompleted;
    const updated = await dbService.updateUser(userId, updates);
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt h\u1ED3 s\u01A1 th\xE0nh c\xF4ng",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        plan: updated.plan,
        status: updated.status,
        avatar: updated.avatar,
        planExpiresAt: updated.planExpiresAt,
        onboardingCompleted: updated.onboardingCompleted
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
      message: err.message
    });
  }
});
authRouter.post("/change-password", requireAuth, passwordResetRateLimiter, validateBody(ChangePasswordSchema), async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;
    const user = await dbService.findUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "Ng\u01B0\u1EDDi d\xF9ng kh\xF4ng t\u1ED3n t\u1EA1i" });
      return;
    }
    const isValid = await bcrypt.compare(String(oldPassword), user.passwordHash);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c" },
        message: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c"
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);
    await dbService.updateUser(userId, { passwordHash });
    await dbService.createAuditLog(
      userId,
      "USER_CHANGE_PASSWORD",
      "users",
      userId,
      null,
      { reason: "User updated password" }
    );
    res.json({ success: true, message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
      message: err.message
    });
  }
});
authRouter.get("/verify-reset-token", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      res.status(400).json({ valid: false, reason: "TOKEN_REQUIRED", message: "M\xE3 token kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
      return;
    }
    const prisma = getPrisma();
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      }
    });
    if (!record) {
      res.json({ valid: false, reason: "NOT_FOUND", message: "Li\xEAn k\u1EBFt \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a." });
      return;
    }
    if (record.used) {
      res.json({ valid: false, reason: "USED", message: "Li\xEAn k\u1EBFt \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng tr\u01B0\u1EDBc \u0111\xF3." });
      return;
    }
    const isExpired = new Date(record.expiresAt).getTime() < Date.now();
    if (isExpired) {
      res.json({ valid: false, reason: "EXPIRED", message: "Li\xEAn k\u1EBFt \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u \u0111\xE3 h\u1EBFt h\u1EA1n (t\u1ED1i \u0111a 30 ph\xFAt). Vui l\xF2ng y\xEAu c\u1EA7u l\u1EA1i." });
      return;
    }
    const rawEmail = record.user?.email || "";
    const [namePart, domainPart] = rawEmail.split("@");
    const maskedEmail = namePart.length > 2 ? `${namePart[0]}***${namePart.slice(-1)}@${domainPart || ""}` : `${namePart[0] || "*"}***@${domainPart || ""}`;
    res.json({
      valid: true,
      emailMasked: maskedEmail,
      expiresAt: record.expiresAt
    });
  } catch (err) {
    console.error("Verify reset token error:", err);
    res.status(500).json({ valid: false, reason: "SERVER_ERROR", message: "L\u1ED7i ki\u1EC3m tra t\xEDnh h\u1EE3p l\u1EC7 c\u1EE7a token." });
  }
});
authRouter.post("/forgot-password", passwordResetRateLimiter, validateBody(ForgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const cleanEmail = email.toLowerCase().trim();
    const user = await dbService.findUserByEmail(cleanEmail);
    if (user && user.status === "ACTIVE") {
      const prisma = getPrisma();
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true }
      }).catch((e) => console.warn("Old tokens cleanup warning:", e));
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresMinutes = 30;
      const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1e3);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
          used: false
        }
      });
      await dbService.createAuditLog(
        user.id,
        "PASSWORD_RESET_REQUESTED",
        "users",
        user.id,
        null,
        { email: cleanEmail, ip: clientIp }
      );
      const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      const resetUrl = `${appUrl}/?resetToken=${resetToken}`;
      await SystemNotificationHelper.onPasswordResetRequested({
        userId: user.id,
        userName: user.name,
        email: user.email,
        resetUrl,
        resetToken,
        expiresMinutes,
        ip: clientIp
      });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[AUTH-DEV] Password reset link for ${cleanEmail}: ${resetUrl}`);
      }
    }
    res.json({
      success: true,
      message: "N\u1EBFu email t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng, h\u01B0\u1EDBng d\u1EABn \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn h\u1ED9p th\u01B0 Gmail c\u1EE7a b\u1EA1n. Vui l\xF2ng ki\u1EC3m tra h\u1ED9p th\u01B0 \u0111\u1EBFn (Inbox) ho\u1EB7c th\u01B0 m\u1EE5c Spam."
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "L\u1ED7i x\u1EED l\xFD y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u" },
      message: "L\u1ED7i x\u1EED l\xFD y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u"
    });
  }
});
authRouter.post("/reset-password", passwordResetRateLimiter, validateBody(ResetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const prisma = getPrisma();
    const cleanToken = String(token || "").trim();
    if (!cleanToken) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "M\xE3 x\xE1c nh\u1EADn \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u kh\xF4ng h\u1EE3p l\u1EC7." },
        message: "M\xE3 x\xE1c nh\u1EADn \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u kh\xF4ng h\u1EE3p l\u1EC7."
      });
      return;
    }
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: cleanToken },
      include: { user: true }
    });
    if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_RESET_TOKEN",
          message: "Li\xEAn k\u1EBFt \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng y\xEAu c\u1EA7u g\u1EEDi l\u1EA1i li\xEAn k\u1EBFt m\u1EDBi."
        },
        message: "Li\xEAn k\u1EBFt \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng y\xEAu c\u1EA7u g\u1EEDi l\u1EA1i li\xEAn k\u1EBFt m\u1EDBi."
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true }
      }),
      // Revoke all existing sessions across devices for security
      prisma.session.deleteMany({
        where: { userId: record.userId }
      })
    ]);
    clearSessionCookie(res);
    await dbService.createAuditLog(
      record.userId,
      "PASSWORD_RESET_COMPLETED",
      "users",
      record.userId,
      null,
      { tokenUsed: record.id, ip: clientIp }
    );
    res.json({
      success: true,
      message: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! M\u1ECDi phi\xEAn \u0111\u0103ng nh\u1EADp c\u0169 \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u0103ng xu\u1EA5t an to\xE0n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp v\u1EDBi m\u1EADt kh\u1EA9u m\u1EDBi."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
      message: err.message
    });
  }
});
authRouter.get("/google/config", (req, res) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  res.json({
    enabled: Boolean(clientId && clientId.length > 5),
    clientId: clientId || null
  });
});
authRouter.get("/google", (req, res) => {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Google OAuth Ch\u01B0a C\u1EA5u H\xECnh</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f172a;color:#f8fafc;text-align:center;">
          <div style="max-width:500px;margin:auto;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;">
            <h2 style="color:#f43f5e;">\u26A0\uFE0F Google OAuth Ch\u01B0a \u0110\u01B0\u1EE3c B\u1EADt</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
              H\u1EC7 th\u1ED1ng ch\u01B0a t\xECm th\u1EA5y bi\u1EBFn <code>GOOGLE_CLIENT_ID</code> trong file <code>.env</code>.
            </p>
            <p style="color:#cbd5e1;font-size:13px;">
              Qu\u1EA3n tr\u1ECB vi\xEAn vui l\xF2ng c\u1EA5u h\xECnh <code>GOOGLE_CLIENT_ID</code> v\xE0 <code>GOOGLE_CLIENT_SECRET</code> trong file <code>.env</code> tr\xEAn m\xE1y ch\u1EE7 VPS.
            </p>
            <a href="/" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Quay v\u1EC1 Trang Ch\u1EE7
            </a>
          </div>
        </body>
        </html>
      `);
      return;
    }
    const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/api/auth/google/callback`;
    const state = crypto.randomBytes(24).toString("hex");
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1e3
      // 10 minutes
    });
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    res.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error("Google OAuth init error:", error);
    res.redirect("/?login=google_init_error");
  }
});
var handleGoogleCallback = async (req, res) => {
  try {
    const { code, state, error: googleError } = req.query;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const storedState = req.cookies?.google_oauth_state;
    res.clearCookie("google_oauth_state", { path: "/" });
    if (googleError) {
      console.warn("[Google OAuth] Google returned error:", googleError);
      res.redirect("/?login=google_cancelled");
      return;
    }
    if (!state || !storedState || state !== storedState) {
      console.warn("[Google OAuth] State mismatch or expired");
      res.redirect("/?login=google_state_mismatch");
      return;
    }
    if (!code || typeof code !== "string") {
      res.redirect("/?login=google_missing_code");
      return;
    }
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
    const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[Google OAuth] Token exchange failed:", tokenData);
      res.redirect("/?login=google_token_exchange_failed");
      return;
    }
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await userinfoResponse.json();
    if (!userinfoResponse.ok || !profile?.email) {
      console.error("[Google OAuth] Failed to fetch userinfo:", profile);
      res.redirect("/?login=google_profile_fetch_failed");
      return;
    }
    const googleId = String(profile.sub || profile.id);
    const cleanEmail = String(profile.email).toLowerCase().trim();
    const fullName = String(profile.name || profile.given_name || cleanEmail.split("@")[0]).trim();
    const avatarUrl = profile.picture || null;
    const emailVerified = Boolean(profile.email_verified);
    if (!emailVerified) {
      res.redirect("/?login=google_email_unverified");
      return;
    }
    const prisma = getPrisma();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: cleanEmail }
        ]
      }
    });
    if (user) {
      if (user.status === "SUSPENDED" || user.status === "DISABLED") {
        res.redirect("/?login=account_locked");
        return;
      }
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatarUrl) updates.avatar = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }
    } else {
      const randomUnusablePassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomUnusablePassword, 10);
      const generatedUsername = `${cleanEmail.split("@")[0]}_${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
      const now = /* @__PURE__ */ new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
      user = await dbService.createUser({
        name: fullName,
        email: cleanEmail,
        username: generatedUsername,
        passwordHash,
        googleId,
        role: "USER",
        plan: "FREE",
        status: "ACTIVE",
        avatar: avatarUrl,
        trialStartedAt: now,
        trialEndsAt,
        trialUsed: true
      });
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "\u{1F389} Ch\xE0o m\u1EEBng b\u1EA1n gia nh\u1EADp LifeOS qua Google!",
          message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt v\xE0 kh\u1EDFi t\u1EA1o th\xE0nh c\xF4ng b\u1EB1ng t\xE0i kho\u1EA3n Google.",
          type: "info",
          read: false
        }
      }).catch((e) => console.warn("Google user welcome notification warning:", e));
      SystemNotificationHelper.onUserRegistered(
        { id: user.id, name: user.name, email: user.email },
        clientIp
      ).catch((e) => console.warn("[EmailQueue] Error enqueuing registration notification:", e));
    }
    const token = jwt2.sign(
      { userId: user.id, role: user.role, email: user.email },
      getJwtSecret(),
      { expiresIn: "14d" }
    );
    const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await dbService.createSession(user.id, token, sessionExpiry);
    setSessionCookie(req, res, token);
    await dbService.createAuditLog(
      user.id,
      "USER_GOOGLE_LOGIN",
      "users",
      user.id,
      null,
      { email: user.email, googleId, ip: clientIp }
    );
    res.redirect(`/?login=google_success&token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect("/?login=google_server_error");
  }
};
authRouter.get("/google/callback", handleGoogleCallback);
authRouter.get("/callback/google", handleGoogleCallback);
authRouter.post("/google/credential", authRateLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    if (!credential || typeof credential !== "string") {
      res.status(400).json({ success: false, message: "Google Credential Token l\xE0 b\u1EAFt bu\u1ED9c." });
      return;
    }
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await verifyRes.json();
    if (!verifyRes.ok || !payload?.email) {
      res.status(401).json({ success: false, message: "Google Token kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n." });
      return;
    }
    if (clientId && payload.aud !== clientId) {
      res.status(403).json({ success: false, message: "Token Google kh\xF4ng thu\u1ED9c \u1EE9ng d\u1EE5ng n\xE0y (Audience mismatch)." });
      return;
    }
    if (!payload.email_verified) {
      res.status(400).json({ success: false, message: "Email Google ch\u01B0a \u0111\u01B0\u1EE3c x\xE1c th\u1EF1c." });
      return;
    }
    const googleId = String(payload.sub);
    const cleanEmail = String(payload.email).toLowerCase().trim();
    const fullName = String(payload.name || cleanEmail.split("@")[0]).trim();
    const avatarUrl = payload.picture || null;
    const prisma = getPrisma();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: cleanEmail }
        ]
      }
    });
    if (user) {
      if (user.status === "SUSPENDED" || user.status === "DISABLED") {
        res.status(403).json({ success: false, message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB t\u1EA1m kh\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Admin." });
        return;
      }
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatarUrl) updates.avatar = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }
    } else {
      const randomPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPass, 10);
      const generatedUsername = `${cleanEmail.split("@")[0]}_${crypto.randomBytes(3).toString("hex")}`.toLowerCase();
      const now = /* @__PURE__ */ new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
      user = await dbService.createUser({
        name: fullName,
        email: cleanEmail,
        username: generatedUsername,
        passwordHash,
        googleId,
        role: "USER",
        plan: "FREE",
        status: "ACTIVE",
        avatar: avatarUrl,
        trialStartedAt: now,
        trialEndsAt,
        trialUsed: true
      });
      SystemNotificationHelper.onUserRegistered(
        { id: user.id, name: user.name, email: user.email },
        clientIp
      ).catch((e) => console.warn("[EmailQueue] Error enqueuing registration notification:", e));
    }
    const token = jwt2.sign(
      { userId: user.id, role: user.role, email: user.email },
      getJwtSecret(),
      { expiresIn: "14d" }
    );
    const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
    await dbService.createSession(user.id, token, sessionExpiry);
    setSessionCookie(req, res, token);
    await dbService.createAuditLog(
      user.id,
      "USER_GOOGLE_LOGIN",
      "users",
      user.id,
      null,
      { email: user.email, googleId, ip: clientIp }
    );
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      avatar: user.avatar,
      planExpiresAt: user.planExpiresAt,
      onboardingCompleted: user.onboardingCompleted
    };
    res.json({
      success: true,
      message: "\u0110\u0103ng nh\u1EADp Google th\xE0nh c\xF4ng",
      user: safeUser
    });
  } catch (error) {
    console.error("Google credential login error:", error);
    res.status(500).json({ success: false, message: "L\u1ED7i m\xE1y ch\u1EE7 khi x\xE1c th\u1EF1c Google: " + error.message });
  }
});
authRouter.post("/onboarding-setup", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const selections = req.body.selections || req.body || {};
    const summary = await dbService.setupUserPersonalizedWorkspace(userId, selections);
    const updatedUser = await dbService.findUserById(userId);
    await dbService.createAuditLog(
      userId,
      "USER_COMPLETE_ONBOARDING",
      "users",
      userId,
      null,
      { selections, summary }
    );
    res.json({
      success: true,
      message: "Thi\u1EBFt l\u1EADp kh\xF4ng gian l\xE0m vi\u1EC7c c\xE1 nh\xE2n h\xF3a th\xE0nh c\xF4ng",
      summary,
      user: updatedUser ? {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        plan: updatedUser.plan,
        status: updatedUser.status,
        avatar: updatedUser.avatar,
        planExpiresAt: updatedUser.planExpiresAt,
        onboardingCompleted: updatedUser.onboardingCompleted
      } : null
    });
  } catch (err) {
    console.error("Onboarding setup error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "L\u1ED7i khi c\u1EA5u h\xECnh d\u1EEF li\u1EC7u kh\u1EA3o s\xE1t: " + err.message },
      message: "L\u1ED7i khi c\u1EA5u h\xECnh d\u1EEF li\u1EC7u kh\u1EA3o s\xE1t: " + err.message
    });
  }
});
authRouter.get("/sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const prisma = getPrisma();
    const currentToken = req.cookies?.token;
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: /* @__PURE__ */ new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentToken
    }));
    res.json({
      success: true,
      sessions: formattedSessions,
      totalActive: formattedSessions.length
    });
  } catch (err) {
    console.error("GET /api/auth/sessions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
authRouter.post("/sessions/revoke-others", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const prisma = getPrisma();
    const currentToken = req.cookies?.token;
    const deleteResult = await prisma.session.deleteMany({
      where: {
        userId,
        token: { not: currentToken || "" }
      }
    });
    await dbService.createAuditLog(
      userId,
      "USER_REVOKE_OTHER_SESSIONS",
      "sessions",
      userId,
      null,
      { revokedCount: deleteResult.count }
    );
    res.json({
      success: true,
      message: `\u0110\xE3 \u0111\u0103ng xu\u1EA5t kh\u1ECFi ${deleteResult.count} thi\u1EBFt b\u1ECB/phi\xEAn l\xE0m vi\u1EC7c kh\xE1c th\xE0nh c\xF4ng.`,
      revokedCount: deleteResult.count
    });
  } catch (err) {
    console.error("POST /api/auth/sessions/revoke-others error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
async function generateUniqueTicketCode(prisma) {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(1e3 + Math.random() * 9e3);
    const code = `RST-${num}`;
    const exists = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: code }
    });
    if (!exists) return code;
  }
  return `RST-${Math.floor(1e4 + Math.random() * 9e4)}`;
}
authRouter.post("/reset-request", passwordResetRateLimiter, validateBody(PasswordResetRequestSchema), async (req, res) => {
  try {
    const { email, verificationNote, claimToken } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const prisma = getPrisma();
    const user = await dbService.findUserByEmail(cleanEmail);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n v\u1EDBi email n\xE0y trong h\u1EC7 th\u1ED1ng." },
        message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n v\u1EDBi email n\xE0y trong h\u1EC7 th\u1ED1ng."
      });
      return;
    }
    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_DISABLED", message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB kh\xF3a ho\u1EB7c v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn." },
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111ang b\u1ECB kh\xF3a ho\u1EB7c v\xF4 hi\u1EC7u h\xF3a. Vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn."
      });
      return;
    }
    const existingRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      },
      orderBy: { createdAt: "desc" }
    });
    if (existingRequest) {
      if (existingRequest.status === "APPROVED" && existingRequest.expiresAt && new Date(existingRequest.expiresAt).getTime() < Date.now()) {
        await prisma.passwordResetRequest.update({
          where: { id: existingRequest.id },
          data: { status: "EXPIRED" }
        });
      } else {
        if (claimToken) {
          const sentHash = crypto.createHash("sha256").update(String(claimToken).trim()).digest("hex");
          if (sentHash === existingRequest.claimTokenHash) {
            res.json({
              success: true,
              resumed: true,
              ticketCode: existingRequest.ticketCode,
              claimToken: String(claimToken).trim(),
              status: existingRequest.status,
              expiresAt: existingRequest.expiresAt,
              message: "\u0110\xE3 kh\xF4i ph\u1EE5c phi\xEAn y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u \u0111ang ho\u1EA1t \u0111\u1ED9ng c\u1EE7a b\u1EA1n."
            });
            return;
          }
        }
        await prisma.passwordResetRequest.update({
          where: { id: existingRequest.id },
          data: { status: "EXPIRED" }
        });
      }
    }
    const rawClaimToken = crypto.randomBytes(32).toString("hex");
    const claimTokenHash = crypto.createHash("sha256").update(rawClaimToken).digest("hex");
    const ticketCode = await generateUniqueTicketCode(prisma);
    const newRequest = await prisma.passwordResetRequest.create({
      data: {
        ticketCode,
        userId: user.id,
        email: cleanEmail,
        verificationNote: verificationNote ? String(verificationNote).trim().slice(0, 500) : null,
        claimTokenHash,
        status: "PENDING"
      }
    });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
        select: { id: true }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u: ${ticketCode}`,
            message: `Ng\u01B0\u1EDDi d\xF9ng ${cleanEmail} v\u1EEBa g\u1EEDi y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u (${ticketCode}). Vui l\xF2ng v\xE0o trang Qu\u1EA3n tr\u1ECB \u0111\u1EC3 duy\u1EC7t.`,
            type: "Info",
            read: false
          }
        });
      }
    } catch (notifErr) {
      console.warn("Admin notification creation warning:", notifErr);
    }
    await dbService.createAuditLog(
      user.id,
      "PASSWORD_RESET_REQUEST_CREATED",
      "password_reset_requests",
      newRequest.id,
      null,
      { ticketCode, email: cleanEmail }
    );
    res.json({
      success: true,
      ticketCode,
      claimToken: rawClaimToken,
      status: "PENDING",
      message: "Y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng. Vui l\xF2ng gi\u1EEF m\xE0n h\xECnh ho\u1EB7c ghi nh\u1EDB m\xE3 y\xEAu c\u1EA7u \u0111\u1EC3 ch\u1EDD Admin ph\xEA duy\u1EC7t."
    });
  } catch (err) {
    console.error("POST /api/auth/reset-request error:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi g\u1EEDi y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u" });
  }
});
authRouter.post("/reset-status", async (req, res) => {
  try {
    const { ticketCode, email, claimToken, backupPin } = req.body;
    const prisma = getPrisma();
    let request = null;
    if (ticketCode) {
      request = await prisma.passwordResetRequest.findUnique({
        where: { ticketCode: String(ticketCode).trim().toUpperCase() }
      });
    } else if (email) {
      request = await prisma.passwordResetRequest.findFirst({
        where: {
          email: String(email).toLowerCase().trim(),
          status: { in: ["PENDING", "APPROVED"] }
        },
        orderBy: { createdAt: "desc" }
      });
    }
    if (!request) {
      res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u." },
        message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u."
      });
      return;
    }
    if (request.status === "APPROVED" && request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()) {
      request = await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: "EXPIRED" }
      });
    }
    let isAuthorized = false;
    let authMethod = null;
    if (claimToken) {
      const hash = crypto.createHash("sha256").update(String(claimToken).trim()).digest("hex");
      if (hash === request.claimTokenHash) {
        isAuthorized = true;
        authMethod = "CLAIM_TOKEN";
      }
    }
    if (!isAuthorized && backupPin && request.backupPin) {
      if (String(backupPin).trim() === request.backupPin.trim()) {
        isAuthorized = true;
        authMethod = "BACKUP_PIN";
      }
    }
    const isExpired = request.status === "EXPIRED" || request.expiresAt && new Date(request.expiresAt).getTime() < Date.now();
    const canSetNewPassword = isAuthorized && request.status === "APPROVED" && !isExpired;
    res.json({
      success: true,
      ticketCode: request.ticketCode,
      email: request.email,
      status: request.status,
      isAuthorized,
      authMethod,
      canSetNewPassword,
      expiresAt: request.expiresAt,
      approvedAt: request.approvedAt,
      createdAt: request.createdAt,
      message: canSetNewPassword ? "Y\xEAu c\u1EA7u \u0111\xE3 \u0111\u01B0\u1EE3c ph\xEA duy\u1EC7t! B\u1EA1n c\xF3 th\u1EC3 \u0111\u1EB7t m\u1EADt kh\u1EA9u m\u1EDBi ngay." : request.status === "PENDING" ? "\u0110ang ch\u1EDD Qu\u1EA3n tr\u1ECB vi\xEAn ph\xEA duy\u1EC7t..." : request.status === "REJECTED" ? "Y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB t\u1EEB ch\u1ED1i b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn." : isExpired ? "Phi\xEAn ph\xEA duy\u1EC7t \u0111\xE3 h\u1EBFt h\u1EA1n sau 30 ph\xFAt. Vui l\xF2ng t\u1EA1o y\xEAu c\u1EA7u m\u1EDBi." : !isAuthorized ? "B\u1EA1n ch\u01B0a \u0111\u01B0\u1EE3c x\xE1c th\u1EF1c tr\xEAn thi\u1EBFt b\u1ECB n\xE0y. Vui l\xF2ng s\u1EED d\u1EE5ng \u0111\xFAng tr\xECnh duy\u1EC7t \u0111\xE3 g\u1EEDi y\xEAu c\u1EA7u ho\u1EB7c nh\u1EADp M\xE3 PIN 6 s\u1ED1 do Admin cung c\u1EA5p." : "Tr\u1EA1ng th\xE1i y\xEAu c\u1EA7u: " + request.status
    });
  } catch (err) {
    console.error("POST /api/auth/reset-status error:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi ki\u1EC3m tra tr\u1EA1ng th\xE1i" });
  }
});
authRouter.post("/reset-cancel", async (req, res) => {
  try {
    const { ticketCode, claimToken } = req.body;
    const prisma = getPrisma();
    if (!ticketCode) {
      res.status(400).json({ success: false, message: "Thi\u1EBFu m\xE3 y\xEAu c\u1EA7u" });
      return;
    }
    const request = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: String(ticketCode).trim().toUpperCase() }
    });
    if (!request) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u" });
      return;
    }
    if (claimToken) {
      const hash = crypto.createHash("sha256").update(String(claimToken).trim()).digest("hex");
      if (hash !== request.claimTokenHash) {
        res.status(403).json({ success: false, message: "Token x\xE1c th\u1EF1c kh\xF4ng h\u1EE3p l\u1EC7" });
        return;
      }
    }
    await prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED" }
    });
    res.json({
      success: true,
      message: "\u0110\xE3 h\u1EE7y y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng."
    });
  } catch (err) {
    console.error("POST /api/auth/reset-cancel error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
authRouter.post("/reset-confirm", passwordResetRateLimiter, validateBody(PasswordResetConfirmSchema), async (req, res) => {
  try {
    const { ticketCode, claimToken, backupPin, newPassword } = req.body;
    const prisma = getPrisma();
    const request = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: String(ticketCode).trim().toUpperCase() }
    });
    if (!request) {
      res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u." },
        message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u."
      });
      return;
    }
    if (request.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_COMPLETED", message: "Y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng th\xE0nh c\xF4ng tr\u01B0\u1EDBc \u0111\xF3." },
        message: "Y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng th\xE0nh c\xF4ng tr\u01B0\u1EDBc \u0111\xF3."
      });
      return;
    }
    if (request.status === "REJECTED") {
      res.status(400).json({
        success: false,
        error: { code: "REQUEST_REJECTED", message: "Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 b\u1ECB Qu\u1EA3n tr\u1ECB vi\xEAn t\u1EEB ch\u1ED1i." },
        message: "Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 b\u1ECB Qu\u1EA3n tr\u1ECB vi\xEAn t\u1EEB ch\u1ED1i."
      });
      return;
    }
    if (request.status !== "APPROVED") {
      res.status(400).json({
        success: false,
        error: { code: "NOT_APPROVED", message: "Y\xEAu c\u1EA7u n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c Qu\u1EA3n tr\u1ECB vi\xEAn ph\xEA duy\u1EC7t." },
        message: "Y\xEAu c\u1EA7u n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c Qu\u1EA3n tr\u1ECB vi\xEAn ph\xEA duy\u1EC7t."
      });
      return;
    }
    if (request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()) {
      await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: "EXPIRED" }
      });
      res.status(400).json({
        success: false,
        error: { code: "REQUEST_EXPIRED", message: "Phi\xEAn ph\xEA duy\u1EC7t \u0111\xE3 qu\xE1 th\u1EDDi h\u1EA1n 30 ph\xFAt. Vui l\xF2ng t\u1EA1o y\xEAu c\u1EA7u m\u1EDBi." },
        message: "Phi\xEAn ph\xEA duy\u1EC7t \u0111\xE3 qu\xE1 th\u1EDDi h\u1EA1n 30 ph\xFAt. Vui l\xF2ng t\u1EA1o y\xEAu c\u1EA7u m\u1EDBi."
      });
      return;
    }
    let isAuthorized = false;
    let authMethod = "CLAIM_TOKEN";
    if (claimToken) {
      const hash = crypto.createHash("sha256").update(String(claimToken).trim()).digest("hex");
      if (hash === request.claimTokenHash) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized && backupPin && request.backupPin) {
      if (String(backupPin).trim() === request.backupPin.trim()) {
        isAuthorized = true;
        authMethod = "BACKUP_PIN";
      }
    }
    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: { code: "UNAUTHORIZED_DEVICE", message: "X\xE1c th\u1EF1c b\u1EA3o m\u1EADt th\u1EA5t b\u1EA1i! Tr\xECnh duy\u1EC7t n\xE0y kh\xF4ng kh\u1EDBp v\u1EDBi y\xEAu c\u1EA7u ho\u1EB7c m\xE3 PIN kh\xF4ng ch\xEDnh x\xE1c." },
        message: "X\xE1c th\u1EF1c b\u1EA3o m\u1EADt th\u1EA5t b\u1EA1i! Tr\xECnh duy\u1EC7t n\xE0y kh\xF4ng kh\u1EDBp v\u1EDBi y\xEAu c\u1EA7u ho\u1EB7c m\xE3 PIN kh\xF4ng ch\xEDnh x\xE1c."
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          updatedAt: /* @__PURE__ */ new Date()
        }
      }),
      // Revoke all active sessions for security
      prisma.session.deleteMany({
        where: { userId: request.userId }
      })
    ]);
    await dbService.createAuditLog(
      request.userId,
      "ADMIN_APPROVED_PASSWORD_RESET_COMPLETED",
      "users",
      request.userId,
      null,
      { ticketCode: request.ticketCode, email: request.email, authMethod }
    );
    res.json({
      success: true,
      message: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! B\u1EA1n c\xF3 th\u1EC3 s\u1EED d\u1EE5ng m\u1EADt kh\u1EA9u m\u1EDBi \u0111\u1EC3 \u0111\u0103ng nh\u1EADp ngay."
    });
  } catch (err) {
    console.error("POST /api/auth/reset-confirm error:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi c\u1EADp nh\u1EADt m\u1EADt kh\u1EA9u m\u1EDBi" });
  }
});

// src/backend/routes/api.ts
import { Router as Router6 } from "express";
import bcrypt3 from "bcryptjs";
init_db();

// src/backend/services/decisionEngine.service.ts
var DecisionEngineService = class {
  /**
   * Evaluate a multi-criteria decision matrix with weights, constraints, and risk scores.
   * All calculations run deterministically on the backend with mathematical rigor.
   */
  static evaluateDecision(payload) {
    const { criteria = [], options = [], risks = [] } = payload;
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 1), 0) || 1;
    const rankedOptions = options.map((option) => {
      let weightedSum = 0;
      const violatedConstraints = [];
      const scores = option.criterionScores || {};
      criteria.forEach((crit) => {
        const rawScore = scores[crit.id] ?? 5;
        if (crit.isMustHave && rawScore < 5) {
          violatedConstraints.push(`Kh\xF4ng \u0111\u1EA1t ti\xEAu ch\xED b\u1EAFt bu\u1ED9c: "${crit.name}" (\u0110i\u1EC3m: ${rawScore}/10)`);
        }
        if (crit.isDealBreaker && rawScore < 3) {
          violatedConstraints.push(`Vi ph\u1EA1m \u0111i\u1EC1u ki\u1EC7n lo\u1EA1i tr\u1EEB: "${crit.name}" (\u0110i\u1EC3m: ${rawScore}/10)`);
        }
        const normalizedScore = crit.type === "cost" ? 11 - rawScore : rawScore;
        weightedSum += normalizedScore * (crit.weight || 1);
      });
      const weightedScore = parseFloat((weightedSum / totalWeight).toFixed(2));
      const optionRisks = risks.filter((r) => r.optionId === option.id);
      let calculatedRisk = 0;
      if (optionRisks.length > 0) {
        calculatedRisk = optionRisks.reduce((sum, r) => sum + r.probability * r.severity, 0) / (optionRisks.length * 25);
      } else {
        calculatedRisk = (option.riskLevel || 3) / 10;
      }
      const riskScore = parseFloat((calculatedRisk * 10).toFixed(2));
      const passesConstraints = violatedConstraints.length === 0;
      const penalty = passesConstraints ? 0 : 5;
      const netScore = Math.max(0, parseFloat((weightedScore - riskScore * 0.25 - penalty).toFixed(2)));
      const cost = option.cost || 1;
      const costBenefitRatio = parseFloat((netScore / (cost > 0 ? Math.log10(cost + 10) : 1)).toFixed(3));
      return {
        optionId: option.id,
        optionName: option.name,
        weightedScore,
        riskScore,
        netScore,
        passesConstraints,
        violatedConstraints,
        costBenefitRatio
      };
    });
    rankedOptions.sort((a, b) => b.netScore - a.netScore);
    const eligible = rankedOptions.filter((o) => o.passesConstraints);
    const recommendedOptionId = eligible.length > 0 ? eligible[0].optionId : rankedOptions[0]?.optionId || null;
    const recommendedOption = rankedOptions.find((o) => o.optionId === recommendedOptionId);
    let summary = "";
    if (recommendedOption) {
      if (recommendedOption.passesConstraints) {
        summary = `L\u1EF1a ch\u1ECDn t\u1ED1i \u01B0u nh\u1EA5t theo ma tr\u1EADn tr\u1ECDng s\u1ED1 l\xE0 "${recommendedOption.optionName}" v\u1EDBi \u0111i\u1EC3m t\u1ED5ng h\u1EE3p ${recommendedOption.netScore}/10, r\u1EE7i ro \u0111\xE1nh gi\xE1 ${recommendedOption.riskScore}/10 v\xE0 th\u1ECFa m\xE3n to\xE0n b\u1ED9 ti\xEAu ch\xED c\u1ED1t l\xF5i.`;
      } else {
        summary = `C\u1EA3nh b\xE1o: L\u1EF1a ch\u1ECDn "${recommendedOption.optionName}" \u0111\u1EA1t \u0111i\u1EC3m cao nh\u1EA5t nh\u01B0ng c\xF3 \u0111i\u1EC1u ki\u1EC7n r\xE0ng bu\u1ED9c ch\u01B0a th\u1ECFa m\xE3n (${recommendedOption.violatedConstraints.join(", ")}).`;
      }
    } else {
      summary = "Ch\u01B0a c\xF3 \u0111\u1EE7 ph\u01B0\u01A1ng \xE1n ho\u1EB7c ti\xEAu ch\xED \u0111\u1EC3 t\xEDnh to\xE1n ma tr\u1EADn quy\u1EBFt \u0111\u1ECBnh.";
    }
    const matrix = options.map((o) => ({
      optionId: o.id,
      scores: o.criterionScores || {}
    }));
    return {
      rankedOptions,
      recommendedOptionId,
      matrix,
      summary
    };
  }
};

// src/backend/services/automationEngine.service.ts
init_db();
var AutomationEngineService = class {
  /**
   * Evaluates and executes matching rules based on an event trigger
   */
  static async triggerEvent(userId, triggerType, eventContext) {
    const prisma = getPrisma();
    const rules = await prisma.automationRule.findMany({
      where: {
        userId,
        active: true,
        triggerType
      }
    });
    if (!rules || rules.length === 0) {
      return { triggeredCount: 0, executedCount: 0 };
    }
    let executedCount = 0;
    for (const rule of rules) {
      if (rule.cooldownMinutes > 0 && rule.lastExecutedAt) {
        const diffMinutes = (Date.now() - rule.lastExecutedAt.getTime()) / (1e3 * 60);
        if (diffMinutes < rule.cooldownMinutes) {
          continue;
        }
      }
      let conditions = [];
      try {
        conditions = JSON.parse(rule.conditions || "[]");
      } catch (e) {
        conditions = [];
      }
      const isMatch = this.evaluateConditions(conditions, eventContext);
      if (!isMatch) continue;
      let actions = [];
      try {
        actions = JSON.parse(rule.actions || "[]");
      } catch (e) {
        actions = [];
      }
      const executionStartTime = Date.now();
      let status = "Success";
      let errorMsg = null;
      const executionResults = [];
      try {
        for (const action of actions) {
          const res = await this.executeAction(userId, action, eventContext);
          executionResults.push(res);
        }
        executedCount++;
      } catch (err) {
        status = "Failed";
        errorMsg = err.message || "Action execution error";
      }
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          executionCount: rule.executionCount + 1,
          lastExecutedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          userId,
          status,
          triggerData: JSON.stringify(eventContext),
          resultData: JSON.stringify(executionResults),
          error: errorMsg,
          executedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    return { triggeredCount: rules.length, executedCount };
  }
  static evaluateConditions(conditions, context) {
    if (conditions.length === 0) return true;
    return conditions.every((c) => {
      const actualValue = context[c.field];
      switch (c.operator) {
        case "equals":
          return String(actualValue) === String(c.value);
        case "not_equals":
          return String(actualValue) !== String(c.value);
        case "greater_than":
          return Number(actualValue) > Number(c.value);
        case "less_than":
          return Number(actualValue) < Number(c.value);
        case "contains":
          return String(actualValue || "").toLowerCase().includes(String(c.value || "").toLowerCase());
        default:
          return true;
      }
    });
  }
  static async executeAction(userId, action, context) {
    const prisma = getPrisma();
    switch (action.type) {
      case "create_notification": {
        const title = action.params.title || "LifeOS T\u1EF1 \u0111\u1ED9ng h\xF3a";
        const message = action.params.message || `K\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng b\u1EDFi h\u1EC7 th\u1ED1ng (${JSON.stringify(context)})`;
        return await prisma.notification.create({
          data: {
            userId,
            title,
            message,
            type: "automation",
            read: false,
            date: /* @__PURE__ */ new Date()
          }
        });
      }
      case "create_task": {
        const title = action.params.title || "Nhi\u1EC7m v\u1EE5 t\u1EF1 \u0111\u1ED9ng";
        return await prisma.task.create({
          data: {
            userId,
            title,
            description: action.params.description || "\u0110\u01B0\u1EE3c sinh t\u1EF1 \u0111\u1ED9ng qua Automation Rule",
            status: "Ch\u01B0a l\xE0m",
            priority: action.params.priority || "Trung b\xECnh",
            dueDate: action.params.dueDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
          }
        });
      }
      case "update_task_status": {
        if (context.taskId && action.params.newStatus) {
          return await prisma.task.updateMany({
            where: { id: context.taskId, userId },
            data: { status: action.params.newStatus }
          });
        }
        break;
      }
      case "log_event":
      default:
        return { logged: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
    }
  }
};

// src/backend/routes/api.ts
init_subscription_service();

// src/backend/routes/testLab.routes.ts
import { Router as Router2 } from "express";
init_db();
init_emailQueue_service();
init_subscription_service();
import bcrypt2 from "bcryptjs";
var testLabRouter = Router2();
testLabRouter.get("/health-check", requireAdmin, async (req, res) => {
  const startTime = Date.now();
  const prisma = getPrisma();
  let dbLatency = 0;
  let dbOk = false;
  let dbError = null;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbLatency = Date.now() - dbStart;
    dbOk = true;
  } catch (err) {
    dbError = err.message || "L\u1ED7i k\u1EBFt n\u1ED1i c\u01A1 s\u1EDF d\u1EEF li\u1EC7u";
  }
  let smtpOk = false;
  let smtpMessage = "";
  const smtpStart = Date.now();
  try {
    const smtpRes = await emailQueueService.verifySmtpConnection();
    smtpOk = smtpRes.ok;
    smtpMessage = smtpRes.message;
  } catch (err) {
    smtpOk = false;
    smtpMessage = err.message || "L\u1ED7i ki\u1EC3m tra k\u1EBFt n\u1ED1i SMTP";
  }
  const smtpLatency = Date.now() - smtpStart;
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  let queueStats = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
  try {
    queueStats = await emailQueueService.getQueueStats();
  } catch (err) {
    console.warn("[TestLab] Queue stats warning:", err.message);
  }
  const overallSuccess = dbOk;
  res.json({
    success: overallSuccess,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    totalLatencyMs: Date.now() - startTime,
    database: {
      ok: dbOk,
      latencyMs: dbLatency,
      error: dbError
    },
    smtp: {
      ok: smtpOk,
      latencyMs: smtpLatency,
      message: smtpMessage
    },
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
    },
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(uptimeSeconds % 3600 / 60)}m ${uptimeSeconds % 60}s`
    },
    queue: queueStats
  });
});
testLabRouter.post("/trigger-notification-test", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  const targetEmail = req.body?.targetEmail || req.user?.email || "admin@lifeos.com";
  const customMessage = req.body?.message || "Ki\u1EC3m tra th\xF4ng b\xE1o th\u1EDDi gian th\u1EF1c LifeOS Live Test Lab";
  const now = /* @__PURE__ */ new Date();
  try {
    const notification = await prisma.notification.create({
      data: {
        user: { connect: { id: adminId } },
        title: "\u{1F514} [Test Lab] Th\u1EED nghi\u1EC7m Chu\xF4ng Th\xF4ng B\xE1o Web",
        message: customMessage,
        type: "SYSTEM",
        priority: "IMPORTANT",
        read: false,
        isTestData: true
      }
    });
    const emailSubject = `[LifeOS Live Test] Th\xF4ng b\xE1o th\u1EED nghi\u1EC7m h\u1EC7 th\u1ED1ng (${now.toLocaleTimeString("vi-VN")})`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 20px; font-weight: 700; color: #0f172a;">LifeOS Live Test Lab</span>
          <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;">TEST VERIFIED</span>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Xin ch\xE0o,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">\u0110\xE2y l\xE0 email th\u1EED nghi\u1EC7m \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t tr\u1EF1c ti\u1EBFp t\u1EEB Trung t\xE2m Ki\u1EC3m tra Tr\u1EF1c ti\u1EBFp (Live Test Lab) c\u1EE7a LifeOS.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">N\u1ED9i dung tin nh\u1EAFn:</p>
          <p style="margin: 0; font-size: 14px; color: #0f172a; font-family: monospace;">${customMessage}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          Th\u1EDDi gian k\xEDch ho\u1EA1t: ${now.toLocaleString("vi-VN")} | \u0110\xE1nh d\u1EA5u: is_test_data = true
        </p>
      </div>
    `;
    const queueId = await emailQueueService.enqueue({
      recipient: targetEmail,
      subject: emailSubject,
      htmlBody: emailHtml,
      eventType: "TEST_LAB_NOTIFICATION",
      isTestData: true,
      metadata: { adminId, notificationId: notification.id }
    });
    res.json({
      success: true,
      message: "\u0110\xE3 t\u1EA1o chu\xF4ng th\xF4ng b\xE1o web v\xE0 \u0111\u01B0a email v\xE0o h\xE0ng \u0111\u1EE3i th\xE0nh c\xF4ng!",
      notification: {
        id: notification.id,
        title: notification.title,
        read: notification.read,
        createdAt: notification.createdAt
      },
      emailQueue: {
        queueId,
        recipient: targetEmail,
        subject: emailSubject
      }
    });
  } catch (err) {
    console.error("[TestLab] Notification trigger error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
testLabRouter.get("/free-mode-simulation", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  try {
    const isFreeMode = await subscriptionService.isGlobalFreeMode();
    const paidUser = await prisma.user.findFirst({
      where: { role: "USER", plan: { not: "FREE" } },
      select: { id: true, email: true, plan: true, planExpiresAt: true }
    });
    const unpaidUser = await prisma.user.findFirst({
      where: { role: "USER", plan: "FREE" },
      select: { id: true, email: true, plan: true, planExpiresAt: true }
    });
    let paidSimResult = null;
    let unpaidSimResult = null;
    if (paidUser) {
      paidSimResult = await subscriptionService.checkUserSubscription(paidUser.id);
    }
    if (unpaidUser) {
      unpaidSimResult = await subscriptionService.checkUserSubscription(unpaidUser.id);
    }
    res.json({
      success: true,
      globalFreeModeActive: isFreeMode,
      explanation: isFreeMode ? "Ch\u1EBF \u0111\u1ED9 D\xF9ng Th\u1EED Mi\u1EC5n Ph\xED To\xE0n H\u1EC7 Th\u1ED1ng \u0111ang B\u1EACT: T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi d\xF9ng (k\u1EC3 c\u1EA3 ch\u01B0a mua) \u0111\u1EC1u \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a 100% t\xEDnh n\u0103ng." : "Ch\u1EBF \u0111\u1ED9 D\xF9ng Th\u1EED Mi\u1EC5n Ph\xED To\xE0n H\u1EC7 Th\u1ED1ng \u0111ang T\u1EAET: Ch\u1EC9 ng\u01B0\u1EDDi d\xF9ng c\xF3 g\xF3i tr\u1EA3 ph\xED \u0111ang ho\u1EA1t \u0111\u1ED9ng m\u1EDBi \u0111\u01B0\u1EE3c truy c\u1EADp c\xE1c ph\xE2n h\u1EC7.",
      simulation: {
        unpaidUser: unpaidUser ? {
          email: unpaidUser.email,
          originalPlan: unpaidUser.plan,
          hasAccessUnderCurrentPolicy: unpaidSimResult?.hasAccess ?? false,
          effectivePlanName: unpaidSimResult?.planName ?? "Ch\u01B0a x\xE1c \u0111\u1ECBnh"
        } : { note: "Kh\xF4ng c\xF3 t\xE0i kho\u1EA3n FREE m\u1EABu trong CSDL" },
        paidUser: paidUser ? {
          email: paidUser.email,
          originalPlan: paidUser.plan,
          hasAccessUnderCurrentPolicy: paidSimResult?.hasAccess ?? true,
          effectivePlanName: paidSimResult?.planName ?? "G\xF3i Tr\u1EA3 Ph\xED"
        } : { note: "Kh\xF4ng c\xF3 t\xE0i kho\u1EA3n PAID m\u1EABu trong CSDL" }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
testLabRouter.post("/seed-sandbox-data", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  const seedPrefix = `sandbox_${Date.now().toString(36)}`;
  const now = /* @__PURE__ */ new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const salt = await bcrypt2.genSalt(10);
      const testHash = await bcrypt2.hash("DemoPass@123", salt);
      const testUser = await tx.user.create({
        data: {
          email: `${seedPrefix}_user@testlab.lifeos`,
          name: `H\u1ECDc Vi\xEAn Sandbox (${seedPrefix})`,
          username: `${seedPrefix}_user`,
          passwordHash: testHash,
          role: "USER",
          plan: "FREE",
          status: "ACTIVE",
          isTestData: true
        }
      });
      const task1 = await tx.task.create({
        data: {
          userId: testUser.id,
          title: "[Sandbox Demo] Kh\u1EDFi t\u1EA1o K\u1EBF ho\u1EA1ch Sprint tu\u1EA7n m\u1EDBi",
          priority: "Cao",
          status: "\u0110ang l\xE0m",
          isTestData: true
        }
      });
      const task2 = await tx.task.create({
        data: {
          userId: testUser.id,
          title: "[Sandbox Demo] R\xE0 so\xE1t ng\xE2n s\xE1ch th\xE1ng v\xE0 c\xE2n \u0111\u1ED1i h\u0169 chi ti\xEAu",
          priority: "Trung b\xECnh",
          status: "Ch\u01B0a l\xE0m",
          isTestData: true
        }
      });
      const habit = await tx.habit.create({
        data: {
          user: { connect: { id: testUser.id } },
          name: "[Sandbox Demo] \u0110\u1ECDc s\xE1ch ph\xE1t tri\u1EC3n 20 ph\xFAt m\u1ED7i s\xE1ng",
          category: "Personal",
          streak: 5,
          status: "Active",
          isTestData: true
        }
      });
      const goal = await tx.goal.create({
        data: {
          userId: testUser.id,
          title: "[Sandbox Demo] N\xE2ng cao n\u0103ng su\u1EA5t c\xE1 nh\xE2n v\u1EDBi LifeOS Masterclass",
          category: "K\u1EF9 n\u0103ng",
          progress: 45,
          status: "\u0110ang th\u1EF1c hi\u1EC7n",
          isTestData: true
        }
      });
      const note = await tx.note.create({
        data: {
          userId: testUser.id,
          title: "[Sandbox Demo] Ghi ch\xFA ph\u01B0\u01A1ng ph\xE1p Second Brain & P.A.R.A",
          content: "T\u1ED5 ch\u1EE9c th\xF4ng tin theo 4 t\u1EA7ng: Projects (D\u1EF1 \xE1n), Areas (Tr\xE1ch nhi\u1EC7m), Resources (T\xE0i nguy\xEAn), Archives (L\u01B0u tr\u1EEF).",
          isTestData: true
        }
      });
      const account = await tx.financeAccount.create({
        data: {
          userId: testUser.id,
          name: "[Sandbox Demo] V\xED Ti\u1EC1n M\u1EB7t",
          type: "CASH",
          balance: 5e6
        }
      });
      const transaction = await tx.transaction.create({
        data: {
          userId: testUser.id,
          accountId: account.id,
          type: "EXPENSE",
          amount: 85e3,
          category: "\u0102n u\u1ED1ng",
          note: "[Sandbox Demo] B\u1EEFa tr\u01B0a v\u0103n ph\xF2ng",
          date: now.toISOString().split("T")[0],
          isTestData: true
        }
      });
      const notification = await tx.notification.create({
        data: {
          user: { connect: { id: testUser.id } },
          title: "\u{1F389} [Sandbox Demo] Ch\xE0o m\u1EEBng b\u1EA1n gia nh\u1EADp LifeOS Sandbox!",
          message: "D\u1EEF li\u1EC7u n\xE0y \u0111\u01B0\u1EE3c t\u1EA1o ra ho\xE0n to\xE0n \u0111\u1ED9c l\u1EADp cho m\u1EE5c \u0111\xEDch ki\u1EC3m th\u1EED an to\xE0n.",
          type: "SYSTEM",
          read: false,
          isTestData: true
        }
      });
      await tx.auditLog.create({
        data: {
          adminId,
          action: "SEED_SANDBOX_DATA",
          beforeState: null,
          afterState: JSON.stringify({ seededUserId: testUser.id, seedPrefix }),
          result: "Success",
          reason: `Admin \u0111\xE3 kh\u1EDFi t\u1EA1o d\u1EEF li\u1EC7u m\u1EABu Sandbox qua Live Test Lab (${seedPrefix}).`,
          isTestData: true
        }
      });
      return {
        userId: testUser.id,
        email: testUser.email,
        seededCounts: {
          users: 1,
          tasks: 2,
          habits: 1,
          goals: 1,
          notes: 1,
          transactions: 1,
          notifications: 1
        }
      };
    });
    res.json({
      success: true,
      message: "Kh\u1EDFi t\u1EA1o b\u1ED9 d\u1EEF li\u1EC7u Sandbox th\u1EED nghi\u1EC7m th\xE0nh c\xF4ng! To\xE0n b\u1ED9 b\u1EA3n ghi \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EAFn c\u1EDD is_test_data = true an to\xE0n.",
      data: result
    });
  } catch (err) {
    console.error("[TestLab] Sandbox seeder error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
testLabRouter.post("/clean-sandbox-data", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const delNotifications = await tx.notification.deleteMany({ where: { isTestData: true } });
      const delTasks = await tx.task.deleteMany({ where: { isTestData: true } });
      const delTransactions = await tx.transaction.deleteMany({ where: { isTestData: true } });
      const delHabits = await tx.habit.deleteMany({ where: { isTestData: true } });
      const delGoals = await tx.goal.deleteMany({ where: { isTestData: true } });
      const delNotes = await tx.note.deleteMany({ where: { isTestData: true } });
      const delEmailQueue = await tx.emailQueue.deleteMany({ where: { isTestData: true } });
      const delUsers = await tx.user.deleteMany({ where: { isTestData: true } });
      const delAuditLogs = await tx.auditLog.deleteMany({ where: { isTestData: true } });
      return {
        notifications: delNotifications.count,
        tasks: delTasks.count,
        transactions: delTransactions.count,
        habits: delHabits.count,
        goals: delGoals.count,
        notes: delNotes.count,
        emailQueue: delEmailQueue.count,
        users: delUsers.count,
        auditLogs: delAuditLogs.count,
        totalCleaned: delNotifications.count + delTasks.count + delTransactions.count + delHabits.count + delGoals.count + delNotes.count + delEmailQueue.count + delUsers.count + delAuditLogs.count
      };
    });
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "PURGE_SANDBOX_DATA",
        beforeState: null,
        afterState: JSON.stringify(summary),
        result: "Success",
        reason: `Admin \u0111\xE3 k\xEDch ho\u1EA1t D\u1ECDn d\u1EB9p Sandbox. \u0110\xE3 x\xF3a ${summary.totalCleaned} b\u1EA3n ghi th\u1EED nghi\u1EC7m.`,
        isTestData: false
      }
    });
    res.json({
      success: true,
      message: `D\u1ECDn d\u1EB9p Sandbox ho\xE0n t\u1EA5t! \u0110\xE3 x\xF3a s\u1EA1ch ${summary.totalCleaned} b\u1EA3n ghi th\u1EED nghi\u1EC7m kh\u1ECFi c\u01A1 s\u1EDF d\u1EEF li\u1EC7u. D\u1EEF li\u1EC7u ng\u01B0\u1EDDi d\xF9ng th\u1EADt \u0111\u01B0\u1EE3c b\u1EA3o v\u1EC7 100%.`,
      cleaned: summary
    });
  } catch (err) {
    console.error("[TestLab] Sandbox clean error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// src/backend/services/team.service.ts
init_db();
init_subscription_service();
var teamService = {
  async getMyTeam(userId) {
    const prisma = getPrisma();
    const ownedTeam = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        subscription: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          },
          orderBy: { addedAt: "asc" }
        }
      }
    });
    if (ownedTeam) {
      const now = /* @__PURE__ */ new Date();
      const isSubActive = Boolean(
        ownedTeam.subscription && ownedTeam.subscription.status === "ACTIVE" && ownedTeam.subscription.paymentStatus === "PAID" && new Date(ownedTeam.subscription.endDate).getTime() > now.getTime()
      );
      const maxMembers = ownedTeam.maxMembers || 5;
      const currentMemberCount = ownedTeam.members.length;
      const remainingSlots = Math.max(0, maxMembers - currentMemberCount);
      const inviteCode = `TEAM-${ownedTeam.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;
      return {
        role: "OWNER",
        team: {
          id: ownedTeam.id,
          name: ownedTeam.name,
          ownerId: ownedTeam.ownerId,
          owner: ownedTeam.owner,
          maxMembers,
          currentMemberCount,
          remainingSlots,
          inviteCode,
          canAddMembers: isSubActive && remainingSlots > 0,
          isSubscriptionActive: isSubActive,
          subscription: ownedTeam.subscription ? {
            id: ownedTeam.subscription.id,
            planName: ownedTeam.subscription.planName,
            status: isSubActive ? "ACTIVE" : "EXPIRED",
            endDate: ownedTeam.subscription.endDate.toISOString(),
            remainingDays: isSubActive ? Math.ceil((new Date(ownedTeam.subscription.endDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : 0
          } : null,
          members: ownedTeam.members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            role: m.role,
            addedAt: m.addedAt.toISOString()
          }))
        }
      };
    }
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: {
          include: {
            owner: { select: { id: true, name: true, email: true, avatar: true } },
            subscription: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } }
              },
              orderBy: { addedAt: "asc" }
            }
          }
        }
      }
    });
    if (membership && membership.team) {
      const team = membership.team;
      const now = /* @__PURE__ */ new Date();
      const isSubActive = Boolean(
        team.subscription && team.subscription.status === "ACTIVE" && team.subscription.paymentStatus === "PAID" && new Date(team.subscription.endDate).getTime() > now.getTime()
      );
      return {
        role: "MEMBER",
        team: {
          id: team.id,
          name: team.name,
          ownerId: team.ownerId,
          owner: team.owner,
          maxMembers: team.maxMembers,
          currentMemberCount: team.members.length,
          isSubscriptionActive: isSubActive,
          subscription: team.subscription ? {
            id: team.subscription.id,
            planName: team.subscription.planName,
            status: isSubActive ? "ACTIVE" : "EXPIRED",
            endDate: team.subscription.endDate.toISOString(),
            remainingDays: isSubActive ? Math.ceil((new Date(team.subscription.endDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : 0
          } : null,
          members: team.members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            role: m.role,
            addedAt: m.addedAt.toISOString()
          }))
        }
      };
    }
    return {
      role: "NONE",
      team: null
    };
  },
  async createOrUpdateTeamName(ownerId, name) {
    const prisma = getPrisma();
    const cleanName = (name || "").trim();
    if (!cleanName) throw new Error("T\xEAn nh\xF3m kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.");
    const subStatus = await subscriptionService.checkUserSubscription(ownerId);
    if (!subStatus.hasAccess || subStatus.planType !== "TEAM" && subStatus.role !== "SUPERADMIN" && subStatus.role !== "ADMIN") {
      throw new Error("Ch\u1EC9 t\xE0i kho\u1EA3n \u0111\u0103ng k\xFD g\xF3i Team m\u1EDBi c\xF3 quy\u1EC1n qu\u1EA3n l\xFD v\xE0 \u0111\u1EB7t t\xEAn nh\xF3m.");
    }
    const existing = await prisma.team.findFirst({ where: { ownerId } });
    if (existing) {
      return await prisma.team.update({
        where: { id: existing.id },
        data: { name: cleanName }
      });
    }
    return await prisma.team.create({
      data: {
        name: cleanName,
        ownerId,
        subscriptionId: subStatus.subscriptionId || null,
        maxMembers: 5
      }
    });
  },
  async addMember(ownerId, email) {
    const prisma = getPrisma();
    const cleanEmail = (email || "").toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error("Vui l\xF2ng nh\u1EADp \u0111\u1ECBa ch\u1EC9 email c\u1EE7a th\xE0nh vi\xEAn.");
    }
    const subStatus = await subscriptionService.checkUserSubscription(ownerId);
    if (!subStatus.hasAccess || subStatus.planType !== "TEAM" && subStatus.role !== "SUPERADMIN" && subStatus.role !== "ADMIN") {
      throw new Error("T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n kh\xF4ng c\xF3 g\xF3i Team \u0111ang ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 th\xEAm th\xE0nh vi\xEAn.");
    }
    let team = await prisma.team.findFirst({
      where: { ownerId },
      include: {
        members: true
      }
    });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: "Nh\xF3m l\xE0m vi\u1EC7c c\u1EE7a t\xF4i",
          ownerId,
          subscriptionId: subStatus.subscriptionId || null,
          maxMembers: 5
        },
        include: {
          members: true
        }
      });
    }
    const maxLimit = team.maxMembers || 5;
    if (team.members.length >= maxLimit) {
      const err = new Error(`Nh\xF3m \u0111\xE3 \u0111\u1EA1t s\u1ED1 l\u01B0\u1EE3ng t\u1ED1i \u0111a ${maxLimit} th\xE0nh vi\xEAn. Kh\xF4ng th\u1EC3 th\xEAm ng\u01B0\u1EDDi d\xF9ng m\u1EDBi.`);
      err.code = "TEAM_MEMBER_LIMIT_REACHED";
      throw err;
    }
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, name: true }
    });
    if (!targetUser) {
      throw new Error(`Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng v\u1EDBi email '${cleanEmail}'. Ng\u01B0\u1EDDi d\xF9ng c\u1EA7n \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n tr\u01B0\u1EDBc.`);
    }
    if (targetUser.id === ownerId) {
      throw new Error("Ch\u1EE7 nh\xF3m \u0111\xE3 s\u1EDF h\u1EEFu to\xE0n quy\u1EC1n qu\u1EA3n tr\u1ECB, kh\xF4ng c\u1EA7n th\xEAm ch\xEDnh m\xECnh v\xE0o danh s\xE1ch th\xE0nh vi\xEAn.");
    }
    const isAlreadyMember = team.members.some((m) => m.userId === targetUser.id);
    if (isAlreadyMember) {
      throw new Error(`Ng\u01B0\u1EDDi d\xF9ng '${targetUser.name}' (${cleanEmail}) \u0111\xE3 l\xE0 th\xE0nh vi\xEAn trong nh\xF3m.`);
    }
    const membership = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: targetUser.id,
        role: "MEMBER"
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: "B\u1EA1n \u0111\u01B0\u1EE3c th\xEAm v\xE0o G\xF3i Team LifeOS!",
        message: `B\u1EA1n v\u1EEBa \u0111\u01B0\u1EE3c th\xEAm v\xE0o nh\xF3m "${team.name}". To\xE0n b\u1ED9 t\xEDnh n\u0103ng cao c\u1EA5p c\u1EE7a LifeOS \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.`,
        type: "success"
      }
    }).catch(() => {
    });
    return {
      success: true,
      message: `\u0110\xE3 th\xEAm th\xE0nh vi\xEAn '${targetUser.name}' v\xE0o nh\xF3m th\xE0nh c\xF4ng.`,
      member: {
        id: membership.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: membership.role,
        addedAt: membership.addedAt.toISOString()
      }
    };
  },
  async removeMember(requesterId, memberUserId) {
    const prisma = getPrisma();
    const membership = await prisma.teamMember.findFirst({
      where: { userId: memberUserId },
      include: {
        team: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });
    if (!membership) {
      throw new Error("Th\xE0nh vi\xEAn n\xE0y kh\xF4ng t\u1ED3n t\u1EA1i trong b\u1EA5t k\u1EF3 nh\xF3m n\xE0o.");
    }
    const isOwner = membership.team.ownerId === requesterId;
    const isSelf = memberUserId === requesterId;
    if (!isOwner && !isSelf) {
      throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a th\xE0nh vi\xEAn n\xE0y kh\u1ECFi nh\xF3m.");
    }
    await prisma.teamMember.delete({
      where: { id: membership.id }
    });
    await prisma.notification.create({
      data: {
        userId: memberUserId,
        title: "R\u1EDDi kh\u1ECFi G\xF3i Team LifeOS",
        message: isSelf ? `B\u1EA1n \u0111\xE3 r\u1EDDi kh\u1ECFi nh\xF3m "${membership.team.name}".` : `B\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u01B0a ra kh\u1ECFi nh\xF3m "${membership.team.name}". Quy\u1EC1n s\u1EED d\u1EE5ng g\xF3i Team \u0111\xE3 k\u1EBFt th\xFAc.`,
        type: "info"
      }
    }).catch(() => {
    });
    return {
      success: true,
      message: isSelf ? "\u0110\xE3 r\u1EDDi kh\u1ECFi nh\xF3m th\xE0nh c\xF4ng." : `\u0110\xE3 x\xF3a th\xE0nh vi\xEAn '${membership.user.name}' kh\u1ECFi nh\xF3m.`
    };
  },
  async getOrGenerateInviteCode(ownerId) {
    const prisma = getPrisma();
    const team = await prisma.team.findFirst({
      where: { ownerId },
      include: { subscription: true }
    });
    if (!team) {
      throw new Error("Ch\u01B0a t\xECm th\u1EA5y nh\xF3m l\xE0m vi\u1EC7c c\u1EE7a b\u1EA1n. H\xE3y \u0111\u1EA3m b\u1EA3o b\u1EA1n \u0111\xE3 s\u1EDF h\u1EEFu G\xF3i Team.");
    }
    const subStatus = await subscriptionService.checkUserSubscription(ownerId);
    if (!subStatus.hasAccess || subStatus.planType !== "TEAM" && subStatus.role !== "SUPERADMIN" && subStatus.role !== "ADMIN") {
      throw new Error("T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n kh\xF4ng c\xF3 g\xF3i Team \u0111ang ho\u1EA1t \u0111\u1ED9ng.");
    }
    const deterministicCode = `TEAM-${team.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;
    try {
      await prisma.systemSetting.upsert({
        where: { key: `team_invite:${team.id}` },
        update: { value: deterministicCode },
        create: { key: `team_invite:${team.id}`, value: deterministicCode }
      });
      await prisma.systemSetting.upsert({
        where: { key: `team_invite_lookup:${deterministicCode}` },
        update: { value: team.id },
        create: { key: `team_invite_lookup:${deterministicCode}`, value: team.id }
      });
    } catch (e) {
    }
    return {
      success: true,
      inviteCode: deterministicCode,
      inviteUrl: `/team/join?code=${deterministicCode}`,
      teamName: team.name,
      maxMembers: team.maxMembers || 5
    };
  },
  async joinTeamByCode(userId, code) {
    const prisma = getPrisma();
    const cleanCode = (code || "").toUpperCase().trim();
    if (!cleanCode) {
      throw new Error("Vui l\xF2ng nh\u1EADp m\xE3 m\u1EDDi h\u1EE3p l\u1EC7.");
    }
    let targetTeamId = null;
    try {
      const lookup = await prisma.systemSetting.findUnique({
        where: { key: `team_invite_lookup:${cleanCode}` }
      });
      if (lookup && lookup.value) {
        targetTeamId = lookup.value;
      }
    } catch (e) {
    }
    if (!targetTeamId) {
      const allTeams = await prisma.team.findMany();
      const matched = allTeams.find((t) => `TEAM-${t.id.replace(/-/g, "").substring(0, 8).toUpperCase()}` === cleanCode);
      if (matched) {
        targetTeamId = matched.id;
      }
    }
    if (!targetTeamId) {
      throw new Error("M\xE3 m\u1EDDi kh\xF4ng ch\xEDnh x\xE1c ho\u1EB7c kh\xF4ng t\u1ED3n t\u1EA1i.");
    }
    const team = await prisma.team.findUnique({
      where: { id: targetTeamId },
      include: {
        members: true,
        subscription: true,
        owner: { select: { id: true, name: true, email: true } }
      }
    });
    if (!team) {
      throw new Error("Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin nh\xF3m t\u01B0\u01A1ng \u1EE9ng v\u1EDBi m\xE3 m\u1EDDi n\xE0y.");
    }
    const now = /* @__PURE__ */ new Date();
    const isSubActive = Boolean(
      team.subscription && team.subscription.status === "ACTIVE" && team.subscription.paymentStatus === "PAID" && new Date(team.subscription.endDate).getTime() > now.getTime()
    );
    if (!isSubActive) {
      throw new Error("G\xF3i Team c\u1EE7a nh\xF3m n\xE0y hi\u1EC7n \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng li\xEAn h\u1EC7 Ch\u1EE7 nh\xF3m \u0111\u1EC3 gia h\u1EA1n.");
    }
    if (team.ownerId === userId) {
      throw new Error("B\u1EA1n l\xE0 Ch\u1EE7 nh\xF3m n\xE0y, kh\xF4ng c\u1EA7n tham gia l\u1EA1i.");
    }
    const isAlreadyMember = team.members.some((m) => m.userId === userId);
    if (isAlreadyMember) {
      throw new Error(`B\u1EA1n \u0111\xE3 l\xE0 th\xE0nh vi\xEAn trong nh\xF3m "${team.name}" r\u1ED3i.`);
    }
    const maxLimit = team.maxMembers || 5;
    if (team.members.length >= maxLimit) {
      const err = new Error(`Nh\xF3m \u0111\xE3 \u0111\u1EA1t s\u1ED1 l\u01B0\u1EE3ng t\u1ED1i \u0111a (${maxLimit} th\xE0nh vi\xEAn). Vui l\xF2ng li\xEAn h\u1EC7 Ch\u1EE7 nh\xF3m \u0111\u1EC3 gi\u1EA3i ph\xF3ng ch\u1ED7 tr\u1ED1ng.`);
      err.code = "TEAM_FULL";
      throw err;
    }
    const oldMembership = await prisma.teamMember.findFirst({ where: { userId } });
    if (oldMembership) {
      await prisma.teamMember.delete({ where: { id: oldMembership.id } });
    }
    const newMembership = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        role: "MEMBER"
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });
    await prisma.notification.create({
      data: {
        userId,
        title: "Tham gia G\xF3i Team th\xE0nh c\xF4ng!",
        message: `B\u1EA1n \u0111\xE3 tham gia nh\xF3m "${team.name}" c\u1EE7a ${team.owner.name}. To\xE0n b\u1ED9 t\xEDnh n\u0103ng cao c\u1EA5p LifeOS \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t!`,
        type: "success"
      }
    }).catch(() => {
    });
    await prisma.notification.create({
      data: {
        userId: team.ownerId,
        title: "Th\xE0nh vi\xEAn m\u1EDBi tham gia nh\xF3m",
        message: `Th\xE0nh vi\xEAn "${newMembership.user.name}" (${newMembership.user.email}) \u0111\xE3 tham gia nh\xF3m "${team.name}" qua m\xE3 m\u1EDDi.`,
        type: "info"
      }
    }).catch(() => {
    });
    return {
      success: true,
      message: `Ch\xFAc m\u1EEBng! B\u1EA1n \u0111\xE3 tham gia nh\xF3m "${team.name}" th\xE0nh c\xF4ng.`,
      team: {
        id: team.id,
        name: team.name,
        ownerName: team.owner.name,
        role: "MEMBER"
      }
    };
  }
};

// src/backend/routes/api.ts
init_gmailNotification_service();
init_referral_service();

// src/backend/services/feedback.service.ts
init_db();
var FeedbackService = class {
  /**
   * User submits new feedback
   */
  async createFeedback(userId, data) {
    const prisma = getPrisma();
    const cleanTitle = data.title.trim();
    const cleanContent = data.content.trim();
    const type = data.type || "Idea";
    const rating = data.rating && data.rating >= 1 && data.rating <= 5 ? data.rating : null;
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        title: cleanTitle,
        content: cleanContent,
        type,
        rating,
        status: "New"
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });
    await prisma.notification.create({
      data: {
        userId,
        title: "\u{1F48C} C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 g\u1EEDi g\xF3p \xFD!",
        message: `Ch\xFAng t\xF4i \u0111\xE3 ti\u1EBFp nh\u1EADn g\xF3p \xFD "${cleanTitle}". \u0110\u1ED9i ng\u0169 ph\xE1t tri\u1EC3n s\u1EBD ph\u1EA3n h\u1ED3i s\u1EDBm nh\u1EA5t!`,
        type: "info"
      }
    });
    return feedback;
  }
  /**
   * Get user's own feedback list
   */
  async getUserFeedbacks(userId) {
    const prisma = getPrisma();
    return prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
  /**
   * Get public community feedbacks (with upvotes)
   */
  async getPublicFeedbacks(userId) {
    const prisma = getPrisma();
    const items = await prisma.feedback.findMany({
      where: {
        status: { in: ["New", "Reviewing", "Planned", "In Progress", "Completed"] }
      },
      include: {
        user: { select: { name: true, avatar: true } },
        votes: userId ? { where: { userId } } : false
      },
      orderBy: [
        { isImportant: "desc" },
        { upvotes: "desc" },
        { createdAt: "desc" }
      ],
      take: 50
    });
    return items.map((f) => ({
      id: f.id,
      title: f.title,
      content: f.content,
      type: f.type,
      rating: f.rating,
      status: f.status,
      isImportant: f.isImportant,
      upvotes: f.upvotes,
      adminReply: f.adminReply,
      repliedAt: f.repliedAt,
      createdAt: f.createdAt,
      user: {
        name: f.user.name || "Ng\u01B0\u1EDDi d\xF9ng LifeOS",
        avatar: f.user.avatar
      },
      hasVoted: userId && Array.isArray(f.votes) ? f.votes.length > 0 : false
    }));
  }
  /**
   * Vote / Upvote on a community feedback
   */
  async toggleVote(userId, feedbackId) {
    const prisma = getPrisma();
    const existing = await prisma.feedbackVote.findUnique({
      where: {
        feedbackId_userId: { feedbackId, userId }
      }
    });
    if (existing) {
      await prisma.$transaction([
        prisma.feedbackVote.delete({ where: { id: existing.id } }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvotes: { decrement: 1 } }
        })
      ]);
      const updated = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { upvotes: true } });
      return { hasVoted: false, upvotes: updated?.upvotes || 0 };
    } else {
      await prisma.$transaction([
        prisma.feedbackVote.create({
          data: { feedbackId, userId }
        }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvotes: { increment: 1 } }
        })
      ]);
      const updated = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { upvotes: true } });
      return { hasVoted: true, upvotes: updated?.upvotes || 0 };
    }
  }
  /**
   * Admin: List feedbacks with filtering and status counts
   */
  async getAdminFeedbacks(params) {
    const prisma = getPrisma();
    const where = {};
    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }
    if (params.type && params.type !== "ALL") {
      where.type = params.type;
    }
    if (params.isImportant !== void 0) {
      where.isImportant = params.isImportant;
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } }
      ];
    }
    const [items, counts] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, plan: true } }
        },
        orderBy: [
          { isImportant: "desc" },
          { createdAt: "desc" }
        ],
        take: 100
      }),
      prisma.feedback.groupBy({
        by: ["status"],
        _count: { id: true }
      })
    ]);
    const countMap = {
      New: 0,
      Reviewing: 0,
      Planned: 0,
      "In Progress": 0,
      Completed: 0,
      Rejected: 0
    };
    counts.forEach((c) => {
      countMap[c.status] = c._count.id;
    });
    return {
      items,
      counts: countMap
    };
  }
  /**
   * Admin: Update status, write reply, toggle important flag
   */
  async adminUpdateFeedback(feedbackId, adminId, adminEmail, data) {
    const prisma = getPrisma();
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true }
    });
    if (!feedback) throw new Error("Kh\xF4ng t\xECm th\u1EA5y feedback n\xE0y.");
    const updatePayload = { updatedAt: /* @__PURE__ */ new Date() };
    if (data.status) {
      updatePayload.status = data.status;
    }
    if (data.isImportant !== void 0) {
      updatePayload.isImportant = data.isImportant;
    }
    if (data.adminReply !== void 0) {
      updatePayload.adminReply = data.adminReply;
      updatePayload.repliedAt = /* @__PURE__ */ new Date();
      updatePayload.repliedBy = adminEmail;
    }
    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: updatePayload
    });
    if (data.adminReply || data.status && data.status !== feedback.status) {
      const statusLabelMap = {
        Reviewing: "\u0111ang \u0111\u01B0\u1EE3c xem x\xE9t",
        Planned: "\u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u01B0a v\xE0o l\u1ED9 tr\xECnh ph\xE1t tri\u1EC3n",
        "In Progress": "\u0111ang \u0111\u01B0\u1EE3c tri\u1EC3n khai",
        Completed: "\u0111\xE3 ho\xE0n th\xE0nh & c\u1EADp nh\u1EADt",
        Rejected: "t\u1EA1m th\u1EDDi ch\u01B0a ph\xF9 h\u1EE3p"
      };
      const statusText = data.status ? statusLabelMap[data.status] || data.status : "";
      const replyPreview = data.adminReply ? `
Ph\u1EA3n h\u1ED3i: "${data.adminReply}"` : "";
      await prisma.notification.create({
        data: {
          userId: feedback.userId,
          title: `\u{1F4EC} C\u1EADp nh\u1EADt g\xF3p \xFD: "${feedback.title}"`,
          message: `G\xF3p \xFD c\u1EE7a b\u1EA1n ${statusText ? `hi\u1EC7n ${statusText}.` : "v\u1EEBa nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i t\u1EEB Admin."}${replyPreview}`,
          type: data.status === "Completed" ? "success" : "info"
        }
      });
    }
    return updated;
  }
};
var feedbackService = new FeedbackService();

// src/backend/services/lifeHarmony.service.ts
init_db();

// src/lib/lifeHarmonyEngine.ts
function compute5DHarmony(params) {
  const {
    tasks = [],
    habits = [],
    habitRecords = [],
    focusSessions = [],
    focusGoals = [],
    transactions = [],
    budgets = [],
    financeAccounts = [],
    goals = [],
    selectedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  } = params;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const userTasks = Array.isArray(tasks) ? tasks.filter((t) => t.status !== "H\u1EE7y") : [];
  const totalTasks = userTasks.length;
  let productivityDim;
  if (totalTasks === 0) {
    productivityDim = {
      dimension: "productivity",
      name: "N\u0103ng su\u1EA5t",
      score: null,
      fullMark: 100,
      grade: "N/A",
      status: "insufficient_data",
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: "Ch\u01B0a c\xF3 nhi\u1EC7m v\u1EE5 n\xE0o \u0111\u01B0\u1EE3c t\u1EA1o. H\xE3y t\u1EA1o \xEDt nh\u1EA5t 1 nhi\u1EC7m v\u1EE5 trong ph\xE2n h\u1EC7 C\xF4ng vi\u1EC7c \u0111\u1EC3 k\xEDch ho\u1EA1t \u0111\xE1nh gi\xE1.",
      insight: "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u c\xF4ng vi\u1EC7c.",
      dataSource: "b\u1EA3ng tasks (C\xF4ng vi\u1EC7c c\xE1 nh\xE2n)",
      calculationFormula: "(S\u1ED1 vi\u1EC7c ho\xE0n th\xE0nh / T\u1ED5ng s\u1ED1 vi\u1EC7c) \xD7 70% + (T\u1EF7 l\u1EC7 \u0111\xFAng h\u1EA1n) \xD7 30%",
      tracePoints: [
        { label: "T\u1ED5ng nhi\u1EC7m v\u1EE5", value: 0, description: "Ch\u01B0a c\xF3 nhi\u1EC7m v\u1EE5 trong workspace" }
      ]
    };
  } else {
    const completedTasks = userTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh").length;
    const completionRate = completedTasks / totalTasks * 100;
    const overdueTasks = userTasks.filter((t) => {
      if (t.status === "Ho\xE0n th\xE0nh" || !t.dueDate) return false;
      return t.dueDate < selectedDate;
    }).length;
    const onTimeFactor = Math.max(0, 100 - overdueTasks / totalTasks * 50);
    const prodScore = Math.min(100, Math.max(0, Math.round(completionRate * 0.7 + onTimeFactor * 0.3)));
    const getGrade = (s) => {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 65) return "B";
      if (s >= 50) return "C";
      return "D";
    };
    productivityDim = {
      dimension: "productivity",
      name: "N\u0103ng su\u1EA5t",
      score: prodScore,
      fullMark: 100,
      grade: getGrade(prodScore),
      status: "calculated",
      dataPointsCount: totalTasks,
      requiredMinDataPoints: 1,
      insight: prodScore >= 80 ? "Ho\xE0n th\xE0nh c\xF4ng vi\u1EC7c xu\u1EA5t s\u1EAFc!" : overdueTasks > 0 ? `C\xF3 ${overdueTasks} vi\u1EC7c qu\xE1 h\u1EA1n c\u1EA7n x\u1EED l\xFD.` : "C\u1EA7n \u0111\u1EA9y nhanh ti\u1EBFn \u0111\u1ED9 c\xF4ng vi\u1EC7c.",
      dataSource: "b\u1EA3ng tasks (C\xF4ng vi\u1EC7c c\xE1 nh\xE2n)",
      calculationFormula: "(S\u1ED1 vi\u1EC7c ho\xE0n th\xE0nh / T\u1ED5ng s\u1ED1 vi\u1EC7c) \xD7 70% + (T\u1EF7 l\u1EC7 \u0111\xFAng h\u1EA1n) \xD7 30%",
      tracePoints: [
        { label: "T\u1ED5ng nhi\u1EC7m v\u1EE5 ghi nh\u1EADn", value: totalTasks, unit: "vi\u1EC7c", description: "Nhi\u1EC7m v\u1EE5 thu\u1ED9c workspace" },
        { label: "\u0110\xE3 ho\xE0n th\xE0nh", value: completedTasks, unit: "vi\u1EC7c", description: "Nhi\u1EC7m v\u1EE5 c\xF3 tr\u1EA1ng th\xE1i Ho\xE0n th\xE0nh" },
        { label: "T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh", value: `${Math.round(completionRate)}%`, description: "T\u1EF7 l\u1EC7 th\u1EF1c t\u1EBF" },
        { label: "Nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n ch\u01B0a xong", value: overdueTasks, unit: "vi\u1EC7c", description: "H\u1EA1n ch\xF3t tr\u01B0\u1EDBc ng\xE0y hi\u1EC7n t\u1EA1i" }
      ]
    };
  }
  const userHabits = Array.isArray(habits) ? habits.filter((h) => h.status !== "Archived") : [];
  const totalHabits = userHabits.length;
  let disciplineDim;
  if (totalHabits === 0) {
    disciplineDim = {
      dimension: "discipline",
      name: "K\u1EF7 lu\u1EADt",
      score: null,
      fullMark: 100,
      grade: "N/A",
      status: "insufficient_data",
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: "Ch\u01B0a c\xF3 th\xF3i quen n\xE0o \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp. H\xE3y th\xEAm \xEDt nh\u1EA5t 1 th\xF3i quen h\xE0ng ng\xE0y \u0111\u1EC3 theo d\xF5i k\u1EF7 lu\u1EADt.",
      insight: "Ch\u01B0a c\xF3 th\xF3i quen theo d\xF5i.",
      dataSource: "b\u1EA3ng habits & habit_logs (Th\xF3i quen & \u0110i\u1EC3m danh)",
      calculationFormula: "(T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh th\xF3i quen h\xF4m nay) \xD7 70% + (\u0110i\u1EC3m t\xEDch l\u0169y chu\u1ED7i ng\xE0y li\xEAn ti\u1EBFp) \xD7 30%",
      tracePoints: [
        { label: "T\u1ED5ng th\xF3i quen", value: 0, description: "Ch\u01B0a thi\u1EBFt l\u1EADp th\xF3i quen n\xE0o" }
      ]
    };
  } else {
    const completedToday = userHabits.filter((h) => {
      const dates = Array.isArray(h.completedDates) ? h.completedDates : typeof h.completedDates === "string" ? h.completedDates.startsWith("[") ? JSON.parse(h.completedDates) : [] : [];
      const hasRecordToday = Array.isArray(habitRecords) && habitRecords.some(
        (r) => r.habitId === h.id && r.date === selectedDate && (r.completed === true || r.status === "Completed")
      );
      return dates.includes(selectedDate) || hasRecordToday;
    }).length;
    const todayRate = totalHabits > 0 ? completedToday / totalHabits * 100 : 0;
    const maxStreak = Math.max(0, ...(userHabits || []).map((h) => Number(h?.streak || h?.currentStreak || 0)));
    const streakFactor = Math.min(100, maxStreak * 10);
    const habitScore = Math.min(100, Math.max(0, Math.round(todayRate * 0.7 + streakFactor * 0.3)));
    const getGrade = (s) => {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 65) return "B";
      if (s >= 50) return "C";
      return "D";
    };
    disciplineDim = {
      dimension: "discipline",
      name: "K\u1EF7 lu\u1EADt",
      score: habitScore,
      fullMark: 100,
      grade: getGrade(habitScore),
      status: "calculated",
      dataPointsCount: totalHabits,
      requiredMinDataPoints: 1,
      insight: habitScore >= 80 ? "Chu\u1ED7i th\xF3i quen r\u1EA5t v\u1EEFng ch\u1EAFc!" : completedToday > 0 ? `\u0110\xE3 ho\xE0n th\xE0nh ${completedToday}/${totalHabits} th\xF3i quen h\xF4m nay.` : "Ch\u01B0a ho\xE0n th\xE0nh th\xF3i quen n\xE0o h\xF4m nay.",
      dataSource: "b\u1EA3ng habits & habit_logs (Th\xF3i quen & \u0110i\u1EC3m danh)",
      calculationFormula: "(T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh h\xF4m nay) \xD7 70% + (Chu\u1ED7i ng\xE0y k\u1EF7 lu\u1EADt) \xD7 30%",
      tracePoints: [
        { label: "S\u1ED1 th\xF3i quen theo d\xF5i", value: totalHabits, unit: "th\xF3i quen", description: "C\xE1c th\xF3i quen \u0111ang k\xEDch ho\u1EA1t" },
        { label: "\u0110\xE3 ho\xE0n th\xE0nh h\xF4m nay", value: completedToday, unit: "th\xF3i quen", description: "\u0110i\u1EC3m danh ng\xE0y \u0111\u01B0\u1EE3c ch\u1ECDn" },
        { label: "T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh h\xF4m nay", value: `${Math.round(todayRate)}%`, description: "T\u1EF7 l\u1EC7 th\xF3i quen \u0111\u1EA1t" },
        { label: "Chu\u1ED7i ng\xE0y li\xEAn ti\u1EBFp cao nh\u1EA5t", value: maxStreak, unit: "ng\xE0y", description: "Streak k\u1EF7 lu\u1EADt duy tr\xEC" }
      ]
    };
  }
  const userFocusSessions = Array.isArray(focusSessions) ? focusSessions : [];
  const completedFocusSessions = userFocusSessions.filter((s) => s.status === "Completed");
  const todayFocusMinutes = completedFocusSessions.filter((s) => s.createdAt?.startsWith(selectedDate) || s.startTime?.startsWith(selectedDate)).reduce((sum, s) => sum + (Number(s.actualDuration) || 0), 0);
  const totalFocusSessionsCount = userFocusSessions.length;
  let growthDim;
  if (totalFocusSessionsCount === 0 && todayFocusMinutes === 0) {
    growthDim = {
      dimension: "growth",
      name: "Ph\xE1t tri\u1EC3n",
      score: null,
      fullMark: 100,
      grade: "N/A",
      status: "insufficient_data",
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: "Ch\u01B0a c\xF3 phi\xEAn t\u1EADp trung n\xE0o. H\xE3y th\u1EF1c hi\u1EC7n \xEDt nh\u1EA5t 1 phi\xEAn Pomodoro (25 ph\xFAt) ho\u1EB7c ghi nh\u1EADn th\u1EDDi gian h\u1ECDc t\u1EADp.",
      insight: "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u phi\xEAn t\u1EADp trung.",
      dataSource: "b\u1EA3ng focus_sessions (Phi\xEAn t\u1EADp trung Pomodoro)",
      calculationFormula: "(Th\u1EDDi gian t\u1EADp trung th\u1EF1c t\u1EBF / M\u1EE5c ti\xEAu t\u1EADp trung) \xD7 80% + (T\u1EF7 l\u1EC7 phi\xEAn ho\xE0n th\xE0nh) \xD7 20%",
      tracePoints: [
        { label: "S\u1ED1 phi\xEAn t\u1EADp trung", value: 0, description: "Ch\u01B0a th\u1EF1c hi\u1EC7n phi\xEAn h\u1ECDc Pomodoro n\xE0o" }
      ]
    };
  } else {
    const dailyGoal = Array.isArray(focusGoals) ? focusGoals.find((g) => g.type === "daily") : null;
    const targetHours = dailyGoal?.targetHours || 2;
    const targetMinutes = targetHours * 60;
    const timeRatio = Math.min(1.2, todayFocusMinutes / targetMinutes);
    const sessionCompletionRate = totalFocusSessionsCount > 0 ? completedFocusSessions.length / totalFocusSessionsCount : 1;
    const growthScore = Math.min(100, Math.max(10, Math.round(timeRatio * 80 + sessionCompletionRate * 20)));
    const getGrade = (s) => {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 65) return "B";
      if (s >= 50) return "C";
      return "D";
    };
    growthDim = {
      dimension: "growth",
      name: "Ph\xE1t tri\u1EC3n",
      score: growthScore,
      fullMark: 100,
      grade: getGrade(growthScore),
      status: "calculated",
      dataPointsCount: Math.max(totalFocusSessionsCount, 1),
      requiredMinDataPoints: 1,
      insight: todayFocusMinutes >= 45 ? "T\u1EADp trung s\xE2u r\u1EA5t tuy\u1EC7t v\u1EDDi!" : todayFocusMinutes > 0 ? `\u0110\xE3 t\u1EADp trung ${todayFocusMinutes} ph\xFAt h\xF4m nay.` : "Ch\u01B0a ghi nh\u1EADn th\u1EDDi gian t\u1EADp trung h\xF4m nay.",
      dataSource: "b\u1EA3ng focus_sessions & focus_goals (Phi\xEAn t\u1EADp trung & M\u1EE5c ti\xEAu)",
      calculationFormula: "(Th\u1EDDi gian t\u1EADp trung h\xF4m nay / M\u1EE5c ti\xEAu) \xD7 80% + (T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh phi\xEAn) \xD7 20%",
      tracePoints: [
        { label: "Ph\xFAt t\u1EADp trung h\xF4m nay", value: todayFocusMinutes, unit: "ph\xFAt", description: "Th\u1EDDi l\u01B0\u1EE3ng ho\xE0n th\xE0nh th\u1EF1c t\u1EBF" },
        { label: "M\u1EE5c ti\xEAu t\u1EADp trung ng\xE0y", value: targetMinutes, unit: "ph\xFAt", description: `\u0110\u1ECBnh m\u1EE9c ${targetHours}h/ng\xE0y` },
        { label: "T\u1ED5ng s\u1ED1 phi\xEAn \u0111\xE3 ho\xE0n th\xE0nh", value: completedFocusSessions.length, unit: "phi\xEAn", description: "C\xE1c phi\xEAn Pomodoro \u0111\xE3 xong" }
      ]
    };
  }
  const userTransactions = Array.isArray(transactions) ? transactions : [];
  const userBudgets = Array.isArray(budgets) ? budgets : [];
  const totalTxCount = userTransactions.length;
  const totalBudgetsCount = userBudgets.length;
  let financeDim;
  if (totalTxCount === 0 && totalBudgetsCount === 0) {
    financeDim = {
      dimension: "finance",
      name: "T\xE0i ch\xEDnh",
      score: null,
      fullMark: 100,
      grade: "N/A",
      status: "insufficient_data",
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: "Ch\u01B0a c\xF3 giao d\u1ECBch thu/chi ho\u1EB7c ng\xE2n s\xE1ch n\xE0o. H\xE3y ghi nh\u1EADn \xEDt nh\u1EA5t 1 giao d\u1ECBch trong ph\xE2n h\u1EC7 T\xE0i ch\xEDnh \u0111\u1EC3 \u0111\xE1nh gi\xE1.",
      insight: "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u t\xE0i ch\xEDnh.",
      dataSource: "b\u1EA3ng transactions & budgets (Thu chi & Ng\xE2n s\xE1ch)",
      calculationFormula: "\u0110\xE1nh gi\xE1 t\u1EF7 l\u1EC7 tu\xE2n th\u1EE7 ng\xE2n s\xE1ch & ki\u1EC3m so\xE1t d\xF2ng ti\u1EC1n thu\u1EA7n t\u1EEB giao d\u1ECBch th\u1EF1c t\u1EBF",
      tracePoints: [
        { label: "Giao d\u1ECBch thu/chi", value: 0, description: "Ch\u01B0a c\xF3 giao d\u1ECBch th\u1EF1c t\u1EBF trong t\xE0i kho\u1EA3n" },
        { label: "Ng\xE2n s\xE1ch thi\u1EBFt l\u1EADp", value: 0, description: "Ch\u01B0a c\xE0i \u0111\u1EB7t h\u1EA1n m\u1EE9c chi ti\xEAu" }
      ]
    };
  } else {
    const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const monthlyTx = userTransactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyIncome = monthlyTx.filter((t) => t.type === "Thu nh\u1EADp").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthlyExpense = monthlyTx.filter((t) => t.type === "Chi ti\xEAu").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalMonthlyBudget = userBudgets.reduce((s, b) => s + (Number(b.limit) || 0), 0);
    let finScore = 75;
    if (totalMonthlyBudget > 0) {
      const budgetUtilization = monthlyExpense / totalMonthlyBudget * 100;
      if (budgetUtilization <= 80) {
        finScore = 95;
      } else if (budgetUtilization <= 100) {
        finScore = 85;
      } else if (budgetUtilization <= 120) {
        finScore = 60;
      } else {
        finScore = Math.max(15, Math.round(100 - (budgetUtilization - 100) * 1.5));
      }
    } else if (monthlyIncome > 0) {
      const netSavings = monthlyIncome - monthlyExpense;
      const savingRate = netSavings / monthlyIncome * 100;
      if (savingRate >= 30) {
        finScore = 90;
      } else if (savingRate >= 10) {
        finScore = 80;
      } else if (savingRate >= 0) {
        finScore = 70;
      } else {
        finScore = Math.max(20, Math.round(60 + savingRate * 0.5));
      }
    } else {
      finScore = monthlyExpense > 5e6 ? 50 : 70;
    }
    const getGrade = (s) => {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 65) return "B";
      if (s >= 50) return "C";
      return "D";
    };
    financeDim = {
      dimension: "finance",
      name: "T\xE0i ch\xEDnh",
      score: finScore,
      fullMark: 100,
      grade: getGrade(finScore),
      status: "calculated",
      dataPointsCount: totalTxCount + totalBudgetsCount,
      requiredMinDataPoints: 1,
      insight: finScore >= 80 ? "Ki\u1EC3m so\xE1t d\xF2ng ti\u1EC1n th\xF4ng minh." : "C\u1EA7n t\u1ED1i \u01B0u v\xE0 gi\xE1m s\xE1t h\u1EA1n m\u1EE9c chi ti\xEAu.",
      dataSource: "b\u1EA3ng transactions & budgets (Thu chi & Ng\xE2n s\xE1ch)",
      calculationFormula: totalMonthlyBudget > 0 ? "T\u1EF7 l\u1EC7 s\u1EED d\u1EE5ng ng\xE2n s\xE1ch th\u1EF1c t\u1EBF trong th\xE1ng" : "T\u1EF7 l\u1EC7 ti\u1EBFt ki\u1EC7m v\xE0 d\xF2ng ti\u1EC1n r\xF2ng th\u1EF1c t\u1EBF",
      tracePoints: [
        { label: "T\u1ED5ng s\u1ED1 giao d\u1ECBch ghi nh\u1EADn", value: totalTxCount, unit: "giao d\u1ECBch", description: "C\xE1c kho\u1EA3n thu chi \u0111\xE3 l\u01B0u" },
        { label: "Thu nh\u1EADp th\xE1ng n\xE0y", value: monthlyIncome.toLocaleString("vi-VN"), unit: "\u20AB", description: "Giao d\u1ECBch lo\u1EA1i Thu nh\u1EADp" },
        { label: "Chi ti\xEAu th\xE1ng n\xE0y", value: monthlyExpense.toLocaleString("vi-VN"), unit: "\u20AB", description: "Giao d\u1ECBch lo\u1EA1i Chi ti\xEAu" },
        { label: "H\u1EA1n m\u1EE9c ng\xE2n s\xE1ch th\xE1ng", value: totalMonthlyBudget > 0 ? totalMonthlyBudget.toLocaleString("vi-VN") : "Ch\u01B0a \u0111\u1EB7t", unit: totalMonthlyBudget > 0 ? "\u20AB" : void 0, description: "T\u1ED5ng \u0111\u1ECBnh m\u1EE9c c\xE1c danh m\u1EE5c" }
      ]
    };
  }
  const userGoals = Array.isArray(goals) ? goals.filter((g) => g.status !== "Archived") : [];
  const totalGoalsCount = userGoals.length;
  let visionDim;
  if (totalGoalsCount === 0) {
    visionDim = {
      dimension: "vision",
      name: "M\u1EE5c ti\xEAu",
      score: null,
      fullMark: 100,
      grade: "N/A",
      status: "insufficient_data",
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: "Ch\u01B0a c\xF3 m\u1EE5c ti\xEAu n\xE0o \u0111\u01B0\u1EE3c t\u1EA1o. H\xE3y th\xEAm \xEDt nh\u1EA5t 1 m\u1EE5c ti\xEAu trung ho\u1EB7c d\xE0i h\u1EA1n trong ph\xE2n h\u1EC7 M\u1EE5c ti\xEAu.",
      insight: "Ch\u01B0a c\xF3 m\u1EE5c ti\xEAu theo d\xF5i.",
      dataSource: "b\u1EA3ng goals (M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng)",
      calculationFormula: "(Ti\u1EBFn \u0111\u1ED9 trung b\xECnh c\xE1c m\u1EE5c ti\xEAu) \xD7 70% + (T\u1EF7 l\u1EC7 m\u1EE5c ti\xEAu ho\xE0n th\xE0nh) \xD7 30%",
      tracePoints: [
        { label: "T\u1ED5ng m\u1EE5c ti\xEAu", value: 0, description: "Ch\u01B0a thi\u1EBFt l\u1EADp m\u1EE5c ti\xEAu n\xE0o" }
      ]
    };
  } else {
    const completedGoals = userGoals.filter((g) => g.status === "Ho\xE0n th\xE0nh" || g.status === "Completed" || (Number(g.progress) || 0) >= 100).length;
    const avgProgress = Math.round(userGoals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / totalGoalsCount);
    const goalScore = Math.min(100, Math.max(0, Math.round(avgProgress * 0.7 + completedGoals / totalGoalsCount * 100 * 0.3)));
    const getGrade = (s) => {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 65) return "B";
      if (s >= 50) return "C";
      return "D";
    };
    visionDim = {
      dimension: "vision",
      name: "M\u1EE5c ti\xEAu",
      score: goalScore,
      fullMark: 100,
      grade: getGrade(goalScore),
      status: "calculated",
      dataPointsCount: totalGoalsCount,
      requiredMinDataPoints: 1,
      insight: goalScore >= 80 ? "\u0110ang b\xE1m s\xE1t l\u1ED9 tr\xECnh d\xE0i h\u1EA1n xu\u1EA5t s\u1EAFc!" : completedGoals > 0 ? `\u0110\xE3 ho\xE0n th\xE0nh ${completedGoals}/${totalGoalsCount} m\u1EE5c ti\xEAu.` : "\u0110ang trong qu\xE1 tr\xECnh th\u1EF1c hi\u1EC7n m\u1EE5c ti\xEAu.",
      dataSource: "b\u1EA3ng goals (M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng)",
      calculationFormula: "(Ti\u1EBFn \u0111\u1ED9 trung b\xECnh c\xE1c m\u1EE5c ti\xEAu) \xD7 70% + (T\u1EF7 l\u1EC7 m\u1EE5c ti\xEAu ho\xE0n th\xE0nh) \xD7 30%",
      tracePoints: [
        { label: "S\u1ED1 m\u1EE5c ti\xEAu \u0111ang theo d\xF5i", value: totalGoalsCount, unit: "m\u1EE5c ti\xEAu", description: "C\xE1c m\u1EE5c ti\xEAu \u0111ang ho\u1EA1t \u0111\u1ED9ng" },
        { label: "\u0110\xE3 ho\xE0n th\xE0nh", value: completedGoals, unit: "m\u1EE5c ti\xEAu", description: "M\u1EE5c ti\xEAu ho\xE0n t\u1EA5t 100%" },
        { label: "Ti\u1EBFn \u0111\u1ED9 trung b\xECnh", value: `${avgProgress}%`, description: "Trung b\xECnh c\u1ED9ng ti\u1EBFn \u0111\u1ED9 c\xE1c m\u1EE5c ti\xEAu" }
      ]
    };
  }
  const allDimensions = [productivityDim, disciplineDim, growthDim, financeDim, visionDim];
  const calculatedDims = allDimensions.filter((d) => d.status === "calculated" && d.score !== null);
  const evaluatedCount = calculatedDims.length;
  let overallScore = null;
  let status = "insufficient_data";
  let rankTitle = "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 \u0111\xE1nh gi\xE1";
  let avatarMood = "idle";
  let summaryInsight = "B\u1EA1n ch\u01B0a c\xF3 \u0111\u1EE7 ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 t\u1EA1o ch\u1EC9 s\u1ED1 5D Harmony. H\xE3y b\u1EAFt \u0111\u1EA7u s\u1EED d\u1EE5ng c\xE1c t\xEDnh n\u0103ng c\u1EE7a website \u0111\u1EC3 h\u1EC7 th\u1ED1ng c\xF3 d\u1EEF li\u1EC7u th\u1EF1c t\u1EBF.";
  if (evaluatedCount === 0) {
    overallScore = null;
    status = "insufficient_data";
    rankTitle = "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u \u0111\xE1nh gi\xE1 \u{1F331}";
    avatarMood = "idle";
    summaryInsight = "B\u1EA1n ch\u01B0a c\xF3 \u0111\u1EE7 ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 t\u1EA1o ch\u1EC9 s\u1ED1 5D Harmony. H\xE3y b\u1EAFt \u0111\u1EA7u s\u1EED d\u1EE5ng c\xE1c t\xEDnh n\u0103ng c\u1EE7a website \u0111\u1EC3 h\u1EC7 th\u1ED1ng c\xF3 d\u1EEF li\u1EC7u th\u1EF1c t\u1EBF.";
  } else if (evaluatedCount === 5) {
    overallScore = Math.round(
      (productivityDim.score || 0) * 0.25 + (disciplineDim.score || 0) * 0.25 + (growthDim.score || 0) * 0.2 + (financeDim.score || 0) * 0.15 + (visionDim.score || 0) * 0.15
    );
    status = "sufficient";
    if (overallScore >= 88) {
      rankTitle = "Cao Th\u1EE7 C\xE2n B\u1EB1ng Cu\u1ED9c S\u1ED1ng \u{1F451}";
      avatarMood = "celebrate";
    } else if (overallScore >= 75) {
      rankTitle = "Nh\xE0 T\u1ED1i \u01AFu N\u0103ng Su\u1EA5t \u26A1";
      avatarMood = "motivate";
    } else if (overallScore >= 60) {
      rankTitle = "\u0110ang V\xE0o Phom K\u1EF7 Lu\u1EADt \u2728";
      avatarMood = "idle";
    } else {
      rankTitle = "\u0110ang X\xE2y D\u1EF1ng C\xE2n B\u1EB1ng \u{1F331}";
      avatarMood = "idle";
    }
    summaryInsight = `\u0110\xE3 ph\xE2n t\xEDch to\xE0n di\u1EC7n d\u1EF1a tr\xEAn \u0111\u1EA7y \u0111\u1EE7 5/5 kh\xEDa c\u1EA1nh cu\u1ED9c s\u1ED1ng t\u1EEB d\u1EEF li\u1EC7u th\u1EF1c t\u1EBF c\u1EE7a b\u1EA1n.`;
  } else {
    const totalScoreSum = calculatedDims.reduce((s, d) => s + (d.score || 0), 0);
    overallScore = Math.round(totalScoreSum / evaluatedCount);
    status = "partial";
    rankTitle = "\u0110ang T\xEDch L\u0169y D\u1EEF Li\u1EC7u Th\u1EF1c T\u1EBF \u{1F331}";
    avatarMood = "motivate";
    summaryInsight = `\u0110ang \u0111\xE1nh gi\xE1 d\u1EF1a tr\xEAn ${evaluatedCount}/5 kh\xEDa c\u1EA1nh \u0111\xE3 c\xF3 ho\u1EA1t \u0111\u1ED9ng th\u1EF1c t\u1EBF. C\u1EA7n th\xEAm d\u1EEF li\u1EC7u \u1EDF c\xE1c kh\xEDa c\u1EA1nh c\xF2n l\u1EA1i \u0111\u1EC3 ho\xE0n thi\u1EC7n v\xF2ng tr\xF2n 5D.`;
  }
  return {
    overallScore,
    status,
    rankTitle,
    avatarMood,
    evaluatedDimensionsCount: evaluatedCount,
    totalDimensionsCount: 5,
    dataSufficiencyRatio: `${evaluatedCount}/5`,
    summaryInsight,
    lastUpdated: nowIso,
    dimensions: allDimensions
  };
}

// src/backend/services/lifeHarmony.service.ts
var LifeHarmonyService = class {
  /**
   * Retrieves and calculates the authentic 5D Harmony score strictly based on the user's real database records.
   * STRICT PRINCIPLE: REAL DATA ONLY (No mock, no random, no fake defaults).
   */
  async get5DHarmony(userId) {
    if (!userId) {
      throw new Error("Thi\u1EBFu userId khi l\u1EA5y ch\u1EC9 s\u1ED1 5D Harmony");
    }
    const prisma = getPrisma();
    const [
      tasks,
      habits,
      habitRecords,
      focusSessions,
      focusGoals,
      transactions,
      budgets,
      financeAccounts,
      goals
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        select: { id: true, status: true, dueDate: true, priority: true }
      }),
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, streak: true, completedDates: true }
      }),
      prisma.habitLog.findMany({
        where: { habit: { userId } },
        select: { id: true, habitId: true, date: true, completed: true }
      }),
      prisma.focusSession.findMany({
        where: { userId },
        select: { id: true, status: true, actualDuration: true, createdAt: true, startTime: true }
      }),
      prisma.focusGoal.findMany({
        where: { userId },
        select: { id: true, type: true, targetHours: true }
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { id: true, amount: true, type: true, category: true, date: true }
      }),
      prisma.budget.findMany({
        where: { userId },
        select: { id: true, category: true, limit: true, spent: true }
      }),
      prisma.financeAccount.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true }
      }),
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, status: true, progress: true }
      })
    ]);
    const formattedHabitRecords = habitRecords.map((r) => ({
      ...r,
      status: r.completed ? "Completed" : "Pending"
    }));
    return compute5DHarmony({
      tasks,
      habits,
      habitRecords: formattedHabitRecords,
      focusSessions,
      focusGoals,
      transactions,
      budgets,
      financeAccounts,
      goals,
      selectedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    });
  }
};
var lifeHarmonyService = new LifeHarmonyService();

// src/backend/services/journey.service.ts
init_db();
var journeyService = {
  /**
   * Tính toán toàn bộ thông tin tổng quan, dấu mốc tự động + thủ công của người dùng
   * từ 100% dữ liệu thực tế (Không dùng fake data / math.random)
   */
  async getJourneyData(userId) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, createdAt: true, email: true }
    });
    const joinedAt = user?.createdAt ? new Date(user.createdAt) : /* @__PURE__ */ new Date();
    const now = /* @__PURE__ */ new Date();
    const memberSinceDays = Math.max(1, Math.floor((now.getTime() - joinedAt.getTime()) / (1e3 * 60 * 60 * 24)));
    const [
      tasks,
      goals,
      savingGoals,
      habits,
      focusSessions,
      vocabProgress,
      manualMilestones,
      projects
    ] = await Promise.all([
      // Tasks đã hoàn thành
      prisma.task.findMany({
        where: {
          userId,
          status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] }
        },
        select: { id: true, title: true, updatedAt: true, createdAt: true }
      }),
      // Goals
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, status: true, progress: true, targetValue: true, currentValue: true, updatedAt: true }
      }),
      // Saving goals
      prisma.savingGoal.findMany({
        where: { userId },
        select: { id: true, title: true, currentAmount: true, targetAmount: true, updatedAt: true }
      }),
      // Habits
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, streak: true, bestStreak: true, completedDates: true }
      }),
      // Focus Sessions (Pomodoro)
      prisma.focusSession.findMany({
        where: { userId, status: { in: ["Completed", "completed", "Ho\xE0n th\xE0nh"] } },
        select: { id: true, actualDuration: true, createdAt: true }
      }),
      // Vocab Progress
      prisma.vocabWordProgress.findMany({
        where: { userId },
        select: { id: true, memoryLevel: true, state: true, updatedAt: true }
      }),
      // Manual Milestones
      prisma.journeyMilestone.findMany({
        where: { userId },
        orderBy: { date: "desc" }
      }),
      // Projects
      prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, progress: true, updatedAt: true }
      })
    ]);
    const completedTasksCount = tasks.length;
    const completedGoals = goals.filter((g) => g.status === "Completed" || g.status === "Ho\xE0n th\xE0nh" || g.progress >= 100);
    const completedGoalsCount = completedGoals.length;
    let totalSavedAmount = 0;
    savingGoals.forEach((sg) => {
      totalSavedAmount += sg.currentAmount || 0;
    });
    let bestHabitStreak = 0;
    habits.forEach((h) => {
      const streak = Math.max(h.streak || 0, h.bestStreak || 0);
      if (streak > bestHabitStreak) bestHabitStreak = streak;
    });
    let totalFocusMinutes = 0;
    focusSessions.forEach((f) => {
      totalFocusMinutes += Math.round(f.actualDuration || 0);
    });
    const masteredVocabCount = vocabProgress.filter((v) => v.memoryLevel >= 4 || v.state === "mastered").length;
    const autoMilestones = [];
    autoMilestones.push({
      id: `joined_${userId}`,
      userId,
      title: "B\u1EAFt \u0111\u1EA7u h\xE0nh tr\xECnh LifeOS",
      description: "Ng\xE0y \u0111\u1EA7u ti\xEAn kh\u1EDFi t\u1EA1o kh\xF4ng gian ph\xE1t tri\u1EC3n c\xE1 nh\xE2n",
      category: "personal",
      date: joinedAt.toISOString().split("T")[0],
      icon: "Flag",
      metricValue: `${memberSinceDays} ng\xE0y`,
      metricLabel: "\u0110\xE3 g\u1EAFn b\xF3",
      isHighlighted: true,
      isManual: false,
      createdAt: joinedAt.toISOString()
    });
    savingGoals.forEach((sg) => {
      if (sg.currentAmount >= sg.targetAmount && sg.targetAmount > 0) {
        autoMilestones.push({
          id: `saving_${sg.id}`,
          userId,
          title: `Ch\u1EA1m \u0111\xEDch ti\u1EBFt ki\u1EC7m: ${sg.title}`,
          description: `\u0110\xE3 t\xEDch l\u0169y \u0111\u1EE7 m\u1EE5c ti\xEAu t\xE0i ch\xEDnh \u0111\u1EC1 ra`,
          category: "saving",
          date: (sg.updatedAt ? new Date(sg.updatedAt) : now).toISOString().split("T")[0],
          icon: "PiggyBank",
          metricValue: `${sg.currentAmount.toLocaleString("vi-VN")} \u20AB`,
          metricLabel: "\u0110\xE3 t\xEDch l\u0169y",
          isHighlighted: true,
          isManual: false,
          createdAt: (sg.updatedAt ? new Date(sg.updatedAt) : now).toISOString()
        });
      }
    });
    completedGoals.forEach((g) => {
      autoMilestones.push({
        id: `goal_${g.id}`,
        userId,
        title: `Ho\xE0n th\xE0nh m\u1EE5c ti\xEAu: ${g.title}`,
        description: `Chinh ph\u1EE5c th\xE0nh c\xF4ng m\u1EE5c ti\xEAu l\u1EDBn`,
        category: "goal",
        date: (g.updatedAt ? new Date(g.updatedAt) : now).toISOString().split("T")[0],
        icon: "Trophy",
        metricValue: "100%",
        metricLabel: "Ti\u1EBFn \u0111\u1ED9",
        isHighlighted: true,
        isManual: false,
        createdAt: (g.updatedAt ? new Date(g.updatedAt) : now).toISOString()
      });
    });
    habits.forEach((h) => {
      const streak = Math.max(h.streak || 0, h.bestStreak || 0);
      if (streak >= 7) {
        autoMilestones.push({
          id: `habit_${h.id}`,
          userId,
          title: `Duy tr\xEC k\u1EF7 lu\u1EADt: ${h.name}`,
          description: `Gi\u1EEF v\u1EEFng th\xF3i quen t\xEDch c\u1EF1c qua t\u1EEBng ng\xE0y`,
          category: "habit",
          date: now.toISOString().split("T")[0],
          icon: "Flame",
          metricValue: `${streak} ng\xE0y`,
          metricLabel: "Chu\u1ED7i li\xEAn ti\u1EBFp",
          isHighlighted: streak >= 21,
          isManual: false,
          createdAt: now.toISOString()
        });
      }
    });
    projects.filter((p) => p.progress >= 100 || p.status === "Ho\xE0n th\xE0nh" || p.status === "Completed").forEach((p) => {
      autoMilestones.push({
        id: `project_${p.id}`,
        userId,
        title: `Ho\xE0n th\xE0nh d\u1EF1 \xE1n: ${p.name}`,
        description: `B\xE0n giao v\xE0 kh\xE9p l\u1EA1i to\xE0n b\u1ED9 h\u1EA1ng m\u1EE5c d\u1EF1 \xE1n`,
        category: "project",
        date: (p.updatedAt ? new Date(p.updatedAt) : now).toISOString().split("T")[0],
        icon: "FolderCheck",
        metricValue: "\u0110\u1EA1t 100%",
        metricLabel: "Ti\u1EBFn \u0111\u1ED9 d\u1EF1 \xE1n",
        isHighlighted: false,
        isManual: false,
        createdAt: (p.updatedAt ? new Date(p.updatedAt) : now).toISOString()
      });
    });
    if (masteredVocabCount >= 20) {
      autoMilestones.push({
        id: `vocab_${userId}_mastered`,
        userId,
        title: "N\u1EA5c thang t\u1EEB v\u1EF1ng & tr\xED nh\u1EDB",
        description: "\u0110\xE3 \u0111\u01B0a c\xE1c t\u1EEB v\u1EF1ng v\xE0o b\u1ED9 nh\u1EDB d\xE0i h\u1EA1n v\u1EDBi Spaced Repetition",
        category: "study",
        date: now.toISOString().split("T")[0],
        icon: "BookOpen",
        metricValue: `${masteredVocabCount} t\u1EEB`,
        metricLabel: "Th\xE0nh th\u1EA1o",
        isHighlighted: true,
        isManual: false,
        createdAt: now.toISOString()
      });
    }
    if (completedTasksCount >= 25) {
      autoMilestones.push({
        id: `tasks_${userId}_milestone`,
        userId,
        title: "N\u0103ng su\u1EA5t h\xE0nh \u0111\u1ED9ng v\u01B0\u1EE3t tr\u1ED9i",
        description: "\u0110\xE3 gi\u1EA3i quy\u1EBFt s\u1ED1 l\u01B0\u1EE3ng l\u1EDBn \u0111\u1EA7u vi\u1EC7c v\xE0 duy tr\xEC \u0111\xE0 ti\u1EBFn \u0111\u1ED9",
        category: "personal",
        date: now.toISOString().split("T")[0],
        icon: "CheckCircle2",
        metricValue: `${completedTasksCount} vi\u1EC7c`,
        metricLabel: "\u0110\xE3 ho\xE0n th\xE0nh",
        isHighlighted: completedTasksCount >= 50,
        isManual: false,
        createdAt: now.toISOString()
      });
    }
    const mappedManualMilestones = manualMilestones.map((m) => ({
      id: m.id,
      userId: m.userId,
      title: m.title,
      description: m.description,
      category: m.category,
      date: m.date,
      icon: m.icon || "Sparkles",
      metricValue: m.metricValue,
      metricLabel: m.metricLabel,
      isHighlighted: m.isHighlighted,
      isManual: true,
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
    const allMilestones = [...mappedManualMilestones, ...autoMilestones].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    const monthlyRecaps = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, "0")}`;
      const monthLabel = `Th\xE1ng ${monthNum}/${year}`;
      const tasksInMonth = tasks.filter((t) => {
        const tDate = t.updatedAt ? new Date(t.updatedAt) : new Date(t.createdAt);
        return tDate.getFullYear() === year && tDate.getMonth() === d.getMonth();
      }).length;
      const focusInMonth = focusSessions.filter((f) => {
        const fDate = new Date(f.createdAt);
        return fDate.getFullYear() === year && fDate.getMonth() === d.getMonth();
      }).reduce((acc, curr) => acc + Math.round(curr.actualDuration || 0), 0);
      const milestonesInMonth = allMilestones.filter((m) => m.date.startsWith(monthKey)).length;
      monthlyRecaps.push({
        month: monthKey,
        monthLabel,
        tasksCompleted: tasksInMonth,
        habitsCompletedCount: 0,
        focusMinutes: focusInMonth,
        vocabLearned: 0,
        savingsProgress: 0,
        milestonesInMonth
      });
    }
    const overview = {
      memberSinceDays,
      joinedDate: joinedAt.toLocaleDateString("vi-VN"),
      completedTasksCount,
      completedGoalsCount,
      totalSavedAmount,
      bestHabitStreak,
      totalFocusMinutes,
      masteredVocabCount,
      milestonesCount: allMilestones.length
    };
    return {
      overview,
      milestones: allMilestones,
      monthlyRecaps,
      user: {
        name: user?.name || "B\u1EA1n",
        email: user?.email || ""
      }
    };
  },
  /**
   * Thêm một cột mốc thành tựu thủ công
   */
  async createManualMilestone(userId, data) {
    const prisma = getPrisma();
    return await prisma.journeyMilestone.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: data.category || "personal",
        date: data.date,
        icon: data.icon || "Sparkles",
        metricValue: data.metricValue?.trim() || null,
        metricLabel: data.metricLabel?.trim() || null,
        isHighlighted: Boolean(data.isHighlighted),
        isManual: true
      }
    });
  },
  /**
   * Xóa một cột mốc thủ công
   */
  async deleteManualMilestone(userId, milestoneId) {
    const prisma = getPrisma();
    return await prisma.journeyMilestone.deleteMany({
      where: {
        id: milestoneId,
        userId
      }
    });
  }
};

// src/backend/services/progression.service.ts
init_db();
function getLevelFromXp(totalXp) {
  if (totalXp <= 0) return 1;
  return Math.max(1, Math.floor(Math.pow(totalXp / 100, 1 / 1.5)) + 1);
}
function getXpThresholdsForLevel(level) {
  const currentLevelStart = level <= 1 ? 0 : Math.floor(100 * Math.pow(level - 1, 1.5));
  const nextLevelStart = Math.floor(100 * Math.pow(level, 1.5));
  return { currentLevelStart, nextLevelStart };
}
function getTitleForLevel(level) {
  if (level >= 50) return "Sovereign \xB7 Ch\u1EE7 Quy\u1EC1n Cu\u1ED9c S\u1ED1ng";
  if (level >= 40) return "Master \xB7 B\u1EADc Th\u1EA7y L\xE0m Ch\u1EE7";
  if (level >= 30) return "Architect \xB7 Ki\u1EBFn Tr\xFAc S\u01B0 \u0110\u1EDDi M\xECnh";
  if (level >= 25) return "Strategist \xB7 Chi\u1EBFn L\u01B0\u1EE3c Gia";
  if (level >= 20) return "Focused \xB7 T\u1EADp Trung Cao \u0110\u1ED9";
  if (level >= 15) return "Operator \xB7 Nh\xE0 V\u1EADn H\xE0nh";
  if (level >= 10) return "Consistent \xB7 B\u1EC1n B\u1EC9 K\u1EF7 Lu\u1EADt";
  if (level >= 5) return "Builder \xB7 Ng\u01B0\u1EDDi X\xE2y D\u1EF1ng";
  return "Initiator \xB7 Ng\u01B0\u1EDDi Kh\u1EDFi \u0110\u1EA7u";
}
var progressionService = {
  /**
   * Khởi tạo hoặc đồng bộ tiến độ thực tế (Zero fake data)
   */
  async getOrCreateProgression(userId) {
    const prisma = getPrisma();
    let progression = await prisma.userProgression.findUnique({
      where: { userId }
    });
    if (!progression) {
      const [
        completedTasksCount,
        habits,
        focusSessions,
        vocabWordCount,
        savingGoals
      ] = await Promise.all([
        prisma.task.count({
          where: { userId, status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] } }
        }),
        prisma.habit.findMany({
          where: { userId },
          select: { streak: true, bestStreak: true, completedDates: true }
        }),
        prisma.focusSession.findMany({
          where: { userId, status: { in: ["Completed", "completed", "Ho\xE0n th\xE0nh"] } },
          select: { actualDuration: true }
        }),
        prisma.vocabWordProgress.count({
          where: { userId, memoryLevel: { gte: 2 } }
        }),
        prisma.savingGoal.findMany({
          where: { userId },
          select: { currentAmount: true, targetAmount: true }
        })
      ]);
      const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
      let totalHabitChecks = 0;
      let maxStreak = 0;
      habits.forEach((h) => {
        let dates = [];
        try {
          dates = typeof h.completedDates === "string" ? JSON.parse(h.completedDates) : h.completedDates || [];
        } catch {
          dates = [];
        }
        totalHabitChecks += dates.length;
        if ((h.bestStreak || 0) > maxStreak) maxStreak = h.bestStreak || 0;
        if ((h.streak || 0) > maxStreak) maxStreak = h.streak || 0;
      });
      const savingsReached = savingGoals.filter((s) => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;
      const taskXp = completedTasksCount * 15;
      const habitXp = totalHabitChecks * 10;
      const focusXp = Math.floor(totalFocusMinutes / 25) * 15;
      const learningXp = vocabWordCount * 5;
      const financeXp = savingsReached * 50;
      const totalXp = taskXp + habitXp + focusXp + learningXp + financeXp;
      const level = getLevelFromXp(totalXp);
      const coins = Math.floor(totalXp / 5) + 50;
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      progression = await prisma.userProgression.create({
        data: {
          userId,
          totalXp,
          level,
          coins,
          learningXp,
          learningLevel: getLevelFromXp(learningXp),
          habitXp,
          habitLevel: getLevelFromXp(habitXp),
          focusXp,
          focusLevel: getLevelFromXp(focusXp),
          financeXp,
          financeLevel: getLevelFromXp(financeXp),
          currentStreak: maxStreak,
          longestStreak: maxStreak,
          lastActiveDate: todayStr,
          equippedTitle: getTitleForLevel(level).split(" \xB7 ")[0],
          equippedFrame: "default",
          equippedBadge: "starter",
          equippedAccent: "emerald"
        }
      });
      if (totalXp > 0) {
        await prisma.xPTransaction.create({
          data: {
            userId,
            amount: totalXp,
            category: "milestone",
            source: "initial_history_sync",
            sourceId: "sync_bootstrap",
            description: "\u0110\u1ED3ng b\u1ED9 k\u1EBFt qu\u1EA3 t\u1EEB c\xE1c n\u1ED7 l\u1EF1c th\u1EF1c t\u1EBF tr\u01B0\u1EDBc \u0111\xF3"
          }
        }).catch(() => {
        });
      }
    }
    return progression;
  },
  /**
   * Cộng XP và Coins có bảo vệ Anti-Cheat & Idempotency
   */
  async awardXp(userId, params) {
    const prisma = getPrisma();
    const { amount, category, source, sourceId, description } = params;
    if (amount <= 0) return { awarded: false, reason: "INVALID_AMOUNT" };
    const existingTx = await prisma.xPTransaction.findUnique({
      where: {
        userId_source_sourceId: {
          userId,
          source,
          sourceId
        }
      }
    });
    if (existingTx) {
      return { awarded: false, reason: "ALREADY_AWARDED", existing: existingTx };
    }
    const prog = await this.getOrCreateProgression(userId);
    const oldLevel = prog.level;
    const newTotalXp = prog.totalXp + amount;
    const newLevel = getLevelFromXp(newTotalXp);
    const leveledUp = newLevel > oldLevel;
    const coinReward = Math.max(2, Math.floor(amount / 5));
    const newCoins = prog.coins + coinReward;
    let learningXp = prog.learningXp;
    let habitXp = prog.habitXp;
    let focusXp = prog.focusXp;
    let financeXp = prog.financeXp;
    if (category === "learning") learningXp += amount;
    else if (category === "habit") habitXp += amount;
    else if (category === "focus") focusXp += amount;
    else if (category === "finance") financeXp += amount;
    else if (category === "task") focusXp += Math.floor(amount / 2);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let currentStreak = prog.currentStreak;
    let longestStreak = prog.longestStreak;
    if (prog.lastActiveDate !== todayStr) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().split("T")[0];
      if (prog.lastActiveDate === yesterday) {
        currentStreak += 1;
      } else if (!prog.lastActiveDate) {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }
    await prisma.$transaction([
      prisma.xPTransaction.create({
        data: {
          userId,
          amount,
          category,
          source,
          sourceId,
          description
        }
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: coinReward,
          type: "earn",
          source,
          sourceId,
          description: `Th\u01B0\u1EDFng ho\xE0n th\xE0nh: ${description}`
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: {
          totalXp: newTotalXp,
          level: newLevel,
          coins: newCoins,
          learningXp,
          learningLevel: getLevelFromXp(learningXp),
          habitXp,
          habitLevel: getLevelFromXp(habitXp),
          focusXp,
          focusLevel: getLevelFromXp(focusXp),
          financeXp,
          financeLevel: getLevelFromXp(financeXp),
          currentStreak,
          longestStreak,
          lastActiveDate: todayStr
        }
      })
    ]);
    return {
      awarded: true,
      xpEarned: amount,
      coinsEarned: coinReward,
      oldLevel,
      newLevel,
      leveledUp,
      newTitle: leveledUp ? getTitleForLevel(newLevel) : void 0
    };
  },
  /**
   * Cộng Coins trực tiếp và ghi sổ CoinTransaction
   */
  async addCoins(userId, amount, source, sourceId, description) {
    const prisma = getPrisma();
    if (amount <= 0) return { awarded: false };
    const prog = await this.getOrCreateProgression(userId);
    await prisma.$transaction([
      prisma.coinTransaction.create({
        data: {
          userId,
          amount,
          type: "earn",
          source,
          sourceId,
          description
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: { coins: { increment: amount } }
      })
    ]);
    return { awarded: true, coinsEarned: amount, newCoins: prog.coins + amount };
  },
  /**
   * Mua và mở khóa mỹ phẩm bằng Coins
   */
  async unlockCosmetic(userId, cosmeticKey) {
    const prisma = getPrisma();
    const prog = await this.getOrCreateProgression(userId);
    const catalog = this.getCosmeticsCatalog(prog.level);
    const item = catalog.find((c) => c.key === cosmeticKey);
    if (!item) throw new Error("Kh\xF4ng t\xECm th\u1EA5y v\u1EADt ph\u1EA9m n\xE0y trong kho ngo\u1EA1i trang.");
    if (prog.level < item.requiredLevel) throw new Error(`Y\xEAu c\u1EA7u \u0111\u1EA1t Level ${item.requiredLevel} \u0111\u1EC3 m\u1EDF kh\xF3a.`);
    if (prog.coins < item.costCoins) throw new Error(`B\u1EA1n c\u1EA7n ${item.costCoins} Coins (hi\u1EC7n c\xF3 ${prog.coins} Coins).`);
    const existing = await prisma.userReward.findUnique({
      where: { userId_rewardKey: { userId, rewardKey: cosmeticKey } }
    });
    if (existing) throw new Error("B\u1EA1n \u0111\xE3 m\u1EDF kh\xF3a v\u1EADt ph\u1EA9m n\xE0y r\u1ED3i.");
    await prisma.$transaction([
      prisma.userProgression.update({
        where: { userId },
        data: { coins: { decrement: item.costCoins } }
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: -item.costCoins,
          type: "spend",
          source: "reward_purchase",
          sourceId: cosmeticKey,
          description: `M\u1EDF kh\xF3a ngo\u1EA1i trang: ${item.name}`
        }
      }),
      prisma.userReward.create({
        data: {
          userId,
          rewardType: item.type,
          rewardKey: cosmeticKey,
          name: item.name,
          description: item.description,
          icon: item.icon,
          isEquipped: false
        }
      })
    ]);
    return { success: true, item };
  },
  /**
   * Trang bị ngoại trang
   */
  async equipCosmetic(userId, rewardType, rewardKey) {
    const prisma = getPrisma();
    if (rewardKey !== "default" && rewardKey !== "Initiator" && rewardKey !== "starter" && rewardKey !== "emerald") {
      const owned = await prisma.userReward.findUnique({
        where: { userId_rewardKey: { userId, rewardKey } }
      });
      if (!owned) throw new Error("B\u1EA1n ch\u01B0a s\u1EDF h\u1EEFu ngo\u1EA1i trang n\xE0y.");
    }
    const updateData = {};
    if (rewardType === "title") updateData.equippedTitle = rewardKey;
    else if (rewardType === "frame") updateData.equippedFrame = rewardKey;
    else if (rewardType === "badge") updateData.equippedBadge = rewardKey;
    else if (rewardType === "accent") updateData.equippedAccent = rewardKey;
    await prisma.$transaction([
      // Reset equip flags for that type
      prisma.userReward.updateMany({
        where: { userId, rewardType },
        data: { isEquipped: false }
      }),
      // Set equip flag
      prisma.userReward.updateMany({
        where: { userId, rewardKey },
        data: { isEquipped: true }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: updateData
      })
    ]);
    return { success: true, equipped: updateData };
  },
  /**
   * Mở Rương Kho Báu Hằng Ngày (Daily Mystery Chest)
   */
  async openDailyChest(userId) {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const source = "daily_chest";
    const sourceId = `chest_${todayStr}`;
    const prisma = getPrisma();
    const existingTx = await prisma.xPTransaction.findUnique({
      where: {
        userId_source_sourceId: {
          userId,
          source,
          sourceId
        }
      }
    });
    if (existingTx) {
      return {
        alreadyClaimed: true,
        message: "B\u1EA1n \u0111\xE3 m\u1EDF r\u01B0\u01A1ng kho b\xE1u h\xF4m nay r\u1ED3i. H\xE3y quay l\u1EA1i v\xE0o ng\xE0y mai!"
      };
    }
    const rand = Math.random() * 100;
    let rarity = "COMMON";
    let xp = 40;
    let coins = 15;
    let title = "R\u01B0\u01A1ng Du Kh\xE1ch";
    if (rand < 5) {
      rarity = "LEGENDARY";
      xp = 250;
      coins = 80;
      title = "H\xF2m Th\u1EA7n Tho\u1EA1i C\u1ED5 X\u01B0a \u{1F451}";
    } else if (rand < 20) {
      rarity = "EPIC";
      xp = 140;
      coins = 45;
      title = "H\xF2m Huy\u1EC1n B\xED Ho\xE0ng Gia \u{1F52E}";
    } else if (rand < 50) {
      rarity = "RARE";
      xp = 80;
      coins = 25;
      title = "H\xF2m Chi\u1EBFn Binh Th\xE9p \u2694\uFE0F";
    } else {
      rarity = "COMMON";
      xp = 45;
      coins = 12;
      title = "H\xF2m Du Kh\xE1ch Tinh Anh \u{1F331}";
    }
    const awardResult = await this.awardXp(userId, {
      amount: xp,
      category: "quest",
      source,
      sourceId,
      description: `M\u1EDF ${title} (${rarity})`
    });
    return {
      alreadyClaimed: false,
      rarity,
      xp,
      coins,
      title,
      awardResult
    };
  },
  /**
   * Catalog ngoại trang Gen Z
   */
  getCosmeticsCatalog(userLevel) {
    return [
      // TITLES
      { key: "Initiator", type: "title", name: "Initiator (Kh\u1EDFi \u0110\u1EA7u)", description: "Danh hi\u1EC7u d\xE0nh cho ng\u01B0\u1EDDi d\xE1m b\u1EAFt \u0111\u1EA7u", costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: "Builder", type: "title", name: "Builder (X\xE2y D\u1EF1ng)", description: "T\u1EEBng b\u01B0\u1EDBc \u0111\u1ECBnh h\xECnh tr\u1EADt t\u1EF1 cu\u1ED9c s\u1ED1ng", costCoins: 50, requiredLevel: 5, isUnlocked: userLevel >= 5, isEquipped: false },
      { key: "Consistent", type: "title", name: "Consistent (B\u1EC1n B\u1EC9)", description: "K\u1EF7 lu\u1EADt t\u1EF1 gi\xE1c kh\xF4ng c\u1EA7n gi\xE1m s\xE1t", costCoins: 100, requiredLevel: 10, isUnlocked: userLevel >= 10, isEquipped: false },
      { key: "Focused", type: "title", name: "Focused (T\u1EADp Trung)", description: "Kh\u1EA3 n\u0103ng mi\u1EC5n nhi\u1EC5m tr\u01B0\u1EDBc xao nh\xE3ng", costCoins: 180, requiredLevel: 20, isUnlocked: userLevel >= 20, isEquipped: false },
      { key: "Architect", type: "title", name: "Architect (Ki\u1EBFn Tr\xFAc S\u01B0)", description: "Ki\u1EBFn t\u1EA1o t\u01B0\u01A1ng lai theo \xFD ch\xED c\u1EE7a m\xECnh", costCoins: 300, requiredLevel: 30, isUnlocked: userLevel >= 30, isEquipped: false },
      { key: "Sovereign", type: "title", name: "Sovereign (Ch\u1EE7 Quy\u1EC1n)", description: "L\xE0m ch\u1EE7 t\u1ED1i th\u01B0\u1EE3ng v\u1EADn m\u1EC7nh c\xE1 nh\xE2n", costCoins: 500, requiredLevel: 50, isUnlocked: userLevel >= 50, isEquipped: false },
      // AVATAR FRAMES
      { key: "default", type: "frame", name: "Khung Ti\xEAu Chu\u1EA9n", description: "Vi\u1EC1n m\u1EA3nh t\u1ED1i gi\u1EA3n thanh l\u1ECBch", costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: "frame_emerald_neon", type: "frame", name: "Emerald Neon Glow", description: "V\xF2ng s\xE1ng xanh ng\u1ECDc l\u1EE5c b\u1EA3o Gen Z", costCoins: 80, requiredLevel: 3, isUnlocked: userLevel >= 3, isEquipped: false },
      { key: "frame_cyber_cyan", type: "frame", name: "Cyber Cyan Pulse", description: "Vi\u1EC1n cyan ph\xE1t quang c\xF4ng ngh\u1EC7", costCoins: 120, requiredLevel: 8, isUnlocked: userLevel >= 8, isEquipped: false },
      { key: "frame_obsidian_gold", type: "frame", name: "Obsidian Gold V.I.P", description: "H\u1EAFc di\u1EC7n th\u1EA1ch vi\u1EC1n v\xE0ng kim v\u01B0\u01A1ng gi\u1EA3", costCoins: 250, requiredLevel: 15, isUnlocked: userLevel >= 15, isEquipped: false },
      { key: "frame_amethyst_aura", type: "frame", name: "Amethyst Aura Elite", description: "H\xE0o quang th\u1EA1ch anh t\xEDm huy\u1EC1n b\xED", costCoins: 350, requiredLevel: 25, isUnlocked: userLevel >= 25, isEquipped: false },
      // BADGES
      { key: "starter", type: "badge", name: "Ng\xF4i Sao Kh\u1EDFi B\u01B0\u1EDBc", description: "D\u1EA5u \u1EA5n ng\xE0y \u0111\u1EA7u gia nh\u1EADp", icon: "\u2B50", costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: "badge_consistency_flame", type: "badge", name: "Ng\u1ECDn L\u1EEDa K\u1EF7 Lu\u1EADt", description: "Bi\u1EC3u t\u01B0\u1EE3ng c\u1EE7a chu\u1ED7i streak kh\xF4ng ng\u1EEBng", icon: "\u{1F525}", costCoins: 60, requiredLevel: 5, isUnlocked: userLevel >= 5, isEquipped: false },
      { key: "badge_deep_worker", type: "badge", name: "Deep Work Champion", description: "Huy hi\u1EC7u c\u1EE7a ng\u01B0\u1EDDi l\xE0m vi\u1EC7c s\xE2u", icon: "\u26A1", costCoins: 150, requiredLevel: 12, isUnlocked: userLevel >= 12, isEquipped: false },
      { key: "badge_knowledge_sage", type: "badge", name: "B\u1EADc Th\u1EA7y Tri Th\u1EE9c", description: "T\xEDch l\u0169y t\u1EEB v\u1EF1ng v\xE0 b\xE0i h\u1ECDc li\xEAn t\u1EE5c", icon: "\u{1F9E0}", costCoins: 200, requiredLevel: 18, isUnlocked: userLevel >= 18, isEquipped: false },
      { key: "badge_grand_sovereign", type: "badge", name: "Grand Sovereign Crown", description: "Huy hi\u1EC7u t\u1ED1i th\u01B0\u1EE3ng c\u1EE7a ng\u01B0\u1EDDi l\xE0m ch\u1EE7", icon: "\u{1F451}", costCoins: 400, requiredLevel: 35, isUnlocked: userLevel >= 35, isEquipped: false },
      // ACCENT THEMES
      { key: "emerald", type: "accent", name: "Emerald Forest (Xanh Ng\u1ECDc)", description: "M\xE0u xanh l\u1EE5c b\u1EA3o bi\u1EC3u t\u01B0\u1EE3ng cho s\u1EF1 t\u0103ng tr\u01B0\u1EDFng", costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: "indigo", type: "accent", name: "Electric Indigo (Ch\xE0m Ho\xE0ng Gia)", description: "T\xF4ng m\xE0u s\u1EAFc s\u1EA3o c\u1EE7a tr\xED tu\u1EC7 v\xE0 chi\u1EC1u s\xE2u", costCoins: 90, requiredLevel: 7, isUnlocked: userLevel >= 7, isEquipped: false },
      { key: "sunset", type: "accent", name: "Sunset Crimson (Ho\xE0ng H\xF4n)", description: "N\u0103ng l\u01B0\u1EE3ng b\xF9ng n\u1ED5 c\u1EE7a ng\u1ECDn l\u1EEDa \u0111am m\xEA", costCoins: 120, requiredLevel: 14, isUnlocked: userLevel >= 14, isEquipped: false },
      { key: "cyan", type: "accent", name: "Cyberpunk Cyan (Xanh \u0110i\u1EC7n Bi\xEAn)", description: "S\u1EAFc neon t\u01B0\u01A1ng lai c\u1EE7a phong c\xE1ch Gen Z", costCoins: 160, requiredLevel: 21, isUnlocked: userLevel >= 21, isEquipped: false }
    ];
  },
  /**
   * Tính toán toàn bộ Aggregated Progression State từ 100% dữ liệu thực tế
   */
  async getProgressionState(userId) {
    const prisma = getPrisma();
    const prog = await this.getOrCreateProgression(userId);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayStart = /* @__PURE__ */ new Date(`${todayStr}T00:00:00.000Z`);
    const [
      todayTasksCount,
      habits,
      todayFocusSessions,
      todayVocabReviews,
      todayNotesCount,
      claimedTodayQuestTx,
      ownedRewards,
      recentXpLedger,
      recentCoinLedger,
      allCompletedTasksCount,
      allFocusSessions,
      savingGoals
    ] = await Promise.all([
      // Tasks completed today
      prisma.task.count({
        where: {
          userId,
          status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] },
          updatedAt: { gte: todayStart }
        }
      }),
      // Habits
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, streak: true, bestStreak: true, completedDates: true }
      }),
      // Focus today
      prisma.focusSession.findMany({
        where: {
          userId,
          status: { in: ["Completed", "completed", "Ho\xE0n th\xE0nh"] },
          createdAt: { gte: todayStart }
        },
        select: { actualDuration: true }
      }),
      // Vocab reviews today
      prisma.vocabReviewLog.count({
        where: {
          userId,
          reviewedAt: { gte: todayStart }
        }
      }),
      // Notes today
      prisma.note.count({
        where: {
          userId,
          updatedAt: { gte: todayStart }
        }
      }),
      // Claimed quest transactions today
      prisma.xPTransaction.findMany({
        where: {
          userId,
          source: "daily_quest",
          createdAt: { gte: todayStart }
        },
        select: { sourceId: true }
      }),
      // Owned user rewards
      prisma.userReward.findMany({
        where: { userId }
      }),
      // Recent XP ledger (audit history)
      prisma.xPTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      // Recent Coin ledger
      prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      // All completed tasks
      prisma.task.count({
        where: { userId, status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] } }
      }),
      // All focus sessions
      prisma.focusSession.findMany({
        where: { userId, status: { in: ["Completed", "completed", "Ho\xE0n th\xE0nh"] } },
        select: { actualDuration: true, createdAt: true }
      }),
      // Saving goals
      prisma.savingGoal.findMany({
        where: { userId },
        select: { currentAmount: true, targetAmount: true }
      })
    ]);
    let todayHabitsCount = 0;
    habits.forEach((h) => {
      let dates = [];
      try {
        dates = typeof h.completedDates === "string" ? JSON.parse(h.completedDates) : h.completedDates || [];
      } catch {
        dates = [];
      }
      if (dates.includes(todayStr)) todayHabitsCount++;
    });
    const todayFocusMinutes = todayFocusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const claimedSet = new Set(claimedTodayQuestTx.map((tx) => tx.sourceId));
    const dailyQuests = [
      {
        id: "q1",
        key: "quest_task_2",
        title: "X\u1EED l\xFD 2 c\xF4ng vi\u1EC7c",
        description: "Ho\xE0n th\xE0nh 2 nhi\u1EC7m v\u1EE5 c\xF4ng vi\u1EC7c trong danh s\xE1ch h\xF4m nay",
        category: "task",
        current: Math.min(2, todayTasksCount),
        target: 2,
        unit: "tasks",
        rewardXp: 30,
        rewardCoins: 6,
        isCompleted: todayTasksCount >= 2,
        isClaimed: claimedSet.has(`quest_task_2_${todayStr}`)
      },
      {
        id: "q2",
        key: "quest_habit_2",
        title: "Gi\u1EEF v\u1EEFng 2 th\xF3i quen",
        description: "\u0110\xE1nh d\u1EA5u ho\xE0n th\xE0nh \xEDt nh\u1EA5t 2 th\xF3i quen t\xEDch c\u1EF1c h\xF4m nay",
        category: "habit",
        current: Math.min(2, todayHabitsCount),
        target: 2,
        unit: "habits",
        rewardXp: 25,
        rewardCoins: 5,
        isCompleted: todayHabitsCount >= 2,
        isClaimed: claimedSet.has(`quest_habit_2_${todayStr}`)
      },
      {
        id: "q3",
        key: "quest_focus_25",
        title: "T\u1EADp trung s\xE2u 25 ph\xFAt",
        description: "Ho\xE0n th\xE0nh \xEDt nh\u1EA5t m\u1ED9t phi\xEAn t\u1EADp trung l\xE0m vi\u1EC7c ch\u1EA5t l\u01B0\u1EE3ng",
        category: "focus",
        current: Math.min(25, todayFocusMinutes),
        target: 25,
        unit: "ph\xFAt",
        rewardXp: 35,
        rewardCoins: 7,
        isCompleted: todayFocusMinutes >= 25,
        isClaimed: claimedSet.has(`quest_focus_25_${todayStr}`)
      },
      {
        id: "q4",
        key: "quest_learning",
        title: "N\u1EA1p tri th\u1EE9c m\u1EDBi",
        description: "Luy\u1EC7n t\u1EADp flashcard t\u1EEB v\u1EF1ng ho\u1EB7c h\u1ECDc m\u1ED9t b\xE0i h\u1ECDc h\xF4m nay",
        category: "learning",
        current: Math.min(10, todayVocabReviews),
        target: 10,
        unit: "l\u01B0\u1EE3t h\u1ECDc",
        rewardXp: 25,
        rewardCoins: 5,
        isCompleted: todayVocabReviews >= 10,
        isClaimed: claimedSet.has(`quest_learning_${todayStr}`)
      },
      {
        id: "q5",
        key: "quest_journal",
        title: "Ph\u1EA3n chi\u1EBFu & Ghi ch\xE9p",
        description: "T\u1EA1o ho\u1EB7c c\u1EADp nh\u1EADt 1 ghi ch\xFA/nh\u1EADt k\xFD suy ng\u1EABm h\xF4m nay",
        category: "journal",
        current: Math.min(1, todayNotesCount),
        target: 1,
        unit: "ghi ch\xFA",
        rewardXp: 20,
        rewardCoins: 4,
        isCompleted: todayNotesCount >= 1,
        isClaimed: claimedSet.has(`quest_journal_${todayStr}`)
      }
    ];
    const now = /* @__PURE__ */ new Date();
    const dayOfWeek = now.getDay() || 7;
    const mondayStart = new Date(now);
    mondayStart.setDate(now.getDate() - (dayOfWeek - 1));
    mondayStart.setHours(0, 0, 0, 0);
    const weekNumber = `${now.getFullYear()}_W${Math.ceil((now.getDate() + 6) / 7)}`;
    const weekFocusMinutes = allFocusSessions.filter((s) => new Date(s.createdAt) >= mondayStart).reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const weekTasksCount = await prisma.task.count({
      where: {
        userId,
        status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] },
        updatedAt: { gte: mondayStart }
      }
    });
    const weeklyChallenges = [
      {
        id: "w1",
        key: "weekly_focus_150",
        title: "Chi\u1EBFn Binh T\u1EADp Trung (Focus Warrior)",
        description: "T\xEDch l\u0169y 150 ph\xFAt l\xE0m vi\u1EC7c s\xE2u trong tu\u1EA7n n\xE0y",
        category: "focus",
        current: Math.min(150, weekFocusMinutes),
        target: 150,
        unit: "ph\xFAt",
        rewardXp: 120,
        rewardCoins: 30,
        isCompleted: weekFocusMinutes >= 150,
        isClaimed: claimedSet.has(`weekly_focus_150_${weekNumber}`)
      },
      {
        id: "w2",
        key: "weekly_tasks_8",
        title: "C\u1ED7 M\xE1y N\u0103ng Su\u1EA5t (Execution Sprint)",
        description: "Ho\xE0n th\xE0nh \xEDt nh\u1EA5t 8 c\xF4ng vi\u1EC7c trong tu\u1EA7n",
        category: "task",
        current: Math.min(8, weekTasksCount),
        target: 8,
        unit: "vi\u1EC7c",
        rewardXp: 100,
        rewardCoins: 25,
        isCompleted: weekTasksCount >= 8,
        isClaimed: claimedSet.has(`weekly_tasks_8_${weekNumber}`)
      }
    ];
    const totalFocusHours = Math.round(allFocusSessions.reduce((a, b) => a + (b.actualDuration || 0), 0) / 60);
    const maxHabitStreak = Math.max(...habits.map((h) => Math.max(h.streak || 0, h.bestStreak || 0)), 0);
    const savingsAchievedCount = savingGoals.filter((s) => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;
    const journeyChapters = [
      {
        index: 1,
        id: "ch1",
        title: "Ch\u01B0\u01A1ng 1: Kh\u1EDFi Nguy\xEAn (Start)",
        tagline: "\u0110\u1EB7t nh\u1EEFng vi\xEAn g\u1EA1ch \u0111\u1EA7u ti\xEAn cho h\u1EC7 \u0111i\u1EC1u h\xE0nh cu\u1ED9c s\u1ED1ng",
        theme: "emerald",
        isUnlocked: true,
        isCompleted: allCompletedTasksCount >= 1 && maxHabitStreak >= 1,
        progressPercent: Math.min(100, Math.round((allCompletedTasksCount >= 1 ? 50 : 0) + (maxHabitStreak >= 1 ? 50 : 0))),
        nodes: [
          {
            id: "n1_1",
            chapterIndex: 1,
            title: "B\u01B0\u1EDBc Ch\xE2n \u0110\u1EA7u Ti\xEAn",
            description: "Ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 c\xF4ng vi\u1EC7c \u0111\u1EA7u ti\xEAn trong h\u1EC7 th\u1ED1ng",
            requirementText: "Ho\xE0n th\xE0nh 1 task",
            category: "task",
            current: Math.min(1, allCompletedTasksCount),
            target: 1,
            unit: "task",
            status: allCompletedTasksCount >= 1 ? "COMPLETED" : "IN_PROGRESS",
            rewardTitle: "Initiator",
            rewardCoins: 20,
            rewardXp: 50
          },
          {
            id: "n1_2",
            chapterIndex: 1,
            title: "Kh\u1EDFi \u0110\u1ED9ng Th\xF3i Quen",
            description: "\u0110\xE1nh d\u1EA5u th\xF3i quen k\u1EF7 lu\u1EADt \u0111\u1EA7u ti\xEAn",
            requirementText: "\u0110\u1EA1t chu\u1ED7i streak >= 1 ng\xE0y",
            category: "habit",
            current: Math.min(1, maxHabitStreak),
            target: 1,
            unit: "ng\xE0y",
            status: maxHabitStreak >= 1 ? "COMPLETED" : "IN_PROGRESS",
            rewardCoins: 20,
            rewardXp: 50
          }
        ],
        chapterReward: {
          title: "Khung Emerald Neon",
          coins: 50,
          frame: "frame_emerald_neon"
        }
      },
      {
        index: 2,
        id: "ch2",
        title: "Ch\u01B0\u01A1ng 2: Ki\u1EBFn T\u1EA1o (Build)",
        tagline: "Thi\u1EBFt l\u1EADp chu\u1ED7i k\u1EF7 lu\u1EADt 7 ng\xE0y v\xE0 n\u0103ng l\u1EF1c l\xE0m vi\u1EC7c s\xE2u",
        theme: "indigo",
        isUnlocked: allCompletedTasksCount >= 1,
        isCompleted: maxHabitStreak >= 7 && totalFocusHours >= 3,
        progressPercent: Math.min(100, Math.round(Math.min(7, maxHabitStreak) / 7 * 50 + Math.min(3, totalFocusHours) / 3 * 50)),
        nodes: [
          {
            id: "n2_1",
            chapterIndex: 2,
            title: "K\u1EF7 Lu\u1EADt 7 Ng\xE0y B\u1EC1n B\u1EC9",
            description: "Duy tr\xEC chu\u1ED7i th\xF3i quen li\xEAn t\u1EE5c trong 7 ng\xE0y kh\xF4ng ng\u1EAFt qu\xE3ng",
            requirementText: "Chu\u1ED7i th\xF3i quen >= 7 ng\xE0y",
            category: "habit",
            current: Math.min(7, maxHabitStreak),
            target: 7,
            unit: "ng\xE0y li\xEAn ti\u1EBFp",
            status: maxHabitStreak >= 7 ? "MASTERED" : maxHabitStreak > 0 ? "IN_PROGRESS" : "LOCKED",
            rewardTitle: "Consistent",
            rewardCoins: 50,
            rewardXp: 120
          },
          {
            id: "n2_2",
            chapterIndex: 2,
            title: "T\u1EADp Trung S\xE2u (Deep Work)",
            description: "T\xEDch l\u0169y t\u1ED1i thi\u1EC3u 3 gi\u1EDD l\xE0m vi\u1EC7c s\xE2u v\u1EDBi Pomodoro",
            requirementText: "3 gi\u1EDD t\u1EADp trung th\u1EF1c t\u1EBF",
            category: "focus",
            current: Math.min(3, totalFocusHours),
            target: 3,
            unit: "gi\u1EDD",
            status: totalFocusHours >= 3 ? "COMPLETED" : "IN_PROGRESS",
            rewardCoins: 40,
            rewardXp: 100
          }
        ],
        chapterReward: {
          title: "Huy hi\u1EC7u Consistency Flame",
          coins: 100,
          badge: "badge_consistency_flame"
        }
      },
      {
        index: 3,
        id: "ch3",
        title: "Ch\u01B0\u01A1ng 3: \u0110\u1ED9t Ph\xE1 (Focus)",
        tagline: "Chinh ph\u1EE5c 21 ng\xE0y ph\u1EA3n x\u1EA1 v\xE0 m\u1EE5c ti\xEAu t\xE0i ch\xEDnh",
        theme: "sunset",
        isUnlocked: maxHabitStreak >= 7,
        isCompleted: maxHabitStreak >= 21 && savingsAchievedCount >= 1,
        progressPercent: Math.min(100, Math.round(Math.min(21, maxHabitStreak) / 21 * 50 + Math.min(1, savingsAchievedCount) * 50)),
        nodes: [
          {
            id: "n3_1",
            chapterIndex: 3,
            title: "Quy Lu\u1EADt 21 Ng\xE0y Th\u1EA7n K\u1EF3",
            description: "Bi\u1EBFn n\u1ED7 l\u1EF1c c\xF3 \xFD th\u1EE9c th\xE0nh b\u1EA3n n\u0103ng t\u1EF1 nhi\xEAn",
            requirementText: "Chu\u1ED7i th\xF3i quen >= 21 ng\xE0y",
            category: "habit",
            current: Math.min(21, maxHabitStreak),
            target: 21,
            unit: "ng\xE0y li\xEAn ti\u1EBFp",
            status: maxHabitStreak >= 21 ? "MASTERED" : maxHabitStreak >= 7 ? "IN_PROGRESS" : "LOCKED",
            rewardTitle: "Focused",
            rewardCoins: 80,
            rewardXp: 200
          },
          {
            id: "n3_2",
            chapterIndex: 3,
            title: "C\xE1n M\u1ED1c Ti\u1EBFt Ki\u1EC7m",
            description: "Ho\xE0n th\xE0nh 100% \xEDt nh\u1EA5t m\u1ED9t m\u1EE5c ti\xEAu t\xEDch l\u0169y t\xE0i ch\xEDnh",
            requirementText: "1 m\u1EE5c ti\xEAu ti\u1EBFt ki\u1EC7m \u0111\u1EA1t 100%",
            category: "finance",
            current: Math.min(1, savingsAchievedCount),
            target: 1,
            unit: "m\u1EE5c ti\xEAu",
            status: savingsAchievedCount >= 1 ? "COMPLETED" : "IN_PROGRESS",
            rewardCoins: 60,
            rewardXp: 150
          }
        ],
        chapterReward: {
          title: "Khung Obsidian Gold",
          coins: 150,
          frame: "frame_obsidian_gold"
        }
      },
      {
        index: 4,
        id: "ch4",
        title: "Ch\u01B0\u01A1ng 4: T\u0103ng Tr\u01B0\u1EDFng (Grow)",
        tagline: "M\u1EDF r\u1ED9ng quy m\xF4 c\xF4ng vi\u1EC7c v\xE0 t\xEDch l\u0169y tri th\u1EE9c s\xE2u s\u1EAFc",
        theme: "cyan",
        isUnlocked: maxHabitStreak >= 21,
        isCompleted: allCompletedTasksCount >= 50 && totalFocusHours >= 15,
        progressPercent: Math.min(100, Math.round(Math.min(50, allCompletedTasksCount) / 50 * 50 + Math.min(15, totalFocusHours) / 15 * 50)),
        nodes: [
          {
            id: "n4_1",
            chapterIndex: 4,
            title: "50 Nhi\u1EC7m V\u1EE5 Ho\xE0n T\u1EA5t",
            description: "Gi\u1EA3i quy\u1EBFt kh\u1ED1i l\u01B0\u1EE3ng c\xF4ng vi\u1EC7c \u0111\xE1ng k\u1EC3",
            requirementText: "50 tasks ho\xE0n th\xE0nh",
            category: "task",
            current: Math.min(50, allCompletedTasksCount),
            target: 50,
            unit: "tasks",
            status: allCompletedTasksCount >= 50 ? "COMPLETED" : "IN_PROGRESS",
            rewardTitle: "Strategist",
            rewardCoins: 100,
            rewardXp: 250
          },
          {
            id: "n4_2",
            chapterIndex: 4,
            title: "15 Gi\u1EDD L\xE0m Vi\u1EC7c S\xE2u",
            description: "X\xE2y d\u1EF1ng n\u0103ng l\u1EF1c t\u1EADp trung b\u1EC1n b\u1EC9 c\u1EE7a chuy\xEAn gia",
            requirementText: "15 gi\u1EDD focus session",
            category: "focus",
            current: Math.min(15, totalFocusHours),
            target: 15,
            unit: "gi\u1EDD",
            status: totalFocusHours >= 15 ? "COMPLETED" : "IN_PROGRESS",
            rewardCoins: 100,
            rewardXp: 250
          }
        ],
        chapterReward: {
          title: "Huy hi\u1EC7u Deep Work Champion",
          coins: 200,
          badge: "badge_deep_worker"
        }
      },
      {
        index: 5,
        id: "ch5",
        title: "Ch\u01B0\u01A1ng 5: L\xE0m Ch\u1EE7 (Master)",
        tagline: "\u0110\u1EA1t t\u1EDBi tr\u1EA1ng th\xE1i t\u1EF1 ch\u1EE7 to\xE0n di\u1EC7n cu\u1ED9c \u0111\u1EDDi",
        theme: "emerald",
        isUnlocked: allCompletedTasksCount >= 50 && totalFocusHours >= 15,
        isCompleted: allCompletedTasksCount >= 100 && maxHabitStreak >= 60,
        progressPercent: Math.min(100, Math.round(Math.min(100, allCompletedTasksCount) / 100 * 50 + Math.min(60, maxHabitStreak) / 60 * 50)),
        nodes: [
          {
            id: "n5_1",
            chapterIndex: 5,
            title: "B\u1EA5t Kh\u1EA3 X\xE2m Ph\u1EA1m (60 Ng\xE0y)",
            description: "K\u1EF7 lu\u1EADt th\xE9p kh\xF4ng b\u1ECB lay chuy\u1EC3n b\u1EDFi b\u1EA5t k\u1EF3 ho\xE0n c\u1EA3nh n\xE0o",
            requirementText: "Chu\u1ED7i th\xF3i quen >= 60 ng\xE0y",
            category: "habit",
            current: Math.min(60, maxHabitStreak),
            target: 60,
            unit: "ng\xE0y li\xEAn ti\u1EBFp",
            status: maxHabitStreak >= 60 ? "MASTERED" : "IN_PROGRESS",
            rewardTitle: "Sovereign",
            rewardCoins: 250,
            rewardXp: 500
          },
          {
            id: "n5_2",
            chapterIndex: 5,
            title: "Centurion (100 Tasks)",
            description: "Chinh ph\u1EE5c 100 m\u1EE5c ti\xEAu h\xE0nh \u0111\u1ED9ng ho\xE0n t\u1EA5t",
            requirementText: "100 tasks ho\xE0n th\xE0nh",
            category: "task",
            current: Math.min(100, allCompletedTasksCount),
            target: 100,
            unit: "tasks",
            status: allCompletedTasksCount >= 100 ? "MASTERED" : "IN_PROGRESS",
            rewardCoins: 250,
            rewardXp: 500
          }
        ],
        chapterReward: {
          title: "Danh hi\u1EC7u Sovereign & V\u01B0\u01A1ng Mi\u1EC7n Grand Sovereign",
          coins: 500,
          badge: "badge_grand_sovereign"
        }
      }
    ];
    const ownedMap = new Map(ownedRewards.map((r) => [r.rewardKey, r]));
    const catalog = this.getCosmeticsCatalog(prog.level).map((item) => ({
      ...item,
      isUnlocked: item.isUnlocked || ownedMap.has(item.key) || item.costCoins === 0,
      isEquipped: item.type === "title" && prog.equippedTitle === item.key || item.type === "frame" && prog.equippedFrame === item.key || item.type === "badge" && prog.equippedBadge === item.key || item.type === "accent" && prog.equippedAccent === item.key
    }));
    const { currentLevelStart, nextLevelStart } = getXpThresholdsForLevel(prog.level);
    const xpSpan = Math.max(1, nextLevelStart - currentLevelStart);
    const xpIntoLevel = Math.max(0, prog.totalXp - currentLevelStart);
    const levelProgressPercent = Math.min(100, Math.max(0, Math.round(xpIntoLevel / xpSpan * 100)));
    const catLevels = {
      learning: {
        xp: prog.learningXp,
        level: prog.learningLevel,
        title: getTitleForLevel(prog.learningLevel).split(" \xB7 ")[0],
        percent: Math.min(100, Math.round(prog.learningXp % 300 / 3))
      },
      habit: {
        xp: prog.habitXp,
        level: prog.habitLevel,
        title: getTitleForLevel(prog.habitLevel).split(" \xB7 ")[0],
        percent: Math.min(100, Math.round(prog.habitXp % 300 / 3))
      },
      focus: {
        xp: prog.focusXp,
        level: prog.focusLevel,
        title: getTitleForLevel(prog.focusLevel).split(" \xB7 ")[0],
        percent: Math.min(100, Math.round(prog.focusXp % 300 / 3))
      },
      finance: {
        xp: prog.financeXp,
        level: prog.financeLevel,
        title: getTitleForLevel(prog.financeLevel).split(" \xB7 ")[0],
        percent: Math.min(100, Math.round(prog.financeXp % 300 / 3))
      }
    };
    const totalFocusMinutesAll = allFocusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const vocabLearnedCount = await prisma.vocabWordProgress.count({ where: { userId, memoryLevel: { gte: 2 } } });
    const totalSavingsAmount = savingGoals.reduce((acc, s) => acc + (s.currentAmount || 0), 0);
    const achievements = [
      {
        id: "ach_first_step",
        key: "first_step",
        title: "FIRST STEP",
        description: "Ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 c\xF4ng vi\u1EC7c \u0111\u1EA7u ti\xEAn tr\xEAn LifeOS",
        category: "productivity",
        icon: "\u{1F331}",
        current: Math.min(1, allCompletedTasksCount),
        target: 1,
        unit: "task",
        isUnlocked: allCompletedTasksCount >= 1,
        rewardXp: 50,
        rewardCoins: 10
      },
      {
        id: "ach_7_streak",
        key: "7_day_streak",
        title: "7-DAY STREAK",
        description: "Duy tr\xEC chu\u1ED7i ho\u1EA1t \u0111\u1ED9ng k\u1EF7 lu\u1EADt 7 ng\xE0y li\xEAn ti\u1EBFp",
        category: "discipline",
        icon: "\u{1F525}",
        current: Math.min(7, maxHabitStreak),
        target: 7,
        unit: "ng\xE0y li\xEAn ti\u1EBFp",
        isUnlocked: maxHabitStreak >= 7,
        rewardXp: 100,
        rewardCoins: 25
      },
      {
        id: "ach_deep_worker",
        key: "deep_worker",
        title: "DEEP WORKER",
        description: "T\xEDch l\u0169y t\u1ED1i thi\u1EC3u 10 gi\u1EDD l\xE0m vi\u1EC7c s\xE2u v\u1EDBi Pomodoro",
        category: "focus",
        icon: "\u26A1",
        current: Math.min(10, Math.floor(totalFocusMinutesAll / 60)),
        target: 10,
        unit: "gi\u1EDD",
        isUnlocked: totalFocusMinutesAll >= 600,
        rewardXp: 150,
        rewardCoins: 40
      },
      {
        id: "ach_consistency_master",
        key: "consistency_master",
        title: "CONSISTENCY MASTER",
        description: "Chinh ph\u1EE5c chu\u1ED7i th\xF3i quen 21 ng\xE0y h\xECnh th\xE0nh ph\u1EA3n x\u1EA1",
        category: "discipline",
        icon: "\u{1F3C6}",
        current: Math.min(21, maxHabitStreak),
        target: 21,
        unit: "ng\xE0y li\xEAn ti\u1EBFp",
        isUnlocked: maxHabitStreak >= 21,
        rewardXp: 200,
        rewardCoins: 50
      },
      {
        id: "ach_centurion",
        key: "task_centurion",
        title: "TASK CENTURION",
        description: "Ho\xE0n th\xE0nh 100 nhi\u1EC7m v\u1EE5 c\xF4ng vi\u1EC7c h\xE0nh \u0111\u1ED9ng",
        category: "productivity",
        icon: "\u{1F6E1}\uFE0F",
        current: Math.min(100, allCompletedTasksCount),
        target: 100,
        unit: "tasks",
        isUnlocked: allCompletedTasksCount >= 100,
        rewardXp: 300,
        rewardCoins: 75
      },
      {
        id: "ach_knowledge_sage",
        key: "knowledge_sage",
        title: "KNOWLEDGE SAGE",
        description: "Luy\u1EC7n t\u1EADp th\xE0nh th\u1EA1o 50 t\u1EEB v\u1EF1ng ho\u1EB7c ho\xE0n th\xE0nh b\xE0i h\u1ECDc",
        category: "learning",
        icon: "\u{1F9E0}",
        current: Math.min(50, vocabLearnedCount),
        target: 50,
        unit: "t\u1EEB v\u1EF1ng",
        isUnlocked: vocabLearnedCount >= 50,
        rewardXp: 150,
        rewardCoins: 35
      },
      {
        id: "ach_wealth_architect",
        key: "wealth_architect",
        title: "WEALTH ARCHITECT",
        description: "C\xE1n m\u1ED1c 100% m\u1EE5c ti\xEAu ti\u1EBFt ki\u1EC7m t\xEDch l\u0169y t\xE0i ch\xEDnh",
        category: "finance",
        icon: "\u{1F4B0}",
        current: Math.min(1, savingsAchievedCount),
        target: 1,
        unit: "m\u1EE5c ti\xEAu",
        isUnlocked: savingsAchievedCount >= 1,
        rewardXp: 200,
        rewardCoins: 50
      }
    ];
    let weekHabitsCount = 0;
    habits.forEach((h) => {
      let dates = [];
      try {
        dates = typeof h.completedDates === "string" ? JSON.parse(h.completedDates) : h.completedDates || [];
      } catch {
        dates = [];
      }
      dates.forEach((d) => {
        if (new Date(d) >= mondayStart) weekHabitsCount++;
      });
    });
    const weeklyStats = {
      tasksCompleted: weekTasksCount,
      focusMinutes: weekFocusMinutes,
      learningMinutes: todayVocabReviews * 5,
      habitsCompleted: weekHabitsCount,
      savingsAmount: totalSavingsAmount,
      streakDays: prog.currentStreak
    };
    const allTimeStats = {
      totalTasksCompleted: allCompletedTasksCount,
      totalFocusMinutes: totalFocusMinutesAll,
      totalLearningCount: vocabLearnedCount,
      totalHabitsStreak: maxHabitStreak,
      totalSavingsAmount
    };
    return {
      level: prog.level,
      levelTitle: getTitleForLevel(prog.level),
      totalXp: prog.totalXp,
      xpForCurrentLevel: currentLevelStart,
      xpForNextLevel: nextLevelStart,
      xpNeededForNextLevel: Math.max(0, nextLevelStart - prog.totalXp),
      levelProgressPercent,
      coins: prog.coins,
      currentStreak: prog.currentStreak,
      longestStreak: prog.longestStreak,
      lastActiveDate: prog.lastActiveDate,
      equipped: {
        title: prog.equippedTitle || "Initiator",
        frame: prog.equippedFrame || "default",
        badge: prog.equippedBadge || "starter",
        accent: prog.equippedAccent || "emerald"
      },
      categories: catLevels,
      dailyQuests,
      weeklyChallenges,
      journeyChapters,
      achievements,
      weeklyStats,
      allTimeStats,
      recentXpLedger,
      recentCoinLedger,
      cosmeticsCatalog: catalog
    };
  },
  /**
   * Claim Daily Quest (Idempotent)
   */
  async claimDailyQuest(userId, questKey) {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sourceId = `${questKey}_${todayStr}`;
    const state = await this.getProgressionState(userId);
    const quest = state.dailyQuests.find((q) => q.key === questKey);
    if (!quest) throw new Error("Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5 h\xE0ng ng\xE0y n\xE0y.");
    if (!quest.isCompleted) throw new Error("Ch\u01B0a \u0111\u1EA1t \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5.");
    if (quest.isClaimed) throw new Error("Nhi\u1EC7m v\u1EE5 n\xE0y \u0111\xE3 nh\u1EADn th\u01B0\u1EDFng h\xF4m nay r\u1ED3i.");
    return await this.awardXp(userId, {
      amount: quest.rewardXp,
      category: "quest",
      source: "daily_quest",
      sourceId,
      description: `Nhi\u1EC7m v\u1EE5 ng\xE0y: ${quest.title}`
    });
  },
  /**
   * Claim Weekly Challenge (Idempotent)
   */
  async claimWeeklyChallenge(userId, challengeKey) {
    const now = /* @__PURE__ */ new Date();
    const weekNumber = `${now.getFullYear()}_W${Math.ceil((now.getDate() + 6) / 7)}`;
    const sourceId = `${challengeKey}_${weekNumber}`;
    const state = await this.getProgressionState(userId);
    const challenge = state.weeklyChallenges.find((c) => c.key === challengeKey);
    if (!challenge) throw new Error("Kh\xF4ng t\xECm th\u1EA5y th\u1EED th\xE1ch tu\u1EA7n n\xE0y.");
    if (!challenge.isCompleted) throw new Error("Ch\u01B0a \u0111\u1EA1t \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\xE0n th\xE0nh th\u1EED th\xE1ch.");
    if (challenge.isClaimed) throw new Error("Th\u1EED th\xE1ch tu\u1EA7n n\xE0y \u0111\xE3 nh\u1EADn th\u01B0\u1EDFng r\u1ED3i.");
    return await this.awardXp(userId, {
      amount: challenge.rewardXp,
      category: "quest",
      source: "weekly_challenge",
      sourceId,
      description: `Th\u1EED th\xE1ch tu\u1EA7n: ${challenge.title}`
    });
  },
  /**
   * Real System Leaderboard
   * Aggregates real users, their focus sessions and progressions from PostgreSQL.
   * Zero mock data.
   */
  async getLeaderboard(currentUserId) {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        userProgression: {
          select: {
            totalXp: true,
            level: true,
            currentStreak: true,
            longestStreak: true,
            equippedTitle: true
          }
        },
        focusSessions: {
          where: { status: "Completed" },
          select: {
            actualDuration: true,
            createdAt: true
          }
        }
      }
    });
    const parsed = users.map((u) => {
      const focusMinutes = u.focusSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
      const streakDays = u.userProgression?.currentStreak || 0;
      const level = u.userProgression?.level || 1;
      const xp = u.userProgression?.totalXp || 0;
      const cpScore = Math.floor(level * 35 + streakDays * 20 + xp);
      let badge = u.userProgression?.equippedTitle || "T\xE2n Binh \u0110ang L\xEAn";
      if (streakDays >= 14) badge = "\u{1F525} K\u1EF7 Lu\u1EADt Th\xE9p";
      else if (streakDays >= 7) badge = "Chi\u1EBFn Binh K\u1EF7 Lu\u1EADt";
      else if (level >= 5) badge = "B\u1EADc Th\u1EA7y T\u1EADp Trung";
      const isMe = u.id === currentUserId;
      const displayName = isMe ? `${u.name || "B\u1EA1n"} (T\xF4i)` : u.name || u.email.split("@")[0];
      return {
        id: u.id,
        name: displayName,
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "User")}&background=059669&color=fff`,
        badge,
        focusMinutes,
        streakDays,
        cpScore,
        isCurrentUser: isMe
      };
    });
    const focusLeaderboard = [...parsed].sort((a, b) => b.focusMinutes - a.focusMinutes || b.cpScore - a.cpScore).map((item, index) => ({ ...item, rank: index + 1 }));
    const streakLeaderboard = [...parsed].sort((a, b) => b.streakDays - a.streakDays || b.cpScore - a.cpScore).map((item, index) => ({ ...item, rank: index + 1 }));
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeFocusToday = await prisma.focusSession.count({
      where: {
        createdAt: { gte: startOfToday }
      }
    });
    return {
      focusLeaderboard,
      streakLeaderboard,
      activeFocusToday
    };
  }
};

// src/backend/services/rpg.service.ts
init_db();
var MONSTERS_CATALOG = [
  // CHAPTER 1: KHU RỪNG XAO NHÃNG (THE FOREST OF DISTRACTION)
  {
    id: "m1_slime_procrastination",
    chapter: 1,
    name: "Qu\xE1i Nh\u1EA7y Tr\xEC Ho\xE3n",
    title: "Procrastination Slime",
    type: "SLIME",
    level: 1,
    maxHp: 120,
    power: 22,
    defense: 6,
    avatar: "\u{1F7E2}",
    bgTheme: "from-emerald-900/60 to-slate-900",
    description: 'B\xE1m d\xEDnh v\xE0o \xFD ch\xED c\u1EE7a b\u1EA1n, th\xEC th\u1EA7m c\xE2u n\xF3i \u0111\u1ED9c h\u1EA1i: "\u0110\u1EC3 mai l\xE0m c\u0169ng \u0111\u01B0\u1EE3c m\xE0".',
    realLifeNemesis: "Th\xF3i quen ch\u1EA7n ch\u1EEB khi b\u1EAFt \u0111\u1EA7u c\xF4ng vi\u1EC7c",
    requiredPower: 25,
    requiredRealAction: {
      type: "task",
      target: 1,
      description: "Ho\xE0n th\xE0nh \xEDt nh\u1EA5t 1 nhi\u1EC7m v\u1EE5 th\u1EF1c t\u1EBF"
    },
    rewardXp: 45,
    rewardCoins: 25,
    dropEquipmentKey: "wpn_focus_blade",
    dropRatePercent: 100,
    // 1st clear guarantee
    isBoss: false
  },
  {
    id: "m1_goblin_notification",
    chapter: 1,
    name: "Y\xEAu Tinh Th\xF4ng B\xE1o",
    title: "Notification Goblin",
    type: "BEAST",
    level: 2,
    maxHp: 220,
    power: 36,
    defense: 12,
    avatar: "\u{1F47A}",
    bgTheme: "from-amber-900/60 to-slate-900",
    description: "Li\xEAn t\u1EE5c b\u1EA5m chu\xF4ng rung \u0111i\u1EC7n tho\u1EA1i v\xF4 b\u1ED5, c\u01B0\u1EDBp \u0111o\u1EA1t 15 ph\xFAt t\u1EADp trung m\u1ED7i l\u1EA7n xu\u1EA5t hi\u1EC7n.",
    realLifeNemesis: "Xao nh\xE3ng b\u1EDFi th\xF4ng b\xE1o m\u1EA1ng x\xE3 h\u1ED9i",
    requiredPower: 45,
    requiredRealAction: {
      type: "focus",
      target: 20,
      description: "Th\u1EF1c hi\u1EC7n \xEDt nh\u1EA5t 20 ph\xFAt Focus s\xE2u"
    },
    rewardXp: 75,
    rewardCoins: 40,
    dropEquipmentKey: "acc_time_keeper",
    dropRatePercent: 90,
    isBoss: false
  },
  {
    id: "m1_imp_laziness",
    chapter: 1,
    name: "Ti\u1EC3u Qu\u1EF7 L\u01B0\u1EDDi Bi\u1EBFng",
    title: "Sloth Imp",
    type: "DEMON",
    level: 3,
    maxHp: 340,
    power: 52,
    defense: 18,
    avatar: "\u{1F608}",
    bgTheme: "from-purple-900/60 to-slate-900",
    description: "K\xE9o c\u01A1 th\u1EC3 b\u1EA1n d\xEDnh ch\u1EB7t v\xE0o gi\u01B0\u1EDDng n\u1EC7m, d\u1EE5 d\u1ED7 b\u1EA1n b\u1ECF cu\u1ED9c gi\u1EEFa ch\u1EEBng.",
    realLifeNemesis: "S\u1EF1 u\u1EC3 o\u1EA3i v\xE0 thi\u1EBFu \u0111\u1ED9ng l\u1EF1c bu\u1ED5i s\xE1ng",
    requiredPower: 70,
    requiredRealAction: {
      type: "habit",
      target: 2,
      description: "Ho\xE0n th\xE0nh \xEDt nh\u1EA5t 2 l\u01B0\u1EE3t th\xF3i quen k\u1EF7 lu\u1EADt"
    },
    rewardXp: 110,
    rewardCoins: 60,
    dropEquipmentKey: "arm_study_robe",
    dropRatePercent: 85,
    isBoss: false
  },
  {
    id: "boss1_the_procrastinator",
    chapter: 1,
    name: "Ch\xFAa T\u1EC3 Tr\xEC Ho\xE3n",
    title: "The Grand Procrastinator",
    type: "BOSS",
    level: 5,
    maxHp: 850,
    power: 85,
    defense: 32,
    avatar: "\u{1F451}",
    bgTheme: "from-rose-950 via-slate-900 to-slate-950",
    description: "Th\u1EF1c th\u1EC3 kh\u1ED5ng l\u1ED3 giam gi\u1EEF h\xE0ng tr\u0103m \xFD t\u01B0\u1EDFng d\u1EDF dang. K\u1EBB canh c\u1ED5ng Khu R\u1EEBng Xao Nh\xE3ng.",
    realLifeNemesis: "S\u1EF1 tr\xEC ho\xE3n m\xE3n t\xEDnh l\xE0m l\u1EE1 d\u1EDF m\u1EE5c ti\xEAu \u0111\u1EDDi ng\u01B0\u1EDDi",
    requiredPower: 120,
    requiredRealAction: {
      type: "overall",
      target: 5,
      description: "Ho\xE0n th\xE0nh 5 nhi\u1EC7m v\u1EE5 + 1 phi\xEAn Focus + 3 ng\xE0y Streak"
    },
    rewardXp: 280,
    rewardCoins: 200,
    dropEquipmentKey: "wpn_discipline_sword",
    dropRatePercent: 100,
    isBoss: true
  },
  // CHAPTER 2: THUNG LŨNG HỖN LOẠN (THE VALLEY OF CHAOS)
  {
    id: "m2_beast_deadline",
    chapter: 2,
    name: "Qu\xE1i Th\xFA Deadline",
    title: "Deadline Beast",
    type: "BEAST",
    level: 7,
    maxHp: 580,
    power: 95,
    defense: 38,
    avatar: "\u{1F43A}",
    bgTheme: "from-orange-900/60 to-slate-900",
    description: "H\u01A1i th\u1EDF d\u1ED3n d\u1EADp, t\u1EA5n c\xF4ng khi kim \u0111\u1ED3ng h\u1ED3 ch\u1EC9 v\u1EC1 s\u1ED1 0 v\xE0 b\u1EA1n ch\u01B0a chu\u1EA9n b\u1ECB k\u1ECBp.",
    realLifeNemesis: "\xC1p l\u1EF1c n\u01B0\u1EDBc \u0111\u1EBFn ch\xE2n m\u1EDBi nh\u1EA3y",
    requiredPower: 160,
    requiredRealAction: {
      type: "task",
      target: 8,
      description: "Ho\xE0n th\xE0nh 8 nhi\u1EC7m v\u1EE5 th\u1EF1c t\u1EBF"
    },
    rewardXp: 160,
    rewardCoins: 90,
    dropEquipmentKey: "acc_memory_band",
    dropRatePercent: 80,
    isBoss: false
  },
  {
    id: "m2_wolf_chaos",
    chapter: 2,
    name: "S\xF3i M\u1EA5t Ph\u01B0\u01A1ng H\u01B0\u1EDBng",
    title: "Chaos Wolf",
    type: "BEAST",
    level: 9,
    maxHp: 780,
    power: 125,
    defense: 48,
    avatar: "\u{1F43E}",
    bgTheme: "from-cyan-900/60 to-slate-900",
    description: "Lao t\u1EDBi c\u1EAFn x\xE9 khi l\u1ECBch tr\xECnh c\u1EE7a b\u1EA1n b\u1ECB v\u1EE1 v\u1EE5n v\xE0 kh\xF4ng bi\u1EBFt b\u1EAFt \u0111\u1EA7u t\u1EEB \u0111\xE2u.",
    realLifeNemesis: "Thi\u1EBFu t\u1ED5 ch\u1EE9c v\xE0 h\u1ED7n lo\u1EA1n k\u1EBF ho\u1EA1ch h\xE0ng ng\xE0y",
    requiredPower: 210,
    requiredRealAction: {
      type: "habit",
      target: 5,
      description: "Duy tr\xEC chu\u1ED7i k\u1EF7 lu\u1EADt 5 ng\xE0y streak"
    },
    rewardXp: 220,
    rewardCoins: 120,
    dropEquipmentKey: "arm_focus_armor",
    dropRatePercent: 75,
    isBoss: false
  },
  {
    id: "m2_wraith_overthinking",
    chapter: 2,
    name: "B\xF3ng Ma Ngh\u0129 Qu\u1EA9n",
    title: "Overthinking Wraith",
    type: "WRAITH",
    level: 11,
    maxHp: 1020,
    power: 160,
    defense: 58,
    avatar: "\u{1F47B}",
    bgTheme: "from-indigo-900/60 to-slate-900",
    description: "T\u1EA1o ra h\xE0ng ng\xE0n k\u1ECBch b\u1EA3n th\u1EA5t b\u1EA1i gi\u1EA3 \u0111\u1ECBnh trong \u0111\u1EA7u khi\u1EBFn b\u1EA1n t\xEA li\u1EC7t kh\xF4ng d\xE1m h\xE0nh \u0111\u1ED9ng.",
    realLifeNemesis: "Overthinking v\xE0 ph\xE2n t\xEDch qu\xE1 \u0111\xE0 l\xE0m t\xEA li\u1EC7t h\xE0nh \u0111\u1ED9ng",
    requiredPower: 260,
    requiredRealAction: {
      type: "focus",
      target: 60,
      description: "\u0110\u1EA1t t\u1ED1i thi\u1EC3u 60 ph\xFAt l\xE0m vi\u1EC7c s\xE2u th\u1EF1c t\u1EBF"
    },
    rewardXp: 290,
    rewardCoins: 160,
    dropEquipmentKey: "acc_clarity_tiara",
    dropRatePercent: 70,
    isBoss: false
  },
  {
    id: "boss2_chaos_king",
    chapter: 2,
    name: "Vua H\u1ED7n \u0110\u1ED9n",
    title: "The Chaos King",
    type: "BOSS",
    level: 15,
    maxHp: 2100,
    power: 230,
    defense: 85,
    avatar: "\u{1F451}",
    bgTheme: "from-violet-950 via-slate-900 to-slate-950",
    description: "K\u1EBB cai tr\u1ECB Thung L\u0169ng H\u1ED7n Lo\u1EA1n. Ch\u1EC9 c\xF3 tr\u1EADt t\u1EF1 v\xE0 s\u1EF1 k\u1EF7 lu\u1EADt th\xE9p m\u1EDBi c\xF3 th\u1EC3 ch\u1EB7t \u0111\u1EE9t uy quy\u1EC1n c\u1EE7a h\u1EAFn.",
    realLifeNemesis: "Cu\u1ED9c s\u1ED1ng m\u1EA5t ki\u1EC3m so\xE1t v\xE0 thi\u1EBFu h\u1EC7 th\u1ED1ng l\xE0m vi\u1EC7c c\xE1 nh\xE2n",
    requiredPower: 350,
    requiredRealAction: {
      type: "overall",
      target: 15,
      description: "Ho\xE0n th\xE0nh 15 nhi\u1EC7m v\u1EE5 + 7 ng\xE0y Streak + 90 ph\xFAt Focus"
    },
    rewardXp: 550,
    rewardCoins: 450,
    dropEquipmentKey: "arm_iron_will",
    dropRatePercent: 100,
    isBoss: true
  },
  // CHAPTER 3: THÀNH TRÌ KIỆT SỨC (THE CITADEL OF BURNOUT)
  {
    id: "m3_golem_burnout",
    chapter: 3,
    name: "Ng\u01B0\u1EDDi \u0110\xE1 Ki\u1EC7t S\u1EE9c",
    title: "Burnout Golem",
    type: "GOLEM",
    level: 18,
    maxHp: 1750,
    power: 250,
    defense: 105,
    avatar: "\u{1F5FF}",
    bgTheme: "from-amber-950/70 to-slate-900",
    description: "C\u01A1 th\u1EC3 n\u1EB7ng tr\u0129u v\xEC l\xE0m vi\u1EC7c m\xF9 qu\xE1ng kh\xF4ng ngh\u1EC9 ng\u01A1i, \u0111\xE8 n\xE9n m\u1ECDi c\u1EA3m h\u1EE9ng s\xE1ng t\u1EA1o.",
    realLifeNemesis: "L\xE0m vi\u1EC7c qu\xE1 t\u1EA3i kh\xF4ng c\xF3 chi\u1EBFn l\u01B0\u1EE3c ph\u1EE5c h\u1ED3i",
    requiredPower: 420,
    requiredRealAction: {
      type: "focus",
      target: 120,
      description: "T\xEDch l\u0169y 120 ph\xFAt Focus \u0111i\u1EC1u \u0111\u1ED9 \u0111\xFAng nh\u1ECBp"
    },
    rewardXp: 380,
    rewardCoins: 220,
    dropEquipmentKey: "acc_energy_core",
    dropRatePercent: 65,
    isBoss: false
  },
  {
    id: "m3_demon_distraction",
    chapter: 3,
    name: "\xC1c Ma C\xE1m D\u1ED7",
    title: "Temptation Demon",
    type: "DEMON",
    level: 21,
    maxHp: 2250,
    power: 300,
    defense: 125,
    avatar: "\u{1F47F}",
    bgTheme: "from-rose-900/60 to-slate-900",
    description: "Hi\u1EC3n hi\u1EC7n d\u01B0\u1EDBi h\xECnh th\u1EE9c nh\u1EEFng th\xFA vui t\u1EE9c th\u1EDDi, \u0111\xE1nh \u0111\u1ED5i t\u01B0\u01A1ng lai l\u1EA5y v\xE0i ph\xFAt dopamine r\xE1c.",
    realLifeNemesis: "Nghi\u1EC7n dopamine ng\u1EAFn h\u1EA1n (Shorts, Reels, Games v\xF4 b\u1ED5)",
    requiredPower: 520,
    requiredRealAction: {
      type: "habit",
      target: 10,
      description: "\u0110\u1EA1t chu\u1ED7i 10 ng\xE0y k\u1EF7 lu\u1EADt ki\xEAn \u0111\u1ECBnh"
    },
    rewardXp: 480,
    rewardCoins: 280,
    dropEquipmentKey: "wpn_productivity_bow",
    dropRatePercent: 60,
    isBoss: false
  },
  {
    id: "m3_knight_fear",
    chapter: 3,
    name: "K\u1EF5 S\u0129 S\u1EE3 H\xE3i",
    title: "Fear Knight",
    type: "KNIGHT",
    level: 25,
    maxHp: 2850,
    power: 360,
    defense: 155,
    avatar: "\u2694\uFE0F",
    bgTheme: "from-slate-800 to-slate-950",
    description: "B\u1ED9 gi\xE1p b\xF3ng t\u1ED1i c\u1EE7a n\u1ED7i s\u1EE3 b\u1ECB t\u1EEB ch\u1ED1i, s\u1EE3 kh\xF4ng \u0111\u1EE7 gi\u1ECFi v\xE0 s\u1EE3 b\u01B0\u1EDBc ra kh\u1ECFi v\xF9ng an to\xE0n.",
    realLifeNemesis: "N\u1ED7i s\u1EE3 th\u1EA5t b\u1EA1i k\xECm h\xE3m s\u1EF1 b\u1EE9t ph\xE1",
    requiredPower: 640,
    requiredRealAction: {
      type: "learning",
      target: 30,
      description: "Thu n\u1EA1p \xEDt nh\u1EA5t 30 t\u1EEB v\u1EF1ng / ki\u1EBFn th\u1EE9c chuy\xEAn s\xE2u"
    },
    rewardXp: 600,
    rewardCoins: 350,
    dropEquipmentKey: "arm_order_aegis",
    dropRatePercent: 55,
    isBoss: false
  },
  {
    id: "boss3_burnout_titan",
    chapter: 3,
    name: "Kh\u1ED5ng L\u1ED3 Ki\u1EC7t S\u1EE9c",
    title: "The Burnout Titan",
    type: "BOSS",
    level: 30,
    maxHp: 4600,
    power: 460,
    defense: 210,
    avatar: "\u{1F525}",
    bgTheme: "from-red-950 via-slate-900 to-slate-950",
    description: "C\u01A1n b\xE3o l\u1EEDa thi\xEAu r\u1EE5i tinh th\u1EA7n c\u1EE7a ng\u01B0\u1EDDi tr\u1EBB ki\u1EC7t qu\u1EC7. \u0110\xF2i h\u1ECFi s\u1EF1 b\u1EC1n b\u1EC9 c\xE2n b\u1EB1ng gi\u1EEFa Th\xE2n - T\xE2m - Tr\xED.",
    realLifeNemesis: "Kh\u1EE7ng ho\u1EA3ng n\u0103ng l\u01B0\u1EE3ng v\xE0 c\u1EA1n ki\u1EC7t ni\u1EC1m tin",
    requiredPower: 800,
    requiredRealAction: {
      type: "overall",
      target: 25,
      description: "30 Tasks + 180m Focus + 14 ng\xE0y Streak + 50 t\u1EEB v\u1EF1ng"
    },
    rewardXp: 1100,
    rewardCoins: 900,
    dropEquipmentKey: "wpn_chrono_edge",
    dropRatePercent: 100,
    isBoss: true
  },
  // CHAPTER 4: ĐỈNH CAO THĂNG HOA (THE SUMMIT OF ASCENSION)
  {
    id: "m4_phantom_void",
    chapter: 4,
    name: "B\xF3ng H\u01B0 V\xF4",
    title: "Void Phantom",
    type: "PHANTOM",
    level: 35,
    maxHp: 3800,
    power: 510,
    defense: 220,
    avatar: "\u{1F30C}",
    bgTheme: "from-blue-950/70 to-slate-900",
    description: 'Kho\u1EA3ng tr\u1ED1ng v\xF4 \u0111\u1ECBnh ch\u1EA5t v\u1EA5n: "N\u1ED7 l\u1EF1c nhi\u1EC1u th\u1EBF \u0111\u1EC3 l\xE0m g\xEC?". Th\u1EED th\xE1ch t\u1EA7ng s\xE2u c\u1EE7a l\u1EBD s\u1ED1ng.',
    realLifeNemesis: "S\u1EF1 m\u1EA5t ph\u01B0\u01A1ng h\u01B0\u1EDBng v\xE0 thi\u1EBFu m\u1EE5c \u0111\xEDch d\xE0i h\u1EA1n",
    requiredPower: 950,
    requiredRealAction: {
      type: "task",
      target: 50,
      description: "Chinh ph\u1EE5c 50 nhi\u1EC7m v\u1EE5 th\u1EF1c t\u1EBF"
    },
    rewardXp: 750,
    rewardCoins: 450,
    dropEquipmentKey: "acc_astral_ring",
    dropRatePercent: 50,
    isBoss: false
  },
  {
    id: "m4_devourer_time",
    chapter: 4,
    name: "K\u1EBB Nu\u1ED1t Ch\u1EEDng Th\u1EDDi Gian",
    title: "Time Devourer",
    type: "DEMON",
    level: 40,
    maxHp: 5200,
    power: 620,
    defense: 270,
    avatar: "\u23F3",
    bgTheme: "from-teal-950/70 to-slate-900",
    description: "Nu\u1ED1t ch\u1EEDng t\u1EEBng n\u0103m th\xE1ng thanh xu\xE2n c\u1EE7a nh\u1EEFng ai s\u1ED1ng thi\u1EBFu \xFD th\u1EE9c v\xE0 k\u1EF7 lu\u1EADt b\u1EA3n th\xE2n.",
    realLifeNemesis: "S\u1EF1 l\xE3ng ph\xED tu\u1ED5i tr\u1EBB v\xE0 th\u1EDDi gian qu\xFD gi\xE1",
    requiredPower: 1150,
    requiredRealAction: {
      type: "habit",
      target: 21,
      description: "\u0110\u1EA1t m\u1ED1c v\xE0ng 21 ng\xE0y streak li\xEAn t\u1EE5c"
    },
    rewardXp: 950,
    rewardCoins: 600,
    dropEquipmentKey: "arm_eternity_robe",
    dropRatePercent: 45,
    isBoss: false
  },
  {
    id: "m4_master_entropy",
    chapter: 4,
    name: "Ch\xFAa T\u1EC3 Suy Tho\xE1i",
    title: "Master of Entropy",
    type: "WRAITH",
    level: 45,
    maxHp: 6800,
    power: 750,
    defense: 330,
    avatar: "\u{1F32A}\uFE0F",
    bgTheme: "from-purple-950/80 to-slate-900",
    description: "Quy lu\u1EADt t\u1EF1 nhi\xEAn k\xE9o m\u1ECDi th\u1EE9 v\xE0o h\u1ED7n \u0111\u1ED9n v\xE0 tho\xE1i tr\xE0o n\u1EBFu kh\xF4ng c\xF3 \xFD ch\xED ki\xEAn \u0111\u1ECBnh duy tr\xEC.",
    realLifeNemesis: "S\u1EF1 tho\xE1i tr\xE0o v\xE0 b\u1ECF cu\u1ED9c \u1EDF giai \u0111o\u1EA1n g\u1EA7n \u0111\xEDch",
    requiredPower: 1400,
    requiredRealAction: {
      type: "learning",
      target: 100,
      description: "L\xE0m ch\u1EE7 100 t\u1EEB v\u1EF1ng v\xE0 ki\u1EBFn th\u1EE9c n\xE2ng cao"
    },
    rewardXp: 1300,
    rewardCoins: 850,
    dropEquipmentKey: "acc_crown_mastery",
    dropRatePercent: 40,
    isBoss: false
  },
  {
    id: "boss4_inner_saboteur",
    chapter: 4,
    name: "B\xF3ng Ma T\u1EF1 Ph\xE1 H\u1EE7y",
    title: "The Inner Saboteur \xB7 Final Boss",
    type: "BOSS",
    level: 50,
    maxHp: 11500,
    power: 960,
    defense: 440,
    avatar: "\u{1F441}\uFE0F",
    bgTheme: "from-amber-950 via-slate-950 to-emerald-950",
    description: "K\u1EBB th\xF9 nguy hi\u1EC3m nh\u1EA5t kh\xF4ng \u1EDF ngo\xE0i kia. \u0110\xF3 l\xE0 ti\u1EBFng n\xF3i t\u1EF1 nghi ng\u1EDD b\u1EA3n th\xE2n ngay trong t\xE2m tr\xED b\u1EA1n.",
    realLifeNemesis: "H\u1ED9i ch\u1EE9ng K\u1EBB Gi\u1EA3 M\u1EA1o (Imposter Syndrome) & T\u1EF1 Ph\xE1 Ho\u1EA1i Th\xE0nh C\xF4ng",
    requiredPower: 1800,
    requiredRealAction: {
      type: "overall",
      target: 50,
      description: "70 Tasks + 300m Focus + 30 ng\xE0y Streak + 150 t\u1EEB v\u1EF1ng"
    },
    rewardXp: 3e3,
    rewardCoins: 2500,
    dropEquipmentKey: "wpn_sovereign_excalibur",
    dropRatePercent: 100,
    isBoss: true
  }
];
var EQUIPMENTS_CATALOG = {
  // WEAPONS
  wpn_focus_blade: {
    key: "wpn_focus_blade",
    name: "G\u01B0\u01A1m T\u1EADp Trung",
    title: "Focus Blade",
    slot: "WEAPON",
    rarity: "COMMON",
    basePower: 25,
    baseDefense: 0,
    baseHp: 15,
    powerScalePerLevel: 6,
    defenseScalePerLevel: 0,
    hpScalePerLevel: 5,
    baseUpgradeCost: 50,
    icon: "\u{1F5E1}\uFE0F",
    lore: "L\u01B0\u1EE1i ki\u1EBFm r\xE8n t\u1EEB nh\u1EEFng ph\xFAt gi\xE2y d\u1EE9t kho\xE1t t\u1EAFt th\xF4ng b\xE1o \u0111i\u1EC7n tho\u1EA1i.",
    specialEffectDescription: "+10% S\xE1t th\u01B0\u01A1ng khi \u0111\u1ED1i \u0111\u1EA7u v\u1EDBi Qu\xE1i v\u1EADt Xao Nh\xE3ng."
  },
  wpn_knowledge_staff: {
    key: "wpn_knowledge_staff",
    name: "Tr\u01B0\u1EE3ng Tri Th\u1EE9c",
    title: "Knowledge Staff",
    slot: "WEAPON",
    rarity: "UNCOMMON",
    basePower: 45,
    baseDefense: 10,
    baseHp: 20,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 2,
    hpScalePerLevel: 8,
    baseUpgradeCost: 100,
    icon: "\u{1FA84}",
    lore: "Ch\u1EE9a \u0111\u1EF1ng n\u0103ng l\u01B0\u1EE3ng ph\xE1t s\xE1ng t\u1EEB h\xE0ng ch\u1EE5c trang s\xE1ch \u0111\xE3 ng\u1EA5u nghi\u1EBFn.",
    specialEffectDescription: "+15% S\xE1t th\u01B0\u01A1ng ph\xE9p thu\u1EADt d\u1EF1a tr\xEAn s\u1ED1 t\u1EEB v\u1EF1ng ghi nh\u1EDB."
  },
  wpn_discipline_sword: {
    key: "wpn_discipline_sword",
    name: "Thanh Ki\u1EBFm K\u1EF7 Lu\u1EADt",
    title: "Discipline Sword",
    slot: "WEAPON",
    rarity: "RARE",
    basePower: 85,
    baseDefense: 15,
    baseHp: 40,
    powerScalePerLevel: 16,
    defenseScalePerLevel: 4,
    hpScalePerLevel: 12,
    baseUpgradeCost: 200,
    icon: "\u2694\uFE0F",
    lore: "V\u0169 kh\xED \u0111\u01B0\u1EE3c t\xF4i luy\u1EC7n qua ng\u1ECDn l\u1EEDa c\u1EE7a nh\u1EEFng ng\xE0y ki\xEAn tr\xEC th\u1EE9c d\u1EADy s\u1EDBm.",
    specialEffectDescription: "+5% T\u1EF7 l\u1EC7 \u0111\xF2n \u0111\xE1nh ch\xED m\u1EA1ng (Critical Strike)."
  },
  wpn_productivity_bow: {
    key: "wpn_productivity_bow",
    name: "Cung N\u0103ng Su\u1EA5t",
    title: "Productivity Bow",
    slot: "WEAPON",
    rarity: "EPIC",
    basePower: 145,
    baseDefense: 20,
    baseHp: 60,
    powerScalePerLevel: 25,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 18,
    baseUpgradeCost: 400,
    icon: "\u{1F3F9}",
    lore: "M\u1ED7i m\u0169i t\xEAn b\u1EAFn tr\xFAng l\xE0 m\u1ED9t m\u1EE5c ti\xEAu trong ng\xE0y \u0111\u01B0\u1EE3c g\u1EA1ch b\u1ECF d\u1EE9t kho\xE1t.",
    specialEffectDescription: "+20% S\xE1t th\u01B0\u01A1ng khi \u0111\xE1nh Boss ch\u01B0\u01A1ng."
  },
  wpn_chrono_edge: {
    key: "wpn_chrono_edge",
    name: "L\u01B0\u1EE1i Ki\u1EBFm Th\u1EDDi Gian",
    title: "Chrono Blade",
    slot: "WEAPON",
    rarity: "LEGENDARY",
    basePower: 240,
    baseDefense: 35,
    baseHp: 100,
    powerScalePerLevel: 40,
    defenseScalePerLevel: 8,
    hpScalePerLevel: 30,
    baseUpgradeCost: 800,
    icon: "\u26A1",
    lore: "L\xE0m ch\u1EE7 t\u1EEBng gi\u1EDD t\u1EEBng kh\u1EAFc, bi\u1EBFn th\u1EDDi gian th\xE0nh v\u0169 kh\xED t\u1ED1i th\u01B0\u1EE3ng.",
    specialEffectDescription: "\u0110\xF2n \u0111\xE1nh c\xF3 20% kh\u1EA3 n\u0103ng k\xEDch ho\u1EA1t Song \u0110\xF2n (\u0110\xE1nh 2 l\u1EA7n trong 1 l\u01B0\u1EE3t)."
  },
  wpn_sovereign_excalibur: {
    key: "wpn_sovereign_excalibur",
    name: "G\u01B0\u01A1m B\xE1 V\u01B0\u01A1ng T\u1ED1i Th\u01B0\u1EE3ng",
    title: "Sovereign Excalibur",
    slot: "WEAPON",
    rarity: "MYTHIC",
    basePower: 420,
    baseDefense: 60,
    baseHp: 200,
    powerScalePerLevel: 70,
    defenseScalePerLevel: 15,
    hpScalePerLevel: 50,
    baseUpgradeCost: 1500,
    icon: "\u{1F31F}",
    lore: "Thanh g\u01B0\u01A1m c\u1EE7a ng\u01B0\u1EDDi \u0111\xE3 l\xE0m ch\u1EE7 to\xE0n b\u1ED9 v\u1EADn m\u1EC7nh v\xE0 k\u1EF7 lu\u1EADt b\u1EA3n th\xE2n.",
    specialEffectDescription: "+35% To\xE0n b\u1ED9 s\xE1t th\u01B0\u01A1ng v\xE0 h\u1ED3i ph\u1EE5c 5% HP m\u1ED7i l\u01B0\u1EE3t chi\u1EBFn \u0111\u1EA5u."
  },
  // ARMORS
  arm_study_robe: {
    key: "arm_study_robe",
    name: "\xC1o Cho\xE0ng \u0110\xE8n Khuya",
    title: "Study Robe",
    slot: "ARMOR",
    rarity: "COMMON",
    basePower: 5,
    baseDefense: 20,
    baseHp: 45,
    powerScalePerLevel: 1,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 15,
    baseUpgradeCost: 50,
    icon: "\u{1F94B}",
    lore: "Kho\xE1c l\xEAn s\u1EF1 t\u0129nh l\u1EB7ng c\u1EE7a nh\u1EEFng \u0111\xEAm chuy\xEAn c\u1EA7n t\xEDch l\u0169y tri th\u1EE9c.",
    specialEffectDescription: "Gi\u1EA3m 5 s\xE1t th\u01B0\u01A1ng nh\u1EADn t\u1EEB \u0111\xF2n t\u1EA5n c\xF4ng c\u1EE7a ti\u1EC3u qu\xE1i."
  },
  arm_focus_armor: {
    key: "arm_focus_armor",
    name: "Gi\xE1p Tr\u1EE5 T\u1EADp Trung",
    title: "Focus Plate",
    slot: "ARMOR",
    rarity: "UNCOMMON",
    basePower: 10,
    baseDefense: 42,
    baseHp: 90,
    powerScalePerLevel: 2,
    defenseScalePerLevel: 9,
    hpScalePerLevel: 25,
    baseUpgradeCost: 100,
    icon: "\u{1F6E1}\uFE0F",
    lore: "T\u1EA5m khi\xEAn ch\u1EAFn v\xF4 h\xECnh tr\u01B0\u1EDBc m\u1ECDi l\u1EDDi r\u1EE7 r\xEA v\xE0 tin nh\u1EAFn xao nh\xE3ng.",
    specialEffectDescription: "+10% Kh\u1EA3 n\u0103ng gi\u1EA3m thi\u1EC3u \u0111\xF2n \u0111\xE1nh tr\u1EF1c di\u1EC7n."
  },
  arm_iron_will: {
    key: "arm_iron_will",
    name: "Gi\xE1p \xDD Ch\xED S\u1EAFt",
    title: "Iron Will Armor",
    slot: "ARMOR",
    rarity: "RARE",
    basePower: 20,
    baseDefense: 85,
    baseHp: 160,
    powerScalePerLevel: 4,
    defenseScalePerLevel: 16,
    hpScalePerLevel: 40,
    baseUpgradeCost: 200,
    icon: "\u26D3\uFE0F",
    lore: "Kim lo\u1EA1i t\xF4i luy\u1EC7n t\u1EEB chu\u1ED7i th\xF3i quen li\xEAn t\u1EE5c kh\xF4ng b\u1ECB gi\xE1n \u0111o\u1EA1n.",
    specialEffectDescription: "+15% T\u1ED5ng gi\xE1p khi HP t\u1EE5t xu\u1ED1ng d\u01B0\u1EDBi 40%."
  },
  arm_order_aegis: {
    key: "arm_order_aegis",
    name: "Khi\xEAn Tr\u1EADt T\u1EF1 T\u1ED1i Cao",
    title: "Aegis of Order",
    slot: "ARMOR",
    rarity: "EPIC",
    basePower: 35,
    baseDefense: 145,
    baseHp: 270,
    powerScalePerLevel: 6,
    defenseScalePerLevel: 26,
    hpScalePerLevel: 65,
    baseUpgradeCost: 400,
    icon: "\u{1F530}",
    lore: "X\xE2y d\u1EF1ng n\xEAn b\u1EDFi h\u1EC7 th\u1ED1ng qu\u1EA3n l\xFD c\xF4ng vi\u1EC7c v\xE0 cu\u1ED9c s\u1ED1ng v\u1EEFng nh\u01B0 b\xE0n th\u1EA1ch.",
    specialEffectDescription: "Ph\u1EA3n l\u1EA1i 15% s\xE1t th\u01B0\u01A1ng nh\u1EADn v\xE0o v\u1EC1 ph\xEDa qu\xE1i v\u1EADt."
  },
  arm_eternity_robe: {
    key: "arm_eternity_robe",
    name: "Ph\xE1p Ph\u1EE5c V\u0129nh C\u1EEDu",
    title: "Robe of Eternity",
    slot: "ARMOR",
    rarity: "LEGENDARY",
    basePower: 50,
    baseDefense: 240,
    baseHp: 460,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 42,
    hpScalePerLevel: 100,
    baseUpgradeCost: 800,
    icon: "\u{1F9E5}",
    lore: "D\u1EC7t n\xEAn t\u1EEB nh\u1EEFng s\u1EE3i ch\u1EC9 c\u1EE7a l\xF2ng ki\xEAn \u0111\u1ECBnh kh\xF4ng g\xEC lay chuy\u1EC3n n\u1ED5i.",
    specialEffectDescription: "Kh\xE1ng ho\xE0n to\xE0n \u0111\xF2n ch\xED m\u1EA1ng c\u1EE7a k\u1EBB th\xF9."
  },
  // ACCESSORIES
  acc_time_keeper: {
    key: "acc_time_keeper",
    name: "Nh\u1EABn Qu\u1EA3n L\xFD Th\u1EDDi Gian",
    title: "Time Keeper Ring",
    slot: "ACCESSORY",
    rarity: "COMMON",
    basePower: 12,
    baseDefense: 10,
    baseHp: 20,
    powerScalePerLevel: 3,
    defenseScalePerLevel: 3,
    hpScalePerLevel: 8,
    baseUpgradeCost: 50,
    icon: "\u{1F48D}",
    lore: "Nh\u1EAFc nh\u1EDF b\u1EA1n m\u1ED7i gi\xE2y tr\xF4i qua \u0111\u1EC1u l\xE0 t\xE0i s\u1EA3n v\xF4 gi\xE1.",
    specialEffectDescription: "+5% \u0110i\u1EC3m kinh nghi\u1EC7m XP thu \u0111\u01B0\u1EE3c t\u1EEB chi\u1EBFn \u0111\u1EA5u."
  },
  acc_memory_band: {
    key: "acc_memory_band",
    name: "V\xF2ng Tr\xED Nh\u1EDB V\u1EEFng V\xE0ng",
    title: "Memory Band",
    slot: "ACCESSORY",
    rarity: "UNCOMMON",
    basePower: 25,
    baseDefense: 20,
    baseHp: 40,
    powerScalePerLevel: 5,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 12,
    baseUpgradeCost: 100,
    icon: "\u{1F4FF}",
    lore: "Gi\u1EEF cho t\xE2m tr\xED lu\xF4n s\xE1ng t\u1ECF, x\xE2u chu\u1ED7i m\u1ECDi kinh nghi\u1EC7m th\xE0nh s\u1EE9c m\u1EA1nh.",
    specialEffectDescription: "+10% Ti\u1EC1n Coins nh\u1EADn \u0111\u01B0\u1EE3c sau m\u1ED7i tr\u1EADn \u0111\u1EA5u."
  },
  acc_clarity_tiara: {
    key: "acc_clarity_tiara",
    name: "V\u01B0\u01A1ng Mi\u1EC7n S\xE1ng Su\u1ED1t",
    title: "Clarity Tiara",
    slot: "ACCESSORY",
    rarity: "RARE",
    basePower: 55,
    baseDefense: 45,
    baseHp: 80,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 9,
    hpScalePerLevel: 20,
    baseUpgradeCost: 200,
    icon: "\u{1F451}",
    lore: "Chi\u1EBFc v\u01B0\u01A1ng mi\u1EC7n x\xF3a tan s\u01B0\u01A1ng m\xF9 ho\xE0i nghi v\xE0 do d\u1EF1.",
    specialEffectDescription: "+8% T\u1EF7 l\u1EC7 \u0111\xF2n \u0111\xE1nh ch\xED m\u1EA1ng (Critical Strike)."
  },
  acc_energy_core: {
    key: "acc_energy_core",
    name: "L\xF5i N\u0103ng L\u01B0\u1EE3ng B\u1EC1n B\u1EC9",
    title: "Energy Core",
    slot: "ACCESSORY",
    rarity: "EPIC",
    basePower: 105,
    baseDefense: 85,
    baseHp: 160,
    powerScalePerLevel: 18,
    defenseScalePerLevel: 16,
    hpScalePerLevel: 35,
    baseUpgradeCost: 400,
    icon: "\u{1F52E}",
    lore: "Cung c\u1EA5p ngu\u1ED3n sinh l\u1EF1c li\xEAn t\u1EE5c cho nh\u1EEFng tr\u1EADn \u0111\xE1nh d\xE0i h\u01A1i.",
    specialEffectDescription: "B\u1EAFt \u0111\u1EA7u m\u1ED7i tr\u1EADn chi\u1EBFn v\u1EDBi 50 \u0111i\u1EC3m Gi\xE1p \u1EA3o b\u1ED5 sung."
  },
  acc_astral_ring: {
    key: "acc_astral_ring",
    name: "Nh\u1EABn Tinh T\xFA V\xF4 Ng\xE3",
    title: "Astral Ring",
    slot: "ACCESSORY",
    rarity: "LEGENDARY",
    basePower: 180,
    baseDefense: 150,
    baseHp: 280,
    powerScalePerLevel: 30,
    defenseScalePerLevel: 26,
    hpScalePerLevel: 60,
    baseUpgradeCost: 800,
    icon: "\u{1F48D}",
    lore: "Nh\xECn th\u1EA5u b\u1EE9c tranh to\xE0n c\u1EA3nh c\u1EE7a s\u1EF1 ti\u1EBFn b\u1ED9 v\xE0 tr\u01B0\u1EDFng th\xE0nh.",
    specialEffectDescription: "+20% T\u1EA5t c\u1EA3 c\xE1c ch\u1EC9 s\u1ED1 th\u01B0\u1EDFng th\xEAm khi b\u01B0\u1EDBc v\xE0o \u0111\u1EA5u Boss."
  },
  acc_crown_mastery: {
    key: "acc_crown_mastery",
    name: "V\u01B0\u01A1ng Mi\u1EC7n B\u1EADc Th\u1EA7y Cu\u1ED9c \u0110\u1EDDi",
    title: "Crown of Life Mastery",
    slot: "ACCESSORY",
    rarity: "MYTHIC",
    basePower: 320,
    baseDefense: 260,
    baseHp: 500,
    powerScalePerLevel: 55,
    defenseScalePerLevel: 45,
    hpScalePerLevel: 100,
    baseUpgradeCost: 1500,
    icon: "\u{1F451}",
    lore: "Minh ch\u1EE9ng cho ng\u01B0\u1EDDi \u0111\xE3 chinh ph\u1EE5c ho\xE0n to\xE0n l\u1ED1i s\u1ED1ng k\u1EF7 lu\u1EADt v\xE0 t\u1EF1 do \u0111\xEDch th\u1EF1c.",
    specialEffectDescription: "+30% Kh\xE1ng s\xE1t th\u01B0\u01A1ng v\xE0 +30% T\u1EA5n c\xF4ng to\xE0n di\u1EC7n."
  }
};
var SKILLS_CATALOG = [
  // FOCUS TREE
  {
    key: "skill_deep_flow",
    name: "D\xF2ng Ch\u1EA3y S\xE2u (Deep Flow)",
    tree: "FOCUS",
    tier: 1,
    requiredLevel: 2,
    costSkillPoints: 1,
    icon: "\u{1F9E0}",
    description: "Chuy\u1EC3n h\xF3a kh\u1EA3 n\u0103ng l\xE0m vi\u1EC7c kh\xF4ng gi\xE1n \u0111o\u1EA1n th\xE0nh s\u1EE9c m\u1EA1nh t\u1EA5n c\xF4ng (+15% Combat Power).",
    passiveBonus: { powerMultiplier: 0.15 }
  },
  {
    key: "skill_iron_mind",
    name: "T\xE2m Th\u1EE9c Ki\xEAn C\u1ED1 (Iron Mind)",
    tree: "FOCUS",
    tier: 2,
    requiredLevel: 6,
    costSkillPoints: 2,
    icon: "\u{1F6E1}\uFE0F",
    description: "T\xE2m tr\xED t\u0129nh l\u1EB7ng nh\u01B0 m\u1EB7t h\u1ED3, ch\u1EB7n \u0111\u1EE9ng \u0111\xF2n t\u1EA5n c\xF4ng t\xE2m l\xFD t\u1EEB qu\xE1i v\u1EADt (+20% Defense).",
    passiveBonus: { defenseMultiplier: 0.2 }
  },
  {
    key: "skill_time_dilation",
    name: "K\xE9o D\xE3n Th\u1EDDi Gian (Time Dilation)",
    tree: "FOCUS",
    tier: 3,
    requiredLevel: 12,
    costSkillPoints: 3,
    icon: "\u23F3",
    description: "Nh\u1EADn th\u1EE9c th\u1EDDi gian ch\u1EADm l\u1EA1i, ph\xE1t hi\u1EC7n \u0111i\u1EC3m y\u1EBFu ch\xED t\u1EED c\u1EE7a \u0111\u1ED1i th\u1EE7 (+15% T\u1EF7 l\u1EC7 Ch\xED M\u1EA1ng).",
    passiveBonus: { critChanceBonus: 0.15 }
  },
  // LEARNING TREE
  {
    key: "skill_fast_recall",
    name: "Ph\u1EA3n X\u1EA1 Th\u1EA7n T\u1ED1c (Rapid Recall)",
    tree: "LEARNING",
    tier: 1,
    requiredLevel: 3,
    costSkillPoints: 1,
    icon: "\u26A1",
    description: "\xC1p d\u1EE5ng tri th\u1EE9c ngay t\u1EE9c th\xEC v\xE0o th\u1EF1c ti\u1EC5n (+20% S\xE1t th\u01B0\u01A1ng d\u1EF1a tr\xEAn s\u1ED1 t\u1EEB v\u1EF1ng).",
    passiveBonus: { powerMultiplier: 0.18 }
  },
  {
    key: "skill_memory_shield",
    name: "Khi\xEAn Tri Th\u1EE9c (Memory Shield)",
    tree: "LEARNING",
    tier: 2,
    requiredLevel: 8,
    costSkillPoints: 2,
    icon: "\u{1F4D6}",
    description: "S\u1EF1 hi\u1EC3u bi\u1EBFt s\xE2u s\u1EAFc b\u1EA3o v\u1EC7 tinh th\u1EA7n kh\u1ECFi hoang mang (+200 Sinh l\u1EF1c Max HP).",
    passiveBonus: { hpBonus: 200 }
  },
  {
    key: "skill_omniscience",
    name: "V\u1EA1n V\u1EADt To\xE0n Tri (Omniscience)",
    tree: "LEARNING",
    tier: 3,
    requiredLevel: 15,
    costSkillPoints: 3,
    icon: "\u{1F441}\uFE0F",
    description: "H\u1EA5p th\u1EE5 tinh hoa c\u1EE7a v\u1EA1n v\u1EADt (+25% \u0110i\u1EC3m kinh nghi\u1EC7m XP & Ti\u1EC1n sau m\u1ED7i tr\u1EADn th\u1EAFng).",
    passiveBonus: { xpBonusMultiplier: 0.25, coinsBonusMultiplier: 0.25 }
  },
  // DISCIPLINE TREE
  {
    key: "skill_streak_surge",
    name: "Kh\xED Th\u1EBF B\u1EC1n B\u1EC9 (Streak Surge)",
    tree: "DISCIPLINE",
    tier: 1,
    requiredLevel: 2,
    costSkillPoints: 1,
    icon: "\u{1F525}",
    description: "M\u1ED7i ng\xE0y th\xF3i quen duy tr\xEC li\xEAn t\u1EE5c b\u1ED3i \u0111\u1EAFp th\xEAm n\u1ED9i l\u1EF1c chi\u1EBFn \u0111\u1EA5u ki\xEAn c\u01B0\u1EDDng.",
    passiveBonus: { powerMultiplier: 0.12 }
  },
  {
    key: "skill_unbreakable_will",
    name: "\xDD Ch\xED B\u1EA5t Khu\u1EA5t (Unbreakable Will)",
    tree: "DISCIPLINE",
    tier: 2,
    requiredLevel: 7,
    costSkillPoints: 2,
    icon: "\u26F0\uFE0F",
    description: "V\u1EEFng nh\u01B0 n\xFAi th\xE1i s\u01A1n tr\u01B0\u1EDBc kh\xF3 kh\u0103n ngh\u1ECBch c\u1EA3nh (+25% Ph\xF2ng th\u1EE7 to\xE0n di\u1EC7n).",
    passiveBonus: { defenseMultiplier: 0.25 }
  },
  {
    key: "skill_phoenix_rebirth",
    name: "Tr\u1ED7i D\u1EADy Ph\u01B0\u1EE3ng Ho\xE0ng (Phoenix Rebirth)",
    tree: "DISCIPLINE",
    tier: 3,
    requiredLevel: 14,
    costSkillPoints: 3,
    icon: "\u{1F985}",
    description: "Khi nh\u1EADn \u0111\xF2n ch\xED t\u1EED, tr\u1ED7i d\u1EADy v\u1EDBi 30% HP \u0111\u1EC3 l\u1EADt ng\u01B0\u1EE3c t\xECnh th\u1EBF (1 l\u1EA7n/tr\u1EADn).",
    passiveBonus: { hpBonus: 300 }
  },
  // PRODUCTIVITY TREE
  {
    key: "skill_task_slayer",
    name: "\u0110\u1ED9t Ph\xE1 Nhi\u1EC7m V\u1EE5 (Task Slayer)",
    tree: "PRODUCTIVITY",
    tier: 1,
    requiredLevel: 4,
    costSkillPoints: 1,
    icon: "\u{1F3AF}",
    description: "M\u1ED7i nhi\u1EC7m v\u1EE5 ho\xE0n th\xE0nh trong ng\xE0y gia t\u0103ng 15 \u0111i\u1EC3m s\xE1t th\u01B0\u01A1ng tr\u1EF1c di\u1EC7n.",
    passiveBonus: { powerMultiplier: 0.15 }
  },
  {
    key: "skill_double_strike",
    name: "Song \u0110\xF2n Quy\u1EBFt \u0110\u1ECBnh (Momentum Strike)",
    tree: "PRODUCTIVITY",
    tier: 2,
    requiredLevel: 9,
    costSkillPoints: 2,
    icon: "\u2694\uFE0F",
    description: "\u0110\xE0 l\xE0m vi\u1EC7c d\xE2ng cao t\u1EA1o ra \u0111\xF2n t\u1EA5n c\xF4ng k\xE9p (20% x\xE1c su\u1EA5t \u0111\xE1nh 2 l\u1EA7n/l\u01B0\u1EE3t).",
    passiveBonus: { doubleStrikeChance: 0.2 }
  },
  {
    key: "skill_deadline_master",
    name: "Ch\u1EBF Ng\u1EF1 \xC1p L\u1EF1c (Deadline Mastery)",
    tree: "PRODUCTIVITY",
    tier: 3,
    requiredLevel: 16,
    costSkillPoints: 3,
    icon: "\u{1F3C6}",
    description: "Chuy\xEAn gia gi\u1EA3i quy\u1EBFt kh\u1ED1i l\u01B0\u1EE3ng c\xF4ng vi\u1EC7c kh\u1ED5ng l\u1ED3 (+35% S\xE1t th\u01B0\u01A1ng l\xEAn Boss).",
    passiveBonus: { bossDamageBonus: 0.35 }
  },
  // FINANCE TREE
  {
    key: "skill_gold_magnet",
    name: "H\xFAt V\xE0ng (Gold Magnet)",
    tree: "FINANCE",
    tier: 1,
    requiredLevel: 3,
    costSkillPoints: 1,
    icon: "\u{1FA99}",
    description: "Qu\u1EA3n l\xFD t\xE0i ch\xEDnh ch\u1EB7t ch\u1EBD gi\xFAp b\u1EA1n gi\u1EEF l\u1EA1i nhi\u1EC1u c\u1EE7a c\u1EA3i (+35% Coins r\u01A1i ra).",
    passiveBonus: { coinsBonusMultiplier: 0.35 }
  },
  {
    key: "skill_frugal_craft",
    name: "T\u1ED1i \u01AFu Chi Ph\xED (Resourceful)",
    tree: "FINANCE",
    tier: 2,
    requiredLevel: 8,
    costSkillPoints: 2,
    icon: "\u{1F48E}",
    description: "Bi\u1EBFt c\xE1ch \u0111\u1EA7u t\u01B0 th\xF4ng minh (-25% Chi ph\xED Coins khi n\xE2ng c\u1EA5p trang b\u1ECB).",
    passiveBonus: { discountUpgradePercent: 25 }
  },
  {
    key: "skill_compound_growth",
    name: "L\xE3i K\xE9p S\u1EE9c M\u1EA1nh (Compound Power)",
    tree: "FINANCE",
    tier: 3,
    requiredLevel: 15,
    costSkillPoints: 3,
    icon: "\u{1F4C8}",
    description: "T\xEDch l\u0169y t\xE0i s\u1EA3n sinh s\xF4i t\u1EA1o th\xE0nh h\u1EADu ph\u01B0\u01A1ng v\u1EEFng ch\u1EAFc (+150 HP & +40 Power).",
    passiveBonus: { hpBonus: 150, powerMultiplier: 0.1 }
  }
];
var rpgService = {
  /**
   * Tính toán toàn bộ chỉ số RPG nhân vật dựa 100% trên hoạt động THẬT của người dùng.
   * Zero Math.random(). Zero fake data.
   */
  async calculateRealCharacterStats(userId) {
    const prisma = getPrisma();
    const prog = await progressionService.getOrCreateProgression(userId);
    const [
      completedTasksCount,
      habits,
      focusSessions,
      vocabWordCount,
      studySessionsCount,
      savingGoals,
      equippedItems,
      unlockedSkills
    ] = await Promise.all([
      prisma.task.count({
        where: { userId, status: { in: ["Done", "Ho\xE0n th\xE0nh", "completed", "Completed"] } }
      }),
      prisma.habit.findMany({
        where: { userId },
        select: { streak: true, bestStreak: true, completedDates: true }
      }),
      prisma.focusSession.findMany({
        where: { userId, status: { in: ["Completed", "completed", "Ho\xE0n th\xE0nh"] } },
        select: { actualDuration: true }
      }),
      prisma.vocabWordProgress.count({
        where: { userId, memoryLevel: { gte: 2 } }
      }),
      prisma.studySession.count({
        where: { userId }
      }),
      prisma.savingGoal.findMany({
        where: { userId },
        select: { currentAmount: true, targetAmount: true }
      }),
      prisma.userEquipment.findMany({
        where: { userId, isEquipped: true }
      }),
      prisma.userSkill.findMany({
        where: { userId }
      })
    ]);
    const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    let totalHabitChecks = 0;
    let maxStreak = 0;
    habits.forEach((h) => {
      let dates = [];
      try {
        dates = typeof h.completedDates === "string" ? JSON.parse(h.completedDates) : h.completedDates || [];
      } catch {
        dates = [];
      }
      totalHabitChecks += dates.length;
      const s = Math.max(h.streak || 0, h.bestStreak || 0);
      if (s > maxStreak) maxStreak = s;
    });
    const currentStreak = prog.currentStreak || 0;
    const savingsAchievedCount = savingGoals.filter((s) => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;
    let gearPower = 0;
    let gearDefense = 0;
    let gearHp = 0;
    equippedItems.forEach((item) => {
      const def = EQUIPMENTS_CATALOG[item.itemKey];
      if (def) {
        const lvl = Math.max(1, item.level);
        gearPower += def.basePower + (lvl - 1) * def.powerScalePerLevel;
        gearDefense += def.baseDefense + (lvl - 1) * def.defenseScalePerLevel;
        gearHp += def.baseHp + (lvl - 1) * def.hpScalePerLevel;
      }
    });
    let skillPowerMultiplier = 0;
    let skillDefenseMultiplier = 0;
    let skillHpBonus = 0;
    let critChance = 0.05;
    let xpMultiplier = 1;
    let coinsMultiplier = 1;
    let doubleStrikeChance = 0;
    let bossDamageBonus = 0;
    let discountUpgrade = 0;
    unlockedSkills.forEach((us) => {
      const def = SKILLS_CATALOG.find((s) => s.key === us.skillKey);
      if (def && def.passiveBonus) {
        if (def.passiveBonus.powerMultiplier) skillPowerMultiplier += def.passiveBonus.powerMultiplier;
        if (def.passiveBonus.defenseMultiplier) skillDefenseMultiplier += def.passiveBonus.defenseMultiplier;
        if (def.passiveBonus.hpBonus) skillHpBonus += def.passiveBonus.hpBonus;
        if (def.passiveBonus.critChanceBonus) critChance += def.passiveBonus.critChanceBonus;
        if (def.passiveBonus.xpBonusMultiplier) xpMultiplier += def.passiveBonus.xpBonusMultiplier;
        if (def.passiveBonus.coinsBonusMultiplier) coinsMultiplier += def.passiveBonus.coinsBonusMultiplier;
        if (def.passiveBonus.doubleStrikeChance) doubleStrikeChance += def.passiveBonus.doubleStrikeChance;
        if (def.passiveBonus.bossDamageBonus) bossDamageBonus += def.passiveBonus.bossDamageBonus;
        if (def.passiveBonus.discountUpgradePercent) discountUpgrade += def.passiveBonus.discountUpgradePercent;
      }
    });
    const level = prog.level;
    const maxHp = Math.round(100 + level * 30 + totalFocusMinutes / 4 + currentStreak * 12 + gearHp + skillHpBonus);
    const rawPower = 25 + level * 12 + completedTasksCount * 4 + Math.floor(totalFocusMinutes / 8) + vocabWordCount * 2 + gearPower;
    const finalPower = Math.round(rawPower * (1 + skillPowerMultiplier));
    const rawDefense = 15 + level * 6 + totalHabitChecks * 2 + currentStreak * 4 + gearDefense;
    const finalDefense = Math.round(rawDefense * (1 + skillDefenseMultiplier));
    const focusStat = totalFocusMinutes;
    const knowledgeStat = vocabWordCount + studySessionsCount * 5;
    const disciplineStat = totalHabitChecks + currentStreak * 2;
    const productivityStat = completedTasksCount;
    const wealthStat = savingsAchievedCount * 100;
    const combatPower = Math.round(
      finalPower * 2 + finalDefense * 1.5 + maxHp * 0.4 + focusStat * 0.5 + knowledgeStat * 1 + disciplineStat * 1.5
    );
    const totalEarnedSkillPoints = Math.max(0, level - 1);
    const usedSkillPoints = unlockedSkills.reduce((acc, us) => {
      const def = SKILLS_CATALOG.find((s) => s.key === us.skillKey);
      return acc + (def?.costSkillPoints || 1);
    }, 0);
    const availableSkillPoints = Math.max(0, totalEarnedSkillPoints - usedSkillPoints);
    const statBreakdown = {
      levelContribution: {
        level,
        power: level * 12,
        defense: level * 6,
        hp: level * 30
      },
      tasksContribution: {
        completedTasksCount,
        power: completedTasksCount * 4
      },
      focusContribution: {
        totalFocusMinutes,
        hp: Math.floor(totalFocusMinutes / 4),
        power: Math.floor(totalFocusMinutes / 8)
      },
      habitsContribution: {
        totalHabitChecks,
        currentStreak,
        defense: totalHabitChecks * 2 + currentStreak * 4,
        hp: currentStreak * 12
      },
      learningContribution: {
        vocabWordCount,
        studySessionsCount,
        power: vocabWordCount * 2
      },
      gearContribution: {
        power: gearPower,
        defense: gearDefense,
        hp: gearHp
      },
      skillBonusSummary: {
        powerBonusPercent: Math.round(skillPowerMultiplier * 100),
        defenseBonusPercent: Math.round(skillDefenseMultiplier * 100),
        critChancePercent: Math.round(critChance * 100),
        doubleStrikeChancePercent: Math.round(doubleStrikeChance * 100)
      }
    };
    return {
      userId,
      level,
      totalXp: prog.totalXp,
      coins: prog.coins,
      currentStreak,
      longestStreak: prog.longestStreak,
      combatPower,
      hp: {
        current: maxHp,
        max: maxHp
      },
      stats: {
        power: finalPower,
        defense: finalDefense,
        focus: focusStat,
        knowledge: knowledgeStat,
        discipline: disciplineStat,
        productivity: productivityStat,
        wealth: wealthStat
      },
      multipliers: {
        critChance,
        xpMultiplier,
        coinsMultiplier,
        doubleStrikeChance,
        bossDamageBonus,
        discountUpgrade
      },
      availableSkillPoints,
      statBreakdown,
      equippedGear: {
        weapon: equippedItems.find((i) => i.slot === "WEAPON") || null,
        armor: equippedItems.find((i) => i.slot === "ARMOR") || null,
        accessory: equippedItems.find((i) => i.slot === "ACCESSORY") || null
      },
      unlockedSkillsCount: unlockedSkills.length
    };
  },
  /**
   * Lấy danh sách quái vật, chương, và trạng thái mở khóa của người chơi.
   */
  async getMonstersAndProgress(userId) {
    const prisma = getPrisma();
    const [charStats, userProgressList] = await Promise.all([
      this.calculateRealCharacterStats(userId),
      prisma.monsterProgress.findMany({ where: { userId } })
    ]);
    const progressMap = /* @__PURE__ */ new Map();
    userProgressList.forEach((p) => progressMap.set(p.monsterId, p));
    const monstersWithStatus = MONSTERS_CATALOG.map((m, idx) => {
      const progress = progressMap.get(m.id);
      const isDefeated = (progress?.defeatCount || 0) > 0;
      let isUnlocked = idx === 0;
      if (idx > 0) {
        const prevMonster = MONSTERS_CATALOG[idx - 1];
        const prevProgress = progressMap.get(prevMonster.id);
        const prevDefeated = (prevProgress?.defeatCount || 0) > 0;
        isUnlocked = prevDefeated;
      }
      let meetsRealPrerequisite = false;
      let progressCurrent = 0;
      const progressTarget = m.requiredRealAction.target;
      if (m.requiredRealAction.type === "task") {
        progressCurrent = charStats.stats.productivity;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === "focus") {
        progressCurrent = charStats.stats.focus;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === "habit") {
        progressCurrent = charStats.stats.discipline;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === "learning") {
        progressCurrent = charStats.stats.knowledge;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else {
        progressCurrent = charStats.combatPower;
        meetsRealPrerequisite = charStats.combatPower >= m.requiredPower;
      }
      const meetsPower = charStats.combatPower >= m.requiredPower;
      const canChallenge = isUnlocked && meetsRealPrerequisite && meetsPower;
      return {
        ...m,
        status: isDefeated ? "DEFEATED" : isUnlocked ? "UNLOCKED" : "LOCKED",
        defeatCount: progress?.defeatCount || 0,
        bestTurns: progress?.bestTurns || null,
        meetsRealPrerequisite,
        meetsPower,
        canChallenge,
        realRequirementProgress: {
          current: Math.min(progressTarget, progressCurrent),
          target: progressTarget,
          percent: Math.min(100, Math.round(progressCurrent / progressTarget * 100))
        }
      };
    });
    const chapters = [
      {
        index: 1,
        title: "Khu R\u1EEBng Xao Nh\xE3ng",
        subtitle: "The Forest of Distraction",
        theme: "emerald",
        monsters: monstersWithStatus.filter((m) => m.chapter === 1)
      },
      {
        index: 2,
        title: "Thung L\u0169ng H\u1ED7n Lo\u1EA1n",
        subtitle: "The Valley of Chaos",
        theme: "amber",
        monsters: monstersWithStatus.filter((m) => m.chapter === 2)
      },
      {
        index: 3,
        title: "Th\xE0nh Tr\xEC Ki\u1EC7t S\u1EE9c",
        subtitle: "The Citadel of Burnout",
        theme: "rose",
        monsters: monstersWithStatus.filter((m) => m.chapter === 3)
      },
      {
        index: 4,
        title: "\u0110\u1EC9nh Cao Th\u0103ng Hoa",
        subtitle: "The Summit of Ascension",
        theme: "purple",
        monsters: monstersWithStatus.filter((m) => m.chapter === 4)
      }
    ];
    return {
      characterStats: charStats,
      chapters,
      totalMonsters: MONSTERS_CATALOG.length,
      defeatedMonstersCount: userProgressList.filter((p) => p.defeatCount > 0).length
    };
  },
  /**
   * BATTLE ENGINE: Mô phỏng trận chiến theo lượt trên Server.
   * Backend là SOURCE OF TRUTH. Quyết định thắng bại, tính toán sát thương chuẩn xác,
   * sinh log lượt đấu chi tiết để frontend phát animation mượt mà.
   */
  async simulateBattle(userId, monsterId) {
    const prisma = getPrisma();
    const monster = MONSTERS_CATALOG.find((m) => m.id === monsterId);
    if (!monster) {
      throw new Error(`Qu\xE1i v\u1EADt ${monsterId} kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng.`);
    }
    const charStats = await this.calculateRealCharacterStats(userId);
    const [progressList, userItemKeys] = await Promise.all([
      prisma.monsterProgress.findMany({ where: { userId } }),
      prisma.userEquipment.findMany({ where: { userId }, select: { itemKey: true } })
    ]);
    const progressMap = new Map(progressList.map((p) => [p.monsterId, p]));
    const monsterIdx = MONSTERS_CATALOG.findIndex((m) => m.id === monsterId);
    if (monsterIdx > 0) {
      const prevMonster = MONSTERS_CATALOG[monsterIdx - 1];
      const prevDefeatCount = progressMap.get(prevMonster.id)?.defeatCount || 0;
      if (prevDefeatCount === 0) {
        throw new Error(`B\u1EA1n c\u1EA7n v\u01B0\u1EE3t qua ${prevMonster.name} tr\u01B0\u1EDBc khi m\u1EDF kh\xF3a \u1EA3i n\xE0y!`);
      }
    }
    let meetsPrereq = false;
    if (monster.requiredRealAction.type === "task") {
      meetsPrereq = charStats.stats.productivity >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === "focus") {
      meetsPrereq = charStats.stats.focus >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === "habit") {
      meetsPrereq = charStats.stats.discipline >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === "learning") {
      meetsPrereq = charStats.stats.knowledge >= monster.requiredRealAction.target;
    } else {
      meetsPrereq = charStats.combatPower >= monster.requiredPower;
    }
    if (!meetsPrereq) {
      throw new Error(`Ch\u01B0a \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n r\xE8n luy\u1EC7n ngo\xE0i \u0111\u1EDDi: ${monster.requiredRealAction.description}. H\xE3y ho\xE0n th\xE0nh c\xF4ng vi\u1EC7c th\u1EADt \u0111\u1EC3 gia t\u0103ng s\u1EE9c m\u1EA1nh!`);
    }
    let playerHp = charStats.hp.max;
    let monsterHp = monster.maxHp;
    const playerPower = charStats.stats.power;
    const playerDefense = charStats.stats.defense;
    const { critChance, doubleStrikeChance, bossDamageBonus, xpMultiplier, coinsMultiplier } = charStats.multipliers;
    const turnsLog = [];
    let round = 1;
    const maxRounds = 30;
    let hasUsedPhoenixRebirth = false;
    while (playerHp > 0 && monsterHp > 0 && round <= maxRounds) {
      const isBoss = monster.isBoss;
      let effectivePlayerPower = playerPower;
      if (isBoss && bossDamageBonus > 0) {
        effectivePlayerPower = Math.round(effectivePlayerPower * (1 + bossDamageBonus));
      }
      let damageToMonster = Math.max(10, effectivePlayerPower - Math.round(monster.defense * 0.5));
      const isCrit = Math.random() < critChance;
      if (isCrit) {
        damageToMonster = Math.round(damageToMonster * 1.6);
      }
      monsterHp = Math.max(0, monsterHp - damageToMonster);
      turnsLog.push({
        round,
        actor: "PLAYER",
        action: isCrit ? "CRIT" : "ATTACK",
        damage: damageToMonster,
        actorHpRemaining: playerHp,
        targetHpRemaining: monsterHp,
        message: isCrit ? `\u{1F4A5} \u0110\xF2n ch\xED m\u1EA1ng! B\u1EA1n tung c\xFA \u0111\xE1nh s\u1EA5m s\xE9t g\xE2y ${damageToMonster} s\xE1t th\u01B0\u01A1ng!` : `\u2694\uFE0F B\u1EA1n t\u1EA5n c\xF4ng ch\xEDnh x\xE1c, g\xE2y ${damageToMonster} s\xE1t th\u01B0\u01A1ng l\xEAn ${monster.name}.`
      });
      if (monsterHp > 0 && doubleStrikeChance > 0 && Math.random() < doubleStrikeChance) {
        const doubleDamage = Math.max(8, Math.round(damageToMonster * 0.75));
        monsterHp = Math.max(0, monsterHp - doubleDamage);
        turnsLog.push({
          round,
          actor: "PLAYER",
          action: "DOUBLE_STRIKE",
          damage: doubleDamage,
          actorHpRemaining: playerHp,
          targetHpRemaining: monsterHp,
          message: `\u26A1 Song \u0111\xF2n quy\u1EBFt \u0111\u1ECBnh! B\u1EA1n ti\u1EBFp t\u1EE5c b\u1ED3i th\xEAm ${doubleDamage} s\xE1t th\u01B0\u01A1ng!`
        });
      }
      if (monsterHp <= 0) {
        break;
      }
      const damageToPlayer = Math.max(8, monster.power - Math.round(playerDefense * 0.6));
      playerHp = playerHp - damageToPlayer;
      if (playerHp <= 0 && !hasUsedPhoenixRebirth) {
        hasUsedPhoenixRebirth = true;
        playerHp = Math.round(charStats.hp.max * 0.3);
        turnsLog.push({
          round,
          actor: "PLAYER",
          action: "PHOENIX_REBIRTH",
          damage: 0,
          actorHpRemaining: playerHp,
          targetHpRemaining: monsterHp,
          message: `\u{1F985} Tr\u1ED7i d\u1EADy ph\u01B0\u1EE3ng ho\xE0ng! \xDD ch\xED qu\u1EADt c\u01B0\u1EDDng h\u1ED3i sinh b\u1EA1n v\u1EDBi ${playerHp} HP!`
        });
      } else {
        playerHp = Math.max(0, playerHp);
        turnsLog.push({
          round,
          actor: "MONSTER",
          action: "ATTACK",
          damage: damageToPlayer,
          actorHpRemaining: monsterHp,
          targetHpRemaining: playerHp,
          message: `\u{1F525} ${monster.name} ph\u1EA3n c\xF4ng quy\u1EBFt li\u1EC7t, g\xE2y ${damageToPlayer} s\xE1t th\u01B0\u01A1ng!`
        });
      }
      round++;
    }
    const isWon = monsterHp <= 0 && playerHp > 0;
    let rewardXp = 0;
    let rewardCoins = 0;
    let droppedEquipment = null;
    if (isWon) {
      rewardXp = Math.round(monster.rewardXp * xpMultiplier);
      rewardCoins = Math.round(monster.rewardCoins * coinsMultiplier);
      const battleRecordId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await Promise.all([
        progressionService.awardXp(userId, {
          amount: rewardXp,
          category: "task",
          source: "monster_battle",
          sourceId: `${battleRecordId}_xp`,
          description: `H\u1EA1 g\u1EE5c ${monster.name} (${monster.title})`
        }),
        progressionService.addCoins(
          userId,
          rewardCoins,
          "monster_loot",
          `${battleRecordId}_coins`,
          `Chi\u1EBFn l\u1EE3i ph\u1EA9m: ${monster.name}`
        )
      ]);
      const ownedKeys = new Set(userItemKeys.map((k) => k.itemKey));
      if (monster.dropEquipmentKey) {
        const dropDef = EQUIPMENTS_CATALOG[monster.dropEquipmentKey];
        if (dropDef) {
          const isFirstClear = !progressMap.has(monster.id) || progressMap.get(monster.id)?.defeatCount === 0;
          const roll = Math.random() * 100;
          if (isFirstClear || roll <= monster.dropRatePercent) {
            if (!ownedKeys.has(dropDef.key)) {
              const newEquip = await prisma.userEquipment.create({
                data: {
                  userId,
                  itemKey: dropDef.key,
                  name: dropDef.name,
                  slot: dropDef.slot,
                  rarity: dropDef.rarity,
                  powerBonus: dropDef.basePower,
                  defenseBonus: dropDef.baseDefense,
                  hpBonus: dropDef.baseHp,
                  specialEffect: dropDef.specialEffectDescription,
                  level: 1,
                  isEquipped: false,
                  acquiredFrom: `H\u1EA1 g\u1EE5c ${monster.name}`
                }
              });
              droppedEquipment = { ...dropDef, id: newEquip.id, isNew: true };
            } else {
              await progressionService.addCoins(
                userId,
                50,
                "loot_recycle",
                `${battleRecordId}_salvage`,
                `Nguy\xEAn li\u1EC7u ch\u1EBF t\u1EA1o: ${dropDef.name}`
              );
              droppedEquipment = { ...dropDef, isNew: false, salvageCoins: 50 };
            }
          }
        }
      }
      const existingProg = progressMap.get(monster.id);
      const newDefeatCount = (existingProg?.defeatCount || 0) + 1;
      const bestTurns = existingProg?.bestTurns ? Math.min(existingProg.bestTurns, round) : round;
      await prisma.monsterProgress.upsert({
        where: { userId_monsterId: { userId, monsterId } },
        create: {
          userId,
          monsterId,
          status: "DEFEATED",
          defeatCount: 1,
          firstDefeatedAt: /* @__PURE__ */ new Date(),
          lastDefeatedAt: /* @__PURE__ */ new Date(),
          bestTurns: round
        },
        update: {
          status: "DEFEATED",
          defeatCount: newDefeatCount,
          lastDefeatedAt: /* @__PURE__ */ new Date(),
          bestTurns
        }
      });
    }
    const battleRecord = await prisma.battleRecord.create({
      data: {
        userId,
        monsterId: monster.id,
        monsterName: monster.name,
        chapter: monster.chapter,
        won: isWon,
        playerPower: charStats.stats.power,
        playerHpRemaining: playerHp,
        monsterHpRemaining: monsterHp,
        rewardXp: isWon ? rewardXp : 0,
        rewardCoins: isWon ? rewardCoins : 0,
        rewardEquipment: droppedEquipment ? JSON.stringify(droppedEquipment) : null,
        turnsLog: JSON.stringify(turnsLog)
      }
    });
    return {
      battleId: battleRecord.id,
      won: isWon,
      rounds: round,
      monster: {
        id: monster.id,
        name: monster.name,
        title: monster.title,
        avatar: monster.avatar,
        maxHp: monster.maxHp,
        isBoss: monster.isBoss
      },
      playerHpRemaining: playerHp,
      monsterHpRemaining: monsterHp,
      rewardXp,
      rewardCoins,
      droppedEquipment,
      turnsLog,
      trainingHint: !isWon ? `\u{1F4A1} G\u1EE2I \xDD HU\u1EA4N LUY\u1EC6N: \u0110\u1ED1i th\u1EE7 n\xE0y \u0111\xF2i h\u1ECFi s\u1EE9c ch\u1ECBu \u0111\u1EF1ng cao h\u01A1n. H\xE3y ho\xE0n th\xE0nh th\xEAm 1 phi\xEAn Focus ho\u1EB7c 2 Nhi\u1EC7m v\u1EE5 h\xF4m nay \u0111\u1EC3 t\u0103ng HP v\xE0 Gi\xE1p tr\u1EE5!` : null
    };
  },
  /**
   * Lấy danh sách toàn bộ trang bị cá nhân (Inventory).
   */
  async getUserEquipments(userId) {
    const prisma = getPrisma();
    const userItems = await prisma.userEquipment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    const prog = await progressionService.getOrCreateProgression(userId);
    const inventory = userItems.map((item) => {
      const def = EQUIPMENTS_CATALOG[item.itemKey];
      const lvl = Math.max(1, item.level);
      const currentPower = def ? def.basePower + (lvl - 1) * def.powerScalePerLevel : item.powerBonus;
      const currentDefense = def ? def.baseDefense + (lvl - 1) * def.defenseScalePerLevel : item.defenseBonus;
      const currentHp = def ? def.baseHp + (lvl - 1) * def.hpScalePerLevel : item.hpBonus;
      const upgradeCost = def ? Math.round(def.baseUpgradeCost * Math.pow(lvl, 1.4)) : 100;
      const canUpgrade = prog.coins >= upgradeCost && lvl < 10;
      return {
        id: item.id,
        itemKey: item.itemKey,
        name: item.name,
        title: def?.title || item.name,
        slot: item.slot,
        rarity: item.rarity,
        level: lvl,
        maxLevel: 10,
        isEquipped: item.isEquipped,
        stats: {
          power: currentPower,
          defense: currentDefense,
          hp: currentHp
        },
        upgradeCost,
        canUpgrade,
        icon: def?.icon || "\u{1F5E1}\uFE0F",
        lore: def?.lore || "",
        specialEffect: def?.specialEffectDescription || item.specialEffect,
        acquiredFrom: item.acquiredFrom
      };
    });
    return {
      inventory,
      equipped: {
        weapon: inventory.find((i) => i.slot === "WEAPON" && i.isEquipped) || null,
        armor: inventory.find((i) => i.slot === "ARMOR" && i.isEquipped) || null,
        accessory: inventory.find((i) => i.slot === "ACCESSORY" && i.isEquipped) || null
      },
      coins: prog.coins
    };
  },
  /**
   * Trang bị vật phẩm (Equip item).
   */
  async equipItem(userId, equipmentId) {
    const prisma = getPrisma();
    const targetItem = await prisma.userEquipment.findUnique({
      where: { id: equipmentId }
    });
    if (!targetItem || targetItem.userId !== userId) {
      throw new Error("V\u1EADt ph\u1EA9m kh\xF4ng t\u1ED3n t\u1EA1i trong kho \u0111\u1ED3 c\u1EE7a b\u1EA1n.");
    }
    await prisma.userEquipment.updateMany({
      where: { userId, slot: targetItem.slot },
      data: { isEquipped: false }
    });
    const updated = await prisma.userEquipment.update({
      where: { id: equipmentId },
      data: { isEquipped: true }
    });
    const updateProgData = {};
    if (targetItem.slot === "WEAPON") updateProgData.equippedWeaponKey = targetItem.itemKey;
    if (targetItem.slot === "ARMOR") updateProgData.equippedArmorKey = targetItem.itemKey;
    if (targetItem.slot === "ACCESSORY") updateProgData.equippedAccessoryKey = targetItem.itemKey;
    await prisma.userProgression.update({
      where: { userId },
      data: updateProgData
    });
    return updated;
  },
  /**
   * Nâng cấp trang bị bằng Coins (Upgrade item).
   */
  async upgradeEquipment(userId, equipmentId) {
    const prisma = getPrisma();
    const item = await prisma.userEquipment.findUnique({
      where: { id: equipmentId }
    });
    if (!item || item.userId !== userId) {
      throw new Error("V\u1EADt ph\u1EA9m kh\xF4ng t\u1ED3n t\u1EA1i.");
    }
    if (item.level >= 10) {
      throw new Error("Trang b\u1ECB n\xE0y \u0111\xE3 \u0111\u1EA1t c\u1EA5p t\u1ED1i \u0111a (Level 10 Mastered)!");
    }
    const def = EQUIPMENTS_CATALOG[item.itemKey];
    const lvl = item.level;
    const baseUpgradeCost = def ? Math.round(def.baseUpgradeCost * Math.pow(lvl, 1.4)) : 100;
    const charStats = await this.calculateRealCharacterStats(userId);
    const discount = charStats.multipliers.discountUpgrade || 0;
    const finalUpgradeCost = Math.round(baseUpgradeCost * (1 - discount / 100));
    const prog = await progressionService.getOrCreateProgression(userId);
    if (prog.coins < finalUpgradeCost) {
      throw new Error(`B\u1EA1n c\u1EA7n ${finalUpgradeCost} \u{1FA99} \u0111\u1EC3 n\xE2ng c\u1EA5p (Hi\u1EC7n c\xF3: ${prog.coins} \u{1FA99}). H\xE3y ho\xE0n th\xE0nh c\xE1c nhi\u1EC7m v\u1EE5 v\xE0 \u0111\xE1nh qu\xE1i \u0111\u1EC3 ki\u1EBFm th\xEAm Coins!`);
    }
    await prisma.$transaction([
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: -finalUpgradeCost,
          type: "spend",
          source: "equipment_upgrade",
          sourceId: equipmentId,
          description: `N\xE2ng c\u1EA5p ${item.name} l\xEAn c\u1EA5p ${lvl + 1}`
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: { coins: prog.coins - finalUpgradeCost }
      }),
      prisma.userEquipment.update({
        where: { id: equipmentId },
        data: {
          level: lvl + 1,
          powerBonus: def ? def.basePower + lvl * def.powerScalePerLevel : item.powerBonus + 5,
          defenseBonus: def ? def.baseDefense + lvl * def.defenseScalePerLevel : item.defenseBonus + 3,
          hpBonus: def ? def.baseHp + lvl * def.hpScalePerLevel : item.hpBonus + 10
        }
      })
    ]);
    return {
      success: true,
      newLevel: lvl + 1,
      coinsSpent: finalUpgradeCost,
      newBalance: prog.coins - finalUpgradeCost
    };
  },
  /**
   * Lấy danh sách 5 Cây Kỹ Năng và trạng thái mở khóa.
   */
  async getSkillTrees(userId) {
    const prisma = getPrisma();
    const [charStats, userSkills] = await Promise.all([
      this.calculateRealCharacterStats(userId),
      prisma.userSkill.findMany({ where: { userId } })
    ]);
    const unlockedSet = new Set(userSkills.map((s) => s.skillKey));
    const trees = [
      {
        id: "FOCUS",
        name: "Nh\xE1nh T\u1EADp Trung (Focus Tree)",
        description: "T\u0103ng c\u01B0\u1EDDng s\u1EE9c m\u1EA1nh t\u1EA5n c\xF4ng v\xE0 t\u1EF7 l\u1EC7 ch\xED m\u1EA1ng t\u1EEB th\u1EDDi l\u01B0\u1EE3ng l\xE0m vi\u1EC7c s\xE2u.",
        icon: "\u{1F9E0}",
        skills: SKILLS_CATALOG.filter((s) => s.tree === "FOCUS").map((s) => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: "LEARNING",
        name: "Nh\xE1nh Tri Th\u1EE9c (Learning Tree)",
        description: "Chuy\u1EC3n h\xF3a t\u1EEB v\u1EF1ng v\xE0 b\xE0i h\u1ECDc th\xE0nh l\xE1 ch\u1EAFn b\u1EA3o v\u1EC7 v\xE0 \u0111i\u1EC3m kinh nghi\u1EC7m.",
        icon: "\u{1F4D6}",
        skills: SKILLS_CATALOG.filter((s) => s.tree === "LEARNING").map((s) => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: "DISCIPLINE",
        name: "Nh\xE1nh K\u1EF7 Lu\u1EADt (Discipline Tree)",
        description: "Gia t\u0103ng gi\xE1p tr\u1EE5 v\xE0 kh\u1EA3 n\u0103ng ph\u1EE5c h\u1ED3i th\u1EA7n k\u1EF3 t\u1EEB c\xE1c chu\u1ED7i ng\xE0y streak.",
        icon: "\u{1F525}",
        skills: SKILLS_CATALOG.filter((s) => s.tree === "DISCIPLINE").map((s) => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: "PRODUCTIVITY",
        name: "Nh\xE1nh N\u0103ng Su\u1EA5t (Productivity Tree)",
        description: "T\u1EA1o \u0111\xE0 ti\u1EBFn c\xF4ng d\u0169ng m\xE3nh v\xE0 s\xE1t th\u01B0\u01A1ng v\u01B0\u1EE3t tr\u1ED9i t\u1EEB c\xE1c vi\u1EC7c \u0111\xE3 xong.",
        icon: "\u{1F3AF}",
        skills: SKILLS_CATALOG.filter((s) => s.tree === "PRODUCTIVITY").map((s) => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: "FINANCE",
        name: "Nh\xE1nh T\xE0i Ch\xEDnh (Finance Tree)",
        description: "T\xEDch l\u0169y c\u1EE7a c\u1EA3i, t\u1ED1i \u01B0u h\xF3a nguy\xEAn li\u1EC7u v\xE0 gia t\u0103ng ti\u1EC1n th\u01B0\u1EDFng Coins.",
        icon: "\u{1FA99}",
        skills: SKILLS_CATALOG.filter((s) => s.tree === "FINANCE").map((s) => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      }
    ];
    return {
      trees,
      availableSkillPoints: charStats.availableSkillPoints,
      unlockedSkillsCount: userSkills.length
    };
  },
  /**
   * Mở khóa kỹ năng mới bằng Điểm Kỹ Năng (Skill Point).
   */
  async unlockSkill(userId, skillKey) {
    const prisma = getPrisma();
    const skillDef = SKILLS_CATALOG.find((s) => s.key === skillKey);
    if (!skillDef) {
      throw new Error(`K\u1EF9 n\u0103ng ${skillKey} kh\xF4ng h\u1EE3p l\u1EC7.`);
    }
    const charStats = await this.calculateRealCharacterStats(userId);
    if (charStats.level < skillDef.requiredLevel) {
      throw new Error(`Y\xEAu c\u1EA7u c\u1EA5p \u0111\u1ED9 Level ${skillDef.requiredLevel} \u0111\u1EC3 m\u1EDF kh\xF3a k\u1EF9 n\u0103ng n\xE0y.`);
    }
    if (charStats.availableSkillPoints < skillDef.costSkillPoints) {
      throw new Error(`B\u1EA1n c\u1EA7n ${skillDef.costSkillPoints} \u0110i\u1EC3m K\u1EF9 N\u0103ng (Hi\u1EC7n c\xF3: ${charStats.availableSkillPoints}). H\xE3y Level Up \u0111\u1EC3 nh\u1EADn th\xEAm \u0111i\u1EC3m!`);
    }
    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillKey: { userId, skillKey } }
    });
    if (existing) {
      throw new Error("B\u1EA1n \u0111\xE3 m\u1EDF kh\xF3a k\u1EF9 n\u0103ng n\xE0y r\u1ED3i.");
    }
    const created = await prisma.userSkill.create({
      data: {
        userId,
        skillKey,
        tree: skillDef.tree,
        tier: skillDef.tier,
        level: 1
      }
    });
    return {
      success: true,
      skill: skillDef,
      remainingSkillPoints: charStats.availableSkillPoints - skillDef.costSkillPoints
    };
  },
  /**
   * Khởi tạo Starter Kit RPG cho người chơi mới (Tặng trang bị khởi đầu).
   */
  async ensureStarterKit(userId) {
    const prisma = getPrisma();
    const existingWeapons = await prisma.userEquipment.count({ where: { userId } });
    if (existingWeapons === 0) {
      const starterBlade = EQUIPMENTS_CATALOG["wpn_focus_blade"];
      await prisma.userEquipment.create({
        data: {
          userId,
          itemKey: starterBlade.key,
          name: starterBlade.name,
          slot: starterBlade.slot,
          rarity: starterBlade.rarity,
          powerBonus: starterBlade.basePower,
          defenseBonus: starterBlade.baseDefense,
          hpBonus: starterBlade.baseHp,
          specialEffect: starterBlade.specialEffectDescription,
          level: 1,
          isEquipped: true,
          acquiredFrom: "Qu\xE0 t\u1EB7ng t\xE2n th\u1EE7 kh\u1EDFi h\xE0nh"
        }
      });
    }
  }
};

// src/backend/routes/r2.routes.ts
import { Router as Router3 } from "express";
init_r2_service();

// src/backend/security/fileSecurity.ts
import crypto2 from "crypto";
import path from "path";
var MAGIC_NUMBERS = {
  png: {
    bytes: [137, 80, 78, 71, 13, 10, 26, 10],
    ext: "png",
    mime: "image/png"
  },
  jpeg: {
    bytes: [255, 216, 255],
    ext: "jpg",
    mime: "image/jpeg"
  },
  gif: {
    bytes: [71, 73, 70, 56],
    ext: "gif",
    mime: "image/gif"
  },
  pdf: {
    bytes: [37, 80, 68, 70],
    ext: "pdf",
    mime: "application/pdf"
  },
  webp: {
    bytes: [82, 73, 70, 70],
    // Starts with "RIFF", byte 8-11 is "WEBP"
    ext: "webp",
    mime: "image/webp"
  },
  zip: {
    bytes: [80, 75, 3, 4],
    ext: "zip",
    mime: "application/zip"
  }
};
function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }
  if (buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80) {
    return { mime: "image/webp", ext: "webp" };
  }
  for (const [key, sig] of Object.entries(MAGIC_NUMBERS)) {
    if (key === "webp") continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }
  return null;
}
function sanitizeFileName(rawFileName, fallbackExt = "bin") {
  const baseName = path.basename(rawFileName).replace(/\0/g, "");
  const parsedExt = path.extname(baseName).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || fallbackExt;
  const titleWithoutExt = path.basename(baseName, path.extname(baseName)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  const randomHash = crypto2.randomBytes(6).toString("hex");
  return `${titleWithoutExt || "file"}_${randomHash}.${parsedExt}`;
}
function validateUploadedBuffer(buffer, declaredFileName, declaredMimeType, maxSizeBytes = 10 * 1024 * 1024) {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      detectedMime: "",
      detectedExt: "",
      safeFileName: "",
      error: "T\u1EADp tin r\u1ED7ng ho\u1EB7c kh\xF4ng c\xF3 d\u1EEF li\u1EC7u nh\u1ECB ph\xE2n."
    };
  }
  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      detectedMime: "",
      detectedExt: "",
      safeFileName: "",
      error: `Dung l\u01B0\u1EE3ng t\u1EADp tin v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n cho ph\xE9p (${Math.round(maxSizeBytes / (1024 * 1024))}MB).`
    };
  }
  const detected = detectMimeFromBuffer(buffer);
  if (!detected) {
    const sampleStr = buffer.slice(0, 1024).toString("utf-8").toLowerCase();
    if (sampleStr.includes("<svg")) {
      if (sampleStr.includes("<script") || sampleStr.includes("onload=") || sampleStr.includes("onerror=") || sampleStr.includes("javascript:")) {
        return {
          valid: false,
          detectedMime: "image/svg+xml",
          detectedExt: "svg",
          safeFileName: "",
          error: "T\u1EADp tin SVG b\u1ECB t\u1EEB ch\u1ED1i do ch\u1EE9a m\xE3 k\u1ECBch b\u1EA3n th\u1EF1c thi \u0111\u1ED9c h\u1EA1i (XSS)."
        };
      }
      return {
        valid: true,
        detectedMime: "image/svg+xml",
        detectedExt: "svg",
        safeFileName: sanitizeFileName(declaredFileName, "svg")
      };
    }
    return {
      valid: false,
      detectedMime: "application/octet-stream",
      detectedExt: "bin",
      safeFileName: "",
      error: "\u0110\u1ECBnh d\u1EA1ng t\u1EADp tin kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 ho\u1EB7c ch\u1EEF k\xFD nh\u1ECB ph\xE2n kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  const normalizedDeclared = declaredMimeType.toLowerCase().trim();
  const declaredFamily = normalizedDeclared.split("/")[0];
  const detectedFamily = detected.mime.split("/")[0];
  if (declaredFamily === "image" && detectedFamily !== "image") {
    return {
      valid: false,
      detectedMime: detected.mime,
      detectedExt: detected.ext,
      safeFileName: "",
      error: `T\u1EADp tin ng\u1EE5y trang: MIME khai b\xE1o l\xE0 \u1EA3nh (${declaredMimeType}) nh\u01B0ng \u0111\u1ECBnh d\u1EA1ng th\u1EF1c t\u1EBF l\xE0 ${detected.mime}.`
    };
  }
  const safeFileName = sanitizeFileName(declaredFileName, detected.ext);
  return {
    valid: true,
    detectedMime: detected.mime,
    detectedExt: detected.ext,
    safeFileName
  };
}

// src/backend/routes/r2.routes.ts
var r2Router = Router3();
function checkIsAdmin(user) {
  const role = (user?.role || "").toUpperCase();
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERADMIN";
}
r2Router.get("/status", requireAuth, async (req, res) => {
  try {
    const status = r2Service.getStatus();
    let testResult = null;
    if (status.configured) {
      testResult = await r2Service.testConnection();
    }
    res.json({
      success: true,
      status,
      testResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
r2Router.post("/presigned-url", requireAuth, uploadRateLimiter, async (req, res) => {
  const { fileName, mimeType, folder } = req.body;
  if (!fileName) {
    res.status(400).json({ success: false, message: "T\xEAn file (fileName) l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  try {
    const result = await r2Service.getPresignedUploadUrl(
      String(fileName),
      mimeType || "application/octet-stream",
      userId,
      folder || "uploads"
    );
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
r2Router.post("/upload-base64", requireAuth, uploadRateLimiter, async (req, res) => {
  const { base64Data, fileName, mimeType, folder } = req.body;
  if (!base64Data || !fileName) {
    res.status(400).json({ success: false, message: "base64Data v\xE0 fileName l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const validation = validateUploadedBuffer(buffer, String(fileName), mimeType || "image/png");
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: "FILE_SECURITY_REJECTED", message: validation.error },
        message: validation.error
      });
    }
    const result = await r2Service.uploadFile(
      buffer,
      validation.safeFileName,
      validation.detectedMime,
      userId,
      folder || "uploads"
    );
    res.json({
      success: true,
      message: "T\u1EA3i t\u1EADp tin l\xEAn Cloudflare R2 th\xE0nh c\xF4ng!",
      file: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
r2Router.get("/files", requireAuth, async (req, res) => {
  const prefix = req.query.prefix || "";
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  const isAdmin = checkIsAdmin(req.user);
  try {
    const files = await r2Service.listFiles(userId, isAdmin, prefix);
    res.json({
      success: true,
      files
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
r2Router.get("/metadata", requireAuth, async (req, res) => {
  const key = req.query.key || req.body?.key;
  if (!key) {
    res.status(400).json({ success: false, message: "Kh\xF3a t\u1EADp tin (key) l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  const isAdmin = checkIsAdmin(req.user);
  try {
    const meta = await r2Service.getObjectMetadata(key, userId, isAdmin);
    res.json({
      success: true,
      metadata: meta
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});
r2Router.get("/download", requireAuth, async (req, res) => {
  const key = req.query.key || req.body?.key;
  if (!key) {
    res.status(400).json({ success: false, message: "Kh\xF3a t\u1EADp tin (key) l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  const isAdmin = checkIsAdmin(req.user);
  try {
    const result = await r2Service.getPresignedDownloadUrl(key, userId, isAdmin);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});
r2Router.delete("/file", requireAuth, async (req, res) => {
  const key = req.body.key || req.query.key;
  if (!key) {
    res.status(400).json({ success: false, message: "Kh\xF3a t\u1EADp tin (key) l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  const isAdmin = checkIsAdmin(req.user);
  try {
    await r2Service.deleteFile(key, userId, isAdmin);
    res.json({
      success: true,
      message: `\u0110\xE3 x\xF3a t\u1EADp tin "${key}" kh\u1ECFi Cloudflare R2.`
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// src/backend/routes/customModules.routes.ts
import { Router as Router4 } from "express";
init_db();
var customModulesRouter = Router4();
function checkIsAdmin2(user) {
  const role = (user?.role || "").toUpperCase();
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERADMIN";
}
customModulesRouter.get("/", requireAuth, async (req, res) => {
  const prisma = getPrisma();
  const isAdmin = checkIsAdmin2(req.user);
  try {
    const modules = await prisma.customModule.findMany({
      where: isAdmin ? {} : { status: "ACTIVE" },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" }
    });
    res.json({
      success: true,
      modules
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.post("/", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  const { name, slug, description, icon, fields, isPublic, status } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, message: "T\xEAn module kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
    return;
  }
  const cleanSlug = (slug || name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").substring(0, 40);
  try {
    const existing = await prisma.customModule.findUnique({
      where: { slug: cleanSlug }
    });
    if (existing) {
      res.status(400).json({ success: false, message: `M\xE3 \u0111\u1ECBnh danh slug '${cleanSlug}' \u0111\xE3 t\u1ED3n t\u1EA1i.` });
      return;
    }
    const createdModule = await prisma.customModule.create({
      data: {
        name: String(name).trim(),
        slug: cleanSlug,
        description: description ? String(description).trim() : null,
        icon: icon || "Layers",
        status: status || "ACTIVE",
        isPublic: Boolean(isPublic),
        fields: {
          create: (Array.isArray(fields) ? fields : []).map((f, idx) => ({
            name: String(f.name || `Tr\u01B0\u1EDDng ${idx + 1}`).trim(),
            key: String(f.key || `field_${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            type: f.type || "text",
            required: Boolean(f.required),
            defaultValue: f.defaultValue ? String(f.defaultValue) : null,
            options: typeof f.options === "string" ? f.options : JSON.stringify(f.options || []),
            sortOrder: typeof f.sortOrder === "number" ? f.sortOrder : idx
          }))
        }
      },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_CREATE_CUSTOM_MODULE",
      "custom_modules",
      createdModule.id,
      null,
      { name: createdModule.name, slug: createdModule.slug, fieldsCount: createdModule.fields.length }
    );
    res.json({
      success: true,
      message: `\u0110\xE3 kh\u1EDFi t\u1EA1o module "${createdModule.name}" th\xE0nh c\xF4ng!`,
      module: createdModule
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.put("/:id", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  const moduleId = req.params.id;
  const { name, description, icon, status, isPublic, fields } = req.body;
  try {
    const existing = await prisma.customModule.findUnique({
      where: { id: moduleId },
      include: { fields: true }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y module n\xE0y." });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const mod = await tx.customModule.update({
        where: { id: moduleId },
        data: {
          ...name && { name: String(name).trim() },
          ...description !== void 0 && { description: String(description).trim() },
          ...icon && { icon: String(icon) },
          ...status && { status: String(status) },
          ...isPublic !== void 0 && { isPublic: Boolean(isPublic) }
        }
      });
      if (Array.isArray(fields)) {
        await tx.customModuleField.deleteMany({
          where: { moduleId }
        });
        await tx.customModuleField.createMany({
          data: fields.map((f, idx) => ({
            moduleId,
            name: String(f.name || `Tr\u01B0\u1EDDng ${idx + 1}`).trim(),
            key: String(f.key || `field_${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            type: f.type || "text",
            required: Boolean(f.required),
            defaultValue: f.defaultValue ? String(f.defaultValue) : null,
            options: typeof f.options === "string" ? f.options : JSON.stringify(f.options || []),
            sortOrder: typeof f.sortOrder === "number" ? f.sortOrder : idx
          }))
        });
      }
      return await tx.customModule.findUnique({
        where: { id: moduleId },
        include: { fields: { orderBy: { sortOrder: "asc" } } }
      });
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_UPDATE_CUSTOM_MODULE",
      "custom_modules",
      moduleId,
      existing,
      updated
    );
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt module th\xE0nh c\xF4ng!",
      module: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const adminId = req.userId;
  const moduleId = req.params.id;
  try {
    const existing = await prisma.customModule.findUnique({
      where: { id: moduleId }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y module n\xE0y." });
      return;
    }
    await prisma.customModule.delete({
      where: { id: moduleId }
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_DELETE_CUSTOM_MODULE",
      "custom_modules",
      moduleId,
      existing,
      null
    );
    res.json({
      success: true,
      message: `\u0110\xE3 x\xF3a module "${existing.name}" c\xF9ng to\xE0n b\u1ED9 d\u1EEF li\u1EC7u li\xEAn quan.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.get("/:slug/records", requireAuth, async (req, res) => {
  const prisma = getPrisma();
  const { slug } = req.params;
  const userId = req.userId;
  const isAdmin = checkIsAdmin2(req.user);
  const search = req.query.search || "";
  try {
    const moduleItem = await prisma.customModule.findUnique({
      where: { slug },
      include: {
        fields: { orderBy: { sortOrder: "asc" } }
      }
    });
    if (!moduleItem) {
      res.status(404).json({ success: false, message: `Kh\xF4ng t\xECm th\u1EA5y module v\u1EDBi m\xE3 '${slug}'.` });
      return;
    }
    const records = await prisma.customModuleRecord.findMany({
      where: {
        moduleId: moduleItem.id,
        ...isAdmin ? {} : { userId }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      success: true,
      module: moduleItem,
      records
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.post("/:slug/records", requireAuth, requireActiveSubscription, async (req, res) => {
  const prisma = getPrisma();
  const { slug } = req.params;
  const userId = req.userId;
  const rawData = req.body.data || req.body;
  try {
    const moduleItem = await prisma.customModule.findUnique({
      where: { slug },
      include: { fields: true }
    });
    if (!moduleItem) {
      res.status(404).json({ success: false, message: `Kh\xF4ng t\xECm th\u1EA5y module '${slug}'.` });
      return;
    }
    for (const field of moduleItem.fields) {
      if (field.required && (rawData[field.key] === void 0 || rawData[field.key] === null || rawData[field.key] === "")) {
        res.status(400).json({
          success: false,
          message: `Tr\u01B0\u1EDDng b\u1EAFt bu\u1ED9c "${field.name}" kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.`
        });
        return;
      }
    }
    const createdRecord = await prisma.customModuleRecord.create({
      data: {
        moduleId: moduleItem.id,
        userId,
        data: rawData
      }
    });
    res.json({
      success: true,
      message: "Th\xEAm b\u1EA3n ghi m\u1EDBi th\xE0nh c\xF4ng!",
      record: createdRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.put("/:slug/records/:id", requireAuth, requireActiveSubscription, async (req, res) => {
  const prisma = getPrisma();
  const { slug, id } = req.params;
  const userId = req.userId;
  const isAdmin = checkIsAdmin2(req.user);
  const rawData = req.body.data || req.body;
  try {
    const existing = await prisma.customModuleRecord.findUnique({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi n\xE0y." });
      return;
    }
    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({ success: false, message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n s\u1EEDa b\u1EA3n ghi n\xE0y." });
      return;
    }
    const currentData = typeof existing.data === "object" && existing.data !== null ? existing.data : {};
    const mergedData = { ...currentData, ...rawData };
    const updated = await prisma.customModuleRecord.update({
      where: { id },
      data: {
        data: mergedData
      }
    });
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt b\u1EA3n ghi th\xE0nh c\xF4ng!",
      record: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
customModulesRouter.delete("/:slug/records/:id", requireAuth, requireActiveSubscription, async (req, res) => {
  const prisma = getPrisma();
  const { id } = req.params;
  const userId = req.userId;
  const isAdmin = checkIsAdmin2(req.user);
  try {
    const existing = await prisma.customModuleRecord.findUnique({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi n\xE0y." });
      return;
    }
    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({ success: false, message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a b\u1EA3n ghi n\xE0y." });
      return;
    }
    await prisma.customModuleRecord.delete({
      where: { id }
    });
    res.json({
      success: true,
      message: "\u0110\xE3 x\xF3a b\u1EA3n ghi th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// src/backend/routes/vocab.routes.ts
import { Router as Router5 } from "express";

// src/backend/services/vocab.service.ts
init_db();
var VocabService = class {
  /**
   * Determine Memory Level (0 to 5) based on repetition count, interval, and lapses
   */
  computeMemoryLevel(repetitionCount, intervalDays, lapses) {
    if (repetitionCount === 0) return 0;
    if (repetitionCount === 1) return 1;
    if (repetitionCount === 2 || lapses > 2) return 2;
    if (intervalDays >= 30 && repetitionCount >= 5) return 5;
    if (intervalDays >= 14 && repetitionCount >= 4) return 4;
    if (repetitionCount >= 3) return 3;
    return 2;
  }
  /**
   * Record a review outcome into PostgreSQL with atomic updates to WordProgress & ReviewLog
   */
  async recordReview(userId, input) {
    const prisma = getPrisma();
    const languageId = input.languageId || "en";
    const now = /* @__PURE__ */ new Date();
    const isCorrect = input.isCorrect !== void 0 ? input.isCorrect : input.rating >= 3;
    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM vocab_word_progress 
       WHERE "userId" = $1 AND "languageId" = $2 AND "wordId" = $3 LIMIT 1`,
      userId,
      languageId,
      input.wordId
    );
    let progress = existing[0] || null;
    let repCount = progress?.repetitionCount || 0;
    let easeFactor = progress?.easeFactor || 2.5;
    let intervalDays = progress?.intervalDays || 0;
    let lapses = progress?.lapses || 0;
    let correctCount = progress?.correctCount || 0;
    let incorrectCount = progress?.incorrectCount || 0;
    let currentLevel = progress?.memoryLevel || 0;
    const memoryLevelBefore = currentLevel;
    const intervalBefore = intervalDays;
    let nextRep = repCount;
    let nextInterval = intervalDays;
    let nextEf = easeFactor;
    let nextLapses = lapses;
    let nextState = progress?.state || "new";
    if (input.rating === 1 || !isCorrect) {
      nextRep = 0;
      nextInterval = 1;
      nextLapses = lapses + 1;
      nextEf = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
      nextState = "difficult";
      incorrectCount++;
    } else if (input.rating === 2) {
      nextRep = Math.max(1, repCount + 1);
      nextInterval = Math.max(1, Math.round(intervalDays * 1.2));
      nextEf = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
      nextState = "learning";
      correctCount++;
    } else if (input.rating === 3) {
      if (repCount === 0) nextInterval = 1;
      else if (repCount === 1) nextInterval = 3;
      else if (repCount === 2) nextInterval = 7;
      else if (repCount === 3) nextInterval = 14;
      else if (repCount === 4) nextInterval = 30;
      else nextInterval = Math.round(intervalDays * easeFactor);
      nextRep = repCount + 1;
      nextState = nextInterval >= 21 ? "mastered" : "reviewing";
      correctCount++;
    } else {
      if (repCount === 0) nextInterval = 3;
      else if (repCount === 1) nextInterval = 6;
      else if (repCount === 2) nextInterval = 12;
      else nextInterval = Math.round(intervalDays * easeFactor * 1.35);
      nextRep = repCount + 1;
      nextEf = Math.min(3.2, Number((easeFactor + 0.15).toFixed(2)));
      nextState = nextInterval >= 14 ? "mastered" : "reviewing";
      correctCount++;
    }
    const nextLevel = this.computeMemoryLevel(nextRep, nextInterval, nextLapses);
    const nextReviewDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1e3);
    let progressId = progress?.id;
    if (!progress) {
      const inserted = await prisma.$queryRawUnsafe(
        `INSERT INTO vocab_word_progress (
          id, "userId", "languageId", "wordId", term, meaning, phonetic, "partOfSpeech",
          "memoryLevel", "repetitionCount", "easeFactor", "intervalDays", "lastReviewedAt",
          "nextReviewAt", "correctCount", "incorrectCount", lapses, state, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING id`,
        userId,
        languageId,
        input.wordId,
        input.term,
        input.meaning,
        input.phonetic || null,
        input.partOfSpeech || null,
        nextLevel,
        nextRep,
        nextEf,
        nextInterval,
        now,
        nextReviewDate,
        correctCount,
        incorrectCount,
        nextLapses,
        nextState
      );
      progressId = inserted[0]?.id;
    } else {
      await prisma.$queryRawUnsafe(
        `UPDATE vocab_word_progress SET
          term = $1, meaning = $2, phonetic = $3, "partOfSpeech" = $4,
          "memoryLevel" = $5, "repetitionCount" = $6, "easeFactor" = $7, "intervalDays" = $8,
          "lastReviewedAt" = $9, "nextReviewAt" = $10, "correctCount" = $11, "incorrectCount" = $12,
          lapses = $13, state = $14, "updatedAt" = NOW()
        WHERE id = $15`,
        input.term,
        input.meaning,
        input.phonetic || null,
        input.partOfSpeech || null,
        nextLevel,
        nextRep,
        nextEf,
        nextInterval,
        now,
        nextReviewDate,
        correctCount,
        incorrectCount,
        nextLapses,
        nextState,
        progressId
      );
    }
    await prisma.$queryRawUnsafe(
      `INSERT INTO vocab_review_logs (
        id, "userId", "progressId", "wordId", "exerciseType", rating, "isCorrect",
        "responseTimeMs", "memoryLevelBefore", "memoryLevelAfter", "intervalBefore", "intervalAfter", "reviewedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      )`,
      userId,
      progressId,
      input.wordId,
      input.exerciseType,
      input.rating,
      isCorrect,
      input.responseTimeMs || null,
      memoryLevelBefore,
      nextLevel,
      intervalBefore,
      nextInterval
    );
    return {
      wordId: input.wordId,
      memoryLevelBefore,
      memoryLevelAfter: nextLevel,
      intervalBefore,
      intervalAfter: nextInterval,
      nextReviewAt: nextReviewDate.toISOString().split("T")[0],
      isCorrect,
      repetitionCount: nextRep,
      easeFactor: nextEf,
      lapses: nextLapses,
      state: nextState
    };
  }
  /**
   * Get comprehensive dashboard metrics, Memory Pyramid tiers, Today's Review & Weak Words
   */
  async getDashboardAnalytics(userId, languageId = "en") {
    const prisma = getPrisma();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM vocab_word_progress 
       WHERE "userId" = $1 AND "languageId" = $2`,
      userId,
      languageId
    );
    const pyramid = {
      level0: 0,
      // Tầng 1: Chưa học / Mới
      level1: 0,
      // Tầng 2: Mới học
      level2: 0,
      // Tầng 3: Đang ghi nhớ / Chưa chắc
      level3: 0,
      // Tầng 4: Nhớ khá
      level4: 0,
      // Tầng 5: Nhớ tốt / Đã nhớ
      level5: 0
      // Tầng 6: Thành thạo
    };
    let totalReviews = 0;
    let totalCorrect = 0;
    let masteredCount = 0;
    const dueTodayWords = [];
    const weakWords = [];
    for (const r of rows) {
      const lvl = r.memoryLevel ?? 0;
      if (lvl === 0) pyramid.level0++;
      else if (lvl === 1) pyramid.level1++;
      else if (lvl === 2) pyramid.level2++;
      else if (lvl === 3) pyramid.level3++;
      else if (lvl === 4) pyramid.level4++;
      else if (lvl >= 5) {
        pyramid.level5++;
        masteredCount++;
      }
      totalCorrect += r.correctCount || 0;
      totalReviews += (r.correctCount || 0) + (r.incorrectCount || 0);
      const nextDate = r.nextReviewAt ? new Date(r.nextReviewAt).toISOString().split("T")[0] : today;
      if (nextDate <= today || r.memoryLevel === 1) {
        let priority = 0;
        if (r.lapses > 0) priority += 1e3;
        priority += (5 - (r.memoryLevel || 0)) * 100;
        dueTodayWords.push({
          ...r,
          priorityScore: priority
        });
      }
      const totalAtt = (r.correctCount || 0) + (r.incorrectCount || 0);
      const acc = totalAtt > 0 ? r.correctCount / totalAtt : 1;
      if (r.lapses >= 2 || totalAtt >= 2 && acc < 0.6) {
        weakWords.push({
          ...r,
          accuracy: Math.round(acc * 100)
        });
      }
    }
    dueTodayWords.sort((a, b) => b.priorityScore - a.priorityScore);
    weakWords.sort((a, b) => a.accuracy - b.accuracy);
    const overallAccuracy = totalReviews > 0 ? Math.round(totalCorrect / totalReviews * 100) : 100;
    const totalWordsTracked = rows.length;
    const completionPercent = totalWordsTracked > 0 ? Math.round(masteredCount / totalWordsTracked * 100) : 0;
    return {
      totalWords: totalWordsTracked,
      masteredCount,
      completionPercent,
      overallAccuracy,
      totalReviews,
      pyramid: {
        total: totalWordsTracked,
        level0_new: pyramid.level0,
        level1_learning: pyramid.level1,
        level2_uncertain: pyramid.level2,
        level3_good: pyramid.level3,
        level4_strong: pyramid.level4,
        level5_mastered: pyramid.level5
      },
      dueTodayCount: dueTodayWords.length,
      dueTodayWords: dueTodayWords.slice(0, 30),
      weakWordsCount: weakWords.length,
      weakWords: weakWords.slice(0, 20)
    };
  }
  /**
   * Get learning review history logs grouped by date
   */
  async getLearningHistory(userId, limit = 50) {
    const prisma = getPrisma();
    const logs = await prisma.$queryRawUnsafe(
      `SELECT l.*, p.term, p.meaning, p.phonetic
       FROM vocab_review_logs l
       JOIN vocab_word_progress p ON l."progressId" = p.id
       WHERE l."userId" = $1
       ORDER BY l."reviewedAt" DESC
       LIMIT $2`,
      userId,
      limit
    );
    const grouped = {};
    for (const log of logs) {
      const d = log.reviewedAt ? new Date(log.reviewedAt).toISOString().split("T")[0] : "today";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(log);
    }
    return {
      logs,
      groupedByDate: grouped,
      totalLogs: logs.length
    };
  }
  /**
   * Sync a batch of words or client data to Postgres
   */
  async syncWordsBatch(userId, languageId, words) {
    const prisma = getPrisma();
    let synced = 0;
    for (const w of words) {
      const wordId = w.id || w.wordId;
      const term = w.term;
      const meaning = w.meaning;
      if (!wordId || !term || !meaning) continue;
      const memLevel = this.computeMemoryLevel(w.repetitionCount || 0, w.intervalDays || 0, w.lapses || 0);
      await prisma.$queryRawUnsafe(
        `INSERT INTO vocab_word_progress (
          id, "userId", "languageId", "wordId", term, meaning, phonetic, "partOfSpeech",
          "memoryLevel", "repetitionCount", "easeFactor", "intervalDays", "lastReviewedAt",
          "nextReviewAt", "correctCount", "incorrectCount", lapses, state, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        )
        ON CONFLICT ("userId", "languageId", "wordId") DO UPDATE SET
          term = EXCLUDED.term,
          meaning = EXCLUDED.meaning,
          phonetic = EXCLUDED.phonetic,
          "partOfSpeech" = EXCLUDED."partOfSpeech",
          "memoryLevel" = EXCLUDED."memoryLevel",
          "repetitionCount" = EXCLUDED."repetitionCount",
          "easeFactor" = EXCLUDED."easeFactor",
          "intervalDays" = EXCLUDED."intervalDays",
          "lastReviewedAt" = EXCLUDED."lastReviewedAt",
          "nextReviewAt" = EXCLUDED."nextReviewAt",
          state = EXCLUDED.state,
          "updatedAt" = NOW()`,
        userId,
        languageId,
        wordId,
        term,
        meaning,
        w.phonetic || null,
        w.partOfSpeech || null,
        memLevel,
        w.repetitionCount || 0,
        w.easeFactor || 2.5,
        w.intervalDays || 0,
        w.lastReviewedAt ? new Date(w.lastReviewedAt) : null,
        w.nextReviewAt ? new Date(w.nextReviewAt) : /* @__PURE__ */ new Date(),
        w.correctCount || 0,
        w.incorrectCount || 0,
        w.lapses || 0,
        w.state || "new"
      );
      synced++;
    }
    return { success: true, count: synced };
  }
};
var vocabService = new VocabService();

// src/backend/routes/vocab.routes.ts
var vocabRouter = Router5();
vocabRouter.use(requireAuth);
vocabRouter.use(requireActiveSubscription);
vocabRouter.get("/analytics", async (req, res) => {
  try {
    const userId = req.user.id;
    const languageId = req.query.languageId || "en";
    const analytics = await vocabService.getDashboardAnalytics(userId, languageId);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("[Vocab API] Error fetching analytics:", error);
    res.status(500).json({ success: false, message: error.message || "L\u1ED7i khi t\u1EA3i d\u1EEF li\u1EC7u ti\u1EBFn \u0111\u1ED9 t\u1EEB v\u1EF1ng" });
  }
});
vocabRouter.post("/review", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      wordId,
      languageId,
      term,
      meaning,
      phonetic,
      partOfSpeech,
      exerciseType,
      rating,
      isCorrect,
      responseTimeMs
    } = req.body;
    if (!wordId || !term || !meaning || !exerciseType || !rating) {
      return res.status(400).json({
        success: false,
        message: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c: wordId, term, meaning, exerciseType, rating"
      });
    }
    const result = await vocabService.recordReview(userId, {
      wordId,
      languageId: languageId || "en",
      term,
      meaning,
      phonetic,
      partOfSpeech,
      exerciseType,
      rating: Number(rating),
      isCorrect,
      responseTimeMs: responseTimeMs ? Number(responseTimeMs) : void 0
    });
    progressionService.awardXp(userId, {
      amount: 5,
      category: "learning",
      source: "vocab_review",
      sourceId: result?.log?.id || `vocab_${wordId}_${Date.now()}`,
      description: `\xD4n t\u1EADp t\u1EEB v\u1EF1ng: ${term}`
    }).catch((err) => console.warn("Progression hook error (vocab):", err));
    res.json({
      success: true,
      data: result,
      message: "Ghi nh\u1EADn k\u1EBFt qu\u1EA3 luy\u1EC7n t\u1EADp th\xE0nh c\xF4ng"
    });
  } catch (error) {
    console.error("[Vocab API] Error recording review:", error);
    res.status(500).json({ success: false, message: error.message || "L\u1ED7i khi l\u01B0u k\u1EBFt qu\u1EA3 \xF4n t\u1EADp" });
  }
});
vocabRouter.get("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const history = await vocabService.getLearningHistory(userId, limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("[Vocab API] Error fetching history:", error);
    res.status(500).json({ success: false, message: error.message || "L\u1ED7i khi t\u1EA3i l\u1ECBch s\u1EED h\u1ECDc" });
  }
});
vocabRouter.post("/sync", async (req, res) => {
  try {
    const userId = req.user.id;
    const { languageId = "en", words = [] } = req.body;
    const result = await vocabService.syncWordsBatch(userId, languageId, words);
    res.json({
      success: true,
      data: result,
      message: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 ${result.count} t\u1EEB v\xE0o c\u01A1 s\u1EDF d\u1EEF li\u1EC7u`
    });
  } catch (error) {
    console.error("[Vocab API] Error syncing vocab words:", error);
    res.status(500).json({ success: false, message: error.message || "L\u1ED7i khi \u0111\u1ED3ng b\u1ED9 t\u1EEB v\u1EF1ng" });
  }
});

// src/backend/routes/api.ts
init_announcement_service();

// src/backend/services/notification/notificationEngine.service.ts
init_db();

// src/backend/services/notification/notification.types.ts
var SYSTEM_NOTIFICATION_RULES = {
  CALENDAR_UPCOMING: {
    eventType: "CALENDAR_UPCOMING",
    label: "L\u1ECBch s\u1EAFp di\u1EC5n ra",
    description: "Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc khi s\u1EF1 ki\u1EC7n tr\xEAn l\u1ECBch/th\u1EDDi gian bi\u1EC3u b\u1EAFt \u0111\u1EA7u",
    defaultEnabled: true,
    defaultTimingMinutes: 15,
    defaultPriority: "HIGH",
    supportedTimings: [
      { label: "Tr\u01B0\u1EDBc 5 ph\xFAt", minutes: 5 },
      { label: "Tr\u01B0\u1EDBc 15 ph\xFAt", minutes: 15 },
      { label: "Tr\u01B0\u1EDBc 30 ph\xFAt", minutes: 30 },
      { label: "Tr\u01B0\u1EDBc 1 gi\u1EDD", minutes: 60 },
      { label: "Tr\u01B0\u1EDBc 1 ng\xE0y", minutes: 1440 }
    ]
  },
  CALENDAR_STARTING: {
    eventType: "CALENDAR_STARTING",
    label: "L\u1ECBch b\u1EAFt \u0111\u1EA7u di\u1EC5n ra",
    description: "Th\xF4ng b\xE1o \u0111\xFAng th\u1EDDi \u0111i\u1EC3m s\u1EF1 ki\u1EC7n b\u1EAFt \u0111\u1EA7u",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "HIGH",
    supportedTimings: [{ label: "\u0110\xFAng gi\u1EDD b\u1EAFt \u0111\u1EA7u", minutes: 0 }]
  },
  CALENDAR_ENDED: {
    eventType: "CALENDAR_ENDED",
    label: "L\u1ECBch k\u1EBFt th\xFAc",
    description: "G\u1EE3i \xFD ghi ch\xFA v\xE0 t\u1ED5ng k\u1EBFt sau khi k\u1EBFt th\xFAc s\u1EF1 ki\u1EC7n",
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: "LOW",
    supportedTimings: [{ label: "Ngay khi k\u1EBFt th\xFAc", minutes: 0 }]
  },
  CALENDAR_CHANGED: {
    eventType: "CALENDAR_CHANGED",
    label: "L\u1ECBch b\u1ECB thay \u0111\u1ED5i",
    description: "C\u1EA3nh b\xE1o khi th\u1EDDi gian, ng\xE0y ho\u1EB7c ti\xEAu \u0111\u1EC1 l\u1ECBch b\u1ECB c\u1EADp nh\u1EADt",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "NORMAL",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  },
  CALENDAR_CANCELLED: {
    eventType: "CALENDAR_CANCELLED",
    label: "L\u1ECBch b\u1ECB h\u1EE7y",
    description: "Th\xF4ng b\xE1o khi m\u1ED9t s\u1EF1 ki\u1EC7n \u0111\xE3 l\xEAn l\u1ECBch b\u1ECB x\xF3a ho\u1EB7c h\u1EE7y",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "NORMAL",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  },
  TASK_CREATED: {
    eventType: "TASK_CREATED",
    label: "Nhi\u1EC7m v\u1EE5 m\u1EDBi \u0111\u01B0\u1EE3c t\u1EA1o",
    description: "X\xE1c nh\u1EADn khi c\xF3 nhi\u1EC7m v\u1EE5 m\u1EDBi \u0111\u01B0\u1EE3c th\xEAm v\xE0o danh s\xE1ch",
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: "LOW",
    supportedTimings: [{ label: "Ngay khi t\u1EA1o", minutes: 0 }]
  },
  TASK_DEADLINE_APPROACHING: {
    eventType: "TASK_DEADLINE_APPROACHING",
    label: "H\u1EA1n ch\xF3t nhi\u1EC7m v\u1EE5 s\u1EAFp \u0111\u1EBFn",
    description: "C\u1EA3nh b\xE1o tr\u01B0\u1EDBc khi nhi\u1EC7m v\u1EE5 ch\u1EA1m deadline",
    defaultEnabled: true,
    defaultTimingMinutes: 1440,
    // 1 day before
    defaultPriority: "HIGH",
    supportedTimings: [
      { label: "Tr\u01B0\u1EDBc 1 gi\u1EDD", minutes: 60 },
      { label: "Tr\u01B0\u1EDBc 3 gi\u1EDD", minutes: 180 },
      { label: "Tr\u01B0\u1EDBc 1 ng\xE0y", minutes: 1440 },
      { label: "Tr\u01B0\u1EDBc 2 ng\xE0y", minutes: 2880 }
    ]
  },
  TASK_DUE_NOW: {
    eventType: "TASK_DUE_NOW",
    label: "Nhi\u1EC7m v\u1EE5 \u0111\u1EBFn h\u1EA1n h\xF4m nay",
    description: "Nh\u1EAFc vi\u1EC7c t\u1ED5ng h\u1EE3p v\xE0o bu\u1ED5i s\xE1ng \u0111\u1ED1i v\u1EDBi c\xE1c vi\u1EC7c \u0111\u1EBFn h\u1EA1n",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "HIGH",
    supportedTimings: [{ label: "Bu\u1ED5i s\xE1ng ng\xE0y \u0111\u1EBFn h\u1EA1n", minutes: 0 }]
  },
  TASK_OVERDUE: {
    eventType: "TASK_OVERDUE",
    label: "Nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n",
    description: "C\u1EA3nh b\xE1o kh\u1EA9n khi c\xF4ng vi\u1EC7c \u0111\xE3 v\u01B0\u1EE3t qu\xE1 ng\xE0y h\u1EA1n ch\xF3t m\xE0 ch\u01B0a xong",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "CRITICAL",
    supportedTimings: [{ label: "Ngay khi qu\xE1 h\u1EA1n", minutes: 0 }]
  },
  TASK_UNCOMPLETED_AFTER_DEADLINE: {
    eventType: "TASK_UNCOMPLETED_AFTER_DEADLINE",
    label: "Nh\u1EAFc nh\u1EDF c\xF4ng vi\u1EC7c t\u1ED3n \u0111\u1ECDng",
    description: "\u0110\u1ECBnh k\u1EF3 nh\u1EAFc nh\u1EDF c\xE1c task qu\xE1 h\u1EA1n l\xE2u ng\xE0y c\u1EA7n x\u1EED l\xFD g\u1EA5p",
    defaultEnabled: true,
    defaultTimingMinutes: 1440,
    defaultPriority: "HIGH",
    supportedTimings: [{ label: "M\u1ED7i 24 gi\u1EDD", minutes: 1440 }]
  },
  TASK_COMPLETED: {
    eventType: "TASK_COMPLETED",
    label: "Nhi\u1EC7m v\u1EE5 ho\xE0n th\xE0nh",
    description: "Ch\xFAc m\u1EEBng v\xE0 ghi nh\u1EADn \u0111i\u1EC3m th\u01B0\u1EDFng khi ho\xE0n th\xE0nh c\xF4ng vi\u1EC7c",
    defaultEnabled: false,
    defaultTimingMinutes: 0,
    defaultPriority: "LOW",
    supportedTimings: [{ label: "Ngay khi ho\xE0n t\u1EA5t", minutes: 0 }]
  },
  TASK_ASSIGNED_OR_CHANGED: {
    eventType: "TASK_ASSIGNED_OR_CHANGED",
    label: "Nhi\u1EC7m v\u1EE5 \u0111\u01B0\u1EE3c giao ho\u1EB7c s\u1EEDa",
    description: "Th\xF4ng b\xE1o khi task c\u1EE7a b\u1EA1n \u0111\u01B0\u1EE3c \u0111i\u1EC1u ch\u1EC9nh ti\u1EBFn \u0111\u1ED9 ho\u1EB7c ph\xE2n c\xF4ng",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "NORMAL",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  },
  BUDGET_EXCEEDED: {
    eventType: "BUDGET_EXCEEDED",
    label: "C\u1EA3nh b\xE1o v\u01B0\u1EE3t ng\xE2n s\xE1ch",
    description: "C\u1EA3nh b\xE1o khi chi ti\xEAu ch\u1EA1m ho\u1EB7c v\u01B0\u1EE3t h\u1EA1n m\u1EE9c ng\xE2n s\xE1ch",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "HIGH",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  },
  SUBSCRIPTION_EXPIRING: {
    eventType: "SUBSCRIPTION_EXPIRING",
    label: "G\xF3i d\u1ECBch v\u1EE5 s\u1EAFp h\u1EBFt h\u1EA1n",
    description: "Nh\u1EAFc nh\u1EDF gia h\u1EA1n tr\u01B0\u1EDBc khi g\xF3i Pro/Team h\u1EBFt hi\u1EC7u l\u1EF1c",
    defaultEnabled: true,
    defaultTimingMinutes: 4320,
    // 3 days before
    defaultPriority: "HIGH",
    supportedTimings: [
      { label: "Tr\u01B0\u1EDBc 1 ng\xE0y", minutes: 1440 },
      { label: "Tr\u01B0\u1EDBc 3 ng\xE0y", minutes: 4320 },
      { label: "Tr\u01B0\u1EDBc 7 ng\xE0y", minutes: 10080 }
    ]
  },
  SECURITY_ALERT: {
    eventType: "SECURITY_ALERT",
    label: "C\u1EA3nh b\xE1o b\u1EA3o m\u1EADt t\xE0i kho\u1EA3n",
    description: "Th\xF4ng b\xE1o \u0111\u0103ng nh\u1EADp b\u1EA5t th\u01B0\u1EDDng, \u0111\u1ED5i m\u1EADt kh\u1EA9u ho\u1EB7c x\xE1c th\u1EF1c 2 l\u1EDBp",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "CRITICAL",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  },
  SYSTEM_ALERT: {
    eventType: "SYSTEM_ALERT",
    label: "Th\xF4ng b\xE1o h\u1EC7 th\u1ED1ng quan tr\u1ECDng",
    description: "B\u1EA3o tr\xEC h\u1EC7 th\u1ED1ng, n\xE2ng c\u1EA5p phi\xEAn b\u1EA3n ho\u1EB7c th\xF4ng b\xE1o t\u1EEB Qu\u1EA3n tr\u1ECB",
    defaultEnabled: true,
    defaultTimingMinutes: 0,
    defaultPriority: "HIGH",
    supportedTimings: [{ label: "Ngay l\u1EADp t\u1EE9c", minutes: 0 }]
  }
};

// src/backend/services/notification/providers/inApp.provider.ts
init_db();
var InAppNotificationProvider = class {
  constructor() {
    this.channel = "in_app";
  }
  async send(delivery, userContext) {
    try {
      const prisma = getPrisma();
      let metaObj = {};
      try {
        if (delivery.metadata) {
          metaObj = JSON.parse(delivery.metadata);
        }
      } catch (e) {
      }
      const notif = await prisma.notification.create({
        data: {
          userId: delivery.userId,
          title: delivery.title,
          message: delivery.content,
          type: delivery.priority === "CRITICAL" ? "alert" : delivery.priority === "HIGH" ? "warning" : "info",
          priority: delivery.priority,
          category: metaObj.category || "SYSTEM",
          deliveryId: delivery.id,
          actionUrl: delivery.actionUrl,
          actionLabel: delivery.actionLabel,
          read: false
        }
      });
      return {
        success: true,
        channel: "in_app",
        deliveryId: delivery.id,
        details: { notificationId: notif.id }
      };
    } catch (err) {
      console.error("[InAppProvider] Failed to persist in-app notification:", err);
      return {
        success: false,
        channel: "in_app",
        deliveryId: delivery.id,
        error: err.message
      };
    }
  }
};
var inAppProvider = new InAppNotificationProvider();

// src/backend/services/notification/gmailOAuth.service.ts
init_db();
init_gmailNotification_service();
import nodemailer4 from "nodemailer";

// src/backend/services/notification/emailTemplate.ts
function buildNotificationEmailHtml(options) {
  const {
    recipientName = "B\u1EA1n",
    headline,
    bodyHtml,
    categoryLabel = "Th\xF4ng b\xE1o LifeOS",
    categoryColor = "#10B981",
    // Emerald default
    priority = "NORMAL",
    actionUrl,
    actionLabel = "Xem chi ti\u1EBFt tr\xEAn LifeOS",
    metadataItems = [],
    appBaseUrl = "https://www.quanlicanhan.online"
  } = options;
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const settingsUrl = `${appBaseUrl.replace(/\/$/, "")}/?tab=settings&view=notifications`;
  let priorityBadgeText = "B\xECnh th\u01B0\u1EDDng";
  let priorityBadgeBg = "#F1F5F9";
  let priorityBadgeColor = "#475569";
  if (priority === "CRITICAL") {
    priorityBadgeText = "Kh\u1EA9n c\u1EA5p";
    priorityBadgeBg = "#FEE2E2";
    priorityBadgeColor = "#DC2626";
  } else if (priority === "HIGH") {
    priorityBadgeText = "Quan tr\u1ECDng";
    priorityBadgeBg = "#FEF3C7";
    priorityBadgeColor = "#D97706";
  } else if (priority === "LOW") {
    priorityBadgeText = "Tham kh\u1EA3o";
    priorityBadgeBg = "#F1F5F9";
    priorityBadgeColor = "#64748B";
  }
  const metadataRowsHtml = metadataItems.length > 0 ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin: 24px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        ${metadataItems.map((item) => `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 38%; vertical-align: top;">
              ${item.label}:
            </td>
            <td style="padding: 6px 0; font-size: 13px; color: #0F172A; ${item.isBold ? "font-weight: 700;" : "font-weight: 500;"} vertical-align: top;">
              ${item.value}
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  ` : "";
  const actionButtonHtml = actionUrl ? `
    <div style="margin: 30px 0 20px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="25%" strokecolor="#059669" fillcolor="#10B981">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${actionLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); letter-spacing: 0.2px;">
        ${actionLabel} &rarr;
      </a>
      <!--<![endif]-->
    </div>
  ` : "";
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #0F172A;
    }
    table {
      border-collapse: separate;
    }
    a {
      color: #10B981;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 12px !important;
      }
      .card {
        padding: 24px 18px !important;
        border-radius: 16px !important;
      }
    }
  </style>
</head>
<body style="background-color: #F1F5F9; padding: 24px 0;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="container">
      
      <!-- Top Branding Header -->
      <tr>
        <td style="padding: 16px 8px 24px 8px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="vertical-align: middle; padding-right: 10px;">
                <img src="${appBaseUrl.replace(/\/$/, "")}/logo.png" width="36" height="36" style="border-radius: 10px; display: block; object-fit: contain;" alt="LifeOS" />
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 19px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">LifeOS</span>
                <span style="font-size: 11px; font-weight: 800; background-color: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 999px; margin-left: 6px; text-transform: uppercase;">Engine</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main White Card -->
      <tr>
        <td>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
            
            <!-- Category and Priority Badges -->
            <tr>
              <td>
                <div style="margin-bottom: 20px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${categoryColor}; background-color: #F8FAFC; border: 1px solid ${categoryColor}40; padding: 4px 10px; border-radius: 8px; margin-right: 6px;">
                    ${categoryLabel}
                  </span>
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${priorityBadgeColor}; background-color: ${priorityBadgeBg}; padding: 4px 10px; border-radius: 8px;">
                    ${priorityBadgeText}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Headline -->
            <tr>
              <td>
                <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
                  ${headline}
                </h1>
              </td>
            </tr>

            <!-- Greeting & Main Message Body -->
            <tr>
              <td style="font-size: 15px; color: #334155; line-height: 1.6;">
                <p style="margin: 0 0 14px 0; font-weight: 600; color: #0F172A;">
                  Xin ch\xE0o ${recipientName},
                </p>
                <div style="color: #475569; font-size: 14px; line-height: 1.65;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>

            <!-- Metadata Box -->
            ${metadataRowsHtml ? `<tr><td>${metadataRowsHtml}</td></tr>` : ""}

            <!-- CTA Button -->
            ${actionButtonHtml ? `<tr><td>${actionButtonHtml}</td></tr>` : ""}

            <!-- Friendly closing signature -->
            <tr>
              <td style="padding-top: 18px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8;">
                <p style="margin: 0;">
                  Ch\xFAc b\u1EA1n m\u1ED9t ng\xE0y l\xE0m vi\u1EC7c v\xE0 h\u1ECDc t\u1EADp hi\u1EC7u qu\u1EA3 c\xF9ng <strong>LifeOS</strong>!
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- Footer Info & Settings -->
      <tr>
        <td style="padding: 24px 16px; text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;">
            B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c th\xF4ng b\xE1o n\xE0y v\xEC \u0111\xE3 b\u1EADt nh\u1EADn tin trong H\u1EC7 \u0111i\u1EC1u h\xE0nh C\xE1 nh\xE2n <strong>LifeOS</strong>.
          </p>
          <p style="margin: 0;">
            <a href="${settingsUrl}" style="color: #64748B; text-decoration: underline; font-weight: 600;">C\xE0i \u0111\u1EB7t Th\xF4ng b\xE1o & Gmail</a>
            &nbsp;&bull;&nbsp;
            <a href="${appBaseUrl}" style="color: #64748B; text-decoration: underline; font-weight: 600;">M\u1EDF Dashboard</a>
          </p>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: #CBD5E1;">
            &copy; ${currentYear} LifeOS \u2014 Gen-Z Personal Operating System. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
}

// src/backend/services/notification/gmailOAuth.service.ts
var GmailOAuthService = class {
  /**
   * Retrieves OAuth credentials from environment variables or admin system settings
   */
  async getCredentials() {
    const prisma = getPrisma();
    let dbClientId = "";
    let dbClientSecret = "";
    let dbRedirectUri = "";
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "google_oauth_credentials" }
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        dbClientId = parsed.clientId || "";
        dbClientSecret = parsed.clientSecret || "";
        dbRedirectUri = parsed.redirectUri || "";
      }
    } catch (e) {
    }
    const clientId = process.env.GOOGLE_CLIENT_ID || dbClientId || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbClientSecret || "";
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || dbRedirectUri || `${appUrl}/api/notifications/gmail/callback`;
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret, redirectUri };
  }
  /**
   * Generates authorization URL for Google OAuth consent screen
   */
  async generateAuthUrl(userId, redirectUriOverride) {
    const creds = await this.getCredentials();
    if (!creds) {
      return null;
    }
    const redirectUri = redirectUriOverride || creds.redirectUri;
    const statePayload = JSON.stringify({ userId, t: Date.now() });
    const state = Buffer.from(statePayload).toString("base64url");
    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ];
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      // Critical: yields refresh_token
      prompt: "consent",
      // Forces consent screen so refresh_token is always returned
      state
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state
    };
  }
  /**
   * Exchanges authorization code for tokens and saves integration
   */
  async handleCallback(code, state, redirectUriOverride) {
    let userId = "";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      userId = decoded.userId;
    } catch (e) {
      return { success: false, error: "M\xE3 x\xE1c th\u1EF1c tr\u1EA1ng th\xE1i (state) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n." };
    }
    if (!userId) {
      return { success: false, error: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng t\u1EEB y\xEAu c\u1EA7u li\xEAn k\u1EBFt." };
    }
    const creds = await this.getCredentials();
    if (!creds) {
      return { success: false, error: "H\u1EC7 th\u1ED1ng ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh Google Client ID / Secret." };
    }
    const redirectUri = redirectUriOverride || creds.redirectUri;
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[GmailOAuth] Token exchange error:", tokenData);
        return { success: false, error: tokenData.error_description || tokenData.error || "L\u1ED7i trao \u0111\u1ED5i m\xE3 OAuth v\u1EDBi Google." };
      }
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userInfo = await userinfoRes.json();
      if (!userinfoRes.ok || !userInfo.email) {
        return { success: false, error: "Kh\xF4ng th\u1EC3 l\u1EA5y \u0111\u1ECBa ch\u1EC9 email t\u1EEB t\xE0i kho\u1EA3n Google." };
      }
      const connectedEmail = userInfo.email.toLowerCase().trim();
      const expiryDate = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1e3) : null;
      const prisma = getPrisma();
      await prisma.userEmailIntegration.upsert({
        where: { userId },
        update: {
          provider: "gmail",
          connectedEmail,
          accessToken: tokenData.access_token,
          // If Google does not return a new refresh_token on re-auth, preserve existing one
          ...tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {},
          tokenExpiry: expiryDate,
          status: "ACTIVE",
          lastVerifiedAt: /* @__PURE__ */ new Date(),
          lastError: null
        },
        create: {
          userId,
          provider: "gmail",
          connectedEmail,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || "",
          tokenExpiry: expiryDate,
          status: "ACTIVE",
          lastVerifiedAt: /* @__PURE__ */ new Date()
        }
      });
      await prisma.userNotificationPreference.upsert({
        where: { userId },
        update: { emailEnabled: true },
        create: { userId, emailEnabled: true, inAppEnabled: true }
      });
      return { success: true, email: connectedEmail };
    } catch (err) {
      console.error("[GmailOAuth] Callback processing exception:", err);
      return { success: false, error: `L\u1ED7i x\u1EED l\xFD k\u1EBFt n\u1ED1i Google: ${err.message}` };
    }
  }
  /**
   * Disconnects and revokes user Gmail OAuth integration
   */
  async disconnect(userId) {
    const prisma = getPrisma();
    try {
      const integration = await prisma.userEmailIntegration.findUnique({
        where: { userId }
      });
      if (!integration) {
        return { success: true, message: "T\xE0i kho\u1EA3n ch\u01B0a t\u1EEBng k\u1EBFt n\u1ED1i Gmail." };
      }
      const tokenToRevoke = integration.refreshToken || integration.accessToken;
      if (tokenToRevoke) {
        fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).catch((err) => console.warn("[GmailOAuth] Token revoke notice:", err.message));
      }
      await prisma.userEmailIntegration.delete({
        where: { userId }
      });
      return { success: true, message: "\u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng." };
    } catch (err) {
      console.error("[GmailOAuth] Disconnect error:", err);
      return { success: false, message: `Kh\xF4ng th\u1EC3 ng\u1EAFt k\u1EBFt n\u1ED1i: ${err.message}` };
    }
  }
  /**
   * Retrieves active integration status for UI
   */
  async getIntegrationStatus(userId) {
    const prisma = getPrisma();
    const integration = await prisma.userEmailIntegration.findUnique({
      where: { userId }
    });
    if (!integration) {
      const creds = await this.getCredentials();
      return {
        connected: false,
        isConfiguredOnServer: !!creds,
        connectedEmail: null,
        status: "DISCONNECTED",
        lastVerifiedAt: null
      };
    }
    return {
      connected: integration.status === "ACTIVE" && !!integration.refreshToken,
      isConfiguredOnServer: true,
      connectedEmail: integration.connectedEmail,
      status: integration.status,
      lastVerifiedAt: integration.lastVerifiedAt,
      lastError: integration.lastError
    };
  }
  /**
   * Creates an active Nodemailer transport using user's stored OAuth credentials
   */
  async createOAuthTransporter(userId) {
    const prisma = getPrisma();
    const integration = await prisma.userEmailIntegration.findUnique({
      where: { userId }
    });
    if (!integration || integration.status !== "ACTIVE" || !integration.refreshToken) {
      return null;
    }
    const creds = await this.getCredentials();
    if (!creds) {
      return null;
    }
    const connectedEmail = integration.connectedEmail;
    const ipv4Host = await resolveHostToIPv4("smtp.gmail.com");
    const transporter = nodemailer4.createTransport({
      host: ipv4Host,
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: connectedEmail,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: integration.refreshToken,
        accessToken: integration.accessToken || void 0
      },
      family: 4,
      connectionTimeout: 15e3,
      greetingTimeout: 15e3,
      socketTimeout: 2e4,
      tls: {
        servername: "smtp.gmail.com",
        rejectUnauthorized: false
      }
    });
    return { transporter, connectedEmail };
  }
  /**
   * Sends a test email to verify user Gmail OAuth connection
   */
  async sendTestEmail(userId, targetEmail) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    if (!user) {
      return { success: false, message: "Ng\u01B0\u1EDDi d\xF9ng kh\xF4ng t\u1ED3n t\u1EA1i." };
    }
    const recipient = targetEmail || user.email;
    const authResult = await this.createOAuthTransporter(userId);
    const appUrl = (process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "");
    const testHtml = buildNotificationEmailHtml({
      recipientName: user.name || "Th\xE0nh vi\xEAn LifeOS",
      headline: "\u{1F389} K\u1EBFt n\u1ED1i Gmail OAuth th\xE0nh c\xF4ng!",
      bodyHtml: `
        Email n\xE0y \u0111\u01B0\u1EE3c g\u1EEDi tr\u1EF1c ti\u1EBFp t\u1EEB h\u1ED9p th\u01B0 Gmail c\u1EE7a b\u1EA1n th\xF4ng qua giao th\u1EE9c <strong>Google OAuth 2.0</strong> b\u1EA3o m\u1EADt cao.<br/><br/>
        T\u1EEB b\xE2y gi\u1EDD, to\xE0n b\u1ED9 c\xE1c nh\u1EAFc nh\u1EDF quan tr\u1ECDng v\u1EC1 <strong>L\u1ECBch tr\xECnh, Deadline c\xF4ng vi\u1EC7c, v\xE0 C\u1EA3nh b\xE1o qu\xE1 h\u1EA1n</strong> s\u1EBD \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng chuy\u1EC3n \u0111\u1EBFn b\u1EA1n theo \u0111\xFAng quy t\u1EAFc b\u1EA1n \u0111\xE3 c\xE0i \u0111\u1EB7t.
      `,
      categoryLabel: "Ki\u1EC3m tra k\u1EBFt n\u1ED1i",
      categoryColor: "#10B981",
      priority: "NORMAL",
      actionUrl: `${appUrl}/?view=notifications`,
      actionLabel: "M\u1EDF Trung t\xE2m Th\xF4ng b\xE1o",
      metadataItems: [
        { label: "T\xE0i kho\u1EA3n g\u1EEDi", value: authResult?.connectedEmail || "Gmail C\xE1 Nh\xE2n", isBold: true },
        { label: "H\u1ED9p th\u01B0 nh\u1EADn", value: recipient },
        { label: "Th\u1EDDi gian ki\u1EC3m tra", value: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
        { label: "Ph\u01B0\u01A1ng th\u1EE9c x\xE1c th\u1EF1c", value: "Google OAuth 2.0 (Refresh Token)" }
      ],
      appBaseUrl: appUrl
    });
    if (authResult) {
      try {
        await authResult.transporter.sendMail({
          from: `"LifeOS Assistant" <${authResult.connectedEmail}>`,
          to: recipient,
          subject: "\u26A1 [LifeOS] Ki\u1EC3m tra k\u1EBFt n\u1ED1i Gmail OAuth th\xE0nh c\xF4ng",
          html: testHtml
        });
        await prisma.userEmailIntegration.update({
          where: { userId },
          data: { lastVerifiedAt: /* @__PURE__ */ new Date(), lastError: null }
        });
        return {
          success: true,
          message: `Email ki\u1EC3m tra \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng t\u1EEB h\u1ED9p th\u01B0 ${authResult.connectedEmail} t\u1EDBi ${recipient}!`
        };
      } catch (err) {
        console.error("[GmailOAuth] Test send error:", err);
        await prisma.userEmailIntegration.update({
          where: { userId },
          data: { lastError: err.message }
        });
        return {
          success: false,
          message: `L\u1ED7i khi g\u1EEDi email qua Gmail OAuth: ${err.message}`
        };
      }
    }
    try {
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_mailer(), mailer_exports));
      const res = await sendEmail2(
        recipient,
        "\u26A1 [LifeOS] Ki\u1EC3m tra k\xEAnh Email th\xF4ng b\xE1o h\u1EC7 th\u1ED1ng",
        testHtml
      );
      return {
        success: res.sent,
        message: res.sent ? `Email ki\u1EC3m tra \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi th\xE0nh c\xF4ng qua k\xEAnh h\u1EC7 th\u1ED1ng t\u1EDBi ${recipient}!` : res.message || "H\u1EC7 th\u1ED1ng ch\u01B0a c\u1EA5u h\xECnh d\u1ECBch v\u1EE5 g\u1EEDi email."
      };
    } catch (e) {
      return { success: false, message: `L\u1ED7i g\u1EEDi email ki\u1EC3m tra: ${e.message}` };
    }
  }
};
var gmailOAuthService = new GmailOAuthService();

// src/backend/services/notification/providers/email.provider.ts
init_mailer();
init_emailQueue_service();
var EmailNotificationProvider = class {
  constructor() {
    this.channel = "email";
  }
  async send(delivery, userContext) {
    const recipientEmail = delivery.recipient || userContext.email;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return {
        success: false,
        channel: "email",
        deliveryId: delivery.id,
        error: "\u0110\u1ECBa ch\u1EC9 email ng\u01B0\u1EDDi nh\u1EADn kh\xF4ng h\u1EE3p l\u1EC7."
      };
    }
    let metaObj = {};
    try {
      if (delivery.metadata) {
        metaObj = JSON.parse(delivery.metadata);
      }
    } catch (e) {
    }
    const appUrl = (process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "");
    const metadataItems = [];
    if (metaObj.eventDate) {
      metadataItems.push({ label: "Ng\xE0y di\u1EC5n ra", value: metaObj.eventDate, isBold: true });
    }
    if (metaObj.eventTime) {
      metadataItems.push({ label: "Th\u1EDDi gian", value: metaObj.eventTime, isBold: true });
    }
    if (metaObj.dueDate) {
      metadataItems.push({ label: "H\u1EA1n ch\xF3t", value: metaObj.dueDate, isBold: true });
    }
    if (metaObj.taskStatus) {
      metadataItems.push({ label: "Tr\u1EA1ng th\xE1i", value: metaObj.taskStatus });
    }
    if (metaObj.location) {
      metadataItems.push({ label: "\u0110\u1ECBa \u0111i\u1EC3m", value: metaObj.location });
    }
    const emailHtml = buildNotificationEmailHtml({
      recipientName: userContext.name || "B\u1EA1n",
      headline: delivery.title,
      bodyHtml: delivery.content,
      categoryLabel: metaObj.categoryLabel || "LifeOS Reminder",
      categoryColor: metaObj.categoryColor || "#10B981",
      priority: delivery.priority,
      actionUrl: delivery.actionUrl || `${appUrl}/?view=dashboard`,
      actionLabel: delivery.actionLabel || "Xem tr\xEAn LifeOS",
      metadataItems,
      appBaseUrl: appUrl
    });
    const emailSubject = delivery.subject || `\u{1F514} [LifeOS] ${delivery.title}`;
    const oauthTransporter = await gmailOAuthService.createOAuthTransporter(delivery.userId);
    if (oauthTransporter) {
      try {
        await oauthTransporter.transporter.sendMail({
          from: `"LifeOS Assistant" <${oauthTransporter.connectedEmail}>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml
        });
        return {
          success: true,
          channel: "email",
          deliveryId: delivery.id,
          details: {
            provider: "gmail_oauth",
            sender: oauthTransporter.connectedEmail,
            recipient: recipientEmail
          }
        };
      } catch (oauthErr) {
        console.warn(`[EmailProvider] Personal Gmail OAuth delivery failed for user ${delivery.userId}:`, oauthErr.message);
      }
    }
    try {
      const queueId = await emailQueueService.enqueue({
        recipient: recipientEmail,
        subject: emailSubject,
        htmlBody: emailHtml,
        eventType: "EVENT_REMINDER_NOTIFICATION",
        metadata: {
          deliveryId: delivery.id,
          userId: delivery.userId,
          priority: delivery.priority
        }
      });
      return {
        success: true,
        channel: "email",
        deliveryId: delivery.id,
        details: {
          provider: "email_queue",
          queueId,
          recipient: recipientEmail
        }
      };
    } catch (queueErr) {
      console.warn("[EmailProvider] Queue enqueue failed, fallback to direct sendEmail:", queueErr);
      try {
        const systemRes = await sendEmail(recipientEmail, emailSubject, emailHtml);
        if (systemRes.sent) {
          return {
            success: true,
            channel: "email",
            deliveryId: delivery.id,
            details: {
              provider: "system_smtp",
              recipient: recipientEmail,
              message: systemRes.message
            }
          };
        } else {
          return {
            success: false,
            channel: "email",
            deliveryId: delivery.id,
            error: systemRes.message || "Kh\xF4ng th\u1EC3 g\u1EEDi qua k\xEAnh email h\u1EC7 th\u1ED1ng."
          };
        }
      } catch (smtpErr) {
        console.error("[EmailProvider] System email send error:", smtpErr);
        return {
          success: false,
          channel: "email",
          deliveryId: delivery.id,
          error: smtpErr.message || "L\u1ED7i g\u1EEDi email kh\xF4ng x\xE1c \u0111\u1ECBnh."
        };
      }
    }
  }
};
var emailProvider = new EmailNotificationProvider();

// src/backend/services/notification/notificationEngine.service.ts
var NotificationEngineService = class {
  constructor() {
    this.providers = /* @__PURE__ */ new Map();
    this.registerProvider(inAppProvider);
    this.registerProvider(emailProvider);
  }
  registerProvider(provider) {
    this.providers.set(provider.channel, provider);
  }
  /**
   * Retrieves or initializes default notification preferences for a user
   */
  async getUserPreferences(userId) {
    const prisma = getPrisma();
    let pref = await prisma.userNotificationPreference.findUnique({
      where: { userId }
    });
    if (!pref) {
      try {
        pref = await prisma.userNotificationPreference.create({
          data: {
            userId,
            enabled: true,
            inAppEnabled: true,
            emailEnabled: true,
            timezone: "Asia/Ho_Chi_Minh",
            quietHoursEnabled: false,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00",
            quietHoursBypassCritical: true
          }
        });
      } catch (e) {
        pref = await prisma.userNotificationPreference.findUnique({ where: { userId } });
      }
    }
    return pref;
  }
  /**
   * Retrieves or initializes rule for a specific event type for a user
   */
  async getUserRule(userId, eventType) {
    const prisma = getPrisma();
    const systemRule = SYSTEM_NOTIFICATION_RULES[eventType];
    if (!systemRule) return null;
    let rule = await prisma.userNotificationRule.findUnique({
      where: {
        userId_eventType: { userId, eventType }
      }
    });
    if (!rule) {
      try {
        rule = await prisma.userNotificationRule.create({
          data: {
            userId,
            eventType,
            enabled: systemRule.defaultEnabled,
            timingOffsetMinutes: systemRule.defaultTimingMinutes,
            priority: systemRule.defaultPriority,
            channels: "in_app,email"
          }
        });
      } catch (e) {
        rule = await prisma.userNotificationRule.findUnique({
          where: { userId_eventType: { userId, eventType } }
        });
      }
    }
    return rule;
  }
  /**
   * Checks if current time is within user's configured Quiet Hours
   */
  isWithinQuietHours(pref, checkDate = /* @__PURE__ */ new Date()) {
    if (!pref.quietHoursEnabled) return false;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: pref.timezone || "Asia/Ho_Chi_Minh",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      });
      const parts = formatter.formatToParts(checkDate);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentMinutes = hour * 60 + minute;
      const [startH, startM] = (pref.quietHoursStart || "22:00").split(":").map(Number);
      const [endH, endM] = (pref.quietHoursEnd || "07:00").split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (e) {
      return false;
    }
  }
  /**
   * Calculates the exact date when quiet hours will end for scheduling deferred notifications
   */
  calculateQuietHoursEndTime(pref, fromDate = /* @__PURE__ */ new Date()) {
    try {
      const [endH, endM] = (pref.quietHoursEnd || "07:00").split(":").map(Number);
      const deferred = new Date(fromDate);
      deferred.setHours(endH, endM + 1, 0, 0);
      if (deferred.getTime() <= fromDate.getTime()) {
        deferred.setDate(deferred.getDate() + 1);
      }
      return deferred;
    } catch (e) {
      return new Date(fromDate.getTime() + 60 * 60 * 1e3);
    }
  }
  /**
   * Main entry point to emit a notification event into the Engine
   */
  async emitEvent(event) {
    const prisma = getPrisma();
    const result = { delivered: 0, skipped: 0, errors: [] };
    try {
      const [user, pref, rule] = await Promise.all([
        prisma.user.findUnique({
          where: { id: event.userId },
          select: { id: true, name: true, email: true }
        }),
        this.getUserPreferences(event.userId),
        this.getUserRule(event.userId, event.eventType)
      ]);
      if (!user) {
        result.errors.push("User not found");
        return result;
      }
      if (!pref.enabled) {
        result.skipped++;
        return result;
      }
      if (rule && !rule.enabled) {
        result.skipped++;
        return result;
      }
      const priority = event.priority || rule?.priority || "NORMAL";
      const configuredChannels = (rule?.channels || "in_app,email").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      const targetChannels = [];
      if (configuredChannels.includes("in_app") && pref.inAppEnabled) {
        targetChannels.push("in_app");
      }
      if (configuredChannels.includes("email") && pref.emailEnabled && (user.email || pref.recipientEmail)) {
        targetChannels.push("email");
      }
      if (targetChannels.length === 0) {
        result.skipped++;
        return result;
      }
      const now = /* @__PURE__ */ new Date();
      let scheduledFor = event.scheduledFor || now;
      const inQuietHours = this.isWithinQuietHours(pref, scheduledFor);
      const bypassQuietHours = priority === "CRITICAL" && pref.quietHoursBypassCritical;
      const triggerBucket = event.triggerBucket || now.toISOString().substring(0, 16);
      for (const channel of targetChannels) {
        const idempotencyKey = `${event.userId}:${event.eventType}:${event.entityId || "gen"}:${triggerBucket}:${channel}`;
        let channelScheduledFor = scheduledFor;
        if (channel === "email" && inQuietHours && !bypassQuietHours) {
          channelScheduledFor = this.calculateQuietHoursEndTime(pref, scheduledFor);
        }
        const recipient = channel === "email" ? pref.recipientEmail || user.email : event.userId;
        let delivery = null;
        try {
          delivery = await prisma.notificationDelivery.create({
            data: {
              userId: event.userId,
              eventType: event.eventType,
              entityId: event.entityId,
              channel,
              recipient,
              title: event.title,
              content: event.message,
              priority,
              status: "PENDING",
              idempotencyKey,
              scheduledFor: channelScheduledFor,
              metadata: JSON.stringify({
                category: event.category || "SYSTEM",
                actionUrl: event.actionUrl,
                actionLabel: event.actionLabel,
                triggerBucket,
                ...event.metadata || {}
              })
            }
          });
        } catch (dbErr) {
          if (dbErr.code === "P2002" || dbErr.message?.includes("Unique constraint")) {
            result.skipped++;
            continue;
          }
          console.error("[NotificationEngine] Delivery record creation error:", dbErr);
          result.errors.push(dbErr.message);
          continue;
        }
        if (channelScheduledFor.getTime() <= now.getTime() + 5e3) {
          await this.dispatchDelivery(delivery, user);
          result.delivered++;
        } else {
          result.delivered++;
        }
      }
      return result;
    } catch (err) {
      console.error("[NotificationEngine] emitEvent unexpected error:", err);
      result.errors.push(err.message);
      return result;
    }
  }
  /**
   * Dispatches a single delivery through its registered provider
   */
  async dispatchDelivery(delivery, userContext) {
    const prisma = getPrisma();
    const provider = this.providers.get(delivery.channel);
    if (!provider) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SKIPPED",
          errorMessage: `No provider registered for channel '${delivery.channel}'`
        }
      });
      return;
    }
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "PROCESSING" }
    });
    if (!userContext) {
      const u = await prisma.user.findUnique({
        where: { id: delivery.userId },
        select: { email: true, name: true }
      });
      userContext = u || { email: delivery.recipient, name: "B\u1EA1n" };
    }
    let metaObj = {};
    try {
      if (delivery.metadata) metaObj = JSON.parse(delivery.metadata);
    } catch (e) {
    }
    const res = await provider.send(
      {
        id: delivery.id,
        userId: delivery.userId,
        recipient: delivery.recipient,
        subject: delivery.subject,
        title: delivery.title,
        content: delivery.content,
        priority: delivery.priority,
        actionUrl: metaObj.actionUrl,
        actionLabel: metaObj.actionLabel,
        metadata: delivery.metadata
      },
      userContext
    );
    const now = /* @__PURE__ */ new Date();
    if (res.success) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          sentAt: now,
          errorMessage: null,
          notificationId: res.details?.notificationId || null
        }
      });
    } else {
      const nextRetryCount = (delivery.retryCount || 0) + 1;
      const maxRetries = delivery.maxRetries || 3;
      if (nextRetryCount < maxRetries) {
        const delayMs = Math.pow(4, nextRetryCount) * 3e4;
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "RETRYING",
            retryCount: nextRetryCount,
            nextRetryAt: new Date(now.getTime() + delayMs),
            errorMessage: res.error || "Delivery failed"
          }
        });
      } else {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            failedAt: now,
            errorMessage: res.error || "Delivery failed after maximum retries"
          }
        });
      }
    }
  }
  /**
   * Processes queue of pending and retrying deliveries
   */
  async processPendingDeliveries(batchSize = 50) {
    const prisma = getPrisma();
    const now = /* @__PURE__ */ new Date();
    try {
      const pendingDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          OR: [
            {
              status: "PENDING",
              scheduledFor: { lte: now }
            },
            {
              status: "RETRYING",
              nextRetryAt: { lte: now }
            }
          ]
        },
        take: batchSize,
        orderBy: { scheduledFor: "asc" }
      });
      if (pendingDeliveries.length === 0) return 0;
      for (const delivery of pendingDeliveries) {
        try {
          await this.dispatchDelivery(delivery);
        } catch (deliveryErr) {
          console.error(`[NotificationEngine] Error processing delivery ${delivery.id}:`, deliveryErr);
        }
      }
      return pendingDeliveries.length;
    } catch (err) {
      console.error("[NotificationEngine] processPendingDeliveries failed:", err);
      return 0;
    }
  }
};
var notificationEngine = new NotificationEngineService();

// src/backend/services/notification/eventReminderEngine.ts
init_db();
var REMINDER_MILESTONES = [
  {
    key: "T_MINUS_5H",
    offsetMinutes: -300,
    // 5 hours prior
    label: "5 gi\u1EDD",
    eventType: "CALENDAR_UPCOMING",
    priority: "HIGH",
    title: (title, isTask) => isTask ? `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 5 gi\u1EDD: "${title}"` : `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 5 gi\u1EDD: "${title}"`,
    message: (title, isTask) => isTask ? `Nhi\u1EC7m v\u1EE5 s\u1EBD b\u1EAFt \u0111\u1EA7u sau 5 gi\u1EDD.` : `S\u1EF1 ki\u1EC7n s\u1EBD b\u1EAFt \u0111\u1EA7u sau 5 gi\u1EDD.`
  },
  {
    key: "T_MINUS_3H",
    offsetMinutes: -180,
    // 3 hours prior
    label: "3 gi\u1EDD",
    eventType: "CALENDAR_UPCOMING",
    priority: "HIGH",
    title: (title, isTask) => isTask ? `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 3 gi\u1EDD: "${title}"` : `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 3 gi\u1EDD: "${title}"`,
    message: (title, isTask) => isTask ? `Nhi\u1EC7m v\u1EE5 s\u1EBD b\u1EAFt \u0111\u1EA7u sau 3 gi\u1EDD.` : `S\u1EF1 ki\u1EC7n s\u1EBD b\u1EAFt \u0111\u1EA7u sau 3 gi\u1EDD.`
  },
  {
    key: "T_MINUS_30M",
    offsetMinutes: -30,
    // 30 minutes prior
    label: "30 ph\xFAt",
    eventType: "CALENDAR_UPCOMING",
    priority: "HIGH",
    title: (title, isTask) => isTask ? `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 30 ph\xFAt: "${title}"` : `\u23F0 Nh\u1EAFc nh\u1EDF tr\u01B0\u1EDBc 30 ph\xFAt: "${title}"`,
    message: (title, isTask) => isTask ? `Nhi\u1EC7m v\u1EE5 s\u1EBD b\u1EAFt \u0111\u1EA7u sau 30 ph\xFAt.` : `S\u1EF1 ki\u1EC7n s\u1EBD b\u1EAFt \u0111\u1EA7u sau 30 ph\xFAt.`
  },
  {
    key: "T_ZERO",
    offsetMinutes: 0,
    // At event start
    label: "B\u1EAFt \u0111\u1EA7u",
    eventType: "CALENDAR_STARTING",
    priority: "HIGH",
    title: (title, isTask) => isTask ? `\u{1F3AF} Nhi\u1EC7m v\u1EE5 \u0111\xE3 b\u1EAFt \u0111\u1EA7u: "${title}"` : `\u{1F3AF} S\u1EF1 ki\u1EC7n \u0111\xE3 b\u1EAFt \u0111\u1EA7u: "${title}"`,
    message: (title, isTask) => isTask ? `Nhi\u1EC7m v\u1EE5 \u0111\xE3 b\u1EAFt \u0111\u1EA7u.` : `S\u1EF1 ki\u1EC7n \u0111\xE3 b\u1EAFt \u0111\u1EA7u.`
  }
];
function parseDateTimeInUserTz(dateStr, timeStr, timeZone = "Asia/Ho_Chi_Minh") {
  if (!dateStr || typeof dateStr !== "string") return null;
  let cleanDate = dateStr.trim();
  let cleanTime = timeStr ? timeStr.trim() : "";
  if (cleanDate.includes("T") || cleanDate.includes(" ")) {
    const sep = cleanDate.includes("T") ? "T" : " ";
    const parts = cleanDate.split(sep);
    cleanDate = parts[0];
    if (!cleanTime && parts[1]) {
      cleanTime = parts[1].replace(/Z$/, "").slice(0, 5);
    }
  }
  const dateParts = cleanDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!dateParts) return null;
  const year = parseInt(dateParts[1], 10);
  const month = parseInt(dateParts[2], 10);
  const day = parseInt(dateParts[3], 10);
  let hour = 0;
  let minute = 0;
  if (cleanTime) {
    const timeParts = cleanTime.match(/^(\d{1,2}):(\d{1,2})/);
    if (timeParts) {
      hour = parseInt(timeParts[1], 10);
      minute = parseInt(timeParts[2], 10);
    }
  }
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return null;
  }
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(utcGuess);
    const tzYear = parseInt(parts.find((p) => p.type === "year")?.value || `${year}`, 10);
    const tzMonth = parseInt(parts.find((p) => p.type === "month")?.value || `${month}`, 10);
    const tzDay = parseInt(parts.find((p) => p.type === "day")?.value || `${day}`, 10);
    let tzHour = parseInt(parts.find((p) => p.type === "hour")?.value || `${hour}`, 10);
    if (tzHour === 24) tzHour = 0;
    const tzMin = parseInt(parts.find((p) => p.type === "minute")?.value || `${minute}`, 10);
    const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0);
    const diffMs = tzAsUtc - utcGuess.getTime();
    return new Date(utcGuess.getTime() - diffMs);
  } catch (tzErr) {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - 7 * 3600 * 1e3);
  }
}
function isEntityActive(entity) {
  if (!entity) return false;
  if (entity.deletedAt) return false;
  const rawStatus = (entity.status || "").toString().toLowerCase().trim();
  const finishedStatuses = [
    "\u0111\xE3 xong",
    "\u0111\xE3 h\u1EE7y",
    "ho\xE0n th\xE0nh",
    "h\u1EE7y",
    "done",
    "completed",
    "cancelled",
    "canceled"
  ];
  return !finishedStatuses.includes(rawStatus);
}
async function cancelEntityReminders(entityId) {
  if (!entityId) return 0;
  const prisma = getPrisma();
  try {
    const deleted = await prisma.notificationDelivery.deleteMany({
      where: {
        entityId,
        status: "PENDING"
      }
    });
    return deleted.count;
  } catch (err) {
    console.warn(`[EventReminderEngine] cancelEntityReminders failed for ${entityId}:`, err.message);
    return 0;
  }
}
async function scheduleEntityReminders(userId, entityType, entity, now = /* @__PURE__ */ new Date()) {
  const result = { scheduled: 0, skipped: 0 };
  if (!userId || !entity || !entity.id) return result;
  if (!isEntityActive(entity)) {
    await cancelEntityReminders(entity.id);
    return result;
  }
  const pref = await notificationEngine.getUserPreferences(userId);
  const timeZone = pref?.timezone || "Asia/Ho_Chi_Minh";
  let startUtc = null;
  const isTask = entityType === "task";
  if (isTask) {
    const rawTime = entity.startDate || entity.dueDate;
    if (!rawTime) return result;
    startUtc = parseDateTimeInUserTz(rawTime, null, timeZone);
  } else {
    if (!entity.date || !entity.startTime) return result;
    startUtc = parseDateTimeInUserTz(entity.date, entity.startTime, timeZone);
  }
  if (!startUtc || isNaN(startUtc.getTime())) {
    return result;
  }
  const safeTitle = (entity.title || (isTask ? "Nhi\u1EC7m v\u1EE5" : "S\u1EF1 ki\u1EC7n")).trim();
  const appBaseUrl = (process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "");
  const actionUrl = isTask ? `${appBaseUrl}/?view=tasks` : `${appBaseUrl}/?view=calendar`;
  const actionLabel = isTask ? "Xem nhi\u1EC7m v\u1EE5" : "M\u1EDF l\u1ECBch bi\u1EC3u";
  const startIso = startUtc.toISOString();
  for (const milestone of REMINDER_MILESTONES) {
    const scheduledFor = new Date(startUtc.getTime() + milestone.offsetMinutes * 60 * 1e3);
    const cutoff = milestone.key === "T_ZERO" ? now.getTime() - 2 * 60 * 1e3 : now.getTime();
    if (scheduledFor.getTime() <= cutoff) {
      result.skipped++;
      continue;
    }
    const triggerBucket = `${entity.id}_${milestone.key}_${startIso}`;
    const titleText = milestone.title(safeTitle, isTask);
    const messageText = milestone.message(safeTitle, isTask);
    try {
      await notificationEngine.emitEvent({
        userId,
        eventType: milestone.eventType,
        entityId: entity.id,
        title: titleText,
        message: messageText,
        priority: milestone.priority,
        category: isTask ? "TASK" : "CALENDAR",
        actionUrl,
        actionLabel,
        scheduledFor,
        triggerBucket,
        metadata: {
          entityType,
          milestoneKey: milestone.key,
          offsetMinutes: milestone.offsetMinutes,
          eventTitle: safeTitle,
          startUtc: startIso,
          timeZone,
          categoryLabel: isTask ? "Nhi\u1EC7m v\u1EE5 & K\u1EBF ho\u1EA1ch" : "L\u1ECBch bi\u1EC3u & S\u1EF1 ki\u1EC7n",
          categoryColor: isTask ? "#6366F1" : "#10B981",
          eventDate: entity.date || entity.startDate?.slice(0, 10) || "",
          eventTime: entity.startTime || ""
        }
      });
      result.scheduled++;
    } catch (emitErr) {
      console.warn(`[EventReminderEngine] Failed to emit reminder ${milestone.key} for ${entity.id}:`, emitErr.message);
    }
  }
  return result;
}
async function rescheduleEntityReminders(userId, entityType, entity) {
  const cancelled = await cancelEntityReminders(entity.id);
  const { scheduled } = await scheduleEntityReminders(userId, entityType, entity);
  return { scheduled, cancelled };
}
async function syncUpcomingReminders(now = /* @__PURE__ */ new Date()) {
  const prisma = getPrisma();
  const result = { syncedEvents: 0, syncedTasks: 0 };
  try {
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1e3).toISOString().slice(0, 10);
    const dayAfter = new Date(now.getTime() + 48 * 3600 * 1e3).toISOString().slice(0, 10);
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        date: { in: [todayStr, tomorrow, dayAfter] },
        startTime: { not: null }
      },
      take: 200
    });
    for (const evt of upcomingEvents) {
      if (!evt.userId || !evt.startTime) continue;
      if (!isEntityActive(evt)) {
        await cancelEntityReminders(evt.id);
      } else {
        await scheduleEntityReminders(evt.userId, "calendar", evt, now);
        result.syncedEvents++;
      }
    }
    const upcomingTasks = await prisma.task.findMany({
      where: {
        OR: [
          { startDate: { not: null } },
          { dueDate: { not: null } }
        ]
      },
      take: 200
    });
    for (const task of upcomingTasks) {
      if (!task.userId) continue;
      if (!isEntityActive(task)) {
        await cancelEntityReminders(task.id);
      } else {
        const rawTime = task.startDate || task.dueDate;
        if (rawTime && (rawTime.includes(todayStr) || rawTime.includes(tomorrow) || rawTime.includes(dayAfter))) {
          await scheduleEntityReminders(task.userId, "task", task, now);
          result.syncedTasks++;
        }
      }
    }
  } catch (syncErr) {
    console.warn("[EventReminderEngine] syncUpcomingReminders error:", syncErr.message);
  }
  return result;
}

// src/backend/routes/api.ts
init_emailQueue_service();

// src/backend/security/idempotency.middleware.ts
init_db();
import crypto3 from "crypto";
function idempotencyMiddleware(options) {
  const ttlHours = options?.ttlHours || 24;
  const autoHashPayload = options?.autoHashPayload ?? true;
  return async (req, res, next) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      return next();
    }
    const explicitKey = req.headers["x-idempotency-key"] || req.headers["idempotency-key"];
    let idempotencyKey = explicitKey ? String(explicitKey).trim() : null;
    const userId = req.userId || "anonymous";
    if (!idempotencyKey && autoHashPayload && req.body && Object.keys(req.body).length > 0) {
      const payloadHash = crypto3.createHash("sha256").update(JSON.stringify(req.body)).digest("hex").substring(0, 32);
      idempotencyKey = `auto_${userId}_${req.path.replace(/\//g, "_")}_${payloadHash}`;
    }
    if (!idempotencyKey) {
      return next();
    }
    const prisma = getPrisma();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1e3);
    try {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT response_code, response_body, expires_at FROM idempotency_keys WHERE key = $1 LIMIT 1`,
        idempotencyKey
      );
      if (existing.length > 0) {
        const record = existing[0];
        if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) {
          await prisma.$queryRawUnsafe(`DELETE FROM idempotency_keys WHERE key = $1`, idempotencyKey).catch(() => {
          });
        } else {
          if (record.response_code === 0) {
            return res.status(409).json({
              success: false,
              error: {
                code: "CONCURRENT_REQUEST",
                message: "Y\xEAu c\u1EA7u n\xE0y \u0111ang \u0111\u01B0\u1EE3c x\u1EED l\xFD tr\xEAn h\u1EC7 th\u1ED1ng. Vui l\xF2ng ch\u1EDD v\xE0i gi\xE2y."
              },
              message: "Y\xEAu c\u1EA7u n\xE0y \u0111ang \u0111\u01B0\u1EE3c x\u1EED l\xFD tr\xEAn h\u1EC7 th\u1ED1ng. Vui l\xF2ng ch\u1EDD v\xE0i gi\xE2y."
            });
          }
          res.setHeader("X-Idempotency-Replayed", "true");
          res.status(record.response_code);
          try {
            const parsed = JSON.parse(record.response_body);
            return res.json(parsed);
          } catch {
            return res.send(record.response_body);
          }
        }
      }
      const keyId = `idm_${crypto3.randomBytes(10).toString("hex")}`;
      const reqHash = crypto3.createHash("md5").update(JSON.stringify(req.body || {})).digest("hex");
      await prisma.$queryRawUnsafe(
        `INSERT INTO idempotency_keys (id, key, user_id, endpoint, request_hash, response_code, response_body, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, 0, '', NOW(), $6)
         ON CONFLICT (key) DO NOTHING`,
        keyId,
        idempotencyKey,
        userId,
        req.originalUrl || req.path,
        reqHash,
        expiresAt
      ).catch(() => {
      });
      const originalSend = res.send.bind(res);
      res.send = function(body) {
        const statusCode = res.statusCode;
        if (statusCode >= 200 && statusCode < 500) {
          const stringified = typeof body === "string" ? body : JSON.stringify(body);
          prisma.$queryRawUnsafe(
            `UPDATE idempotency_keys SET response_code = $1, response_body = $2 WHERE key = $3`,
            statusCode,
            stringified,
            idempotencyKey
          ).catch((e) => console.warn("Idempotency update error:", e.message));
        } else {
          prisma.$queryRawUnsafe(`DELETE FROM idempotency_keys WHERE key = $1`, idempotencyKey).catch(() => {
          });
        }
        return originalSend(body);
      };
      next();
    } catch (err) {
      console.warn("Idempotency middleware warning:", err.message);
      next();
    }
  };
}

// src/backend/routes/api.ts
var apiRouter = Router6();
apiRouter.use("/r2", r2Router);
apiRouter.use("/custom-modules", customModulesRouter);
apiRouter.use("/vocab", vocabRouter);
apiRouter.get("/languages", async (req, res) => {
  try {
    const allLanguages = await getSystemLanguagesConfig();
    const activeLanguages = allLanguages.filter((l) => l.status === "ACTIVE");
    const defaultLang = allLanguages.find((l) => l.isDefault)?.code || "vi";
    res.json({
      success: true,
      languages: activeLanguages,
      allLanguages,
      defaultLanguage: defaultLang
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/payments/plans", async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans(false);
    res.json({
      success: true,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        badge: p.badge || (p.type === "TEAM" ? "D\xE0nh cho \u0110\u1ED9i ng\u0169" : p.id === "PERSONAL_3M" ? "Ph\u1ED5 bi\u1EBFn nh\u1EA5t" : "Ti\u1EBFt ki\u1EC7m"),
        description: p.description,
        durationDays: p.durationDays,
        price: p.price,
        monthlyPrice: p.price,
        yearlyPrice: p.yearlyPrice || 0,
        billingCycle: p.billingCycle,
        maxTeamMembers: p.maxTeamMembers || (p.type === "TEAM" ? 5 : 0),
        pricing: {
          monthly: {
            price: p.price,
            displayPrice: `${p.price.toLocaleString("vi-VN")} \u20AB`,
            period: p.billingCycle
          },
          yearly: {
            price: p.yearlyPrice || p.price,
            displayPrice: `${(p.yearlyPrice || p.price).toLocaleString("vi-VN")} \u20AB`,
            period: p.yearlyPrice ? "1 n\u0103m" : p.billingCycle
          }
        },
        benefits: p.features,
        quota: p.quota || (p.type === "TEAM" ? "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn" : "S\u1EED d\u1EE5ng c\xE1 nh\xE2n to\xE0n di\u1EC7n")
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/notifications/gmail/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state) {
    const errorMsg = error || "Thi\u1EBFu tham s\u1ED1 x\xE1c th\u1EF1c OAuth t\u1EEB Google.";
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>K\u1EBFt n\u1ED1i Gmail th\u1EA5t b\u1EA1i</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #FFF1F2; color: #9F1239;">
          <h2>\u274C K\u1EBFt n\u1ED1i Google OAuth th\u1EA5t b\u1EA1i</h2>
          <p>${errorMsg}</p>
          <button onclick="window.close()" style="padding: 10px 20px; border-radius: 8px; background: #E11D48; color: white; border: none; cursor: pointer;">\u0110\xF3ng c\u1EEDa s\u1ED5</button>
        </body>
      </html>
    `);
    return;
  }
  const result = await gmailOAuthService.handleCallback(code, state);
  if (result.success) {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>K\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #F0FDF4; color: #166534;">
          <div style="font-size: 48px; margin-bottom: 12px;">\u2705</div>
          <h2 style="margin: 0 0 10px 0;">K\u1EBFt n\u1ED1i Gmail th\xE0nh c\xF4ng!</h2>
          <p>T\xE0i kho\u1EA3n: <strong>${result.email}</strong> \u0111\xE3 \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt v\u1EDBi H\u1EC7 th\u1ED1ng Th\xF4ng b\xE1o LifeOS.</p>
          <p style="font-size: 13px; color: #15803D;">C\u1EEDa s\u1ED5 n\xE0y s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111\xF3ng sau 2.5 gi\xE2y...</p>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_CONNECTED', email: '${result.email}' }, '*');
              }
            } catch (e) {}
            setTimeout(() => { window.close(); }, 2500);
          </script>
        </body>
      </html>
    `);
    return;
  } else {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>K\u1EBFt n\u1ED1i Gmail th\u1EA5t b\u1EA1i</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #FFF1F2; color: #9F1239;">
          <h2>\u274C Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t li\xEAn k\u1EBFt Gmail</h2>
          <p>${result.error || "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra trong qu\xE1 tr\xECnh trao \u0111\u1ED5i token v\u1EDBi Google."}</p>
          <button onclick="window.close()" style="padding: 10px 20px; border-radius: 8px; background: #E11D48; color: white; border: none; cursor: pointer;">\u0110\xF3ng c\u1EEDa s\u1ED5</button>
        </body>
      </html>
    `);
    return;
  }
});
apiRouter.get("/health", async (req, res) => {
  let dbLive = false;
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    dbLive = true;
  } catch (e) {
    dbLive = false;
  }
  res.status(dbLive ? 200 : 503).json({
    status: dbLive ? "ok" : "degraded",
    database: dbLive ? "connected" : "disconnected",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.get("/ready", async (req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", database: "ready" });
  } catch (e) {
    res.status(503).json({ status: "not_ready", database: "unavailable" });
  }
});
apiRouter.get("/settings/global-free-mode", async (req, res) => {
  try {
    const enabled = await subscriptionService.isGlobalFreeMode();
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, enabled: false, message: err.message });
  }
});
apiRouter.get("/auth/google", (req, res) => res.redirect("/api/auth/google"));
apiRouter.get("/auth/google/callback", (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  res.redirect(qs ? "/api/auth/google/callback?" + qs : "/api/auth/google/callback");
});
apiRouter.use(requireAuth);
apiRouter.use(idempotencyMiddleware({ ttlHours: 24, autoHashPayload: true }));
apiRouter.use(async (req, res, next) => {
  const path3 = req.path;
  const method = req.method.toUpperCase();
  const isAlwaysAllowed = path3.startsWith("/payments") || path3.startsWith("/coupons") || path3.startsWith("/cart") || path3.startsWith("/data/cart") || path3.startsWith("/checkout") || path3.startsWith("/admin") || path3.startsWith("/notifications") || path3.startsWith("/supportTickets") || path3.startsWith("/settings") || path3.startsWith("/languages") || path3.startsWith("/life-harmony") || path3.startsWith("/journey") || path3.startsWith("/progression") || path3.startsWith("/leaderboard") || path3.startsWith("/team/my-team") || path3.startsWith("/team/join") || path3.startsWith("/referrals") || path3.startsWith("/r2/upload-base64") && req.body?.folder === "receipts";
  if (isAlwaysAllowed) {
    return next();
  }
  if (method === "GET") {
    if (path3 === "/data/products" || path3 === "/data/notifications" || path3 === "/data/supportTickets" || path3 === "/data/cart" || path3 === "/data/cartItems" || path3 === "/data/orders") {
      return next();
    }
  }
  return requireActiveSubscription(req, res, next);
});
var ALLOWED_COLLECTIONS = /* @__PURE__ */ new Set([
  "tasks",
  "projects",
  "events",
  "calendarEvents",
  "scheduleBlocks",
  "routines",
  "reminders",
  "focusSessions",
  "focusGoals",
  "financeAccounts",
  "transactions",
  "budgets",
  "savingGoals",
  "debts",
  "recurringTransactions",
  "subjects",
  "studyTopics",
  "studyAssignments",
  "studyExams",
  "studySessions",
  "habits",
  "habitRecords",
  "goals",
  "notes",
  "decisions",
  "decisionRules",
  "automationRules",
  "automationHistory",
  "automationConflicts",
  "products",
  "cart",
  "cartItems",
  "orders",
  "coupons",
  "inbox",
  "supportTickets",
  "notifications"
]);
apiRouter.get("/data/:collection", async (req, res) => {
  const { collection } = req.params;
  const userId = req.userId;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_COLLECTION", message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.` },
      message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.`
    });
    return;
  }
  try {
    if (collection === "products") {
      const templates = await dbService.getSystemTemplates();
      res.json(templates);
      return;
    }
    const items = await dbService.getUserCollection(collection, userId);
    res.json(items);
  } catch (err) {
    console.error(`GET /api/data/${collection} error:`, err);
    res.status(500).json({
      success: false,
      error: { code: "DB_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/templates/:id/apply", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const template = await prisma.systemTemplate.findUnique({
      where: { id }
    });
    if (!template) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu n\xE0y trong h\u1EC7 th\u1ED1ng." });
    }
    const userRole = (req.userRole || "").toUpperCase();
    const userPlan = (req.userPlan || "FREE").toUpperCase();
    const hasPaidPlan = userRole === "ADMIN" || userRole === "SUPERADMIN" || userPlan !== "FREE";
    if (!template.isFree && template.price > 0 && !hasPaidPlan) {
      const hasPurchased = await prisma.order.findFirst({
        where: {
          userId,
          status: "COMPLETED",
          items: { contains: template.id }
        }
      });
      if (!hasPurchased) {
        return res.status(403).json({
          success: false,
          requiresPurchase: true,
          message: "M\u1EABu n\xE0y y\xEAu c\u1EA7u k\xEDch ho\u1EA1t g\xF3i d\u1ECBch v\u1EE5 \u0111\u1EC3 \xE1p d\u1EE5ng."
        });
      }
    }
    const createdSummary = { view: "tasks" };
    if (id === "tpl_para_system" || template.category === "Productivity") {
      const existingProject = await prisma.project.findFirst({
        where: { userId, name: "[P] D\u1EF1 \xE1n \u0111ang tri\u1EC3n khai (Projects)" }
      });
      if (!existingProject) {
        const p1 = await prisma.project.create({
          data: { userId, name: "[P] D\u1EF1 \xE1n \u0111ang tri\u1EC3n khai (Projects)", description: "T\u1ED5 ch\u1EE9c c\xE1c m\u1EE5c ti\xEAu v\xE0 d\u1EF1 \xE1n h\xE0nh \u0111\u1ED9ng theo P.A.R.A", status: "\u0110ang l\xE0m", color: "#2563eb" }
        });
        const p2 = await prisma.project.create({
          data: { userId, name: "[A] Khu v\u1EF1c tr\xE1ch nhi\u1EC7m c\u1ED1t l\xF5i (Areas)", description: "C\xE1c ti\xEAu chu\u1EA9n tr\xE1ch nhi\u1EC7m duy tr\xEC li\xEAn t\u1EE5c", status: "\u0110ang l\xE0m", color: "#10b981" }
        });
        const p3 = await prisma.project.create({
          data: { userId, name: "[R] T\xE0i nguy\xEAn & Ki\u1EBFn th\u1EE9c (Resources)", description: "T\xE0i li\u1EC7u tham kh\u1EA3o, b\xE0i h\u1ECDc v\xE0 nghi\xEAn c\u1EE9u", status: "M\u1EDBi t\u1EA1o", color: "#f59e0b" }
        });
        const p4 = await prisma.project.create({
          data: { userId, name: "[A] Kho l\u01B0u tr\u1EEF ho\xE0n th\xE0nh (Archives)", description: "D\u1EF1 \xE1n \u0111\xE3 xong v\xE0 t\xE0i li\u1EC7u l\u01B0u tr\u1EEF", status: "M\u1EDBi t\u1EA1o", color: "#64748b" }
        });
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        await prisma.task.createMany({
          data: [
            { userId, projectId: p1.id, title: "Li\u1EC7t k\xEA c\xE1c m\u1EE5c ti\xEAu ng\u1EAFn h\u1EA1n v\xE0o th\u01B0 m\u1EE5c Projects", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
            { userId, projectId: p2.id, title: "Thi\u1EBFt l\u1EADp c\xE1c ti\xEAu chu\u1EA9n duy tr\xEC cho Khu v\u1EF1c tr\xE1ch nhi\u1EC7m (Areas)", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
            { userId, projectId: p3.id, title: "L\u01B0u tr\u1EEF t\xE0i li\u1EC7u v\xE0 li\xEAn k\u1EBFt tham kh\u1EA3o v\xE0o Resources", priority: "Th\u1EA5p", status: "\u0110ang l\xE0m", dueDate: todayStr },
            { userId, projectId: p4.id, title: "D\u1ECDn d\u1EB9p v\xE0 l\u01B0u tr\u1EEF c\xE1c d\u1EF1 \xE1n \u0111\xE3 k\u1EBFt th\xFAc v\xE0o Archives", priority: "Th\u1EA5p", status: "\u0110ang ch\u1EDD" }
          ]
        });
        await prisma.note.create({
          data: {
            userId,
            title: "S\u1ED5 tay H\u01B0\u1EDBng d\u1EABn Ph\u01B0\u01A1ng ph\xE1p P.A.R.A (Tiago Forte)",
            content: "### Ph\u01B0\u01A1ng ph\xE1p P.A.R.A:\n- **P - Projects**: C\xE1c d\u1EF1 \xE1n c\xF3 k\u1EBFt qu\u1EA3 v\xE0 th\u1EDDi h\u1EA1n c\u1EE5 th\u1EC3.\n- **A - Areas**: C\xE1c khu v\u1EF1c tr\xE1ch nhi\u1EC7m li\xEAn t\u1EE5c (S\u1EE9c kh\u1ECFe, T\xE0i ch\xEDnh, C\xF4ng vi\u1EC7c).\n- **R - Resources**: T\xE0i li\u1EC7u tham kh\u1EA3o, ghi ch\xFA v\xE0 ch\u1EE7 \u0111\u1EC1 quan t\xE2m.\n- **A - Archives**: Kho l\u01B0u tr\u1EEF c\xE1c d\u1EF1 \xE1n \u0111\xE3 xong.",
            category: "Productivity",
            tags: '["PARA", "Productivity", "Organization"]'
          }
        });
      }
      createdSummary.projects = 4;
      createdSummary.tasks = 4;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_finance_freedom" || template.category === "Finance") {
      const existingAccounts = await prisma.financeAccount.findMany({
        where: { userId }
      });
      const existingNames = new Set(existingAccounts.map((a) => a.name));
      if (!existingNames.has("T\xE0i kho\u1EA3n Thi\u1EBFt y\u1EBFu 50% (Needs)")) {
        await prisma.financeAccount.create({
          data: { userId, name: "T\xE0i kho\u1EA3n Thi\u1EBFt y\u1EBFu 50% (Needs)", type: "Ng\xE2n h\xE0ng", balance: 0, currency: "VND", color: "#2563eb" }
        });
      }
      if (!existingNames.has("T\xE0i kho\u1EA3n Ti\u1EBFt ki\u1EC7m & \u0110\u1EA7u t\u01B0 20% (Savings)")) {
        await prisma.financeAccount.create({
          data: { userId, name: "T\xE0i kho\u1EA3n Ti\u1EBFt ki\u1EC7m & \u0110\u1EA7u t\u01B0 20% (Savings)", type: "\u0110\u1EA7u t\u01B0", balance: 0, currency: "VND", color: "#10b981" }
        });
      }
      if (!existingNames.has("T\xE0i kho\u1EA3n Chi ti\xEAu C\xE1 nh\xE2n 30% (Wants)")) {
        await prisma.financeAccount.create({
          data: { userId, name: "T\xE0i kho\u1EA3n Chi ti\xEAu C\xE1 nh\xE2n 30% (Wants)", type: "Ti\u1EC1n m\u1EB7t", balance: 0, currency: "VND", color: "#f59e0b" }
        });
      }
      const existingBudgets = await prisma.budget.findMany({ where: { userId } });
      const existingCategories = new Set(existingBudgets.map((b) => b.category));
      const newBudgets = [
        { category: "Nhu c\u1EA7u thi\u1EBFt y\u1EBFu (50%)", limit: 1e7, period: "H\xE0ng th\xE1ng", spent: 0 },
        { category: "Ti\u1EBFt ki\u1EC7m & \u0110\u1EA7u t\u01B0 (20%)", limit: 4e6, period: "H\xE0ng th\xE1ng", spent: 0 },
        { category: "Chi ti\xEAu c\xE1 nh\xE2n (30%)", limit: 6e6, period: "H\xE0ng th\xE1ng", spent: 0 }
      ].filter((b) => !existingCategories.has(b.category));
      if (newBudgets.length > 0) {
        await prisma.budget.createMany({
          data: newBudgets.map((b) => ({ ...b, userId }))
        });
      }
      const existingGoal = await prisma.savingGoal.findFirst({
        where: { userId, title: "Qu\u1EF9 kh\u1EA9n c\u1EA5p 6 th\xE1ng chi ti\xEAu" }
      });
      if (!existingGoal) {
        await prisma.savingGoal.create({
          data: {
            userId,
            title: "Qu\u1EF9 kh\u1EA9n c\u1EA5p 6 th\xE1ng chi ti\xEAu",
            targetAmount: 5e7,
            currentAmount: 0
          }
        });
      }
      createdSummary.accounts = 3;
      createdSummary.view = "finance";
    } else if (id === "tpl_atomic_habits" || template.category === "Habits" || template.category === "Health") {
      const existingHabit = await prisma.habit.findFirst({
        where: { userId, name: "\u0110\u1ECDc s\xE1ch ph\xE1t tri\u1EC3n t\u01B0 duy" }
      });
      if (!existingHabit) {
        await prisma.habit.createMany({
          data: [
            { userId, name: "\u0110\u1ECDc s\xE1ch ph\xE1t tri\u1EC3n t\u01B0 duy", category: "Study", target: 20, unitLabel: "trang", unit: "pages", status: "Active" },
            { userId, name: "V\u1EADn \u0111\u1ED9ng th\u1EC3 ch\u1EA5t / Cardio", category: "Health", target: 30, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" },
            { userId, name: "Thi\u1EC1n \u0111\u1ECBnh & Ph\u1EA3n chi\u1EBFu cu\u1ED1i ng\xE0y", category: "Personal", target: 10, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" },
            { userId, name: "U\u1ED1ng \u0111\u1EE7 2 l\xEDt n\u01B0\u1EDBc", category: "Health", target: 2e3, unitLabel: "ml", unit: "ml", status: "Active" }
          ]
        });
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        await prisma.scheduleBlock.createMany({
          data: [
            { userId, date: todayStr, label: "Kh\u1EDFi \u0111\u1ED9ng ng\xE0y m\u1EDBi n\u0103ng su\u1EA5t (Morning Routine)", startTime: "06:30", endTime: "07:30", category: "Health" },
            { userId, date: todayStr, label: "\u0110\xE1nh gi\xE1 & D\u1ECDn d\u1EB9p t\xE2m tr\xED (Evening Reflection)", startTime: "22:00", endTime: "22:30", category: "Mindfulness" }
          ]
        });
      }
      createdSummary.habits = 4;
      createdSummary.view = "habits";
    } else if (id === "tpl_solo_freelancer") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F4BC} Pipeline Kh\xE1ch H\xE0ng & D\u1EF1 \xC1n Freelance", description: "Quy tr\xECnh chu\u1EA9n: Nh\u1EADn brief -> C\u1ECDc 50% -> Th\u1EF1c thi -> Thu n\u1ED1t 50% -> B\xE0n giao", status: "\u0110ang l\xE0m", color: "#6366f1" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "G\u1EEDi b\u1EA3ng b\xE1o gi\xE1 chi ti\u1EBFt v\xE0 h\u1EE3p \u0111\u1ED3ng d\u1ECBch v\u1EE5 cho Kh\xE1ch A", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Thu c\u1ECDc 50% tr\u01B0\u1EDBc khi b\u1EAFt tay v\xE0o th\u1EF1c hi\u1EC7n thi\u1EBFt k\u1EBF/code", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "G\u1EEDi b\u1EA3n nh\xE1p Review V1 & L\u1EA5y ph\u1EA3n h\u1ED3i trong 48h", priority: "Trung b\xECnh", status: "\u0110ang l\xE0m" },
          { userId, projectId: p1.id, title: "Xu\u1EA5t h\xF3a \u0111\u01A1n quy\u1EBFt to\xE1n v\xE0 nh\u1EADn 50% ph\u1EA7n c\xF2n l\u1EA1i tr\u01B0\u1EDBc khi giao source/file g\u1ED1c", priority: "Cao", status: "\u0110ang ch\u1EDD" }
        ]
      });
      await prisma.financeAccount.createMany({
        data: [
          { userId, name: "V\xED Thu\u1EBF & Qu\u1EF9 R\u1EE7i Ro Freelancer (30%)", type: "\u0110\u1EA7u t\u01B0", balance: 0, currency: "VND", color: "#10b981" },
          { userId, name: "V\xED Doanh Thu D\u1EF1 \xC1n Client (50%)", type: "Ng\xE2n h\xE0ng", balance: 0, currency: "VND", color: "#6366f1" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "M\u1EABu Email B\xE1o Gi\xE1 & \u0110i\u1EC1u Kho\u1EA3n Ch\u1ED1ng B\xF9ng K\xE8o Kh\xE1ch H\xE0ng",
          content: "### \u0110i\u1EC1u kho\u1EA3n Freelance Chu\u1EA9n:\n1. **\u0110\u1EB7t c\u1ECDc**: T\u1ED1i thi\u1EC3u 50% t\u1ED5ng gi\xE1 tr\u1ECB d\u1EF1 \xE1n tr\u01B0\u1EDBc khi kickoff.\n2. **S\u1ED1 l\u1EA7n s\u1EEDa**: T\u1ED1i \u0111a 3 v\xF2ng ch\u1EC9nh s\u1EEDa l\u1EDBn. C\xE1c y\xEAu c\u1EA7u ph\xE1t sinh t\xEDnh ph\xED theo gi\u1EDD.\n3. **B\xE0n giao**: B\xE0n giao to\xE0n quy\u1EC1n s\u1EDF h\u1EEFu file g\u1ED1c sau khi thanh to\xE1n 100% chi ph\xED.",
          category: "Management",
          tags: '["Freelancer", "Template", "Contract"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.accounts = 2;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_student_scholarship") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const examDateStr = new Date(Date.now() + 864e5 * 30).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F393} Chi\u1EBFn D\u1ECBch Luy\u1EC7n Thi JLPT/IELTS & GPA 3.6+", description: "Khung \xF4n luy\u1EC7n Spaced Repetition, b\xE0i t\u1EADp l\u1EDBn v\xE0 \u0111\u1ED3 \xE1n h\u1ECDc ph\u1EA7n", status: "\u0110ang l\xE0m", color: "#ec4899" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "H\u1ECDc 20 t\u1EEB v\u1EF1ng Spaced Repetition (L\u1EB7p l\u1EA1i ng\u1EAFt qu\xE3ng)", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Gi\u1EA3i 1 \u0111\u1EC1 thi th\u1EED trong 90 ph\xFAt b\u1EA5m gi\u1EDD nghi\xEAm t\xFAc", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "\u0110\u1ECDc v\xE0 t\xF3m t\u1EAFt 1 b\xE0i b\xE1o nghi\xEAn c\u1EE9u chuy\xEAn ng\xE0nh", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" },
          { userId, projectId: p1.id, title: "Ki\u1EC3m tra l\u1ECBch thi v\xE0 \u0111i\u1EC3m danh chuy\xEAn c\u1EA7n c\xE1c m\xF4n", priority: "Th\u1EA5p", status: "Ch\u01B0a l\xE0m", dueDate: examDateStr }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "H\u1ECDc t\u1EEB v\u1EF1ng 15 ph\xFAt \u0111\u1EA7u ng\xE0y", category: "Study", target: 15, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" },
          { userId, name: "Phi\xEAn Deep Work kh\xF4ng \u0111i\u1EC7n tho\u1EA1i 90p", category: "Study", target: 90, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "B\u1EA3ng Ph\u01B0\u01A1ng Ph\xE1p \xD4n T\u1EADp Active Recall & Pomodoro H\u1ECDc B\xE1",
          content: "### K\u1EF9 thu\u1EADt H\u1ECDc T\u1EADp \u0110\u1EC9nh Cao:\n- **Active Recall**: T\u1EF1 g\u1EA5p s\xE1ch l\u1EA1i v\xE0 vi\u1EBFt ra nh\u1EEFng g\xEC nh\u1EDB \u0111\u01B0\u1EE3c.\n- **Spaced Repetition**: \xD4n l\u1EA1i v\xE0o ng\xE0y 1, ng\xE0y 3, ng\xE0y 7 v\xE0 ng\xE0y 30.\n- **Feynman Technique**: Gi\u1EA3i th\xEDch l\u1EA1i ki\u1EBFn th\u1EE9c cho m\u1ED9t ng\u01B0\u1EDDi kh\xF4ng bi\u1EBFt g\xEC hi\u1EC3u \u0111\u01B0\u1EE3c.",
          category: "Study",
          tags: '["ActiveRecall", "SpacedRepetition", "GPA"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.habits = 2;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_adhd_anti_overthinking") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F9E0} Kh\u1EAFc Ph\u1EE5c Tr\xEC Ho\xE3n & Ch\u1ED1ng Qu\xE1 T\u1EA3i N\xE3o (Anti-ADHD)", description: "Gi\u1EEF t\xE2m tr\xED thanh th\u1EA3n: Ch\u1EC9 t\u1EADp trung v\xE0o 3 vi\u1EC7c/ng\xE0y, lo\u1EA1i b\u1ECF 90% xao nh\xE3ng", status: "\u0110ang l\xE0m", color: "#10b981" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "Vi\u1EC7c 1 c\u1EE7a Daily Trifecta: Nhi\u1EC7m v\u1EE5 quan tr\u1ECDng nh\u1EA5t", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Vi\u1EC7c 2 c\u1EE7a Daily Trifecta: Nhi\u1EC7m v\u1EE5 th\u1EE9 nh\xEC", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Vi\u1EC7c 3 c\u1EE7a Daily Trifecta: Nhi\u1EC7m v\u1EE5 th\u1EE9 ba", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "D\u1ECDn d\u1EB9p m\u1EB7t b\xE0n l\xE0m vi\u1EC7c & \u0111\xF3ng c\xE1c tab tr\xECnh duy\u1EC7t th\u1EEBa (5 ph\xFAt)", priority: "Th\u1EA5p", status: "Ch\u01B0a l\xE0m", dueDate: todayStr }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "Quy t\u1EAFc 2 ph\xFAt: Vi\u1EC7c d\u01B0\u1EDBi 2p l\xE0m ngay", category: "Productivity", target: 1, unitLabel: "l\u1EA7n", unit: "times", status: "Active" },
          { userId, name: "Kh\xF4ng ch\u1EA1m \u0111i\u1EC7n tho\u1EA1i 30p sau th\u1EE9c d\u1EADy", category: "Health", target: 30, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "H\u1ED9p X\u1EA3 T\xE2m Tr\xED (Brain Dump Box) - N\xE9m H\u1EBFt Suy Ngh\u0129 V\xE0o \u0110\xE2y",
          content: "M\u1ED7i khi \u0111\u1EA7u \xF3c b\u1ECB ng\u1EADp trong suy ngh\u0129 l\u1ED9n x\u1ED9n:\n1. G\xF5 h\u1EBFt ra trang n\xE0y kh\xF4ng c\u1EA7n s\u1EAFp x\u1EBFp.\n2. Ch\u1ECDn \u0111\xFAng 1 vi\u1EC7c c\xF3 th\u1EC3 l\xE0m ngay trong 5 ph\xFAt.\n3. H\xEDt th\u1EDF s\xE2u 3 nh\u1ECBp v\xE0 b\u1EAFt tay v\xE0o l\xE0m.",
          category: "Productivity",
          tags: '["ADHD", "BrainDump", "Overthinking"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.habits = 2;
      createdSummary.notes = 1;
      createdSummary.view = "tasks";
    } else if (id === "tpl_ecommerce_koc") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F6CD}\uFE0F K\u1EBF Ho\u1EA1ch Video KOC & B\xE1n H\xE0ng TikTok/Shopee", description: "Pipeline s\xE1ng t\u1EA1o n\u1ED9i dung, g\u1EAFn link affiliate v\xE0 theo d\xF5i hoa h\u1ED3ng", status: "\u0110ang l\xE0m", color: "#f59e0b" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "Nghi\xEAn c\u1EE9u 5 Hook m\u1EDF \u0111\u1EA7u video \u0111ang viral trong ng\xE0nh", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Quay video unboxing & review c\xF4ng n\u0103ng th\u1EF1c t\u1EBF s\u1EA3n ph\u1EA9m", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Edit ch\xE8n subtitle n\u1ED5i b\u1EADt v\xE0 xu\u1EA5t b\u1EA3n \u0111\xFAng 11h30 ho\u1EB7c 19h45", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "G\u1EAFn link Bio & \u0110\u1ED1i so\xE1t s\u1ED1 \u0111\u01A1n h\xE0ng sau 24 gi\u1EDD", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "\u0110\u0103ng 1 video ng\u1EAFn TikTok/Reels", category: "Personal", target: 1, unitLabel: "video", unit: "times", status: "Active" },
          { userId, name: "Ph\u1EA3n h\u1ED3i t\u01B0\u01A1ng t\xE1c 10 b\xECnh lu\u1EADn \u0111\u1EA7u ti\xEAn", category: "Personal", target: 10, unitLabel: "cmt", unit: "times", status: "Active" }
        ]
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.habits = 2;
      createdSummary.view = "projects";
    } else if (id === "tpl_fitness_recomp") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F4AA} Th\u1EED Th\xE1ch L\u1ED9t X\xE1c Th\u1EC3 Ch\u1EA5t 90 Ng\xE0y (Push/Pull/Legs)", description: "T\u1ED1i \u01B0u v\xF3c d\xE1ng, t\u0103ng c\u01A1 gi\u1EA3m m\u1EE1 v\u1EDBi ch\u1EBF \u0111\u1ED9 t\u1EADp khoa h\u1ECDc v\xE0 dinh d\u01B0\u1EE1ng chu\u1EA9n", status: "\u0110ang l\xE0m", color: "#ef4444" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "Bu\u1ED5i t\u1EADp Push (Ng\u1EF1c - Vai - Tay sau) 45 ph\xFAt", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "\u0110i b\u1ED9 \u0111\u1EA1t t\u1ED1i thi\u1EC3u 8.000 b\u01B0\u1EDBc ch\xE2n trong ng\xE0y", priority: "Trung b\xECnh", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Chu\u1EA9n b\u1ECB h\u1ED9p c\u01A1m gi\xE0u \u0111\u1EA1m (\u1EE9c g\xE0 / th\u1ECBt b\xF2 / tr\u1EE9ng lu\u1ED9c)", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m", dueDate: todayStr }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "U\u1ED1ng \u0111\u1EE7 2.5 l\xEDt n\u01B0\u1EDBc m\u1ED7i ng\xE0y", category: "Health", target: 2500, unitLabel: "ml", unit: "ml", status: "Active" },
          { userId, name: "N\u1EA1p \u0111\u1EE7 120g - 140g \u0110\u1EA1m (Protein)", category: "Health", target: 130, unitLabel: "gram", unit: "grams", status: "Active" },
          { userId, name: "Ng\u1EE7 \u0111\u1EE7 7-8 ti\u1EBFng \u0111\u1EC3 c\u01A1 b\u1EAFp ph\u1EE5c h\u1ED3i", category: "Health", target: 8, unitLabel: "ti\u1EBFng", unit: "hours", status: "Active" }
        ]
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 3;
      createdSummary.habits = 3;
      createdSummary.view = "habits";
    } else if (id === "tpl_podcast_creator") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F399}\uFE0F S\u1EA3n Xu\u1EA5t Series Video Podcast M\xF9a 1", description: "Pipeline chuy\xEAn nghi\u1EC7p t\u1EEB l\xEAn \xFD t\u01B0\u1EDFng, m\u1EDDi kh\xE1ch m\u1EDDi, thu \xE2m \u0111\u1EBFn ph\xE2n ph\u1ED1i \u0111a n\u1EC1n t\u1EA3ng", status: "\u0110ang l\xE0m", color: "#8b5cf6" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "So\u1EA1n Outline 5 c\xE2u h\u1ECFi ph\u1ECFng v\u1EA5n \u0111\xE0o s\xE2u cho T\u1EADp 1", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Test \xE2m thanh Microphone & \xC1nh s\xE1ng tr\u01B0\u1EDBc gi\u1EDD thu \xE2m 30p", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "C\u1EAFt 3 \u0111o\u1EA1n tr\xEDch \u0111\u1EAFt gi\xE1 (Golden Clips) l\xE0m Shorts/Reels", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "Checklist Chu\u1EA9n B\u1ECB Thi\u1EBFt B\u1ECB & Khung C\xE2u H\u1ECFi Podcast",
          content: "### Khung Ph\u1ECFng V\u1EA5n V\xE0ng:\n1. B\u01B0\u1EDBc ngo\u1EB7t l\u1EDBn nh\u1EA5t trong s\u1EF1 nghi\u1EC7p c\u1EE7a b\u1EA1n l\xE0 g\xEC?\n2. Sai l\u1EA7m \u0111\u1EAFt gi\xE1 nh\u1EA5t b\u1EA1n t\u1EEBng ph\u1EA1m ph\u1EA3i?\n3. L\u1EDDi khuy\xEAn cho nh\u1EEFng b\u1EA1n tr\u1EBB \u0111ang hoang mang t\xECm l\u1ED1i \u0111i?",
          category: "Productivity",
          tags: '["Podcast", "Media", "Studio"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 3;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_thesis_research") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F4DA} \u0110\u1EC1 T\xE0i Nghi\xEAn C\u1EE9u Khoa H\u1ECDc & Lu\u1EADn V\u0103n Th\u1EA1c S\u0129", description: "Khung c\u1EA5u tr\xFAc lu\u1EADn v\u0103n 5 ch\u01B0\u01A1ng chu\u1EA9n h\u1ECDc thu\u1EADt qu\u1ED1c t\u1EBF", status: "\u0110ang l\xE0m", color: "#0284c7" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "T\u1ED5ng h\u1EE3p v\xE0 tr\xEDch d\u1EABn 15 b\xE0i b\xE1o khoa h\u1ECDc chu\u1EA9n APA", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Ho\xE0n thi\u1EC7n b\u1EA3n th\u1EA3o Ch\u01B0\u01A1ng 1 (\u0110\u1EB7t v\u1EA5n \u0111\u1EC1 & M\u1EE5c ti\xEAu)", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Thu th\u1EADp v\xE0 l\xE0m s\u1EA1ch m\u1EABu kh\u1EA3o s\xE1t th\u1EF1c \u0111\u1ECBa", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "Vi\u1EBFt t\u1ED1i thi\u1EC3u 300 t\u1EEB h\u1ECDc thu\u1EADt m\u1ED7i ng\xE0y", category: "Study", target: 300, unitLabel: "t\u1EEB", unit: "words", status: "Active" },
          { userId, name: "\u0110\u1ECDc 1 b\xE0i b\xE1o Q1/Q2 chuy\xEAn ng\xE0nh", category: "Study", target: 1, unitLabel: "b\xE0i", unit: "times", status: "Active" }
        ]
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 3;
      createdSummary.habits = 2;
      createdSummary.view = "projects";
    } else if (id === "tpl_mindfulness_zen") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F33F} Ch\u1EEFa L\xE0nh, T\u0129nh T\xE2m & C\xE2n B\u1EB1ng C\u1EA3m X\xFAc", description: "T\xE1i t\u1EA1o n\u0103ng l\u01B0\u1EE3ng tinh th\u1EA7n, gi\u1EA3m t\u1EA3i c\u0103ng th\u1EB3ng v\xE0 s\u1ED1ng tr\u1ECDn v\u1EB9n t\u1EEBng kho\u1EA3nh kh\u1EAFc", status: "\u0110ang l\xE0m", color: "#059669" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "\u0110i d\u1EA1o ngo\xE0i tr\u1EDDi kh\xF4ng \u0111eo tai nghe 20 ph\xFAt", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "G\u1EEDi 1 l\u1EDDi nh\u1EAFn c\u1EA3m \u01A1n ch\xE2n th\xE0nh \u0111\u1EBFn ng\u01B0\u1EDDi th\xE2n y\xEAu", priority: "Th\u1EA5p", status: "Ch\u01B0a l\xE0m", dueDate: todayStr }
        ]
      });
      await prisma.habit.createMany({
        data: [
          { userId, name: "Ghi 3 \u0111i\u1EC1u bi\u1EBFt \u01A1n v\xE0o nh\u1EADt k\xFD t\u1ED1i", category: "Personal", target: 3, unitLabel: "\u0111i\u1EC1u", unit: "times", status: "Active" },
          { userId, name: "T\u1EADp th\u1EDF Box Breathing 5 ph\xFAt khi stress", category: "Health", target: 5, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" },
          { userId, name: "T\u1EAFt Wi-Fi \u0111i\u1EC7n tho\u1EA1i l\xFAc 21h30", category: "Health", target: 1, unitLabel: "l\u1EA7n", unit: "times", status: "Active" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "Nh\u1EADt K\xFD Bi\u1EBFt \u01A0n & Nh\u1EEFng \u0110i\u1EC1u Khi\u1EBFn T\xF4i B\xECnh Y\xEAn",
          content: "### 3 \u0110i\u1EC1u t\xF4i bi\u1EBFt \u01A1n h\xF4m nay:\n1. M\u1ED9t t\xE1ch tr\xE0 \u1EA5m v\xE0 kh\xF4ng gian y\xEAn t\u0129nh bu\u1ED5i s\u1EDBm.\n2. C\u01A1 th\u1EC3 kh\u1ECFe m\u1EA1nh v\xE0 \u0111\xF4i m\u1EAFt s\xE1ng \u0111\u1EC3 l\xE0m vi\u1EC7c.\n3. Nh\u1EEFng ng\u01B0\u1EDDi lu\xF4n l\u1EAFng nghe v\xE0 \u0111\u1ED3ng h\xE0nh c\xF9ng t\xF4i.",
          category: "Personal",
          tags: '["Gratitude", "Peace", "Mindfulness"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 2;
      createdSummary.habits = 3;
      createdSummary.notes = 1;
      createdSummary.view = "habits";
    } else if (id === "tpl_startup_mvp") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F680} 30-Day Lean Startup & MVP Launch Sprint", description: "Quy tr\xECnh kh\u1EDFi nghi\u1EC7p tinh g\u1ECDn: Ph\u1ECFng v\u1EA5n kh\xE1ch h\xE0ng, Vibe code MVP v\xE0 ra m\u1EAFt s\u1EA3n ph\u1EA9m", status: "\u0110ang l\xE0m", color: "#7c3aed" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "Ph\u1ECFng v\u1EA5n 10 kh\xE1ch h\xE0ng m\u1EE5c ti\xEAu \u0111\u1EC3 x\xE1c nh\u1EADn n\u1ED7i \u0111au", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "Vibe code phi\xEAn b\u1EA3n MVP c\u1ED1t l\xF5i gi\u1EA3i quy\u1EBFt \u0111\xFAng 1 v\u1EA5n \u0111\u1EC1", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "T\u1EA1o Landing Page tinh g\u1ECDn k\xE8m form \u0111\u0103ng k\xFD s\u1EDBm (Waitlist)", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "\u0110\u0103ng b\xE0i Launch tr\xEAn Threads, Twitter v\xE0 Product Hunt", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "B\u1EA3n \u0110\u1ED3 Lean Canvas Tinh G\u1ECDn 1 Trang",
          content: "### C\xE2u h\u1ECFi s\u1ED1ng c\xF2n c\u1EE7a Startup:\n1. **V\u1EA5n \u0111\u1EC1 c\u1ED1t l\xF5i**: Kh\xE1ch h\xE0ng \u0111ang m\u1EA5t th\u1EDDi gian/ti\u1EC1n b\u1EA1c nhi\u1EC1u nh\u1EA5t \u1EDF \u0111\xE2u?\n2. **Gi\u1EA3i ph\xE1p 10x**: S\u1EA3n ph\u1EA9m c\u1EE7a m\xECnh nhanh h\u01A1n/r\u1EBB h\u01A1n/d\u1EC5 d\xF9ng h\u01A1n gi\u1EA3i ph\xE1p c\u0169 nh\u01B0 th\u1EBF n\xE0o?\n3. **K\xEAnh ph\xE2n ph\u1ED1i**: L\xE0m sao \u0111\u1EC3 ti\u1EBFp c\u1EADn 100 ng\u01B0\u1EDDi d\xF9ng \u0111\u1EA7u ti\xEAn v\u1EDBi 0\u0111 chi ph\xED qu\u1EA3ng c\xE1o?",
          category: "Management",
          tags: '["LeanStartup", "MVP", "Growth"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_okr_master") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const quarterEnd = new Date(Date.now() + 864e5 * 90).toISOString().split("T")[0];
      const g1 = await prisma.goal.create({
        data: {
          userId,
          title: "\u{1F3AF} [OKR Qu\xFD] B\u1EE9t Ph\xE1 N\u0103ng L\u1EF1c & T\u0103ng Tr\u01B0\u1EDFng Thu Nh\u1EADp 30%",
          category: "Career",
          targetValue: 100,
          currentValue: 15,
          status: "Active",
          deadline: quarterEnd
        }
      });
      const p1 = await prisma.project.create({
        data: {
          userId,
          name: "\u{1F680} Chi\u1EBFn D\u1ECBch Th\u1EF1c Thi OKR Tr\u1ECDng T\xE2m",
          description: `C\xE1c \u0111\u1EA7u vi\u1EC7c v\xE0 s\xE1ng ki\u1EBFn h\xE0nh \u0111\u1ED9ng ph\u1EE5c v\u1EE5 tr\u1EF1c ti\u1EBFp cho m\u1EE5c ti\xEAu: ${g1.title}`,
          status: "\u0110ang l\xE0m",
          color: "#6366f1"
        }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "KR1: Ho\xE0n th\xE0nh 100% t\xE0i li\u1EC7u v\xE0 s\u1EA3n ph\u1EA9m b\xE0n giao \u0111\xFAng h\u1EA1n", priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "KR2: \u0110\u1EA1t t\u1ED1i thi\u1EC3u 60 gi\u1EDD h\u1ECDc t\u1EADp & th\u1EF1c h\xE0nh k\u1EF9 n\u0103ng c\u1ED1t l\xF5i", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p1.id, title: "KR3: T\xEDch l\u0169y t\u1ED1i thi\u1EC3u 15 tri\u1EC7u v\xE0o qu\u1EF9 t\xE0i ch\xEDnh d\u1EF1 ph\xF2ng", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" },
          { userId, projectId: p1.id, title: "H\u1ECDp ki\u1EC3m tra ti\u1EBFn \u0111\u1ED9 OKR h\xE0ng tu\u1EA7n (Weekly Check-in 15p)", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "S\u1ED5 Tay Ph\u01B0\u01A1ng Ph\xE1p OKRs (Objectives & Key Results)",
          content: "### Nguy\xEAn T\u1EAFc V\xE0ng C\u1EE7a OKRs:\n1. **Objectives (M\u1EE5c ti\xEAu)**: Ph\u1EA3i truy\u1EC1n c\u1EA3m h\u1EE9ng, r\xF5 r\xE0ng v\xE0 c\xF3 t\xEDnh th\xE1ch th\u1EE9c.\n2. **Key Results (K\u1EBFt qu\u1EA3 then ch\u1ED1t)**: Ph\u1EA3i \u0111o l\u01B0\u1EDDng \u0111\u01B0\u1EE3c b\u1EB1ng con s\u1ED1 c\u1EE5 th\u1EC3 (t\u1EEB X \u0111\u1EBFn Y).\n3. **Kh\xF4ng d\xF9ng l\xE0m KPI ph\u1EA1t**: OKRs l\xE0 c\xF4ng c\u1EE5 \u0111\u1ECBnh h\u01B0\u1EDBng n\u1ED7 l\u1EF1c, \u0111\u1EA1t 70-80% \u0111\xE3 l\xE0 th\xE0nh c\xF4ng l\u1EDBn.",
          category: "Management",
          tags: '["OKR", "Goals", "Productivity"]'
        }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 4;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_eisenhower_matrix") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const p1 = await prisma.project.create({
        data: { userId, name: "\u{1F534} Q1: Kh\u1EA9n C\u1EA5p & Quan Tr\u1ECDng (L\xE0m Ngay)", description: "Nhi\u1EC7m v\u1EE5 c\xF3 deadline s\xE1t n\xFAt, kh\u1EE7ng ho\u1EA3ng c\u1EA7n gi\u1EA3i quy\u1EBFt trong 24h", status: "\u0110ang l\xE0m", color: "#ef4444" }
      });
      const p2 = await prisma.project.create({
        data: { userId, name: "\u{1F7E2} Q2: Quan Tr\u1ECDng & Kh\xF4ng Kh\u1EA9n C\u1EA5p (L\xEAn L\u1ECBch)", description: "Chi\u1EBFn l\u01B0\u1EE3c d\xE0i h\u1EA1n, h\u1ECDc t\u1EADp, s\u1EE9c kh\u1ECFe v\xE0 m\u1ED1i quan h\u1EC7 (N\u01A1i t\u1EA1o ra 80% th\xE0nh c\xF4ng)", status: "\u0110ang l\xE0m", color: "#10b981" }
      });
      const p3 = await prisma.project.create({
        data: { userId, name: "\u{1F7E1} Q3: Kh\u1EA9n C\u1EA5p & Kh\xF4ng Quan Tr\u1ECDng (\u1EE6y Quy\u1EC1n)", description: "Cu\u1ED9c g\u1ECDi gi\xE1n \u0111o\u1EA1n, email s\u1EF1 v\u1EE5, vi\u1EC7c v\u1EB7t c\u1EE7a ng\u01B0\u1EDDi kh\xE1c nh\u1EDD", status: "\u0110ang l\xE0m", color: "#f59e0b" }
      });
      const p4 = await prisma.project.create({
        data: { userId, name: "\u26AA Q4: Kh\xF4ng Kh\u1EA9n C\u1EA5p & Kh\xF4ng Quan Tr\u1ECDng (Lo\u1EA1i B\u1ECF)", description: "L\u01B0\u1EDBt m\u1EA1ng x\xE3 h\u1ED9i v\xF4 \u0111\u1ECBnh, vi\u1EC7c gi\u1EA3i tr\xED qu\xE1 \u0111\u1ED9 g\xE2y m\u1EA5t t\u1EADp trung", status: "M\u1EDBi t\u1EA1o", color: "#64748b" }
      });
      await prisma.task.createMany({
        data: [
          { userId, projectId: p1.id, title: "Gi\u1EA3i quy\u1EBFt vi\u1EC7c g\u1EA5p ph\xE1t sinh h\xF4m nay tr\u01B0\u1EDBc 12:00", priority: "Kh\u1EA9n c\u1EA5p", status: "Ch\u01B0a l\xE0m", dueDate: todayStr },
          { userId, projectId: p2.id, title: "D\xE0nh 60 ph\xFAt Deep Work cho m\u1EE5c ti\xEAu ph\xE1t tri\u1EC3n d\xE0i h\u1EA1n", priority: "Cao", status: "\u0110ang l\xE0m", dueDate: todayStr },
          { userId, projectId: p3.id, title: "\u1EE6y quy\u1EC1n ho\u1EB7c t\u1EF1 \u0111\u1ED9ng h\xF3a c\xE1c email tr\u1EA3 l\u1EDDi l\u1EB7p \u0111i l\u1EB7p l\u1EA1i", priority: "Trung b\xECnh", status: "Ch\u01B0a l\xE0m" },
          { userId, projectId: p4.id, title: "H\u1EA1n ch\u1EBF m\u1EDF \u1EE9ng d\u1EE5ng ti\xEAu th\u1EE5 dopamine r\xE1c trong gi\u1EDD l\xE0m vi\u1EC7c", priority: "Th\u1EA5p", status: "\u0110ang l\xE0m" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "Ma Tr\u1EADn Eisenhower: B\xED Quy\u1EBFt Qu\u1EA3n Tr\u1ECB Th\u1EDDi Gian C\u1EE7a T\u1ED5ng Th\u1ED1ng",
          content: '### C\xE1ch Ph\xE2n B\u1ED5 N\u0103ng L\u01B0\u1EE3ng Theo Ma Tr\u1EADn Eisenhower:\n- **Q1 (L\xE0m ngay)**: T\u1ED1i \u0111a 20% th\u1EDDi gian trong ng\xE0y.\n- **Q2 (\u0110\u1EA7u t\u01B0 d\xE0i h\u1EA1n)**: C\u1ED1 g\u1EAFng d\xE0nh \xEDt nh\u1EA5t 60% th\u1EDDi gian v\xE0o \u0111\xE2y.\n- **Q3 (\u1EE6y quy\u1EC1n/T\u1EEB ch\u1ED1i)**: H\u1ECDc c\xE1ch n\xF3i "Kh\xF4ng" l\u1ECBch s\u1EF1.\n- **Q4 (C\u1EAFt gi\u1EA3m)**: Lo\u1EA1i b\u1ECF c\xE1c th\xF3i quen \u0111\u1ED1t th\u1EDDi gian.',
          category: "Productivity",
          tags: '["Eisenhower", "TimeManagement", "Priority"]'
        }
      });
      createdSummary.projects = 4;
      createdSummary.tasks = 4;
      createdSummary.notes = 1;
      createdSummary.view = "projects";
    } else if (id === "tpl_6_jars_finance") {
      const existingAccounts = await prisma.financeAccount.findMany({ where: { userId } });
      const existingNames = new Set(existingAccounts.map((a) => a.name));
      const jarDefs = [
        { name: "1. H\u0169 Nhu C\u1EA7u Thi\u1EBFt Y\u1EBFu (NEC 55%)", type: "Ng\xE2n h\xE0ng", color: "#2563eb" },
        { name: "2. H\u0169 T\u1EF1 Do T\xE0i Ch\xEDnh (FFA 10%)", type: "\u0110\u1EA7u t\u01B0", color: "#10b981" },
        { name: "3. H\u0169 Ti\u1EBFt Ki\u1EC7m D\xE0i H\u1EA1n (LTSS 10%)", type: "\u0110\u1EA7u t\u01B0", color: "#059669" },
        { name: "4. H\u0169 Gi\xE1o D\u1EE5c & H\u1ECDc T\u1EADp (EDU 10%)", type: "Ti\u1EC1n m\u1EB7t", color: "#8b5cf6" },
        { name: "5. H\u0169 H\u01B0\u1EDFng Th\u1EE5 X\u1EA3 Stress (PLAY 10%)", type: "Ti\u1EC1n m\u1EB7t", color: "#f59e0b" },
        { name: "6. H\u0169 Cho \u0110i & Gi\xFAp \u0110\u1EE1 (GIVE 5%)", type: "Ti\u1EC1n m\u1EB7t", color: "#ec4899" }
      ];
      for (const jar of jarDefs) {
        if (!existingNames.has(jar.name)) {
          await prisma.financeAccount.create({
            data: { userId, name: jar.name, type: jar.type, balance: 0, currency: "VND", color: jar.color }
          });
        }
      }
      await prisma.note.create({
        data: {
          userId,
          title: "Quy T\u1EAFc 6 Chi\u1EBFc H\u0169 Qu\u1EA3n L\xFD Ti\u1EC1n B\u1EA1c (T. Harv Eker)",
          content: "### B\xED quy\u1EBFt qu\u1EA3n tr\u1ECB t\xE0i ch\xEDnh c\xE1 nh\xE2n 6 JARS:\n- **NEC 55%**: \u0102n u\u1ED1ng, thu\xEA nh\xE0, h\xF3a \u0111\u01A1n, sinh ho\u1EA1t ph\xED.\n- **FFA 10%**: \u0110\u1EA7u t\u01B0 c\u1ED5 phi\u1EBFu, v\xE0ng, b\u1EA5t \u0111\u1ED9ng s\u1EA3n t\u1EA1o thu nh\u1EADp th\u1EE5 \u0111\u1ED9ng (kh\xF4ng bao gi\u1EDD ti\xEAu).\n- **LTSS 10%**: Qu\u1EF9 mua xe, du l\u1ECBch l\u1EDBn, s\u1EEDa nh\xE0.\n- **EDU 10%**: Mua s\xE1ch, kh\xF3a h\u1ECDc, n\xE2ng c\u1EA5p k\u1EF9 n\u0103ng ngh\u1EC1 nghi\u1EC7p.\n- **PLAY 10%**: Ti\xEAu h\u1EBFt m\u1ED7i th\xE1ng cho s\u1EDF th\xEDch \u0111\u1EC3 nu\xF4i d\u01B0\u1EE1ng t\xE2m h\u1ED3n.\n- **GIVE 5%**: L\xE0m t\u1EEB thi\u1EC7n, qu\xE0 sinh nh\u1EADt, gi\xFAp \u0111\u1EE1 gia \u0111\xECnh.",
          category: "Finance",
          tags: '["6JARS", "Finance", "HarvEker"]'
        }
      });
      createdSummary.accounts = 6;
      createdSummary.notes = 1;
      createdSummary.view = "finance";
    } else if (id === "tpl_circadian_health") {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await prisma.habit.createMany({
        data: [
          { userId, name: "T\u1EAFm n\u1EAFng t\u1EF1 nhi\xEAn 15 ph\xFAt \u0111\u1EA7u s\xE1ng", category: "Health", target: 15, unitLabel: "ph\xFAt", unit: "minutes", status: "Active" },
          { userId, name: "U\u1ED1ng 500ml n\u01B0\u1EDBc k\xE8m nh\xFAm mu\u1ED1i kho\xE1ng s\xE1ng", category: "Health", target: 500, unitLabel: "ml", unit: "ml", status: "Active" },
          { userId, name: "D\u1EEBng n\u1EA1p caffeine sau 14:00 chi\u1EC1u", category: "Health", target: 1, unitLabel: "l\u1EA7n", unit: "times", status: "Active" },
          { userId, name: "T\u1EAFt m\xE0n h\xECnh xanh & h\u1EA1 \u0111\xE8n l\xFAc 22:00", category: "Health", target: 1, unitLabel: "l\u1EA7n", unit: "times", status: "Active" },
          { userId, name: "Gi\u1EA5c ng\u1EE7 s\xE2u \u0111\u1EE7 7.5 - 8 ti\u1EBFng", category: "Health", target: 8, unitLabel: "ti\u1EBFng", unit: "hours", status: "Active" }
        ]
      });
      await prisma.note.create({
        data: {
          userId,
          title: "Giao Th\u1EE9c T\u1ED1i \u01AFu Nh\u1ECBp Sinh H\u1ECDc Circadian Rhythm (TS. Andrew Huberman)",
          content: "### C\xE1c Tr\u1EE5 C\u1ED9t T\u1ED1i \u01AFu N\u0103ng L\u01B0\u1EE3ng Sinh H\u1ECDc:\n1. **\xC1nh s\xE1ng m\u1EB7t tr\u1EDDi bu\u1ED5i s\u1EDBm**: K\xEDch ho\u1EA1t cortisol t\u1EF1 nhi\xEAn v\xE0 \u0111\u1ED3ng h\u1ED3 sinh h\u1ECDc.\n2. **Tr\xEC ho\xE3n c\xE0 ph\xEA 90 ph\xFAt sau th\u1EE9c d\u1EADy**: Tr\xE1nh s\u1EE5p \u0111\u1ED5 n\u0103ng l\u01B0\u1EE3ng (Adenosine crash) bu\u1ED5i chi\u1EC1u.\n3. **Nhi\u1EC7t \u0111\u1ED9 ph\xF2ng ng\u1EE7**: Gi\u1EEF ph\xF2ng ng\u1EE7 m\xE1t (19-21\xB0C) gi\xFAp \u0111i v\xE0o gi\u1EA5c ng\u1EE7 s\xE2u nhanh h\u01A1n.\n4. **Th\u1EC3 d\u1EE5c**: 30-45 ph\xFAt m\u1ED7i ng\xE0y t\u0103ng \u0111\u1ED9 nh\u1EA1y insulin v\xE0 t\u1EADp trung tr\xED \xF3c.",
          category: "Health",
          tags: '["Circadian", "Health", "Huberman", "Sleep"]'
        }
      });
      createdSummary.habits = 5;
      createdSummary.notes = 1;
      createdSummary.view = "habits";
    } else {
      const proj = await prisma.project.create({
        data: { userId, name: template.title, description: template.description || "D\u1EF1 \xE1n t\u1EA1o t\u1EEB m\u1EABu th\u01B0 vi\u1EC7n", status: "\u0110ang l\xE0m", color: "#2563eb" }
      });
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await prisma.task.create({
        data: { userId, projectId: proj.id, title: `Kh\u1EDFi t\u1EA1o k\u1EBF ho\u1EA1ch: ${template.title}`, priority: "Cao", status: "Ch\u01B0a l\xE0m", dueDate: todayStr }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 1;
      createdSummary.view = "projects";
    }
    await prisma.templateUsage.create({
      data: { userId, templateId: template.id }
    }).catch(() => {
    });
    await prisma.systemTemplate.update({
      where: { id: template.id },
      data: { usesCount: { increment: 1 } }
    }).catch(() => {
    });
    res.json({
      success: true,
      message: `\u0110\xE3 \xE1p d\u1EE5ng m\u1EABu "${template.title}" th\xE0nh c\xF4ng v\xE0o kh\xF4ng gian l\xE0m vi\u1EC7c c\u1EE7a b\u1EA1n!`,
      summary: createdSummary
    });
  } catch (err) {
    console.error("Error applying template:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 \xE1p d\u1EE5ng m\u1EABu n\xE0y." });
  }
});
apiRouter.get("/journey", async (req, res) => {
  const userId = req.userId;
  try {
    const data = await journeyService.getJourneyData(userId);
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error("Error fetching journey data:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi t\u1EA3i d\u1EEF li\u1EC7u h\xE0nh tr\xECnh c\xE1 nh\xE2n." });
  }
});
apiRouter.post("/journey/milestone", async (req, res) => {
  const userId = req.userId;
  const { title, description, category, date, icon, metricValue, metricLabel, isHighlighted } = req.body;
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: "Ti\xEAu \u0111\u1EC1 c\u1ED9t m\u1ED1c l\xE0 b\u1EAFt bu\u1ED9c." });
    return;
  }
  const milestoneDate = date && String(date).trim() ? String(date).trim() : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    const created = await journeyService.createManualMilestone(userId, {
      title,
      description,
      category,
      date: milestoneDate,
      icon,
      metricValue,
      metricLabel,
      isHighlighted
    });
    res.json({
      success: true,
      message: "\u0110\xE3 th\xEAm c\u1ED9t m\u1ED1c th\xE0nh t\u1EF1u m\u1EDBi v\xE0o h\xE0nh tr\xECnh!",
      milestone: created
    });
  } catch (err) {
    console.error("Error creating journey milestone:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi t\u1EA1o c\u1ED9t m\u1ED1c th\xE0nh t\u1EF1u." });
  }
});
apiRouter.delete("/journey/milestone/:id", async (req, res) => {
  const userId = req.userId;
  const milestoneId = req.params.id;
  try {
    await journeyService.deleteManualMilestone(userId, milestoneId);
    res.json({
      success: true,
      message: "\u0110\xE3 x\xF3a c\u1ED9t m\u1ED1c th\xE0nh t\u1EF1u."
    });
  } catch (err) {
    console.error("Error deleting journey milestone:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi x\xF3a c\u1ED9t m\u1ED1c." });
  }
});
apiRouter.get("/leaderboard", async (req, res) => {
  const userId = req.userId;
  try {
    const data = await progressionService.getLeaderboard(userId);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi t\u1EA3i b\u1EA3ng x\u1EBFp h\u1EA1ng th\u1EF1c t\u1EBF." });
  }
});
apiRouter.get("/progression", async (req, res) => {
  const userId = req.userId;
  try {
    const data = await progressionService.getProgressionState(userId);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching progression state:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi t\u1EA3i h\u1EC7 th\u1ED1ng ti\u1EBFn \u0111\u1ED9 c\xE1 nh\xE2n." });
  }
});
apiRouter.post("/progression/quest/claim", async (req, res) => {
  const userId = req.userId;
  const { questKey } = req.body;
  if (!questKey) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu questKey." });
    return;
  }
  try {
    const result = await progressionService.claimDailyQuest(userId, questKey);
    res.json({
      success: true,
      message: "Nh\u1EADn th\u01B0\u1EDFng nhi\u1EC7m v\u1EE5 th\xE0nh c\xF4ng!",
      data: result
    });
  } catch (err) {
    console.error("Error claiming quest:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 nh\u1EADn th\u01B0\u1EDFng nhi\u1EC7m v\u1EE5." });
  }
});
apiRouter.post("/progression/challenge/claim", async (req, res) => {
  const userId = req.userId;
  const { challengeKey } = req.body;
  if (!challengeKey) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu challengeKey." });
    return;
  }
  try {
    const result = await progressionService.claimWeeklyChallenge(userId, challengeKey);
    res.json({
      success: true,
      message: "Nh\u1EADn th\u01B0\u1EDFng th\u1EED th\xE1ch tu\u1EA7n th\xE0nh c\xF4ng!",
      data: result
    });
  } catch (err) {
    console.error("Error claiming challenge:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 nh\u1EADn th\u01B0\u1EDFng th\u1EED th\xE1ch." });
  }
});
apiRouter.post("/progression/reward/unlock", async (req, res) => {
  const userId = req.userId;
  const { cosmeticKey } = req.body;
  if (!cosmeticKey) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu cosmeticKey." });
    return;
  }
  try {
    const result = await progressionService.unlockCosmetic(userId, cosmeticKey);
    res.json({
      success: true,
      message: `\u0110\xE3 m\u1EDF kh\xF3a ngo\u1EA1i trang "${result.item.name}"!`,
      data: result
    });
  } catch (err) {
    console.error("Error unlocking cosmetic:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 m\u1EDF kh\xF3a ngo\u1EA1i trang." });
  }
});
apiRouter.post("/progression/reward/equip", async (req, res) => {
  const userId = req.userId;
  const { rewardType, rewardKey } = req.body;
  if (!rewardType || !rewardKey) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu rewardType ho\u1EB7c rewardKey." });
    return;
  }
  try {
    const result = await progressionService.equipCosmetic(userId, rewardType, rewardKey);
    res.json({
      success: true,
      message: "\u0110\xE3 trang b\u1ECB ngo\u1EA1i trang th\xE0nh c\xF4ng!",
      data: result
    });
  } catch (err) {
    console.error("Error equipping cosmetic:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 trang b\u1ECB ngo\u1EA1i trang." });
  }
});
apiRouter.post("/progression/chest/open", async (req, res) => {
  const userId = req.userId;
  try {
    const result = await progressionService.openDailyChest(userId);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error opening daily chest:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 m\u1EDF r\u01B0\u01A1ng kho b\xE1u." });
  }
});
apiRouter.get("/rpg/character", async (req, res) => {
  const userId = req.userId;
  try {
    await rpgService.ensureStarterKit(userId);
    const stats = await rpgService.calculateRealCharacterStats(userId);
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error("Error fetching RPG character stats:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i ch\u1EC9 s\u1ED1 RPG nh\xE2n v\u1EADt." });
  }
});
apiRouter.get("/rpg/monsters", async (req, res) => {
  const userId = req.userId;
  try {
    const data = await rpgService.getMonstersAndProgress(userId);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching monsters progress:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch qu\xE1i v\u1EADt." });
  }
});
apiRouter.post("/rpg/battle", async (req, res) => {
  const userId = req.userId;
  const { monsterId } = req.body;
  if (!monsterId) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu monsterId \u0111\u1EC3 khi\xEAu chi\u1EBFn." });
    return;
  }
  try {
    const result = await rpgService.simulateBattle(userId, monsterId);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Error in RPG battle:", err);
    res.status(400).json({ success: false, message: err.message || "Tr\u1EADn chi\u1EBFn kh\xF4ng th\u1EC3 di\u1EC5n ra." });
  }
});
apiRouter.get("/rpg/equipment", async (req, res) => {
  const userId = req.userId;
  try {
    await rpgService.ensureStarterKit(userId);
    const data = await rpgService.getUserEquipments(userId);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching RPG equipment:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i kho trang b\u1ECB." });
  }
});
apiRouter.post("/rpg/equipment/equip", async (req, res) => {
  const userId = req.userId;
  const { equipmentId } = req.body;
  if (!equipmentId) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu equipmentId." });
    return;
  }
  try {
    const item = await rpgService.equipItem(userId, equipmentId);
    res.json({
      success: true,
      message: "\u0110\xE3 trang b\u1ECB v\u1EADt ph\u1EA9m th\xE0nh c\xF4ng!",
      data: item
    });
  } catch (err) {
    console.error("Error equipping item:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 trang b\u1ECB v\u1EADt ph\u1EA9m." });
  }
});
apiRouter.post("/rpg/equipment/upgrade", async (req, res) => {
  const userId = req.userId;
  const { equipmentId } = req.body;
  if (!equipmentId) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu equipmentId." });
    return;
  }
  try {
    const result = await rpgService.upgradeEquipment(userId, equipmentId);
    res.json({
      success: true,
      message: "N\xE2ng c\u1EA5p trang b\u1ECB th\xE0nh c\xF4ng!",
      data: result
    });
  } catch (err) {
    console.error("Error upgrading equipment:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 n\xE2ng c\u1EA5p trang b\u1ECB." });
  }
});
apiRouter.get("/rpg/skills", async (req, res) => {
  const userId = req.userId;
  try {
    const data = await rpgService.getSkillTrees(userId);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching skill trees:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i c\xE2y k\u1EF9 n\u0103ng." });
  }
});
apiRouter.post("/rpg/skills/unlock", async (req, res) => {
  const userId = req.userId;
  const { skillKey } = req.body;
  if (!skillKey) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu skillKey." });
    return;
  }
  try {
    const result = await rpgService.unlockSkill(userId, skillKey);
    res.json({
      success: true,
      message: "\u0110\xE3 m\u1EDF kh\xF3a k\u1EF9 n\u0103ng th\xE0nh c\xF4ng!",
      data: result
    });
  } catch (err) {
    console.error("Error unlocking skill:", err);
    res.status(400).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 m\u1EDF kh\xF3a k\u1EF9 n\u0103ng." });
  }
});
apiRouter.get("/rpg/battles/history", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const records = await prisma.battleRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json({
      success: true,
      data: records.map((r) => ({
        ...r,
        turnsLog: typeof r.turnsLog === "string" ? JSON.parse(r.turnsLog) : r.turnsLog,
        rewardEquipment: r.rewardEquipment && typeof r.rewardEquipment === "string" ? JSON.parse(r.rewardEquipment) : r.rewardEquipment
      }))
    });
  } catch (err) {
    console.error("Error fetching battle history:", err);
    res.status(500).json({ success: false, message: err.message || "Kh\xF4ng th\u1EC3 t\u1EA3i l\u1ECBch s\u1EED chi\u1EBFn \u0111\u1EA5u." });
  }
});
apiRouter.post("/habits/:id/toggle", async (req, res) => {
  const userId = req.userId;
  const habitId = req.params.id;
  const prisma = getPrisma();
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });
    if (!habit) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y th\xF3i quen." });
      return;
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let dates = [];
    try {
      dates = typeof habit.completedDates === "string" ? JSON.parse(habit.completedDates || "[]") : habit.completedDates || [];
    } catch {
      dates = [];
    }
    const wasCompleted = dates.includes(todayStr);
    let newDates;
    let newStreak = habit.streak || 0;
    let newBest = habit.bestStreak || 0;
    if (wasCompleted) {
      newDates = dates.filter((d) => d !== todayStr);
      newStreak = Math.max(0, newStreak - 1);
    } else {
      newDates = [...dates, todayStr];
      newStreak += 1;
      if (newStreak > newBest) newBest = newStreak;
    }
    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        completedDates: JSON.stringify(newDates),
        streak: newStreak,
        bestStreak: newBest
      }
    });
    let xpResult = null;
    if (!wasCompleted) {
      xpResult = await progressionService.awardXp(userId, {
        amount: 15,
        category: "habit",
        source: "habit_complete",
        sourceId: `${habitId}_${todayStr}`,
        description: `K\u1EF7 lu\u1EADt th\xF3i quen: ${habit.name}`
      }).catch(() => null);
    }
    res.json({
      success: true,
      completed: !wasCompleted,
      habit: {
        ...updated,
        completedDates: newDates
      },
      xpResult
    });
  } catch (err) {
    console.error("Error toggling habit:", err);
    res.status(500).json({ success: false, message: err.message || "L\u1ED7i khi c\u1EADp nh\u1EADt th\xF3i quen." });
  }
});
apiRouter.post("/data/:collection", async (req, res) => {
  const { collection } = req.params;
  const userId = req.userId;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_COLLECTION", message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.` },
      message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.`
    });
    return;
  }
  try {
    if (collection === "tasks") {
      const parsed = CreateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "financeAccounts") {
      const parsed = CreateFinanceAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "transactions") {
      const parsed = CreateTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "habits") {
      const parsed = CreateHabitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "goals") {
      const parsed = CreateGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "notes") {
      const parsed = CreateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    }
    const payload = { ...req.body };
    delete payload.userId;
    delete payload.role;
    delete payload.plan;
    if (collection === "financeAccounts") {
      payload.balance = parseFloat(payload.balance) || 0;
    }
    const created = await dbService.addItemToUserCollection(collection, userId, payload);
    if (collection === "tasks" && created.status === "Ho\xE0n th\xE0nh") {
      progressionService.awardXp(userId, {
        amount: 20,
        category: "task",
        source: "task_complete",
        sourceId: created.id,
        description: `Ho\xE0n th\xE0nh vi\u1EC7c: ${created.title || "Nhi\u1EC7m v\u1EE5"}`
      }).catch((err) => console.warn("Progression hook error:", err));
    } else if (collection === "focusSessions" && (created.status === "Completed" || created.status === "Ho\xE0n th\xE0nh")) {
      const minutes = created.actualDuration || 25;
      const xp = Math.max(10, Math.floor(minutes / 25 * 15));
      progressionService.awardXp(userId, {
        amount: xp,
        category: "focus",
        source: "focus_session",
        sourceId: created.id,
        description: `T\u1EADp trung s\xE2u: ${minutes} ph\xFAt`
      }).catch((err) => console.warn("Progression hook error:", err));
    }
    if (["decisions", "budgets", "orders", "projects"].includes(collection)) {
      await dbService.createAuditLog(
        userId,
        `CREATE_${collection.toUpperCase()}`,
        collection,
        created.id,
        null,
        created
      );
    }
    if (collection === "tasks" && created.title) {
      scheduleEntityReminders(userId, "task", created).catch((err) => console.warn("[EventReminder] task schedule error:", err));
      notificationEngine.emitEvent({
        userId,
        eventType: "TASK_CREATED",
        entityId: created.id,
        title: `Nhi\u1EC7m v\u1EE5 m\u1EDBi: "${created.title}"`,
        message: `Nhi\u1EC7m v\u1EE5 <strong>"${created.title}"</strong> \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o th\xE0nh c\xF4ng trong danh s\xE1ch c\u1EE7a b\u1EA1n.${created.dueDate ? ` H\u1EA1n ch\xF3t: <strong>${created.dueDate}</strong>.` : ""}`,
        priority: "LOW",
        category: "TASK",
        actionUrl: `${getAppBaseUrl()}/?view=tasks`,
        actionLabel: "M\u1EDF danh s\xE1ch vi\u1EC7c"
      }).catch((err) => console.warn("[Notification Hook] task created error:", err));
    } else if (collection === "calendarEvents") {
      scheduleEntityReminders(userId, "calendar", created).catch((err) => console.warn("[EventReminder] calendar schedule error:", err));
    }
    res.status(201).json(created);
  } catch (err) {
    console.error(`POST /api/data/${collection} error:`, err);
    res.status(500).json({
      success: false,
      error: { code: "DB_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.put("/data/:collection/:id", async (req, res) => {
  const { collection, id } = req.params;
  const userId = req.userId;
  if (!id || id === "undefined" || id === "null" || typeof id !== "string" || !id.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_RECORD_ID", message: "M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu." },
      message: "M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu."
    });
    return;
  }
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_COLLECTION", message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.` },
      message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.`
    });
    return;
  }
  try {
    if (collection === "tasks") {
      const parsed = UpdateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "financeAccounts") {
      const parsed = UpdateFinanceAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "transactions") {
      const parsed = UpdateTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "habits") {
      const parsed = UpdateHabitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "goals") {
      const parsed = UpdateGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    } else if (collection === "notes") {
      const parsed = UpdateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
          message: parsed.error.issues.map((i) => i.message).join("; ")
        });
      }
    }
    const updates = { ...req.body };
    delete updates.userId;
    delete updates.role;
    delete updates.plan;
    if (collection === "users") {
      delete updates.status;
    }
    if (collection === "financeAccounts") {
      if (updates.balance !== void 0) {
        updates.balance = parseFloat(updates.balance) || 0;
      }
    }
    const updated = await dbService.updateUserCollectionItem(collection, userId, id, updates, req.userRole);
    if (collection === "tasks" && (updated.status === "Ho\xE0n th\xE0nh" || updated.status === "Done" || updated.status === "completed")) {
      progressionService.awardXp(userId, {
        amount: 20,
        category: "task",
        source: "task_complete",
        sourceId: id,
        description: `Ho\xE0n th\xE0nh vi\u1EC7c: ${updated.title || "Nhi\u1EC7m v\u1EE5"}`
      }).catch((err) => console.warn("Progression hook error:", err));
    } else if (collection === "focusSessions" && (updated.status === "Completed" || updated.status === "Ho\xE0n th\xE0nh")) {
      const minutes = updated.actualDuration || 25;
      const xp = Math.max(10, Math.floor(minutes / 25 * 15));
      progressionService.awardXp(userId, {
        amount: xp,
        category: "focus",
        source: "focus_session",
        sourceId: id,
        description: `T\u1EADp trung s\xE2u: ${minutes} ph\xFAt`
      }).catch((err) => console.warn("Progression hook error:", err));
    } else if (collection === "savingGoals") {
      if (updated.currentAmount >= updated.targetAmount && updated.targetAmount > 0) {
        progressionService.awardXp(userId, {
          amount: 60,
          category: "finance",
          source: "saving_target_reached",
          sourceId: `${id}_reached`,
          description: `Chinh ph\u1EE5c m\u1EE5c ti\xEAu ti\u1EBFt ki\u1EC7m: ${updated.title || "Kho\u1EA3n t\xEDch l\u0169y"}`
        }).catch((err) => console.warn("Progression hook error:", err));
      }
    }
    if (collection === "tasks") {
      const isCompletedOrCancelled = updated.status === "Ho\xE0n th\xE0nh" || updated.status === "Done" || updated.status === "completed" || updated.status === "H\u1EE7y" || updated.status === "Cancelled";
      if (isCompletedOrCancelled) {
        cancelEntityReminders(id).catch((err) => console.warn("[EventReminder] task cancel error:", err));
        if (updated.status === "Ho\xE0n th\xE0nh" || updated.status === "Done" || updated.status === "completed") {
          notificationEngine.emitEvent({
            userId,
            eventType: "TASK_COMPLETED",
            entityId: id,
            title: `Ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc: "${updated.title || "Nhi\u1EC7m v\u1EE5"}" \u{1F389}`,
            message: `B\u1EA1n v\u1EEBa ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 <strong>"${updated.title || "Nhi\u1EC7m v\u1EE5"}"</strong>! H\xE3y ti\u1EBFp t\u1EE5c duy tr\xEC phong \u0111\u1ED9 nh\xE9.`,
            priority: "LOW",
            category: "TASK",
            actionUrl: `${getAppBaseUrl()}/?view=tasks`,
            actionLabel: "Xem nhi\u1EC7m v\u1EE5"
          }).catch((err) => console.warn("[Notification Hook] task completed error:", err));
        }
      } else {
        rescheduleEntityReminders(userId, "task", updated).catch((err) => console.warn("[EventReminder] task reschedule error:", err));
      }
    } else if (collection === "calendarEvents") {
      const isCancelledOrDone = updated.status === "\u0110\xE3 h\u1EE7y" || updated.status === "Cancelled" || updated.status === "\u0110\xE3 xong" || updated.status === "Completed";
      if (isCancelledOrDone) {
        cancelEntityReminders(id).catch((err) => console.warn("[EventReminder] calendar cancel error:", err));
      } else {
        rescheduleEntityReminders(userId, "calendar", updated).catch((err) => console.warn("[EventReminder] calendar reschedule error:", err));
        notificationEngine.emitEvent({
          userId,
          eventType: "CALENDAR_CHANGED",
          entityId: id,
          title: `L\u1ECBch bi\u1EC3u \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt: "${updated.title || "S\u1EF1 ki\u1EC7n"}"`,
          message: `S\u1EF1 ki\u1EC7n <strong>"${updated.title || "S\u1EF1 ki\u1EC7n"}"</strong> \u0111\xE3 \u0111\u01B0\u1EE3c \u0111i\u1EC1u ch\u1EC9nh ng\xE0y ho\u1EB7c th\u1EDDi gian (${updated.date} l\xFAc ${updated.startTime || ""}).`,
          priority: "NORMAL",
          category: "CALENDAR",
          actionUrl: `${getAppBaseUrl()}/?view=calendar`,
          actionLabel: "M\u1EDF l\u1ECBch bi\u1EC3u"
        }).catch((err) => console.warn("[Notification Hook] calendar changed error:", err));
      }
    }
    res.json(updated);
  } catch (err) {
    const isClientError = err.message && (err.message.includes("not found") || err.message.includes("permission") || err.code === "P2025");
    if (isClientError) {
      console.warn(`PUT /api/data/${collection}/${id} client warning: ${err.message}`);
      res.status(404).json({
        success: false,
        error: { code: "RECORD_NOT_FOUND", message: err.message },
        message: err.message
      });
      return;
    }
    console.error(`PUT /api/data/${collection}/${id} error:`, err);
    res.status(400).json({
      success: false,
      error: { code: "UPDATE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.delete("/data/:collection/:id", async (req, res) => {
  const { collection, id } = req.params;
  const userId = req.userId;
  if (!id || id === "undefined" || id === "null" || typeof id !== "string" || !id.trim()) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_RECORD_ID", message: "M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu." },
      message: "M\xE3 b\u1EA3n ghi (ID) kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu."
    });
    return;
  }
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_COLLECTION", message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.` },
      message: `Danh m\u1EE5c '${collection}' kh\xF4ng h\u1EE3p l\u1EC7.`
    });
    return;
  }
  try {
    await dbService.deleteUserCollectionItem(collection, userId, id, req.userRole);
    if (collection === "calendarEvents" || collection === "tasks") {
      cancelEntityReminders(id).catch((err) => console.warn("[EventReminder] cancel error on delete:", err));
    }
    if (collection === "calendarEvents") {
      notificationEngine.emitEvent({
        userId,
        eventType: "CALENDAR_CANCELLED",
        entityId: id,
        title: `S\u1EF1 ki\u1EC7n l\u1ECBch \u0111\xE3 b\u1ECB h\u1EE7y`,
        message: `M\u1ED9t s\u1EF1 ki\u1EC7n tr\xEAn l\u1ECBch bi\u1EC3u c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c x\xF3a kh\u1ECFi h\u1EC7 th\u1ED1ng.`,
        priority: "NORMAL",
        category: "CALENDAR",
        actionUrl: `${getAppBaseUrl()}/?view=calendar`,
        actionLabel: "Xem l\u1ECBch bi\u1EC3u"
      }).catch((err) => console.warn("[Notification Hook] calendar cancelled error:", err));
    }
    res.json({ success: true, message: "\u0110\xE3 x\xF3a th\xE0nh c\xF4ng" });
  } catch (err) {
    const isClientError = err.message && (err.message.includes("not found") || err.message.includes("permission") || err.code === "P2025");
    if (isClientError) {
      console.warn(`DELETE /api/data/${collection}/${id} client warning: ${err.message}`);
      res.status(404).json({
        success: false,
        error: { code: "RECORD_NOT_FOUND", message: err.message },
        message: err.message
      });
      return;
    }
    console.error(`DELETE /api/data/${collection}/${id} error:`, err);
    res.status(400).json({
      success: false,
      error: { code: "DELETE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.delete("/notifications/all", async (req, res) => {
  const userId = req.userId;
  try {
    const prisma = getPrisma();
    await prisma.notification.deleteMany({
      where: { userId }
    });
    res.json({ success: true, message: "\u0110\xE3 x\xF3a t\u1EA5t c\u1EA3 th\xF4ng b\xE1o" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "DELETE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.put("/notifications/:id/read", async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    const notif = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (notif) {
      await prisma.notification.update({
        where: { id },
        data: { read: true, readAt: /* @__PURE__ */ new Date() }
      });
      if (notif.announcementId) {
        await prisma.announcementDelivery.updateMany({
          where: {
            announcementId: notif.announcementId,
            userId,
            channel: "WEB"
          },
          data: { readAt: /* @__PURE__ */ new Date() }
        });
      }
    }
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "UPDATE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.put("/notifications/read-all", async (req, res) => {
  const userId = req.userId;
  try {
    const prisma = getPrisma();
    const now = /* @__PURE__ */ new Date();
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: now }
    });
    await prisma.announcementDelivery.updateMany({
      where: { userId, channel: "WEB", readAt: null },
      data: { readAt: now }
    });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "UPDATE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.delete("/notifications/:id", async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    await prisma.notification.deleteMany({
      where: { id, userId }
    });
    res.json({ success: true, message: "\u0110\xE3 x\xF3a th\xF4ng b\xE1o th\xE0nh c\xF4ng" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/notifications/settings", async (req, res) => {
  const userId = req.userId;
  try {
    const prisma = getPrisma();
    const [preference, rules, gmailStatus] = await Promise.all([
      notificationEngine.getUserPreferences(userId),
      prisma.userNotificationRule.findMany({ where: { userId } }),
      gmailOAuthService.getIntegrationStatus(userId)
    ]);
    const rulesMap = new Map(rules.map((r) => [r.eventType, r]));
    const allRules = Object.values(SYSTEM_NOTIFICATION_RULES).map((sysRule) => {
      const existing = rulesMap.get(sysRule.eventType);
      return {
        eventType: sysRule.eventType,
        label: sysRule.label,
        description: sysRule.description,
        enabled: existing ? existing.enabled : sysRule.defaultEnabled,
        timingOffsetMinutes: existing ? existing.timingOffsetMinutes : sysRule.defaultTimingMinutes,
        priority: existing ? existing.priority : sysRule.defaultPriority,
        channels: existing ? existing.channels : "in_app,email",
        supportedTimings: sysRule.supportedTimings
      };
    });
    res.json({
      success: true,
      preference,
      rules: allRules,
      gmailIntegration: gmailStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/notifications/settings", async (req, res) => {
  const userId = req.userId;
  const {
    enabled,
    inAppEnabled,
    emailEnabled,
    recipientEmail,
    timezone,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    quietHoursBypassCritical
  } = req.body;
  try {
    const prisma = getPrisma();
    const updated = await prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {
        ...enabled !== void 0 ? { enabled: Boolean(enabled) } : {},
        ...inAppEnabled !== void 0 ? { inAppEnabled: Boolean(inAppEnabled) } : {},
        ...emailEnabled !== void 0 ? { emailEnabled: Boolean(emailEnabled) } : {},
        ...recipientEmail !== void 0 ? { recipientEmail: recipientEmail?.trim() || null } : {},
        ...timezone !== void 0 ? { timezone: timezone.trim() } : {},
        ...quietHoursEnabled !== void 0 ? { quietHoursEnabled: Boolean(quietHoursEnabled) } : {},
        ...quietHoursStart !== void 0 ? { quietHoursStart: quietHoursStart.trim() } : {},
        ...quietHoursEnd !== void 0 ? { quietHoursEnd: quietHoursEnd.trim() } : {},
        ...quietHoursBypassCritical !== void 0 ? { quietHoursBypassCritical: Boolean(quietHoursBypassCritical) } : {}
      },
      create: {
        userId,
        enabled: enabled ?? true,
        inAppEnabled: inAppEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        recipientEmail: recipientEmail?.trim() || null,
        timezone: timezone || "Asia/Ho_Chi_Minh",
        quietHoursEnabled: quietHoursEnabled ?? false,
        quietHoursStart: quietHoursStart || "22:00",
        quietHoursEnd: quietHoursEnd || "07:00",
        quietHoursBypassCritical: quietHoursBypassCritical ?? true
      }
    });
    res.json({ success: true, preference: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/notifications/rules", async (req, res) => {
  const userId = req.userId;
  const { eventType, enabled, timingOffsetMinutes, priority, channels } = req.body;
  if (!eventType) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu tr\u01B0\u1EDDng eventType." });
    return;
  }
  try {
    const prisma = getPrisma();
    const rule = await prisma.userNotificationRule.upsert({
      where: {
        userId_eventType: { userId, eventType }
      },
      update: {
        ...enabled !== void 0 ? { enabled: Boolean(enabled) } : {},
        ...timingOffsetMinutes !== void 0 ? { timingOffsetMinutes: Number(timingOffsetMinutes) } : {},
        ...priority !== void 0 ? { priority: priority.trim() } : {},
        ...channels !== void 0 ? { channels: channels.trim() } : {}
      },
      create: {
        userId,
        eventType,
        enabled: enabled ?? true,
        timingOffsetMinutes: Number(timingOffsetMinutes) || 15,
        priority: priority || "NORMAL",
        channels: channels || "in_app,email"
      }
    });
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/notifications/gmail/auth-url", async (req, res) => {
  const userId = req.userId;
  try {
    const result = await gmailOAuthService.generateAuthUrl(userId);
    if (!result) {
      res.status(400).json({
        success: false,
        message: "H\u1EC7 th\u1ED1ng ch\u01B0a \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp Google OAuth Client ID / Secret trong bi\u1EBFn m\xF4i tr\u01B0\u1EDDng."
      });
      return;
    }
    res.json({ success: true, authUrl: result.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/notifications/gmail/disconnect", async (req, res) => {
  const userId = req.userId;
  try {
    const result = await gmailOAuthService.disconnect(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/notifications/test-email", async (req, res) => {
  const userId = req.userId;
  const { targetEmail } = req.body;
  try {
    const result = await gmailOAuthService.sendTestEmail(userId, targetEmail);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/notifications/deliveries", async (req, res) => {
  const userId = req.userId;
  try {
    const prisma = getPrisma();
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json({ success: true, deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/coupons/validate", couponRateLimiter, validateBody(CouponValidateSchema), async (req, res) => {
  try {
    const { code } = req.body;
    const cleanCode = code.toUpperCase().trim();
    const prisma = getPrisma();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });
    if (!coupon) {
      res.status(404).json({
        success: false,
        error: { code: "COUPON_NOT_FOUND", message: "M\xE3 gi\u1EA3m gi\xE1 kh\xF4ng t\u1ED3n t\u1EA1i." },
        message: "M\xE3 gi\u1EA3m gi\xE1 kh\xF4ng t\u1ED3n t\u1EA1i."
      });
      return;
    }
    if (coupon.status !== "Active") {
      res.status(400).json({
        success: false,
        error: { code: "COUPON_INACTIVE", message: "M\xE3 gi\u1EA3m gi\xE1 n\xE0y hi\u1EC7n kh\xF4ng c\xF2n \xE1p d\u1EE5ng." },
        message: "M\xE3 gi\u1EA3m gi\xE1 n\xE0y hi\u1EC7n kh\xF4ng c\xF2n \xE1p d\u1EE5ng."
      });
      return;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: { code: "COUPON_EXPIRED", message: "M\xE3 gi\u1EA3m gi\xE1 n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng." },
        message: "M\xE3 gi\u1EA3m gi\xE1 n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng."
      });
      return;
    }
    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({
        success: false,
        error: { code: "COUPON_LIMIT_REACHED", message: "M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng." },
        message: "M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng."
      });
      return;
    }
    res.json({
      success: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      message: `M\xE3 h\u1EE3p l\u1EC7! Gi\u1EA3m ${coupon.discountPercent}% cho \u0111\u01A1n h\xE0ng.`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/cart/checkout", paymentRateLimiter, validateBody(CartCheckoutSchema), async (req, res) => {
  const userId = req.userId;
  const { couponCode } = req.body;
  const prisma = getPrisma();
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId }
    });
    if (!cartItems.length) {
      res.status(400).json({
        success: false,
        error: { code: "EMPTY_CART", message: "Gi\u1ECF h\xE0ng c\u1EE7a b\u1EA1n \u0111ang tr\u1ED1ng." },
        message: "Gi\u1ECF h\xE0ng c\u1EE7a b\u1EA1n \u0111ang tr\u1ED1ng."
      });
      return;
    }
    const productIds = cartItems.map((c) => c.productId);
    const templates = await prisma.systemTemplate.findMany({
      where: { id: { in: productIds } }
    });
    const templateMap = new Map(templates.map((t) => [t.id, t]));
    let subtotal = 0;
    const orderItems = [];
    for (const item of cartItems) {
      const product = templateMap.get(item.productId);
      const price = product?.price || 0;
      subtotal += price * item.quantity;
      orderItems.push({
        productId: item.productId,
        productName: product?.title || "System Template",
        price,
        quantity: item.quantity
      });
    }
    let discountPercent = 0;
    let validCoupon = null;
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.toUpperCase().trim();
      validCoupon = await prisma.coupon.findUnique({ where: { code: cleanCode } });
      if (validCoupon && validCoupon.status === "Active") {
        if (!validCoupon.expiresAt || new Date(validCoupon.expiresAt).getTime() >= Date.now()) {
          if (validCoupon.usedCount < validCoupon.maxUses) {
            discountPercent = validCoupon.discountPercent;
          }
        }
      }
    }
    const discount = subtotal * discountPercent / 100;
    const total = Math.max(0, subtotal - discount);
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const txResults = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId,
          orderId,
          items: JSON.stringify(orderItems),
          subtotal,
          discount,
          total,
          status: "Paid",
          couponCode: discountPercent > 0 ? couponCode : null
        }
      }),
      prisma.payment.create({
        data: {
          userId,
          customerEmail: req.user.email,
          orderId,
          planRequested: "PRO",
          amount: total,
          method: "Bank Transfer",
          status: "Paid",
          txReference: `TX_${Date.now()}`
        }
      }),
      // Clear cart
      prisma.cartItem.deleteMany({
        where: { userId }
      }),
      // Increment coupon usage count atomically if used (only if strictly under maxUses)
      ...validCoupon ? [
        prisma.coupon.updateMany({
          where: {
            id: validCoupon.id,
            usedCount: { lt: validCoupon.maxUses }
          },
          data: { usedCount: { increment: 1 } }
        })
      ] : []
    ]);
    const createdOrder = txResults[0];
    const createdPayment = txResults[1];
    const couponResult = validCoupon ? txResults[3] : null;
    if (validCoupon && couponResult?.count === 0) {
      throw new Error("M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng do c\xF3 ng\u01B0\u1EDDi d\xF9ng kh\xE1c v\u1EEBa \xE1p d\u1EE5ng.");
    }
    await dbService.createAuditLog(
      userId,
      "CHECKOUT_ORDER_PAID",
      "orders",
      createdOrder.id,
      null,
      { orderId, total, itemsCount: orderItems.length }
    );
    res.json({
      success: true,
      message: "Thanh to\xE1n \u0111\u01A1n h\xE0ng th\xE0nh c\xF4ng!",
      order: createdOrder,
      payment: createdPayment
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({
      success: false,
      error: { code: "CHECKOUT_FAILED", message: err.message },
      message: err.message
    });
  }
});
var DEFAULT_BANK_CONFIG = {
  bankName: "MBBank (Ng\xE2n h\xE0ng TMCP Qu\xE2n \u0110\u1ED9i)",
  accountNumber: "888899998888",
  accountHolder: "CONG TY CONG NGHE LIFEOS",
  transferPrefix: "DUOTECH",
  bankCode: "MB",
  qrImageUrl: "",
  isActive: true
};
async function getPaymentBankConfig() {
  try {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "payment_bank_config" }
    });
    if (setting && setting.value) {
      return { ...DEFAULT_BANK_CONFIG, ...JSON.parse(setting.value) };
    }
  } catch (e) {
    if (e?.code === "P2021") {
      Promise.resolve().then(() => (init_db(), db_exports)).then(({ checkDbConnection: checkDbConnection2 }) => checkDbConnection2().catch(() => {
      }));
    }
  }
  return DEFAULT_BANK_CONFIG;
}
var DEFAULT_SERVICE_PLANS = [
  {
    id: "PERSONAL_1M",
    name: "G\xF3i C\xE1 Nh\xE2n (1 Th\xE1ng)",
    type: "PERSONAL",
    durationDays: 30,
    price: 29e3,
    monthlyPrice: 29e3,
    yearlyPrice: 0,
    billingCycle: "1 th\xE1ng (30 ng\xE0y)",
    badge: "Ti\u1EBFt ki\u1EC7m",
    description: "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS trong 1 th\xE1ng (30 ng\xE0y). B\u1EAFt bu\u1ED9c c\xF3 g\xF3i tr\u1EA3 ph\xED \u0111\u1EC3 truy c\u1EADp h\u1EC7 th\u1ED1ng.",
    status: "ACTIVE",
    order: 1,
    features: [
      "To\xE0n b\u1ED9 t\xEDnh n\u0103ng Qu\u1EA3n l\xFD C\xF4ng vi\u1EC7c & D\u1EF1 \xE1n (Kanban, L\u1ECBch, B\u1ED9 l\u1ECDc)",
      "Qu\u1EA3n l\xFD T\xE0i ch\xEDnh, V\xED ti\u1EC1n, Ng\xE2n s\xE1ch v\xE0 B\xE1o c\xE1o thu chi",
      "Theo d\xF5i Th\xF3i quen, Chu\u1ED7i streak v\xE0 M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng",
      "Decision Engine & M\xF4 ph\u1ECFng k\u1ECBch b\u1EA3n What-if",
      "Automation Rules Engine k\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng",
      "Kh\xF4ng gian H\u1ECDc t\u1EADp, Pomodoro Focus v\xE0 Ghi ch\xFA kh\xF4ng gi\u1EDBi h\u1EA1n",
      "\u0110\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u th\u1EDDi gian th\u1EF1c v\xE0 t\u1EF1 \u0111\u1ED9ng sao l\u01B0u an to\xE0n"
    ],
    quota: "1 ng\u01B0\u1EDDi d\xF9ng, kh\xF4ng gi\u1EDBi h\u1EA1n t\xEDnh n\u0103ng"
  },
  {
    id: "PERSONAL_3M",
    name: "G\xF3i C\xE1 Nh\xE2n (3 Th\xE1ng)",
    type: "PERSONAL",
    durationDays: 90,
    price: 79e3,
    monthlyPrice: 79e3,
    yearlyPrice: 0,
    billingCycle: "3 th\xE1ng (90 ng\xE0y)",
    badge: "Ph\u1ED5 bi\u1EBFn nh\u1EA5t",
    description: "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng trong 3 th\xE1ng (90 ng\xE0y) li\xEAn t\u1EE5c v\u1EDBi chi ph\xED \u01B0u \u0111\xE3i 79.000 VN\u0110.",
    status: "ACTIVE",
    order: 2,
    features: [
      "Bao g\u1ED3m to\xE0n b\u1ED9 quy\u1EC1n l\u1EE3i c\u1EE7a G\xF3i C\xE1 Nh\xE2n 1 Th\xE1ng",
      "Th\u1EDDi h\u1EA1n s\u1EED d\u1EE5ng 90 ng\xE0y li\xEAn t\u1EE5c",
      "Ti\u1EBFt ki\u1EC7m 8.000 VN\u0110 so v\u1EDBi gia h\u1EA1n t\u1EEBng th\xE1ng",
      "\u0110\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u th\u1EDDi gian th\u1EF1c v\xE0 sao l\u01B0u t\u1EF1 \u0111\u1ED9ng",
      "H\u1ED7 tr\u1EE3 k\u1EF9 thu\u1EADt \u01B0u ti\xEAn 24/7"
    ],
    quota: "1 ng\u01B0\u1EDDi d\xF9ng, 90 ng\xE0y li\xEAn t\u1EE5c"
  },
  {
    id: "TEAM_1M",
    name: "G\xF3i \u0110\u1ED9i Ng\u0169 (Team 1 Th\xE1ng)",
    type: "TEAM",
    durationDays: 30,
    price: 99e3,
    monthlyPrice: 99e3,
    yearlyPrice: 0,
    maxTeamMembers: 5,
    billingCycle: "1 th\xE1ng (30 ng\xE0y)",
    badge: "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn",
    description: "D\xE0nh cho \u0111\u1ED9i ng\u0169 l\xE0m vi\u1EC7c c\u1ED9ng t\xE1c. Ch\u1EE7 team \u0111\u01B0\u1EE3c m\u1EDDi th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng c\xF9ng s\u1EED d\u1EE5ng \u0111\u1EA7y \u0111\u1EE7 m\u1ECDi ch\u1EE9c n\u0103ng.",
    status: "ACTIVE",
    order: 3,
    features: [
      "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS cho Ch\u1EE7 Team",
      "Cho ph\xE9p Ch\u1EE7 Team th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng v\xE0o Team",
      "T\u1EA5t c\u1EA3 th\xE0nh vi\xEAn trong Team \u0111\u01B0\u1EE3c h\u01B0\u1EDFng to\xE0n b\u1ED9 t\xEDnh n\u0103ng tr\u1EA3 ph\xED",
      "Ch\u1EE7 Team c\xF3 to\xE0n quy\u1EC1n qu\u1EA3n tr\u1ECB, th\xEAm/x\xF3a th\xE0nh vi\xEAn linh ho\u1EA1t",
      "T\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 v\xE0 ki\u1EC3m so\xE1t quy\u1EC1n an to\xE0n khi g\xF3i Team c\xF2n h\u1EA1n"
    ],
    quota: "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn / nh\xF3m"
  },
  {
    id: "PRO",
    name: "Pro",
    type: "PERSONAL",
    durationDays: 30,
    price: 199e3,
    monthlyPrice: 199e3,
    yearlyPrice: 199e4,
    billingCycle: "30 ng\xE0y",
    badge: "Chuy\xEAn nghi\u1EC7p",
    description: "G\xF3i chuy\xEAn nghi\u1EC7p Pro cho c\xE1 nh\xE2n qu\u1EA3n l\xFD to\xE0n di\u1EC7n.",
    status: "ACTIVE",
    order: 4,
    features: [
      "To\xE0n b\u1ED9 t\xEDnh n\u0103ng Qu\u1EA3n l\xFD C\xF4ng vi\u1EC7c & D\u1EF1 \xE1n (Kanban, L\u1ECBch, B\u1ED9 l\u1ECDc)",
      "Qu\u1EA3n l\xFD T\xE0i ch\xEDnh, V\xED ti\u1EC1n, Ng\xE2n s\xE1ch v\xE0 B\xE1o c\xE1o thu chi",
      "Theo d\xF5i Th\xF3i quen, Chu\u1ED7i streak v\xE0 M\u1EE5c ti\xEAu cu\u1ED9c s\u1ED1ng",
      "Decision Engine & M\xF4 ph\u1ECFng k\u1ECBch b\u1EA3n What-if",
      "Automation Rules Engine k\xEDch ho\u1EA1t t\u1EF1 \u0111\u1ED9ng"
    ],
    quota: "1 ng\u01B0\u1EDDi d\xF9ng, kh\xF4ng gi\u1EDBi h\u1EA1n t\xEDnh n\u0103ng"
  },
  {
    id: "TEAM",
    name: "Team",
    type: "TEAM",
    durationDays: 30,
    price: 499e3,
    monthlyPrice: 499e3,
    yearlyPrice: 499e4,
    maxTeamMembers: 5,
    billingCycle: "30 ng\xE0y",
    badge: "Doanh nghi\u1EC7p & \u0110\u1ED9i ng\u0169",
    description: "D\xE0nh cho \u0111\u1ED9i ng\u0169 l\xE0m vi\u1EC7c c\u1ED9ng t\xE1c.",
    status: "ACTIVE",
    order: 5,
    features: [
      "M\u1EDF kh\xF3a to\xE0n b\u1ED9 ch\u1EE9c n\u0103ng LifeOS cho Ch\u1EE7 Team",
      "Cho ph\xE9p Ch\u1EE7 Team th\xEAm t\u1ED1i \u0111a 5 ng\u01B0\u1EDDi d\xF9ng v\xE0o Team"
    ],
    quota: "T\u1ED1i \u0111a 5 th\xE0nh vi\xEAn / nh\xF3m"
  }
];
async function getServicePlansConfig() {
  const plans = await subscriptionService.getPlans(true);
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    badge: p.badge,
    description: p.description,
    price: p.price,
    monthlyPrice: p.price,
    yearlyPrice: p.yearlyPrice || 0,
    durationDays: p.durationDays || (p.id === "PERSONAL_3M" ? 90 : 30),
    type: p.type,
    maxTeamMembers: p.maxTeamMembers,
    billingCycle: p.billingCycle,
    status: p.status || "ACTIVE",
    order: p.order || 1,
    features: p.features || [],
    quota: p.quota,
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy
  }));
}
var DEFAULT_LANGUAGES = [
  { code: "vi", name: "Ti\u1EBFng Vi\u1EC7t", flag: "\u{1F1FB}\u{1F1F3}", status: "ACTIVE", isDefault: true },
  { code: "en", name: "English", flag: "\u{1F1EC}\u{1F1E7}", status: "ACTIVE", isDefault: false }
];
async function getSystemLanguagesConfig() {
  try {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "system_languages_config" }
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    if (e?.code === "P2021") {
      Promise.resolve().then(() => (init_db(), db_exports)).then(({ checkDbConnection: checkDbConnection2 }) => checkDbConnection2().catch(() => {
      }));
    }
  }
  return DEFAULT_LANGUAGES;
}
apiRouter.get("/payments/bank-config", async (req, res) => {
  try {
    const config = await getPaymentBankConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/payments/plans", async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans(false);
    const formatted = plans.map((p) => ({
      id: p.id,
      name: p.name,
      badge: p.badge,
      description: p.description,
      type: p.type,
      durationDays: p.durationDays,
      price: p.price,
      monthlyPrice: p.price,
      yearlyPrice: p.yearlyPrice || 0,
      billingCycle: p.billingCycle,
      benefits: p.features || [],
      quota: p.quota,
      maxTeamMembers: p.maxTeamMembers,
      pricing: {
        monthly: { price: p.price, durationDays: p.durationDays },
        yearly: { price: p.yearlyPrice || 0, durationDays: 365 }
      }
    }));
    res.json({
      success: true,
      plans: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/payments/bank-config", requireAdmin, validateBody(AdminUpdateBankConfigSchema), async (req, res) => {
  const prisma = getPrisma();
  const userId = req.userId;
  const newConfig = req.body;
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: "payment_bank_config" },
      update: { value: JSON.stringify(newConfig) },
      create: { key: "payment_bank_config", value: JSON.stringify(newConfig) }
    });
    await dbService.createAuditLog(
      userId,
      "ADMIN_UPDATE_BANK_CONFIG",
      "system_settings",
      setting.id,
      null,
      newConfig
    );
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt th\xF4ng tin ng\xE2n h\xE0ng th\xE0nh c\xF4ng!",
      config: newConfig
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/plans", requireAdmin, async (req, res) => {
  try {
    const plans = await getServicePlansConfig();
    const sorted = [...plans].sort((a, b) => a.order - b.order);
    res.json({
      success: true,
      plans: sorted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/plans/:id", requireAdmin, validateBody(AdminUpdatePlanSchema), async (req, res) => {
  const planId = req.params.id.toUpperCase();
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const updateData = req.body;
  const prisma = getPrisma();
  try {
    const plans = await getServicePlansConfig();
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) {
      res.status(404).json({
        success: false,
        message: `Kh\xF4ng t\xECm th\u1EA5y g\xF3i d\u1ECBch v\u1EE5 c\xF3 m\xE3 '${planId}'.`
      });
      return;
    }
    const oldPlan = plans[index];
    const durationDays = updateData.durationDays !== void 0 ? Number(updateData.durationDays) : oldPlan.durationDays || (planId === "PERSONAL_3M" ? 90 : 30);
    const monthlyPrice = Number(updateData.monthlyPrice);
    const yearlyPrice = Number(updateData.yearlyPrice || 0);
    const updatedPlan = {
      ...oldPlan,
      name: updateData.name,
      description: updateData.description,
      price: monthlyPrice,
      monthlyPrice,
      yearlyPrice,
      durationDays,
      type: updateData.type || oldPlan.type || (planId.includes("TEAM") ? "TEAM" : "PERSONAL"),
      maxTeamMembers: updateData.maxTeamMembers !== void 0 ? Number(updateData.maxTeamMembers) : oldPlan.maxTeamMembers ?? (planId.includes("TEAM") ? 5 : 0),
      billingCycle: updateData.billingCycle || (durationDays === 90 ? "3 th\xE1ng (90 ng\xE0y)" : "1 th\xE1ng (30 ng\xE0y)"),
      status: updateData.status,
      order: Number(updateData.order ?? oldPlan.order),
      features: updateData.features || oldPlan.features,
      quota: updateData.quota ?? oldPlan.quota,
      badge: updateData.badge ?? oldPlan.badge,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: adminEmail
    };
    const newPlans = [...plans];
    newPlans[index] = updatedPlan;
    await prisma.systemSetting.upsert({
      where: { key: "service_plans_config" },
      update: { value: JSON.stringify(newPlans) },
      create: { key: "service_plans_config", value: JSON.stringify(newPlans) }
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_UPDATE_PLAN",
      "service_plans",
      planId,
      {
        planId,
        name: oldPlan.name,
        monthlyPrice: oldPlan.monthlyPrice,
        yearlyPrice: oldPlan.yearlyPrice,
        durationDays: oldPlan.durationDays,
        billingCycle: oldPlan.billingCycle,
        status: oldPlan.status,
        features: oldPlan.features,
        quota: oldPlan.quota
      },
      {
        planId,
        name: updatedPlan.name,
        monthlyPrice: updatedPlan.monthlyPrice,
        yearlyPrice: updatedPlan.yearlyPrice,
        durationDays: updatedPlan.durationDays,
        billingCycle: updatedPlan.billingCycle,
        status: updatedPlan.status,
        features: updatedPlan.features,
        quota: updatedPlan.quota,
        updatedBy: adminEmail,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    res.json({
      success: true,
      message: `C\u1EADp nh\u1EADt th\xF4ng tin g\xF3i ${updatedPlan.name} th\xE0nh c\xF4ng!`,
      plan: updatedPlan,
      plans: newPlans
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/plans/audit-history", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: "ADMIN_UPDATE_PLAN" },
      orderBy: { timestamp: "desc" },
      take: 50
    });
    res.json({
      success: true,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/plans/reset-defaults", requireAdmin, async (req, res) => {
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const prisma = getPrisma();
  try {
    await prisma.systemSetting.upsert({
      where: { key: "service_plans_config" },
      update: { value: JSON.stringify(DEFAULT_SERVICE_PLANS) },
      create: { key: "service_plans_config", value: JSON.stringify(DEFAULT_SERVICE_PLANS) }
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_RESET_PLANS",
      "service_plans",
      "ALL",
      null,
      { plans: DEFAULT_SERVICE_PLANS, updatedBy: adminEmail, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    );
    res.json({
      success: true,
      message: "\u0110\xE3 kh\xF4i ph\u1EE5c v\xE0 \u0111\u1ED3ng b\u1ED9 danh s\xE1ch g\xF3i d\u1ECBch v\u1EE5 v\u1EC1 c\u1EA5u h\xECnh ch\xEDnh th\u1EE9c th\xE0nh c\xF4ng!",
      plans: DEFAULT_SERVICE_PLANS
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/languages", requireAdmin, async (req, res) => {
  try {
    const languages = await getSystemLanguagesConfig();
    res.json({
      success: true,
      languages
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/languages", requireAdmin, validateBody(AdminUpdateLanguagesSchema), async (req, res) => {
  const adminId = req.userId;
  const { languages } = req.body;
  const prisma = getPrisma();
  try {
    const hasActive = languages.some((l) => l.status === "ACTIVE");
    if (!hasActive) {
      res.status(400).json({
        success: false,
        message: "H\u1EC7 th\u1ED1ng b\u1EAFt bu\u1ED9c ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 1 ng\xF4n ng\u1EEF ho\u1EA1t \u0111\u1ED9ng."
      });
      return;
    }
    const hasDefault = languages.some((l) => l.isDefault && l.status === "ACTIVE");
    if (!hasDefault) {
      const firstActive = languages.find((l) => l.status === "ACTIVE");
      if (firstActive) firstActive.isDefault = true;
    }
    await prisma.systemSetting.upsert({
      where: { key: "system_languages_config" },
      update: { value: JSON.stringify(languages) },
      create: { key: "system_languages_config", value: JSON.stringify(languages) }
    });
    await dbService.createAuditLog(
      adminId,
      "ADMIN_UPDATE_LANGUAGES",
      "system_settings",
      "system_languages_config",
      null,
      languages
    );
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt c\u1EA5u h\xECnh ng\xF4n ng\u1EEF th\xE0nh c\xF4ng!",
      languages
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.delete("/admin/languages/:code", requireAdmin, async (req, res) => {
  const adminId = req.userId;
  const code = req.params.code.toLowerCase().trim();
  const prisma = getPrisma();
  try {
    const languages = await getSystemLanguagesConfig();
    const target = languages.find((l) => l.code === code);
    if (!target) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\xF4n ng\u1EEF c\u1EA7n x\xF3a." });
      return;
    }
    if (target.isDefault) {
      res.status(400).json({ success: false, message: "Kh\xF4ng th\u1EC3 x\xF3a ng\xF4n ng\u1EEF \u0111ang \u0111\u01B0\u1EE3c \u0111\u1EB7t l\xE0m m\u1EB7c \u0111\u1ECBnh." });
      return;
    }
    if (code === "vi") {
      res.status(400).json({ success: false, message: "Ng\xF4n ng\u1EEF Ti\u1EBFng Vi\u1EC7t l\xE0 ng\xF4n ng\u1EEF h\u1EC7 th\u1ED1ng b\u1EAFt bu\u1ED9c, kh\xF4ng th\u1EC3 x\xF3a." });
      return;
    }
    const filtered = languages.filter((l) => l.code !== code);
    await prisma.systemSetting.upsert({
      where: { key: "system_languages_config" },
      update: { value: JSON.stringify(filtered) },
      create: { key: "system_languages_config", value: JSON.stringify(filtered) }
    });
    await dbService.createAuditLog(adminId, "ADMIN_DELETE_LANGUAGE", "system_settings", code, target, null);
    res.json({
      success: true,
      message: `\u0110\xE3 x\xF3a ng\xF4n ng\u1EEF ${target.name} (${target.code}) th\xE0nh c\xF4ng.`,
      languages: filtered
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/payments/checkout-session", paymentRateLimiter, validateBody(SaaSCheckoutSessionSchema), async (req, res) => {
  const userId = req.userId;
  const { plan, cycle, couponCode, paymentMethod } = req.body;
  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true, planExpiresAt: true }
    });
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i." },
        message: "T\xE0i kho\u1EA3n kh\xF4ng t\u1ED3n t\u1EA1i."
      });
      return;
    }
    const planConfig = await subscriptionService.getPlanById(plan);
    if (!planConfig) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PLAN", message: `G\xF3i d\u1ECBch v\u1EE5 '${plan}' kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c hi\u1EC7n \u0111ang t\u1EA1m ng\u01B0ng.` },
        message: `G\xF3i d\u1ECBch v\u1EE5 '${plan}' kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c hi\u1EC7n \u0111ang t\u1EA1m ng\u01B0ng.`
      });
      return;
    }
    const subtotal = cycle === "yearly" && planConfig.yearlyPrice && planConfig.yearlyPrice > 0 ? planConfig.yearlyPrice : planConfig.price;
    let discountPercent = 0;
    let couponRecord = null;
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.toUpperCase().trim();
      couponRecord = await prisma.coupon.findUnique({ where: { code: cleanCode } });
      if (couponRecord && couponRecord.status === "Active") {
        const notExpired = !couponRecord.expiresAt || new Date(couponRecord.expiresAt).getTime() >= Date.now();
        const hasRemainingUses = couponRecord.usedCount < couponRecord.maxUses;
        if (notExpired && hasRemainingUses) {
          discountPercent = couponRecord.discountPercent;
        }
      }
    }
    const discount = Math.round(subtotal * discountPercent / 100);
    const total = Math.max(0, subtotal - discount);
    const bankConfig = await getPaymentBankConfig();
    if (bankConfig.isActive === false) {
      res.status(400).json({
        success: false,
        error: { code: "PAYMENT_METHOD_INACTIVE", message: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n chuy\u1EC3n kho\u1EA3n ng\xE2n h\xE0ng hi\u1EC7n \u0111ang t\u1EA1m ng\u01B0ng." },
        message: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n chuy\u1EC3n kho\u1EA3n ng\xE2n h\xE0ng hi\u1EC7n \u0111ang t\u1EA1m ng\u01B0ng."
      });
      return;
    }
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const prefix = (bankConfig.transferPrefix || "DUOTECH").trim();
    const txReference = `${prefix} ${orderId}`;
    const orderMetadata = {
      plan: planConfig.id,
      planName: planConfig.name,
      planType: planConfig.type,
      cycle: planConfig.billingCycle,
      durationDays: planConfig.durationDays,
      subtotal,
      discount,
      total,
      couponCode: discountPercent > 0 ? couponCode : null,
      paymentMethod: paymentMethod || "vietqr"
    };
    const [order, payment] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId,
          orderId,
          items: JSON.stringify([orderMetadata]),
          subtotal,
          discount,
          total,
          status: "PENDING",
          couponCode: discountPercent > 0 ? couponCode : null
        }
      }),
      prisma.payment.create({
        data: {
          userId,
          customerEmail: user.email,
          orderId,
          planRequested: plan,
          amount: total,
          method: "VietQR Bank Transfer",
          status: "PENDING",
          txReference,
          billingCycle: cycle,
          note: JSON.stringify({
            ...orderMetadata,
            snapshotAt: (/* @__PURE__ */ new Date()).toISOString(),
            appliedPrice: total,
            planConfigSnapshot: {
              id: planConfig.id,
              name: planConfig.name,
              price: planConfig.price,
              billingCycle: planConfig.billingCycle
            }
          })
        }
      })
    ]);
    const dynamicQrUrl = `https://img.vietqr.io/image/${bankConfig.bankCode || "MB"}-${bankConfig.accountNumber}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(txReference)}&accountName=${encodeURIComponent(bankConfig.accountHolder)}`;
    const qrUrl = bankConfig.qrImageUrl && bankConfig.qrImageUrl.trim() ? bankConfig.qrImageUrl : dynamicQrUrl;
    res.json({
      success: true,
      checkoutSession: {
        orderId: order.orderId,
        paymentId: payment.id,
        txReference,
        plan,
        planName: planConfig.name,
        cycle,
        durationText: cycle === "yearly" && planConfig.yearlyPrice && planConfig.yearlyPrice > 0 ? "1 n\u0103m (365 ng\xE0y)" : `${planConfig.durationDays} ng\xE0y`,
        subtotal,
        discount,
        discountPercent,
        total,
        customerEmail: user.email,
        paymentMethod: "vietqr",
        bankInfo: {
          bankName: bankConfig.bankName,
          accountNumber: bankConfig.accountNumber,
          accountHolder: bankConfig.accountHolder,
          bankCode: bankConfig.bankCode || "MB",
          amount: total,
          transferMemo: txReference,
          qrUrl,
          dynamicQrUrl,
          customQrUrl: bankConfig.qrImageUrl || null
        },
        status: "PENDING"
      }
    });
  } catch (err) {
    console.error("Create checkout session error:", err);
    res.status(500).json({
      success: false,
      error: { code: "CHECKOUT_SESSION_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/payments/submit-request", paymentRateLimiter, validateBody(SubmitPaymentRequestSchema), async (req, res) => {
  const userId = req.userId;
  const { orderId, note } = req.body;
  const prisma = getPrisma();
  try {
    const payment = await prisma.payment.findFirst({
      where: { orderId, userId }
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: "PAYMENT_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin \u0111\u01A1n h\xE0ng n\xE0y." },
        message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin \u0111\u01A1n h\xE0ng n\xE0y."
      });
      return;
    }
    if (payment.status === "APPROVED" || payment.status === "Paid") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_APPROVED", message: "Y\xEAu c\u1EA7u thanh to\xE1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t v\xE0 k\xEDch ho\u1EA1t tr\u01B0\u1EDBc \u0111\xF3." },
        message: "Y\xEAu c\u1EA7u thanh to\xE1n n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t v\xE0 k\xEDch ho\u1EA1t tr\u01B0\u1EDBc \u0111\xF3."
      });
      return;
    }
    if (payment.status !== "PENDING") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "\u0110\u01A1n h\xE0ng n\xE0y \u0111\xE3 b\u1ECB h\u1EE7y ho\u1EB7c t\u1EEB ch\u1ED1i. Vui l\xF2ng t\u1EA1o \u0111\u01A1n thanh to\xE1n m\u1EDBi." },
        message: "\u0110\u01A1n h\xE0ng n\xE0y \u0111\xE3 b\u1ECB h\u1EE7y ho\u1EB7c t\u1EEB ch\u1ED1i. Vui l\xF2ng t\u1EA1o \u0111\u01A1n thanh to\xE1n m\u1EDBi."
      });
      return;
    }
    let mergedNote = payment.note || "Kh\xE1ch h\xE0ng \u0111\xE3 b\xE1o ho\xE0n t\u1EA5t chuy\u1EC3n kho\u1EA3n";
    if (note) {
      const customerNote = String(note).trim().slice(0, 500);
      try {
        const snap = JSON.parse(payment.note || "");
        mergedNote = JSON.stringify({ ...snap, customerNote });
      } catch {
        mergedNote = customerNote;
      }
    }
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PENDING",
        note: mergedNote
      }
    });
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
        select: { id: true }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Y\xEAu c\u1EA7u n\xE2ng c\u1EA5p g\xF3i m\u1EDBi (${payment.planRequested})`,
            message: `Kh\xE1ch h\xE0ng ${req.user.email} v\u1EEBa b\xE1o \u0111\xE3 chuy\u1EC3n kho\u1EA3n ${payment.amount.toLocaleString("vi-VN")} \u20AB (${payment.txReference}). Vui l\xF2ng ki\u1EC3m tra v\xE0 duy\u1EC7t.`,
            type: "Info",
            read: false
          }
        });
      }
    } catch (notifErr) {
      console.warn("Failed to notify admins:", notifErr);
    }
    SystemNotificationHelper.onPaymentRequested({
      id: updatedPayment.id,
      orderId: updatedPayment.orderId,
      txReference: updatedPayment.txReference || payment.txReference,
      amount: updatedPayment.amount || payment.amount,
      planRequested: updatedPayment.planRequested || payment.planRequested,
      billingCycle: updatedPayment.billingCycle || payment.billingCycle,
      userEmail: req.user.email,
      userName: req.user.name,
      note: typeof note === "string" ? note : void 0
    }).catch((err) => console.warn("[EmailQueue] Error enqueuing payment request email:", err));
    res.json({
      success: true,
      message: "Y\xEAu c\u1EA7u \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi. Vui l\xF2ng ch\u1EDD qu\u1EA3n tr\u1ECB vi\xEAn x\xE1c nh\u1EADn thanh to\xE1n.",
      payment: updatedPayment
    });
  } catch (err) {
    console.error("Submit payment request error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SUBMIT_REQUEST_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.get("/payments/my-requests", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const requests = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      success: true,
      requests
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/payments/active-pending-request", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const activePending = await prisma.payment.findFirst({
      where: {
        userId,
        status: "PENDING"
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      success: true,
      activePending: activePending || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/payments/cancel-request", async (req, res) => {
  const userId = req.userId;
  const { orderId } = req.body;
  const prisma = getPrisma();
  try {
    const payment = await prisma.payment.findFirst({
      where: { orderId, userId, status: "PENDING" }
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u ch\u1EDD duy\u1EC7t h\u1EE3p l\u1EC7 \u0111\u1EC3 h\u1EE7y."
      });
      return;
    }
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" }
    });
    await prisma.order.updateMany({
      where: { orderId, userId },
      data: { status: "CANCELLED" }
    });
    try {
      await referralService.processOrderCancelledOrRefunded(orderId, "Ng\u01B0\u1EDDi d\xF9ng h\u1EE7y y\xEAu c\u1EA7u thanh to\xE1n");
    } catch (refErr) {
      console.warn("[Referral] Error handling cancelled order commission:", refErr);
    }
    res.json({
      success: true,
      message: "\u0110\xE3 h\u1EE7y y\xEAu c\u1EA7u thanh to\xE1n th\xE0nh c\xF4ng.",
      payment: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/payments/requests", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const { status, plan, search } = req.query;
  try {
    const whereClause = {};
    if (status && status !== "ALL") {
      if (status === "PENDING") whereClause.status = "PENDING";
      else if (status === "APPROVED") whereClause.status = { in: ["APPROVED", "Paid"] };
      else if (status === "REJECTED") whereClause.status = "REJECTED";
      else if (status === "CANCELLED") whereClause.status = "CANCELLED";
      else whereClause.status = String(status);
    }
    if (plan && plan !== "ALL") {
      whereClause.planRequested = plan;
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      whereClause.OR = [
        { customerEmail: { contains: q, mode: "insensitive" } },
        { orderId: { contains: q, mode: "insensitive" } },
        { txReference: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } }
      ];
    }
    const requests = await prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            plan: true,
            planExpiresAt: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { createdAt: "desc" }
      ],
      take: 100
    });
    const [allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: { in: ["APPROVED", "Paid"] } } }),
      prisma.payment.count({ where: { status: "REJECTED" } })
    ]);
    res.json({
      success: true,
      requests,
      counts: {
        all: allCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/payments/:id/approve", requireAdmin, async (req, res) => {
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const prisma = getPrisma();
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: "PAYMENT_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u thanh to\xE1n n\xE0y." },
        message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u thanh to\xE1n n\xE0y."
      });
      return;
    }
    if (payment.status === "APPROVED" || payment.status === "Paid") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_APPROVED", message: `Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t tr\u01B0\u1EDBc \u0111\xF3 b\u1EDFi ${payment.approvedBy || "qu\u1EA3n tr\u1ECB vi\xEAn"}.` },
        message: `Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t tr\u01B0\u1EDBc \u0111\xF3 b\u1EDFi ${payment.approvedBy || "qu\u1EA3n tr\u1ECB vi\xEAn"}.`
      });
      return;
    }
    if (payment.status !== "PENDING") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_STATUS", message: `Y\xEAu c\u1EA7u \u0111ang \u1EDF tr\u1EA1ng th\xE1i "${payment.status}", kh\xF4ng th\u1EC3 duy\u1EC7t.` },
        message: `Y\xEAu c\u1EA7u \u0111ang \u1EDF tr\u1EA1ng th\xE1i "${payment.status}", kh\xF4ng th\u1EC3 duy\u1EC7t.`
      });
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const claim = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "APPROVED", approvedAt: now, approvedBy: adminEmail }
    });
    if (claim.count !== 1) {
      res.status(409).json({
        success: false,
        error: { code: "ALREADY_PROCESSED", message: "Y\xEAu c\u1EA7u n\xE0y v\u1EEBa \u0111\u01B0\u1EE3c x\u1EED l\xFD b\u1EDFi m\u1ED9t thao t\xE1c kh\xE1c." },
        message: "Y\xEAu c\u1EA7u n\xE0y v\u1EEBa \u0111\u01B0\u1EE3c x\u1EED l\xFD b\u1EDFi m\u1ED9t thao t\xE1c kh\xE1c."
      });
      return;
    }
    const planCfg = await subscriptionService.getPlanById(payment.planRequested);
    const isYearly = payment.billingCycle === "yearly" && !!planCfg?.yearlyPrice && planCfg.yearlyPrice > 0;
    let subscription;
    try {
      subscription = await subscriptionService.activateSubscription(payment.userId, payment.planRequested, {
        txReference: payment.txReference || `TX_${payment.orderId}`,
        paymentId: payment.id,
        amount: payment.amount,
        ...isYearly ? { customDurationDays: 365 } : {}
      });
    } catch (activationErr) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PENDING", approvedAt: null, approvedBy: null }
      });
      throw activationErr;
    }
    await prisma.order.updateMany({
      where: { orderId: payment.orderId },
      data: { status: "APPROVED" }
    });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    const updatedUser = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true, avatar: true }
    });
    const planToActivate = subscription.planName || payment.planRequested;
    const planExpiresAt = subscription.endDate;
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: `Y\xEAu c\u1EA7u n\xE2ng c\u1EA5p g\xF3i ${planToActivate} \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t!`,
        message: `Qu\u1EA3n tr\u1ECB vi\xEAn \u0111\xE3 x\xE1c nh\u1EADn thanh to\xE1n (${payment.txReference}). T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c n\xE2ng c\u1EA5p l\xEAn g\xF3i ${planToActivate}, th\u1EDDi h\u1EA1n s\u1EED d\u1EE5ng \u0111\u1EBFn ng\xE0y ${new Date(planExpiresAt).toLocaleDateString("vi-VN")}.`,
        type: "Success",
        read: false
      }
    });
    if (updatedUser?.email) {
      SystemNotificationHelper.onPaymentApproved({
        orderId: payment.orderId,
        txReference: payment.txReference,
        amount: payment.amount || 0,
        planName: planToActivate,
        expiresAt: planExpiresAt,
        userEmail: updatedUser.email,
        userName: updatedUser.name
      }).catch((e) => console.error("[EmailQueue] Error enqueuing payment approve email:", e));
    }
    try {
      await referralService.processOrderApproved(
        payment.orderId,
        payment.amount || 0,
        payment.userId
      );
    } catch (refErr) {
      console.warn("[Referral] Error processing commission on payment approval:", refErr);
    }
    await dbService.createAuditLog(
      adminId,
      "ADMIN_APPROVE_PAYMENT",
      "payments",
      payment.id,
      { status: "PENDING" },
      { status: "APPROVED", plan: planToActivate, planExpiresAt, approvedBy: adminEmail, amount: payment.amount }
    );
    res.json({
      success: true,
      message: `\u0110\xE3 duy\u1EC7t thanh to\xE1n th\xE0nh c\xF4ng! G\xF3i ${planToActivate} \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t cho kh\xE1ch h\xE0ng.`,
      payment: updatedPayment,
      user: updatedUser,
      subscription
    });
  } catch (err) {
    console.error("Admin approve payment error:", err);
    res.status(500).json({
      success: false,
      error: { code: "APPROVE_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/admin/payments/:id/reject", requireAdmin, validateBody(AdminRejectPaymentSchema), async (req, res) => {
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const { reason } = req.body;
  const prisma = getPrisma();
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: "PAYMENT_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u thanh to\xE1n n\xE0y." },
        message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u thanh to\xE1n n\xE0y."
      });
      return;
    }
    if (payment.status === "APPROVED" || payment.status === "Paid") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_APPROVED", message: "Kh\xF4ng th\u1EC3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t th\xE0nh c\xF4ng." },
        message: "Kh\xF4ng th\u1EC3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t th\xE0nh c\xF4ng."
      });
      return;
    }
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        rejectedReason: reason,
        approvedBy: adminEmail,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await prisma.order.updateMany({
      where: { orderId: payment.orderId },
      data: { status: "REJECTED" }
    });
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: `Y\xEAu c\u1EA7u thanh to\xE1n g\xF3i ${payment.planRequested} b\u1ECB t\u1EEB ch\u1ED1i`,
        message: `Y\xEAu c\u1EA7u thanh to\xE1n (${payment.txReference}) \u0111\xE3 b\u1ECB t\u1EEB ch\u1ED1i. L\xFD do: ${reason}`,
        type: "Error",
        read: false
      }
    });
    const targetEmail = payment.user?.email || payment.customerEmail;
    if (targetEmail) {
      SystemNotificationHelper.onPaymentRejected({
        orderId: payment.orderId,
        txReference: payment.txReference,
        amount: payment.amount || 0,
        planName: payment.planRequested,
        userEmail: targetEmail,
        userName: payment.user?.name,
        reason: reason || "Th\xF4ng tin chuy\u1EC3n kho\u1EA3n kh\xF4ng tr\xF9ng kh\u1EDBp ho\u1EB7c ch\u01B0a nh\u1EADn \u0111\u01B0\u1EE3c ti\u1EC1n."
      }).catch((e) => console.error("[EmailQueue] Error enqueuing payment reject email:", e));
    }
    try {
      await referralService.processOrderCancelledOrRefunded(payment.orderId, `Thanh to\xE1n b\u1ECB t\u1EEB ch\u1ED1i: ${reason}`);
    } catch (refErr) {
      console.warn("[Referral] Error handling rejected payment commission rollback:", refErr);
    }
    await dbService.createAuditLog(
      adminId,
      "ADMIN_REJECT_PAYMENT",
      "payments",
      payment.id,
      { status: payment.status },
      { status: "REJECTED", reason, rejectedBy: adminEmail }
    );
    res.json({
      success: true,
      message: "\u0110\xE3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u thanh to\xE1n.",
      payment: updatedPayment
    });
  } catch (err) {
    console.error("Admin reject payment error:", err);
    res.status(500).json({
      success: false,
      error: { code: "REJECT_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/admin/payments/:id/refund", requireAdmin, async (req, res) => {
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const { reason } = req.body;
  try {
    const result = await subscriptionService.cancelSubscriptionOnRefund(paymentId, reason, adminEmail);
    await dbService.createAuditLog(
      adminId,
      "ADMIN_REFUND_PAYMENT",
      "payments",
      paymentId,
      null,
      { reason, refundedBy: adminEmail }
    );
    res.json({
      success: true,
      message: "\u0110\xE3 ho\xE0n ti\u1EC1n v\xE0 thu h\u1ED3i quy\u1EC1n g\xF3i d\u1ECBch v\u1EE5 th\xE0nh c\xF4ng!",
      payment: result.payment,
      user: result.user
    });
  } catch (err) {
    console.error("Admin refund error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/subscriptions", requireAdmin, async (req, res) => {
  const { status, search, planId, page, limit } = req.query;
  try {
    const result = await subscriptionService.getSubscriptionsList({
      status: status ? String(status) : "ALL",
      search: search ? String(search) : void 0,
      planId: planId ? String(planId) : "ALL",
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 50
    });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/payments/subscription", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const subStatus = await subscriptionService.checkUserSubscription(userId);
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    const activePending = await prisma.payment.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      success: true,
      hasAccess: subStatus.hasAccess,
      currentPlan: subStatus.planId,
      planType: subStatus.planType,
      planName: subStatus.planName,
      status: subStatus.status,
      planExpiresAt: subStatus.endDate || null,
      startDate: subStatus.startDate || null,
      remainingDays: subStatus.remainingDays,
      amount: subStatus.amount,
      isTeamOwner: subStatus.isTeamOwner || false,
      isTeamMember: subStatus.isTeamMember || false,
      teamId: subStatus.teamId,
      teamName: subStatus.teamName,
      teamOwnerEmail: subStatus.teamOwnerEmail,
      subscriptionId: subStatus.subscriptionId,
      role: subStatus.role,
      subscription: latestSubscription,
      history: payments,
      activePending
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/team/my-team", async (req, res) => {
  try {
    const teamData = await teamService.getMyTeam(req.userId);
    res.json({
      success: true,
      ...teamData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/team/name", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "T\xEAn nh\xF3m kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
    }
    const team = await teamService.createOrUpdateTeamName(req.userId, name);
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt t\xEAn nh\xF3m th\xE0nh c\xF4ng.",
      team
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/team/members", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp \u0111\u1ECBa ch\u1EC9 email c\u1EE7a th\xE0nh vi\xEAn." });
    }
    const result = await teamService.addMember(req.userId, email);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: { code: err.code || "ADD_MEMBER_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.delete("/team/members/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await teamService.removeMember(req.userId, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: { code: "REMOVE_MEMBER_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.get("/team/invite-code", async (req, res) => {
  try {
    const result = await teamService.getOrGenerateInviteCode(req.userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/team/join", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng cung c\u1EA5p m\xE3 m\u1EDDi." });
    }
    const result = await teamService.joinTeamByCode(req.userId, code);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: { code: err.code || "JOIN_TEAM_FAILED", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/payments/subscription/cancel-auto-renew", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      // FUNC-002 FIX: was 'Active' — case mismatch with ACTIVE from activateSubscription()
      orderBy: { createdAt: "desc" }
    });
    if (latestSubscription) {
      await prisma.subscription.update({
        where: { id: latestSubscription.id },
        data: { status: "CANCELLED" }
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true }
    });
    const expiryFormatted = user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString("vi-VN") : "k\u1EBFt th\xFAc chu k\u1EF3";
    res.json({
      success: true,
      message: `\u0110\xE3 h\u1EE7y t\u1EF1 \u0111\u1ED9ng gia h\u1EA1n th\xE0nh c\xF4ng. B\u1EA1n v\u1EABn ti\u1EBFp t\u1EE5c \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng \u0111\u1EA7y \u0111\u1EE7 quy\u1EC1n l\u1EE3i g\xF3i ${user?.plan || "d\u1ECBch v\u1EE5"} \u0111\u1EBFn h\u1EBFt ng\xE0y ${expiryFormatted}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/payments/subscription/resume-auto-renew", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (latestSubscription) {
      await prisma.subscription.update({
        where: { id: latestSubscription.id },
        data: { status: "Active" }
      });
    }
    res.json({
      success: true,
      message: "\u0110\xE3 kh\xF4i ph\u1EE5c t\u1EF1 \u0111\u1ED9ng gia h\u1EA1n th\xE0nh c\xF4ng."
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/auth/upgrade-plan", requireAdmin, validateBody(UpgradePlanSchema), async (req, res) => {
  const userId = req.userId;
  const { plan } = req.body;
  const prisma = getPrisma();
  try {
    const durationDays = 30;
    const planExpiresAt = plan === "FREE" ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1e3);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planExpiresAt
      },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true, avatar: true }
    });
    if (plan !== "FREE") {
      await prisma.subscription.create({
        data: {
          userId,
          planId: plan === "TEAM" ? "TEAM_1M" : "PERSONAL_1M",
          planType: plan === "TEAM" ? "TEAM" : "PERSONAL",
          planName: plan === "TEAM" ? "G\xF3i \u0110\u1ED9i Ng\u0169 (Team 1 Th\xE1ng)" : "G\xF3i C\xE1 Nh\xE2n (1 Th\xE1ng)",
          status: "ACTIVE",
          paymentStatus: "PAID",
          amount: plan === "TEAM" ? 99e3 : 29e3,
          startDate: /* @__PURE__ */ new Date(),
          endDate: planExpiresAt
        }
      });
    }
    res.json({
      success: true,
      message: `\u0110\xE3 c\u1EADp nh\u1EADt g\xF3i th\xE0nh c\xF4ng sang ${plan}`,
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/saas-metrics", requireAdmin, async (req, res) => {
  try {
    const metrics = await subscriptionService.getSaaSMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/users/:id/grant-subscription", requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const { planId, durationDays, reason } = req.body;
  try {
    const duration = parseInt(durationDays) || 30;
    const subscription = await subscriptionService.grantSubscription(
      targetUserId,
      planId || "PERSONAL_1M",
      duration,
      adminEmail,
      reason || "C\u1EA5p quy\u1EC1n th\u1EE7 c\xF4ng b\u1EDFi Admin"
    );
    await dbService.createAuditLog(
      adminId,
      "ADMIN_GRANT_SUBSCRIPTION",
      "subscriptions",
      subscription.id,
      null,
      { targetUserId, planId: subscription.planId, durationDays: duration, reason }
    );
    res.json({
      success: true,
      message: `\u0110\xE3 c\u1EA5p quy\u1EC1n s\u1EED d\u1EE5ng g\xF3i ${subscription.planName} (${duration} ng\xE0y) th\xE0nh c\xF4ng!`,
      subscription
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/users/:id/revoke-subscription", requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const { reason } = req.body;
  try {
    const updatedUser = await subscriptionService.revokeSubscription(
      targetUserId,
      adminEmail,
      reason || "Thu h\u1ED3i b\u1EDFi qu\u1EA3n tr\u1ECB vi\xEAn"
    );
    await dbService.createAuditLog(
      adminId,
      "ADMIN_REVOKE_SUBSCRIPTION",
      "users",
      targetUserId,
      null,
      { reason, revokedBy: adminEmail }
    );
    res.json({
      success: true,
      message: "\u0110\xE3 thu h\u1ED3i g\xF3i d\u1ECBch v\u1EE5 c\u1EE7a kh\xE1ch h\xE0ng th\xE0nh c\xF4ng. T\xE0i kho\u1EA3n tr\u1EDF v\u1EC1 tr\u1EA1ng th\xE1i ch\u01B0a k\xEDch ho\u1EA1t.",
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/users/:id/detail", requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        avatar: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true
      }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y kh\xE1ch h\xE0ng" });
    }
    const [subscriptions, payments, subStatus, internalNoteSetting] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.payment.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      subscriptionService.checkUserSubscription(targetUserId),
      prisma.systemSetting.findUnique({
        where: { key: `admin_note_user_${targetUserId}` }
      })
    ]);
    res.json({
      success: true,
      user,
      subscriptionStatus: subStatus,
      subscriptions,
      payments,
      adminNote: internalNoteSetting?.value || ""
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/users/:id/admin-notes", requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const { note } = req.body;
  const prisma = getPrisma();
  try {
    await prisma.systemSetting.upsert({
      where: { key: `admin_note_user_${targetUserId}` },
      update: { value: String(note || "") },
      create: { key: `admin_note_user_${targetUserId}`, value: String(note || "") }
    });
    res.json({
      success: true,
      message: "\u0110\xE3 l\u01B0u ghi ch\xFA v\u1EADn h\xE0nh n\u1ED9i b\u1ED9 th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/reset-requests", requireAdmin, async (req, res) => {
  const prisma = getPrisma();
  const { status, search } = req.query;
  try {
    await prisma.passwordResetRequest.updateMany({
      where: {
        status: "APPROVED",
        expiresAt: { lt: /* @__PURE__ */ new Date() }
      },
      data: {
        status: "EXPIRED"
      }
    });
    const whereClause = {};
    if (status && status !== "ALL") {
      whereClause.status = String(status);
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      whereClause.OR = [
        { ticketCode: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } }
      ];
    }
    const requests = await prisma.passwordResetRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatar: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { createdAt: "desc" }
      ],
      take: 100
    });
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [pendingCount, approvedTodayCount, completedCount, totalCount] = await Promise.all([
      prisma.passwordResetRequest.count({ where: { status: "PENDING" } }),
      prisma.passwordResetRequest.count({
        where: {
          status: "APPROVED",
          approvedAt: { gte: startOfToday }
        }
      }),
      prisma.passwordResetRequest.count({ where: { status: "COMPLETED" } }),
      prisma.passwordResetRequest.count()
    ]);
    res.json({
      success: true,
      requests,
      counts: {
        pending: pendingCount,
        approvedToday: approvedTodayCount,
        completed: completedCount,
        total: totalCount
      }
    });
  } catch (err) {
    console.error("GET /api/admin/reset-requests error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/reset-requests/:id/action", requireAdmin, async (req, res) => {
  const adminId = req.userId;
  const adminEmail = req.user.email;
  const requestId = req.params.id;
  const { action, rejectionReason } = req.body;
  const prisma = getPrisma();
  try {
    const existing = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: "REQUEST_NOT_FOUND", message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u n\xE0y." },
        message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u n\xE0y."
      });
      return;
    }
    if (existing.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: { code: "ALREADY_COMPLETED", message: "Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n t\u1EA5t \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u." },
        message: "Y\xEAu c\u1EA7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n t\u1EA5t \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u."
      });
      return;
    }
    if (action === "APPROVE") {
      const backupPin = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1e3);
      const approvedAt = /* @__PURE__ */ new Date();
      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          backupPin,
          expiresAt,
          approvedAt,
          approvedBy: adminId
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar: true }
          },
          approvedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      await dbService.createAuditLog(
        adminId,
        "ADMIN_APPROVE_PASSWORD_RESET",
        "password_reset_requests",
        requestId,
        { status: existing.status },
        { status: "APPROVED", ticketCode: existing.ticketCode, email: existing.email, approvedBy: adminEmail }
      );
      res.json({
        success: true,
        message: `\u0110\xE3 ph\xEA duy\u1EC7t y\xEAu c\u1EA7u ${existing.ticketCode}! M\xE3 PIN d\u1EF1 ph\xF2ng: ${backupPin} (Hi\u1EC7u l\u1EF1c 30 ph\xFAt).`,
        request: updated,
        backupPin
      });
      return;
    }
    if (action === "REJECT") {
      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar: true }
          }
        }
      });
      await dbService.createAuditLog(
        adminId,
        "ADMIN_REJECT_PASSWORD_RESET",
        "password_reset_requests",
        requestId,
        { status: existing.status },
        { status: "REJECTED", ticketCode: existing.ticketCode, email: existing.email, reason: rejectionReason }
      );
      res.json({
        success: true,
        message: `\u0110\xE3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u ${existing.ticketCode}.`,
        request: updated
      });
      return;
    }
    if (action === "REVOKE") {
      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: "EXPIRED",
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar: true }
          }
        }
      });
      await dbService.createAuditLog(
        adminId,
        "ADMIN_REVOKE_PASSWORD_RESET",
        "password_reset_requests",
        requestId,
        { status: existing.status },
        { status: "EXPIRED", ticketCode: existing.ticketCode, email: existing.email }
      );
      res.json({
        success: true,
        message: `\u0110\xE3 thu h\u1ED3i hi\u1EC7u l\u1EF1c y\xEAu c\u1EA7u ${existing.ticketCode}.`,
        request: updated
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: "H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7. Ch\u1EC9 ch\u1EA5p nh\u1EADn APPROVE, REJECT, ho\u1EB7c REVOKE."
    });
  } catch (err) {
    console.error("POST /api/admin/reset-requests/:id/action error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/life-harmony", requireAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const harmony = await lifeHarmonyService.get5DHarmony(userId);
    res.json({
      success: true,
      data: harmony
    });
  } catch (err) {
    console.error("GET /api/life-harmony error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "L\u1ED7i khi t\xEDnh to\xE1n ch\u1EC9 s\u1ED1 5D Harmony"
    });
  }
});
apiRouter.get("/today", async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const [tasks, events, habits, habitLogs, focusSessions, accounts, budgets] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          status: { notIn: ["Ho\xE0n th\xE0nh", "\u0110\xE3 xong", "H\u1EE7y"] },
          OR: [
            { dueDate: { gte: sevenDaysAgo } },
            { dueDate: null }
          ]
        },
        take: 200,
        orderBy: { dueDate: "asc" }
      }),
      prisma.calendarEvent.findMany({ where: { userId, date: todayStr } }),
      prisma.habit.findMany({ where: { userId, status: "Active" } }),
      prisma.habitLog.findMany({ where: { date: todayStr, habit: { userId } } }),
      prisma.focusSession.findMany({ where: { userId }, take: 10, orderBy: { createdAt: "desc" } }),
      prisma.financeAccount.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } })
    ]);
    const habitLogMap = new Map(habitLogs.map((l) => [l.habitId, l]));
    const overdueTasks = [];
    const mustDoTasks = [];
    const shouldDoTasks = [];
    const optionalTasks = [];
    const completedToday = [];
    for (const t of tasks) {
      if (t.status === "Ho\xE0n th\xE0nh") {
        completedToday.push(t);
        continue;
      }
      if (t.dueDate && t.dueDate < todayStr) {
        overdueTasks.push(t);
      } else if (t.dueDate === todayStr || t.startDate === todayStr || !t.dueDate) {
        if (t.priority === "Kh\u1EA9n c\u1EA5p" || t.priority === "Cao") {
          mustDoTasks.push(t);
        } else if (t.priority === "Trung b\xECnh") {
          shouldDoTasks.push(t);
        } else {
          optionalTasks.push(t);
        }
      }
    }
    const habitsToday = habits.map((h) => ({
      ...h,
      completedToday: habitLogMap.has(h.id) && habitLogMap.get(h.id)?.completed
    }));
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const budgetWarnings = budgets.filter((b) => b.limit > 0 && b.spent >= b.limit * 0.9);
    res.json({
      success: true,
      date: todayStr,
      summary: {
        totalTasks: tasks.length,
        overdueCount: overdueTasks.length,
        mustDoCount: mustDoTasks.length,
        todayEventsCount: events.length,
        habitsCompletedCount: habitsToday.filter((h) => h.completedToday).length,
        habitsTotalCount: habitsToday.length,
        totalBalance
      },
      schedule: events,
      tasks: {
        overdue: overdueTasks,
        mustDo: mustDoTasks,
        shouldDo: shouldDoTasks,
        optional: optionalTasks,
        completedToday
      },
      habits: habitsToday,
      budgetWarnings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "TODAY_ENGINE_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/finance/transaction", validateBody(FinanceTransactionSchema), async (req, res) => {
  const userId = req.userId;
  try {
    const result = await dbService.executeFinanceTransaction(userId, req.body);
    res.json({ success: true, transaction: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: { code: "TRANSACTION_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/focus/complete", async (req, res) => {
  const userId = req.userId;
  const { title, mode, plannedDuration, actualDuration, taskId, subjectId } = req.body;
  const prisma = getPrisma();
  try {
    const durationMins = parseFloat(actualDuration) || parseFloat(plannedDuration) || 25;
    const durationHours = durationMins / 60;
    const session = await prisma.focusSession.create({
      data: {
        userId,
        title: title || "Phi\xEAn t\u1EADp trung",
        mode: mode || "Pomodoro",
        status: "Completed",
        plannedDuration: parseFloat(plannedDuration) || 25,
        actualDuration: durationMins,
        startTime: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
      if (task) {
        await prisma.task.update({
          where: { id: taskId },
          data: { actualHours: { increment: durationHours } }
        });
      }
    }
    if (subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
      if (subject) {
        await prisma.studySession.create({
          data: {
            userId,
            subjectId,
            durationMinutes: Math.round(durationMins),
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            notes: `Phi\xEAn t\u1EADp trung: ${session.title}`
          }
        });
      }
    }
    await AutomationEngineService.triggerEvent(userId, "focus.completed", {
      sessionId: session.id,
      durationMinutes: durationMins
    });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FOCUS_ERROR", message: err.message },
      message: err.message
    });
  }
});
apiRouter.post("/decisions/:id/select-option", async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { optionId, reasoning } = req.body;
  try {
    const decision = await dbService.getUserCollection("decisions", userId);
    const target = decision.find((d) => d.id === id);
    if (!target) {
      res.status(404).json({ success: false, message: "Quy\u1EBFt \u0111\u1ECBnh kh\xF4ng t\u1ED3n t\u1EA1i" });
      return;
    }
    const updated = await dbService.updateUserCollectionItem("decisions", userId, id, {
      selectedOptionId: optionId,
      status: "Decided",
      outcome: reasoning || target.outcome
    });
    await dbService.createAuditLog(
      userId,
      "SELECT_DECISION_OPTION",
      "decisions",
      id,
      { beforeOption: target.selectedOptionId },
      { selectedOptionId: optionId, reasoning }
    );
    res.json({ success: true, decision: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/decisions/evaluate", async (req, res) => {
  try {
    const { criteria, options, risks, scenarios } = req.body;
    const result = DecisionEngineService.evaluateDecision({
      criteria: criteria || [],
      options: options || [],
      risks: risks || [],
      scenarios: scenarios || []
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "L\u1ED7i \u0111\xE1nh gi\xE1 quy\u1EBFt \u0111\u1ECBnh" });
  }
});
apiRouter.post("/decisions/:id/convert-execution", async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    const decision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!decision) {
      res.status(404).json({ success: false, message: "Quy\u1EBFt \u0111\u1ECBnh kh\xF4ng t\u1ED3n t\u1EA1i" });
      return;
    }
    const project = await prisma.project.create({
      data: {
        userId,
        name: `Tri\u1EC3n khai: ${decision.title}`,
        description: `D\u1EF1 \xE1n th\u1EF1c thi t\u1EEB quy\u1EBFt \u0111\u1ECBnh: ${decision.problem || decision.title}`,
        status: "\u0110ang l\xE0m",
        health: "T\u1ED1t",
        progress: 0
      }
    });
    const task = await prisma.task.create({
      data: {
        userId,
        projectId: project.id,
        title: `K\u1EBF ho\u1EA1ch h\xE0nh \u0111\u1ED9ng ban \u0111\u1EA7u - ${decision.title}`,
        description: `B\u1EAFt \u0111\u1EA7u th\u1EF1c thi ph\u01B0\u01A1ng \xE1n \u0111\xE3 ch\u1ECDn trong Decision Engine`,
        status: "Ch\u01B0a l\xE0m",
        priority: "Cao",
        estimatedHours: 4
      }
    });
    await prisma.decision.update({
      where: { id },
      data: {
        status: "Executing",
        outcome: `D\u1EF1 \xE1n th\u1EF1c thi: ${project.name}`
      }
    });
    res.json({ success: true, projectId: project.id, taskId: task.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/automations/evaluate", async (req, res) => {
  const userId = req.userId;
  try {
    const trigger = req.body.triggerType || req.body.event?.type || "MANUAL";
    const context = req.body.eventContext || req.body.event || {};
    const results = await AutomationEngineService.triggerEvent(userId, trigger, context);
    res.json({ success: true, result: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/settings", async (req, res) => {
  const userId = req.userId;
  try {
    const settings = await dbService.getUserSettings(userId);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/settings", async (req, res) => {
  const userId = req.userId;
  try {
    const updated = await dbService.updateUserSettings(userId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/clear-workspace", async (req, res) => {
  const userId = req.userId;
  try {
    await dbService.clearUserWorkspace(userId);
    res.json({ success: true, message: "\u0110\xE3 l\xE0m s\u1EA1ch kh\xF4ng gian l\xE0m vi\u1EC7c" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/settings/global-free-mode", requireAdmin, async (req, res) => {
  try {
    const enabled = await subscriptionService.isGlobalFreeMode();
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, enabled: false, message: err.message });
  }
});
apiRouter.get("/admin/free-mode", requireAdmin, async (req, res) => {
  try {
    const enabled = await subscriptionService.isGlobalFreeMode();
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, enabled: false, message: err.message });
  }
});
apiRouter.post("/admin/settings/global-free-mode", requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "Tham s\u1ED1 enabled (boolean) l\xE0 b\u1EAFt bu\u1ED9c." });
    }
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator",
      email: req.user?.email || "admin@lifeos.com",
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Local"
    };
    const result = await subscriptionService.setGlobalFreeMode(enabled, adminUser);
    res.json({
      success: true,
      message: `\u0110\xE3 ${enabled ? "B\u1EACT" : "T\u1EAET"} ch\u1EBF \u0111\u1ED9 D\xF9ng Th\u1EED Mi\u1EC5n Ph\xED to\xE0n h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng. \u0110\xE3 g\u1EEDi c\u1EA3nh b\xE1o an ninh \u0111\u1EBFn Qu\u1EA3n tr\u1ECB vi\xEAn.`,
      ...result
    });
  } catch (err) {
    console.error("POST /admin/settings/global-free-mode error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/free-mode/toggle", requireAdmin, async (req, res) => {
  try {
    let enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") {
      const current = await subscriptionService.isGlobalFreeMode();
      enabled = !current;
    }
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator",
      email: req.user?.email || "admin@lifeos.com",
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Local"
    };
    const result = await subscriptionService.setGlobalFreeMode(enabled, adminUser);
    res.json({
      success: true,
      message: `\u0110\xE3 ${enabled ? "B\u1EACT" : "T\u1EAET"} ch\u1EBF \u0111\u1ED9 D\xF9ng Th\u1EED Mi\u1EC5n Ph\xED to\xE0n h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng.`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.use("/admin/test-lab", testLabRouter);
apiRouter.get("/admin/metrics", requireAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const [
      totalUsers,
      activeUsers,
      freeUsers,
      proUsers,
      teamUsers,
      totalOrders,
      orders,
      auditCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { plan: "FREE" } }),
      prisma.user.count({ where: { plan: "PRO" } }),
      prisma.user.count({ where: { plan: "TEAM" } }),
      prisma.order.count(),
      prisma.order.findMany({ select: { total: true } }),
      prisma.auditLog.count()
    ]);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        plans: {
          free: freeUsers,
          pro: proUsers,
          team: teamUsers
        },
        totalOrders,
        totalRevenue,
        auditCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { search, role, plan, status, page, limit } = req.query;
    const result = await dbService.getUsers({
      search,
      role,
      plan,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/users", requireAdmin, validateBody(AdminCreateUserSchema), async (req, res) => {
  try {
    const { name, email, role, plan, temporaryPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existing = await dbService.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({
        success: false,
        error: { code: "EMAIL_EXISTS", message: "Email \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng" },
        message: "Email \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng"
      });
      return;
    }
    const salt = await bcrypt3.genSalt(10);
    const passwordHash = await bcrypt3.hash(String(temporaryPassword), salt);
    const newUser = await dbService.createUser({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: (role || "USER").toUpperCase(),
      plan: (plan || "FREE").toUpperCase(),
      status: "ACTIVE"
    });
    await dbService.createAuditLog(
      req.userId,
      "ADMIN_CREATE_USER",
      "users",
      newUser.id,
      null,
      { email: newUser.email, role: newUser.role, plan: newUser.plan }
    );
    res.status(201).json({
      success: true,
      message: `\u0110\xE3 kh\u1EDFi t\u1EA1o t\xE0i kho\u1EA3n cho ${newUser.name}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/users/:id/status", requireAdmin, validateBody(AdminUpdateStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
      return;
    }
    const updated = await dbService.updateUser(id, { status });
    if (status === "DISABLED" || status === "SUSPENDED") {
      await dbService.deleteAllUserSessions(id);
    }
    await dbService.createAuditLog(
      req.userId,
      "ADMIN_UPDATE_USER_STATUS",
      "users",
      id,
      { beforeStatus: user.status },
      { newStatus: status, reason }
    );
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/users/:id/plan", requireAdmin, validateBody(AdminChangePlanSchema), async (req, res) => {
  const { id } = req.params;
  const { plan, durationMonths, reason } = req.body;
  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
      return;
    }
    let planExpiresAt = null;
    if (durationMonths && durationMonths > 0) {
      const baseDate = user.planExpiresAt && user.planExpiresAt.getTime() > Date.now() ? new Date(user.planExpiresAt) : /* @__PURE__ */ new Date();
      baseDate.setMonth(baseDate.getMonth() + durationMonths);
      planExpiresAt = baseDate;
    }
    const updated = await dbService.updateUser(id, {
      plan,
      ...planExpiresAt ? { planExpiresAt } : {}
    });
    await dbService.createAuditLog(
      req.userId,
      "ADMIN_CHANGE_USER_PLAN",
      "users",
      id,
      { beforePlan: user.plan },
      { newPlan: plan, planExpiresAt, reason }
    );
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/users/:id/reset-password", requireAdmin, validateBody(AdminResetPasswordSchema), async (req, res) => {
  const { id } = req.params;
  const { newPassword, reason } = req.body;
  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
      return;
    }
    const salt = await bcrypt3.genSalt(10);
    const passwordHash = await bcrypt3.hash(String(newPassword), salt);
    await dbService.updateUser(id, { passwordHash });
    await dbService.deleteAllUserSessions(id);
    await dbService.createAuditLog(
      req.userId,
      "ADMIN_RESET_PASSWORD",
      "users",
      id,
      null,
      { reason: reason || "Admin manual password reset" }
    );
    res.json({ success: true, message: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
var EXPORTABLE_COLLECTIONS = /* @__PURE__ */ new Set([
  "users",
  "tasks",
  "projects",
  "orders",
  "payments",
  "subscriptions",
  "habits",
  "notes",
  "financeAccounts",
  "transactions",
  "budgets",
  "savingGoals"
]);
apiRouter.get("/admin/export/:collection", requireAdmin, async (req, res) => {
  const { collection } = req.params;
  if (!EXPORTABLE_COLLECTIONS.has(collection)) {
    return res.status(400).json({
      success: false,
      message: `Danh m\u1EE5c '${collection}' kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p xu\u1EA5t d\u1EEF li\u1EC7u. Ch\u1EC9 h\u1ED7 tr\u1EE3 c\xE1c danh m\u1EE5c nghi\u1EC7p v\u1EE5.`
    });
  }
  try {
    const csvContent = await dbService.exportCollectionToCSV(collection);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${collection}_export_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/tasks/:taskId/attachments", requireAuth, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c n\xE0y." });
    }
    if (task.userId !== userId && req.userRole !== "ADMIN" && req.userRole !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp t\u1EC7p c\u1EE7a c\xF4ng vi\u1EC7c n\xE0y." });
    }
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, attachments });
  } catch (err) {
    console.error("GET /tasks/:taskId/attachments error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/tasks/:taskId/attachments", requireAuth, validateBody(TaskAttachmentSchema), async (req, res) => {
  const { taskId } = req.params;
  const userId = req.userId;
  const { fileName, fileUrl, fileSize } = req.body;
  const prisma = getPrisma();
  if (!fileName || !fileUrl) {
    return res.status(400).json({ success: false, message: "fileName v\xE0 fileUrl l\xE0 b\u1EAFt bu\u1ED9c." });
  }
  try {
    const parsed = new URL(String(fileUrl));
    const allowedProtocols = ["https:"];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return res.status(400).json({ success: false, message: "fileUrl ph\u1EA3i d\xF9ng giao th\u1EE9c HTTPS." });
    }
    if (["javascript:", "data:", "vbscript:", "file:"].includes(parsed.protocol)) {
      return res.status(400).json({ success: false, message: "fileUrl kh\xF4ng h\u1EE3p l\u1EC7." });
    }
  } catch {
    return res.status(400).json({ success: false, message: "fileUrl kh\xF4ng ph\u1EA3i URL h\u1EE3p l\u1EC7." });
  }
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c n\xE0y." });
    }
    if (task.userId !== userId && req.userRole !== "ADMIN" && req.userRole !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\xEAm t\u1EC7p v\xE0o c\xF4ng vi\u1EC7c n\xE0y." });
    }
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: String(fileName),
        fileUrl: String(fileUrl),
        fileSize: fileSize ? Number(fileSize) : 0
      }
    });
    res.json({ success: true, attachment, message: "\u0110\xE3 \u0111\xEDnh k\xE8m t\u1EC7p v\xE0o c\xF4ng vi\u1EC7c th\xE0nh c\xF4ng!" });
  } catch (err) {
    console.error("POST /tasks/:taskId/attachments error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.delete("/tasks/:taskId/attachments/:attachmentId", requireAuth, async (req, res) => {
  const { taskId, attachmentId } = req.params;
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y c\xF4ng vi\u1EC7c n\xE0y." });
    }
    if (task.userId !== userId && req.userRole !== "ADMIN" && req.userRole !== "SUPERADMIN") {
      return res.status(403).json({ success: false, message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a t\u1EC7p c\u1EE7a c\xF4ng vi\u1EC7c n\xE0y." });
    }
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    res.json({ success: true, message: "\u0110\xE3 x\xF3a t\u1EC7p \u0111\xEDnh k\xE8m th\xE0nh c\xF4ng." });
  } catch (err) {
    console.error("DELETE attachment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/workspace/backup/export", requireAuth, async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true }
    });
    const [
      tasks,
      projects,
      notes,
      calendarEvents,
      scheduleBlocks,
      financeAccounts,
      transactions,
      budgets,
      savingGoals,
      debts,
      habits,
      habitLogs,
      goals,
      subjects,
      studyAssignments,
      studyExams,
      studySessions,
      decisions,
      automationRules
    ] = await Promise.all([
      prisma.task.findMany({ where: { userId }, include: { attachments: true } }),
      prisma.project.findMany({ where: { userId } }),
      prisma.note.findMany({ where: { userId } }),
      prisma.calendarEvent.findMany({ where: { userId } }),
      prisma.scheduleBlock.findMany({ where: { userId } }),
      prisma.financeAccount.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.savingGoal.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitLog.findMany({ where: { habit: { userId } } }),
      prisma.goal.findMany({ where: { userId }, include: { milestones: true, actions: true } }),
      prisma.subject.findMany({ where: { userId } }),
      prisma.studyAssignment.findMany({ where: { userId } }),
      prisma.studyExam.findMany({ where: { userId } }),
      prisma.studySession.findMany({ where: { userId } }),
      prisma.decision.findMany({ where: { userId } }),
      prisma.automationRule.findMany({ where: { userId } })
    ]);
    const backupPayload = {
      app: "LifeOS",
      version: "2.0.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        plan: user?.plan
      },
      stats: {
        tasksCount: tasks.length,
        projectsCount: projects.length,
        notesCount: notes.length,
        financeCount: transactions.length,
        habitsCount: habits.length,
        goalsCount: goals.length
      },
      data: {
        tasks,
        projects,
        notes,
        calendarEvents,
        scheduleBlocks,
        financeAccounts,
        transactions,
        budgets,
        savingGoals,
        debts,
        habits,
        habitLogs,
        goals,
        subjects,
        studyAssignments,
        studyExams,
        studySessions,
        decisions,
        automationRules
      }
    };
    res.json({
      success: true,
      backup: backupPayload
    });
  } catch (err) {
    console.error("GET /workspace/backup/export error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi xu\u1EA5t b\u1EA3n sao l\u01B0u: " + err.message });
  }
});
apiRouter.post("/workspace/backup/import", requireAuth, async (req, res) => {
  const userId = req.userId;
  const prisma = getPrisma();
  const { data, mode = "merge" } = req.body;
  if (!data || typeof data !== "object") {
    return res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u sao l\u01B0u kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng JSON." });
  }
  try {
    if (mode === "replace") {
      await prisma.$transaction([
        prisma.taskAttachment.deleteMany({ where: { task: { userId } } }),
        prisma.task.deleteMany({ where: { userId } }),
        prisma.projectMilestone.deleteMany({ where: { project: { userId } } }),
        prisma.project.deleteMany({ where: { userId } }),
        prisma.note.deleteMany({ where: { userId } }),
        prisma.calendarEvent.deleteMany({ where: { userId } }),
        prisma.scheduleBlock.deleteMany({ where: { userId } }),
        prisma.transaction.deleteMany({ where: { userId } }),
        prisma.financeAccount.deleteMany({ where: { userId } }),
        prisma.budget.deleteMany({ where: { userId } }),
        prisma.savingGoal.deleteMany({ where: { userId } }),
        prisma.debt.deleteMany({ where: { userId } }),
        prisma.habitLog.deleteMany({ where: { habit: { userId } } }),
        prisma.habit.deleteMany({ where: { userId } }),
        prisma.goalMilestone.deleteMany({ where: { goal: { userId } } }),
        prisma.goalAction.deleteMany({ where: { goal: { userId } } }),
        prisma.goal.deleteMany({ where: { userId } }),
        prisma.studySession.deleteMany({ where: { userId } }),
        prisma.studyExam.deleteMany({ where: { userId } }),
        prisma.studyAssignment.deleteMany({ where: { userId } }),
        prisma.subject.deleteMany({ where: { userId } }),
        prisma.decision.deleteMany({ where: { userId } }),
        prisma.automationRule.deleteMany({ where: { userId } })
      ]);
    }
    const importedCounts = {};
    if (Array.isArray(data.projects)) {
      let count = 0;
      for (const p of data.projects) {
        if (!p.name) continue;
        await prisma.project.create({
          data: {
            userId,
            name: p.name,
            description: p.description || null,
            status: p.status || "M\u1EDBi t\u1EA1o",
            health: p.health || "T\u1ED1t",
            progress: Number(p.progress || 0),
            startDate: p.startDate || null,
            deadline: p.deadline || null,
            budget: Number(p.budget || 0),
            color: p.color || "#3b82f6"
          }
        });
        count++;
      }
      importedCounts.projects = count;
    }
    if (Array.isArray(data.tasks)) {
      let count = 0;
      for (const t of data.tasks) {
        if (!t.title) continue;
        await prisma.task.create({
          data: {
            userId,
            title: t.title,
            description: t.description || null,
            status: t.status || "Ch\u01B0a l\xE0m",
            priority: t.priority || "Trung b\xECnh",
            dueDate: t.dueDate || null,
            startDate: t.startDate || null,
            estimatedHours: Number(t.estimatedHours || 0),
            actualHours: Number(t.actualHours || 0),
            tags: typeof t.tags === "string" ? t.tags : Array.isArray(t.tags) ? t.tags.join(", ") : null,
            recurring: t.recurring || t.recurrence || null
          }
        });
        count++;
      }
      importedCounts.tasks = count;
    }
    if (Array.isArray(data.notes)) {
      let count = 0;
      for (const n of data.notes) {
        if (!n.title) continue;
        await prisma.note.create({
          data: {
            userId,
            title: n.title,
            content: n.content || "",
            folder: n.folder || "Ghi ch\xFA chung",
            category: n.category || "C\xE1 nh\xE2n",
            pinned: Boolean(n.pinned),
            tags: typeof n.tags === "string" ? n.tags : JSON.stringify(n.tags || [])
          }
        });
        count++;
      }
      importedCounts.notes = count;
    }
    if (Array.isArray(data.habits)) {
      let count = 0;
      for (const h of data.habits) {
        if (!h.name) continue;
        await prisma.habit.create({
          data: {
            userId,
            name: h.name,
            category: h.category || "Personal",
            target: Number(h.target || 1),
            unitLabel: h.unitLabel || "l\u1EA7n",
            streak: Number(h.streak || 0),
            bestStreak: Number(h.bestStreak || 0),
            status: h.status || "Active",
            completedDates: typeof h.completedDates === "string" ? h.completedDates : JSON.stringify(h.completedDates || [])
          }
        });
        count++;
      }
      importedCounts.habits = count;
    }
    if (Array.isArray(data.goals)) {
      let count = 0;
      for (const g of data.goals) {
        if (!g.title) continue;
        await prisma.goal.create({
          data: {
            userId,
            title: g.title,
            category: g.category || "Personal",
            progress: Number(g.progress || 0),
            status: g.status || "In Progress",
            targetValue: Number(g.targetValue || 100),
            currentValue: Number(g.currentValue || 0),
            deadline: g.deadline || null,
            tier: g.tier || "Tier 1"
          }
        });
        count++;
      }
      importedCounts.goals = count;
    }
    if (Array.isArray(data.financeAccounts)) {
      let count = 0;
      for (const a of data.financeAccounts) {
        if (!a.name) continue;
        await prisma.financeAccount.create({
          data: {
            userId,
            name: a.name,
            type: a.type || "Ti\u1EC1n m\u1EB7t",
            balance: Number(a.balance || 0),
            currency: a.currency || "VND",
            color: a.color || "#10b981"
          }
        });
        count++;
      }
      importedCounts.financeAccounts = count;
    }
    await dbService.createAuditLog(
      userId,
      "USER_IMPORT_WORKSPACE_BACKUP",
      "workspace",
      userId,
      null,
      { mode, importedCounts }
    );
    res.json({
      success: true,
      message: "Nh\u1EADp d\u1EEF li\u1EC7u sao l\u01B0u th\xE0nh c\xF4ng!",
      importedCounts
    });
  } catch (err) {
    console.error("POST /workspace/backup/import error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi nh\u1EADp d\u1EEF li\u1EC7u sao l\u01B0u: " + err.message });
  }
});
apiRouter.get("/admin/gmail/config", requireAdmin, async (req, res) => {
  try {
    const config = await gmailService.getConfig();
    const safeConfig = {
      ...config,
      appPassword: config.appPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      apiKey: config.apiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
    };
    res.json({
      success: true,
      config: safeConfig
    });
  } catch (err) {
    console.error("GET /admin/gmail/config error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi t\u1EA3i c\u1EA5u h\xECnh Gmail: " + err.message });
  }
});
apiRouter.put("/admin/gmail/config", requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const updated = await gmailService.saveConfig(payload, req.userId);
    await dbService.createAuditLog(
      req.userId,
      "ADMIN_UPDATE_GMAIL_CONFIG",
      "system_settings",
      "gmail_notification_config",
      null,
      { enabled: updated.enabled, user: updated.user, fromName: updated.fromName }
    );
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt c\u1EA5u h\xECnh Gmail th\xE0nh c\xF4ng!",
      config: {
        ...updated,
        appPassword: updated.appPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
        apiKey: updated.apiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
      }
    });
  } catch (err) {
    console.error("PUT /admin/gmail/config error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi l\u01B0u c\u1EA5u h\xECnh Gmail: " + err.message });
  }
});
apiRouter.post("/admin/gmail/test", requireAdmin, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const recipient = testEmail || req.user.email;
    const result = await gmailService.testConnection(recipient);
    res.json(result);
  } catch (err) {
    console.error("POST /admin/gmail/test error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i ki\u1EC3m tra k\u1EBFt n\u1ED1i: " + err.message });
  }
});
apiRouter.get("/admin/gmail/logs", requireAdmin, async (req, res) => {
  try {
    const logs = gmailService.getNotificationLogs();
    res.json({
      success: true,
      logs
    });
  } catch (err) {
    console.error("GET /admin/gmail/logs error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i t\u1EA3i nh\u1EADt k\xFD g\u1EEDi email: " + err.message });
  }
});
apiRouter.get("/admin/email-queue", requireAdmin, async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const data = await emailQueueService.getQueueItems({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("GET /admin/email-queue error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi t\u1EA3i h\xE0ng \u0111\u1EE3i email: " + err.message });
  }
});
apiRouter.get("/admin/email-queue/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await emailQueueService.getQueueStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error("GET /admin/email-queue/stats error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi l\u1EA5y th\u1ED1ng k\xEA email queue: " + err.message });
  }
});
apiRouter.post("/admin/email-queue/:id/retry", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await emailQueueService.retryItem(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y email c\u1EA7n g\u1EEDi l\u1EA1i." });
    }
    res.json({ success: true, message: "\u0110\xE3 \u0111\u01B0a email v\xE0o h\xE0ng \u0111\u1EE3i g\u1EEDi l\u1EA1i ngay l\u1EADp t\u1EE9c." });
  } catch (err) {
    console.error("POST /admin/email-queue/:id/retry error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi th\u1EED g\u1EEDi l\u1EA1i email: " + err.message });
  }
});
apiRouter.delete("/admin/email-queue/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await emailQueueService.deleteItem(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi email." });
    }
    res.json({ success: true, message: "\u0110\xE3 x\xF3a email kh\u1ECFi h\xE0ng \u0111\u1EE3i." });
  } catch (err) {
    console.error("DELETE /admin/email-queue/:id error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i khi x\xF3a email: " + err.message });
  }
});
apiRouter.post("/admin/email-queue/test", requireAdmin, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const recipient = (testEmail || req.user.email || "").trim();
    if (!recipient || !recipient.includes("@")) {
      return res.status(400).json({ success: false, message: "\u0110\u1ECBa ch\u1EC9 email ng\u01B0\u1EDDi nh\u1EADn kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    const { buildEmailHtml: buildEmailHtml2 } = await Promise.resolve().then(() => (init_emailTemplate_service(), emailTemplate_service_exports));
    const html = buildEmailHtml2({
      headline: "Th\u1EED Nghi\u1EC7m H\u1EC7 Th\u1ED1ng H\xE0ng \u0110\u1EE3i Email (Outbox Queue)",
      recipientName: "Qu\u1EA3n Tr\u1ECB Vi\xEAn",
      badgeText: "TEST QUEUE & SMTP",
      badgeColor: "#10b981",
      summary: "Email n\xE0y \u0111\u01B0\u1EE3c g\u1EEDi th\u1EED nghi\u1EC7m th\xF4ng qua h\xE0ng \u0111\u1EE3i Outbox Queue v\xE0 ti\u1EBFn tr\xECnh n\u1EC1n t\u1EF1 \u0111\u1ED9ng th\u1EED l\u1EA1i (Exponential Backoff). T\u1EA5t c\u1EA3 c\xE1c th\xF4ng s\u1ED1 k\u1EBFt n\u1ED1i SMTP v\xE0 lu\u1ED3ng g\u1EEDi \u0111\xE3 ho\u1EA1t \u0111\u1ED9ng tr\u01A1n tru.",
      details: [
        { label: "Ng\u01B0\u1EDDi nh\u1EADn", value: recipient },
        { label: "C\u01A1 ch\u1EBF g\u1EEDi", value: "PostgreSQL Outbox Queue + Worker" },
        { label: "Th\u1EDDi gian ph\xE1t t\xEDn hi\u1EC7u", value: (/* @__PURE__ */ new Date()).toLocaleString("vi-VN") }
      ],
      actionLabel: "M\u1EDF Trang Qu\u1EA3n Tr\u1ECB H\u1EC7 Th\u1ED1ng",
      actionUrl: `${getAppBaseUrl()}/?view=admin&tab=gmail_config`
    });
    const queueId = await emailQueueService.enqueue({
      recipient,
      subject: "\u2705 [LifeOS Test] Ki\u1EC3m tra h\u1EC7 th\u1ED1ng h\xE0ng \u0111\u1EE3i Outbox Queue & SMTP th\xE0nh c\xF4ng",
      htmlBody: html,
      eventType: "TEST_EMAIL_QUEUE",
      priority: "HIGH"
    });
    res.json({
      success: true,
      message: `\u0110\xE3 n\u1EA1p email th\u1EED nghi\u1EC7m v\xE0o h\xE0ng \u0111\u1EE3i (M\xE3: ${queueId}). Ti\u1EBFn tr\xECnh ng\u1EA7m \u0111ang ti\u1EBFn h\xE0nh chuy\u1EC3n ph\xE1t t\u1EDBi ${recipient}.`,
      queueId
    });
  } catch (err) {
    console.error("POST /admin/email-queue/test error:", err);
    res.status(500).json({ success: false, message: "L\u1ED7i ki\u1EC3m tra h\xE0ng \u0111\u1EE3i: " + err.message });
  }
});
apiRouter.get("/referrals/dashboard", async (req, res) => {
  try {
    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
    const data = await referralService.getUserDashboard(req.userId, origin);
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error("GET /referrals/dashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/referrals/withdraw", async (req, res) => {
  try {
    const { amount, bankName, bankAccount, accountHolder, transferNote, userNote } = req.body;
    const request = await referralService.requestWithdrawal(req.userId, {
      amount: Number(amount),
      bankName,
      bankAccount,
      accountHolder,
      transferNote,
      userNote
    });
    SystemNotificationHelper.onWithdrawalRequested({
      id: request.id,
      amount: Number(request.amount),
      bankName: request.bankName,
      bankAccount: request.bankAccount,
      bankHolder: request.accountHolder,
      userEmail: req.user.email,
      userName: req.user.name
    }).catch((e) => console.warn("[EmailQueue] Error enqueuing withdrawal alert:", e));
    res.status(201).json({
      success: true,
      message: "G\u1EEDi y\xEAu c\u1EA7u r\xFAt ti\u1EC1n th\xE0nh c\xF4ng! Admin s\u1EBD duy\u1EC7t v\xE0 gi\u1EA3i ng\xE2n s\u1EDBm.",
      request
    });
  } catch (err) {
    console.error("POST /referrals/withdraw error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.get("/referrals/withdrawals", async (req, res) => {
  try {
    const list = await referralService.getUserWithdrawals(req.userId);
    res.json({
      success: true,
      withdrawals: list
    });
  } catch (err) {
    console.error("GET /referrals/withdrawals error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/referrals/overview", requireAdmin, async (req, res) => {
  try {
    const data = await referralService.getAdminOverview();
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error("GET /admin/referrals/overview error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/referrals/withdrawals", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const list = await referralService.getAdminWithdrawals(status ? String(status) : void 0);
    res.json({
      success: true,
      withdrawals: list
    });
  } catch (err) {
    console.error("GET /admin/referrals/withdrawals error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/referrals/withdrawals/:id/approve", requireAdmin, async (req, res) => {
  try {
    const { txReference, proofUrl } = req.body;
    const adminEmail = req.user.email;
    const result = await referralService.adminApproveWithdrawal(req.params.id, adminEmail, txReference, proofUrl);
    res.json({
      success: true,
      message: "\u0110\xE3 duy\u1EC7t y\xEAu c\u1EA7u r\xFAt ti\u1EC1n v\xE0 \u0111\xE1nh d\u1EA5u \u0110\xE3 chuy\u1EC3n kho\u1EA3n!",
      withdrawal: result
    });
  } catch (err) {
    console.error("POST /admin/referrals/withdrawals/:id/approve error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/referrals/withdrawals/:id/reject", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: "B\u1EAFt bu\u1ED9c nh\u1EADp l\xFD do t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u r\xFAt ti\u1EC1n." });
      return;
    }
    const adminEmail = req.user.email;
    const result = await referralService.adminRejectWithdrawal(req.params.id, adminEmail, String(reason).trim());
    res.json({
      success: true,
      message: "\u0110\xE3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u r\xFAt ti\u1EC1n v\xE0 ho\xE0n l\u1EA1i to\xE0n b\u1ED9 s\u1ED1 ti\u1EC1n v\xE0o v\xED ng\u01B0\u1EDDi d\xF9ng!",
      withdrawal: result
    });
  } catch (err) {
    console.error("POST /admin/referrals/withdrawals/:id/reject error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.get("/referrals/payment-qr", async (req, res) => {
  try {
    const qr = await referralService.getUserPaymentQr(req.userId);
    res.json({
      success: true,
      paymentQr: qr
    });
  } catch (err) {
    console.error("GET /referrals/payment-qr error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/referrals/payment-qr", async (req, res) => {
  try {
    const { base64Data, fileName, mimeType, bankName, bankAccount, accountHolder } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u \u1EA3nh QR kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
      return;
    }
    const qr = await referralService.saveUserPaymentQr(req.userId, {
      base64Data,
      fileName: fileName || "payment-qr.png",
      mimeType: mimeType || "image/png",
      bankName,
      bankAccount,
      accountHolder
    });
    res.status(200).json({
      success: true,
      message: "L\u01B0u m\xE3 QR nh\u1EADn ti\u1EC1n th\xE0nh c\xF4ng! Admin s\u1EBD d\xF9ng m\xE3 n\xE0y \u0111\u1EC3 thanh to\xE1n hoa h\u1ED3ng cho b\u1EA1n.",
      paymentQr: qr
    });
  } catch (err) {
    console.error("POST /referrals/payment-qr error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.delete("/referrals/payment-qr", async (req, res) => {
  try {
    await referralService.deleteUserPaymentQr(req.userId);
    res.json({
      success: true,
      message: "\u0110\xE3 x\xF3a m\xE3 QR nh\u1EADn ti\u1EC1n th\xE0nh c\xF4ng."
    });
  } catch (err) {
    console.error("DELETE /referrals/payment-qr error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/referrals/payment-qrs", requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const list = await referralService.getAdminPaymentQrs(
      status ? String(status) : void 0,
      search ? String(search) : void 0
    );
    res.json({
      success: true,
      paymentQrs: list
    });
  } catch (err) {
    console.error("GET /admin/referrals/payment-qrs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/referrals/payment-qr/:id/verify", requireAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const updated = await referralService.adminVerifyPaymentQr(req.params.id, adminEmail);
    res.json({
      success: true,
      message: "\u0110\xE3 x\xE1c minh m\xE3 QR h\u1EE3p l\u1EC7!",
      paymentQr: updated
    });
  } catch (err) {
    console.error("POST /admin/referrals/payment-qr/:id/verify error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/referrals/payment-qr/:id/reject", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: "B\u1EAFt bu\u1ED9c nh\u1EADp l\xFD do y\xEAu c\u1EA7u c\u1EADp nh\u1EADt l\u1EA1i QR." });
      return;
    }
    const adminEmail = req.user.email;
    const updated = await referralService.adminRejectPaymentQr(req.params.id, adminEmail, String(reason).trim());
    res.json({
      success: true,
      message: "\u0110\xE3 y\xEAu c\u1EA7u ng\u01B0\u1EDDi d\xF9ng c\u1EADp nh\u1EADt l\u1EA1i m\xE3 QR!",
      paymentQr: updated
    });
  } catch (err) {
    console.error("POST /admin/referrals/payment-qr/:id/reject error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/feedback", async (req, res) => {
  try {
    const { title, content, type, rating } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, message: "Ti\xEAu \u0111\u1EC1 v\xE0 n\u1ED9i dung g\xF3p \xFD l\xE0 b\u1EAFt bu\u1ED9c." });
      return;
    }
    const feedback = await feedbackService.createFeedback(req.userId, {
      title,
      content,
      type,
      rating
    });
    SystemNotificationHelper.onFeedbackSubmitted({
      id: feedback.id,
      category: feedback.type || "G\xF3p \xFD chung",
      subject: feedback.title,
      message: feedback.content,
      userEmail: req.user.email,
      userName: req.user.name
    }).catch((e) => console.warn("[EmailQueue] Error enqueuing feedback alert:", e));
    res.status(201).json({
      success: true,
      message: "G\u1EEDi g\xF3p \xFD th\xE0nh c\xF4ng! C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 \u0111\xF3ng g\xF3p.",
      feedback
    });
  } catch (err) {
    console.error("POST /feedback error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/feedback/my", async (req, res) => {
  try {
    const list = await feedbackService.getUserFeedbacks(req.userId);
    res.json({
      success: true,
      feedbacks: list
    });
  } catch (err) {
    console.error("GET /feedback/my error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/feedback/public", async (req, res) => {
  try {
    const list = await feedbackService.getPublicFeedbacks(req.userId);
    res.json({
      success: true,
      feedbacks: list
    });
  } catch (err) {
    console.error("GET /feedback/public error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.post("/feedback/:id/vote", async (req, res) => {
  try {
    const result = await feedbackService.toggleVote(req.userId, req.params.id);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("POST /feedback/:id/vote error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/feedback", requireAdmin, async (req, res) => {
  try {
    const { status, type, search, isImportant } = req.query;
    const data = await feedbackService.getAdminFeedbacks({
      status: status ? String(status) : void 0,
      type: type ? String(type) : void 0,
      search: search ? String(search) : void 0,
      isImportant: isImportant !== void 0 ? isImportant === "true" : void 0
    });
    res.json({
      success: true,
      ...data
    });
  } catch (err) {
    console.error("GET /admin/feedback error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.patch("/admin/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminReply, isImportant } = req.body;
    const updated = await feedbackService.adminUpdateFeedback(
      req.params.id,
      req.userId,
      req.user.email,
      {
        status,
        adminReply,
        isImportant
      }
    );
    res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i g\xF3p \xFD th\xE0nh c\xF4ng!",
      feedback: updated
    });
  } catch (err) {
    console.error("PATCH /admin/feedback/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/announcements/audience-preview", requireAdmin, async (req, res) => {
  try {
    const audience = String(req.query.audience || "ALL");
    let userIds;
    if (req.query.userIds) {
      try {
        userIds = JSON.parse(String(req.query.userIds));
      } catch {
        userIds = String(req.query.userIds).split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    const users = await announcementService.resolveTargetUsers(audience, userIds);
    res.json({
      success: true,
      count: users.length,
      sampleUsers: users.slice(0, 50).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan }))
    });
  } catch (err) {
    console.error("GET /admin/announcements/audience-preview error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/announcements", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : void 0;
    const search = req.query.search ? String(req.query.search) : void 0;
    const list = await announcementService.getAnnouncements({ status, search });
    res.json({
      success: true,
      announcements: list
    });
  } catch (err) {
    console.error("GET /admin/announcements error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
apiRouter.get("/admin/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const detail = await announcementService.getAnnouncementDetail(req.params.id);
    res.json({
      success: true,
      announcement: detail
    });
  } catch (err) {
    console.error("GET /admin/announcements/:id error:", err);
    res.status(404).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements", requireAdmin, validateBody(CreateAnnouncementSchema), async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const created = await announcementService.createAnnouncement(req.body, adminUser);
    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement: created
    });
  } catch (err) {
    console.error("POST /admin/announcements error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.put("/admin/announcements/:id", requireAdmin, validateBody(UpdateAnnouncementSchema), async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const updated = await announcementService.updateAnnouncement(req.params.id, req.body, adminUser);
    res.json({
      success: true,
      message: "Announcement updated successfully",
      announcement: updated
    });
  } catch (err) {
    console.error("PUT /admin/announcements/:id error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/:id/publish", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const result = await announcementService.publishAnnouncement(req.params.id, adminUser);
    res.json({
      success: true,
      message: `Announcement published successfully to ${result.targetedCount} users`,
      ...result
    });
  } catch (err) {
    console.error("POST /admin/announcements/:id/publish error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const cancelled = await announcementService.cancelOrArchiveAnnouncement(req.params.id, "CANCEL", adminUser);
    res.json({
      success: true,
      message: "Announcement scheduled release cancelled",
      announcement: cancelled
    });
  } catch (err) {
    console.error("POST /admin/announcements/:id/cancel error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/:id/archive", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const archived = await announcementService.cancelOrArchiveAnnouncement(req.params.id, "ARCHIVE", adminUser);
    res.json({
      success: true,
      message: "Announcement archived successfully",
      announcement: archived
    });
  } catch (err) {
    console.error("POST /admin/announcements/:id/archive error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.delete("/admin/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    await announcementService.deleteAnnouncement(req.params.id, adminUser);
    res.json({
      success: true,
      message: "Announcement deleted successfully"
    });
  } catch (err) {
    console.error("DELETE /admin/announcements/:id error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/broadcast-now", requireAdmin, validateBody(CreateAnnouncementSchema), async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const result = await announcementService.broadcastNow(req.body, adminUser);
    res.status(201).json({
      success: true,
      message: `\u0110\xE3 ph\xE1t th\xF4ng b\xE1o th\xE0nh c\xF4ng \u0111\u1EBFn ${result.targetedCount} ng\u01B0\u1EDDi d\xF9ng (Web: ${result.webDelivered}, Email: ${result.emailEnqueued}, B\u1ECF qua theo c\xE0i \u0111\u1EB7t: ${result.emailSkipped})`,
      ...result
    });
  } catch (err) {
    console.error("POST /admin/announcements/broadcast-now error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/:id/deliveries/:deliveryId/retry", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const result = await announcementService.retryDelivery(req.params.deliveryId, adminUser);
    res.json(result);
  } catch (err) {
    console.error("POST /admin/announcements/:id/deliveries/:deliveryId/retry error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});
apiRouter.post("/admin/announcements/:id/retry-failed", requireAdmin, async (req, res) => {
  try {
    const adminUser = {
      id: req.userId,
      name: req.user?.name || req.user?.email || "Administrator"
    };
    const result = await announcementService.retryAllFailedDeliveries(req.params.id, adminUser);
    res.json(result);
  } catch (err) {
    console.error("POST /admin/announcements/:id/retry-failed error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// src/backend/serverMain.ts
init_db();

// src/backend/services/worker.service.ts
init_db();
init_gmailNotification_service();
var BackgroundWorker = class {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.lastRunAt = null;
    this.lastRetentionSweepAt = 0;
  }
  // OPT-002: Default interval 5 minutes (300,000ms) to reduce cloud database compute/connection costs
  start(intervalMs = 3e5) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("Background Worker Service started (interval:", intervalMs, "ms)");
    setTimeout(() => this.tick(), 3e3);
    this.timer = setInterval(() => this.tick(), intervalMs);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.isRunning = false;
    console.log("Background Worker Service stopped");
  }
  getStatus() {
    return {
      running: this.isRunning,
      lastRunAt: this.lastRunAt
    };
  }
  async tick() {
    this.lastRunAt = /* @__PURE__ */ new Date();
    try {
      if (!process.env.DATABASE_URL) {
        return;
      }
      const prisma = getPrisma();
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (connErr) {
        return;
      }
      const now = /* @__PURE__ */ new Date();
      try {
        const { subscriptionService: subscriptionService2 } = await Promise.resolve().then(() => (init_subscription_service(), subscription_service_exports));
        await subscriptionService2.expireOverdueSubscriptions();
        await subscriptionService2.sendUpcomingExpiryWarnings();
      } catch (subErr) {
        console.warn("[BackgroundWorker] Subscription sweep error:", subErr);
      }
      try {
        const todayStr = now.toISOString().split("T")[0];
        const overdueTasks = await prisma.task.findMany({
          where: {
            dueDate: { lt: todayStr },
            status: { notIn: ["Ho\xE0n th\xE0nh", "\u0110\xE3 xong", "H\u1EE7y"] }
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          take: 50
        });
        if (overdueTasks.length > 0) {
          const userIds = [...new Set(overdueTasks.map((t) => t.userId).filter(Boolean))];
          const existingNotes = await prisma.notification.findMany({
            where: {
              userId: { in: userIds },
              title: "Nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n"
            },
            select: { userId: true, message: true }
          });
          for (const task of overdueTasks) {
            if (!task.userId || !task.user) continue;
            const safeTitle = (task.title || "Nhi\u1EC7m v\u1EE5").trim();
            const alreadyNotified = existingNotes.some(
              (n) => n.userId === task.userId && n.message.includes(safeTitle)
            );
            if (!alreadyNotified) {
              try {
                await prisma.notification.create({
                  data: {
                    userId: task.userId,
                    title: "Nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n",
                    message: `Nhi\u1EC7m v\u1EE5 "${safeTitle}" \u0111\xE3 qu\xE1 h\u1EA1n v\xE0o ng\xE0y ${task.dueDate || todayStr}. H\xE3y ho\xE0n t\u1EA5t s\u1EDBm.`,
                    type: "warning"
                  }
                });
                existingNotes.push({ userId: task.userId, message: safeTitle });
                if (task.user.email) {
                  gmailService.sendNotification({
                    to: task.user.email,
                    recipientName: task.user.name || "B\u1EA1n",
                    subject: `\u23F0 [Life OS] Nh\u1EAFc vi\u1EC7c: Nhi\u1EC7m v\u1EE5 "${safeTitle}" \u0111\xE3 qu\xE1 h\u1EA1n`,
                    category: "TASK_OVERDUE",
                    headline: "Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n \u0111\xE3 qu\xE1 h\u1EA1n deadline",
                    content: `Nhi\u1EC7m v\u1EE5 <strong>"${safeTitle}"</strong> (h\u1EA1n ch\xF3t: <strong>${task.dueDate || todayStr}</strong>) hi\u1EC7n v\u1EABn ch\u01B0a \u0111\u01B0\u1EE3c ho\xE0n th\xE0nh.<br/><br/>\u01AFu ti\xEAn: <strong>${task.priority || "Trung b\xECnh"}</strong>. H\xE3y m\u1EDF \u1EE9ng d\u1EE5ng \u0111\u1EC3 ki\u1EC3m tra v\xE0 c\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9 c\xF4ng vi\u1EC7c ngay h\xF4m nay.`,
                    actionLabel: "Xem nhi\u1EC7m v\u1EE5 ngay",
                    actionUrl: getAppBaseUrl(),
                    badgeText: "Qu\xE1 h\u1EA1n",
                    badgeColor: "#ef4444"
                  }).catch((e) => console.error("[Gmail Worker] Task overdue email error:", e));
                }
              } catch (err) {
              }
            }
          }
        }
      } catch (err) {
      }
      try {
        const exceededBudgets = await prisma.budget.findMany({
          where: {
            limit: { gt: 0 }
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          take: 100
        });
        const exceeded = exceededBudgets.filter((b) => b.userId && b.user && b.spent >= b.limit);
        if (exceeded.length > 0) {
          const userIds = [...new Set(exceeded.map((b) => b.userId))];
          const existingWarnings = await prisma.notification.findMany({
            where: {
              userId: { in: userIds },
              title: "C\u1EA3nh b\xE1o v\u01B0\u1EE3t ng\xE2n s\xE1ch"
            },
            select: { userId: true, message: true }
          });
          for (const budget of exceeded) {
            const categoryName = (budget.category || "Danh m\u1EE5c").trim();
            const alreadyWarned = existingWarnings.some(
              (w) => w.userId === budget.userId && w.message.includes(categoryName)
            );
            if (!alreadyWarned) {
              try {
                await prisma.notification.create({
                  data: {
                    userId: budget.userId,
                    title: "C\u1EA3nh b\xE1o v\u01B0\u1EE3t ng\xE2n s\xE1ch",
                    message: `Ng\xE2n s\xE1ch danh m\u1EE5c "${categoryName}" \u0111\xE3 ch\u1EA1m m\u1EE9c ${budget.spent.toLocaleString()} / ${budget.limit.toLocaleString()} VND.`,
                    type: "alert"
                  }
                });
                existingWarnings.push({ userId: budget.userId, message: categoryName });
                if (budget.user?.email) {
                  gmailService.sendNotification({
                    to: budget.user.email,
                    recipientName: budget.user.name || "B\u1EA1n",
                    subject: `\u26A0\uFE0F [Life OS] C\u1EA3nh b\xE1o t\xE0i ch\xEDnh: V\u01B0\u1EE3t ng\xE2n s\xE1ch "${categoryName}"`,
                    category: "BUDGET_ALERT",
                    headline: "Chi ti\xEAu \u0111\xE3 ch\u1EA1m ho\u1EB7c v\u01B0\u1EE3t ng\xE2n s\xE1ch \u0111\u1ECBnh m\u1EE9c",
                    content: `Danh m\u1EE5c <strong>"${categoryName}"</strong> c\u1EE7a b\u1EA1n \u0111\xE3 chi ti\xEAu <strong>${budget.spent.toLocaleString("vi-VN")} \u20AB</strong>, v\u01B0\u1EE3t qua h\u1EA1n m\u1EE9c d\u1EF1 ki\u1EBFn <strong>${budget.limit.toLocaleString("vi-VN")} \u20AB</strong>.<br/><br/>H\xE3y r\xE0 so\xE1t l\u1EA1i c\xE1c kho\u1EA3n chi ti\xEAu g\u1EA7n \u0111\xE2y \u0111\u1EC3 c\xE2n \u0111\u1ED1i t\xE0i ch\xEDnh c\xE1 nh\xE2n hi\u1EC7u qu\u1EA3 h\u01A1n.`,
                    actionLabel: "Ki\u1EC3m tra s\u1ED5 chi ti\xEAu",
                    actionUrl: getAppBaseUrl(),
                    badgeText: "C\u1EA3nh b\xE1o ng\xE2n s\xE1ch",
                    badgeColor: "#f97316"
                  }).catch((e) => console.error("[Gmail Worker] Budget alert email error:", e));
                }
              } catch (err) {
              }
            }
          }
        }
      } catch (err) {
      }
      try {
        const { announcementService: announcementService2 } = await Promise.resolve().then(() => (init_announcement_service(), announcement_service_exports));
        await announcementService2.processScheduledAnnouncements();
      } catch (annErr) {
        console.warn("[BackgroundWorker] Scheduled announcements sweep error:", annErr);
      }
      try {
        const SIX_HOURS = 6 * 60 * 60 * 1e3;
        if (Date.now() - this.lastRetentionSweepAt > SIX_HOURS) {
          this.lastRetentionSweepAt = Date.now();
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
          const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1e3);
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
          await prisma.session.deleteMany({
            where: { expiresAt: { lt: now } }
          }).catch(() => {
          });
          await prisma.passwordResetToken.deleteMany({
            where: {
              OR: [
                { expiresAt: { lt: now } },
                { used: true }
              ]
            }
          }).catch(() => {
          });
          await prisma.loginAttempt.deleteMany({
            where: { createdAt: { lt: thirtyDaysAgo } }
          }).catch(() => {
          });
          await prisma.securityEvent.deleteMany({
            where: { createdAt: { lt: sixtyDaysAgo } }
          }).catch(() => {
          });
          await prisma.automationExecution.deleteMany({
            where: { executedAt: { lt: thirtyDaysAgo } }
          }).catch(() => {
          });
          await prisma.auditLog.deleteMany({
            where: { timestamp: { lt: ninetyDaysAgo } }
          }).catch(() => {
          });
        }
      } catch (retentionErr) {
      }
    } catch (err) {
    }
  }
};
var workerService = new BackgroundWorker();

// src/backend/services/notification/notificationScheduler.service.ts
init_db();
var NotificationSchedulerService = class {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.lastRunAt = null;
  }
  start(intervalMs = 6e4) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[NotificationScheduler] Started (interval: ${intervalMs}ms)`);
    setTimeout(() => this.tick(), 5e3);
    this.timer = setInterval(() => this.tick(), intervalMs);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.isRunning = false;
    console.log("[NotificationScheduler] Stopped");
  }
  getStatus() {
    return {
      running: this.isRunning,
      lastRunAt: this.lastRunAt
    };
  }
  /**
   * Main periodic tick running every 60s
   */
  async tick() {
    this.lastRunAt = /* @__PURE__ */ new Date();
    try {
      if (!process.env.DATABASE_URL) return;
      const prisma = getPrisma();
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (connErr) {
        return;
      }
      const now = /* @__PURE__ */ new Date();
      await notificationEngine.processPendingDeliveries(100);
      await syncUpcomingReminders(now);
      await this.sweepTasks(now);
    } catch (tickErr) {
      console.warn("[NotificationScheduler] Tick warning:", tickErr);
    }
  }
  /**
   * Sweep 1: Check Calendar Events upcoming or starting
   */
  async sweepCalendarEvents(now) {
    const prisma = getPrisma();
    try {
      const todayStr = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const events = await prisma.calendarEvent.findMany({
        where: {
          date: { in: [todayStr, tomorrowStr] },
          status: { notIn: ["\u0110\xE3 xong", "\u0110\xE3 h\u1EE7y", "Cancelled", "Completed"] }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationPreference: true
            }
          }
        },
        take: 200
      });
      for (const event of events) {
        if (!event.userId || !event.date || !event.startTime) continue;
        const [hourStr, minStr] = event.startTime.split(":");
        const eventStart = new Date(event.date);
        eventStart.setHours(parseInt(hourStr || "0", 10), parseInt(minStr || "0", 10), 0, 0);
        const diffMinutes = Math.round((eventStart.getTime() - now.getTime()) / 6e4);
        const rule = await notificationEngine.getUserRule(event.userId, "CALENDAR_UPCOMING");
        const triggerMinutes = rule?.timingOffsetMinutes || 15;
        if (diffMinutes >= triggerMinutes - 1 && diffMinutes <= triggerMinutes + 2) {
          const triggerBucket = `${event.date}_${event.startTime}_pre${triggerMinutes}`;
          await notificationEngine.emitEvent({
            userId: event.userId,
            eventType: "CALENDAR_UPCOMING",
            entityId: event.id,
            title: `\u23F0 L\u1ECBch s\u1EAFp di\u1EC5n ra: "${event.title}"`,
            message: `S\u1EF1 ki\u1EC7n <strong>"${event.title}"</strong> s\u1EBD b\u1EAFt \u0111\u1EA7u sau kho\u1EA3ng <strong>${diffMinutes} ph\xFAt</strong> (l\xFAc <strong>${event.startTime}</strong>).`,
            priority: rule?.priority || "HIGH",
            category: "CALENDAR",
            actionUrl: `${(process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "")}/?view=calendar`,
            actionLabel: "M\u1EDF L\u1ECBch bi\u1EC3u",
            triggerBucket,
            metadata: {
              categoryLabel: "L\u1ECBch bi\u1EC3u & K\u1EBF ho\u1EA1ch",
              categoryColor: "#3B82F6",
              eventDate: event.date,
              eventTime: `${event.startTime} - ${event.endTime || "K\u1EBFt th\xFAc"}`,
              eventType: event.type || "C\xF4ng vi\u1EC7c"
            }
          });
        }
        if (diffMinutes >= -2 && diffMinutes <= 2) {
          const startRule = await notificationEngine.getUserRule(event.userId, "CALENDAR_STARTING");
          if (startRule?.enabled) {
            const triggerBucket = `${event.date}_${event.startTime}_start`;
            await notificationEngine.emitEvent({
              userId: event.userId,
              eventType: "CALENDAR_STARTING",
              entityId: event.id,
              title: `\u{1F3AF} S\u1EF1 ki\u1EC7n \u0111ang b\u1EAFt \u0111\u1EA7u: "${event.title}"`,
              message: `S\u1EF1 ki\u1EC7n <strong>"${event.title}"</strong> \u0111\xE3 ch\xEDnh th\u1EE9c b\u1EAFt \u0111\u1EA7u. H\xE3y t\u1EADp trung v\xE0 ho\xE0n th\xE0nh t\u1ED1t k\u1EBF ho\u1EA1ch!`,
              priority: startRule?.priority || "HIGH",
              category: "CALENDAR",
              actionUrl: `${(process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "")}/?view=calendar`,
              actionLabel: "V\xE0o s\u1EF1 ki\u1EC7n ngay",
              triggerBucket,
              metadata: {
                categoryLabel: "S\u1EF1 ki\u1EC7n tr\u1EF1c ti\u1EBFp",
                categoryColor: "#10B981",
                eventDate: event.date,
                eventTime: `${event.startTime} - ${event.endTime || ""}`
              }
            });
          }
        }
      }
    } catch (calErr) {
      console.warn("[NotificationScheduler] sweepCalendarEvents error:", calErr);
    }
  }
  /**
   * Sweep 2: Check Tasks (approaching deadline, due today, overdue)
   */
  async sweepTasks(now) {
    const prisma = getPrisma();
    try {
      const todayStr = now.toISOString().split("T")[0];
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { not: null },
          status: { notIn: ["Ho\xE0n th\xE0nh", "\u0110\xE3 xong", "H\u1EE7y", "Done", "Completed"] }
        },
        include: {
          user: {
            select: { id: true, email: true }
          }
        },
        take: 300
      });
      for (const task of tasks) {
        if (!task.userId || !task.dueDate) continue;
        const safeTitle = (task.title || "Nhi\u1EC7m v\u1EE5").trim();
        const dueDateStr = task.dueDate.split("T")[0];
        if (dueDateStr < todayStr) {
          const rule = await notificationEngine.getUserRule(task.userId, "TASK_OVERDUE");
          if (rule && rule.enabled) {
            const triggerBucket = `overdue_${todayStr}`;
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: "TASK_OVERDUE",
              entityId: task.id,
              title: `\u26A0\uFE0F Qu\xE1 h\u1EA1n deadline: "${safeTitle}"`,
              message: `Nhi\u1EC7m v\u1EE5 <strong>"${safeTitle}"</strong> \u0111\xE3 qu\xE1 h\u1EA1n ch\xF3t v\xE0o ng\xE0y <strong>${dueDateStr}</strong> nh\u01B0ng hi\u1EC7n v\u1EABn ch\u01B0a ho\xE0n th\xE0nh. H\xE3y c\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9 ngay!`,
              priority: "CRITICAL",
              category: "TASK",
              actionUrl: `${(process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "")}/?view=tasks`,
              actionLabel: "X\u1EED l\xFD c\xF4ng vi\u1EC7c ngay",
              triggerBucket,
              metadata: {
                categoryLabel: "C\u1EA3nh b\xE1o h\u1EA1n ch\xF3t",
                categoryColor: "#EF4444",
                dueDate: dueDateStr,
                taskStatus: task.status || "Ch\u01B0a l\xE0m"
              }
            });
          }
          continue;
        }
        if (dueDateStr === todayStr) {
          const rule = await notificationEngine.getUserRule(task.userId, "TASK_DUE_NOW");
          if (rule && rule.enabled) {
            const triggerBucket = `due_today_${todayStr}`;
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: "TASK_DUE_NOW",
              entityId: task.id,
              title: `\u{1F4C5} H\xF4m nay \u0111\u1EBFn h\u1EA1n: "${safeTitle}"`,
              message: `Nhi\u1EC7m v\u1EE5 <strong>"${safeTitle}"</strong> c\xF3 h\u1EA1n ch\xF3t v\xE0o h\xF4m nay (<strong>${todayStr}</strong>). \u0110\u1EEBng qu\xEAn ho\xE0n th\xE0nh trong ng\xE0y!`,
              priority: "HIGH",
              category: "TASK",
              actionUrl: `${(process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "")}/?view=tasks`,
              actionLabel: "M\u1EDF danh s\xE1ch vi\u1EC7c",
              triggerBucket,
              metadata: {
                categoryLabel: "Nhi\u1EC7m v\u1EE5 trong ng\xE0y",
                categoryColor: "#F59E0B",
                dueDate: todayStr,
                taskStatus: task.status || "Ch\u01B0a l\xE0m"
              }
            });
          }
          continue;
        }
        const taskDueDate = new Date(dueDateStr);
        const daysDiff = Math.round((taskDueDate.getTime() - new Date(todayStr).getTime()) / (1e3 * 60 * 60 * 24));
        if (daysDiff === 1) {
          const rule = await notificationEngine.getUserRule(task.userId, "TASK_DEADLINE_APPROACHING");
          if (rule && rule.enabled) {
            const triggerBucket = `approaching_tomorrow_${todayStr}`;
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: "TASK_DEADLINE_APPROACHING",
              entityId: task.id,
              title: `\u23F3 S\u1EAFp \u0111\u1EBFn h\u1EA1n ch\xF3t: "${safeTitle}"`,
              message: `Nhi\u1EC7m v\u1EE5 <strong>"${safeTitle}"</strong> s\u1EBD \u0111\u1EBFn h\u1EA1n v\xE0o ng\xE0y mai (<strong>${dueDateStr}</strong>). H\xE3y s\u1EAFp x\u1EBFp th\u1EDDi gian \u0111\u1EC3 ho\xE0n t\u1EA5t \u0111\xFAng l\u1ECBch.`,
              priority: "HIGH",
              category: "TASK",
              actionUrl: `${(process.env.APP_URL || "https://www.quanlicanhan.online").replace(/\/$/, "")}/?view=tasks`,
              actionLabel: "Xem chi ti\u1EBFt vi\u1EC7c",
              triggerBucket,
              metadata: {
                categoryLabel: "S\u1EAFp \u0111\u1EBFn h\u1EA1n",
                categoryColor: "#6366F1",
                dueDate: dueDateStr,
                taskStatus: task.status || "Ch\u01B0a l\xE0m"
              }
            });
          }
        }
      }
    } catch (taskErr) {
      console.warn("[NotificationScheduler] sweepTasks error:", taskErr);
    }
  }
};
var notificationScheduler = new NotificationSchedulerService();

// src/backend/security/csrf.ts
import crypto4 from "crypto";
var SAFE_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
function csrfProtection(req, res, next) {
  const isTestBypass = process.env.NODE_ENV !== "production" && (process.env.NODE_ENV === "test" || req.headers["x-bypass-csrf-for-test"] === "true");
  if (isTestBypass) {
    next();
    return;
  }
  if (SAFE_METHODS.has(req.method)) {
    if (!req.cookies?.["lifeos_csrf"]) {
      const token = crypto4.randomBytes(32).toString("hex");
      res.cookie("lifeos_csrf", token, {
        httpOnly: false,
        // Accessible to client-side JS to send in X-CSRF-Token header
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });
    }
    next();
    return;
  }
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  const host = req.headers["host"];
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isLocal = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
      const isSameHost = host && (originUrl.host === host || originUrl.hostname === host.split(":")[0]);
      const isCloudRun = originUrl.hostname.endsWith(".run.app") || originUrl.hostname.endsWith(".pages.dev");
      if (!isLocal && !isSameHost && !isCloudRun) {
        if (process.env.APP_URL) {
          const appUrl = new URL(process.env.APP_URL);
          if (originUrl.host !== appUrl.host) {
            res.status(403).json({
              success: false,
              error: {
                code: "CSRF_ORIGIN_REJECTED",
                message: "Y\xEAu c\u1EA7u b\u1ECB t\u1EEB ch\u1ED1i v\xEC ngu\u1ED3n g\u1ED1c (Origin) kh\xF4ng h\u1EE3p l\u1EC7."
              },
              message: "Y\xEAu c\u1EA7u b\u1ECB t\u1EEB ch\u1ED1i v\xEC ngu\u1ED3n g\u1ED1c kh\xF4ng h\u1EE3p l\u1EC7."
            });
            return;
          }
        }
      }
    } catch (e) {
      res.status(403).json({
        success: false,
        error: { code: "CSRF_INVALID_ORIGIN", message: "Header Origin kh\xF4ng h\u1EE3p l\u1EC7." }
      });
      return;
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      const isLocal = refererUrl.hostname === "localhost" || refererUrl.hostname === "127.0.0.1";
      const isSameHost = host && (refererUrl.host === host || refererUrl.hostname === host.split(":")[0]);
      const isCloudRun = refererUrl.hostname.endsWith(".run.app") || refererUrl.hostname.endsWith(".pages.dev");
      if (!isLocal && !isSameHost && !isCloudRun && process.env.APP_URL) {
        const appUrl = new URL(process.env.APP_URL);
        if (refererUrl.host !== appUrl.host) {
          res.status(403).json({
            success: false,
            error: {
              code: "CSRF_REFERER_REJECTED",
              message: "Y\xEAu c\u1EA7u b\u1ECB t\u1EEB ch\u1ED1i v\xEC ngu\u1ED3n gi\u1EDBi thi\u1EC7u (Referer) kh\xF4ng h\u1EE3p l\u1EC7."
            },
            message: "Y\xEAu c\u1EA7u b\u1ECB t\u1EEB ch\u1ED1i v\xEC ngu\u1ED3n gi\u1EDBi thi\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7."
          });
          return;
        }
      }
    } catch (e) {
      res.status(403).json({
        success: false,
        error: { code: "CSRF_INVALID_REFERER", message: "Header Referer kh\xF4ng h\u1EE3p l\u1EC7." }
      });
      return;
    }
  }
  const cookieToken = req.cookies?.["lifeos_csrf"];
  const headerToken = req.headers["x-csrf-token"];
  if (cookieToken) {
    if (!headerToken) {
      res.status(403).json({
        success: false,
        error: { code: "CSRF_TOKEN_MISSING", message: "Y\xEAu c\u1EA7u thi\u1EBFu CSRF Token. Vui l\xF2ng th\u1EED l\u1EA1i t\u1EEB giao di\u1EC7n \u1EE9ng d\u1EE5ng." },
        message: "Y\xEAu c\u1EA7u thi\u1EBFu CSRF Token."
      });
      return;
    }
    if (cookieToken !== headerToken) {
      res.status(403).json({
        success: false,
        error: { code: "CSRF_TOKEN_MISMATCH", message: "M\xE3 x\xE1c th\u1EF1c CSRF Token kh\xF4ng h\u1EE3p l\u1EC7." },
        message: "M\xE3 x\xE1c th\u1EF1c CSRF Token kh\xF4ng h\u1EE3p l\u1EC7."
      });
      return;
    }
  }
  next();
}

// src/backend/serverMain.ts
init_emailQueue_service();

// src/backend/config/env.config.ts
import { z as z2 } from "zod";
import dotenv from "dotenv";
dotenv.config();
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "production", "test"]).default("development"),
  PORT: z2.coerce.number().default(3e3),
  DATABASE_URL: z2.string().min(1, "DATABASE_URL l\xE0 b\u1EAFt bu\u1ED9c \u0111\u1EC3 k\u1EBFt n\u1ED1i PostgreSQL"),
  JWT_SECRET: z2.string().min(16, "JWT_SECRET ph\u1EA3i c\xF3 \u0111\u1ED9 d\xE0i t\u1ED1i thi\u1EC3u 16 k\xFD t\u1EF1 \u0111\u1EC3 b\u1EA3o m\u1EADt an to\xE0n"),
  APP_URL: z2.string().url("APP_URL ph\u1EA3i l\xE0 m\u1ED9t URL h\u1EE3p l\u1EC7").default("http://localhost:3000"),
  // Gmail SMTP
  GMAIL_USER: z2.string().email("GMAIL_USER ph\u1EA3i l\xE0 \u0111\u1ECBa ch\u1EC9 email h\u1EE3p l\u1EC7").optional().or(z2.literal("")),
  GMAIL_APP_PASSWORD: z2.string().optional().or(z2.literal("")),
  // Resend Fallback
  RESEND_API_KEY: z2.string().optional().or(z2.literal("")),
  // Cloudflare R2 Storage (Optional in Dev, Recommended in Prod)
  R2_ACCOUNT_ID: z2.string().optional().or(z2.literal("")),
  R2_ACCESS_KEY_ID: z2.string().optional().or(z2.literal("")),
  R2_SECRET_ACCESS_KEY: z2.string().optional().or(z2.literal("")),
  R2_BUCKET_NAME: z2.string().optional().or(z2.literal("")),
  R2_PUBLIC_URL: z2.string().optional().or(z2.literal("")),
  // SuperAdmin Seed
  INITIAL_ADMIN_EMAIL: z2.string().email().optional().or(z2.literal("")),
  INITIAL_ADMIN_PASSWORD: z2.string().min(8).optional().or(z2.literal("")),
  // Google OAuth 2.0 / OpenID Connect
  GOOGLE_CLIENT_ID: z2.string().optional().or(z2.literal("")),
  GOOGLE_CLIENT_SECRET: z2.string().optional().or(z2.literal("")),
  GOOGLE_CALLBACK_URL: z2.string().optional().or(z2.literal(""))
});
var validatedEnv = null;
function validateEnvOnStartup() {
  const parseResult = envSchema.safeParse(process.env);
  if (!parseResult.success) {
    console.error("\u274C [CONFIG ERROR] X\xE1c th\u1EF1c bi\u1EBFn m\xF4i tr\u01B0\u1EDDng (.env) th\u1EA5t b\u1EA1i:");
    parseResult.error.issues.forEach((issue) => {
      console.error(`  - Bi\u1EBFn [${issue.path.join(".")}]: ${issue.message}`);
    });
    if (process.env.NODE_ENV === "production") {
      console.error("\u{1F6A8} M\xD4I TR\u01AF\u1EDCNG PRODUCTION Y\xCAU C\u1EA6U \u0110\u1EA6Y \u0110\u1EE6 C\xC1C BI\u1EBEN M\xD4I TR\u01AF\u1EDCNG H\u1EE2P L\u1EC6. D\u1EEANG TI\u1EBEN TR\xCCNH.");
      process.exit(1);
    } else {
      console.warn("\u26A0\uFE0F [DEV WARNING] \u0110ang ch\u1EA1y trong m\xF4i tr\u01B0\u1EDDng ph\xE1t tri\u1EC3n v\u1EDBi c\u1EA5u h\xECnh m\u1EB7c \u0111\u1ECBnh an to\xE0n.");
    }
  }
  validatedEnv = parseResult.success ? parseResult.data : process.env;
  console.log("\u2705 Bi\u1EBFn m\xF4i tr\u01B0\u1EDDng (.env) \u0111\xE3 \u0111\u01B0\u1EE3c ki\u1EC3m tra v\xE0 n\u1EA1p th\xE0nh c\xF4ng.");
  return validatedEnv;
}

// src/backend/security/sanitizer.ts
function sanitizeString(val) {
  if (typeof val !== "string") return val;
  return val.replace(/\0/g, "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").trim();
}
function deepSanitize(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item));
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      cleaned[key] = deepSanitize(value);
    }
    return cleaned;
  }
  return obj;
}
function sanitizeInputMiddleware(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = deepSanitize(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = deepSanitize(req.params);
  }
  next();
}

// src/backend/serverMain.ts
try {
  if (dns2.setDefaultResultOrder) {
    dns2.setDefaultResultOrder("ipv4first");
  }
} catch (e) {
}
var isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const missingVars = [];
  if (!process.env.DATABASE_URL) missingVars.push("DATABASE_URL");
  if (!process.env.JWT_SECRET) missingVars.push("JWT_SECRET");
  if (missingVars.length > 0) {
    console.error(`\u274C [FATAL CONFIG ERROR] Thi\u1EBFu c\xE1c bi\u1EBFn m\xF4i tr\u01B0\u1EDDng b\u1EAFt bu\u1ED9c trong m\xF4i tr\u01B0\u1EDDng production: ${missingVars.join(", ")}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes("change_this") || process.env.JWT_SECRET.includes("lifeos_super_secure") || process.env.JWT_SECRET.includes("default")) {
    console.error("\u274C [FATAL SECURITY ERROR] JWT_SECRET trong m\xF4i tr\u01B0\u1EDDng production kh\xF4ng \u0111\u1EE7 an to\xE0n (y\xEAu c\u1EA7u t\u1ED1i thi\u1EC3u 32 k\xFD t\u1EF1 ng\u1EABu nhi\xEAn, kh\xF4ng d\xF9ng secret m\u1EB7c \u0111\u1ECBnh).");
    process.exit(1);
  }
} else {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://lifeos_user:secure_password_123@localhost:5432/lifeos_db?schema=public";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "lifeos_super_secure_jwt_secret_key_2026_production";
  process.env.INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "admin@lifeos.com";
  process.env.INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "Admin@123456";
}
function ensurePostgresRunning() {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl && !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1")) {
      return;
    }
    const cwd = process.cwd();
    const scriptPath = path2.join(cwd, "scripts/start_postgres.sh");
    if (fs.existsSync(scriptPath)) {
      try {
        execSync(`bash "${scriptPath}" 2>&1 || true`);
      } catch (e) {
        console.warn("start_postgres warning:", e.message);
      }
    }
  } catch (err) {
    console.warn("ensurePostgresRunning warning:", err.message);
  }
}
async function startServer() {
  validateEnvOnStartup();
  ensurePostgresRunning();
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (origin) {
      if (allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Request-ID");
      }
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://ui-avatars.com; connect-src 'self' ws: wss:; media-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self' *;"
    );
    next();
  });
  app.use(express.json({ limit: "10mb" }));
  app.use(sanitizeInputMiddleware);
  app.use(cookieParser());
  app.use(csrfProtection);
  let dbStatus = "disconnected";
  try {
    await checkDbConnection();
    dbStatus = "connected";
    console.log("\u2705 PostgreSQL database connected successfully via Prisma");
  } catch (err) {
    console.warn("Initial DB check issue, attempting connection retry...", err.message);
    try {
      await checkDbConnection();
      dbStatus = "connected";
    } catch (e) {
      console.error("\u274C PostgreSQL connection error:", e.message);
      dbStatus = "error";
    }
  }
  workerService.start(3e5);
  notificationScheduler.start(6e4);
  app.get("/health", async (req, res) => {
    let dbLive = false;
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      dbLive = true;
    } catch (e) {
      dbLive = false;
    }
    const workerStatus = workerService.getStatus();
    const healthPayload = {
      status: dbLive ? "ok" : "degraded",
      database: dbLive ? "connected" : "disconnected",
      worker: workerStatus.running ? "running" : "stopped",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    res.status(dbLive ? 200 : 503).json(healthPayload);
  });
  app.get("/api/health", async (req, res) => {
    let dbLive = false;
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      dbLive = true;
    } catch (e) {
      dbLive = false;
    }
    const workerStatus = workerService.getStatus();
    res.status(dbLive ? 200 : 503).json({
      status: dbLive ? "ok" : "degraded",
      database: dbLive ? "connected" : "disconnected",
      worker: workerStatus.running ? "running" : "stopped",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/ready", async (req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready", database: "ready" });
    } catch (e) {
      res.status(503).json({ status: "not_ready", database: "unavailable" });
    }
  });
  app.get("/api/ready", async (req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready", database: "ready" });
    } catch (e) {
      res.status(503).json({ status: "not_ready", database: "unavailable" });
    }
  });
  try {
    const prisma = getPrisma();
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL ? process.env.INITIAL_ADMIN_EMAIL.toLowerCase().trim() : isProduction ? "" : "admin@lifeos.com";
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? "" : "Admin@123456");
    if (adminEmail && adminPassword) {
      const existingAdmin = await prisma.user.findFirst({
        where: { email: adminEmail }
      });
      if (!existingAdmin) {
        console.log(`Initial setup: Provisioning SuperAdmin account (${adminEmail})...`);
        const salt = await bcrypt4.genSalt(12);
        const passwordHash = await bcrypt4.hash(adminPassword, salt);
        await dbService.createUser({
          name: "LifeOS SuperAdmin",
          email: adminEmail,
          username: adminEmail.split("@")[0],
          passwordHash,
          role: "SUPERADMIN",
          plan: "TEAM",
          status: "ACTIVE",
          avatar: "https://ui-avatars.com/api/?name=Super+Admin&background=0284c7&color=fff"
        });
        console.log(`\u2705 Initial SuperAdmin created: ${adminEmail}`);
      }
    } else if (isProduction) {
      const anyAdmin = await prisma.user.findFirst({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] } }
      });
      if (!anyAdmin) {
        console.warn('\u26A0\uFE0F [NOTICE]: Ch\u01B0a c\xF3 t\xE0i kho\u1EA3n SuperAdmin trong h\u1EC7 th\u1ED1ng. H\xE3y ch\u1EA1y "npm run admin:create" \u0111\u1EC3 kh\u1EDFi t\u1EA1o t\xE0i kho\u1EA3n qu\u1EA3n tr\u1ECB.');
      }
    }
    const demoUser = await prisma.user.findFirst({
      where: { email: "user@lifeos.com" }
    });
    if (!demoUser) {
      const salt = await bcrypt4.genSalt(10);
      const passwordHash = await bcrypt4.hash("User@123456", salt);
      await dbService.createUser({
        name: "Demo Member",
        email: "user@lifeos.com",
        username: "user_demo",
        passwordHash,
        role: "USER",
        plan: "PRO",
        status: "ACTIVE",
        avatar: "https://ui-avatars.com/api/?name=User+Demo&background=6366f1&color=fff"
      });
      console.log("\u2705 Demo test user created: user@lifeos.com");
    }
    const templates = await dbService.getSystemTemplates();
    if (templates.length < 16) {
      await dbService.seedTemplates([
        {
          id: "tpl_para_system",
          title: "H\u1EC7 th\u1ED1ng Qu\u1EA3n l\xFD P.A.R.A (Tiago Forte)",
          description: "Khung t\u1ED5 ch\u1EE9c d\u1EF1 \xE1n, khu v\u1EF1c, t\xE0i nguy\xEAn v\xE0 l\u01B0u tr\u1EEF theo ph\u01B0\u01A1ng ph\xE1p Second Brain hi\u1EC7n \u0111\u1EA1i",
          category: "Productivity",
          tier: "Free",
          tags: ["PARA", "Productivity", "Organization", "SecondBrain"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_finance_freedom",
          title: "L\u1ED9 tr\xECnh T\u1EF1 do T\xE0i ch\xEDnh 50/30/20 & 100M \u0110\u1EA7u Ti\xEAn",
          description: "H\u1EC7 th\u1ED1ng qu\u1EA3n l\xFD chi ti\xEAu, h\u1EA1n m\u1EE9c ng\xE2n s\xE1ch, h\u0169 t\xEDch l\u0169y v\xE0 lu\u1EADt 72h ch\u1ED1ng mua s\u1EAFm b\u1ED1c \u0111\u1ED3ng",
          category: "Finance",
          tier: "Free",
          tags: ["Finance", "Budgeting", "Savings", "T\xE0iCh\xEDnh"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_atomic_habits",
          title: "Ma tr\u1EADn X\xE2y d\u1EF1ng Th\xF3i quen B\u1EC1n v\u1EEFng (Atomic Habits)",
          description: "Theo d\xF5i chu\u1ED7i streak, \u0111o l\u01B0\u1EDDng t\u1EF7 l\u1EC7 ho\xE0n th\xE0nh v\xE0 th\xF3i quen 2 ph\xFAt kh\u1EDFi \u0111\u1ED9ng",
          category: "Habits",
          tier: "Free",
          tags: ["Habits", "Health", "Routines", "K\u1EF7Lu\u1EADt"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_solo_freelancer",
          title: "Solo Freelancer & Digital Nomad OS",
          description: "Quy tr\xECnh nh\u1EADn brief, c\u1ECDc 50%, b\xE0n giao, thu h\u1ED3i c\xF4ng n\u1EE3 v\xE0 h\u0169 t\xE0i ch\xEDnh thu\u1EBF 30%",
          category: "Management",
          tier: "Free",
          tags: ["Freelancer", "D\u1EF1\xC1n", "Kh\xE1chH\xE0ng", "Work"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_student_scholarship",
          title: "Sinh vi\xEAn H\u1ECDc b\xE1 \u2013 JLPT/IELTS & GPA 3.6+",
          description: "Qu\u1EA3n l\xFD t\xEDn ch\u1EC9, \u0111\u1EBFm ng\u01B0\u1EE3c ng\xE0y thi, Spaced Repetition t\u1EEB v\u1EF1ng v\xE0 khung Deep Work 90 ph\xFAt",
          category: "Study",
          tier: "Free",
          tags: ["H\u1ECDcT\u1EADp", "GPA", "IELTS", "JLPT"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_adhd_anti_overthinking",
          title: "ADHD & Anti-Overthinking Engine",
          description: "Kh\u1EAFc ph\u1EE5c tr\xEC ho\xE3n v\u1EDBi Daily Trifecta 3 vi\u1EC7c, Brain Dump x\u1EA3 stress v\xE0 quy t\u1EAFc 2 ph\xFAt",
          category: "Productivity",
          tier: "Free",
          tags: ["ADHD", "Focus", "AntiProcrastination", "T\xE2mL\xFD"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_ecommerce_koc",
          title: "Shop Online & KOC Affiliate Master",
          description: "L\u1ECBch k\u1ECBch b\u1EA3n video TikTok 7 ng\xE0y, qu\u1EA3n l\xFD hoa h\u1ED3ng \u0111a s\xE0n v\xE0 checklist \u0111\xF3ng g\xF3i ni\xEAm phong",
          category: "Management",
          tier: "Free",
          tags: ["Ecommerce", "TikTokShop", "Affiliate", "KOC"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_fitness_recomp",
          title: "Fitness & Body Recomp (Push/Pull/Legs & Macro)",
          description: "L\u1ECBch t\u1EADp gym PPL 5 ng\xE0y, theo d\xF5i l\u01B0\u1EE3ng n\u01B0\u1EDBc 2.5L, ch\u1EC9 s\u1ED1 \u0111\u1EA1m/calo v\xE0 gi\u1EA5c ng\u1EE7 ph\u1EE5c h\u1ED3i 8h",
          category: "Health",
          tier: "Free",
          tags: ["Gym", "Fitness", "DinhD\u01B0\u1EE1ng", "S\u1EE9cKh\u1ECFe"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_podcast_creator",
          title: "Content Creator & Video Podcast Studio",
          description: "Pipeline s\u1EA3n xu\u1EA5t t\u1EEB \xFD t\u01B0\u1EDFng t\u1EADp, k\u1ECBch b\u1EA3n kh\xE1ch m\u1EDDi, l\u1ECBch ghi \xE2m \u0111\u1EBFn c\u1EAFt gh\xE9p Shorts/Reels",
          category: "Productivity",
          tier: "Free",
          tags: ["Creator", "Podcast", "Media", "S\xE1ngT\u1EA1o"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_thesis_research",
          title: "Nghi\xEAn c\u1EE9u Khoa h\u1ECDc & Lu\u1EADn v\u0103n Th\u1EA1c s\u0129",
          description: "Theo d\xF5i t\xE0i li\u1EC7u tr\xEDch d\u1EABn, khung \u0111\u1EC1 c\u01B0\u01A1ng 5 ch\u01B0\u01A1ng, ti\u1EBFn \u0111\u1ED9 vi\u1EBFt v\xE0 ph\u1EA3n bi\u1EC7n khoa h\u1ECDc",
          category: "Study",
          tier: "Free",
          tags: ["Lu\u1EADnV\u0103n", "Nghi\xEAnC\u1EE9u", "H\u1ECDcThu\u1EADt", "Paper"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_mindfulness_zen",
          title: "Thi\u1EC1n \u0111\u1ECBnh, Th\u01B0 gi\xE3n & S\u1EE9c kh\u1ECFe Tinh th\u1EA7n (Mindfulness)",
          description: "Nh\u1EADt k\xFD 3 \u0111i\u1EC1u bi\u1EBFt \u01A1n m\u1ED7i t\u1ED1i, b\xE0i t\u1EADp th\u1EDF Box Breathing 5 ph\xFAt v\xE0 Digital Detox cu\u1ED1i tu\u1EA7n",
          category: "Health",
          tier: "Free",
          tags: ["Zen", "Ch\u1EEFaL\xE0nh", "Thi\u1EC1n", "MentalHealth"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_startup_mvp",
          title: "Startup Founder 30-Day MVP Sprint",
          description: "Khung tri\u1EC3n khai startup tinh g\u1ECDn: Ph\u1ECFng v\u1EA5n 20 kh\xE1ch h\xE0ng, Vibe code MVP, Launch Product Hunt",
          category: "Management",
          tier: "Free",
          tags: ["Startup", "Founder", "MVP", "KinhDoanh"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_okr_master",
          title: "H\u1EC7 Th\u1ED1ng Qu\u1EA3n Tr\u1ECB M\u1EE5c Ti\xEAu OKRs Qu\xFD",
          description: "Khung Objective & Key Results (John Doerr) \u0111\u1ECBnh h\u01B0\u1EDBng n\u1ED7 l\u1EF1c, theo d\xF5i m\u1EE5c ti\xEAu then ch\u1ED1t v\xE0 s\xE1ng ki\u1EBFn h\xE0nh \u0111\u1ED9ng",
          category: "Management",
          tier: "Free",
          tags: ["OKR", "M\u1EE5cTi\xEAu", "Chi\u1EBFnL\u01B0\u1EE3c", "Productivity"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_eisenhower_matrix",
          title: "Ma Tr\u1EADn \u01AFu Ti\xEAn Eisenhower 4 C\u1EA5p \u0110\u1ED9",
          description: "Ph\xE2n lo\u1EA1i c\xF4ng vi\u1EC7c theo Ma tr\u1EADn Kh\u1EA9n c\u1EA5p vs Quan tr\u1ECDng, t\u1EADp trung 60% n\u0103ng l\u01B0\u1EE3ng v\xE0o Q2 chi\u1EBFn l\u01B0\u1EE3c d\xE0i h\u1EA1n",
          category: "Productivity",
          tier: "Free",
          tags: ["Eisenhower", "\u01AFuTi\xEAn", "Th\u1EDDiGian", "K\u1EF7Lu\u1EADt"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_6_jars_finance",
          title: "H\u1EC7 Th\u1ED1ng Qu\u1EA3n L\xFD Ti\u1EC1n 6 Chi\u1EBFc H\u0169 (6 JARS)",
          description: "Ph\u01B0\u01A1ng ph\xE1p qu\u1EA3n tr\u1ECB d\xF2ng ti\u1EC1n \u0111\u1EC9nh cao c\u1EE7a T. Harv Eker: Thi\u1EBFt y\u1EBFu 55%, T\u1EF1 do t\xE0i ch\xEDnh 10%, Ti\u1EBFt ki\u1EC7m 10%, Gi\xE1o d\u1EE5c 10%, H\u01B0\u1EDFng th\u1EE5 10%, Cho \u0111i 5%",
          category: "Finance",
          tier: "Free",
          tags: ["Finance", "6JARS", "Ti\u1EC1nB\u1EA1c", "Qu\u1EA3nL\xFDT\xE0iCh\xEDnh"],
          price: 0,
          isFree: true
        },
        {
          id: "tpl_circadian_health",
          title: "T\u1ED1i \u01AFu Nh\u1ECBp Sinh H\u1ECDc & Gi\u1EA5c Ng\u1EE7 Ph\u1EE5c H\u1ED3i (Circadian Protocol)",
          description: "Giao th\u1EE9c n\u0103ng l\u01B0\u1EE3ng sinh h\u1ECDc khoa h\u1ECDc: T\u1EAFm n\u1EAFng s\u1EDBm 15p, c\u1EAFt caffeine sau 14h, gi\u1EA3m \xE1nh s\xE1ng xanh 22h v\xE0 ng\u1EE7 s\xE2u 8 ti\u1EBFng",
          category: "Health",
          tier: "Free",
          tags: ["Health", "Circadian", "Gi\u1EA5cNg\u1EE7", "N\u0103ngL\u01B0\u1EE3ng"],
          price: 0,
          isFree: true
        }
      ]);
      console.log("\u2705 16 System templates seeded successfully");
    }
    const couponsCount = await prisma.coupon.count();
    if (couponsCount === 0) {
      await prisma.coupon.createMany({
        data: [
          {
            code: "LIFEOS20",
            discountPercent: 20,
            status: "Active",
            maxUses: 1e3,
            usedCount: 0
          },
          {
            code: "WELCOME50",
            discountPercent: 50,
            status: "Active",
            maxUses: 500,
            usedCount: 0
          },
          {
            code: "PRO2026",
            discountPercent: 30,
            status: "Active",
            maxUses: 1e3,
            usedCount: 0
          }
        ]
      });
      console.log("\u2705 Default promotional coupons seeded");
    }
  } catch (e) {
    console.error("Initial provisioning notice:", e.message);
  }
  app.get("/auth/google", (req, res) => res.redirect("/api/auth/google"));
  app.get("/auth/google/callback", (req, res) => {
    const qs = new URLSearchParams(req.query).toString();
    res.redirect(qs ? "/api/auth/google/callback?" + qs : "/api/auth/google/callback");
  });
  app.use("/api/auth", authRouter);
  app.use("/api", apiRouter);
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Endpoint '${req.originalUrl}' kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng.`
      },
      message: `Endpoint '${req.originalUrl}' kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng.`
    });
  });
  app.use((err, req, res, next) => {
    console.error(`Unhandled error [${req.method} ${req.url}]:`, err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith("/api/")) {
      SystemNotificationHelper.onSystemCriticalError({
        message: err.message || "L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh",
        stack: err.stack,
        path: req.path,
        method: req.method,
        userEmail: req.user?.email
      }).catch(() => {
      });
      return res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || "INTERNAL_SERVER_ERROR",
          message: err.message || "\u0110\xE3 x\u1EA3y ra l\u1ED7i m\xE1y ch\u1EE7 n\u1ED9i b\u1ED9.",
          requestId: req.headers["x-request-id"] || void 0
        },
        message: err.message || "\u0110\xE3 x\u1EA3y ra l\u1ED7i m\xE1y ch\u1EE7 n\u1ED9i b\u1ED9."
      });
    }
    next(err);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
      }
      const ext = path2.extname(req.path);
      if (ext && ext !== ".html") {
        return res.status(404).send("Resource not found");
      }
      const url = req.originalUrl || req.url;
      try {
        let template = fs.readFileSync(path2.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    const indexPath = path2.join(distPath, "index.html");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.use("*", (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
      }
      const ext = path2.extname(req.path);
      if (ext && ext !== ".html") {
        return res.status(404).send("Resource not found");
      }
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path2.resolve(process.cwd(), "index.html"));
      }
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} LifeOS Server running on http://0.0.0.0:${PORT}`);
    emailQueueService.startQueueWorker();
    emailQueueService.verifySmtpConnection().catch((e) => console.warn("Initial SMTP verify notice:", e));
  });
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    try {
      workerService.stop();
      notificationScheduler.stop();
      emailQueueService.stopQueueWorker();
    } catch (e) {
    }
    const forceExitTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out after 30s. Forcing exit.");
      process.exit(1);
    }, 3e4);
    forceExitTimer.unref();
    server.close(async () => {
      clearTimeout(forceExitTimer);
      try {
        await getPrisma().$disconnect();
      } catch (e) {
      }
      console.log("Server shut down cleanly.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
process.on("uncaughtException", (err) => {
  console.error("\u{1F4A5} [CRITICAL PROCESS ERROR] Uncaught Exception:", err.stack || err.message);
  try {
    SystemNotificationHelper.onSystemCriticalError({
      message: `Uncaught Exception: ${err.message}`,
      stack: err.stack,
      path: "process_level",
      method: "UNCAUGHT_EXCEPTION"
    }).catch(() => {
    });
  } catch (e) {
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("\u26A0\uFE0F [PROCESS WARNING] Unhandled Promise Rejection:", reason);
});
startServer();
