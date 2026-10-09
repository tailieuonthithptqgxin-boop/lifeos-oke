
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, Project, Event, Transaction, StudySubject, StudyTopic, StudyAssignment, StudyExam, Habit, HabitRecord, Routine, Goal, GoalMilestone, GoalReview, Note, ViewState, LifeScore, User, Product, CartItem, Order, WorkspaceMode, InboxItem, FocusSession, FocusGoal, DecisionItem, DecisionRule, DecisionReviewData, AutomationRule, AutomationHistoryEntry, AutomationConflictItem, AppNotification, OnboardingPreferences, UserSubscriptionStatus } from './types';
import { apiCall } from './apiClient';

interface AppState {
  language: string;
  setLanguage: (lang: string) => void;
  activeLanguages: { code: string; name: string; flag: string; status: string; isDefault: boolean }[];
  defaultLanguage: string;
  refreshLanguages: () => Promise<void>;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  onboardingPreferences: OnboardingPreferences | null;
  setOnboardingPreferences: (prefs: OnboardingPreferences | ((prev: OnboardingPreferences | null) => OnboardingPreferences)) => void;
  currentView: ViewState;
  currentUser: User | null;
  subscriptionStatus: UserSubscriptionStatus | null;
  users: User[];
  workspaceMode: WorkspaceMode;
  isCommandOpen: boolean;
  isMobileMenuOpen: boolean;
  theme: "light" | "dark";
  toggleMobileMenu: () => void;
  setTheme: (theme: "light" | "dark") => void;
  dailyCapacity: number;
  inbox: InboxItem[];
  notifications: AppNotification[];
  tasks: Task[];
  projects: Project[];
  events: Event[];
  focusSessions: FocusSession[];
  focusGoals: FocusGoal[];
  financeAccounts: any[];
  transactions: Transaction[];
  budgets: any[];
  savingGoals: any[];
  debts: any[];
  subjects: StudySubject[];
  studyTopics: StudyTopic[];
  studyAssignments: StudyAssignment[];
  studyExams: StudyExam[];
  habits: Habit[];
  habitRecords: HabitRecord[];
  routines: Routine[];
  goals: Goal[];
  notes: Note[];
  decisions: DecisionItem[];
  decisionRules: DecisionRule[];
  automationRules: AutomationRule[];
  automationHistory: AutomationHistoryEntry[];
  automationConflicts: AutomationConflictItem[];
  lifeScore: LifeScore;
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  
  isAppLoaded: boolean;
  syncState: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
  clearSyncState: () => void;
}

