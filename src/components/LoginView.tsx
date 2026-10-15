import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
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
  Copy,
  Check,
  RefreshCw,
  Timer,
  Flame,
  Star,
  Trophy,
  Target
} from 'lucide-react';

interface LoginViewProps {
  onBack: () => void;
}

export function LoginView({ onBack }: LoginViewProps) {
  const { login } = useAppStore();
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('resetToken') || params.get('token') || '';
    }
    return '';
  });
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('resetToken') || params.get('token')) {
        return 'reset';
      }
      if (localStorage.getItem('lifeos_reset_ticket')) {
        return 'forgot';
      }
    }
    return 'login';
  });
  const [isLoading, setIsLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regReferralCode, setRegReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    }
    return '';
  });

  // Admin-Approved Password Reset Flow States (Session-Bound Token)
  const [resetStep, setResetStep] = useState<'REQUEST' | 'PENDING' | 'CONFIRM'>('REQUEST');
  const [ticketCode, setTicketCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lifeos_reset_ticket') || '';
    }
    return '';
  });
  const [claimToken, setClaimToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lifeos_reset_claim_token') || '';
    }
    return '';
  });
  const [forgotEmail, setForgotEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lifeos_reset_email') || '';
    }
    return '';
  });
  const [verificationNote, setVerificationNote] = useState('');
  const [backupPin, setBackupPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const cleanEmail = loginEmail.trim();
      const rawPassword = String(loginPass);

      const res = await apiCall('/api/auth/login', 'POST', {
        email: cleanEmail,
        password: rawPassword
      });

      if (res.token) {
        try { localStorage.setItem('token', res.token); } catch (e) {}
      }

      await login(res.user);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.';
      if (err?.status === 429) {
        msg = 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc liên hệ Admin.';
      } else if (err?.status === 403) {
        msg = err.message || 'Tài khoản của bạn đã bị tạm khóa hoặc vô hiệu hóa.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu bảo mật tối thiểu 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
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

      if (res.token) {
        try { localStorage.setItem('token', res.token); } catch (e) {}
      }

      setSuccessMsg('Khởi tạo tài khoản thành công! Đang chuyển tiếp vào không gian làm việc...');
      await login(res.user);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.message || 'Không thể khởi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check active reset request on mount or mode change
  useEffect(() => {
    if (mode === 'forgot' || mode === 'reset') {
      const storedTicket = localStorage.getItem('lifeos_reset_ticket');
      const storedToken = localStorage.getItem('lifeos_reset_claim_token');
      const storedEmail = localStorage.getItem('lifeos_reset_email');
      if (storedEmail && !forgotEmail) {
        setForgotEmail(storedEmail);
      }
      if (storedTicket) {
        checkResetStatus(storedTicket, storedToken || undefined);
      }
    }
  }, [mode]);

  // Polling when in PENDING state (every 5s)
  useEffect(() => {
    let interval: any = null;
    if ((mode === 'forgot' || mode === 'reset') && resetStep === 'PENDING' && ticketCode) {
      interval = setInterval(() => {
        checkResetStatus(ticketCode, claimToken || undefined, backupPin || undefined, true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, resetStep, ticketCode, claimToken, backupPin]);

  // Expiration countdown when in CONFIRM state
  useEffect(() => {
    let timer: any = null;
    if (resetStep === 'CONFIRM' && expiresAt) {
      const updateRemaining = () => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) {
          setRemainingTime('00:00 (Hết hạn)');
          setError('Phiên đặt lại mật khẩu đã hết hạn sau 30 phút. Vui lòng tạo yêu cầu mới.');
          setResetStep('REQUEST');
          try {
            localStorage.removeItem('lifeos_reset_ticket');
            localStorage.removeItem('lifeos_reset_claim_token');
          } catch (e) {}
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setRemainingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }
      };
      updateRemaining();
      timer = setInterval(updateRemaining, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resetStep, expiresAt]);

  const checkResetStatus = async (ticket: string, token?: string, pin?: string, isBackground = false) => {
    if (!isBackground) setIsCheckingStatus(true);
    try {
      const res = await apiCall('/api/auth/reset-status', 'POST', {
        ticketCode: ticket,
        claimToken: token,
        backupPin: pin
      });

      if (res && res.success) {
        setTicketCode(res.ticketCode);
        if (res.expiresAt) setExpiresAt(res.expiresAt);

        if (res.canSetNewPassword) {
          setResetStep('CONFIRM');
          setMode('reset');
          setError('');
        } else if (res.status === 'PENDING') {
          setResetStep('PENDING');
          setMode('forgot');
        } else if (res.status === 'EXPIRED') {
          setError('Yêu cầu đã hết hạn. Vui lòng gửi yêu cầu mới.');
          handleClearResetSession();
        } else if (res.status === 'REJECTED') {
          setError(res.message || 'Yêu cầu của bạn đã bị Quản trị viên từ chối.');
          handleClearResetSession();
        }
      }
    } catch (err: any) {
      if (!isBackground) {
        setError(err?.message || 'Không thể kiểm tra trạng thái yêu cầu.');
      }
    } finally {
      if (!isBackground) setIsCheckingStatus(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (showPinInput) {
      if (!ticketCode.trim()) {
        setError('Vui lòng nhập Mã yêu cầu (VD: RST-8392)');
        return;
      }
      if (!backupPin.trim()) {
        setError('Vui lòng nhập Mã PIN 6 số do Admin cung cấp');
        return;
      }
      await checkResetStatus(ticketCode.trim(), undefined, backupPin.trim());
      return;
    }

    if (!forgotEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiCall('/api/auth/reset-request', 'POST', {
        email: forgotEmail.trim(),
        verificationNote: verificationNote.trim() || undefined,
        claimToken: claimToken || undefined
      });

      if (res && res.success) {
        setTicketCode(res.ticketCode);
        setClaimToken(res.claimToken);
        setResetStep('PENDING');
        try {
          localStorage.setItem('lifeos_reset_ticket', res.ticketCode);
          localStorage.setItem('lifeos_reset_claim_token', res.claimToken);
          localStorage.setItem('lifeos_reset_email', forgotEmail.trim());
        } catch (e) {}

        setSuccessMsg(res.message || 'Yêu cầu khôi phục mật khẩu đã được gửi đến Admin.');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReset = async () => {
    if (ticketCode) {
      try {
        await apiCall('/api/auth/reset-cancel', 'POST', {
          ticketCode,
          claimToken
        });
      } catch (e) {}
    }
    handleClearResetSession();
    setError('');
    setSuccessMsg('Đã hủy yêu cầu khôi phục mật khẩu.');
  };

  const handleClearResetSession = () => {
    try {
      localStorage.removeItem('lifeos_reset_ticket');
      localStorage.removeItem('lifeos_reset_claim_token');
      localStorage.removeItem('lifeos_reset_email');
    } catch (e) {}
    setTicketCode('');
    setClaimToken('');
    setBackupPin('');
    setExpiresAt(null);
    setResetStep('REQUEST');
  };

  const handleCopyTicket = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiCall('/api/auth/reset-confirm', 'POST', {
        ticketCode,
        claimToken: claimToken || undefined,
        backupPin: backupPin || undefined,
        newPassword: String(newPassword)
      });

      if (res && res.success) {
        setSuccessMsg(res.message || 'Đặt lại mật khẩu thành công! Hãy đăng nhập lại.');
        handleClearResetSession();
        setTimeout(() => {
          setMode('login');
          if (forgotEmail) setEmail(forgotEmail);
          setPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          setError('');
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center p-3.5 sm:p-6 font-sans w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="w-full max-w-5xl min-w-0">
        
        {/* Top Back to Home Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 sm:mb-6 transition-colors px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Quay lại trang chủ</span>
        </button>

        {/* 2-Column Auth Card: Laptop (5/12 + 7/12) vs Mobile (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-[#E2E8F0] dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* ========================================================================= */}
          {/* CỘT TRÁI (5/12 Laptop, 12/12 Mobile): FORM ĐĂNG NHẬP / ĐĂNG KÝ / RESET */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Mobile-Only Mascot Greeting Banner */}
              <div className="lg:hidden flex items-center gap-2.5 p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs mb-4">
                <span className="text-xl">⭐</span>
                <div className="leading-tight">
                  <span className="font-bold block">Bé Lumi chào bạn!</span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Đăng nhập để duy trì chuỗi Streak nhé!</span>
                </div>
              </div>

              {/* Header Title */}
              <div className="text-center lg:text-left mb-6">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-3 shadow-2xs border ${
                  (mode === 'forgot' || mode === 'reset') && resetStep === 'PENDING'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                }`}>
                  {(mode === 'forgot' || mode === 'reset') ? (
                    resetStep === 'PENDING' ? <Clock className="w-5 h-5 stroke-[2]" /> :
                    resetStep === 'CONFIRM' ? <CheckCircle2 className="w-5 h-5 stroke-[2]" /> :
                    <KeyRound className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <Zap className="w-5 h-5 stroke-[2] fill-current" />
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
                  {mode === 'login' && 'Chào mừng trở lại'}
                  {mode === 'register' && 'Khởi tạo tài khoản'}
                  {(mode === 'forgot' || mode === 'reset') && (
                    resetStep === 'CONFIRM'
                      ? 'Đặt lại mật khẩu'
                      : resetStep === 'PENDING'
                      ? 'Đang chờ Admin duyệt'
                      : 'Khôi phục mật khẩu'
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                  {(mode === 'forgot' || mode === 'reset')
                    ? 'Quy trình bảo mật xác thực Admin (Không cần SMTP)'
                    : 'LifeOS · Productivity & Life Operating System'}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              {(mode === 'login' || mode === 'register') && (
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-5">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 stroke-[2]" />
                    Tạo tài khoản
                  </button>
                </div>
              )}

              {/* Error and Success Notifications */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900/60 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs font-medium border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email hoặc Tên đăng nhập
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="email@example.com hoặc username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Mật khẩu
                      </label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold transition-colors cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Lock className="w-4 h-4 stroke-[2]" />
                    <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập ngay'}</span>
                  </button>
                </form>
              )}

              {/* REGISTER FORM */}
              {mode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Họ và tên *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Địa chỉ Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="nguyenvana@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mật khẩu (tối thiểu 6 ký tự) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Xác nhận mật khẩu *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Mã giới thiệu (nếu có)</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Nhận ưu đãi</span>
                    </label>
                    <input
                      type="text"
                      value={regReferralCode}
                      onChange={e => setRegReferralCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs sm:text-sm text-slate-900 dark:text-white"
                      placeholder="LIFE-XXXXXX"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Đang khởi tạo tài khoản...' : 'Khởi tạo tài khoản mới'}</span>
                  </button>
                </form>
              )}

              {/* ADMIN-APPROVED PASSWORD RESET FLOW (3 DYNAMIC STATES) */}
              {(mode === 'forgot' || mode === 'reset') && (
                <div className="space-y-4">
                  {/* STATE 1: FORM GỬI YÊU CẦU HOẶC NHẬP PIN */}
                  {resetStep === 'REQUEST' && (
                    <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                      {!showPinInput ? (
                        <>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span>Quy trình duyệt qua Quản trị viên</span>
                            </p>
                            <p>
                              Hệ thống không yêu cầu email SMTP. Khi gửi yêu cầu, Admin sẽ nhận thông báo để phê duyệt phiên làm việc hoặc cấp mã PIN 6 số cho bạn.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Địa chỉ Email của bạn *
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={forgotEmail}
                                onChange={e => setForgotEmail(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                                placeholder="email@example.com"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Ghi chú xác minh danh tính (Tùy chọn)
                            </label>
                            <textarea
                              value={verificationNote}
                              onChange={e => setVerificationNote(e.target.value)}
                              rows={2}
                              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs text-slate-900 dark:text-white"
                              placeholder="VD: Tên tài khoản là Minh, số điện thoại đuôi 89, hoặc lý do cần reset..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>{isLoading ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Cho Admin'}</span>
                          </button>

                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => { setShowPinInput(true); setError(''); setSuccessMsg(''); }}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                            >
                              Bạn đã có Mã PIN 6 số từ Admin? Nhập mã ngay →
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                            <p className="font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Kích hoạt qua Mã PIN dự phòng</span>
                            </p>
                            <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                              Nhập Mã vé yêu cầu (#RST-XXXX) và Mã PIN 6 số do Quản trị viên cấp qua Zalo/Telegram/Phone để mở khóa đặt lại mật khẩu.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Mã Yêu Cầu (Ticket Code) *
                            </label>
                            <input
                              type="text"
                              value={ticketCode}
                              onChange={e => setTicketCode(e.target.value.toUpperCase())}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs sm:text-sm text-slate-900 dark:text-white uppercase"
                              placeholder="RST-8392"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              Mã PIN 6 số từ Admin *
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              value={backupPin}
                              onChange={e => setBackupPin(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center tracking-widest text-lg font-bold text-slate-900 dark:text-white"
                              placeholder="••••••"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading || isCheckingStatus}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                          >
                            {isCheckingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{isCheckingStatus ? 'Đang kiểm tra mã...' : 'Xác thực & Đặt lại Mật khẩu'}</span>
                          </button>

                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => { setShowPinInput(false); setError(''); setSuccessMsg(''); }}
                              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                            >
                              ← Quay lại gửi yêu cầu qua Email
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  )}

                  {/* STATE 2: ĐANG CHỜ ADMIN PHÊ DUYỆT (WAITING ROOM) */}
                  {resetStep === 'PENDING' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Đang chờ Admin phê duyệt...</span>
                        </div>

                        <div className="pt-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Mã Phiếu Yêu Cầu Của Bạn:</span>
                          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                            <span className="font-mono font-bold text-base text-slate-900 dark:text-white tracking-wider">
                              #{ticketCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTicket(ticketCode)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-0.5"
                              title="Sao chép mã phiếu"
                            >
                              {copiedTicket ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                          Trình duyệt này đã được gắn mã phiên xác thực an toàn. Bạn có thể giữ tab này mở (hệ thống tự động kiểm tra mỗi 5 giây) hoặc gửi mã phiếu trên cho Quản trị viên.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => checkResetStatus(ticketCode, claimToken, backupPin || undefined)}
                          disabled={isCheckingStatus}
                          className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:bg-slate-800"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                          <span>{isCheckingStatus ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelReset}
                          className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl text-xs cursor-pointer hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          Hủy yêu cầu
                        </button>
                      </div>

                      {/* Out-of-band PIN manual trigger */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <details className="group">
                          <summary className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline list-none flex items-center justify-between">
                            <span>Nhận được Mã PIN 6 số từ Admin?</span>
                            <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-3 space-y-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={backupPin}
                              onChange={e => setBackupPin(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-white"
                              placeholder="Nhập PIN 6 số..."
                            />
                            <button
                              type="button"
                              onClick={() => checkResetStatus(ticketCode, claimToken, backupPin)}
                              disabled={isCheckingStatus || backupPin.length < 6}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                            >
                              Xác minh PIN & Mở Khóa
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}

                  {/* STATE 3: ĐẶT LẠI MẬT KHẨU MỚI (APPROVED) */}
                  {resetStep === 'CONFIRM' && (
                    <form onSubmit={handleResetSubmit} className="space-y-3.5 animate-in fade-in duration-200">
                      <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Admin đã duyệt vé #{ticketCode}</span>
                        </div>
                        {remainingTime && (
                          <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-slate-900/70 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 tabular-nums">
                            {remainingTime}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Mật khẩu mới (tối thiểu 6 ký tự) *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Xác nhận mật khẩu mới *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-xs mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isLoading ? 'Đang cập nhật mật khẩu...' : 'Cập nhật Mật khẩu & Đăng nhập'}</span>
                      </button>
                    </form>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                    >
                      ← Quay lại Đăng nhập
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Security Note */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 justify-center lg:justify-start">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Xác thực an toàn với PostgreSQL Session & HttpOnly Cookie.</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CỘT PHẢI (7/12 Laptop, ẨN TRÊN MOBILE): KHUNG TRUYỀN CẢM HỨNG & BÉ LUMI */}
          {/* ========================================================================= */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-8 lg:p-10 bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-amber-50/30 dark:from-emerald-950/40 dark:via-slate-900 dark:to-amber-950/20 border-l border-slate-200/80 dark:border-slate-800">
            {/* Top: Mascot Lumi Greeting */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/80 flex items-center justify-center text-3xl shadow-sm shrink-0">
                  ⭐
                </div>
                <div className="relative bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-sm">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                    <span>Bé Lumi</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Companion
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    "Chào mừng bạn trở lại! Hôm nay chúng ta cùng chinh phục 3 mục tiêu cốt lõi nhé!"
                  </p>
                </div>
              </div>

              {/* Motivational Tag */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                  ⚡ Tiến Trình Kỷ Luật Số
                </span>
              </div>
            </div>

            {/* Middle: Live Gamification Preview Card */}
            <div className="my-6 p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cấp Độ Hiện Tại</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    Cấp 2 · Initiator
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold">
                  <Flame className="w-4 h-4 fill-current text-amber-500" />
                  <span>7 ngày Streak</span>
                </div>
              </div>

              {/* XP Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tiến độ lên Cấp 3</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">80 / 100 XP</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[80%]" />
                </div>
              </div>

              {/* Mini Today's 3 Pillars Preview */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  3 Việc Cốt Lõi Hôm Nay (The Rule of 3)
                </span>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>1. Hoàn thành 1 việc cốt lõi hôm nay</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0" />
                  <span>2. Tập trung sâu Pomodoro 25 phút</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 shrink-0" />
                  <span>3. Uống đủ 2L nước & Ôn từ vựng</span>
                </div>
              </div>
            </div>

            {/* Bottom: Quote & Branding */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="italic">"Kỷ luật không phải là sự gò bó, mà là tự do để chạm tới ước mơ."</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">LifeOS v2.0</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
