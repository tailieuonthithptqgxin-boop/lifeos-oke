import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Calendar, 
  Send, 
  Check, 
  Copy, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { useAppStore } from '../lib/store';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function QuickNotificationWidget() {
  const { setCurrentView } = useAppStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState('');
  const [webcalUrl, setWebcalUrl] = useState('');
  const [vapidKey, setVapidKey] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await apiCall('/api/notifications/settings');
      if (res && res.success) {
        const envKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';
        setVapidKey(res.vapidPublicKey || envKey);
        setCalendarFeedUrl(res.calendarFeedUrl || '');
        setWebcalUrl(res.webcalUrl || '');
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleTogglePush = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      setNotice('Trình duyệt của bạn chưa hỗ trợ Web Push.');
      return;
    }

    try {
      setIsLoading(true);
      if (isSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await apiCall('/api/notifications/push/unsubscribe', 'POST', { endpoint: sub.endpoint });
        }
        setIsSubscribed(false);
        setNotice('Đã tắt thông báo đẩy trên thiết bị này.');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setNotice('Bạn chưa cấp quyền thông báo trong trình duyệt.');
          return;
        }

        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js');
        }
        await navigator.serviceWorker.ready;

        const effectiveKey = vapidKey || (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || 'BBy7xQL9F5zCvpaDWkZf-mQcgcAzxhJkrfq0y8GH14prpeeHmRnY3B3svznOZgy-QAM1A2XDA6Q5kgMWuG0XLes';
        const applicationServerKey = urlBase64ToUint8Array(effectiveKey);

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });

        const subJson = sub.toJSON();
        await apiCall('/api/notifications/push/subscribe', 'POST', {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          userAgent: navigator.userAgent
        });

        setIsSubscribed(true);
        setNotice('🎉 Đã bật thông báo đẩy màn hình khóa thành công!');
      }
    } catch (err: any) {
      setNotice('Lỗi: ' + (err.message || 'Không thể kích hoạt'));
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleTestPush = async () => {
    try {
      setIsTesting(true);
      await apiCall('/api/notifications/push/test', 'POST');
      setNotice('🚀 Đang bắn thông báo test! Kiểm tra khay thông báo sau 3 giây...');
    } catch (err: any) {
      setNotice('Lỗi test: ' + err.message);
    } finally {
      setTimeout(() => {
        setIsTesting(false);
        setNotice(null);
      }, 4000);
    }
  };

  const handleCopyCalendar = () => {
    if (!calendarFeedUrl) return;
    navigator.clipboard.writeText(calendarFeedUrl);
    setCopiedLink(true);
    setNotice('📋 Đã sao chép link Lịch .ics cá nhân vào bộ nhớ tạm!');
    setTimeout(() => {
      setCopiedLink(false);
      setNotice(null);
    }, 3000);
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/30 border border-emerald-300/60 dark:border-emerald-800/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-600/20">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                Thông Báo Đa Kênh & Đồng Bộ Lịch (Cổng 443 - Không Bị Chặn)
              </h4>
              <span className={`px-2 py-0.2 rounded-full text-[9px] font-black tracking-wide ${
                isSubscribed 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {isSubscribed ? 'ĐANG BẬT' : 'CHƯA BẬT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Nổ chuông màn hình khóa điện thoại/PC, đồng bộ iPhone Calendar không lo timeout cổng SMTP.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Nút Bật thông báo màn hình khóa */}
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isSubscribed
                ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{isSubscribed ? 'Đã Bật Thông Báo' : 'Bật Thông Báo Màn Hình Khóa'}</span>
          </button>

          {/* 2. Nút Test thông báo */}
          <button
            type="button"
            onClick={handleTestPush}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Gửi ngay 1 thông báo thử nghiệm"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
            <span>Test Thông Báo (3s)</span>
          </button>

          {/* 3. Nút Đồng bộ Lịch */}
          {webcalUrl ? (
            <a
              href={webcalUrl}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="Đồng bộ trực tiếp vào ứng dụng Lịch iPhone/Mac"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Đồng Bộ Lịch (.ics)</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleCopyCalendar}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã Chép Link' : 'Sao Chép Link Lịch'}</span>
            </button>
          )}

          {/* Cài đặt chi tiết */}
          <button
            type="button"
            onClick={() => setCurrentView('notifications')}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            title="Mở toàn bộ tùy chỉnh nâng cao"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notice && (
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
          {notice}
        </div>
      )}
    </div>
  );
}
export default QuickNotificationWidget;
