import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Smartphone, Check, Share2, PlusSquare, AlertCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { 
  subscribePwaStatus, 
  promptPwaInstall, 
  applyPwaUpdate, 
  snoozeUpdate,
  verifyPostUpdate,
  PwaStatus, 
  isIosDevice,
  CURRENT_CLIENT_VERSION 
} from '../lib/pwa';
import { toast } from '../lib/toast';

export function PwaPromptBanner() {
  const [pwaStatus, setPwaStatus] = useState<PwaStatus>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    hasUpdate: false,
    isIos: isIosDevice(),
    currentVersion: CURRENT_CLIENT_VERSION,
    latestVersion: CURRENT_CLIENT_VERSION,
    updatePhase: 'idle',
    updateProgress: 0,
    updateError: null,
    changelog: []
  });

  const [dismissedInstall, setDismissedInstall] = useState(() => {
    try {
      return (
        localStorage.getItem('lifeos_pwa_dismissed') === 'true' ||
        sessionStorage.getItem('lifeos_pwa_dismissed') === 'true'
      );
    } catch {
      return false;
    }
  });

  const [isInstalling, setIsInstalling] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    // 1. Post-reload verification (Step 9)
    const verification = verifyPostUpdate();
    if (verification.isSuccess) {
      toast.show(
        `Ứng dụng LifeOS đã cập nhật lên phiên bản v${verification.updatedVersion} thành công!`,
        'success',
        'Cập nhật thành công',
        5000
      );
    }

    // 2. Subscribe to PWA lifecycle state
    const unsubscribe = subscribePwaStatus((status) => {
      setPwaStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleDismissInstall = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDismissedInstall(true);
    try {
      localStorage.setItem('lifeos_pwa_dismissed', 'true');
      sessionStorage.setItem('lifeos_pwa_dismissed', 'true');
    } catch {
      // Storage unavailable or blocked
    }
  };

  const handleInstallClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInstalling) return;

    setIsInstalling(true);
    try {
      const accepted = await promptPwaInstall();
      if (accepted) {
        toast.show('Cài đặt ứng dụng LifeOS thành công!', 'success');
        handleDismissInstall();
      } else {
        toast.show(
          'Để cài đặt LifeOS, bạn có thể nhấn biểu tượng Cài đặt trên thanh địa chỉ trình duyệt hoặc Menu (⋮) > Cài đặt ứng dụng.',
          'info',
          'Hướng dẫn cài đặt',
          6000
        );
        handleDismissInstall();
      }
    } catch (err) {
      console.error('[PWA] Lỗi cài đặt:', err);
      handleDismissInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  // Handles clicking "Cập nhật ngay"
  const handleUpdateNow = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (pwaStatus.updatePhase === 'downloading' || pwaStatus.updatePhase === 'installing' || pwaStatus.updatePhase === 'verifying') {
      return;
    }

    try {
      await applyPwaUpdate();
    } catch (err: any) {
      toast.show(
        err.message || 'Không thể áp dụng bản cập nhật. Vui lòng thử lại sau.',
        'error',
        'Lỗi cập nhật'
      );
    }
  };

  // Handles clicking "Để sau" or "✕" (Snoozes for 24 hours without data loss)
  const handleSnooze = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    snoozeUpdate(24);
    toast.show(
      'Thông báo cập nhật sẽ được nhắc lại sau 24 giờ. Dữ liệu của bạn được giữ nguyên an toàn.',
      'info',
      'Đã hoãn cập nhật',
      4000
    );
  };

  // 1. Update Notification Banner (Active when hasUpdate is true)
  if (pwaStatus.hasUpdate) {
    const isWorking = ['downloading', 'verifying', 'installing'].includes(pwaStatus.updatePhase);
    const isError = pwaStatus.updatePhase === 'error';

    return (
      <aside 
        id="pwa-update-banner"
        aria-label="Thông báo cập nhật ứng dụng" 
        className="fixed top-3 right-3 sm:right-6 z-60 max-w-md w-[calc(100vw-24px)] bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-2xl border border-blue-400/40 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl shrink-0 mt-0.5">
            {isWorking ? (
              <RefreshCw className="w-5 h-5 animate-spin text-blue-200" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-amber-300" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                {isError ? 'Lỗi khi cập nhật phiên bản' : 'Đã có bản cập nhật mới'}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white/20 rounded-full text-blue-100 font-semibold">
                v{pwaStatus.latestVersion || '2.0.1'}
              </span>
            </div>

            <p className="text-xs text-blue-100 mt-1 leading-relaxed">
              {isError 
                ? (pwaStatus.updateError || 'Mất kết nối mạng hoặc không thể tải dữ liệu mới.')
                : isWorking
                ? (pwaStatus.updatePhase === 'downloading'
                    ? `Đang tải gói cập nhật (${pwaStatus.updateProgress}%)...`
                    : pwaStatus.updatePhase === 'verifying'
                    ? 'Đang kiểm tra tính toàn vẹn của tệp tải về...'
                    : 'Đang áp dụng phiên bản mới và khởi động lại...')
                : 'Phiên bản mới giúp tối ưu hoá hiệu năng, bảo vệ dữ liệu và sửa lỗi ổn định.'}
            </p>

            {/* Progress bar during update execution */}
            {isWorking && (
              <div className="w-full bg-blue-900/60 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(15, pwaStatus.updateProgress)}%` }}
                />
              </div>
            )}

            {/* Optional Changelog Accordion */}
            {pwaStatus.changelog && pwaStatus.changelog.length > 0 && !isWorking && (
              <div className="mt-2 text-xs">
                <button
                  type="button"
                  id="btn-toggle-changelog"
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="text-[11px] text-blue-200 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer py-0.5"
                >
                  {showChangelog ? 'Thu gọn tính năng mới' : 'Xem nội dung bản cập nhật'}
                  {showChangelog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showChangelog && (
                  <ul className="mt-1.5 space-y-1 p-2 bg-blue-800/60 rounded-lg text-blue-100 text-[11px] animate-in fade-in duration-200 border border-blue-500/30">
                    {pwaStatus.changelog.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-300 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {isError ? (
                <>
                  <button
                    type="button"
                    id="btn-retry-update"
                    onClick={handleUpdateNow}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                  </button>
                  <button
                    type="button"
                    id="btn-dismiss-error"
                    onClick={handleSnooze}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Để sau
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    id="btn-update-now"
                    disabled={isWorking}
                    onClick={handleUpdateNow}
                    className="px-3.5 py-1.5 bg-white text-blue-700 font-bold text-xs rounded-lg shadow-sm hover:bg-blue-50 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isWorking ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang cập nhật...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Cập nhật ngay
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    id="btn-update-later"
                    disabled={isWorking}
                    onClick={handleSnooze}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all cursor-pointer"
                  >
                    Để sau
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            id="btn-close-update-banner"
            disabled={isWorking}
            onClick={handleSnooze}
            className="text-white/70 hover:text-white p-1 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Đóng thông báo cập nhật"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // 2. iOS Safari Step-by-Step Guidance Banner
  if (pwaStatus.isIos && !pwaStatus.isInstalled && !dismissedInstall) {
    return (
      <aside 
        id="pwa-ios-install-banner"
        aria-label="Cài đặt LifeOS trên iPhone/iPad" 
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 left-3.5 sm:left-6 md:left-[17.5rem] z-40 max-w-sm w-[calc(100vw-28px)] md:w-96 max-h-[85dvh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Thêm LifeOS vào Màn hình chính
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Trải nghiệm mượt mà, toàn màn hình và hoạt động ổn định.
            </p>

            {showIosGuide ? (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-2 text-slate-700 dark:text-slate-200 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-mono">1</span>
                  <span>Nhấn icon Chia sẻ <Share2 className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" /> ở thanh Safari</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-mono">2</span>
                  <span>Kéo xuống & chọn <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 dark:text-white mx-0.5" /> "Thêm vào MH chính"</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[10px] font-mono">3</span>
                  <span>Bấm "Thêm" ở góc phải trên cùng là xong</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                id="btn-ios-guide-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIosGuide(!showIosGuide);
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-medium text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {showIosGuide ? 'Thu gọn' : 'Xem hướng dẫn'}
              </button>
              <button
                type="button"
                id="btn-ios-dismiss"
                onClick={handleDismissInstall}
                onTouchEnd={handleDismissInstall}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal rounded-lg transition-all cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            type="button"
            id="btn-ios-close"
            onClick={handleDismissInstall}
            onTouchEnd={handleDismissInstall}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
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
        id="pwa-install-banner"
        aria-label="Cài đặt ứng dụng LifeOS" 
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 left-3.5 sm:left-6 md:left-[17.5rem] z-40 max-w-sm w-[calc(100vw-28px)] md:w-96 max-h-[85dvh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              Cài đặt LifeOS
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Cài đặt ứng dụng lên màn hình chính để mở tức thì, mượt mà và hoạt động ngoại tuyến.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                id="btn-install-pwa"
                disabled={isInstalling}
                onClick={handleInstallClick}
                onTouchEnd={handleInstallClick}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-60 text-white font-medium text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> {isInstalling ? 'Đang mở...' : 'Cài đặt app'}
              </button>
              <button
                type="button"
                id="btn-install-later"
                onClick={handleDismissInstall}
                onTouchEnd={handleDismissInstall}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal rounded-lg transition-all cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-install-banner"
            onClick={handleDismissInstall}
            onTouchEnd={handleDismissInstall}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
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