// Generate context generic action types
interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  completeOnboarding: (selections?: any) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setCurrentView: (view: ViewState) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleCommand: () => void;
  clearAllNotifications: () => Promise<void>;
  checkout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  upgradePlan: (plan?: 'Free' | 'Pro' | 'Team' | 'FREE' | 'PRO' | 'TEAM' | string) => Promise<any>;
  fetchSubscriptionStatus: () => Promise<UserSubscriptionStatus | null>;
  [key: string]: any; // Allow generic dynamic actions for simplicity during refactor
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultState: AppState = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  onboardingPreferences: null,
  setOnboardingPreferences: () => {},
  currentView: 'dashboard',
  workspaceMode: 'Advanced',
  isCommandOpen: false,
  isMobileMenuOpen: false,
  theme: (typeof window !== 'undefined' && (localStorage.getItem('lifeos_theme') as 'light' | 'dark')) || "light",
  toggleMobileMenu: () => {},
  setTheme: () => {},
  language: (typeof window !== 'undefined' && localStorage.getItem('lifeos_lang')) || "vi",
  setLanguage: () => {},
  activeLanguages: [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', status: 'ACTIVE', isDefault: true },
    { code: 'en', name: 'English', flag: '🇬🇧', status: 'ACTIVE', isDefault: false }
  ],
  defaultLanguage: 'vi',
  refreshLanguages: async () => {},
  dailyCapacity: 8,
  inbox: [],
  notifications: [],
  currentUser: null,
  subscriptionStatus: null,
  users: [],
  automationRules: [],
  automationHistory: [],
  automationConflicts: [],
  tasks: [],
  projects: [],
  events: [],
  focusSessions: [],
  focusGoals: [],
  financeAccounts: [],
  transactions: [],
  budgets: [],
  savingGoals: [],
  debts: [],
  subjects: [],
  studyTopics: [],
  studyAssignments: [],
  studyExams: [],
  habits: [],
  habitRecords: [],
  routines: [],
  goals: [],
  notes: [],
  decisions: [],
  decisionRules: [],
  lifeScore: { total: 0, productivity: 0, study: 0, finance: 0, habit: 0 },
  products: [],
  cart: [],
  orders: [],
  isAppLoaded: false,
  syncState: 'idle',
  syncMessage: '',
  clearSyncState: () => {}
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Query backend directly using HttpOnly cookie session
        const res = await apiCall('/api/auth/me');
        if (res && (res.user || res.id)) {
          const user = res.user || res;
          if (res.token) {
            try { localStorage.setItem('token', res.token); } catch (e) {}
          }
          let storedPrefs: OnboardingPreferences | null = null;
          try {
            const raw = localStorage.getItem(`lifeos_user_onboarding_prefs_${user.id}`) || localStorage.getItem('lifeos_user_onboarding_prefs_current');
            if (raw) storedPrefs = JSON.parse(raw);
          } catch (e) {}

          let initialMode: WorkspaceMode = 'Advanced';
          if (storedPrefs?.purpose === 'simple') initialMode = 'Simple';
          else if (storedPrefs?.purpose === 'pro') initialMode = 'Power';
          else if (storedPrefs?.domain === 'worker') initialMode = 'Work';
          else if (storedPrefs?.domain === 'student') initialMode = 'Personal';

          // 1. Mark as authenticated immediately (Auth is confirmed)
          setState(s => ({
            ...s,
            isAuthenticated: true,
            currentUser: user,
            hasCompletedOnboarding: !!user.onboardingCompleted,
            onboardingPreferences: storedPrefs,
            workspaceMode: initialMode
          }));

          // 2. Load subscription status to verify active paid plan
          fetchSubscriptionStatus().catch(() => {});

          // 3. Load application collections in background without breaking auth state
          loadAllData().catch((loadErr) => {
            console.warn("Background data load completed with non-fatal warnings:", loadErr);
            setState(s => ({ ...s, isAppLoaded: true }));
          });
        } else {
          try { localStorage.removeItem('token'); } catch (e) {}
          setState(s => ({ ...s, isAuthenticated: false, currentUser: null, isAppLoaded: true }));
        }
      } catch (err: any) {
        // Only if unauthenticated or session expired: show public/login cleanly
        try { localStorage.removeItem('token'); } catch (e) {}
        setState(s => ({
          ...s,
          isAuthenticated: false,
          currentUser: null,
          isAppLoaded: true
        }));
      }
    };

    initApp();

    const loadLanguages = async () => {
      try {
        const res = await apiCall('/api/languages');
        if (res && res.success && Array.isArray(res.languages)) {
          setState(s => {
            const currentLangValid = res.languages.some((l: any) => l.code === s.language);
            return {
              ...s,
              activeLanguages: res.languages,
              defaultLanguage: res.defaultLanguage || 'vi',
              language: currentLangValid ? s.language : (res.defaultLanguage || 'vi')
            };
          });
        }
      } catch (e) {
        // Keep default languages
      }
    };
    loadLanguages();

    const handleSessionExpired = () => {
      try { localStorage.removeItem('token'); } catch (e) {}
      setState(s => ({
        ...s,
        isAuthenticated: false,
        currentUser: null,
        isAppLoaded: true
      }));
    };

    window.addEventListener('lifeos:session-expired', handleSessionExpired);

    // Auto-refresh current user plan/role on window focus or light interval so upgrades appear immediately
    const refreshUserSilent = async () => {
      try {
        const res = await apiCall('/api/auth/me');
        if (res && (res.user || res.id)) {
          const u = res.user || res;
          setState(s => {
            if (!s.currentUser) return s;
            if (s.currentUser.plan !== u.plan || s.currentUser.planExpiresAt !== u.planExpiresAt || s.currentUser.role !== u.role) {
              const isNewlyUpgraded = (s.currentUser.plan === 'FREE' || !s.currentUser.plan) && (u.plan !== 'FREE');
              if (isNewlyUpgraded) {
                setTimeout(() => {
                  setState(prev => ({ ...prev, syncState: 'idle', syncMessage: '' }));
                }, 6000);
              }
              return {
                ...s,
                currentUser: { ...s.currentUser, ...u },
                ...(isNewlyUpgraded ? {
                  syncState: 'success' as const,
                  syncMessage: `🎉 Chúc mừng! Tài khoản đã được nâng cấp lên gói ${u.plan} thành công!`
                } : {})
              };
            }
            return s;
          });
        }
      } catch (e) {}
    };

    window.addEventListener('focus', refreshUserSilent);
    const intervalId = setInterval(refreshUserSilent, 15000);

    return () => {
      window.removeEventListener('lifeos:session-expired', handleSessionExpired);
      window.removeEventListener('focus', refreshUserSilent);
      clearInterval(intervalId);
    };
  }, []);

  const loadAllData = async () => {
    try {
      const collections = [
        'tasks', 'projects', 'events', 'focusSessions', 'focusGoals',
        'financeAccounts', 'transactions', 'budgets', 'savingGoals', 'debts',
        'subjects', 'studyTopics', 'studyAssignments', 'studyExams',
        'habits', 'habitRecords', 'routines', 'goals', 'notes',
        'decisions', 'decisionRules', 'automationRules', 'automationHistory',
        'automationConflicts', 'products', 'cart', 'orders', 'inbox', 'notifications'
      ];
      
      const promises = collections.map(col => apiCall(`/api/data/${col}`));
      promises.push(apiCall('/api/settings'));
      
      const results = await Promise.allSettled(promises);
      const settingsResult = results.pop();
      const settings = settingsResult?.status === 'fulfilled' ? settingsResult.value : {};

      // Set user collections from settled results
      const newState: Partial<AppState> = {};
      collections.forEach((col, idx) => {
        const itemRes = results[idx];
        (newState as any)[col] = (itemRes && itemRes.status === 'fulfilled' && Array.isArray(itemRes.value)) 
          ? itemRes.value 
          : [];
      });
      
      setState(s => ({
        ...s,
        ...newState,
        ...(settings && settings.id && s.currentUser ? { currentUser: { ...s.currentUser, ...settings } } : {}),
        isAppLoaded: true
      }));
    } catch (err: any) {
      console.warn("Notice loading data collections:", err?.message || err);
      setState(s => ({ ...s, isAppLoaded: true }));
    }
  };

  const clearWorkspace = async () => {
    try {
      setState(s => ({ ...s, syncState: 'syncing', syncMessage: 'Đang làm sạch dữ liệu để sẵn sàng hoạt động thực tế...' }));
      await apiCall('/api/clear-workspace', 'POST');
      await loadAllData();
      setState(s => ({ ...s, syncState: 'success', syncMessage: 'Đã làm sạch dữ liệu, sẵn sàng ghi nhận hoạt động thật!' }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle', syncMessage: '' })), 2500);
    } catch (err: any) {
      console.error("Failed to clear workspace:", err);
      setState(s => ({ ...s, syncState: 'error', syncMessage: 'Không thể làm sạch dữ liệu' }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle', syncMessage: '' })), 3000);
    }
  };

  const seedSampleData = async () => {
    try {
      setState(s => ({ ...s, syncState: 'syncing', syncMessage: 'Đang nạp dữ liệu hoạt động thực tế...' }));
      await apiCall('/api/seed-sample', 'POST');
      await loadAllData();
      setState(s => ({ ...s, syncState: 'success', syncMessage: 'Đã nạp số liệu thực tế thành công!' }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle', syncMessage: '' })), 2500);
    } catch (err: any) {
      console.error("Failed to seed sample data:", err);
      setState(s => ({ ...s, syncState: 'error', syncMessage: 'Không thể nạp dữ liệu mẫu' }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle', syncMessage: '' })), 3000);
    }
  };

  const login = async (user: User) => {
    // Authenticate user immediately and transition UI without delay
    setState(s => ({
      ...defaultState,
      isAuthenticated: true,
      currentUser: user,
      hasCompletedOnboarding: !!user.onboardingCompleted,
      theme: s.theme,
      language: s.language,
      isAppLoaded: true
    }));
    // Background populate collections
    loadAllData().catch(err => {
      console.warn("Background loadAllData warning:", err);
    });
  };

  const logout = () => {
    apiCall('/api/auth/logout', 'POST').catch(console.error);
    localStorage.removeItem('token');
    setState(s => ({
      ...defaultState,
      theme: s.theme,
      language: s.language,
      isAppLoaded: true
    }));
  };
  
  const setOnboardingPreferences = (prefs: OnboardingPreferences | ((prev: OnboardingPreferences | null) => OnboardingPreferences)) => {
    setState(s => {
      const nextPrefs = typeof prefs === 'function' ? prefs(s.onboardingPreferences) : prefs;
      try {
        const key = s.currentUser?.id ? `lifeos_user_onboarding_prefs_${s.currentUser.id}` : 'lifeos_user_onboarding_prefs_current';
        localStorage.setItem(key, JSON.stringify(nextPrefs));
      } catch (err) {}
      return { ...s, onboardingPreferences: nextPrefs };
    });
  };

  const completeOnboarding = async (selections?: any) => {
    // 1. Determine target layout and workspaceMode immediately
    let targetMode: WorkspaceMode = 'Advanced';
    if (selections?.purpose === 'simple') targetMode = 'Simple';
    else if (selections?.purpose === 'pro') targetMode = 'Power';
    else if (selections?.domain === 'worker') targetMode = 'Work';
    else if (selections?.domain === 'student') targetMode = 'Personal';

    // 2. Persist preferences locally for instant rehydration
    if (selections) {
      try {
        const key = state.currentUser?.id ? `lifeos_user_onboarding_prefs_${state.currentUser.id}` : 'lifeos_user_onboarding_prefs_current';
        localStorage.setItem(key, JSON.stringify(selections));
      } catch (err) {}
    }

    // 3. Immediately apply to global state (layout, preferences, dashboard view)
    setState(s => ({
      ...s,
      onboardingPreferences: selections || s.onboardingPreferences,
      workspaceMode: targetMode,
      currentView: 'dashboard',
      hasCompletedOnboarding: true,
      syncState: 'syncing',
      syncMessage: 'Đang áp dụng cấu hình và tạo không gian làm việc...'
    }));

    try {
      if (selections) {
        await apiCall('/api/auth/onboarding-setup', 'POST', { selections });
      } else {
        await apiCall('/api/auth/profile', 'PUT', { onboardingCompleted: true });
      }
      await loadAllData();
      setState(s => ({ 
        ...s, 
        hasCompletedOnboarding: true,
        syncState: 'success', 
        syncMessage: 'Đã hoàn tất cấu hình không gian làm việc cá nhân!' 
      }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle', syncMessage: '' })), 3000);
    } catch (err: any) {
      console.warn('Failed to persist onboarding status:', err);
      setState(s => ({ ...s, hasCompletedOnboarding: true, syncState: 'idle' }));
    }
  };

  const resetOnboarding = async () => {
    try {
      await apiCall('/api/auth/profile', 'PUT', { onboardingCompleted: false });
      setState(s => ({ ...s, hasCompletedOnboarding: false }));
    } catch (err: any) {
      console.warn('Failed to reset onboarding status:', err);
    }
  };
  const setCurrentView = (view: ViewState) => setState(s => ({ ...s, currentView: view }));
  const setWorkspaceMode = (mode: WorkspaceMode) => setState(s => ({ ...s, workspaceMode: mode }));
  const toggleCommand = () => setState(s => ({ ...s, isCommandOpen: !s.isCommandOpen }));
  
  const withSync = async (actionFn: () => Promise<void>, successMsg: string) => {
    setState(s => ({ ...s, syncState: 'syncing', syncMessage: 'Đang xử lý...' }));
    try {
      await actionFn();
      setState(s => ({ ...s, syncState: 'success', syncMessage: successMsg }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle' })), 3000);
    } catch (err: any) {
      console.error(err);
      setState(s => ({ ...s, syncState: 'error', syncMessage: err.message || 'Có lỗi xảy ra' }));
      setTimeout(() => setState(s => ({ ...s, syncState: 'idle' })), 5000);
      throw err;
    }
  };

  const _add = async (collection: string, item: any, stateKey: keyof AppState) => {
    const tempId = item.id || `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempItem = { ...item, id: tempId };
    
    // Instant optimistic update
    setState(s => ({ ...s, [stateKey]: [...(s[stateKey] as any[]), tempItem] }));

    await withSync(async () => {
      const created = await apiCall(`/api/data/${collection}`, 'POST', item);
      if (created && created.id) {
        setState(s => ({
          ...s,
          [stateKey]: (s[stateKey] as any[]).map((i: any) => i.id === tempId ? created : i)
        }));
      }
    }, 'Thêm thành công');
  };
  
  const _update = async (collection: string, id: string, updates: any, stateKey: keyof AppState) => {
    // Instant optimistic update
    setState(s => ({
      ...s,
      [stateKey]: (s[stateKey] as any[]).map((item: any) => item.id === id ? { ...item, ...updates } : item)
    }));

    await withSync(async () => {
      await apiCall(`/api/data/${collection}/${id}`, 'PUT', updates);
    }, 'Cập nhật thành công');
  };
  
  const _delete = async (collection: string, id: string, stateKey: keyof AppState) => {
    // Instant optimistic delete
    setState(s => ({
      ...s,
      [stateKey]: (s[stateKey] as any[]).filter((item: any) => item.id !== id)
    }));

    await withSync(async () => {
      await apiCall(`/api/data/${collection}/${id}`, 'DELETE');
    }, 'Xóa thành công');
  };

  // Generate dynamic CRUD functions
  const collections = [
    { name: 'tasks', singular: 'Task' },
    { name: 'projects', singular: 'Project' },
    { name: 'events', singular: 'Event' },
    { name: 'focusSessions', singular: 'FocusSession' },
    { name: 'focusGoals', singular: 'FocusGoal' },
    { name: 'financeAccounts', singular: 'FinanceAccount' },
    { name: 'transactions', singular: 'Transaction' },
    { name: 'budgets', singular: 'Budget' },
    { name: 'savingGoals', singular: 'SavingGoal' },
    { name: 'debts', singular: 'Debt' },
    { name: 'subjects', singular: 'Subject' },
    { name: 'studyTopics', singular: 'StudyTopic' },
    { name: 'studyAssignments', singular: 'StudyAssignment' },
    { name: 'studyExams', singular: 'StudyExam' },
    { name: 'habits', singular: 'Habit' },
    { name: 'habitRecords', singular: 'HabitRecord' },
    { name: 'routines', singular: 'Routine' },
    { name: 'goals', singular: 'Goal' },
    { name: 'notes', singular: 'Note' },
    { name: 'decisions', singular: 'Decision' },
    { name: 'decisionRules', singular: 'DecisionRule' },
    { name: 'automationRules', singular: 'AutomationRule' },
    { name: 'automationHistory', singular: 'AutomationHistory' },
    { name: 'products', singular: 'Product' },
    { name: 'cart', singular: 'CartItem' },
    { name: 'orders', singular: 'Order' },
    { name: 'inbox', singular: 'InboxItem' },
    { name: 'notifications', singular: 'Notification' }
  ];

  const dynamicMethods: any = {};
  collections.forEach(col => {
    dynamicMethods[`add${col.singular}`] = async (item: any) => {
      // Special logic for Transactions
      if (col.name === 'transactions') {
        const accId = item.accountId;
        if (accId) {
          const acc = (state.financeAccounts || []).find(a => a.id === accId);
          if (acc) {
            let nb = acc.balance || 0;
            if (item.type === 'Thu nhập') nb += item.amount;
            else if (item.type === 'Chi tiêu' || item.type === 'Chuyển tiền') nb -= item.amount;
            await _update('financeAccounts', acc.id, { balance: nb }, 'financeAccounts' as keyof AppState);
          }
          if (item.type === 'Chuyển tiền' && item.toAccountId) {
            const tAcc = (state.financeAccounts || []).find(a => a.id === item.toAccountId);
            if (tAcc) {
              await _update('financeAccounts', tAcc.id, { balance: (tAcc.balance || 0) + item.amount }, 'financeAccounts' as keyof AppState);
            }
          }
        }
      }
      return _add(col.name, item, col.name as keyof AppState);
    };
    dynamicMethods[`update${col.singular}`] = async (id: string, updates: any) => _update(col.name, id, updates, col.name as keyof AppState);
    dynamicMethods[`delete${col.singular}`] = async (id: string) => {
      // Before delete, rollback transaction effect
      if (col.name === 'transactions') {
        const tx = (state.transactions || []).find(t => t.id === id);
        if (tx && tx.accountId) {
          const acc = (state.financeAccounts || []).find(a => a.id === tx.accountId);
          if (acc) {
            let nb = acc.balance || 0;
            if (tx.type === 'Thu nhập') nb -= tx.amount;
            else if (tx.type === 'Chi tiêu' || tx.type === 'Chuyển tiền') nb += tx.amount;
            await _update('financeAccounts', acc.id, { balance: nb }, 'financeAccounts' as keyof AppState);
          }
        }
      }
      
      await _delete(col.name, id, col.name as keyof AppState);
      // Refresh tasks from server to get accurate cascading changes
      if (col.name === 'projects' || col.name === 'goals') {
        const updatedTasks = await apiCall('/api/data/tasks');
        setState(s => ({ ...s, tasks: updatedTasks }));
      }
    };
  });

  // Special cases
  const markNotificationRead = async (id: string) => _update('notifications', id, { read: true }, 'notifications');
  
  const completeTaskWithLinks = async (id: string) => { await _update('tasks', id, {status: "Hoàn thành"}, 'tasks'); };
  const removeFromCart = async (id: string) => _delete('cart', id, 'cart');
  const addToCart = async (item: any) => _add('cart', item, 'cart');
  
  
  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      await apiCall('/api/auth/profile', 'PUT', data);
      setState(s => ({ ...s, currentUser: { ...s.currentUser, ...data } as User }));
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const clearAllNotifications = async () => {
    try {
      await apiCall('/api/notifications/all', 'DELETE');
      setState(s => ({ ...s, notifications: [] }));
    } catch (e) {
      console.error(e);
    }
  };

  const checkout = async (couponCode?: string) => {
    try {
      const res = await apiCall('/api/cart/checkout', 'POST', { couponCode });
      if (res.success) {
        setState(s => ({ ...s, cart: [] }));
        const updatedOrders = await apiCall('/api/data/orders');
        setState(s => ({ ...s, orders: updatedOrders }));
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const selectDecisionOption = async (decisionId: string, optionId: string) => {
    await _update('decisions', decisionId, { selectedOptionId: optionId, status: 'Decided' }, 'decisions');
  };

  const convertDecisionToExecution = async (decisionId: string) => {
    const dec = (state.decisions || []).find((d: any) => d.id === decisionId);
    if (!dec) return;
    const selOpt = (dec.options || []).find((o: any) => o.id === (dec.selectedOptionId || dec.options[0]?.id));
    const createdTask = await apiCall('/api/data/tasks', 'POST', {
      title: `[Quyết định] ${dec.title} - ${selOpt?.name || 'Thực thi'}`,
      description: `Nội dung thực thi phương án đã chọn: ${selOpt?.name || ''}.\nChi phí: ${selOpt?.cost || 0} ₫`,
      priority: dec.importance === 'Urgent' ? 'Khẩn cấp' : (dec.importance === 'High' ? 'Cao' : 'Trung bình'),
      status: 'Chưa làm',
      dueDate: dec.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      projectId: dec.projectId || null,
      linkedGoalId: dec.goalId || null
    });
    if (createdTask && createdTask.id) {
      setState(s => ({ ...s, tasks: [...s.tasks, createdTask] }));
      await _update('decisions', decisionId, { createdTaskId: createdTask.id, status: 'Decided' }, 'decisions');
    }
  };

  const toggleDecisionRule = async (id: string) => {
    const rule = (state.decisionRules || []).find((r: any) => r.id === id);
    if (rule) {
      await _update('decisionRules', id, { isActive: !rule.isActive }, 'decisionRules');
    }
  };

  const toggleAutomationRule = async (id: string) => {
    const rule = (state.automationRules || []).find((r: any) => r.id === id);
    if (rule) {
      await _update('automationRules', id, { isEnabled: !rule.isEnabled }, 'automationRules');
    }
  };

  const approveAutomationHistory = async (id: string) => {
    await _update('automationHistory', id, {
      approvalStatus: 'Approved',
      status: 'Success',
      result: 'Đã phê duyệt và thi hành tác vụ thành công'
    }, 'automationHistory');
  };

  const rejectAutomationHistory = async (id: string) => {
    await _update('automationHistory', id, {
      approvalStatus: 'Rejected',
      status: 'Blocked',
      result: 'Người dùng đã từ chối thực thi'
    }, 'automationHistory');
  };

  const addAutomationHistoryEntry = async (item: any) => {
    await _add('automationHistory', item, 'automationHistory');
  };

  const fetchSubscriptionStatus = async (): Promise<UserSubscriptionStatus | null> => {
    try {
      const res = await apiCall('/api/payments/subscription');
      if (res && res.success) {
        setState(s => ({ ...s, subscriptionStatus: res }));
        return res;
      }
    } catch (e) {
      console.warn('Failed to fetch subscription status:', e);
    }
    return null;
  };

  const upgradePlan = async (plan: 'Free' | 'Pro' | 'Team' | 'FREE' | 'PRO' | 'TEAM' | string = 'PRO') => {
    // Redirect cleanly to subscription plans view
    setState(s => ({ ...s, currentView: 'subscription' }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        setLanguage: (lang: string) => {
          try { localStorage.setItem('lifeos_lang', lang); } catch (e) {}
          setState(s => ({ ...s, language: lang }));
        },
        setTheme: (newTheme: 'light' | 'dark') => {
          try { localStorage.setItem('lifeos_theme', newTheme); } catch (e) {}
          if (typeof document !== 'undefined') {
            if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          setState(s => ({ ...s, theme: newTheme }));
        },
        toggleMobileMenu: () => {
          setState(s => ({ ...s, isMobileMenuOpen: !s.isMobileMenuOpen }));
        },
        refreshLanguages: async () => {
          try {
            const res = await apiCall('/api/languages');
            if (res && res.success && Array.isArray(res.languages)) {
              setState(s => ({
                ...s,
                activeLanguages: res.languages,
                defaultLanguage: res.defaultLanguage || 'vi'
              }));
            }
          } catch (e) {}
        },
        clearSyncState: () => setState(s => ({ ...s, syncState: "idle", syncMessage: "" })),
        login,
        logout,
        clearWorkspace,
        seedSampleData,
        loadAllData,
        completeOnboarding,
        resetOnboarding,
        setOnboardingPreferences,
        updateProfile,
        upgradePlan,
        fetchSubscriptionStatus,
        checkout,
        clearAllNotifications,
        setCurrentView,
        setWorkspaceMode,
        toggleCommand,
        selectDecisionOption,
        convertDecisionToExecution,
        toggleDecisionRule,
        toggleAutomationRule,
        approveAutomationHistory,
        rejectAutomationHistory,
        addAutomationHistoryEntry,
        ...dynamicMethods,
        
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  
  // Compute goal progress dynamically here so all components get it
  const computedGoals = (context.goals || []).map(g => {
    let calcProgress = g.progress;
    if (g.calcMode === 'task_based') {
      const gTasks = (context.tasks || []).filter(t => t.linkedGoalId === g.id);
      if (gTasks.length > 0) {
        const completed = gTasks.filter(t => t.status === 'Hoàn thành').length;
        calcProgress = Math.round((completed / gTasks.length) * 100);
      } else {
        calcProgress = 0;
      }
    } else if (g.calcMode === 'milestone_based' && g.milestones && g.milestones.length > 0) {
      const total = g.milestones.reduce((acc, m) => acc + (m.progress || 0), 0);
      calcProgress = Math.round(total / g.milestones.length);
    }
    return { ...g, progress: calcProgress };
  });

  return { ...context, goals: computedGoals };
};
