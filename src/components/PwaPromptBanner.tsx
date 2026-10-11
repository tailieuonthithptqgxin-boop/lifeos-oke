import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Smartphone, Check } from 'lucide-react';
import { subscribePwaStatus, promptPwaInstall, applyPwaUpdate, PwaStatus } from '../lib/pwa';

export function PwaPromptBanner() {
  const [pwaStatus, setPwaStatus] = useState<PwaStatus>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    hasUpdate: false
  });
  const [dismissedInstall, setDismissedInstall] = useState(() => {
    try {
      return sessionStorage.getItem('lifeos_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribePwaStatus((status) => {
      setPwaStatus(status);
    });
    return unsubscribe;
  }, []);

  // 1. Update Notification Banner
  if (pwaStatus.hasUpdate && !dismissedUpdate) {
    return (
      <aside aria-label="Thông báo cập nhật ứng dụng" className="fixed top-3 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-24px)] bg-blue-600 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-400/40 animate-in slide-in-from-top-4 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/15 rounded-xl shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white">Đã có bản cập nhật mới</h4>
            <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
              Ứng dụng QUẢN LÍ CÁ NHÂN có phiên bản mới với nhiều cải tiến.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={applyPwaUpdate}
                className="px-3 py-1.5 bg-white text-blue-700 font-bold text-xs rounded-lg shadow-sm hover:bg-blue-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Cập nhật ngay
              </button>
              <button
                type="button"
                onClick={() => setDismissedUpdate(true)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedUpdate(true)}
            className="text-white/70 hover:text-white p-1 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // 2. Install Prompt Banner (Only when browser permits installation and not installed)
  if (pwaStatus.canInstall && !pwaStatus.isInstalled && !dismissedInstall) {
    return (
      <aside 
        aria-label="Cài đặt ứng dụng QUẢN LÍ CÁ NHÂN" 
        className="fixed bottom-22 md:bottom-6 left-3.5 sm:left-6 md:left-[17.5rem] z-40 max-w-sm w-[calc(100vw-28px)] md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-800 dark:text-slate-100 p-4 rounded-3xl shadow-2xl border border-purple-200/80 dark:border-purple-800/60 card-cute animate-in slide-in-from-bottom-5 fade-in duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-pink-500/25">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              Cài đặt QUẢN LÍ CÁ NHÂN ✨
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Cài đặt ứng dụng lên màn hình chính để mở tức thì, mượt mà và hoạt động ngoại tuyến.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                disabled={isInstalling}
                onClick={async () => {
                  setIsInstalling(true);
                  await promptPwaInstall();
                  setIsInstalling(false);
                }}
                className="btn-squishy px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {isInstalling ? 'Đang mở...' : 'Cài đặt app'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissedInstall(true);
                  sessionStorage.setItem('lifeos_pwa_dismissed', 'true');
                }}
                className="btn-squishy px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissedInstall(true);
              sessionStorage.setItem('lifeos_pwa_dismissed', 'true');
            }}
            className="btn-squishy text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
