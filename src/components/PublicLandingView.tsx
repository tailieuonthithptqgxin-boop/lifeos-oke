import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Headphones, 
  Users, 
  Bell, 
  Gift, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Play, 
  Pause, 
  RefreshCw, 
  Star, 
  Laptop, 
  Shield, 
  MessageSquare, 
  DollarSign, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  TrendingUp,
  Award,
  Share2,
  Check
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { getStoredReferralCode, saveReferralTracking } from '../lib/referralTracker';
import { notifyAuthSecurity } from '../lib/unifiedNotificationEngine';
import { analyticsTracker } from '../lib/analyticsTracker';
import { toast } from '../lib/toast';

interface PublicLandingViewProps {
  onLoginClick?: (initialMode?: 'login' | 'register') => void;
  onNavigateLegal?: (page: 'privacy' | 'terms' | 'cookies' | 'refund') => void;
  initialError?: string | null;
}

// Google Official 4-Color Vector Icon
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function PublicLandingView({ onLoginClick, onNavigateLegal, initialError }: PublicLandingViewProps) {
  const { login, language, setLanguage } = useAppStore();
  const isVi = language !== 'en';

  // Referral code state
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Smart Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inputRefCode, setInputRefCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(() => {
    if (initialError) return initialError;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const l = p.get('login');
      const reason = p.get('reason');
      const errMap: Record<string, string> = {
        google_cancelled: 'Bạn đã hủy đăng nhập bằng Google.',
        google_state_mismatch: 'Phiên đăng nhập Google hết hạn hoặc không khớp cookie/domain. Vui lòng thử lại.',
        google_token_exchange_failed: 'Không thể trao đổi mã xác thực với Google (sai Client Secret hoặc Redirect URI).',
        google_server_error: 'Máy chủ gặp sự cố khi xử lý Google OAuth.',
        google_init_error: 'Google OAuth chưa được cấu hình Client ID chính xác trên máy chủ.',
        google_not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ (thiếu biến môi trường).',
        google_profile_fetch_failed: 'Không thể lấy thông tin hồ sơ từ tài khoản Google.',
        google_email_unverified: 'Tài khoản Google của bạn chưa được xác minh email.',
        account_locked: 'Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá nhiều lần.',
      };
      if (l && errMap[l]) {
        return reason ? `${errMap[l]} (${reason})` : errMap[l];
      }
    }
    return null;
  });
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) {
      setAuthError(initialError);
      setIsAuthModalOpen(true);
    }
  }, [initialError]);

  useEffect(() => {
    if (authError) {
      setIsAuthModalOpen(true);
    }
  }, [authError]);

  // Interactive Micro-Demo States
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break'>('focus');
  const [streakDays] = useState(14);
  const [completedDemoTask, setCompletedDemoTask] = useState(false);

  // 1. Capture referral code from URL or LocalStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef) {
        saveReferralTracking(urlRef);
        setReferralCode(urlRef.toUpperCase());
        setInputRefCode(urlRef.toUpperCase());
      } else {
        const stored = getStoredReferralCode();
        if (stored) {
          setReferralCode(stored);
          setInputRefCode(stored);
        }
      }

      // Track landing page visit
      analyticsTracker.trackFeatureView('landing_page_view', 'Trang chủ LifeOS');
    }
  }, []);

  // 2. Interactive Pomodoro timer simulation
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSeconds((prev) => {
          if (prev <= 1) {
            if (pomodoroPhase === 'focus') {
              setPomodoroPhase('break');
              toast.show('🎉 Đã hoàn thành 25 phút tập trung! Bắt đầu 5 phút nghỉ ngơi.', 'success', 'Pomodoro', 4000);
              return 5 * 60;
            } else {
              setPomodoroPhase('focus');
              toast.show('⚡ Hết giờ nghỉ! Bắt đầu hiệp tập trung tiếp theo.', 'info', 'Pomodoro', 4000);
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroRunning, pomodoroPhase]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Open Auth modal with specified tab
  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
    if (referralCode && !inputRefCode) {
      setInputRefCode(referralCode);
    }
    setIsAuthModalOpen(true);
  };

  // 3. Handle Submit (Login / Register / Forgot Password)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === 'login') {
      if (!emailOrUsername.trim()) {
        setAuthError('Vui lòng nhập Email hoặc Tên đăng nhập của bạn.');
        return;
      }
      if (!password) {
        setAuthError('Vui lòng nhập mật khẩu.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiCall<{
          success: boolean;
          message?: string;
          user: any;
          token?: string;
        }>('/api/auth/login', 'POST', {
          identifier: emailOrUsername.trim(),
          emailOrUsername: emailOrUsername.trim(),
          password
        });

        if (res.success && res.user) {
          if (res.token) {
            try { localStorage.setItem('token', res.token); } catch {}
          }
          toast.show(`Chào mừng bạn trở lại, ${res.user.name || 'bạn'}!`, 'success', 'Đăng nhập thành công');
          notifyAuthSecurity('LOGIN_SUCCESS', res.user.email || emailOrUsername.trim(), res.user.name).catch(() => {});
          analyticsTracker.trackFeatureView('auth_login_success');
          await login(res.user, res.token, 'study');
          setIsAuthModalOpen(false);
        } else {
          setAuthError(res.message || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
        }
      } catch (err: any) {
        setAuthError(err.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại sau giây lát!');
      } finally {
        setIsSubmitting(false);
      }
    } else if (authMode === 'register') {
      if (!name.trim()) {
        setAuthError('Vui lòng nhập họ và tên của bạn.');
        return;
      }
      if (!emailOrUsername.trim()) {
        setAuthError('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      if (!password || password.length < 8) {
        setAuthError('Mật khẩu phải có độ dài tối thiểu 8 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại!');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiCall<{
          success: boolean;
          message?: string;
          user: any;
          token?: string;
        }>('/api/auth/register', 'POST', {
          name: name.trim(),
          email: emailOrUsername.trim().toLowerCase(),
          password,
          referralCode: inputRefCode.trim().toUpperCase() || undefined
        });

        if (res.success && res.user) {
          if (res.token) {
            try { localStorage.setItem('token', res.token); } catch {}
          }
          toast.show('Chúc mừng bạn đã tạo tài khoản thành công! Không gian LifeOS của bạn đã sẵn sàng.', 'success', 'Đăng ký thành công');
          notifyAuthSecurity('REGISTER_SUCCESS', res.user.email || emailOrUsername.trim(), res.user.name).catch(() => {});
          analyticsTracker.trackFeatureView('auth_register_success');
          await login(res.user, res.token, 'study');
          setIsAuthModalOpen(false);
        } else {
          setAuthError(res.message || 'Không thể tạo tài khoản. Vui lòng thử lại!');
        }
      } catch (err: any) {
        setAuthError(err.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại sau giây lát!');
      } finally {
        setIsSubmitting(false);
      }
    } else if (authMode === 'forgot') {
      if (!emailOrUsername.trim()) {
        setAuthError('Vui lòng nhập email đăng ký để nhận liên kết khôi phục.');
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await apiCall<{ success: boolean; message?: string }>('/api/auth/forgot-password', 'POST', {
          email: emailOrUsername.trim().toLowerCase()
        });
        if (res.success) {
          setAuthSuccess(res.message || 'Đã gửi liên kết khôi phục mật khẩu về hòm thư Gmail của bạn. Vui lòng kiểm tra hộp thư đến!');
        } else {
          setAuthError(res.message || 'Không tìm thấy tài khoản với email này.');
        }
      } catch (err: any) {
        setAuthError(err.message || 'Lỗi gửi yêu cầu khôi phục. Vui lòng thử lại!');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // 4. One-Tap Quick Guest Trial Account (Zero-friction demo)
  const handleQuickDemoTrial = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const demoRand = Math.random().toString(36).substring(2, 7);
      const demoEmail = `guest_${demoRand}@lifeos.vn`;
      const demoPassword = `DemoPass@${demoRand}2026`;

      const res = await apiCall<{
        success: boolean;
        message?: string;
        user: any;
        token?: string;
      }>('/api/auth/register', 'POST', {
        name: `Khách Trải Nghiệm #${demoRand.toUpperCase()}`,
        email: demoEmail,
        password: demoPassword,
        referralCode: inputRefCode.trim().toUpperCase() || undefined
      });

      if (res.success && res.user) {
        if (res.token) {
          try { localStorage.setItem('token', res.token); } catch {}
        }
        toast.show('Đang đưa bạn vào không gian trải nghiệm trực tiếp...', 'success', 'Dùng thử 1 chạm');
        await login(res.user, res.token);
        setIsAuthModalOpen(false);
      } else {
        setAuthError(res.message || 'Không thể tạo tài khoản trải nghiệm nhanh. Vui lòng thử lại!');
      }
    } catch (err: any) {
      // Zero-friction local trial fallback if network/ISP temporarily blocks API call
      console.warn('[QuickDemoTrial] Falling back to instant local trial workspace:', err?.message || err);
      const localRand = Math.random().toString(36).substring(2, 7);
      const localTrialUser: any = {
        id: `local_guest_${localRand}`,
        name: `Khách Trải Nghiệm #${localRand.toUpperCase()}`,
        email: `guest_${localRand}@lifeos.vn`,
        username: `guest_${localRand}`,
        role: 'USER',
        plan: 'PRO',
        status: 'ACTIVE',
        onboardingCompleted: true,
        authProvider: 'local-trial',
      };
      toast.show(
        'Đã kích hoạt không gian Trải Nghiệm Nhanh trên thiết bị của bạn!',
        'success',
        'Dùng thử 1 chạm'
      );
      await login(localTrialUser);
      setIsAuthModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth redirect with pre-flight verification (never silently bounces back to /)
  const handleGoogleAuth = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);
    try {
      const cfg = await apiCall<{
        enabled?: boolean;
        hasClientId?: boolean;
        hasClientSecret?: boolean;
        redirectUri?: string;
        authUrl?: string;
        mode?: string;
      }>('/api/auth/google/config', 'GET', undefined, { timeoutMs: 4500, maxRetries: 0 });

      if (!cfg?.enabled) {
        const missing = [
          cfg?.hasClientId === false ? 'GOOGLE_CLIENT_ID' : '',
          cfg?.hasClientSecret === false ? 'GOOGLE_CLIENT_SECRET' : '',
        ].filter(Boolean).join(', ') || 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET';
        const hintUri = cfg?.redirectUri || `${window.location.origin}/api/auth/google/callback`;
        console.error('[Google OAuth Pre-flight] Disabled:', cfg);
        setAuthError(
          `Đăng nhập Google chưa được bật: thiếu ${missing} trên máy chủ (${cfg?.mode || 'server'}). Redirect URI cần khai báo trên Google Cloud Console: ${hintUri}`
        );
        setIsSubmitting(false);
        return;
      }

      if (cfg?.authUrl) {
        window.location.href = cfg.authUrl;
        return;
      }

      window.location.assign('/api/auth/google');
    } catch (err: any) {
      console.error('[Google OAuth Pre-flight] Config check failed:', err);
      setAuthError(
        `Không thể kết nối cổng xác thực Google (/api/auth/google/config): ${err?.message || 'Lỗi kết nối'}.`
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden w-full">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[400px] sm:h-[550px] bg-gradient-to-tr from-emerald-400/15 via-teal-400/10 to-indigo-500/10 dark:from-emerald-900/25 dark:via-teal-950/20 dark:to-indigo-950/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[900px] -left-20 w-[450px] h-[450px] bg-teal-300/10 dark:bg-emerald-950/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[2000px] -right-20 w-[500px] h-[500px] bg-indigo-300/10 dark:bg-indigo-950/20 blur-[140px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* 01. STICKY HEADER GỌN NHẸ (MOBILE-FIRST) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Trial Badge */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img 
              src="/logo.png" 
              alt="LifeOS Logo - Hệ Điều Hành Quản Lý Học Tập và Cuộc Sống" 
              width="36"
              height="36"
              decoding="async"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform" 
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                Life<span className="text-emerald-600 dark:text-emerald-400">OS</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 uppercase tracking-wide">
                <Gift className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>Miễn Phí</span>
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
              title="Đổi ngôn ngữ hiển thị"
            >
              <span className="text-xs">🌐</span>
              <span className="uppercase text-[11px]">{language}</span>
            </button>

            {/* Login button (subtle) */}
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>

            {/* Primary CTA (High visual hierarchy) */}
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="min-h-[44px] px-4 sm:px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Bắt đầu ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CTV REFERRAL WELCOME BANNER (IF ACTIVE) */}
      {/* ========================================================================= */}
      {referralCode && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white py-2.5 px-4 text-xs font-semibold shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <Gift className="w-4 h-4 shrink-0 text-emerald-200 animate-bounce" />
              <span className="truncate">
                🎁 Bạn đang được mời tham gia với mã ưu đãi <span className="font-extrabold underline font-mono">{referralCode}</span> — Hãy tạo tài khoản để bắt đầu nhé!
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="shrink-0 px-3 py-1 rounded-lg bg-white text-emerald-800 font-extrabold text-[11px] hover:bg-emerald-50 transition-colors shadow-xs"
            >
              Nhận ngay
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TẦNG 1: HERO SECTION ẤN TƯỢNG TRONG 3 GIÂY */}
      {/* ========================================================================= */}
      <section className="pt-10 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-10">
        {/* Modern Glassmorphic Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-tight mb-6 shadow-xs animate-in fade-in duration-500">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>✨ Không gian Học tập, Quản lý Thời gian & Kết nối thế hệ mới</span>
        </div>

        {/* Primary Title (H1) Mobile-Optimized */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.2] sm:leading-[1.18] mb-5 max-w-4xl mx-auto">
          Làm chủ cuộc sống, tối ưu học tập & <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
            đánh thức tiềm năng mỗi ngày
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Nền tảng tất cả trong một dành cho học sinh, sinh viên và người trẻ: Đồng hồ Pomodoro thông minh, Báo cáo Deadline tự động qua Gmail và Cộng đồng cùng rèn luyện chuỗi lửa kỷ luật.
        </p>

        {/* Primary & Secondary Dual CTA Buttons (Height >= 48px for thumb comfort) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-10">
          <button
            type="button"
            onClick={() => openAuth('register')}
            className="w-full sm:w-auto min-h-[50px] px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <span>🚀 Bắt đầu miễn phí ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => openAuth('login')}
            className="w-full sm:w-auto min-h-[50px] px-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🔑 Đã có tài khoản? Đăng nhập</span>
          </button>
        </div>

        {/* Social Proof & Metrics */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>10.000+ Người dùng năng động</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Duy trì chuỗi học tập mỗi ngày</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0" />
            <span>100% Miễn phí không quảng cáo</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 2: KHUNG MÔ PHỎNG TRỰC QUAN (INTERACTIVE VISUAL PREVIEW) */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto pb-16 sm:pb-24">
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl p-4 sm:p-8 space-y-6">
          {/* Frame Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2">lifeos.vn/workspace</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              ● Trực quan thời gian thực
            </span>
          </div>

          {/* 3 Showcase Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: Interactive Pomodoro Timer Preview */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center justify-between text-center relative overflow-hidden group">
              <div className="w-full flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  Đồng Hồ Tập Trung
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Hiệp 1/4
                </span>
              </div>

              {/* Timer Dial with Play/Pause Interaction */}
              <div className="relative my-3 flex flex-col items-center justify-center">
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {formatTimer(pomodoroSeconds)}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-1">
                  {pomodoroPhase === 'focus' ? '🎧 Đang trong hiệp học sâu' : '☕ Giờ nghỉ ngơi 5 phút'}
                </span>
              </div>

              {/* Control Trigger */}
              <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Bấm thử để trải nghiệm:</span>
                <button
                  type="button"
                  onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPomodoroRunning 
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  }`}
                >
                  {isPomodoroRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Tạm dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Chạy thử</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Streak Flame & Motivation Level */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white dark:from-slate-800/60 dark:to-slate-900/60 border border-amber-200/60 dark:border-slate-700/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                  Chuỗi Kỷ Luật (Streak)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Top 5%
                </span>
              </div>

              <div className="my-3 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-500">{streakDays}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">ngày liên tiếp 🔥</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn đã không bỏ lỡ ngày học nào trong 2 tuần qua. Giữ vững ngọn lửa nhiệt huyết!
                </p>
                {/* XP Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Cấp độ 5: Hiệp Sĩ Tập Trung</span>
                    <span>850 / 1.000 XP</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Nhận ngay huy hiệu Tuần Chăm Chỉ</span>
              </div>
            </div>

            {/* Card 3: Automated Gmail & Web Deadline Notification */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-800/60 dark:to-slate-900/60 border border-blue-200/60 dark:border-slate-700/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Bell className="w-3.5 h-3.5" />
                  Báo Cáo Deadline Tự Động
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Gmail & Web
                </span>
              </div>

              {/* Simulated Notification Box */}
              <div className="my-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    ⏰ Đề Án Tốt Nghiệp / Báo Cáo
                  </span>
                  <span className="text-[10px] font-mono text-rose-500 font-bold shrink-0">
                    Còn 2 giờ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Đã tự động gửi email nhắc nhở theo 3 mốc (Trước 2h - 1h - 30p) đến Gmail của bạn.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check className="w-3 h-3" />
                  <span>Đã đồng bộ hòm thư cá nhân</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span>Không bao giờ lo muộn deadline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 3: LƯỚI BENTO GIỚI THIỆU HỆ SINH THÁI CHỨC NĂNG (BENTO GRID) */}
      {/* ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto pb-16 sm:pb-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Hệ sinh thái thông minh <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              cho một ngày hiệu quả
            </span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tất cả các công cụ bạn cần để tập trung, làm việc và duy trì kỷ luật được gom gọn trong một ứng dụng duy nhất.
          </p>
        </div>

        {/* Bento Grid Layout (1 col on mobile, 3 cols bento on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Bento 1: Large Feature (Span 2 cols on Desktop) */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 border border-emerald-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="max-w-md space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                1. Phòng Học Ảo & Nhạc Lo-Fi Tập Trung
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Học chung trực tiếp cùng bạn bè và cộng đồng sinh viên cả nước. Tích hợp nhạc Lo-fi không lời, âm thanh mưa rơi, đồng hồ Pomodoro đồng bộ và cơ chế chống ghost tự động.
              </p>
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Giữ chuỗi lửa học tập (Streak) tăng trưởng đều đặn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Bảng xếp hạng Top học tập vinh danh mỗi tuần</span>
                </li>
              </ul>
            </div>
            {/* Decorative subtle visual */}
            <div className="mt-6 md:mt-0 md:absolute md:right-6 md:bottom-6 w-full md:w-56 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 backdrop-blur-md shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Đang phát trực tiếp</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  🎧
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Chilling Lo-Fi Beats</div>
                  <div className="text-[10px] text-slate-500 truncate">1.420 bạn đang học cùng</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento 2: Automated Schedule & Deadlines */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                2. Thời Gian Biểu & Báo Cáo Deadline
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Lên lịch học trực quan và thông minh. Tự động gửi thư nhắc hẹn qua Gmail trước 2 giờ, 1 giờ và 30 phút, đảm bảo không bao giờ trễ nộp bài.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              <span>Gửi thư chuẩn Gmail chuyên nghiệp</span>
            </div>
          </div>

          {/* Bento 3: Gen Z Community & Anonymous Chat */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                3. Cộng Đồng Gen Z & Tâm Sự Ẩn Danh
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Không gian mạng xã hội học đường văn minh. Chia sẻ ghi chú, trao đổi kinh nghiệm thi cử và giải tỏa căng thẳng với kênh tâm sự ẩn danh bảo mật.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" />
              <span>Kết nối bạn học cùng tiến bộ</span>
            </div>
          </div>

          {/* Bento 4: Affiliate & QR Commissions (Span 2 cols on Desktop) */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 border border-amber-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="max-w-md space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                4. Cộng Tác Viên & Hoa Hồng QR Tức Thì
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Chia sẻ link giới thiệu độc quyền với bạn bè. Theo dõi số dư trực tiếp, quét mã VietQR tự động để nhận thanh toán hoa hồng minh bạch, nhanh chóng và công bằng.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  ✓ Hoa hồng lên tới 25%
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  ✓ Rút tiền về mọi ngân hàng qua VietQR
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 4: CHÂN TRANG (FOOTER) TỐI GIẢN KÈM NÚT KÊU GỌI HÀNH ĐỘNG */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Pre-footer Call to Action */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Sẵn sàng nâng cấp năng suất của bạn ngay hôm nay?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Gia nhập cộng đồng hơn 10.000 học sinh, sinh viên đang làm chủ thời gian và đạt điểm số mơ ước cùng LifeOS.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="min-h-[50px] px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>🚀 Bắt đầu miễn phí ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="LifeOS Logo" width="20" height="20" className="w-5 h-5 object-contain" />
              <span>© 2026 Life OS. Nền tảng Quản lý Cuộc sống & Học tập Toàn diện.</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold">
              <button
                type="button"
                onClick={() => onNavigateLegal?.('privacy')}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Chính sách bảo mật
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('terms')}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Điều khoản dịch vụ
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('cookies')}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Chính sách Cookie
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('refund')}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Chính sách hoàn tiền
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 05. SMART AUTH MODAL / BOTTOM SHEET (SIÊU MƯỢT 1 CHẠM - 100DVH MOBILE-FIRST) */}
      {/* ========================================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto p-6 sm:p-8 space-y-5 animate-in slide-in-from-bottom-6 duration-300 relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

            {/* Modal Header & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="LifeOS Logo" width="28" height="28" className="w-7 h-7 object-contain" />
                <span className="font-extrabold text-base text-slate-900 dark:text-white">LifeOS Workspace</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Mode Switcher (Tab Đăng Nhập / Đăng Ký) */}
            {authMode !== 'forgot' && (
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    authMode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Đăng Ký Mới
                </button>
              </div>
            )}

            {/* Title / Description */}
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {authMode === 'login' && 'Chào mừng bạn trở lại!'}
                {authMode === 'register' && 'Khởi tạo tài khoản LifeOS'}
                {authMode === 'forgot' && 'Khôi phục mật khẩu qua Gmail'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {authMode === 'login' && 'Đăng nhập để đồng bộ thời gian biểu, mục tiêu và chuỗi lửa học tập.'}
                {authMode === 'register' && 'Nhận ngay 7 ngày Dùng thử Miễn phí toàn bộ tính năng cao cấp.'}
                {authMode === 'forgot' && 'Nhập địa chỉ email đăng ký để nhận mã khôi phục an toàn.'}
              </p>
            </div>

            {/* Error & Success Messages */}
            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Quick 1-Tap Google Button */}
            {authMode !== 'forgot' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-3 shadow-xs active:scale-98 transition-all cursor-pointer"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Tiếp tục với tài khoản Google</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                  <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Hoặc bằng thông tin tài khoản
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {/* Name field (Register only) */}
              {authMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Họ và tên của bạn <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full min-h-[48px] pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Email / Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {authMode === 'login' ? 'Email hoặc Tên đăng nhập' : 'Địa chỉ Email'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={authMode === 'login' ? 'text' : 'email'}
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder={authMode === 'login' ? 'you@email.com hoặc username' : 'you@email.com'}
                    className="w-full min-h-[48px] pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              {authMode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthError(null);
                        }}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full min-h-[48px] pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (Register only) */}
              {authMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full min-h-[48px] pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Referral Code (Register only) */}
              {authMode === 'register' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mã giới thiệu (Không bắt buộc)
                    </label>
                    {referralCode && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Tự động nhận diện
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inputRefCode}
                      onChange={(e) => setInputRefCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã CTV nếu có (ví dụ: BANBE2026)"
                      className="w-full min-h-[48px] pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    {authMode === 'login' && <span>Đăng nhập vào LifeOS</span>}
                    {authMode === 'register' && <span>Tạo tài khoản & Bắt đầu ngay</span>}
                    {authMode === 'forgot' && <span>Gửi mã khôi phục qua Gmail</span>}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* One-Tap Quick Guest Demo */}
            {authMode !== 'forgot' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleQuickDemoTrial}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>⚡ Dùng thử nhanh 1 chạm (Không cần tạo tài khoản)</span>
                </button>
              </div>
            )}

            {/* Back to Login link if in Forgot Mode */}
            {authMode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  ← Quay lại màn hình Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
