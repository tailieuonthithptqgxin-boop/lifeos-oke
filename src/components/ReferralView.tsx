import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, Gift, Copy, Check, Share2, Sparkles, DollarSign, 
  ArrowUpRight, ShieldCheck, Clock, CheckCircle2, XCircle, 
  Wallet, ShoppingBag, Building2, CreditCard, User, AlertCircle,
  RefreshCw, X, ChevronRight, ArrowDownRight, QrCode, TrendingUp,
  Award, Trophy, Search, Package, FileText, Send
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { formatCurrency, formatDate } from '../lib/utils';
import { triggerConfetti } from '../lib/confetti';
import { soundEngine } from '../lib/soundEngine';
import { useAppStore } from '../lib/store';
import { toast } from '../lib/toast';
import { PaymentQrSection } from './referral/PaymentQrSection';
import { notifyAffiliateEvent } from '../lib/unifiedNotificationEngine';
import { useSmoothCounter, triggerDelightCelebration } from '../lib/celebrationEngine';

interface ReferredHistoryItem {
  id: string;
  referredUser: { name: string; email: string };
  status: string;
  hasPurchased: boolean;
  createdAt: string;
}

interface CommissionItem {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  rewardAmount: number;
  status: string;
  createdAt: string;
  note?: string;
  customerName?: string;
  customerEmail?: string;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  status: 'PENDING' | 'PAID' | 'REJECTED' | string;
  txReference?: string;
  rejectReason?: string;
  createdAt: string;
  processedAt?: string;
}

interface AffiliateDashboardData {
  referralCode: string;
  referralLink: string;
  commissionRatePercent: number;
  totalReferred: number;
  totalBuyers: number;
  totalSales: number;
  totalCommission: number;
  pendingReward: number;
  approvedReward: number; // Available Balance
  withdrawalPending: number;
  paidReward: number;
  paymentQr?: any | null;
  history: ReferredHistoryItem[];
  commissions: CommissionItem[];
}

const COMMON_BANKS = [
  'MB Bank (Quân Đội)',
  'Vietcombank',
  'Techcombank',
  'ACB (Á Châu)',
  'VPBank',
  'TPBank',
  'BIDV',
  'VietinBank',
  'VIB',
  'Agribank'
];

const CACHE_KEY = 'lifeos_affiliate_dashboard_cache_v2';
const CACHE_TTL_MS = 30 * 1000; // 30s cache TTL to minimize database queries on free tier

