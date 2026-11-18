/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './lib/store';
import { apiCall } from './lib/apiClient';
import { useTranslation, translations, t as translateI18n } from './lib/i18n';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';

// Lazy-load Core Views & 3D Rig for ultra-fast initial bundle (<200KB gzipped)
const DashboardView = lazyWithRetry(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })), 'DashboardView');
const TasksView = lazyWithRetry(() => import('./components/TasksView').then(m => ({ default: m.TasksView })), 'TasksView');
const ScheduleAndTasksView = lazyWithRetry(() => import('./components/ScheduleAndTasksView').then(m => ({ default: m.ScheduleAndTasksView })), 'ScheduleAndTasksView');
import { CommandCenter } from './components/CommandCenter';
import { OnboardingView } from './components/OnboardingView';
import { PublicLandingView } from './components/PublicLandingView';
import { LoginView } from './components/LoginView';
import { AccountStatusBanner } from './components/AccountStatusBanner';
import { LockedWorkspaceOverlay } from './components/LockedWorkspaceOverlay';
import { GlobalFocusMusicPlayer } from './components/GlobalFocusMusicPlayer';
import { ScratchpadWidget } from './components/ScratchpadWidget';
import { GlobalChatWidget } from './components/chat/GlobalChatWidget';
import { PwaPromptBanner } from './components/PwaPromptBanner';
import { verifyPostUpdate } from './lib/pwa';
import { PageSkeleton } from './components/Skeleton';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './lib/toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SeoHead } from './components/common/SeoHead';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { captureReferralFromUrl } from './lib/referralTracker';
import { analyticsTracker } from './lib/analyticsTracker';
import { scheduleReminderScheduler } from './lib/scheduleReminderScheduler';
import { clientCronEngine } from './lib/cronEngine';
import { IN_APP_NOTIFICATION_EVENT } from './lib/unifiedNotificationEngine';
import { Zap } from 'lucide-react';

// Lazy-load heavier / secondary views with auto-retry on network/dev hiccups
const CalendarView = lazyWithRetry(() => import('./components/CalendarView'), 'CalendarView');
const FinanceView = lazyWithRetry(() => import('./components/FinanceView'), 'FinanceView');
const FocusView = lazyWithRetry(() => import('./components/FocusView'), 'FocusView');
const ProjectsView = lazyWithRetry(() => import('./components/ProjectsView'), 'ProjectsView');
const GoalsView = lazyWithRetry(() => import('./components/GoalsView'), 'GoalsView');
const NotesView = lazyWithRetry(() => import('./components/NotesView'), 'NotesView');
const StudyView = lazyWithRetry(() => import('./components/StudyView'), 'StudyView');
const HabitsView = lazyWithRetry(() => import('./components/HabitsView'), 'HabitsView');
const MyAccountView = lazyWithRetry(() => import('./components/MyAccountView'), 'MyAccountView');
const MarketplaceView = lazyWithRetry(() => import('./components/MarketplaceView'), 'MarketplaceView');
const CartView = lazyWithRetry(() => import('./components/CartView'), 'CartView');
const CheckoutView = lazyWithRetry(() => import('./components/CheckoutView'), 'CheckoutView');
const AdminView = lazyWithRetry(() => import('./components/AdminView'), 'AdminView');
const DecisionEngineView = lazyWithRetry(() => import('./components/DecisionEngineView'), 'DecisionEngineView');
const AutomationEngineView = lazyWithRetry(() => import('./components/AutomationEngineView'), 'AutomationEngineView');
const SubscriptionManagementView = lazyWithRetry(() => import('./components/SubscriptionManagementView'), 'SubscriptionManagementView');
const ReferralView = lazyWithRetry(() => import('./components/ReferralView'), 'ReferralView');
const FeedbackView = lazyWithRetry(() => import('./components/FeedbackView'), 'FeedbackView');
const DynamicModuleView = lazyWithRetry(() => import('./components/DynamicModuleView'), 'DynamicModuleView');
const JourneyView = lazyWithRetry(() => import('./components/JourneyView'), 'JourneyView');
const PrivacyPolicyView = lazyWithRetry(() => import('./components/legal/PrivacyPolicyView').then(m => ({ default: m.PrivacyPolicyView })), 'PrivacyPolicyView');
const TermsOfServiceView = lazyWithRetry(() => import('./components/legal/TermsOfServiceView').then(m => ({ default: m.TermsOfServiceView })), 'TermsOfServiceView');
const CookiePolicyView = lazyWithRetry(() => import('./components/legal/CookiePolicyView').then(m => ({ default: m.CookiePolicyView })), 'CookiePolicyView');
const RefundPolicyView = lazyWithRetry(() => import('./components/legal/RefundPolicyView').then(m => ({ default: m.RefundPolicyView })), 'RefundPolicyView');
const CyberCozyIslandSpace = lazyWithRetry(() => import('./components/spatial/CyberCozyIslandSpace'), 'CyberCozyIslandSpace');
const Spatial3DUniverseView = lazyWithRetry(() => import('./components/spatial/Spatial3DUniverseView'), 'Spatial3DUniverseView');
const StudySpaceView = lazyWithRetry(() => import('./components/study/StudySpaceView').then(m => ({ default: m.StudySpaceView })), 'StudySpaceView');
const LifeOsConnectView = lazyWithRetry(() => import('./components/connect/LifeOsConnectView').then(m => ({ default: m.LifeOsConnectView })), 'LifeOsConnectView');
const OnlineClassroomView = lazyWithRetry(() => import('./components/classroom/OnlineClassroomView').then(m => ({ default: m.OnlineClassroomView })), 'OnlineClassroomView');
const CommunityFeedView = lazyWithRetry(() => import('./components/feed/CommunityFeedView').then(m => ({ default: m.CommunityFeedView })), 'CommunityFeedView');
const SpatialBackgroundRig = lazyWithRetry(() => import('./components/spatial/SpatialBackgroundRig').then(m => ({ default: m.SpatialBackgroundRig })), 'SpatialBackgroundRig');
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { StickyTopBanner } from './components/common/StickyTopBanner';
import { LoginAnnouncementModal } from './components/notifications/LoginAnnouncementModal';
import { DevicePreviewDock, DeviceMode } from './components/common/DevicePreviewDock';



