import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { Lock, ArrowLeft, Mail, ShieldCheck, Eye, EyeOff, ShieldAlert, CheckCircle2, UserPlus, User, KeyRound } from 'lucide-react';

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
        password: String(regPassword)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'login' && 'Đăng nhập hệ thống'}
              {mode === 'register' && 'Khởi tạo tài khoản mới'}
              {mode === 'forgot' && 'Khôi phục mật khẩu'}
              {mode === 'reset' && 'Đặt lại mật khẩu'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              LifeOS Enterprise Management Platform
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Khởi tạo tài khoản
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
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
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
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl transition-all shadow-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>

              {/* Quick Login Helper */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Tài khoản sẵn có (Nhấn để đăng nhập ngay):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setEmail('tailieuonthithptqgxin@gmail.com');
                      setPassword('Admin@123456');
                      executeLogin('tailieuonthithptqgxin@gmail.com', 'Admin@123456');
                    }}
                    className="p-2.5 bg-purple-50/70 hover:bg-purple-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-purple-200 dark:border-slate-700 hover:border-purple-400 rounded-xl text-left transition-all group cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <div className="font-bold text-xs text-purple-600 dark:text-purple-400 group-hover:text-purple-700 flex items-center justify-between">
                      <span>⚡ Email của bạn</span>
                      <span className="text-[10px] font-medium bg-purple-600 text-white px-1.5 py-0.5 rounded">Vào ngay</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1">tailieuonthithptqgxin@gmail.com</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Admin@123456</div>
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setEmail('admin@lifeos.com');
                      setPassword('Admin@123456');
                      executeLogin('admin@lifeos.com', 'Admin@123456');
                    }}
                    className="p-2.5 bg-blue-50/70 hover:bg-blue-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 hover:border-blue-400 rounded-xl text-left transition-all group cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <div className="font-bold text-xs text-blue-600 dark:text-blue-400 group-hover:text-blue-700 flex items-center justify-between">
                      <span>👑 Admin LifeOS</span>
                      <span className="text-[10px] font-medium bg-blue-600 text-white px-1.5 py-0.5 rounded">Vào ngay</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1">admin@lifeos.com</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Admin@123456</div>
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setEmail('user@test.com');
                      setPassword('User@123456');
                      executeLogin('user@test.com', 'User@123456');
                    }}
                    className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-emerald-200 dark:border-slate-700 hover:border-emerald-400 rounded-xl text-left transition-all group cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 flex items-center justify-between">
                      <span>👤 Người dùng</span>
                      <span className="text-[10px] font-medium bg-emerald-600 text-white px-1.5 py-0.5 rounded">Vào ngay</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-1">user@test.com</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">User@123456</div>
                  </button>
                </div>
              </div>
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
