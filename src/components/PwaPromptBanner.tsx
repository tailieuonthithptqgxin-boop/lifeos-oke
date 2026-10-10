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
  const [dismissedInstall, setDismissedInstall] = useState(false);
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
      <aside aria-label="Cài đặt ứng dụng QUẢN LÍ CÁ NHÂN" className="fixed bottom-20 md:bottom-5 left-3 sm:left-6 z-40 max-w-sm w-[calc(100vw-24px)] bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              Cài đặt QUẢN LÍ CÁ NHÂN
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Cài đặt ứng dụng lên màn hình chính để mở nhanh, mượt mà và dùng được ngoại tuyến.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                disabled={isInstalling}
                onClick={async () => {
                  setIsInstalling(true);
                  await promptPwaInstall();
                  setIsInstalling(false);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {isInstalling ? 'Đang mở...' : 'Cài đặt app'}
              </button>
              <button
                type="button"
                onClick={() => setDismissedInstall(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
              >
                Không phải lúc này
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedInstall(true)}
            className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
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
