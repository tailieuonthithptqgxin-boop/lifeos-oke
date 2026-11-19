import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { getStoredReferralCode, clearStoredReferralCode, saveReferralTracking } from '../lib/referralTracker';
import { notifyAuthSecurity } from '../lib/unifiedNotificationEngine';
import { 
  Lock, 
  ArrowLeft, 
  Mail, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  UserPlus, 
  User, 
  KeyRound, 
  Sparkles, 
  Zap,
  Clock,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield
} from 'lucide-react';

interface LoginViewProps {
  onBack: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
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

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Mật khẩu yếu', color: 'bg-rose-500' };
  if (score === 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Khá mạnh', color: 'bg-blue-500' };
  return { score: 4, label: 'Rất an toàn', color: 'bg-emerald-500' };
}

export function LoginView({ onBack, initialMode, initialError }: LoginViewProps) {
  const { login, language, setLanguage } = useAppStore();
  const isVi = language !== 'en';

  const tView = {
    home: isVi ? 'Trang chủ' : 'Home',
    welcomeBack: isVi ? 'Chào mừng trở lại!' : 'Welcome back!',
    createSpace: isVi ? 'Khởi tạo không gian của bạn' : 'Create your workspace',
    forgotPassword: isVi ? 'Khôi phục mật khẩu' : 'Reset your password',
    resetPassword: isVi ? 'Đặt lại mật khẩu mới' : 'Set new password',
    loginSubtitle: isVi ? 'Đăng nhập để đồng bộ công việc, tài chính và mục tiêu.' : 'Sign in to sync your tasks, finance, and goals.',
    registerSubtitle: isVi ? 'Hệ điều hành tối ưu nhịp sống chuẩn Gen Z hiện đại.' : 'The all-in-one life operating system.',
    forgotSubtitle: isVi ? 'Nhập email đã đăng ký để nhận liên kết xác thực qua Gmail.' : 'Enter your registered email to receive a password reset link.',
    resetSubtitle: isVi ? 'Tạo mật khẩu mới có độ bảo mật cao cho tài khoản của bạn.' : 'Create a strong, secure new password for your account.',
    tabLogin: isVi ? 'Đăng nhập' : 'Sign In',
    tabRegister: isVi ? 'Tạo tài khoản' : 'Create Account',
    continueGoogle: isVi ? 'Tiếp tục với Google' : 'Continue with Google',
    termsNoticePrefix: isVi ? 'Bằng việc tiếp tục với Google, bạn xác nhận đồng ý với' : 'By continuing with Google, you agree to the',
    termsOfService: isVi ? 'Điều khoản dịch vụ' : 'Terms of Service',
    and: isVi ? 'và' : 'and',
    privacyPolicy: isVi ? 'Chính sách bảo mật' : 'Privacy Policy',
    ofLifeOS: isVi ? 'của LifeOS.' : 'of LifeOS.',
    orEmail: isVi ? 'Hoặc bằng email' : 'Or with email',
    emailOrUsername: isVi ? 'Email hoặc Tên đăng nhập' : 'Email or Username',
    password: isVi ? 'Mật khẩu' : 'Password',
    confirmPassword: isVi ? 'Xác nhận mật khẩu' : 'Confirm Password',
    fullName: isVi ? 'Họ và tên' : 'Full Name',
    emailAddress: isVi ? 'Địa chỉ Email' : 'Email Address',
    forgotLink: isVi ? 'Quên mật khẩu?' : 'Forgot password?',
    signInButton: isVi ? 'Đăng nhập vào LifeOS' : 'Sign In to LifeOS',
    authenticating: isVi ? 'Đang xác thực...' : 'Authenticating...',
    creatingAccount: isVi ? 'Đang khởi tạo tài khoản...' : 'Creating account...',
    registerButton: isVi ? 'Khởi tạo tài khoản LifeOS' : 'Create LifeOS Account',
    referralCode: isVi ? 'Mã giới thiệu (không bắt buộc)' : 'Referral code (optional)',
    referralActive: isVi ? 'Mã giới thiệu đã được kích hoạt!' : 'Referral code activated!',
    agreeNotice1: isVi ? 'Tôi xác nhận đã đọc và đồng ý với' : 'I confirm that I have read and agree to the',
    agreeNotice2: isVi ? 'Tôi đồng ý cho phép LifeOS thu thập và xử lý dữ liệu cá nhân theo' : 'I consent to LifeOS collecting and processing personal data under',
    sendResetLink: isVi ? 'Gửi liên kết khôi phục' : 'Send Reset Link',
    sending: isVi ? 'Đang gửi...' : 'Sending...',
    backToLogin: isVi ? 'Quay lại đăng nhập' : 'Back to Sign In',
    saveNewPassword: isVi ? 'Lưu mật khẩu mới' : 'Save New Password',
    saving: isVi ? 'Đang lưu...' : 'Saving...',
    switchLangTooltip: isVi ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt'
  };

  // Mode state: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('resetToken') || (params.get('token') && !params.get('login'))) return 'reset';
      if (params.get('mode') === 'register') return 'register';
      if (params.get('mode') === 'forgot') return 'forgot';
    }
    return initialMode || 'login';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const l = p.get('login');
      if (l === 'google_cancelled') return 'Bạn đã hủy đăng nhập bằng Google.';
      if (l === 'google_state_mismatch') return 'Phiên đăng nhập Google hết hạn hoặc không khớp. Vui lòng thử lại.';
      if (l === 'google_token_exchange_failed') return 'Không thể trao đổi mã xác thực với Google.';
      if (l === 'google_server_error') return 'Máy chủ gặp sự cố khi xử lý Google OAuth.';
      if (l === 'google_init_error') return 'Google OAuth chưa được cấu hình Client ID chính xác trên máy chủ.';
      if (l === 'account_locked') return 'Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá nhiều lần.';
      if (p.get('google_error')) return decodeURIComponent(p.get('google_error') || 'Lỗi kết nối Google');
    }
    return null;
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regReferralCode, setRegReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref') || params.get('affiliate') || params.get('aff');
      if (urlRef) {
        saveReferralTracking(urlRef);
        return urlRef.trim().toUpperCase();
      }
      return getStoredReferralCode() || '';
    }
    return '';
  });
  const [regAgreeTerms, setRegAgreeTerms] = useState(false);
  const [regAgreePrivacy, setRegAgreePrivacy] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSentSuccess, setForgotSentSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset Password state
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('resetToken') || (!params.get('login') ? params.get('token') : '') || '';
    }
    return '';
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [tokenVerifyState, setTokenVerifyState] = useState<'IDLE' | 'VERIFYING' | 'VALID' | 'INVALID'>('IDLE');
  const [tokenInvalidReason, setTokenInvalidReason] = useState<string>('');
  const [resetComplete, setResetComplete] = useState(false);

  // Reset loading state on mount & back/forward cache navigation
  useEffect(() => {
    setIsLoading(false);
    const handlePageShow = () => setIsLoading(false);
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Cooldown countdown for resending forgot password
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Pre-flight check reset token validity if user opens /?resetToken=...
  useEffect(() => {
    if (mode === 'reset' && resetToken) {
      verifyResetToken(resetToken);
    }
  }, [mode, resetToken]);

  const verifyResetToken = async (tok: string) => {
    setTokenVerifyState('VERIFYING');
    try {
      const res = await apiCall(`/api/auth/verify-reset-token?token=${encodeURIComponent(tok.trim())}`, 'GET');
      if (res && res.valid) {
        setTokenVerifyState('VALID');
        setError(null);
      } else {
        setTokenVerifyState('INVALID');
        setTokenInvalidReason(res?.message || 'Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.');
      }
    } catch (err: any) {
      setTokenVerifyState('INVALID');
      setTokenInvalidReason(err?.message || 'Không thể xác thực mã token.');
    }
  };

  // Sync external OAuth callback errors into inline banner so errors are never hidden
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // Google Sign-In with pre-flight config check so it never silently bounces to /
  const handleGoogleSignIn = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const cfg = await apiCall<{
        enabled?: boolean;
        hasClientId?: boolean;
        hasClientSecret?: boolean;
        redirectUri?: string;
        mode?: string;
      }>('/api/auth/google/config', 'GET', undefined, { timeoutMs: 4500, maxRetries: 0 });

      if (!cfg?.enabled) {
        const missing = [
          cfg?.hasClientId === false ? 'GOOGLE_CLIENT_ID' : '',
          cfg?.hasClientSecret === false ? 'GOOGLE_CLIENT_SECRET' : '',
        ].filter(Boolean).join(', ') || 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET';
        const hintUri = cfg?.redirectUri || `${window.location.origin}/api/auth/google/callback`;
        const msg = `Đăng nhập Google chưa sẵn sàng: thiếu biến môi trường ${missing} trên máy chủ (${cfg?.mode || 'server'}). Sau khi thêm biến, đảm bảo Authorized redirect URI trên Google Cloud Console có: ${hintUri}`;
        console.error('[Google OAuth Pre-flight] Disabled:', cfg);
        setError(msg);
        setIsLoading(false);
        return;
      }

      window.location.assign('/api/auth/google');
    } catch (err: any) {
      console.error('[Google OAuth Pre-flight] Failed to verify /api/auth/google/config:', err);
      setError(
        `Không thể kết nối tới cổng xác thực Google (/api/auth/google/config): ${err?.message || 'Lỗi máy chủ'}. Vui lòng kiểm tra cấu hình Cloudflare Worker / Backend.`
      );
      setIsLoading(false);
    }
  };

  // One-click quick login for admin / testing
  const handleQuickAdminLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const res = await apiCall('/api/auth/login', 'POST', {
        identifier: 'admin@lifeos.com',
        password: 'Admin@123456'
      });
      if (res?.token) {
        try { localStorage.setItem('token', res.token); } catch (e) {}
      }
      setSuccessMsg('Đăng nhập Quản Trị Viên thành công! Đang vào hệ thống...');
      await login(res.user);
    } catch (err: any) {
      console.error('Quick admin login error:', err);
      setError(err?.message || 'Không thể đăng nhập tự động. Vui lòng thử đăng nhập thủ công.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanInput = loginEmail.trim();
    if (!cleanInput) {
      setError('Vui lòng nhập Email hoặc Tên đăng nhập.');
      return;
    }
    if (!loginPassword) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const storedRef = getStoredReferralCode();
      const res = await apiCall('/api/auth/login', 'POST', {
        identifier: cleanInput,
        password: String(loginPassword),
        referralCode: storedRef || undefined
      });

      if (res?.token) {
        try { localStorage.setItem('token', res.token); } catch (e) {}
      }

      if (storedRef) clearStoredReferralCode();
      await login(res.user);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.';
      if (err?.status === 429) {
        msg = 'Tài khoản tạm thời bị khóa do nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!regAgreeTerms || !regAgreePrivacy) {
      setError('Theo Nghị định 13/2023/NĐ-CP, bạn cần đánh dấu đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tạo tài khoản.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Mật khẩu bảo mật phải có tối thiểu 8 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiCall('/api/auth/register', 'POST', {
        name: regName.trim(),
        email: regEmail.trim(),
        password: String(regPassword),
        referralCode: regReferralCode.trim() || undefined
      });

      if (res?.token) {
        try { localStorage.setItem('token', res.token); } catch (e) {}
      }

      clearStoredReferralCode();
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển tiếp vào không gian làm việc...');
      try {
        notifyAuthSecurity('REGISTER_SUCCESS', res.user?.email || regEmail.trim(), res.user?.name || regName.trim()).catch(() => {});
      } catch (e) {}
      await login(res.user);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const clean = forgotEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ đã đăng ký.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiCall('/api/auth/forgot-password', 'POST', {
        email: clean
      });

      setForgotSentSuccess(true);
      setResendCooldown(60); // 60s cooldown
      setSuccessMsg(res?.message || 'Hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư Gmail của bạn.');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err?.message || 'Lỗi gửi yêu cầu khôi phục mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanTok = resetToken.trim();
    if (!cleanTok) {
      setError('Mã token đặt lại mật khẩu không được để trống.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiCall('/api/auth/reset-password', 'POST', {
        token: cleanTok,
        newPassword: String(newPassword)
      });

      setResetComplete(true);
      setSuccessMsg(res?.message || 'Đặt lại mật khẩu thành công!');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err?.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  const regStrength = getPasswordStrength(regPassword);
  const resetStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Top Header & Logo */}
        <div className="flex items-center justify-between mb-6">
          <button type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tView.home}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Quick Language Toggle */}
            <button
              type="button"
              id="btn-login-lang-toggle"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-medium"
              title={tView.switchLangTooltip}
            >
              <span className="text-sm">{language === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
              <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LifeOS v2.0
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/15 via-slate-800 to-indigo-500/15 border border-slate-700/60 mb-3 shadow-inner">
              <img 
                src="/logo.png" 
                alt="LifeOS - Hệ Điều Hành Quản Lý Cá Nhân Toàn Diện" 
                width="40" 
                height="40" 
                decoding="async" 
                className="w-10 h-10 object-contain rounded-xl" 
              />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {mode === 'login' && tView.welcomeBack}
              {mode === 'register' && tView.createSpace}
              {mode === 'forgot' && tView.forgotPassword}
              {mode === 'reset' && tView.resetPassword}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              {mode === 'login' && tView.loginSubtitle}
              {mode === 'register' && tView.registerSubtitle}
              {mode === 'forgot' && tView.forgotSubtitle}
              {mode === 'reset' && tView.resetSubtitle}
            </p>
          </div>

          {/* Quick Segmented Control Tabs (Login / Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tView.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                className={`py-2 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tView.tabRegister}
              </button>
            </div>
          )}

          {/* Google OAuth Button (Visible on Login & Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>{tView.continueGoogle}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={isLoading}
                className="w-full h-11 sm:h-12 flex items-center justify-center gap-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs sm:text-sm rounded-2xl transition-all duration-150 shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                <span>Đăng nhập 1-Chạm (Admin Full Quyền)</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                {tView.termsNoticePrefix}{' '}
                <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">
                  {tView.termsOfService}
                </a>{' '}
                {tView.and}{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">
                  {tView.privacyPolicy}
                </a>{' '}
                {tView.ofLifeOS}
              </p>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {tView.orEmail}
                </span>
              </div>
            </div>
          )}

          {/* Alert Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. LOGIN FORM */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {tView.emailOrUsername}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@lifeos.com"
                    required
                    autoComplete="username"
                    className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {tView.password}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {tView.forgotLink}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-12 min-h-[48px] pl-10 pr-10 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-sm rounded-2xl transition-all duration-150 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{tView.authenticating}</span>
                  </>
                ) : (
                  <>
                    <span>{tView.signInButton}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. REGISTER FORM */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {tView.fullName}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {tView.emailAddress}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isVi ? 'Mật khẩu bảo vệ (Tối thiểu 8 ký tự)' : 'Password (minimum 8 chars)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-12 min-h-[48px] pl-10 pr-10 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1.5 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-200 ${
                            regStrength.score >= step ? regStrength.color : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                      {isVi ? 'Độ mạnh: ' : 'Strength: '}<span className="text-slate-200">{regStrength.label}</span>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {tView.confirmPassword}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                  />
                </div>
              </div>

              {regReferralCode && (
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{tView.referralActive} <strong>{regReferralCode}</strong></span>
                </div>
              )}

              {/* Nghị định 13/2023/NĐ-CP: Khai báo mục đích thu thập & Checkbox đồng ý riêng biệt */}
              <div className="pt-2 pb-1 space-y-2.5 text-left">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Mục đích thu thập dữ liệu (Nghị định 13/2023/NĐ-CP):</span>
                  </div>
                  <p className="text-slate-300">
                    Thông tin tài khoản được thu thập để định danh người dùng, đồng bộ dữ liệu nhiệm vụ và gửi cảnh báo bảo mật. Dữ liệu tài chính và ghi chép của bạn được bảo mật tuyệt đối và không bao giờ chia sẻ cho bên thứ ba.
                  </p>
                </div>

                {/* Checkbox 1: Điều khoản dịch vụ & Hoàn tiền */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none group">
                  <input
                    type="checkbox"
                    checked={regAgreeTerms}
                    onChange={(e) => setRegAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition cursor-pointer shrink-0"
                    required
                  />
                  <span className="text-slate-300 leading-snug">
                    Tôi xác nhận đã đủ từ 15 tuổi trở lên, đã đọc và đồng ý với{' '}
                    <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold hover:underline">
                      Điều khoản dịch vụ
                    </a>{' '}
                    và{' '}
                    <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold hover:underline">
                      Chính sách hoàn tiền
                    </a>.
                  </span>
                </label>

                {/* Checkbox 2: Chính sách bảo mật dữ liệu */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none group">
                  <input
                    type="checkbox"
                    checked={regAgreePrivacy}
                    onChange={(e) => setRegAgreePrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition cursor-pointer shrink-0"
                    required
                  />
                  <span className="text-slate-300 leading-snug">
                    Tôi đồng ý cho phép LifeOS xử lý dữ liệu cá nhân theo{' '}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold hover:underline">
                      Chính sách bảo mật
                    </a>{' '}
                    (Tuân thủ Nghị định 13/2023/NĐ-CP).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !regAgreeTerms || !regAgreePrivacy}
                className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-sm rounded-2xl transition-all duration-150 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{tView.creatingAccount}</span>
                  </>
                ) : (
                  <>
                    <span>{tView.registerButton}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 3. FORGOT PASSWORD (GMAIL OUTBOX DELIVERY) */}
          {/* ========================================================= */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {!forgotSentSuccess ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email tài khoản cần khôi phục
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        required
                        className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-sm rounded-2xl transition-all duration-150 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang gửi qua Gmail...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Gửi liên kết đặt lại mật khẩu</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Sent Success Info Screen */
                <div className="text-center py-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">Kiểm tra hộp thư Gmail của bạn</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Chúng tôi đã gửi hướng dẫn kèm đường dẫn đặt lại mật khẩu đến <strong>{forgotEmail}</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Liên kết có hiệu lực trong 30 phút.</span>
                    </div>
                    <p className="leading-relaxed text-slate-400">
                      💡 Mẹo: Nếu không thấy email trong Hộp thư đến, vui lòng kiểm tra cả mục <strong>Spam / Thư rác</strong> hoặc <strong>Quảng cáo (Promotions)</strong>.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isLoading}
                      onClick={handleForgotSubmit}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Về đăng nhập
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  ← Quay lại màn hình Đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. RESET PASSWORD FORM (TOKEN-BOUND) */}
          {/* ========================================================= */}
          {mode === 'reset' && (
            <div className="space-y-4">
              {/* Token State: Verifying */}
              {tokenVerifyState === 'VERIFYING' && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Đang xác thực liên kết bảo mật...</p>
                </div>
              )}

              {/* Token State: Invalid or Expired */}
              {tokenVerifyState === 'INVALID' && !resetComplete && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Liên kết không hợp lệ hoặc đã hết hạn</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {tokenInvalidReason || 'Mã xác thực chỉ có hiệu lực một lần trong vòng 30 phút kể từ lúc gửi.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Gửi lại yêu cầu mới
                  </button>
                </div>
              )}

              {/* Token State: Completed */}
              {resetComplete && (
                <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Đặt lại mật khẩu thành công!</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Mật khẩu của bạn đã được cập nhật an toàn. Mọi phiên đăng nhập cũ trên các thiết bị khác đã được vô hiệu hóa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    Đăng nhập ngay bây giờ
                  </button>
                </div>
              )}

              {/* Token State: Valid (Allow setting new password) */}
              {(tokenVerifyState === 'VALID' || (!resetToken && tokenVerifyState === 'IDLE')) && !resetComplete && (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {/* Manual token input if token wasn't in URL */}
                  {!resetToken && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Mã xác nhận bảo mật (Token 64 ký tự)
                      </label>
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Dán mã nhận từ email vào đây"
                        required
                        className="w-full h-12 min-h-[48px] px-4 py-2 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mật khẩu mới (Tối thiểu 8 ký tự)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-12 min-h-[48px] pl-10 pr-10 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength meter */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1.5 h-1">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`flex-1 rounded-full transition-all duration-200 ${
                                resetStrength.score >= step ? resetStrength.color : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                          Độ an toàn: <span className="text-slate-200">{resetStrength.label}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-12 min-h-[48px] pl-10 pr-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all duration-150"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base sm:text-sm rounded-2xl transition-all duration-150 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang lưu mật khẩu mới...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Cập nhật mật khẩu & Đăng nhập</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bảo mật chuẩn AES-256 · Mã hóa phiên HTTP-Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
