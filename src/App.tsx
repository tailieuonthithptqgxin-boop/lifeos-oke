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
import { PwaPromptBanner } from './components/PwaPromptBanner';
import { PageSkeleton } from './components/Skeleton';
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

  const t = useTranslation(language);

  // Global I18n Observer: Ensures 100% of rendered DOM text and placeholders match the active language
  React.useEffect(() => {
    if (language !== 'en') return;

    let isTranslating = false;
    const dict = translations.en || {};

    const translateText = (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed) return raw;
      const trans = translateI18n(trimmed, 'en');
      if (trans && trans !== trimmed) {
        return raw.replace(trimmed, trans);
      }
      return raw;
    };

    const translateElement = (el: HTMLElement) => {
      // 1. Text nodes inside element
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const content = node.textContent;
        if (content && content.trim()) {
          const translated = translateText(content);
          if (translated !== content) {
            node.textContent = translated;
          }
        }
      }

      // 2. Attributes (placeholder, title, aria-label)
      const formEls = el.querySelectorAll<HTMLElement>('input, textarea, select, button, [title], [placeholder], [aria-label]');
      formEls.forEach((item) => {
        const ph = item.getAttribute('placeholder');
        if (ph && ph.trim()) {
          const transPh = translateText(ph);
          if (transPh !== ph) item.setAttribute('placeholder', transPh);
        }
        const title = item.getAttribute('title');
        if (title && title.trim()) {
          const transTitle = translateText(title);
          if (transTitle !== title) item.setAttribute('title', transTitle);
        }
        const aria = item.getAttribute('aria-label');
        if (aria && aria.trim()) {
          const transAria = translateText(aria);
          if (transAria !== aria) item.setAttribute('aria-label', transAria);
        }
      });
    };

    const root = document.getElementById('root');
    if (root) {
      isTranslating = true;
      try {
        translateElement(root);
      } finally {
        isTranslating = false;
      }

      const observer = new MutationObserver((mutations) => {
        if (isTranslating) return;
        isTranslating = true;
        try {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  translateElement(node as HTMLElement);
                } else if (node.nodeType === Node.TEXT_NODE) {
                  const content = node.textContent;
                  if (content && content.trim()) {
                    const translated = translateText(content);
                    if (translated !== content) {
                      node.textContent = translated;
                    }
                  }
                }
              });
            } else if (mutation.type === 'characterData') {
              const content = mutation.target.textContent;
              if (content && content.trim()) {
                const translated = translateText(content);
                if (translated !== content) {
                  mutation.target.textContent = translated;
                }
              }
            }
          }
        } finally {
          isTranslating = false;
        }
      });

      observer.observe(root, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
    }
  }, [language, currentView]);

  const [publicView, setPublicView] = useState<'home' | 'login'>('home');

  if (!isAppLoaded) {
    return (
      <div key={language} className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">{t('Đang tải dữ liệu Life OS...')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (publicView === 'login') {
      return (
        <div key={language} className="w-full h-full">
          <LoginView onBack={() => setPublicView('home')} />
        </div>
      );
    }
    return (
      <div key={language} className="w-full h-full">
        <PublicLandingView onLoginClick={() => setPublicView('login')} />
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
      <div key={currentView} className="relative min-h-full flex flex-col flex-1 animate-page-enter">
        {renderView()}
        {!hasSubAccess && !isUnrestrictedView && (
          <LockedWorkspaceOverlay />
        )}
      </div>
    );
  };

  return (
    <div key={language} className="flex h-screen h-[100dvh] w-full max-w-full bg-gradient-to-br from-[#f8faf9] via-[#f4f8f6] to-[#f0fdf4] dark:from-slate-950 dark:via-[#0c1410] dark:to-[#061e14] overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <CommandCenter />
      <SyncIndicator />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-w-full relative overflow-x-hidden">
        <TopBar />
        <AccountStatusBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full pb-20 sm:pb-24 md:pb-20 relative">
          <React.Suspense fallback={<PageSkeleton />}>
            {renderViewContent()}
          </React.Suspense>
        </main>
        <BottomNav />
      </div>
      <GlobalCompanionOverlay />
      <PwaPromptBanner />

      {/* Floating Action Button for Omni Quick-Capture (Desktop only to prevent obstructing mobile cards) */}
      <div className="hidden md:flex fixed bottom-7 right-6 md:right-28 z-40 items-center group">
        <button
          type="button"
          id="btn-omni-quick-capture"
          onClick={() => toggleCommand()}
          title={t('Mở bảng Lệnh nhanh & Tìm kiếm (Phím tắt: Ctrl + K)')}
          aria-label={t('Lệnh nhanh 1-chạm (Ctrl + K)')}
          className="h-10 sm:h-12 px-3 sm:px-4 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-300/40"
        >
          <div className="w-6 h-6 rounded-full bg-slate-950/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 fill-slate-950 stroke-slate-950" />
          </div>
          <span className="text-xs font-black tracking-tight hidden sm:inline">{t('Lệnh nhanh')}</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded-md bg-slate-950/25 text-[10px] font-mono font-bold text-slate-950">
            Ctrl K
          </kbd>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