function SyncIndicator() {
  const { syncState, syncMessage, clearSyncState } = useAppStore();
  
  if (syncState === 'idle') return null;
  
  const isError = syncState === 'error';
  const isSuccess = syncState === 'success';
  const isSyncing = syncState === 'syncing';
  
  let bgColor = 'bg-blue-600';
  if (isError) bgColor = 'bg-red-600';
  if (isSuccess) bgColor = 'bg-green-600';

  return (
    <div 
      id="sync-indicator"
      role={isError ? "alert" : "status"}
      aria-live="assertive"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3.5 sm:bottom-4 sm:right-4 z-40 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white font-medium text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto" 
      style={{ backgroundColor: isError ? '#dc2626' : isSuccess ? '#16a34a' : '#2563eb' }}
    >
      {isSyncing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
      {isSuccess && <span>✓</span>}
      {isError && <span>⚠</span>}
      <span>{syncMessage}</span>
      {(isError || isSuccess) && (
        <button type="button" onClick={clearSyncState} aria-label="Đóng thông báo" className="ml-2 opacity-70 hover:opacity-100 cursor-pointer">✕</button>
      )}
    </div>
  );
}

function AppContent() {
  const {
    isAppLoaded,
    currentView,
    setCurrentView,
    hasCompletedOnboarding,
    isAuthenticated,
    currentUser,
    login,
    logout,
    language,
    theme,
    subscriptionStatus,
    toggleCommand,
    addNotification,
    events,
    tasks
  } = useAppStore();

  // Active 3-Golden-Milestones precision scheduler (2h, 1h, 30m) & Cross-system Event Listener
  React.useEffect(() => {
    if (!isAuthenticated) return;

    // Start 30-second sweep loop evaluating events and tasks
    scheduleReminderScheduler.start(() => ({
      events: (useAppStore as any).getState?.()?.events || events || [],
      tasks: (useAppStore as any).getState?.()?.tasks || tasks || []
    }));

    // Start 24/7 Hybrid Client & Cloudflare Cron Engine
    clientCronEngine.start();

    // Listen for unified in-app notification events
    const handleInAppNotification = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      if (customEvt.detail) {
        addNotification({
          id: customEvt.detail.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: customEvt.detail.title || 'Thông báo mới',
          message: customEvt.detail.message || '',
          content: customEvt.detail.message || '',
          type: customEvt.detail.type || 'info',
          category: customEvt.detail.category || 'GENERAL',
          link: customEvt.detail.link,
          actionUrl: customEvt.detail.link,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    };
    window.addEventListener(IN_APP_NOTIFICATION_EVENT, handleInAppNotification);

    return () => {
      scheduleReminderScheduler.stop();
      window.removeEventListener(IN_APP_NOTIFICATION_EVENT, handleInAppNotification);
    };
  }, [isAuthenticated, addNotification]);

  React.useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  React.useEffect(() => {
    // 30-day Affiliate Referral Tracking from ?ref=...
    captureReferralFromUrl();
  }, []);

  React.useEffect(() => {
    if (
      (currentView as string) === 'notifications' ||
      (currentView as string) === 'notification_settings' ||
      (currentView as string) === 'decision' ||
      (currentView as string) === 'decision_engine'
    ) {
      setCurrentView('dashboard');
    }
  }, [currentView, setCurrentView]);

  const t = useTranslation(language);

  // Synchronize document language attribute without intrusive DOM mutations
  React.useEffect(() => {
    document.documentElement.lang = language || 'vi';
  }, [language]);

  const mainRef = React.useRef<HTMLElement>(null);
  const prevViewRef = React.useRef<string>(currentView);
  React.useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      if (mainRef.current) {
        mainRef.current.scrollLeft = 0;
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
    // Track feature view in lightweight batch buffer
    analyticsTracker.trackFeatureView(currentView);
  }, [currentView]);

  const [isGoogleProcessing, setIsGoogleProcessing] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('login') === 'google_success';
    }
    return false;
  });

  const [publicView, setPublicView] = useState<'home' | 'login' | 'privacy' | 'terms' | 'cookies' | 'refund'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/privacy-policy' || pathname.includes('privacy')) return 'privacy';
      if (pathname === '/terms-of-service' || pathname.includes('terms')) return 'terms';
      if (pathname === '/cookie-policy' || pathname.includes('cookie')) return 'cookies';
      if (pathname === '/refund-policy' || pathname.includes('refund')) return 'refund';

      const params = new URLSearchParams(window.location.search);
      const loginParam = params.get('login');
      const isLoginErrorOrPrompt = loginParam && loginParam !== 'google_success';
      const hasResetToken = Boolean(params.get('resetToken'));
      if (
        hasResetToken ||
        isLoginErrorOrPrompt ||
        params.get('view') === 'login' ||
        params.get('mode') === 'login' ||
        params.get('mode') === 'register' ||
        params.get('auth') ||
        pathname.includes('/login') ||
        pathname.includes('/register')
      ) {
        return 'login';
      }
    }
    return 'home';
  });

  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') return 'register';
    }
    return 'login';
  });

  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Handle Google OAuth query feedback
  React.useEffect(() => {
    // Post-reload verification: check if pending update succeeded
    const verification = verifyPostUpdate();
    if (verification.isSuccess) {
      toast.show(
        `Ứng dụng LifeOS đã cập nhật lên phiên bản v${verification.updatedVersion} thành công!`,
        'success',
        'Cập nhật thành công',
        5000
      );
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const loginStatus = params.get('login');
      const token = params.get('token');
      if (token && token.length > 20) {
        try { localStorage.setItem('token', token); } catch (e) {}
      }
      if (loginStatus === 'google_success') {
        setIsGoogleProcessing(true);
        // Immediately fetch user profile and transition UI state to authenticated
        apiCall('/api/auth/me').then(res => {
          if (res && (res.user || res.id)) {
            const u = res.user || res;
            login(u);
            toast.success('Đăng nhập Google thành công! Chào mừng bạn quay trở lại.');
          } else {
            toast.error('Không thể xác thực phiên làm việc Google.');
          }
        }).catch(err => {
          console.error('Google OAuth post-login error:', err);
          toast.error('Có lỗi xảy ra khi xác thực với Google.');
        }).finally(() => {
          setIsGoogleProcessing(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      } else if (loginStatus && loginStatus.startsWith('google_')) {
        const errMap: Record<string, string> = {
          google_cancelled: 'Bạn đã hủy quá trình đăng nhập Google.',
          google_state_mismatch: 'Phiên đăng nhập Google đã hết hạn hoặc không khớp. Vui lòng thử lại.',
          google_email_unverified: 'Tài khoản Google của bạn chưa được xác minh email.',
          google_token_exchange_failed: 'Không thể kết nối với máy chủ Google để xác thực mã truy cập.',
          google_profile_fetch_failed: 'Không thể lấy thông tin hồ sơ từ tài khoản Google.',
          google_server_error: 'Có lỗi xảy ra khi xác thực với Google. Vui lòng thử lại.',
          account_locked: 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng.'
        };
        toast.error(errMap[loginStatus] || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const requestedView = params.get('view') || params.get('tab');
      if (requestedView) {
        setCurrentView(requestedView as any);
      }
    }
  }, []);

  // Technique 4: Non-blocking App Shell.
  // Never block the entire viewport with a full-page spinner.
  // Guests see PublicLandingView immediately (0ms). Authenticated users see the App Shell immediately (0ms).
  // 1. In-flight Google OAuth hydration screen
  if (isGoogleProcessing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold">Đang xác thực Google...</h2>
          <p className="text-xs text-slate-400">Đang chuẩn bị không gian làm việc của bạn...</p>
        </div>
      </div>
    );
  }

  // 2. Safe Session Hydration Guard:
  // If the app is actively bootstrapping/verifying session and has not determined auth state,
  // show clean PageSkeleton. Never prematurely kick active users out to PublicLandingView!
  if (!isAppLoaded && !currentUser) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  // 3. Guests / Unauthenticated Users
  if (!isAuthenticated) {
    if (publicView === 'island3d' || publicView === 'cozy3d') {
      return (
        <div key={language} className="w-screen h-screen overflow-hidden">
          <React.Suspense fallback={<PageSkeleton />}>
            <CyberCozyIslandSpace onExit={() => setPublicView('home')} />
          </React.Suspense>
        </div>
      );
    }
    if (publicView === 'universe3d' || publicView === 'spatial3d') {
      return (
        <div key={language} className="w-screen h-screen overflow-hidden">
          <React.Suspense fallback={<PageSkeleton />}>
            <Spatial3DUniverseView onExit={() => setPublicView('home')} />
          </React.Suspense>
        </div>
      );
    }
    if (publicView === 'login') {
      return (
        <div className="w-full h-full">
          <LoginView onBack={() => setPublicView('home')} initialMode={authInitialMode} />
          <CookieConsentBanner />
        </div>
      );
    }
    if (publicView === 'privacy') {
      return (
        <div className="w-full h-full">
          <React.Suspense fallback={<PageSkeleton />}>
            <PrivacyPolicyView onNavigate={(p) => p === 'home' ? setPublicView('home') : setPublicView(p)} />
          </React.Suspense>
          <CookieConsentBanner />
        </div>
      );
    }
    if (publicView === 'terms') {
      return (
        <div className="w-full h-full">
          <React.Suspense fallback={<PageSkeleton />}>
            <TermsOfServiceView onNavigate={(p) => p === 'home' ? setPublicView('home') : setPublicView(p)} />
          </React.Suspense>
          <CookieConsentBanner />
        </div>
      );
    }
    if (publicView === 'cookies') {
      return (
        <div className="w-full h-full">
          <React.Suspense fallback={<PageSkeleton />}>
            <CookiePolicyView onNavigate={(p) => p === 'home' ? setPublicView('home') : setPublicView(p)} />
          </React.Suspense>
          <CookieConsentBanner />
        </div>
      );
    }
    if (publicView === 'refund') {
      return (
        <div className="w-full h-full">
          <React.Suspense fallback={<PageSkeleton />}>
            <RefundPolicyView onNavigate={(p) => p === 'home' ? setPublicView('home') : setPublicView(p)} />
          </React.Suspense>
          <CookieConsentBanner />
        </div>
      );
    }
    return (
      <div className="w-full h-full">
        <PublicLandingView 
          onLoginClick={(mode = 'login') => {
            setAuthInitialMode(mode);
            setPublicView('login');
          }}
          onNavigateLegal={(page) => setPublicView(page)}
        />
        <PwaPromptBanner />
        <CookieConsentBanner />
      </div>
    );
  }

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  // 100% Free-to-use mode: Permanent Full Access for all users
  const hasSubAccess = true;

  if (!hasCompletedOnboarding && userRole === 'USER') {
    return (
      <div className="w-full h-full">
        <OnboardingView />
      </div>
    );
  }

  const renderView = () => {
    // 1. Unrestricted Core Navigation Views
    if (currentView === 'subscription' || currentView === 'checkout') {
      return <DashboardView />;
    }

    if (currentView === 'account') {
      return <MyAccountView />;
    }

    
    if (currentView === 'feedback') {
      return <FeedbackView />;
    }

    if (currentView === 'admin') {
      if (!isAdmin) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100 min-h-full">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-white">{t('Truy cập bị từ chối')}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('Bạn không có quyền Admin. Vui lòng đăng nhập bằng tài khoản có quyền quản trị để truy cập khu vực này.')}
              </p>
              <button type="button"
                onClick={() => logout()}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t('Đăng xuất')}
              </button>
            </div>
          </div>
        );
      }
      return <AdminView />;
    }

    // Dynamic Extensible Modules
    if (typeof currentView === 'string' && currentView.startsWith('custom_module_')) {
      const slug = currentView.replace('custom_module_', '');
      return <DynamicModuleView slug={slug} />;
    }

    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'tasks': return <ScheduleAndTasksView initialTab="today" />;
      case 'calendar': return <ScheduleAndTasksView initialTab="calendar" />;
      case 'finance': return <FinanceView />;
      case 'focus': return <FocusView />;
      case 'projects': return <ProjectsView />;
      case 'study': return <StudyView />;
      case 'study-space':
      case 'classroom':
      case 'connect':
      case 'feed':
        return <LifeOsConnectView />;
      case 'goals': return <GoalsView />;
      case 'notes': return <NotesView />;
      case 'habits': return <HabitsView />;
      case 'journey': return <JourneyView />;
      case 'referral':
      case 'affiliate': return <ReferralView />;
      case 'decision':
      case 'decision_engine': return <DashboardView />;
      case 'automation':
      case 'automation_engine': return <AutomationEngineView />;
      case 'marketplace': return <MarketplaceView />;
      case 'cart': return <CartView />;
      case 'account':
      case 'my_account': return <MyAccountView />;
      case 'subscription': return <SubscriptionManagementView />;
      case 'checkout': return <CheckoutView onCancel={() => setCurrentView('subscription')} onSuccess={() => setCurrentView('subscription')} />;
      case 'privacy':
      case 'privacy-policy': return <PrivacyPolicyView onNavigate={(p) => p === 'home' ? setCurrentView('dashboard') : setCurrentView(p)} />;
      case 'terms':
      case 'terms-of-service': return <TermsOfServiceView onNavigate={(p) => p === 'home' ? setCurrentView('dashboard') : setCurrentView(p)} />;
      case 'cookies':
      case 'cookie-policy': return <CookiePolicyView onNavigate={(p) => p === 'home' ? setCurrentView('dashboard') : setCurrentView(p)} />;
      case 'refund':
      case 'refund-policy': return <RefundPolicyView onNavigate={(p) => p === 'home' ? setCurrentView('dashboard') : setCurrentView(p)} />;
      default: return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 flex items-center justify-center text-2xl shadow-xs">
            🧭
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1.5">
            Không tìm thấy phân hệ yêu cầu
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
            Đường dẫn URL hoặc phân hệ này không tồn tại hoặc đã được cập nhật. Dữ liệu cá nhân của bạn vẫn an toàn.
          </p>
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-sm"
          >
            Quay về Bảng điều khiển
          </button>
        </div>
      );
    }
  };

  const renderViewContent = () => {
    const isUnrestrictedView =
      currentView === 'subscription' ||
      currentView === 'checkout' ||
      currentView === 'account' ||
      currentView === 'admin' ||
      currentView === 'privacy' ||
      currentView === 'privacy-policy' ||
      currentView === 'terms' ||
      currentView === 'terms-of-service' ||
      currentView === 'cookies' ||
      currentView === 'cookie-policy' ||
      currentView === 'refund' ||
      currentView === 'refund-policy';

    return (
      <div key={currentView} className="relative min-h-full flex flex-col flex-1 view-transition-enter">
        <ErrorBoundary fallbackTitle={`Khối giao diện '${currentView}' gặp sự cố`}>
          {renderView()}
        </ErrorBoundary>
        {!hasSubAccess && !isUnrestrictedView && (
          <LockedWorkspaceOverlay />
        )}
      </div>
    );
  };

  const isSimulated = deviceMode !== 'desktop';

  const shellContent = (
    <div className={`relative flex h-full w-full bg-[#F8FAFC]/90 dark:bg-[#07070C]/90 overflow-hidden font-sans text-[#0F172A] dark:text-slate-100 transition-colors duration-150 ${
      deviceMode === 'mobile' ? 'mobile-viewport' : deviceMode === 'tablet' ? 'tablet-viewport' : ''
    }`}>
      <React.Suspense fallback={null}>
        <SpatialBackgroundRig />
      </React.Suspense>
      <SeoHead title="" viewKey={currentView} />
      <ToastContainer />
      <CommandCenter />
      <SyncIndicator />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-w-full relative overflow-x-hidden">
        <StickyTopBanner />
        <TopBar />
        <AccountStatusBanner />
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] w-full max-w-full pb-24 sm:pb-28 md:pb-6 relative min-h-0">
          <div className={`w-full mx-auto px-3.5 sm:px-5 lg:px-8 py-3.5 sm:py-5 lg:py-6 ${
            currentView === 'projects' || currentView === 'tasks' || currentView === 'calendar' || currentView === 'admin' || currentView === 'connect'
              ? 'max-w-[1400px]' 
              : 'max-w-[1280px]'
          }`}>
            <ErrorBoundary fallbackTitle={`Khối giao diện '${currentView}' gặp sự cố`}>
              <React.Suspense fallback={<PageSkeleton />}>
                {renderViewContent()}
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <BottomNav />
      </div>
      <LoginAnnouncementModal />
      <PwaPromptBanner />
      <GlobalFocusMusicPlayer />
      <ScratchpadWidget />
      <GlobalChatWidget
        currentUserId={currentUser?.id || ''}
        currentUserName={currentUser?.name || 'Thành viên'}
        currentUserAvatar={currentUser?.avatar}
      />
      <CookieConsentBanner />
    </div>
  );

  return (
    <div className="relative h-screen h-[100dvh] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {!isSimulated ? (
        shellContent
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-950/90 backdrop-blur-3xl p-2 sm:p-6 overflow-hidden">
          {/* Simulated Device Chassis */}
          <div
            className={`relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-slate-800 bg-black transition-all duration-300 flex flex-col overflow-hidden ring-1 ring-white/10 ${
              deviceMode === 'mobile'
                ? deviceOrientation === 'portrait'
                  ? 'w-[390px] h-[844px] max-h-[94vh] rounded-[48px] border-[10px]'
                  : 'w-[844px] h-[390px] max-w-[95vw] rounded-[48px] border-[10px]'
                : deviceOrientation === 'portrait'
                ? 'w-[820px] h-[1180px] max-h-[94vh] rounded-[36px] border-[12px]'
                : 'w-[1180px] h-[820px] max-w-[95vw] max-h-[92vh] rounded-[36px] border-[12px]'
            }`}
          >
            {/* Dynamic Island / Tablet camera */}
            {deviceMode === 'mobile' && deviceOrientation === 'portrait' && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-950/80" />
              </div>
            )}
            {deviceMode === 'tablet' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-800 rounded-full z-50 pointer-events-none" />
            )}
            {/* Device Screen Content */}
            <div className="w-full h-full overflow-hidden flex flex-col relative">
              {shellContent}
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Device Preview Dock */}
      <DevicePreviewDock
        deviceMode={deviceMode}
        onSelectMode={(mode) => setDeviceMode(mode)}
        orientation={deviceOrientation}
        onToggleOrientation={() => setDeviceOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Hệ thống LifeOS gặp sự cố ngoài dự kiến">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
