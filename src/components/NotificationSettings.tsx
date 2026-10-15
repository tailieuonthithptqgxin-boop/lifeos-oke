import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Share2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Unlink,
  Smartphone,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { useAppStore } from '../lib/store';

// Helper function to convert Base64 URL-safe string to Uint8Array for PushManager
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

export function NotificationSettings() {
  const { currentUser } = useAppStore();

  // Settings & Status State
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [revokingCalendar, setRevokingCalendar] = useState(false);
  const [disconnectingMessenger, setDisconnectingMessenger] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Web Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState('');
  const [deviceCount, setDeviceCount] = useState(0);

  // iOS Safari PWA detection
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  // Calendar & Messenger Data
  const [calendarToken, setCalendarToken] = useState('');
  const [calendarFeedUrl, setCalendarFeedUrl] = useState('');
  const [webcalUrl, setWebcalUrl] = useState('');
  const [messengerConnected, setMessengerConnected] = useState(false);
  const [messengerConnectedAt, setMessengerConnectedAt] = useState<string | null>(null);
  const [messengerBotUrl, setMessengerBotUrl] = useState('');

  // Preferences State
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(30);
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(true);
  const [morningSummaryTime, setMorningSummaryTime] = useState('08:00');
  const [channelWebPush, setChannelWebPush] = useState(true);
  const [channelMessenger, setChannelMessenger] = useState(true);
  const [channelCalendar, setChannelCalendar] = useState(true);

  // Countdown timer for test push
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    // 1. Detect Push & Service Worker Support
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setPushSupported(isSupported);
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }

    // 2. Detect iOS Safari & PWA standalone mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsIosSafari(isIos);
    setIsStandalone(inStandalone);

    // 3. Load backend settings
    loadSettings();
    checkExistingSubscription();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/notifications/settings');
      if (res && res.success) {
        setVapidPublicKey(res.vapidPublicKey || '');
        setCalendarToken(res.calendarToken || '');
        setCalendarFeedUrl(res.calendarFeedUrl || '');
        setWebcalUrl(res.webcalUrl || '');
        setMessengerConnected(!!res.messengerConnected);
        setMessengerConnectedAt(res.messengerConnectedAt || null);
        setMessengerBotUrl(res.messengerBotUrl || '');
        setDeviceCount(res.deviceCount || 0);

        if (res.preference) {
          setLeadTimeMinutes(res.preference.leadTimeMinutes ?? 30);
          setMorningSummaryEnabled(res.preference.morningSummaryEnabled ?? true);
          setMorningSummaryTime(res.preference.morningSummaryTime || '08:00');
          setChannelWebPush(res.preference.channelWebPush ?? true);
          setChannelMessenger(res.preference.channelMessenger ?? true);
          setChannelCalendar(res.preference.channelCalendar ?? true);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load notification settings:', err.message);
      setStatusMsg({ text: 'Không thể tải cấu hình thông báo: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    } catch (e) {
      // ignore
    }
  };

  // Toggle Web Push Subscription
  const handleTogglePush = async () => {
    if (!pushSupported) {
      setStatusMsg({
        text: 'Trình duyệt hiện tại không hỗ trợ Web Push Notification. Hãy sử dụng Chrome, Edge hoặc cài đặt PWA trên Safari.',
        type: 'error'
      });
      return;
    }

    // If iOS Safari not in standalone mode, guide user to add to home screen
    if (isIosSafari && !isStandalone) {
      setShowPwaModal(true);
      return;
    }

    try {
      if (pushSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await apiCall('/api/notifications/push/unsubscribe', 'POST', { endpoint: sub.endpoint });
        }
        setPushSubscribed(false);
        setStatusMsg({ text: 'Đã hủy nhận thông báo đẩy trên thiết bị này.', type: 'success' });
        loadSettings();
      } else {
        // Request permission
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== 'granted') {
          setStatusMsg({
            text: 'Bạn đã từ chối quyền gửi thông báo. Hãy mở Cài đặt trình duyệt (Site Settings) để cấp quyền.',
            type: 'error'
          });
          return;
        }

        // Register/get Service Worker
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js');
        }
        await navigator.serviceWorker.ready;

        if (!vapidPublicKey) {
          throw new Error('Chưa nhận được khóa mã hóa VAPID từ máy chủ.');
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });

        // Send subscription to backend
        const subJson = subscription.toJSON();
        const res = await apiCall('/api/notifications/push/subscribe', 'POST', {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          userAgent: navigator.userAgent
        });

        if (res && res.success) {
          setPushSubscribed(true);
          setStatusMsg({
            text: '🎉 Kích hoạt thông báo đẩy màn hình khóa thành công qua cổng bảo mật HTTPS!',
            type: 'success'
          });
          loadSettings();
        } else {
          throw new Error(res?.message || 'Lỗi đăng ký thông báo đẩy');
        }
      }
    } catch (err: any) {
      console.error('Push toggle error:', err);
      setStatusMsg({ text: 'Lỗi thiết lập thông báo đẩy: ' + err.message, type: 'error' });
    }
  };

  // Test Push Notification after 3s
  const handleTestPush = async () => {
    try {
      setTestingPush(true);
      setTestCountdown(3);

      const interval = setInterval(() => {
        setTestCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      const res = await apiCall('/api/notifications/push/test', 'POST');
      if (res && res.success) {
        setStatusMsg({
          text: '🚀 Tín hiệu test đã được bắn! Hãy khóa màn hình hoặc kiểm tra khay thông báo sau 3 giây.',
          type: 'success'
        });
      } else {
        throw new Error(res?.message || 'Không thể gửi thông báo test');
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi gửi test: ' + err.message, type: 'error' });
    } finally {
      setTimeout(() => setTestingPush(false), 3500);
    }
  };

  // Copy Calendar Link
  const handleCopyLink = () => {
    if (!calendarFeedUrl) return;
    navigator.clipboard.writeText(calendarFeedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    setStatusMsg({ text: '📋 Đã sao chép liên kết lịch .ics cá nhân vào bộ nhớ tạm!', type: 'success' });
  };

  // Revoke Calendar Token
  const handleRevokeCalendar = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đổi mã liên kết Lịch mới? Mọi ứng dụng đang đăng ký link cũ sẽ dừng đồng bộ cho đến khi bạn nhập link mới.')) {
      return;
    }
    try {
      setRevokingCalendar(true);
      const res = await apiCall('/api/notifications/calendar/revoke', 'POST');
      if (res && res.success) {
        setCalendarToken(res.calendarToken);
        setCalendarFeedUrl(res.calendarFeedUrl);
        setWebcalUrl(res.webcalUrl);
        setStatusMsg({ text: '🛡️ Đã tạo mới mã Token và Link đồng bộ lịch an toàn!', type: 'success' });
      } else {
        throw new Error(res?.message || 'Không thể đổi mã');
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi đổi link lịch: ' + err.message, type: 'error' });
    } finally {
      setRevokingCalendar(false);
    }
  };

  // Disconnect Messenger
  const handleDisconnectMessenger = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy liên kết nhận thông báo qua Facebook Messenger?')) {
      return;
    }
    try {
      setDisconnectingMessenger(true);
      const res = await apiCall('/api/notifications/messenger/disconnect', 'POST');
      if (res && res.success) {
        setMessengerConnected(false);
        setMessengerConnectedAt(null);
        setStatusMsg({ text: 'Đã hủy liên kết Facebook Messenger thành công.', type: 'success' });
      } else {
        throw new Error(res?.message || 'Không thể hủy liên kết');
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi hủy liên kết: ' + err.message, type: 'error' });
    } finally {
      setDisconnectingMessenger(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      const res = await apiCall('/api/notifications/settings', 'PUT', {
        leadTimeMinutes,
        morningSummaryEnabled,
        morningSummaryTime,
        channelWebPush,
        channelMessenger,
        channelCalendar
      });
      if (res && res.success) {
        setStatusMsg({ text: '✨ Đã lưu tùy chỉnh thời gian và kênh nhắc việc thành công!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        throw new Error(res?.message || 'Không thể lưu cài đặt');
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi lưu tùy chỉnh: ' + err.message, type: 'error' });
    } finally {
      setSavingPrefs(false);
    }
  };

  // Google Calendar Subscribe Link
  const googleCalendarSubscribeUrl = calendarFeedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarFeedUrl)}`
    : '#';

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Đang tải trung tâm thông báo đa kênh...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 font-sans overflow-x-hidden">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-white border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Railway 100% Free · Cổng HTTPS 443 · Zero SMTP Block</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">Trung Tâm Thông Báo & Nhắc Việc Đa Kênh</h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
            Nhận thông báo tự động nổ trên màn hình khóa điện thoại (Web Push PWA), đồng bộ lịch công việc trực tiếp vào iPhone/Google Calendar (.ics), và nhận tin nhắn nhắc việc qua Facebook Messenger.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Global Status Alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Safari iOS PWA Helper Banner */}
      {isIosSafari && !isStandalone && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Bật Thông Báo Trên iPhone (iOS 16.4+)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                Để nhận thông báo nổ màn hình khóa trên iPhone/iPad, Apple yêu cầu thêm trang web này ra Màn hình chính (Home Screen).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPwaModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Xem Hướng Dẫn Thêm App</span>
          </button>
        </div>
      )}

      {/* SECTION 1: WEB PUSH PWA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  1. Web Push PWA (Nổ Màn Hình Khóa)
                </h3>
                {pushSubscribed ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    ĐANG BẬT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    CHƯA BẬT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Giao tiếp mã hóa chuẩn VAPID qua HTTPS cổng 443. Hoạt động trên Android, iOS (PWA), macOS và Windows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleTogglePush}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                pushSubscribed
                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>{pushSubscribed ? 'Tắt thông báo thiết bị này' : 'Bật thông báo đẩy'}</span>
            </button>
          </div>
        </div>

        {/* Features & Test Push Button */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thiết bị đã kết nối</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {deviceCount} <span className="text-xs font-normal text-slate-500">thiết bị</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quyền trình duyệt</p>
            <p className={`text-sm font-bold mt-1 ${
              pushPermission === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {pushPermission === 'granted' ? '✓ Đã cấp quyền (Granted)' : pushPermission === 'denied' ? '✕ Đã chặn (Denied)' : 'Chờ cấp quyền (Default)'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thử nghiệm liveness</p>
            <button
              type="button"
              onClick={handleTestPush}
              disabled={testingPush || !pushSubscribed}
              className="mt-1 w-full py-1.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              {testingPush ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Bắn test sau {testCountdown ?? 3}s...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi thông báo thử nghiệm</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: CALENDAR SYNC (.ICS FEED) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              2. Đồng Bộ Lịch Cá Nhân (.ics Calendar Feed)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động cập nhật công việc, nhiệm vụ và sự kiện từ LifeOS sang Apple Calendar, Google Calendar, Outlook theo chuẩn RFC 5545 có âm báo trước (VALARM).
            </p>
          </div>
        </div>

        {/* Link display & action buttons */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Đường Dẫn Đăng Ký Lịch (.ics) Cá Nhân Hóa (Bảo mật theo Token)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={calendarFeedUrl || 'Đang tạo liên kết...'}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Đã chép link' : 'Sao chép link'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons: Apple Calendar webcal://, Google Calendar, Revoke Token */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Apple Calendar native sync */}
            <a
              href={webcalUrl || '#'}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <Smartphone className="w-4 h-4" />
              <span>Đồng bộ Lịch iPhone/Mac (webcal://)</span>
            </a>

            {/* Google Calendar subscribe */}
            <a
              href={googleCalendarSubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>Thêm vào Google Calendar</span>
            </a>

            {/* Revoke Token */}
            <button
              type="button"
              onClick={handleRevokeCalendar}
              disabled={revokingCalendar}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              title="Tạo link mới nếu lỡ làm lộ link lịch cá nhân"
            >
              {revokingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Đổi mã link mới (Revoke)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: FACEBOOK MESSENGER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  3. Facebook Messenger Bot
                </h3>
                {messengerConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                    ĐÃ KẾT NỐI
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    CHƯA KẾT NỐI
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhận tin nhắn nhắc việc tự động và tóm tắt buổi sáng trực tiếp trong hộp thư Messenger qua HTTPS cổng 443.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {messengerConnected ? (
              <button
                type="button"
                onClick={handleDisconnectMessenger}
                disabled={disconnectingMessenger}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {disconnectingMessenger ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>Hủy liên kết Messenger</span>
              </button>
            ) : (
              <a
                href={messengerBotUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kết nối Messenger</span>
              </a>
            )}
          </div>
        </div>

        {messengerConnected ? (
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div className="text-xs text-sky-800 dark:text-sky-200 space-y-0.5">
              <p className="font-bold">Tài khoản Messenger của bạn đã được kết nối an toàn với LifeOS!</p>
              <p className="text-sky-600 dark:text-sky-400">
                Thời điểm liên kết: {messengerConnectedAt ? new Date(messengerConnectedAt).toLocaleString('vi-VN') : 'Gần đây'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Cách liên kết đơn giản trong 5 giây:</p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Bấm nút <strong>"Kết nối Messenger"</strong> ở trên để mở khung chat Fanpage.</li>
              <li>Bấm <strong>"Bắt đầu" (Get Started)</strong>. Hệ thống webhook sẽ tự động nhận diện và gán thông báo cho bạn.</li>
            </ol>
          </div>
        )}
      </div>

      {/* SECTION 4: PREFERENCES & LEAD TIMES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              4. Tùy Chỉnh Nhắc Hẹn & Kênh Nhận Tin
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cá nhân hóa thời điểm nhận cảnh báo trước khi sự kiện bắt đầu và kích hoạt bản tin tóm tắt mỗi sáng.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Time Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Thời gian nhắc việc trước hạn (Lead Time)
              </label>
              <select
                value={leadTimeMinutes}
                onChange={(e) => setLeadTimeMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value={15}>Nhắc trước 15 phút</option>
                <option value={30}>Nhắc trước 30 phút (Khuyên dùng)</option>
                <option value={60}>Nhắc trước 60 phút (1 tiếng)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Hệ thống Cronjob sẽ kiểm tra và gửi cảnh báo trước khi deadline hoặc sự kiện bắt đầu đúng khoảng thời gian này.
              </p>
            </div>

            {/* Morning Summary Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bản tin tóm tắt đầu ngày (Morning Briefing)
                </label>
                <input
                  type="checkbox"
                  checked={morningSummaryEnabled}
                  onChange={(e) => setMorningSummaryEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                />
              </div>
              <input
                type="time"
                value={morningSummaryTime}
                disabled={!morningSummaryEnabled}
                onChange={(e) => setMorningSummaryTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-40"
              />
              <p className="text-[11px] text-slate-500">
                Tự động tổng hợp số lượng việc cần làm hôm nay và nổ thông báo vào khung giờ bạn đã chọn.
              </p>
            </div>
          </div>

          {/* Active Channels Checkboxes */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kênh nhận thông báo đang kích hoạt:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelWebPush}
                  onChange={(e) => setChannelWebPush(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Web Push PWA</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelMessenger}
                  onChange={(e) => setChannelMessenger(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Facebook Messenger</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channelCalendar}
                  onChange={(e) => setChannelCalendar(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lịch .ics Feed</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={savingPrefs}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Lưu Cài Đặt Nhắc Hẹn</span>
            </button>
          </div>
        </form>
      </div>

      {/* PWA iOS INSTALL MODAL */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Cài App LifeOS Trên iPhone</h3>
                  <p className="text-[11px] text-slate-500">Để bật thông báo nổ màn hình khóa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPwaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                <p>
                  Mở trang web này bằng trình duyệt <strong>Safari</strong> trên iPhone của bạn.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                <p>
                  Nhấn vào nút <strong>Chia sẻ (Share)</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-500" /> ở thanh công cụ dưới cùng của Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                <p>
                  Cuộn xuống và chọn <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong>, sau đó nhấn <strong>Thêm (Add)</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">4</span>
                <p>
                  Mở ứng dụng LifeOS từ Màn hình chính, quay lại mục này và bật công tắc <strong>"Bật thông báo đẩy"</strong>!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu, quay lại cài đặt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default NotificationSettings;
