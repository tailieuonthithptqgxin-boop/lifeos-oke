import React, { useState, useEffect } from 'react';
import { 
  Users, Gift, Copy, Check, Share2, Sparkles, TrendingUp, DollarSign, 
  ArrowUpRight, ShieldCheck, Clock, CheckCircle2, XCircle, ChevronRight,
  HeartHandshake, AlertCircle, Award, Percent, Wallet, ArrowDownToLine,
  Building2, CreditCard, UserCheck, FileText, Send, RefreshCw
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { formatCurrency, formatDate } from '../lib/utils';
import { triggerConfetti } from '../lib/confetti';
import { soundEngine } from '../lib/soundEngine';

export function ReferralView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    referralCode: string;
    referralLink: string;
    totalReferred: number;
    totalSales: number;
    totalCommission: number;
    pendingReward: number;
    approvedReward: number;
    withdrawalPending: number;
    paidReward: number;
    history: Array<{
      id: string;
      referredUser: { name: string; email: string };
      createdAt: string;
    }>;
    commissions: Array<{
      id: string;
      orderId: string;
      orderAmount: number;
      commissionRate: number;
      rewardAmount: number;
      status: string;
      createdAt: string;
      note?: string;
    }>;
  } | null>(null);

  const [withdrawals, setWithdrawals] = useState<Array<any>>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'history'>('overview');

  // Withdrawal modal state with cached bank info
  const cachedBank = typeof window !== 'undefined' ? (() => {
    try {
      const saved = localStorage.getItem('lifeos_recent_bank_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })() : null;

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50000);
  const [bankName, setBankName] = useState(cachedBank?.bankName || 'MB Bank (Quân Đội)');
  const [bankAccount, setBankAccount] = useState(cachedBank?.bankAccount || '');
  const [accountHolder, setAccountHolder] = useState(cachedBank?.accountHolder || '');
  const [transferNote, setTransferNote] = useState('');
  const [userNote, setUserNote] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/referrals/dashboard');
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error loading referral dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const res = await apiCall('/api/referrals/withdrawals');
      if (res && res.success) {
        setWithdrawals(res.withdrawals || []);
      }
    } catch (err) {
      console.error('Error loading withdrawals:', err);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadWithdrawals();
  }, []);

  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopiedCode(true);
    soundEngine.playPop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopiedLink(true);
    soundEngine.playPop();
    triggerConfetti();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = () => {
    if (!data?.referralLink) return;
    if (navigator.share) {
      navigator.share({
        title: 'Nhận bản quyền LifeOS cùng mình!',
        text: `Dùng mã ${data.referralCode} hoặc link sau để tham gia LifeOS quản lý cuộc sống siêu mượt:`,
        url: data.referralLink
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!withdrawAmount || withdrawAmount < 50000) {
      setWithdrawError('Số tiền rút tối thiểu là 50.000 ₫');
      return;
    }
    if (data && withdrawAmount > data.approvedReward) {
      setWithdrawError(`Số tiền rút vượt quá số dư khả dụng (${formatCurrency(data.approvedReward)})`);
      return;
    }
    if (!bankAccount.trim() || !accountHolder.trim()) {
      setWithdrawError('Vui lòng nhập số tài khoản và tên chủ tài khoản.');
      return;
    }

    try {
      setSubmittingWithdraw(true);
      const res = await apiCall('/api/referrals/withdraw', 'POST', {
        amount: withdrawAmount,
        bankName,
        bankAccount: bankAccount.trim(),
        accountHolder: accountHolder.trim().toUpperCase(),
        transferNote,
        userNote
      });

      if (res && res.success) {
        try {
          localStorage.setItem('lifeos_recent_bank_info', JSON.stringify({
            bankName,
            bankAccount: bankAccount.trim(),
            accountHolder: accountHolder.trim().toUpperCase()
          }));
        } catch {}
        setWithdrawSuccess('Đã gửi yêu cầu rút tiền thành công! Admin sẽ giải ngân trong vòng 24h.');
        triggerConfetti();
        soundEngine.playPop();
        // Refresh balance and withdrawals
        await Promise.all([loadDashboard(), loadWithdrawals()]);
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(null);
          setActiveTab('withdrawals');
        }, 1500);
      } else {
        setWithdrawError(res?.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Lỗi hệ thống');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      {/* 1. Header Banner Fresh Green Unisex */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-600 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/30">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Chương Trình Giới Thiệu Bạn Bè Nhận 20% Hoa Hồng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Lan Tỏa LifeOS, Nhận Thưởng 20% Mỗi Đơn Hàng</span>
            </h1>
            <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed">
              Mỗi khi bạn bè đăng ký qua mã giới thiệu và thanh toán gói dịch vụ hợp lệ, bạn sẽ lập tức nhận <span className="font-black text-amber-300 underline decoration-wavy">20% giá trị đơn hàng</span> vào ví tiền thưởng!
            </p>
          </div>

          {/* Quick Share Pill */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-2.5 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
              <span>{copiedLink ? 'Đã sao chép link!' : 'Copy Link giới thiệu'}</span>
            </button>
            <button
              onClick={handleShare}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900/80 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Referral Code & Link Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box Code */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Mã Giới Thiệu Của Bạn</span>
            <div className="flex items-center justify-between gap-3 p-3 bg-purple-50/70 dark:bg-slate-800/80 rounded-2xl border border-purple-100/60 dark:border-purple-900/30 mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-800 dark:text-white">
                {data?.referralCode || '...'}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs btn-squishy"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Đã copy' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Bạn bè có thể nhập mã này trực tiếp tại bước đăng ký tài khoản mới.
          </p>
        </div>

        {/* Box Link */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Đường Dẫn Giới Thiệu Trực Tiếp</span>
            <div className="flex items-center justify-between gap-3 p-3 bg-indigo-50/70 dark:bg-slate-800/80 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 mt-2">
              <span className="text-xs font-medium font-mono text-slate-600 dark:text-slate-300 truncate">
                {data?.referralLink || '...'}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 btn-squishy"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Đã copy' : 'Sao chép link'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Người dùng bấm vào link sẽ được tự động điền mã giới thiệu mà không cần gõ tay.
          </p>
        </div>
      </div>

      {/* 3. REFERRAL WALLET CARD (Ví Tiền Thưởng + Rút Tiền) */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-pink-500/10 border-2 border-amber-300/40 dark:border-amber-500/30 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200/50 dark:border-amber-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Ví Tiền Thưởng (Referral Wallet)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Rút về mọi ngân hàng VN
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hoa hồng thực tế tích lũy, bạn có thể tạo lệnh rút trực tiếp về tài khoản ngân hàng bất kỳ lúc nào.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setWithdrawError(null);
              setWithdrawSuccess(null);
              setShowWithdrawModal(true);
            }}
            disabled={!data || data.approvedReward < 50000}
            className={`px-6 py-3 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy ${
              data && data.approvedReward >= 50000
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Rút Tiền Về Ngân Hàng</span>
          </button>
        </div>

        {/* Wallet Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500">Tổng đã kiếm được</span>
            <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {formatCurrency(data?.totalCommission || 0)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40">
            <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Số dư khả dụng
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              {formatCurrency(data?.approvedReward || 0)}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Có thể rút ngay</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500">Đang chờ xử lý</span>
            <div className="text-lg font-black text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
              {formatCurrency(data?.pendingReward || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Đơn hàng mới</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Đang chờ rút</span>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
              {formatCurrency(data?.withdrawalPending || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Admin đang duyệt</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Tổng đã rút thành công</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatCurrency(data?.paidReward || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Đã vào tài khoản</span>
          </div>
        </div>
      </div>

      {/* 4. Stat Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Đã giới thiệu</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {data?.totalReferred || 0}
          </div>
          <p className="text-[11px] text-slate-400">Bạn bè đã tạo tài khoản</p>
        </div>

        {/* Stat 2 */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng doanh thu phát sinh</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(data?.totalSales || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Từ các đơn hàng thành công</p>
        </div>

        {/* Stat 3 */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng tiền thưởng (20%)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(data?.totalCommission || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Đã tích lũy toàn thời gian</p>
        </div>

        {/* Stat 4 */}
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Số dư khả dụng</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 tabular-nums">
            {formatCurrency(data?.approvedReward || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Sẵn sàng để rút / đổi gói</p>
        </div>
      </div>

      {/* 5. Tab Navigation & Tables */}
      <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-purple-50 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Lịch sử hoa hồng ({data?.commissions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Lịch sử rút tiền ({withdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Danh sách bạn bè ({data?.history?.length || 0})
          </button>
        </div>

        {/* Tab 1: Commission History */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {(!data?.commissions || data.commissions.length === 0) ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Gift className="w-10 h-10 mx-auto text-purple-300 animate-pulse" />
                <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Chưa có giao dịch hoa hồng nào</p>
                <p className="text-xs">Hãy chia sẻ link cho bạn bè ngay để nhận hoa hồng 20% khi họ kích hoạt dịch vụ!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3">Mã Đơn</th>
                      <th className="pb-3">Giá trị đơn</th>
                      <th className="pb-3">Tỷ lệ</th>
                      <th className="pb-3">Tiền thưởng</th>
                      <th className="pb-3">Trạng thái</th>
                      <th className="pb-3">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {data.commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {comm.orderId}
                        </td>
                        <td className="py-3 font-medium text-slate-600 dark:text-slate-300">
                          {formatCurrency(comm.orderAmount)}
                        </td>
                        <td className="py-3 font-bold text-purple-600 dark:text-purple-400">
                          {comm.rate ? `${Math.round(comm.rate * 100)}%` : '20%'}
                        </td>
                        <td className="py-3 font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(comm.rewardAmount)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                            comm.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : comm.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            {comm.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {comm.status === 'Approved' ? 'Đã duyệt' : comm.status === 'Cancelled' ? 'Đã hủy' : 'Đang xử lý'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 text-xs">
                          {new Date(comm.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Withdrawals History */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Wallet className="w-10 h-10 mx-auto text-amber-300" />
                <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Chưa có yêu cầu rút tiền nào</p>
                <p className="text-xs">Khi có số dư khả dụng từ 50.000 ₫ trở lên, bạn có thể bấm nút "Rút Tiền Về Ngân Hàng".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3">Ngày yêu cầu</th>
                      <th className="pb-3">Số tiền</th>
                      <th className="pb-3">Ngân hàng nhận</th>
                      <th className="pb-3">Số tài khoản</th>
                      <th className="pb-3">Trạng thái</th>
                      <th className="pb-3">Mã GD / Phản hồi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 text-slate-500 font-medium text-xs">
                          {new Date(w.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 font-black text-slate-900 dark:text-white">
                          {formatCurrency(w.amount)}
                        </td>
                        <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                          {w.bankName}
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-400">
                          {w.bankAccount}
                          <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">{w.accountHolder}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                            w.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : w.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            {w.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : w.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {w.status === 'PAID' ? 'Đã chuyển tiền' : w.status === 'REJECTED' ? 'Bị từ chối' : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="py-3 text-xs">
                          {w.status === 'PAID' && (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              Mã GD: {w.txReference || 'Thành công'}
                            </span>
                          )}
                          {w.status === 'REJECTED' && (
                            <span className="text-rose-500 font-medium">
                              {w.rejectReason || 'Không đáp ứng điều kiện'}
                            </span>
                          )}
                          {w.status === 'PENDING' && (
                            <span className="text-slate-400 italic">Đang chờ admin chuyển khoản...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Friends History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {(!data?.history || data.history.length === 0) ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-purple-300" />
                <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Chưa có bạn bè nào đăng ký qua mã của bạn</p>
                <p className="text-xs">Gửi link giới thiệu ngay cho bạn bè hoặc đăng lên mạng xã hội bạn nhé!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3">Tên bạn bè</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Ngày tham gia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {data.history.map((h) => (
                      <tr key={h.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                          {h.referredUser.name}
                        </td>
                        <td className="py-3 font-mono text-slate-500">
                          {h.referredUser.email}
                        </td>
                        <td className="py-3 text-slate-400 text-xs">
                          {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Anti-Fraud & Rules Notice */}
      <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-slate-800/60 border border-purple-100/70 dark:border-purple-900/30 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
          <ShieldCheck className="w-4 h-4" />
          <span>Quy tắc rút tiền & Chống gian lận:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
          <li>Số tiền rút tối thiểu mỗi lần: <strong>50.000 ₫</strong>. Không mất phí rút tiền.</li>
          <li>Khi gửi yêu cầu rút, tiền sẽ chuyển sang trạng thái <strong>Đang chờ rút</strong> để tránh trùng lặp.</li>
          <li>Trường hợp yêu cầu bị từ chối, toàn bộ số tiền sẽ được tự động hoàn lại ngay về <strong>Số dư khả dụng</strong>.</li>
          <li>Admin xử lý và chuyển khoản liên ngân hàng 24/7 trong vòng 2 - 24 giờ làm việc.</li>
        </ul>
      </div>

      {/* 7. POPUP MODAL RÚT TIỀN */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-purple-100 dark:border-purple-950/50 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Rút Tiền Thưởng Về Ngân Hàng</h3>
                  <p className="text-xs text-slate-400">Số dư khả dụng: <span className="font-bold text-emerald-600">{formatCurrency(data?.approvedReward || 0)}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền muốn rút (₫) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={50000}
                    max={data?.approvedReward || 0}
                    step={10000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="50000"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(data?.approvedReward || 0)}
                    className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-200"
                  >
                    Rút tất cả
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1 mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium">Nhanh:</span>
                    {[50000, 100000, 200000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt)}
                        disabled={amt > (data?.approvedReward || 0)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          withdrawAmount === amt
                            ? 'bg-purple-600 text-white shadow-xs'
                            : amt <= (data?.approvedReward || 0)
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {amt.toLocaleString('vi-VN')} ₫
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(data?.approvedReward || 0)}
                      disabled={(data?.approvedReward || 0) < 50000}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                    >
                      Tối đa
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Tối thiểu 50.000 ₫ · Không mất phí</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngân hàng nhận *
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="MB Bank (Quân Đội)">MB Bank (Quân Đội)</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="Techcombank">Techcombank</option>
                    <option value="VPBank">VPBank</option>
                    <option value="ACB">ACB</option>
                    <option value="TPBank">TPBank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="VietinBank">VietinBank</option>
                    <option value="VIB">VIB</option>
                    <option value="Sacombank">Sacombank</option>
                    <option value="MoMo">Ví MoMo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số tài khoản / STK *
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="VD: 0987654321"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên chủ tài khoản (viết hoa không dấu) *
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="NGUYEN VAN A"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú cho Admin (tùy chọn)
                </label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Ghi chú thêm nếu cần..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition-all flex items-center gap-2 cursor-pointer btn-squishy disabled:opacity-50"
                >
                  {submittingWithdraw ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{submittingWithdraw ? 'Đang gửi...' : 'Xác Nhận Rút Tiền'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
