import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, X, Settings, ExternalLink } from 'lucide-react';

export type CookieConsentLevel = 'all' | 'essential_only' | 'rejected';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const consent = localStorage.getItem('lifeos_cookie_consent');
      if (!consent) {
        // Delay 800ms for smooth entrance animation after initial page load
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      } else {
        // If already consented to all, initialize optional scripts if needed
        if (consent === 'all') {
          enableOptionalTracking();
        }
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const enableOptionalTracking = () => {
    // Zero tracking scripts run by default.
    // If third-party analytics are configured in the future, initialize strictly here.
    if (typeof window !== 'undefined') {
      (window as any).__LIFEOS_ANALYTICS_ENABLED__ = true;
    }
  };

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('lifeos_cookie_consent', 'all');
      localStorage.setItem('lifeos_cookie_consent_date', new Date().toISOString());
    } catch {}
    enableOptionalTracking();
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('lifeos_cookie_consent', 'essential_only');
      localStorage.setItem('lifeos_cookie_consent_date', new Date().toISOString());
    } catch {}
    if (typeof window !== 'undefined') {
      (window as any).__LIFEOS_ANALYTICS_ENABLED__ = false;
    }
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    if (analyticsEnabled) {
      handleAcceptAll();
    } else {
      handleEssentialOnly();
    }
  };

  if (!isVisible) return null;

  return (
    <aside 
      role="region" 
      aria-label="Thông báo và tùy chọn Cookie"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-20 right-3 sm:right-6 sm:max-w-sm z-50 max-h-[80dvh] overflow-y-auto animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="bg-[#0F172A]/95 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-200 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Chính Sách Cookie & Quyền Riêng Tư</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-bold">
                Nghị định 13
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Chúng tôi sử dụng <strong>Cookie thiết yếu</strong> để duy trì phiên đăng nhập và bảo vệ dữ liệu của bạn.
            </p>
          </div>
          </div>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
            title="Đóng thông báo"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Settings Drawer */}
        {showCustomSettings && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Cookie Thiết Yếu (Bắt buộc)</span>
                <span className="text-[11px] text-slate-400">JWT Token, bảo vệ phiên đăng nhập CSRF, bộ đệm PWA.</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                Luôn bật
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div>
                <span className="font-bold text-white block">Cookie Thống Kê & Trải Nghiệm</span>
                <span className="text-[11px] text-slate-400">Đo lường thời gian tải trang để cải thiện hiệu năng.</span>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Buttons / Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Đồng ý tất cả</span>
          </button>

          <button
            type="button"
            onClick={handleEssentialOnly}
            className="py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Chỉ cookie thiết yếu
          </button>

          <button
            type="button"
            onClick={() => setShowCustomSettings(!showCustomSettings)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Tùy chỉnh"
            aria-label="Tùy chỉnh cookie"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
          <a
            href="/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-emerald-400 transition-colors underline flex items-center gap-1"
          >
            <span>Tìm hiểu Chính sách Cookie</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span className="text-slate-400">Zero-Tracker Default</span>
        </div>
      </div>
    </aside>
  );
}
