import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ShieldCheck,
  User,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Users
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { formatCurrency } from '../../lib/utils';
import type { SubscriptionRecord } from './types';

interface AdminSubscriptionsTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminSubscriptionsTab({ onShowMessage }: AdminSubscriptionsTabProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    expired: 0,
    cancelled: 0,
    pending: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Refund modal state
  const [refundTarget, setRefundTarget] = useState<SubscriptionRecord | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (planFilter !== 'ALL') params.set('planId', planFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('limit', '25');

      const res = await apiCall(`/api/admin/subscriptions?${params.toString()}`);
      if (res && res.success) {
        setSubscriptions(res.subscriptions || []);
        if (res.counts) setCounts(res.counts);
        if (res.totalRevenue !== undefined) setTotalRevenue(res.totalRevenue);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi tải danh sách subscription', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, planFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget || !refundTarget.paymentId) {
      onShowMessage?.({ text: 'Không tìm thấy thông tin thanh toán hợp lệ để hoàn tiền!', type: 'error' });
      return;
    }

    try {
      setIsRefunding(true);
      const res = await apiCall(`/api/admin/payments/${refundTarget.paymentId}/refund`, 'POST', {
        reason: refundReason.trim() || 'Admin hoàn tiền'
      });

      if (res && res.success) {
        onShowMessage?.({
          text: `Đã hoàn tiền và thu hồi gói dịch vụ của khách hàng thành công!`,
          type: 'success'
        });
        setRefundTarget(null);
        setRefundReason('');
        await fetchSubscriptions();
      } else {
        throw new Error(res?.message || 'Không thể xử lý hoàn tiền');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi hoàn tiền', type: 'error' });
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Đang Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {counts.active}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Khách có quyền truy cập</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Đã hết hạn</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {counts.expired}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Tự động khóa quyền</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Chờ duyệt</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {counts.pending}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Đơn thanh toán mới</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Đã hủy / Hoàn tiền</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {counts.cancelled}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Gói bị thu hồi</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Tổng doanh thu</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatCurrency(totalRevenue)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Từ các gói đã thanh toán</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo email, tên người dùng, mã tham chiếu..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shrink-0"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Lọc theo trạng thái subscription"
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Chỉ Active</option>
            <option value="EXPIRED">Chỉ Expired</option>
            <option value="CANCELLED">Chỉ Hủy / Hoàn tiền</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            aria-label="Lọc theo loại gói cước"
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
          >
            <option value="ALL">Tất cả gói</option>
            <option value="PERSONAL_1M">Cá Nhân 1 Tháng</option>
            <option value="PERSONAL_3M">Cá Nhân 3 Tháng</option>
            <option value="TEAM_1M">Đội Ngũ 1 Tháng</option>
            <option value="PRO">Pro</option>
            <option value="TEAM">Team</option>
          </select>

          <button
            type="button"
            onClick={fetchSubscriptions}
            aria-label="Làm mới dữ liệu subscription"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Gói cước</th>
                <th className="py-3.5 px-4">Giá đã thanh toán</th>
                <th className="py-3.5 px-4">Ngày bắt đầu</th>
                <th className="py-3.5 px-4">Ngày hết hạn</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Mã giao dịch</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách subscription...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy dữ liệu gói cước nào phù hợp.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const now = new Date();
                  const isExpired = new Date(sub.endDate).getTime() <= now.getTime();
                  const isActive = sub.status === 'ACTIVE' && !isExpired;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {sub.user?.avatar ? (
                              <img src={sub.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              (sub.user?.name || sub.user?.email || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {sub.user?.name || 'Chưa đặt tên'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {sub.user?.email || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {sub.planName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sub.durationDays} ngày · {sub.planType}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatCurrency(sub.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Snapshot tại thời điểm mua
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(sub.startDate).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className={isExpired ? 'text-rose-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                          {new Date(sub.endDate).toLocaleDateString('vi-VN')}
                        </span>
                        {!isExpired && (
                          <span className="text-[10px] text-slate-400 block font-sans">
                            Còn {Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : sub.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            Đã hủy / Hoàn tiền
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {sub.txReference || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isActive && sub.paymentId && (
                          <button
                            type="button"
                            onClick={() => setRefundTarget(sub)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Hoàn tiền & Khóa gói
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Trang {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Xác nhận Hoàn tiền & Thu hồi gói
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hành động này sẽ đánh dấu đơn thanh toán ({formatCurrency(refundTarget.amount)}) là <b>REFUNDED</b>, 
              ngay lập tức thu hồi quyền gói <b>{refundTarget.planName}</b> của khách hàng <b>{refundTarget.user?.email}</b>, 
              và hoàn tác hoa hồng giới thiệu nếu có.
            </p>

            <form onSubmit={handleRefundSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lý do hoàn tiền (sẽ gửi cho khách hàng)
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ví dụ: Khách hàng chuyển nhầm hoặc yêu cầu hủy theo chính sách 24h..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer flex items-center gap-2"
                >
                  {isRefunding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Xác nhận Hoàn tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
