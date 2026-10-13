import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Smartphone, Check, Share2, PlusSquare } from 'lucide-react';
import { subscribePwaStatus, promptPwaInstall, applyPwaUpdate, PwaStatus, isIosDevice } from '../lib/pwa';

export function PwaPromptBanner() {
  const [pwaStatus, setPwaStatus] = useState<PwaStatus>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    hasUpdate: false,
    isIos: isIosDevice()
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
  const [showIosGuide, setShowIosGuide] = useState(false);

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
              Ứng dụng LifeOS đã có bản cập nhật mới với nhiều cải tiến mượt mà hơn.
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

  // 2. iOS Safari Step-by-Step Guidance Banner (when on iOS and not yet installed standalone)
  if (pwaStatus.isIos && !pwaStatus.isInstalled && !dismissedInstall) {
    return (
      <aside 
        aria-label="Cài đặt LifeOS trên iPhone/iPad" 
        className="fixed bottom-20 md:bottom-6 left-3.5 sm:left-6 md:left-[17.5rem] z-40 max-w-sm w-[calc(100vw-28px)] md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-800 dark:text-slate-100 p-4 rounded-3xl shadow-2xl border border-purple-200/80 dark:border-purple-800/60 animate-in slide-in-from-bottom-5 fade-in duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-pink-500/25">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Thêm LifeOS vào Màn hình chính 📲
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Trải nghiệm mượt như app tải từ App Store, toàn màn hình và không vướng thanh địa chỉ!
            </p>

            {showIosGuide ? (
              <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-2xl text-xs space-y-2 text-slate-700 dark:text-slate-200 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-violet-600 dark:text-violet-400">
                  <span className="w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-[10px]">1</span>
                  <span>Nhấn icon Chia sẻ <Share2 className="w-3.5 h-3.5 inline text-blue-500 mx-0.5" /> ở thanh Safari</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-violet-600 dark:text-violet-400">
                  <span className="w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-[10px]">2</span>
                  <span>Kéo xuống & chọn <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 dark:text-white mx-0.5" /> "Thêm vào MH chính"</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-[10px]">3</span>
                  <span>Bấm "Thêm" ở góc phải trên cùng là xong! ✨</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowIosGuide(!showIosGuide)}
                className="btn-squishy px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {showIosGuide ? 'Thu gọn' : 'Xem hướng dẫn 1-chạm'}
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

  // 3. Android / Chromium 1-Click Install Banner
  if (pwaStatus.canInstall && !pwaStatus.isInstalled && !dismissedInstall) {
    return (
      <aside 
        aria-label="Cài đặt ứng dụng LifeOS" 
        className="fixed bottom-20 md:bottom-6 left-3.5 sm:left-6 md:left-[17.5rem] z-40 max-w-sm w-[calc(100vw-28px)] md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-800 dark:text-slate-100 p-4 rounded-3xl shadow-2xl border border-purple-200/80 dark:border-purple-800/60 card-cute animate-in slide-in-from-bottom-5 fade-in duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-pink-500/25">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              Cài đặt LifeOS ✨
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