export function ReferralView() {
  const { language, currentUser, setCurrentView } = useAppStore();
  const isVi = language === 'vi';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';
  const isAffiliateUser = Boolean(currentUser?.isAffiliate || isAdmin);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'members' | 'history' | 'leaderboard'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'Approved' | 'Pending'>('ALL');

  // Application for non-CTV state
  const [applyNote, setApplyNote] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applySent, setApplySent] = useState(false);

  const handleApplyAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingApply(true);
      const res = await apiCall('/api/referrals/apply', 'POST', { note: applyNote.trim() });
      if (res && res.success) {
        setApplySent(true);
        triggerConfetti();
        soundEngine?.playSuccess?.();
        toast.success(res.message || 'Đã gửi yêu cầu đăng ký CTV thành công!');
      } else {
        toast.error(res?.message || 'Không thể gửi yêu cầu');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi yêu cầu đăng ký CTV');
    } finally {
      setSubmittingApply(false);
    }
  };

  // Copy feedback states with debouncing
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [bankName, setBankName] = useState(() => {
    try {
      const saved = localStorage.getItem('lifeos_affiliate_bank_info');
      if (saved) return JSON.parse(saved).bankName || COMMON_BANKS[0];
    } catch {}
    return COMMON_BANKS[0];
  });
  const [bankAccount, setBankAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('lifeos_affiliate_bank_info');
      if (saved) return JSON.parse(saved).bankAccount || '';
    } catch {}
    return '';
  });
  const [accountHolder, setAccountHolder] = useState(() => {
    try {
      const saved = localStorage.getItem('lifeos_affiliate_bank_info');
      if (saved) return JSON.parse(saved).accountHolder || '';
    } catch {}
    return (currentUser?.name || '').toUpperCase();
  });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Top 5 Affiliates Leaderboard State (Cached for Free tier)
  const [topAffiliates, setTopAffiliates] = useState<any[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);

  // Load dashboard data with 30s client cache optimization
  const loadDashboardData = useCallback(async (forceFresh = false) => {
    try {
      if (!forceFresh && typeof window !== 'undefined') {
        const cachedRaw = sessionStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
              setData(cached.data);
              setWithdrawals(cached.withdrawals || []);
              if (cached.topAffiliates) setTopAffiliates(cached.topAffiliates);
              setLoading(false);
              return;
            }
          } catch {}
        }
      }

      setRefreshing(true);
      const [dashRes, withRes, topRes] = await Promise.all([
        apiCall('/api/referrals/dashboard'),
        apiCall('/api/referrals/withdrawals').catch(() => ({ withdrawals: [] })),
        apiCall('/api/referrals/top').catch(() => ({ topAffiliates: [] }))
      ]);

      if (dashRes && dashRes.success) {
        setData(dashRes);
        const wList = withRes?.withdrawals || [];
        setWithdrawals(wList);
        const tList = topRes?.topAffiliates || [];
        setTopAffiliates(tList);

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              data: dashRes,
              withdrawals: wList,
              topAffiliates: tList
            }));
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('Error loading affiliate dashboard:', err);
      toast.error(err?.message || 'Không thể tải dữ liệu cộng tác viên.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Copy referral link with feedback & sound
  const handleCopyLink = () => {
    if (!data?.referralLink) return;
    try {
      navigator.clipboard.writeText(data.referralLink);
      soundEngine.playSuccess();
      triggerConfetti();
      setCopiedLink(true);
      toast.success(isVi ? 'Đã sao chép link mời thành công!' : 'Referral link copied!');

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedLink(false);
      }, 2500);
    } catch {
      toast.error('Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.');
    }
  };

  // Copy referral code
  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    try {
      navigator.clipboard.writeText(data.referralCode);
      soundEngine.playPop();
      setCopiedCode(true);
      toast.success(isVi ? `Đã sao chép mã mời: ${data.referralCode}` : `Copied code: ${data.referralCode}`);

      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // Native mobile share if supported
  const handleShareMobile = async () => {
    if (!data?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tham gia LifeOS cùng tôi',
          text: `Nhận 100% trọn bộ tính năng Quản lý cuộc sống, Pomodoro và Phòng học trực tuyến tại LifeOS qua mã ${data.referralCode}:`,
          url: data.referralLink
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  // Open withdrawal modal with initialized amount
  const handleOpenWithdrawModal = () => {
    const available = data?.approvedReward || 0;
    if (available < 50000) {
      toast.info(isVi ? 'Số dư khả dụng tối thiểu để rút tiền là 50.000 ₫' : 'Minimum withdrawal amount is 50,000 ₫');
      return;
    }
    setWithdrawAmount(available);
    setWithdrawError(null);
    setShowWithdrawModal(true);
  };

  // Submit withdrawal request
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const available = data?.approvedReward || 0;
    if (withdrawAmount <= 0) {
      setWithdrawError('Vui lòng nhập số tiền muốn rút.');
      return;
    }
    if (withdrawAmount < 50000) {
      setWithdrawError('Số tiền rút tối thiểu là 50.000 ₫.');
      return;
    }
    if (withdrawAmount > available) {
      setWithdrawError(`Số tiền rút vượt quá số dư khả dụng (${formatCurrency(available)}).`);
      return;
    }
    if (!bankAccount.trim()) {
      setWithdrawError('Vui lòng nhập Số tài khoản ngân hàng.');
      return;
    }
    if (!accountHolder.trim()) {
      setWithdrawError('Vui lòng nhập Tên chủ tài khoản.');
      return;
    }

    try {
      setSubmittingWithdraw(true);
      // Save recent bank info to localStorage
      try {
        localStorage.setItem('lifeos_affiliate_bank_info', JSON.stringify({
          bankName,
          bankAccount: bankAccount.trim(),
          accountHolder: accountHolder.trim().toUpperCase()
        }));
      } catch {}

      const res = await apiCall('/api/referrals/withdraw', 'POST', {
        amount: withdrawAmount,
        bankName,
        bankAccount: bankAccount.trim(),
        accountHolder: accountHolder.trim().toUpperCase()
      });

      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        try {
          notifyAffiliateEvent('WITHDRAWAL_REQUESTED', withdrawAmount, bankName).catch(() => {});
        } catch (e) {}
        toast.success(isVi ? 'Gửi yêu cầu rút tiền thành công! Admin sẽ duyệt và giải ngân sớm.' : 'Withdrawal request submitted successfully!');
        setShowWithdrawModal(false);
        // Clear cache and reload fresh data
        sessionStorage.removeItem(CACHE_KEY);
        loadDashboardData(true);
      }
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setWithdrawError(err?.message || 'Có lỗi xảy ra khi gửi yêu cầu rút tiền. Vui lòng thử lại.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-slate-500 animate-pulse">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-base font-medium">{isVi ? 'Đang tải dữ liệu Cộng tác viên...' : 'Loading affiliate dashboard...'}</p>
      </div>
    );
  }

  const referralCode = data?.referralCode || currentUser?.referralCode || (currentUser as any)?.referral_code || '------';
  const referralLink = data?.referralLink || (typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : `/?ref=${referralCode}`);
  const commissionRate = data?.commissionRatePercent || 20;
  const totalReferred = data?.totalReferred ?? currentUser?.referredCount ?? 0;
  const totalBuyers = data?.totalBuyers || 0;
  const availableBalance = data?.approvedReward ?? currentUser?.commissionBalance ?? 0;

  // Smooth Animated Numbers for Tactile Feedback
  const animatedBalance = useSmoothCounter(availableBalance, 450);
  const animatedReferred = useSmoothCounter(totalReferred, 400);
  const animatedBuyers = useSmoothCounter(totalBuyers, 400);

  // 1. Hệ thống "Tem Danh Hiệu" (Badges) tự động & Đội nhóm gọn nhẹ
  // 0 - 4 khách mua: Tem "Tân Binh"
  // 5 - 19 khách mua: Tem "Chiến Binh"
  // >= 20 khách mua: Tem "Ngôi Sao Xuất Sắc"
  let badgeTitle = 'Tân Binh';
  let badgeEmoji = '🌱';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let nextBadgeTitle = 'Chiến Binh';
  let progressPct = 0;
  let remainingBuyers = 0;

  if (totalBuyers >= 20) {
    badgeTitle = 'Ngôi Sao Xuất Sắc';
    badgeEmoji = '👑';
    badgeColor = 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-700 shadow-xs shadow-amber-500/10 font-black';
    nextBadgeTitle = '';
    progressPct = 100;
    remainingBuyers = 0;
  } else if (totalBuyers >= 5) {
    badgeTitle = 'Chiến Binh';
    badgeEmoji = '⚡';
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700 font-extrabold';
    nextBadgeTitle = 'Ngôi Sao Xuất Sắc';
    progressPct = Math.min(100, Math.round(((totalBuyers - 5) / 15) * 100));
    remainingBuyers = 20 - totalBuyers;
  } else {
    badgeTitle = 'Tân Binh';
    badgeEmoji = '🌱';
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 font-bold';
    nextBadgeTitle = 'Chiến Binh';
    progressPct = Math.min(100, Math.round((totalBuyers / 5) * 100));
    remainingBuyers = 5 - totalBuyers;
  }

  // 2. Thống kê Phân tích Doanh thu (Không dùng biểu đồ)
  const conversionRate = totalReferred > 0 ? ((totalBuyers / totalReferred) * 100).toFixed(1) : '0';

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthSales = (data?.commissions || []).reduce((acc, c) => {
    const d = new Date(c.createdAt);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && c.status === 'Approved') {
      return acc + (c.orderAmount || 0);
    }
    return acc;
  }, 0);
  const lastMonthSales = (data?.commissions || []).reduce((acc, c) => {
    const d = new Date(c.createdAt);
    const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
    if (d.getMonth() === lastM && d.getFullYear() === lastY && c.status === 'Approved') {
      return acc + (c.orderAmount || 0);
    }
    return acc;
  }, 0);
  const isGrowing = thisMonthSales >= lastMonthSales;
  const growthRate = lastMonthSales > 0 
    ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 100) 
    : (thisMonthSales > 0 ? 100 : 0);

  const filteredOrders = (data?.commissions || []).filter(c => {
    if (orderFilter !== 'ALL' && c.status !== orderFilter) return false;
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      c.orderId?.toLowerCase().includes(q) ||
      (c as any).customerName?.toLowerCase().includes(q) ||
      (c as any).customerEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 overflow-x-hidden">
      {/* ======================================================== */}
      {/* ADMIN SHORTCUT BANNER: Dành cho Admin/SuperAdmin quản lý hệ thống CTV */}
      {/* ======================================================== */}
      {isAdmin && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-xl border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">Bạn đang đăng nhập quyền Quản trị viên (Admin)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Cổng Quản Trị
                </span>
              </div>
              <p className="text-xs text-purple-200/90 mt-0.5 leading-relaxed">
                Màn hình dưới đây là trang cá nhân CTV của bạn. Để xem <strong>toàn bộ mạng lưới CTV</strong>, <strong>quét QR duyệt rút hoa hồng</strong> và <strong>cấu hình % hoa hồng</strong>, hãy vào Cổng Admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem('lifeos_admin_active_tab', 'referrals');
              } catch (e) {}
              setCurrentView('admin');
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 border border-purple-300/30"
          >
            <span>👉 Vào Cổng Quản Lý CTV & Duyệt Rút Tiền</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KHỐI ĐĂNG KÝ CTV DÀNH CHO USER CHƯA ĐƯỢC ADMIN CẤP QUYỀN */}
      {!isAffiliateUser && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-200 dark:border-purple-900/50 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Chương Trình Đối Tác & Cộng Tác Viên (Affiliate)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Nhận hoa hồng trọn đời {commissionRate}% trên mỗi đơn hàng và mở khóa Cổng Quản Lý Đơn Hàng chuyên nghiệp.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Golden Benefit Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                💰
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{commissionRate}% Hoa Hồng Trọn Đời</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tự động trích {commissionRate}% mỗi khi người bạn giới thiệu mua bất kỳ gói dịch vụ nào trên hệ thống.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
                📦
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Xem Đơn & Doanh Thu Như Admin</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Có Cổng Quản Lý Đơn Hàng riêng biệt để tra cứu từng đơn phát sinh, số tiền thanh toán và hoa hồng.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Rút Tiền Nhanh Qua QR</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tải ảnh QR ngân hàng trực tiếp và tạo lệnh rút tiền 24/7. Admin duyệt và chuyển tiền trong 24h.
              </p>
            </div>
          </div>

          {/* Account Status & Application CTA */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Tài khoản của bạn hiện là Người dùng thông thường
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Để kích hoạt mã giới thiệu, nhận hoa hồng và mở khóa Cổng Quản Lý Đơn Hàng, Admin cần nâng cấp tài khoản của bạn lên CTV.
                </p>
              </div>
            </div>

            {applySent ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>
                  Yêu cầu của bạn đã được gửi thành công! Quản trị viên (Admin) sẽ xem xét và kích hoạt quyền Cộng Tác Viên cho bạn trong mục Người Dùng.
                </span>
              </div>
            ) : (
              <form onSubmit={handleApplyAffiliate} className="space-y-3 pt-2">
                <input
                  type="text"
                  value={applyNote}
                  onChange={e => setApplyNote(e.target.value)}
                  placeholder="Ghi chú thêm (kênh giới thiệu, SĐT/Zalo của bạn... tùy chọn)"
                  className="w-full h-11 px-4 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingApply ? 'Đang gửi yêu cầu...' : '🚀 Gửi Yêu Cầu Đăng Ký Làm Cộng Tác Viên'}</span>
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* HEADER: HỒ SƠ CTV + TEM DANH HIỆU + TIẾN ĐỘ THĂNG HẠNG */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentUser?.name || 'Cộng tác viên'}
              </h1>
              {/* Tem Danh Hiệu Tự Động */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${badgeColor}`}>
                <span>{badgeEmoji}</span>
                <span>{badgeTitle}</span>
              </span>
              {isAffiliateUser && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700 shadow-2xs">
                  <span>⭐</span>
                  <span>CTV CHÍNH THỨC</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isVi ? `Chương trình Giới thiệu nhận ${commissionRate}% hoa hồng tự động khi bạn bè mua gói.` : `Earn ${commissionRate}% automatic commission on friend upgrades.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[38px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>

        {/* Thanh tiến trình thăng hạng (Progress Bar) */}
        {nextBadgeTitle ? (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                🎯 Thăng hạng tiếp theo: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{nextBadgeTitle}</strong>
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {isVi ? `Cần thêm ${remainingBuyers} khách mua nữa` : `${remainingBuyers} more buyers needed`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full progress-bar-smooth"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Chúc mừng! Bạn đã đạt danh hiệu cao quý nhất: Ngôi Sao Xuất Sắc (👑).</span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TÍNH NĂNG 3: KHUNG TÓM TẮT PHÂN TÍCH DOANH THU (KHÔNG DÙNG BIỂU ĐỒ) */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span>{isVi ? 'Tổng quan Hiệu quả' : 'Performance Overview'}</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Cập nhật thời gian thực</span>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Team của bạn & Tỷ lệ chuyển đổi */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {isVi ? 'Team của bạn' : 'Your Team'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {animatedReferred} <span className="text-xs text-slate-400 font-normal">thành viên</span>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {conversionRate}% mua gói ({animatedBuyers} khách)
            </div>
          </div>

          {/* 2. Doanh thu tháng này */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {isVi ? 'Doanh số tháng này' : 'This Month Sales'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {formatCurrency(thisMonthSales)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {isGrowing ? (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                  +{growthRate}% tăng trưởng
                </span>
              ) : (
                <span className="text-slate-400 text-[10px]">Đang duy trì</span>
              )}
            </div>
          </div>

          {/* 3. Doanh thu tháng trước */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {isVi ? 'Doanh số tháng trước' : 'Last Month'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-300 truncate">
              {formatCurrency(lastMonthSales)}
            </div>
            <p className="text-[10px] text-slate-400">Đối chiếu tăng trưởng</p>
          </div>

          {/* 4. Tổng hoa hồng khả dụng */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block truncate">
              {isVi ? 'Hoa hồng khả dụng' : 'Available Balance'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(animatedBalance)}
            </div>
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Sẵn sàng rút tiền</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* TÍNH NĂNG 1: TẢI ẢNH QR NGÂN HÀNG & RÚT HOA HỒNG SIÊU GỌN */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{isVi ? 'Nhận Hoa Hồng & Mã QR Ngân Hàng' : 'Payout & Bank QR'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Ảnh QR được tự động nén siêu nhẹ (< 50KB) để bảo vệ bộ nhớ và giúp Admin chuyển khoản ngay.' : 'Auto-compressed (<50KB) for instant banking transfers.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>{data?.paymentQr?.qrUrl ? (isVi ? 'Đổi ảnh mã QR' : 'Change QR') : (isVi ? 'Tải ảnh mã QR ngân hàng của bạn' : 'Upload Bank QR')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={availableBalance < 50000}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                availableBalance >= 50000
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-98'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>{isVi ? 'Rút hoa hồng ngay' : 'Withdraw Now'}</span>
            </button>
          </div>
        </div>

        {/* QR Thumbnail Preview & Bank Account Confirmation */}
        {data?.paymentQr?.qrUrl ? (
          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-purple-300 dark:border-purple-700 bg-white shrink-0 shadow-xs">
              <img
                src={data.paymentQr.qrUrl}
                alt="Mã QR VietQR nhận tiền hoa hồng giới thiệu"
                loading="lazy"
                decoding="async"
                width="80"
                height="80"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã tải lên thành công (Đã tối ưu &lt; 50KB)
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {data.paymentQr.bankName} - {data.paymentQr.bankAccount}
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold">
                Chủ thẻ: {data.paymentQr.accountHolder}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Bạn chưa tải ảnh mã QR ngân hàng. Hãy tải lên để Admin quét mã chuyển khoản nhanh chóng.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline shrink-0 cursor-pointer"
            >
              Tải lên ngay →
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* TÍNH NĂNG 4: BẢNG VINH DANH "TOP 5 CỘNG TÁC VIÊN XUẤT SẮC" */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isVi ? 'Bảng Vinh Danh Top 5 CTV Xuất Sắc' : 'Top 5 Affiliates Hall of Fame'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Vinh danh 5 cộng tác viên tạo doanh số cao nhất (Dữ liệu đệm tối ưu tải máy chủ)' : 'Honoring top 5 affiliates by monthly sales'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            Tháng này
          </span>
        </div>

        {/* Desktop Leaderboard Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                <th className="pb-3 text-center w-12">Hạng</th>
                <th className="pb-3">Cộng tác viên</th>
                <th className="pb-3">Danh hiệu</th>
                <th className="pb-3 text-right">Hoa hồng đạt được</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {topAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    {isVi ? 'Chưa có cộng tác viên nào phát sinh doanh số tháng này. Hãy là người đầu tiên bứt phá!' : 'No affiliates on leaderboard yet.'}
                  </td>
                </tr>
              ) : (
                topAffiliates.map((item, idx) => {
                  const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <tr key={`top-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-center font-black text-base">
                        {rankIcon}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.totalBuyers || 0} khách mua</div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                          <span>{item.badge === 'Ngôi Sao Xuất Sắc' ? '👑' : item.badge === 'Chiến Binh' ? '⚡' : '🌱'}</span>
                          <span>{item.badge}</span>
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(item.totalCommission || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Leaderboard Cards (Rule 3) */}
        <div className="md:hidden space-y-2.5">
          {topAffiliates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              {isVi ? 'Chưa có cộng tác viên nào phát sinh doanh số tháng này. Hãy là người đầu tiên bứt phá!' : 'No affiliates on leaderboard yet.'}
            </div>
          ) : (
            topAffiliates.map((item, idx) => {
              const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div
                  key={`top-mobile-${idx}`}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl font-black shrink-0 w-8 text-center">{rankIcon}</span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                          <span>{item.badge === 'Ngôi Sao Xuất Sắc' ? '👑' : item.badge === 'Chiến Binh' ? '⚡' : '🌱'}</span>
                          <span className="truncate">{item.badge}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {item.totalBuyers || 0} khách
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-black text-xs text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(item.totalCommission || 0)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* MODAL TẢI ẢNH QR NGÂN HÀNG (MOBILE BOTTOM SHEET & NÉN CANVAS < 50KB) */}
      {/* ======================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto animate-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle for Mobile */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {isVi ? 'Tải Mã QR Ngân Hàng Nhận Hoa Hồng' : 'Upload Bank QR'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tự động thu nhỏ tối đa 400x400px, nén dưới 50KB để bảo vệ bộ nhớ.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PaymentQrSection
              paymentQr={data?.paymentQr || null}
              onQrUpdated={(updatedQr) => {
                setData((prev) => prev ? { ...prev, paymentQr: updatedQr } : null);
                sessionStorage.removeItem(CACHE_KEY);
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* KHỐI 1: CÔNG CỤ MỜI (Mã mời, Link mời & Nút sao chép to) */}
      {/* ======================================================== */}
      <section className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-7 rounded-3xl border border-emerald-500/20 dark:border-emerald-900/40 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {isVi ? `Hoa hồng trọn đời ${commissionRate}%` : `${commissionRate}% Lifetime Commission`}
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
              {isVi ? 'Mã & Link giới thiệu của bạn' : 'Your Referral Code & Link'}
            </h2>
          </div>

          {/* Prominent Referral Code Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{isVi ? 'Mã của bạn:' : 'Code:'}</span>
            <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
              {referralCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Sao chép mã"
              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Link Input Row */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={referralLink}
              onClick={handleCopyLink}
              className="w-full h-12 px-4 text-base font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl select-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          {/* Big Primary Copy Button (Height >= 44px, Font >= 16px) */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`min-h-[48px] h-12 px-6 flex items-center justify-center gap-2 rounded-2xl text-base font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer ${
              copiedLink
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-5 h-5 shrink-0" />
                <span>{isVi ? 'Đã sao chép link!' : 'Copied Link!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 shrink-0" />
                <span>{isVi ? 'Sao chép Link mời' : 'Copy Invite Link'}</span>
              </>
            )}
          </button>

          {/* Mobile Native Share Option */}
          <button
            type="button"
            onClick={handleShareMobile}
            className="min-h-[48px] h-12 px-4 flex sm:hidden items-center justify-center gap-2 rounded-2xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer active:scale-98"
          >
            <Share2 className="w-5 h-5" />
            <span>{isVi ? 'Chia sẻ' : 'Share'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{isVi ? 'Lưu vết tự động 30 ngày: Khách bấm vào link sẽ được gắn mã vĩnh viễn khi đăng ký tài khoản.' : '30-day tracking: Visitors who click your link are permanently attached to you upon signup.'}</span>
        </p>
      </section>

      {/* ======================================================== */}
      {/* KHỐI 2: THỐNG KÊ NHANH (3 Thẻ số liệu + Nút Yêu cầu rút tiền) */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Tổng người đã vào dùng */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {isVi ? 'Tổng người đã vào dùng' : 'Total Referred Users'}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {totalReferred.toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Card 2: Số khách đã mua */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {isVi ? 'Số khách đã mua' : 'Paying Customers'}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {totalBuyers.toLocaleString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Card 3: Hoa hồng hiện có (VNĐ) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-500/30 dark:border-emerald-800/60 shadow-xs flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">
                {isVi ? 'Hoa hồng hiện có' : 'Available Balance'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(availableBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Row: Nút Yêu cầu rút tiền (Height >= 44px, Chữ >= 16px) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>{isVi ? 'Hạn mức rút tối thiểu:' : 'Min withdrawal:'} <strong>50.000 ₫</strong>. </span>
            <span>{isVi ? 'Giải ngân trực tiếp vào tài khoản ngân hàng trong vòng 24h.' : 'Payout processed within 24h.'}</span>
          </div>

          <button
            type="button"
            onClick={handleOpenWithdrawModal}
            disabled={availableBalance < 50000}
            className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              availableBalance >= 50000
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-98'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-5 h-5 shrink-0" />
            <span>{isVi ? 'Yêu cầu rút tiền' : 'Request Payout'}</span>
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* KHỐI 3: TRUNG TÂM QUẢN TRỊ CTV (Đơn Hàng, Đội Ngũ, Rút Tiền) */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-1.5 gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[44px] py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-purple-500" />
            <span>{isVi ? '📦 Quản lý Đơn hàng' : 'Orders Management'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {data?.commissions?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`min-h-[44px] py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>{isVi ? '👥 Đội ngũ đã mời' : 'Referred Users'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {data?.history?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-[44px] py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>{isVi ? '💳 Lịch sử rút tiền' : 'Payout History'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {(data?.commissions?.length || 0) + (withdrawals.length || 0)}
            </span>
          </button>
        </div>

        {/* Tab 0 Content: Quản lý đơn hàng (Xem đơn hàng giống Admin) */}
        {activeTab === 'orders' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>Danh sách Đơn hàng phát sinh từ Mã giới thiệu</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi thời gian thực các đơn hàng do khách của bạn đặt và hoa hồng {commissionRate}% nhận được.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Tìm mã đơn, email..."
                    className="h-9 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white w-48 sm:w-60"
                  />
                </div>

                <select
                  value={orderFilter}
                  onChange={e => setOrderFilter(e.target.value as any)}
                  className="h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold"
                >
                  <option value="ALL">Tất cả ({data?.commissions?.length || 0})</option>
                  <option value="Approved">Đã duyệt</option>
                  <option value="Pending">Chờ duyệt</option>
                </select>
              </div>
            </div>

            {/* Desktop Orders Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="py-3 px-4">Mã Đơn Hàng</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Khách Hàng (Bảo Mật)</th>
                    <th className="py-3 px-4 text-right">Giá Trị Đơn</th>
                    <th className="py-3 px-4 text-right">Hoa Hồng ({commissionRate}%)</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-4 text-center text-slate-400">
                        <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          {orderSearch ? 'Không tìm thấy đơn hàng phù hợp với từ khóa' : 'Chưa có đơn hàng nào phát sinh'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Khi người dùng đăng ký qua link mời của bạn và thanh toán mua gói, đơn hàng sẽ hiển thị ngay tại đây.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {order.orderId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{(order as any).customerName || 'Khách hàng'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{(order as any).customerEmail || '***@gmail.com'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(order.orderAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(order.rewardAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'Approved' || order.status === 'Paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{order.status === 'Approved' || order.status === 'Paid' ? 'Đã duyệt' : 'Chờ xử lý'}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Orders Cards (Rule 3) */}
            <div className="md:hidden space-y-2.5">
              {filteredOrders.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    {orderSearch ? 'Không tìm thấy đơn hàng' : 'Chưa có đơn hàng nào'}
                  </p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div
                    key={`order-mobile-${order.id}`}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                        {order.orderId}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        order.status === 'Approved' || order.status === 'Paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{order.status === 'Approved' || order.status === 'Paid' ? 'Đã duyệt' : 'Chờ xử lý'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {(order as any).customerName || 'Khách hàng'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(order as any).customerEmail || '***@gmail.com'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">
                          Đơn: {formatCurrency(order.orderAmount)}
                        </div>
                        <div className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(order.rewardAmount)} ({commissionRate}%)
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 1 Content: Danh sách người đã mời */}
        {activeTab === 'members' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(!data?.history || data.history.length === 0) ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  {isVi ? 'Chưa có người dùng nào đăng ký qua mã của bạn' : 'No referred users yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isVi ? 'Hãy sao chép link mời ở trên và chia sẻ cho bạn bè hoặc cộng đồng để bắt đầu nhận hoa hồng!' : 'Copy your invite link above and share it with friends to start earning commissions!'}
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-sm hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{isVi ? 'Sao chép Link mời ngay' : 'Copy Invite Link'}</span>
                </button>
              </div>
            ) : (
              data.history.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.referredUser.name.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {item.referredUser.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.referredUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {/* Status Badge */}
                    {item.hasPurchased ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>{isVi ? 'Đã phát sinh doanh thu' : 'Purchased'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <User className="w-3 h-3" />
                        <span>{isVi ? 'Đang sử dụng' : 'Active User'}</span>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2 Content: Lịch sử hoa hồng & Rút tiền */}
        {activeTab === 'history' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(!data?.commissions || data.commissions.length === 0) && withdrawals.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2 text-slate-500">
                <DollarSign className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Chưa có lịch sử giao dịch' : 'No transactions recorded yet'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isVi ? 'Khi người bạn giới thiệu nâng cấp gói hoặc bạn thực hiện rút tiền, các giao dịch sẽ hiển thị đầy đủ tại đây.' : 'Commissions earned and payout requests will appear here.'}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Withdrawal Requests */}
                {withdrawals.map((w) => {
                  const isPaid = w.status === 'PAID';
                  const isPending = w.status === 'PENDING';
                  const isRejected = w.status === 'REJECTED';

                  return (
                    <div key={`w-${w.id}`} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <ArrowDownRight className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{isVi ? 'Lệnh rút tiền về ngân hàng' : 'Bank Withdrawal'}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {w.bankName} - {w.bankAccount} ({w.accountHolder})
                          </div>
                          {w.txReference && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                              Mã GD: {w.txReference}
                            </div>
                          )}
                          {w.rejectReason && (
                            <div className="text-[11px] text-rose-500 mt-0.5">
                              Lý do: {w.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          -{formatCurrency(w.amount)}
                        </span>
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isVi ? 'Đã thanh toán' : 'Paid'}</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{isVi ? 'Đang chờ duyệt' : 'Pending'}</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{isVi ? 'Bị từ chối' : 'Rejected'}</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {formatDate(w.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Commission Earnings */}
                {data?.commissions?.map((comm) => (
                  <div key={`c-${comm.id}`} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {isVi ? `Cộng hoa hồng ${comm.commissionRate ? Math.round(comm.commissionRate * 100) : 20}%` : `Commission Earned`}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          Đơn hàng: #{comm.orderId.slice(-8)} (Giá trị: {formatCurrency(comm.orderAmount)})
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(comm.rewardAmount)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        <span>{isVi ? 'Đã cộng vào ví' : 'Credited'}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(comm.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MODAL YÊU CẦU RÚT TIỀN (Mobile Bottom Sheet, Touch-Optimized) */}
      {/* ======================================================== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto animate-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle for Mobile */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Yêu cầu rút tiền về ngân hàng' : 'Request Payout'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              {/* Số tiền rút */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isVi ? 'Số tiền rút (VNĐ)' : 'Amount (VND)'} *
                </label>
                <input
                  type="number"
                  min={50000}
                  max={availableBalance}
                  step={10000}
                  required
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  placeholder="50,000"
                  className="w-full h-12 px-4 text-base font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />

                {/* Quick Amount Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(amt)}
                      disabled={availableBalance < amt}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      {amt.toLocaleString('vi-VN')}₫
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(availableBalance)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                  >
                    Tất cả ({formatCurrency(availableBalance)})
                  </button>
                </div>
              </div>

              {/* Ngân hàng */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isVi ? 'Ngân hàng thụ hưởng' : 'Bank'} *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-12 px-4 text-base font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                >
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Số tài khoản */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isVi ? 'Số tài khoản ngân hàng' : 'Bank Account Number'} *
                </label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Ví dụ: 0388123456"
                  className="w-full h-12 px-4 text-base font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Tên chủ tài khoản */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isVi ? 'Tên chủ thẻ / chủ tài khoản' : 'Account Holder Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A (VIẾT HOA KHÔNG DẤU)"
                  className="w-full h-12 px-4 text-base font-bold uppercase text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 min-h-[44px] h-12 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-base text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="flex-1 min-h-[44px] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {submittingWithdraw ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isVi ? 'Đang gửi...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <span>{isVi ? 'Xác nhận rút tiền' : 'Confirm'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReferralView;
