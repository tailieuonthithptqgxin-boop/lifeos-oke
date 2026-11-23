
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Task, Project, Event, Transaction, StudySubject, StudyTopic, StudyAssignment, StudyExam, Habit, HabitRecord, Routine, Goal, GoalMilestone, GoalReview, Note, ViewState, LifeScore, User, Product, CartItem, Order, WorkspaceMode, InboxItem, FocusSession, FocusGoal, DecisionItem, DecisionRule, DecisionReviewData, AutomationRule, AutomationHistoryEntry, AutomationConflictItem, AppNotification, OnboardingPreferences, UserSubscriptionStatus } from './types';
import { apiCall } from './apiClient';
import { offlineSyncQueue } from './offlineSyncQueue';
import { formatLocalDateKey } from './utils';
import { normalizeUserStats, syncAllScreensUI, recordUserActivity, GLOBAL_SYNC_EVENT } from './globalUserSync';
import { unifiedNotificationEngine } from './unifiedNotificationEngine';
import { subscribeUserSocket } from './socketClient';

// Multi-Tab Real-time Synchronization Bus via Web BroadcastChannel API
const tabSyncChannel: BroadcastChannel | null = 
  (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function')
    ? new BroadcastChannel('lifeos_tab_sync_bus')
    : null;

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
  login: (user: User, token?: string, targetView?: AppView) => Promise<void> | void;
  logout: () => void;
  completeOnboarding: (selections?: any) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setCurrentView: (view: ViewState) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleCommand: () => void;
  addNotification: (notification: Partial<AppNotification> & { title: string; message: string }) => void;
  clearAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
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

const VALID_VIEWS = new Set<string>([
  'dashboard', 'tasks', 'calendar', 'finance', 'focus', 'projects', 'study', 'goals', 'notes',
  'habits', 'journey', 'decision', 'decision_engine', 'automation', 'automation_engine',
  'marketplace', 'cart', 'account', 'my_account', 'subscription', 'checkout', 'admin',
  'referral', 'affiliate', 'feedback', 'privacy', 'privacy-policy', 'terms', 'terms-of-service',
  'cookies', 'cookie-policy', 'refund', 'refund-policy',
  'study-space', 'classroom', 'connect', 'feed'
]);

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed !== null && parsed !== undefined) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function decodeJwtPayload(jwtToken: string): any {
  try {
    const parts = jwtToken.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonPayload = new TextDecoder().decode(bytes);
    return JSON.parse(jsonPayload);
  } catch {
    try {
      const parts = jwtToken.split('.');
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}

// Technique 3: SWR (Stale-While-Revalidate) Synchronous Instant Hydration
const getInitialState = (): AppState => {
  if (typeof window === 'undefined') return { ...defaultState, isAppLoaded: true };
  
  let cachedUser: User | null = null;
  let cachedCollections: any = {};
  let cachedSub: UserSubscriptionStatus | null = null;
  let token: string | null = null;
  let isGoogleCallback = false;
  let initialView: ViewState = 'dashboard';

  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    isGoogleCallback = params.get('login') === 'google_success' || Boolean(params.get('code') && params.get('state')) || window.location.pathname.includes('/callback');
    if (urlToken && urlToken.length > 20) {
      try { localStorage.setItem('token', urlToken); } catch (e) {}
      token = urlToken;
    } else {
      token = localStorage.getItem('token');
    }

    const tabParam = params.get('tab') as ViewState;
    const storedView = localStorage.getItem('lifeos_current_view') as ViewState;
    if (tabParam && (VALID_VIEWS.has(tabParam) || tabParam.startsWith('custom_module_'))) {
      initialView = tabParam;
    } else if (isGoogleCallback) {
      initialView = 'study'; // Navigate straight into Study Hall / Space upon Google OAuth
    } else if (storedView && (VALID_VIEWS.has(storedView) || storedView.startsWith('custom_module_'))) {
      initialView = storedView;
    } else {
      initialView = 'dashboard';
    }

    cachedUser = safeJsonParse(localStorage.getItem('lifeos_swr_user'), null);

    // Self-healing: Extract user payload directly from Google OAuth JWT if SWR cache is empty
    if (!cachedUser && token && token.length > 20) {
      const payload = decodeJwtPayload(token);
      if (payload && (payload.userId || payload.email)) {
        cachedUser = {
          id: String(payload.userId || `user_${Date.now()}`),
          email: payload.email || '',
          name: payload.name || payload.email?.split('@')[0] || 'Học Viên',
          avatar: payload.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${payload.userId || 'student'}`,
          role: payload.role || 'USER',
          plan: payload.plan || 'PRO',
          streakDays: 0,
          xp: 0,
          level: 1,
          onboardingCompleted: true,
        };
        try {
          localStorage.setItem('lifeos_swr_user', JSON.stringify(cachedUser));
          localStorage.setItem('lifeos_user', JSON.stringify(cachedUser));
        } catch {}
      }
    }

    cachedCollections = safeJsonParse(localStorage.getItem('lifeos_swr_collections'), {});
    cachedSub = safeJsonParse(localStorage.getItem('lifeos_swr_sub'), null);
  } catch (e) {}

  // Support both Token and Cookie-based SWR sessions:
  // If cachedUser exists OR active token exists OR returning from Google callback, preserve authenticated state immediately
  const hasAuth = Boolean(cachedUser || (token && token.length > 20) || isGoogleCallback);

  const userRole = (cachedUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  // 100% Free-to-use mode: Permanent Full Access for all users
  const effectiveSub: UserSubscriptionStatus = {
    hasAccess: true,
    lifecycleStatus: 'ACTIVE',
    planId: 'FREE_FULL_ACCESS',
    planType: 'PERSONAL',
    planName: 'Trải nghiệm Miễn phí (Full Access)',
    status: 'ACTIVE',
    remainingDays: 99999,
    role: cachedUser?.role,
    isTrial: false,
    isTrialActive: false,
    isTrialExpired: false,
    isGlobalFreeMode: true
  };

  let initialMode: WorkspaceMode = 'Advanced';
  let storedPrefs: OnboardingPreferences | null = null;
  if (cachedUser?.id) {
    const raw = localStorage.getItem(`lifeos_user_onboarding_prefs_${cachedUser.id}`) || localStorage.getItem('lifeos_user_onboarding_prefs_current');
    storedPrefs = safeJsonParse(raw, null);
    if (storedPrefs?.purpose === 'simple') initialMode = 'Simple';
    else if (storedPrefs?.purpose === 'pro') initialMode = 'Power';
    else if (storedPrefs?.domain === 'worker') initialMode = 'Work';
    else if (storedPrefs?.domain === 'student') initialMode = 'Personal';
  }

  return {
    ...defaultState,
    currentView: initialView,
    isAuthenticated: hasAuth,
    currentUser: cachedUser ? normalizeUserStats(cachedUser) : null,
    subscriptionStatus: effectiveSub,
    hasCompletedOnboarding: !!cachedUser?.onboardingCompleted,
    onboardingPreferences: storedPrefs,
    workspaceMode: initialMode,
    isAppLoaded: hasAuth, // If cached auth exists, show workspace immediately (0ms). If guest, wait for initApp.
    ...(typeof cachedCollections === 'object' && cachedCollections ? cachedCollections : {})
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(getInitialState);
  const activeItemMutations = useRef(new Set<string>());

  // Bind global Socket.io client to logged-in user for instant cross-tab & cross-window sync
  useEffect(() => {
    subscribeUserSocket(state.currentUser?.id);
  }, [state.currentUser?.id]);

  useEffect(() => {
    let urlToken: string | null = null;
    let isGoogleLogin = false;
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        urlToken = params.get('token');
        isGoogleLogin = params.get('login') === 'google_success' || Boolean(params.get('code') && params.get('state')) || window.location.pathname.includes('/callback');
        if (urlToken && urlToken.length > 20) {
          try { localStorage.setItem('token', urlToken); } catch (e) {}
        }
      } catch (e) {}
    }
    const token = typeof window !== 'undefined' ? (urlToken || localStorage.getItem('token')) : null;

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

    const initApp = async () => {
      // Always verify user with /api/auth/me (supports Bearer token and HttpOnly cookie sessions)
      try {
        // Safe 8s timeout to guarantee UI never freezes indefinitely on startup
        const authRes = await apiCall('/api/auth/me', 'GET', undefined, 8000).catch(err => {
          return { __isAuthError: true, error: err };
        });

        if (authRes && !authRes.__isAuthError && (authRes.user || authRes.id)) {
          const user = authRes.user || authRes;
          if (authRes.token) {
            try { localStorage.setItem('token', authRes.token); } catch (e) {}
          }
          try {
            localStorage.setItem('lifeos_swr_user', JSON.stringify(user));
          } catch (e) {}

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

          const unifiedUser = normalizeUserStats(user);
          try {
            localStorage.setItem('lifeos_user', JSON.stringify(unifiedUser));
          } catch {}

          setState(s => ({
            ...s,
            isAuthenticated: true,
            currentUser: unifiedUser,
            subscriptionStatus: authRes.subscriptionStatus || s.subscriptionStatus,
            hasCompletedOnboarding: !!user.onboardingCompleted,
            onboardingPreferences: storedPrefs,
            workspaceMode: initialMode,
            isAppLoaded: true
          }));

          // Background revalidation: Load all collections and subscription in background without blocking UI
          loadAllData().catch((loadErr) => {
            console.warn("Background data load completed with non-fatal warnings:", loadErr);
            setState(s => ({ ...s, isAppLoaded: true }));
          });
          fetchSubscriptionStatus().catch(() => {});
        } else {
          // Check if server explicitly confirmed session is expired, invalid or no token
          const authErr = authRes?.error;
          const status = authErr?.status;
          const errorCode = authErr?.data?.error?.code || authErr?.code;
          const isExplicitUnauthorized = status === 401 || status === 403 ||
            errorCode === 'NO_TOKEN' || errorCode === 'TOKEN_EXPIRED' ||
            errorCode === 'SESSION_REVOKED' || errorCode === 'USER_NOT_FOUND' ||
            errorCode === 'INVALID_TOKEN' || errorCode === 'UNAUTHORIZED';

          if (isExplicitUnauthorized) {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('lifeos_swr_user');
              localStorage.removeItem('lifeos_swr_collections');
              localStorage.removeItem('lifeos_swr_sub');
            } catch (e) {}
            setState(s => ({ ...s, isAuthenticated: false, currentUser: null, isAppLoaded: true }));
          } else {
            // Transient offline / network failure: keep cached user if present, release loading state
            setState(s => ({ ...s, isAppLoaded: true }));
          }
        }
      } catch (err: any) {
        console.warn('initApp transient network check warning:', err?.message || err);
        // Guarantee loading state is released
        setState(s => ({
          ...s,
          isAppLoaded: true
        }));
      }
    };

    // Prevent double-/api/auth/me race condition while Google OAuth callback is actively hydrating in App.tsx
    if (!isGoogleLogin) {
      initApp();
    }
    loadLanguages();

    const handleSessionExpired = () => {
      // Check if user is in an active learning session: never kick out mid-study!
      const isStudying = Boolean(
        localStorage.getItem('lifeos_vocab_session_state') ||
        localStorage.getItem('lifeos_pomodoro_active_session') ||
        sessionStorage.getItem('lifeos_active_study')
      );
      if (isStudying) {
        console.warn('[Store] Suppressed session expiry kickout because user is actively studying.');
        return;
      }
      try { localStorage.removeItem('token'); } catch (e) {}
      setState(s => ({
        ...s,
        isAuthenticated: false,
        currentUser: null,
        isAppLoaded: true
      }));
    };

    window.addEventListener('lifeos:session-expired', handleSessionExpired);

    // Auto-refresh current user plan/role on window focus or safe background interval
    const refreshUserSilent = async () => {
      // Free-Tier 10k Scale Guard: Do not poll when tab is hidden or device is offline
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const res = await apiCall('/api/auth/me', 'GET', undefined, { silent: true });
        if (res && (res.user || res.id)) {
          const u = res.user || res;
          const sub = res.subscriptionStatus;
          setState(s => {
            if (!s.currentUser) return s;
            const planChanged = s.currentUser.plan !== u.plan || s.currentUser.planExpiresAt !== u.planExpiresAt || s.currentUser.role !== u.role;
            const subChanged = sub && JSON.stringify(sub) !== JSON.stringify(s.subscriptionStatus);
            if (planChanged || subChanged) {
              const isNewlyUpgraded = (s.currentUser.plan === 'FREE' || !s.currentUser.plan) && (u.plan !== 'FREE');
              if (isNewlyUpgraded) {
                setTimeout(() => {
                  setState(prev => ({ ...prev, syncState: 'idle', syncMessage: '' }));
                }, 6000);
              }
              return {
                ...s,
                currentUser: { ...s.currentUser, ...u },
                ...(sub ? { subscriptionStatus: sub } : {}),
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
    // OPT-001: Polling at 5-minute interval (with document.hidden guard & window focus event) prevents server overload on Free Tier
    const intervalId = setInterval(refreshUserSilent, 300000);

    const handleGlobalUserSync = (e: any) => {
      if (e?.detail) {
        setState(s => ({
          ...s,
          currentUser: { ...(s.currentUser || {}), ...e.detail }
        }));
      }
    };
    window.addEventListener(GLOBAL_SYNC_EVENT, handleGlobalUserSync);

    const handleTabSyncMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LIFEOS_MUTATION_SYNC') {
        loadAllData();
      } else if (event.data?.type === 'LIFEOS_USER_SYNC' && event.data?.payload) {
        setState(s => ({
          ...s,
          currentUser: { ...(s.currentUser || {}), ...event.data.payload }
        }));
      }
    };
    if (tabSyncChannel) {
      tabSyncChannel.addEventListener('message', handleTabSyncMessage);
    }

    const handleOnline = async () => {
      console.log('🌐 [Network] App back online! Replaying queued offline mutations...');
      await offlineSyncQueue.replayAll(async (mutation) => {
        try {
          if (mutation.type === 'TASK') {
            await apiCall('/api/tasks', 'POST', mutation.payload);
          } else if (mutation.type === 'TRANSACTION') {
            await apiCall('/api/transactions', 'POST', mutation.payload);
          } else if (mutation.type === 'HABIT') {
            await apiCall('/api/habits', 'POST', mutation.payload);
          }
          return true;
        } catch {
          return false;
        }
      });
      loadAllData();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('lifeos:session-expired', handleSessionExpired);
      window.removeEventListener('focus', refreshUserSilent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(GLOBAL_SYNC_EVENT, handleGlobalUserSync);
      if (tabSyncChannel) {
        tabSyncChannel.removeEventListener('message', handleTabSyncMessage);
      }
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
      
      // Technique 2 & 5: High-speed single batch HTTP request with server-side parallel execution
      const batchRes = await apiCall('/api/data-batch', 'POST', { collections });
      
      let newState: Partial<AppState> = {};
      if (batchRes && batchRes.success && batchRes.data) {
        const data = batchRes.data;
        collections.forEach(col => {
          (newState as any)[col] = Array.isArray(data[col]) ? data[col] : [];
        });

        const settings = data.settings;
        setState(s => ({
          ...s,
          ...newState,
          ...(settings && settings.id && s.currentUser ? { currentUser: { ...s.currentUser, ...settings } } : {}),
          isAppLoaded: true
        }));

        // Technique 3: SWR cache storage (keep up to 100 recent items per collection to ensure < 2MB footprint)
        try {
          const swrCache: any = {};
          collections.forEach(col => {
            if (Array.isArray(data[col])) {
              swrCache[col] = data[col].slice(0, 100);
            }
          });
          localStorage.setItem('lifeos_swr_collections', JSON.stringify(swrCache));
        } catch (e) {}
        return;
      }

      // Fallback: Concurrent Promise.allSettled across individual collections if batch is unavailable
      const promises = collections.map(col => apiCall(`/api/data/${col}`));
      promises.push(apiCall('/api/settings'));
      
      const results = await Promise.allSettled(promises);
      const settingsResult = results.pop();
      const settings = settingsResult?.status === 'fulfilled' ? settingsResult.value : {};

      // Set user collections from settled results
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

  const login = async (user: User, token?: string, targetView?: AppView) => {
    const unifiedUser = normalizeUserStats(user);
    try {
      if (token && token.length > 10) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('lifeos_swr_user', JSON.stringify(unifiedUser));
      localStorage.setItem('lifeos_user', JSON.stringify(unifiedUser));
    } catch (e) {}

    const userRole = (unifiedUser.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    // 100% Free-to-use mode: Permanent Full Access for all users
    const initialSub: UserSubscriptionStatus = {
      hasAccess: true,
      lifecycleStatus: 'ACTIVE',
      planId: 'FREE_FULL_ACCESS',
      planType: 'PERSONAL',
      planName: 'Trải nghiệm Miễn phí (Full Access)',
      status: 'ACTIVE',
      remainingDays: 99999,
      role: unifiedUser.role,
      isTrial: false,
      isTrialActive: false,
      isTrialExpired: false,
      isGlobalFreeMode: true
    };

    if (initialSub) {
      try {
        localStorage.setItem('lifeos_swr_sub', JSON.stringify(initialSub));
      } catch (e) {}
    }

    // Authenticate user immediately and transition UI directly to study hall / target view
    const destinationView = targetView || (isGoogleCallback ? 'study' : 'study');
    try {
      localStorage.setItem('lifeos_current_view', destinationView);
    } catch (e) {}

    // Authenticate user immediately and transition UI without delay
    setState(s => ({
      ...defaultState,
      isAuthenticated: true,
      currentUser: unifiedUser,
      currentView: destinationView,
      subscriptionStatus: initialSub || s.subscriptionStatus,
      hasCompletedOnboarding: true,
      theme: s.theme,
      language: s.language,
      isAppLoaded: true
    }));
    // Background populate collections and fetch fresh subscription entitlement
    Promise.allSettled([
      loadAllData(),
      fetchSubscriptionStatus()
    ]).catch(err => {
      console.warn("Background login revalidation warning:", err);
    });

    // Real Security Event Notification: Successful Login
    try {
      unifiedNotificationEngine.notifyAuthSecurity('LOGIN_SUCCESS', unifiedUser.email, unifiedUser.name).catch(() => {});
    } catch (e) {}
  };

  const logout = () => {
    apiCall('/api/auth/logout', 'POST').catch(console.error);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('lifeos_swr_user');
      localStorage.removeItem('lifeos_current_view');
      localStorage.removeItem('lifeos_swr_collections');
      localStorage.removeItem('lifeos_swr_sub');
      sessionStorage.clear();
      window.history.replaceState(null, '', '/');
    } catch (e) {}
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

  const setCurrentView = (view: ViewState) => {
    try {
      localStorage.setItem('lifeos_current_view', view);
    } catch {}
    setState(s => ({ ...s, currentView: view, isMobileMenuOpen: false }));
    try {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', view);
        window.history.replaceState({ tab: view }, '', url.toString());
      }
    } catch {}
  };
  const setWorkspaceMode = (mode: WorkspaceMode) => setState(s => ({ ...s, workspaceMode: mode }));
  const toggleCommand = () => setState(s => ({ ...s, isCommandOpen: !s.isCommandOpen }));
  
  const withSync = async (actionFn: () => Promise<void>, successMsg: string) => {
    setState(s => ({ ...s, syncState: 'syncing', syncMessage: 'Đang xử lý...' }));
    try {
      await actionFn();
      if (tabSyncChannel) {
        try {
          tabSyncChannel.postMessage({ type: 'LIFEOS_MUTATION_SYNC', timestamp: Date.now() });
        } catch {}
      }
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
    // Sanitize item & guard against whitespace-only mutations (Scenario 3)
    if (item && typeof item === 'object') {
      if ('title' in item && typeof item.title === 'string' && !item.title.trim()) {
        throw new Error('Tiêu đề không được để trống hoặc chỉ chứa dấu cách.');
      }
      if ('name' in item && typeof item.name === 'string' && !item.name.trim()) {
        throw new Error('Tên không được để trống hoặc chỉ chứa dấu cách.');
      }
    }

    const tempId = item.id || `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempItem = { ...item, id: tempId };
    
    // Instant optimistic update
    setState(s => ({ ...s, [stateKey]: [...(s[stateKey] as any[]), tempItem] }));

    let resultItem = tempItem;
    try {
      await withSync(async () => {
        const created = await apiCall(`/api/data/${collection}`, 'POST', item);
        if (created && created.id) {
          resultItem = created;
          setState(s => ({
            ...s,
            [stateKey]: (s[stateKey] as any[]).map((i: any) => i.id === tempId ? created : i)
          }));
        }
      }, 'Thêm thành công');
      return resultItem;
    } catch (err) {
      // Automatic optimistic rollback on server failure / network chaos (Scenario 2)
      setState(s => ({
        ...s,
        [stateKey]: (s[stateKey] as any[]).filter((i: any) => i.id !== tempId)
      }));
      throw err;
    }
  };
  
  const _update = async (collection: string, id: string, updates: any, stateKey: keyof AppState) => {
    if (!id || id === 'undefined' || id === 'null' || typeof id !== 'string' || !id.trim()) {
      console.warn(`[LifeOS Store] Prevented invalid _update on '${collection}': id is invalid (${id})`);
      return;
    }

    // In-flight mutation locking against spam clicks & race conditions (Scenario 1)
    const mutationLockKey = `update:${collection}:${id}`;
    if (activeItemMutations.current.has(mutationLockKey)) {
      return;
    }
    activeItemMutations.current.add(mutationLockKey);

    let previousItem: any = null;
    setState(s => {
      previousItem = (s[stateKey] as any[]).find((item: any) => item.id === id);
      return {
        ...s,
        [stateKey]: (s[stateKey] as any[]).map((item: any) => item.id === id ? { ...item, ...updates } : item)
      };
    });

    try {
      await withSync(async () => {
        await apiCall(`/api/data/${collection}/${id}`, 'PUT', updates);
      }, 'Cập nhật thành công');
    } catch (err) {
      // Automatic rollback to exact previous state on failure (Scenario 2)
      if (previousItem) {
        setState(s => ({
          ...s,
          [stateKey]: (s[stateKey] as any[]).map((item: any) => item.id === id ? previousItem : item)
        }));
      }
      throw err;
    } finally {
      activeItemMutations.current.delete(mutationLockKey);
    }
  };
  
  const _delete = async (collection: string, id: string, stateKey: keyof AppState) => {
    if (!id || id === 'undefined' || id === 'null' || typeof id !== 'string' || !id.trim()) {
      console.warn(`[LifeOS Store] Prevented invalid _delete on '${collection}': id is invalid (${id})`);
      return;
    }

    // In-flight mutation locking against double-delete spam (Scenario 1)
    const mutationLockKey = `delete:${collection}:${id}`;
    if (activeItemMutations.current.has(mutationLockKey)) {
      return;
    }
    activeItemMutations.current.add(mutationLockKey);

    let previousItem: any = null;
    setState(s => {
      previousItem = (s[stateKey] as any[]).find((item: any) => item.id === id);
      return {
        ...s,
        [stateKey]: (s[stateKey] as any[]).filter((item: any) => item.id !== id)
      };
    });

    try {
      await withSync(async () => {
        await apiCall(`/api/data/${collection}/${id}`, 'DELETE');
      }, 'Xóa thành công');
    } catch (err) {
      // Automatic rollback to restore deleted item if server rejected (Scenario 2)
      if (previousItem) {
        setState(s => ({
          ...s,
          [stateKey]: [...(s[stateKey] as any[]), previousItem]
        }));
      }
      throw err;
    } finally {
      activeItemMutations.current.delete(mutationLockKey);
    }
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
      const res = await _add(col.name, item, col.name as keyof AppState);
      // Synchronize finance accounts and budgets across all consumers
      if (col.name === 'transactions') {
        try {
          const [freshAccounts, freshBudgets] = await Promise.all([
            apiCall('/api/data/financeAccounts'),
            apiCall('/api/data/budgets')
          ]);
          setState(s => ({
            ...s,
            ...(Array.isArray(freshAccounts) ? { financeAccounts: freshAccounts } : {}),
            ...(Array.isArray(freshBudgets) ? { budgets: freshBudgets } : {})
          }));
        } catch (syncErr) {
          console.warn('Syncing finance accounts after transaction add:', syncErr);
        }
      }

      // Luồng 1 [Lịch Thời Gian Biểu & Deadline]: Tự động gửi thông báo khi thêm lịch/nhiệm vụ
      if (col.name === 'tasks' && item) {
        unifiedNotificationEngine.dispatch({
          category: 'GENERAL',
          title: `Nhiệm vụ mới: ${item.title || 'Nhiệm vụ'} 📌`,
          message: item.dueDate
            ? `Hạn chót: ${item.dueDate} ${item.dueTime || ''}. Hệ thống sẽ tự động quét và nhắc trước 2h, 1h và 30m.`
            : 'Nhiệm vụ mới đã được lưu thành công.',
          link: '/?tab=tasks',
          suppressEmail: true,
          playAudio: false
        }).catch(() => {});
      } else if (col.name === 'events' && item) {
        unifiedNotificationEngine.dispatch({
          category: 'SCHEDULE_2H',
          title: `Lịch mới: ${item.title || 'Lịch hẹn'} 📅`,
          message: `Đã xếp lịch lúc ${item.startTime || ''} ${item.date || ''}. Trợ lý sẽ tự động báo trước 2h, 1h và 30m.`,
          link: '/?tab=calendar',
          suppressEmail: true,
          playAudio: false
        }).catch(() => {});
      }
      return res;
    };

    dynamicMethods[`update${col.singular}`] = async (id: string, updates: any) => {
      const res = await _update(col.name, id, updates, col.name as keyof AppState);
      // Synchronize finance accounts and budgets after transaction modification
      if (col.name === 'transactions') {
        try {
          const [freshAccounts, freshBudgets] = await Promise.all([
            apiCall('/api/data/financeAccounts'),
            apiCall('/api/data/budgets')
          ]);
          setState(s => ({
            ...s,
            ...(Array.isArray(freshAccounts) ? { financeAccounts: freshAccounts } : {}),
            ...(Array.isArray(freshBudgets) ? { budgets: freshBudgets } : {})
          }));
        } catch (syncErr) {
          console.warn('Syncing finance accounts after transaction update:', syncErr);
        }
      }

      // Luồng 1 [Lịch Thời Gian Biểu & Deadline]: Tự động gửi thông báo khi cập nhật
      if (col.name === 'tasks' && updates) {
        if (updates.status === 'Hoàn thành' || updates.status === 'Done' || updates.status === 'Completed') {
          recordUserActivity('task', 0);
          unifiedNotificationEngine.dispatch({
            category: 'GENERAL',
            title: `Hoàn thành nhiệm vụ: ${updates.title || 'Nhiệm vụ'} 🎉`,
            message: 'Chúc mừng bạn đã hoàn thành thêm một mục tiêu trong danh sách!',
            link: '/?tab=tasks',
            suppressEmail: true,
            playAudio: true
          }).catch(() => {});
        }
      } else if (col.name === 'events' && updates) {
        unifiedNotificationEngine.dispatch({
          category: 'SCHEDULE_1H',
          title: `Cập nhật lịch: ${updates.title || 'Lịch hẹn'} 📅`,
          message: 'Thời gian biểu đã được cập nhật thành công.',
          link: '/?tab=calendar',
          suppressEmail: true,
          playAudio: false
        }).catch(() => {});
      }
      return res;
    };

    dynamicMethods[`delete${col.singular}`] = async (id: string) => {
      await _delete(col.name, id, col.name as keyof AppState);
      // Synchronize finance accounts and budgets after transaction removal
      if (col.name === 'transactions') {
        try {
          const [freshAccounts, freshBudgets] = await Promise.all([
            apiCall('/api/data/financeAccounts'),
            apiCall('/api/data/budgets')
          ]);
          setState(s => ({
            ...s,
            ...(Array.isArray(freshAccounts) ? { financeAccounts: freshAccounts } : {}),
            ...(Array.isArray(freshBudgets) ? { budgets: freshBudgets } : {})
          }));
        } catch (syncErr) {
          console.warn('Syncing finance accounts after transaction delete:', syncErr);
        }
      }
      // Refresh tasks from server to get accurate cascading changes
      if (col.name === 'projects' || col.name === 'goals') {
        const updatedTasks = await apiCall('/api/data/tasks');
        setState(s => ({ ...s, tasks: updatedTasks }));
      }
    };
  });

  // Special cases
  const markNotificationRead = async (id: string) => {
    try {
      await apiCall(`/api/notifications/${id}/read`, 'PUT');
      setState(s => ({
        ...s,
        notifications: (s.notifications || []).map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      }));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };
  
  const completeTaskWithLinks = async (id: string) => { 
    await _update('tasks', id, {status: "Hoàn thành"}, 'tasks'); 
    recordUserActivity('task', 0);
  };
  const toggleHabit = async (id: string) => {
    const todayStr = formatLocalDateKey(new Date());
    let previousHabits: Habit[] = [];
    let previousRecords: HabitRecord[] = [];

    // Instant optimistic update across all views (0ms response)
    setState(s => {
      previousHabits = s.habits || [];
      previousRecords = s.habitRecords || [];
      const habit = (s.habits || []).find(h => h.id === id);
      if (!habit) return s;

      const isCompleted = habit.completedDates?.includes(todayStr) ||
        (s.habitRecords || []).some(r => r.habitId === id && r.date === todayStr && r.status === 'Completed');

      if (!isCompleted) {
        recordUserActivity('habit', 0);
      }

      const nextDates = isCompleted
        ? (habit.completedDates || []).filter(d => d !== todayStr)
        : [...(habit.completedDates || []), todayStr];

      const nextStreak = isCompleted ? Math.max(0, (habit.streak ?? 0) - 1) : (habit.streak ?? 0) + 1;

      const updatedHabits = (s.habits || []).map(h => 
        h.id === id ? { ...h, completedDates: nextDates, streak: nextStreak } : h
      );

      const updatedRecords = (s.habitRecords || []).filter(r => !(r.habitId === id && r.date === todayStr));
      if (!isCompleted) {
        updatedRecords.push({
          id: `hr_${Date.now()}_${id}`,
          habitId: id,
          date: todayStr,
          status: 'Completed',
          actualValue: habit.target || 1
        });
      }

      return {
        ...s,
        habits: updatedHabits,
        habitRecords: updatedRecords
      };
    });

    try {
      const res = await apiCall(`/api/habits/${id}/toggle`, 'POST');
      if (res && res.habit) {
        setState(s => ({
          ...s,
          habits: (s.habits || []).map(h => h.id === id ? { ...h, ...res.habit } : h)
        }));
      }
      if (tabSyncChannel) {
        try {
          tabSyncChannel.postMessage({ type: 'LIFEOS_MUTATION_SYNC', timestamp: Date.now() });
        } catch {}
      }
    } catch (e) {
      console.error('Failed to toggle habit:', e);
      // Rollback on network failure
      setState(s => ({
        ...s,
        habits: previousHabits,
        habitRecords: previousRecords
      }));
    }
  };
  const removeFromCart = async (id: string) => _delete('cart', id, 'cart');
  const addToCart = async (item: any) => _add('cart', item, 'cart');
  
  
  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      await apiCall('/api/auth/profile', 'PUT', data);
      setState(s => ({ ...s, currentUser: { ...s.currentUser, ...data } as User }));
      try {
        unifiedNotificationEngine.notifyAuthSecurity(
          'PROFILE_UPDATED',
          state.currentUser?.email,
          data.name || state.currentUser?.name
        ).catch(() => {});
      } catch (e) {}
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const addNotification = (item: Partial<AppNotification> & { title: string; message: string }) => {
    const newNotif: AppNotification = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: state.currentUser?.id || 'anonymous',
      title: item.title,
      message: item.message,
      content: item.message,
      type: item.type || 'info',
      category: item.category || 'GENERAL',
      link: item.link || item.actionUrl,
      actionUrl: item.actionUrl || item.link,
      actionLabel: item.actionLabel,
      read: false,
      readAt: null,
      metadata: item.metadata,
      createdAt: item.createdAt || new Date().toISOString()
    };
    setState(s => ({
      ...s,
      notifications: [newNotif, ...(s.notifications || [])]
    }));
  };

  const clearAllNotifications = async () => {
    try {
      await apiCall('/api/notifications/read-all', 'PUT');
      setState(s => ({
        ...s,
        notifications: (s.notifications || []).map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiCall(`/api/notifications/${id}`, 'DELETE');
      setState(s => ({
        ...s,
        notifications: (s.notifications || []).filter(n => n.id !== id)
      }));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await apiCall('/api/notifications/all', 'DELETE');
      setState(s => ({
        ...s,
        notifications: []
      }));
    } catch (e) {
      console.error('Failed to delete all notifications:', e);
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
        try {
          localStorage.setItem('lifeos_swr_sub', JSON.stringify(res));
        } catch (e) {}
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

  // Compute goal progress dynamically once per state change, not on every component invocation
  const computedGoals = React.useMemo(() => {
    const isTaskDone = (status?: string | null) => {
      if (!status) return false;
      const s = status.toLowerCase();
      return s === 'hoàn thành' || s === 'hoan thanh' || s === 'completed' || s === 'done' || s === 'đã xong';
    };

    return (state.goals || []).map(g => {
      let calcProgress = g.progress;
      if (g.calcMode === 'task_based') {
        const gTasks = (state.tasks || []).filter(t => t.linkedGoalId === g.id);
        if (gTasks.length > 0) {
          const completed = gTasks.filter(t => isTaskDone(t.status)).length;
          calcProgress = Math.round((completed / gTasks.length) * 100);
        } else {
          calcProgress = 0;
        }
      } else if (g.calcMode === 'milestone_based' && g.milestones && g.milestones.length > 0) {
        const total = g.milestones.reduce((acc, m) => acc + (m.progress || 0), 0);
        calcProgress = Math.round(total / g.milestones.length);
      }
      return { ...g, progress: Math.min(100, Math.max(0, calcProgress || 0)) };
    });
  }, [state.goals, state.tasks]);

  const contextValue = React.useMemo(() => ({
    ...state,
    goals: computedGoals,
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
    loadAllData,
    completeOnboarding,
    resetOnboarding,
    setOnboardingPreferences,
    updateProfile,
    upgradePlan,
    fetchSubscriptionStatus,
    checkout,
    addNotification,
    clearAllNotifications,
    deleteNotification,
    deleteAllNotifications,
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
    toggleHabit,
    ...dynamicMethods,
  }), [state, computedGoals]);

  _latestAppContextValue = contextValue;

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

let _latestAppContextValue: any = null;

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

// Global non-React accessor for schedulers, workers and background services
(useAppStore as any).getState = () => {
  return _latestAppContextValue || {};
};
