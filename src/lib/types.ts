export type ViewState =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'finance'
  | 'focus'
  | 'projects'
  | 'study'
  | 'goals'
  | 'notes'
  | 'habits'
  | 'decision'
  | 'automation'
  | 'account'
  | 'marketplace'
  | 'cart'
  | 'checkout'
  | 'subscription'
  | 'referral'
  | 'feedback'
  | 'journey'
  | 'admin'
  | (string & {});

export type AccountLifecycleStatus = 'UNPAID' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'DISABLED';

export interface UserSubscriptionStatus {
  hasAccess: boolean;
  lifecycleStatus?: AccountLifecycleStatus;
  currentPlan: string;
  planType: 'PERSONAL' | 'TEAM' | 'NONE';
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NONE';
  planExpiresAt?: string | null;
  startDate?: string | null;
  remainingDays: number;
  amount?: number;
  isTeamOwner?: boolean;
  isTeamMember?: boolean;
  teamId?: string;
  teamName?: string;
  teamOwnerEmail?: string;
  subscriptionId?: string;
  role?: string;
  subscription?: any;
  history?: any[];
  activePending?: any;
}

export type WorkspaceMode = 'Personal' | 'Work' | 'All' | 'Advanced' | 'Simple' | 'Basic' | 'Power';

export interface OnboardingPreferences {
  purpose: 'simple' | 'full' | 'pro' | string;
  domain: 'student' | 'worker' | 'freelancer' | string;
  focus: string[];
  schedule: string;
  budget: string;
  configuredAt?: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked' | 'Review';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type FocusMode = 'pomodoro' | 'short_break' | 'long_break' | 'deep_work' | 'flow' | string;
export type FocusStatus = 'idle' | 'running' | 'paused' | 'completed' | string;

export type GoalPriority = 'Low' | 'Medium' | 'High' | 'Critical' | Priority;
export type GoalType = 'Outcome' | 'Process' | 'Milestone' | string;
export type GoalTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | string;
export type GoalRiskStatus = 'On Track' | 'At Risk' | 'Behind' | string;

export type AutomationModuleCategory = string;
export type AutomationTriggerType = string;
export type AutomationOperator = string;
export type AutomationActionType = string;
export type SensitivityLevel = string;
export type AutomationRulePriority = string;
export type AutomationRuleScope = string;
export type CooldownFrequency = string;
export type ExceptionHandling = string;
export type AutomationConditionGroup = any;
export type AutomationActionConfig = any;

export type DecisionCategory = string;
export type DecisionImportance = string;
export type DecisionStatus = string;
export type DecisionThreshold = any;
export type DecisionRiskItem = any;

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'User' | 'Admin' | 'SuperAdmin';
  plan: 'Free' | 'Pro' | 'Team';
  status: 'Active' | 'Suspended' | 'Disabled';
  avatar?: string;
  credit?: number;
  createdAt?: string;
  lastLogin?: string;
  expirationDate?: string | null;
  onboardingCompleted?: boolean;
  onboardingPreferences?: OnboardingPreferences;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  projectId?: string;
  goalId?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  health: string;
  progress: number;
  startDate?: string;
  deadline?: string;
  budget?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  status?: string;
  color?: string;
  reminder?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color?: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  amount: number;
  type: 'Thu nhập' | 'Chi tiêu' | 'Chuyển tiền';
  category: string;
  date: string;
  note?: string;
  createdAt?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: string;
  color?: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
}

export interface Debt {
  id: string;
  name: string;
  type: 'Lending' | 'Borrowing';
  amount: number;
  counterpart: string;
  dueDate?: string;
  status: string;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  target: number;
  unitLabel?: string;
  unit?: string;
  streak: number;
  bestStreak?: number;
  status: string;
  completedDates?: string[] | string;
  scheduleTime?: string;
  createdAt?: string;
}

export interface HabitRecord {
  id: string;
  habitId: string;
  date: string;
  value: number;
  completed: boolean;
}

export interface Routine {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  category: string;
}

export interface GoalMilestone {
  id: string;
  goalId?: string;
  title: string;
  completed: boolean;
  progress?: number;
  status?: string;
  deadline?: string;
}

