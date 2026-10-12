import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { Lock, ArrowLeft, Mail, ShieldCheck, Eye, EyeOff, ShieldAlert, CheckCircle2, UserPlus, User, KeyRound, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onBack: () => void;
}

export function LoginView({ onBack }: LoginViewProps) {
  const { login } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
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

  // Forgot & Reset fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const cleanEmail = loginEmail.trim();
      // Do NOT trim password as per security standards
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await apiCall('/api/auth/forgot-password', 'POST', {
        email: forgotEmail.trim()
      });
      setSuccessMsg(res.message || 'Hướng dẫn đặt lại mật khẩu đã được gửi.');
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setMode('reset');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
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
      const res = await apiCall('/api/auth/reset-password', 'POST', {
        token: resetToken.trim(),
        newPassword: String(newPassword)
      });
      setSuccessMsg(res.message || 'Đặt lại mật khẩu thành công! Hãy đăng nhập lại.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setError('');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf5ff] via-[#fdf2f8] to-[#f0fdfa] dark:from-slate-950 dark:via-[#110e1c] dark:to-[#1a1028] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-300 hover:text-pink-600 mb-6 transition-all px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 border border-purple-100/70 dark:border-purple-900/40 shadow-xs btn-squishy"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Quay lại trang chủ ✨</span>
        </button>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100/80 dark:border-purple-900/50 p-6 sm:p-8 card-cute">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-300 p-0.5 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/25 animate-pulse-soft">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-pink-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'login' && 'Chào mừng trở lại! ✨'}
              {mode === 'register' && 'Khởi tạo tài khoản mới 🌸'}
              {mode === 'forgot' && 'Khôi phục mật khẩu 🔑'}
              {mode === 'reset' && 'Đặt lại mật khẩu mới 🛡️'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-600/80 dark:text-purple-300/80 font-bold mt-1">
              LifeOS · Cute & Smart Life Operating System
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-violet-50/80 dark:bg-slate-800/80 border border-purple-150/40 dark:border-purple-900/30 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all btn-squishy ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 btn-squishy ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                Tạo tài khoản
              </button>
            </div>
          )}

          {/* Notifications */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs sm:text-sm font-medium border border-red-100 dark:border-red-900/60 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-medium border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Login Shortcut Buttons for Admin & Test User */}
          {mode === 'login' && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-800/80 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-800/50 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-purple-900 dark:text-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  <span>Đăng Nhập Nhanh (Dành cho Quản Trị & Test)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-purple-200/70 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
                  1-Click
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setEmail('admin@lifeos.com');
                    setPassword('Admin@123456');
                    executeLogin('admin@lifeos.com', 'Admin@123456');
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-slate-800 border-2 border-violet-300 dark:border-violet-700 hover:border-violet-500 text-left transition-all shadow-xs group cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                      Admin
                    </span>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                      SUPERADMIN
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                    admin@lifeos.com
                  </div>
                  <div className="text-[10px] text-violet-500 dark:text-violet-400 font-semibold mt-0.5 group-hover:underline">
                    Bấm để đăng nhập ngay →
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setEmail('user@lifeos.com');
                    setPassword('User@123456');
                    executeLogin('user@lifeos.com', 'User@123456');
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-slate-800 border-2 border-pink-300 dark:border-pink-700 hover:border-pink-500 text-left transition-all shadow-xs group cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-pink-600" />
                      User
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                      MEMBER PRO
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                    user@lifeos.com
                  </div>
                  <div className="text-[10px] text-pink-500 dark:text-pink-400 font-semibold mt-0.5 group-hover:underline">
                    Bấm để đăng nhập ngay →
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* LOGIN VIEW */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
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
                    className="text-xs text-purple-600 hover:text-pink-600 dark:text-purple-400 font-bold transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-violet-50/30 dark:bg-slate-800/60 border border-purple-150/60 dark:border-purple-800/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-pink-500/25 mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm btn-squishy"
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>{isLoading ? 'Đang xác thực... ✨' : 'Đăng nhập ngay ✨'}</span>
              </button>
            </form>
          )}

          {/* REGISTER VIEW */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa chỉ Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="nguyenvana@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu (tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Xác nhận mật khẩu *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Mã giới thiệu (nếu có)</span>
                  <span className="text-[10px] text-purple-600 font-bold">Nhận ưu đãi bạn bè ✨</span>
                </label>
                <div className="relative">
                  <span className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 font-bold text-xs">🎁</span>
                  <input
                    type="text"
                    value={regReferralCode}
                    onChange={e => setRegReferralCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="LIFE-XXXXXX"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Đang khởi tạo tài khoản...' : 'Khởi tạo tài khoản mới'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Nhập địa chỉ email của bạn để nhận liên kết hoặc mã khôi phục mật khẩu.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <KeyRound className="w-4 h-4" />
                {isLoading ? 'Đang gửi...' : 'Gửi mã khôi phục'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Quay lại Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD VIEW */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã khôi phục (Reset Token)
                </label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  placeholder="Nhập mã khôi phục..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <KeyRound className="w-4 h-4" />
                {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Xác thực an toàn với PostgreSQL Session & HttpOnly Cookie.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
