/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './lib/store';
import { useTranslation, translations, t as translateI18n } from './lib/i18n';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';

// Import Core Views directly
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { CommandCenter } from './components/CommandCenter';
import { OnboardingView } from './components/OnboardingView';
import { PublicLandingView } from './components/PublicLandingView';
import { LoginView } from './components/LoginView';
import { AccountStatusBanner } from './components/AccountStatusBanner';
import { LockedWorkspaceOverlay } from './components/LockedWorkspaceOverlay';
import { GlobalCompanionOverlay } from './components/companion/GlobalCompanionOverlay';
import { GlobalFocusMusicPlayer } from './components/GlobalFocusMusicPlayer';
import { ScratchpadWidget } from './components/ScratchpadWidget';
import { PwaPromptBanner } from './components/PwaPromptBanner';
import { PageSkeleton } from './components/Skeleton';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './lib/toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SeoHead } from './components/common/SeoHead';
import { lazyWithRetry } from './lib/lazyWithRetry';
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
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white font-medium text-sm animate-in slide-in-from-bottom-5 fade-in duration-300" style={{ backgroundColor: isError ? '#dc2626' : isSuccess ? '#16a34a' : '#2563eb' }}>
      {isSyncing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
      {isSuccess && <span>✓</span>}
      {isError && <span>⚠</span>}
      <span>{syncMessage}</span>
      {(isError || isSuccess) && (
        <button onClick={clearSyncState} className="ml-2 opacity-70 hover:opacity-100">✕</button>
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
    toggleCommand
  } = useAppStore();

  React.useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  React.useEffect(() => {
    if ((currentView as string) === 'notifications' || (currentView as string) === 'notification_settings') {
      setCurrentView('dashboard');
    }
  }, [currentView, setCurrentView]);

  const t = useTranslation(language);

  // Synchronize document language attribute without intrusive DOM mutations
  React.useEffect(() => {
    document.documentElement.lang = language || 'vi';
  }, [language]);

  const [publicView, setPublicView] = useState<'home' | 'login'>(() => {
    if (typeof window !== 'undefined') {
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
        params.get('auth')
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

  // Handle Google OAuth query feedback
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const loginStatus = params.get('login');
      if (loginStatus === 'google_success') {
        toast.success('Đăng nhập Google thành công! Chào mừng bạn trở lại.');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (loginStatus && loginStatus.startsWith('google_')) {
        
        const errMap: Record<string, string> = {
          google_cancelled: 'Bạn đã hủy quá trình đăng nhập Google.',
          google_state_mismatch: 'Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.',
          google_email_unverified: 'Tài khoản Google của bạn chưa được xác minh email.',
          google_server_error: 'Có lỗi xảy ra khi xác thực với Google. Vui lòng thử lại.',
          account_locked: 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng.'
        };
        toast.error(errMap[loginStatus] || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Technique 4: Non-blocking App Shell.
  // Never block the entire viewport with a full-page spinner.
  // Guests see PublicLandingView immediately (0ms). Authenticated users see the App Shell immediately (0ms).
  if (!isAuthenticated) {
    if (publicView === 'login') {
      return (
        <div key={language} className="w-full h-full">
          <LoginView onBack={() => setPublicView('home')} initialMode={authInitialMode} />
        </div>
      );
    }
    return (
      <div key={language} className="w-full h-full">
        <PublicLandingView 
          onLoginClick={(mode = 'login') => {
            setAuthInitialMode(mode);
            setPublicView('login');
          }} 
        />
      </div>
    );
  }

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const hasSubAccess = isAdmin || Boolean(subscriptionStatus?.hasAccess);

  if (!hasCompletedOnboarding && userRole === 'USER') {
    return (
      <div key={language} className="w-full h-full">
        <OnboardingView />
      </div>
    );
  }

  const renderView = () => {
    // 1. Unrestricted Core Navigation Views
    if (currentView === 'subscription') {
      return <SubscriptionManagementView />;
    }

    if (currentView === 'checkout') {
      return <CheckoutView onCancel={() => setCurrentView('subscription')} onSuccess={() => setCurrentView('subscription')} />;
    }

    if (currentView === 'account') {
      return <MyAccountView />;
    }

    if (currentView === 'referral') {
      return <ReferralView />;
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
              <button
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
      case 'tasks': return <TasksView />;
      case 'calendar': return <CalendarView />;
      case 'finance': return <FinanceView />;
      case 'focus': return <FocusView />;
      case 'projects': return <ProjectsView />;
      case 'study': return <StudyView />;
      case 'goals': return <GoalsView />;
      case 'notes': return <NotesView />;
      case 'habits': return <HabitsView />;
      case 'journey': return <JourneyView />;
      case 'decision':
      case 'decision_engine': return <DecisionEngineView />;
      case 'automation':
      case 'automation_engine': return <AutomationEngineView />;
      case 'marketplace': return <MarketplaceView />;
      case 'cart': return <CartView />;
      case 'account':
      case 'my_account': return <MyAccountView />;
      case 'subscription': return <SubscriptionManagementView />;
      case 'checkout': return <CheckoutView onCancel={() => setCurrentView('subscription')} onSuccess={() => setCurrentView('subscription')} />;
      default: return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mb-4 flex items-center justify-center">
            <span className="text-2xl">🚧</span>
          </div>
          <h2 className="text-xl font-medium text-slate-700">{t('UnderDevelopment')}</h2>
          <p className="mt-2 text-center max-w-md">
            {t('PleaseComeBack')}
          </p>
        </div>
      );
    }
  };

  const renderViewContent = () => {
    const isUnrestrictedView =
      currentView === 'subscription' ||
      currentView === 'checkout' ||
      currentView === 'account' ||
      currentView === 'admin';

    return (
      <div className="relative min-h-full flex flex-col flex-1">
        <ErrorBoundary fallbackTitle={`Khối giao diện '${currentView}' gặp sự cố`}>
          {renderView()}
        </ErrorBoundary>
        {!hasSubAccess && !isUnrestrictedView && (
          <LockedWorkspaceOverlay />
        )}
      </div>
    );
  };

  return (
    <div key={language} className="flex h-screen h-[100dvh] w-full max-w-full bg-[#F8FAFC] dark:bg-[#0B1120] overflow-hidden font-sans text-[#0F172A] dark:text-slate-100 transition-colors duration-150">
      <SeoHead title="" viewKey={currentView} />
      <ToastContainer />
      <CommandCenter />
      <SyncIndicator />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-w-full relative overflow-x-hidden">
        <TopBar />
        <AccountStatusBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full pb-20 sm:pb-24 md:pb-6 relative">
          <React.Suspense fallback={<PageSkeleton />}>
            {renderViewContent()}
          </React.Suspense>
        </main>
        <BottomNav />
      </div>
      <GlobalCompanionOverlay />
      <PwaPromptBanner />
      <GlobalFocusMusicPlayer />
      <ScratchpadWidget />
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