export interface GoalAction {
  id?: string;
  goalId?: string;
  title: string;
  completed?: boolean;
  type?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  progress: number;
  status: string;
  targetValue: number;
  currentValue: number;
  current?: number;
  target?: number;
  unit?: string;
  color?: string;
  deadline?: string;
  startDate?: string;
  streak?: number;
  score?: number;
  tier?: string;
  goalType?: string;
  riskStatus?: string;
  milestones?: GoalMilestone[];
  actions?: GoalAction[];
  linkedProjectIds?: string[];
  kpis?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalReview {
  id: string;
  goalId: string;
  date: string;
  notes: string;
}

export type NoteType =
  | 'Normal'
  | 'Checklist'
  | 'Meeting'
  | 'Decision'
  | 'Daily'
  | 'Study'
  | 'Project'
  | 'Idea'
  | 'Journal'
  | 'Reference'
  | 'Finance'
  | 'Research'
  | 'Custom'
  | 'standard'
  | 'checklist'
  | 'meeting'
  | 'decision'
  | 'project'
  | string;

export interface NoteSection {
  id: string;
  title: string;
  content: string;
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteMeetingData {
  participants?: string[];
  actionItems?: Array<{
    id: string;
    text: string;
    done?: boolean;
    completed?: boolean;
    assignee?: string;
    convertedTaskId?: string;
  }>;
  agenda?: string[];
}

export interface NoteDecisionData {
  context?: string;
  decision?: string;
  rationale?: string;
  implications?: string;
  chosenOption?: string;
  reason?: string;
}

export interface NoteTemplate {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  type?: NoteType;
  defaultFolder?: string;
  category?: string;
  defaultContent?: string;
  sections?: NoteSection[];
  defaultSections?: NoteSection[];
  [key: string]: any;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  category: string;
  pinned: boolean;
  type?: NoteType;
  status?: string;
  priority?: string;
  favorite?: boolean;
  archived?: boolean;
  inTrash?: boolean;
  tags?: string[];
  noteDate?: string;
  checklists?: NoteChecklistItem[];
  sections?: NoteSection[];
  meetingData?: NoteMeetingData;
  decisionData?: NoteDecisionData;
  linkedItems?: {
    taskIds?: string[];
    projectIds?: string[];
    goalIds?: string[];
    noteIds?: string[];
    [key: string]: any;
  };
  versionHistory?: Array<{
    id: string;
    timestamp: string;
    content?: string;
    title?: string;
    note?: any;
    [key: string]: any;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudySubject {
  id: string;
  name: string;
  targetGrade: number;
  currentGrade: number;
  progress: number;
  color: string;
}

export interface StudyTopic {
  id: string;
  subjectId: string;
  name: string;
  completed: boolean;
}

export interface StudyAssignment {
  id: string;
  subjectId?: string;
  title: string;
  dueDate?: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  grade?: number;
}

export interface StudyExam {
  id: string;
  subjectId: string;
  title: string;
  examDate: string;
  targetScore: number;
  actualScore?: number;
  status: string;
}

export interface FocusSession {
  id: string;
  userId?: string;
  title: string;
  mode: FocusMode;
  status: FocusStatus;
  plannedDuration: number;
  actualDuration: number;
  startTime?: string | null;
  endTime?: string | null;
  taskId?: string | null;
  notes?: string | null;
  reflection?: string | null;
  interruptions?: any[];
  createdAt?: string;
  // Backward compatibility fields for legacy views
  durationMinutes?: number;
  type?: string;
  completed?: boolean;
  score?: number;
}

export interface FocusGoal {
  id: string;
  targetMinutes: number;
  currentMinutes: number;
  date: string;
}

export interface DecisionCriterion {
  id: string;
  name: string;
  weight: number;
  type?: 'benefit' | 'cost' | 'numeric' | 'scale' | string;
  isMustHave?: boolean;
  [key: string]: any;
}

export interface DecisionOption {
  id: string;
  name: string;
  description?: string;
  cost?: number;
  criterionScores?: Record<string, number>;
  riskLevel?: number;
  timeHours?: number;
  [key: string]: any;
}

export interface DecisionOpportunityCost {
  id?: string;
  title?: string;
  cost?: number;
  [key: string]: any;
}

export interface DecisionItem {
  id: string;
  title: string;
  problem?: string;
  problemStatement?: string;
  whyReason?: string;
  deadline?: string;
  constraints?: any[];
  category: string;
  importance: string;
  status: string;
  selectedOptionId?: string;
  score?: number;
  outcome?: string;
  expectedResult?: string;
  actualResult?: string;
  reviewDate?: string;
  options: DecisionOption[];
  criteria: DecisionCriterion[];
  risks?: any[];
  scenarios?: any[];
  decisionNotes?: string;
  threshold?: DecisionThreshold;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface DecisionRule {
  id: string;
  name: string;
  description?: string;
}

export interface DecisionReviewData {
  outcome: string;
  actualResult: string;
  reviewDate: string;
}

export interface AutomationRule {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  scope?: string;
  priority?: string;
  sensitivityLevel?: string;
  cooldownFrequency?: string;
  exceptionHandling?: string;
  triggerType?: string;
  trigger?: any;
  conditions?: any[];
  conditionGroups?: any[];
  actions?: any[];
  active?: boolean;
  enabled?: boolean;
  lastExecutedAt?: string;
  executionCount?: number;
  [key: string]: any;
}

export interface AutomationHistoryEntry {
  id: string;
  ruleId: string;
  status: 'Success' | 'Failure' | 'Skipped';
  result?: string;
  createdAt?: string;
}

export interface AutomationConflictItem {
  id: string;
  description: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  tier: string;
  category: string;
  tags?: string[];
  author?: string;
  price: number;
  isFree: boolean;
  downloads?: number;
  rating?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  tier: string;
  author: string;
  quantity?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  items: any[];
  createdAt: string;
}

export interface InboxItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  messages: any[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface LifeScore {
  overall?: number;
  productivity?: number;
  finance?: number;
  health?: number;
  learning?: number;
  mindfulness?: number;
  study?: number;
  habit?: number;
  total?: number;
  [key: string]: any;
}
