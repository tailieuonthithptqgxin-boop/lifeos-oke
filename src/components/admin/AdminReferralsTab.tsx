import React, { useState, useEffect } from 'react';
import { 
  Users, Gift, TrendingUp, Award, DollarSign, Search, 
  CheckCircle2, Clock, XCircle, ArrowUpRight, ShieldCheck,
  Wallet, ArrowDownToLine, Check, AlertTriangle, RefreshCw
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { formatCurrency } from '../../lib/utils';
import { triggerConfetti } from '../../lib/confetti';

export function AdminReferralsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'withdrawals' | 'leaderboard' | 'commissions'>('withdrawals');

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'REJECTED'>('ALL');

  // Modal actions
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [txReference, setTxReference] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/admin/referrals/overview');
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error loading admin referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const url = withdrawalFilter === 'ALL' 
        ? '/api/admin/referrals/withdrawals' 
        : `/api/admin/referrals/withdrawals?status=${withdrawalFilter}`;
      const res = await apiCall(url);
      if (res && res.success) {
        setWithdrawals(res.withdrawals || []);
      }
    } catch (err) {
      console.error('Error loading admin withdrawals:', err);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [withdrawalFilter]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;
    try {
      setProcessingAction(true);
      setActionMessage(null);
      const res = await apiCall(`/api/admin/referrals/withdrawals/${selectedWithdrawal.id}/approve`, 'POST', {
        txReference: txReference.trim() || `BANK-${Date.now()}`
      });
      if (res && res.success) {
        setActionMessage({ type: 'success', text: 'Đã duyệt yêu cầu rút tiền thành công!' });
        triggerConfetti();
        await Promise.all([loadData(), loadWithdrawals()]);
        setTimeout(() => {
          setSelectedWithdrawal(null);
          setActionType(null);
          setTxReference('');
        }, 1200);
      } else {
        setActionMessage({ type: 'error', text: res?.message || 'Có lỗi xảy ra' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Lỗi kết nối' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;
    if (!rejectReason.trim()) {
      setActionMessage({ type: 'error', text: 'Bắt buộc nhập lý do từ chối' });
      return;
    }
    try {
      setProcessingAction(true);
      setActionMessage(null);
      const res = await apiCall(`/api/admin/referrals/withdrawals/${selectedWithdrawal.id}/reject`, 'POST', {
        reason: rejectReason.trim()
      });
      if (res && res.success) {
        setActionMessage({ type: 'success', text: 'Đã từ chối và hoàn tiền về ví người dùng!' });
        await Promise.all([loadData(), loadWithdrawals()]);
        setTimeout(() => {
          setSelectedWithdrawal(null);
          setActionType(null);
          setRejectReason('');
        }, 1200);
      } else {
        setActionMessage({ type: 'error', text: res?.message || 'Có lỗi xảy ra' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Lỗi kết nối' });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredCommissions = (data?.commissions || []).filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.orderId?.toLowerCase().includes(q) ||
      c.referrer?.name?.toLowerCase().includes(q) ||
      c.referrer?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Đơn hàng Affiliate</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {data?.totalOrders || 0}
          </div>
          <p className="text-[11px] text-slate-400">Đơn có gắn mã giới thiệu</p>
        </div>

        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Doanh thu Affiliate</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
            {formatCurrency(data?.totalSales || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Tổng GMV mạng lưới</p>
        </div>

        <div className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng hoa hồng (30%)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(data?.totalCommissionGiven || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Đã cộng vào ví người dùng</p>
        </div>

        <div className="card-cute rounded-3xl p-5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Yêu cầu rút chờ duyệt</span>
            <div className="p-2 rounded-xl bg-amber-500 text-white">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {data?.pendingWithdrawalsCount || 0}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Cần admin giải ngân</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-purple-100 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('withdrawals')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'withdrawals'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Yêu Cầu Rút Tiền ({withdrawals.filter(w => w.status === 'PENDING').length} Chờ Duyệt)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'leaderboard'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bảng Xếp Hạng Giới Thiệu</span>
        </button>

        <button
          onClick={() => setActiveSubTab('commissions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'commissions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Nhật Ký Hoa Hồng</span>
        </button>
      </div>

      {/* TAB 1: YÊU CẦU RÚT TIỀN (WITHDRAWAL REQUESTS) */}
      {activeSubTab === 'withdrawals' && (
        <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              <span>Quản Lý Duyệt & Chuyển Khoản Rút Tiền</span>
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setWithdrawalFilter(st)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    withdrawalFilter === st
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'PAID' ? 'Đã chi trả' : 'Đã từ chối'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3">Người yêu cầu</th>
                  <th className="pb-3">Số tiền</th>
                  <th className="pb-3">Thông tin ngân hàng</th>
                  <th className="pb-3">Nội dung / Ghi chú</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">Thời gian</th>
                  <th className="pb-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Không có yêu cầu rút tiền nào trong bộ lọc này
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w: any) => (
                    <tr key={w.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{w.user?.name}</div>
                        <div className="text-[11px] text-slate-400">{w.user?.email}</div>
                      </td>
                      <td className="py-3 font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-purple-700 dark:text-purple-300">{w.bankName}</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{w.bankAccount}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{w.accountHolder}</div>
                      </td>
                      <td className="py-3 text-xs text-slate-500 max-w-xs">
                        <div>{w.transferNote || '-'}</div>
                        {w.userNote && <div className="text-[10px] italic text-slate-400">Ghi chú: {w.userNote}</div>}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                          w.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : w.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {w.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : w.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {w.status === 'PAID' ? 'Đã thanh toán' : w.status === 'REJECTED' ? 'Đã từ chối' : 'Chờ xử lý'}
                        </span>
                        {w.txReference && (
                          <div className="text-[10px] font-mono text-emerald-600 mt-0.5">Mã: {w.txReference}</div>
                        )}
                        {w.rejectReason && (
                          <div className="text-[10px] text-rose-500 mt-0.5">Lý do: {w.rejectReason}</div>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(w.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(w);
                                setActionType('APPROVE');
                                setTxReference(`TXN-${Date.now().toString().slice(-6)}`);
                                setActionMessage(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs btn-squishy"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt & Chi trả</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(w);
                                setActionType('REJECT');
                                setRejectReason('');
                                setActionMessage(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1 cursor-pointer border border-rose-200"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Từ chối</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD */}
      {activeSubTab === 'leaderboard' && (
        <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Bảng Xếp Hạng Người Giới Thiệu Hàng Đầu</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3">Người dùng</th>
                  <th className="pb-3">Mã giới thiệu</th>
                  <th className="pb-3">Số bạn đã mời</th>
                  <th className="pb-3">Doanh số tạo ra</th>
                  <th className="pb-3">Tổng hoa hồng nhận</th>
                  <th className="pb-3">Số dư khả dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {(!data?.profiles || data.profiles.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Chưa có đối tác giới thiệu nào
                    </td>
                  </tr>
                ) : (
                  data.profiles.map((p: any) => (
                    <tr key={p.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{p.user?.name}</div>
                        <div className="text-[11px] text-slate-400">{p.user?.email}</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-purple-600">
                        {p.referralCode}
                      </td>
                      <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                        {p.totalReferred}
                      </td>
                      <td className="py-3 font-medium text-slate-600 dark:text-slate-400">
                        {formatCurrency(p.totalSales)}
                      </td>
                      <td className="py-3 font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.totalCommission)}
                      </td>
                      <td className="py-3 font-bold text-amber-500">
                        {formatCurrency(p.approvedReward)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Nhật ký hoa hồng */}
      {activeSubTab === 'commissions' && (
        <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-600" />
              <span>Toàn Bộ Nhật Ký Trả Thưởng 30% Hoa Hồng</span>
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã đơn hoặc người giới thiệu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3">Mã Đơn</th>
                  <th className="pb-3">Người Nhận Hoa Hồng</th>
                  <th className="pb-3">Giá trị đơn</th>
                  <th className="pb-3">Tiền thưởng (30%)</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Không tìm thấy bản ghi hoa hồng nào
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((c: any) => (
                    <tr key={c.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {c.orderId}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.referrer?.name}</div>
                        <div className="text-[11px] text-slate-400">{c.referrer?.email}</div>
                      </td>
                      <td className="py-3 font-medium text-slate-600 dark:text-slate-300">
                        {formatCurrency(c.orderAmount)}
                      </td>
                      <td className="py-3 font-black text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(c.rewardAmount)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                          c.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : c.status === 'Cancelled'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {c.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.status === 'Approved' ? 'Đã duyệt' : c.status === 'Cancelled' ? 'Đã hủy' : 'Đang xử lý'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DUYỆT RÚT TIỀN (APPROVE) */}
      {selectedWithdrawal && actionType === 'APPROVE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-emerald-200 dark:border-emerald-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">Duyệt & Xác Nhận Chuyển Khoản</h4>
                  <p className="text-xs text-slate-400">Yêu cầu rút của: {selectedWithdrawal.user?.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedWithdrawal(null); setActionType(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền giải ngân:</span>
                <span className="font-black text-emerald-600 text-sm">{formatCurrency(selectedWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedWithdrawal.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tài khoản:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedWithdrawal.bankAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedWithdrawal.accountHolder}</span>
              </div>
            </div>

            {actionMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold ${actionMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã tham chiếu ngân hàng / Mã GD *
                </label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  placeholder="VD: FT24098712398"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedWithdrawal(null); setActionType(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {processingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Xác nhận đã chuyển</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI RÚT TIỀN (REJECT & REFUND) */}
      {selectedWithdrawal && actionType === 'REJECT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">Từ Chối Yêu Cầu & Hoàn Tiền</h4>
                  <p className="text-xs text-slate-400">Yêu cầu rút: {formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedWithdrawal(null); setActionType(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Số tiền <strong>{formatCurrency(selectedWithdrawal.amount)}</strong> sẽ được <strong>hoàn lại ngay lập tức</strong> vào số dư khả dụng của người dùng.
            </p>

            {actionMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold ${actionMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {actionMessage.text}
              </div>
            )}

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do từ chối (bắt buộc, user sẽ nhận thông báo) *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Sai thông tin số tài khoản hoặc tên chủ sở hữu không khớp..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedWithdrawal(null); setActionType(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {processingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Từ chối & Hoàn tiền</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
