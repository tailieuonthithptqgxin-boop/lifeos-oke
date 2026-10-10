import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, Ban, Receipt, Search, Download, RefreshCw, Copy, Check, X 
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { formatCurrency } from '../../lib/utils';
import { PaymentRequest } from './types';

interface AdminRequestsTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminRequestsTab({ onShowMessage }: AdminRequestsTabProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Approve / Reject action modals
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<PaymentRequest | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const [rejectModalTarget, setRejectModalTarget] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (planFilter !== 'ALL') params.append('plan', planFilter);
      if (requestSearch.trim()) params.append('search', requestSearch.trim());

      const res = await apiCall(`/api/admin/payments/requests?${params.toString()}`);
      if (res && res.success) {
        setRequests(res.requests || []);
        if (res.counts) {
          setRequestCounts(res.counts);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách yêu cầu thanh toán:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, planFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRequests();
    }, 400);
    return () => clearTimeout(handler);
  }, [requestSearch]);

  const handleExportCSV = () => {
    if (requests.length === 0) {
      alert('Không có dữ liệu giao dịch để xuất.');
      return;
    }
    const headers = ['Mã Đơn', 'Mã Giao Dịch', 'Email Khách Hàng', 'Tên Khách Hàng', 'Gói', 'Chu Kỳ', 'Số Tiền (VND)', 'Trạng Thái', 'Thời Gian Tạo', 'Người Duyệt', 'Thời Gian Duyệt', 'Ghi Chú'];
    const rows = requests.map(r => [
      r.orderId,
      r.txReference,
      r.customerEmail,
      r.user?.name || '',
      r.planRequested,
      r.billingCycle,
      r.amount,
      r.status,
      new Date(r.createdAt).toISOString(),
      r.approvedBy || '',
      r.approvedAt ? new Date(r.approvedAt).toISOString() : '',
      `"${(r.note || r.rejectedReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lifeos_payment_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprovePayment = async () => {
    if (!approveConfirmTarget) return;

    try {
      setIsApproving(true);
      const res = await apiCall(`/api/admin/payments/${approveConfirmTarget.id}/approve`, 'POST');

      if (res && res.success) {
        onShowMessage?.({
          text: `Đã duyệt thanh toán thành công cho ${approveConfirmTarget.customerEmail}! Gói ${approveConfirmTarget.planRequested} đã được kích hoạt.`,
          type: 'success'
        });
        setApproveConfirmTarget(null);
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể duyệt thanh toán.');
      }
    } catch (err: any) {
      onShowMessage?.({
        text: err.message || 'Lỗi khi duyệt thanh toán',
        type: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTarget || !rejectReason.trim()) return;

    try {
      setIsRejecting(true);
      const res = await apiCall(`/api/admin/payments/${rejectModalTarget.id}/reject`, 'POST', {
        reason: rejectReason.trim()
      });

      if (res && res.success) {
        onShowMessage?.({
          text: `Đã từ chối yêu cầu thanh toán ${rejectModalTarget.txReference}. Khách hàng đã được thông báo kèm lý do.`,
          type: 'success'
        });
        setRejectModalTarget(null);
        setRejectReason('');
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể từ chối yêu cầu.');
      }
    } catch (err: any) {
      onShowMessage?.({
        text: err.message || 'Lỗi khi từ chối yêu cầu',
        type: 'error'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Duyệt (Pending)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300">
            {requestCounts.pending}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Cần kiểm tra giao dịch & kích hoạt</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đã Duyệt (Approved)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">
            {requestCounts.approved}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Đã nâng cấp quyền cho tài khoản</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Từ Chối (Rejected)</span>
            <Ban className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-800 dark:text-rose-300">
            {requestCounts.rejected}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400">Không khớp giao dịch hoặc sai cú pháp</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Đơn Hàng</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-800 dark:text-blue-300">
            {requestCounts.all}
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400">Toàn bộ yêu cầu qua chuyển khoản</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Email, Tên khách, Mã giao dịch (NANGCAP-ORD_...)..."
            value={requestSearch}
            onChange={e => setRequestSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt (PENDING)</option>
            <option value="APPROVED">Đã duyệt (APPROVED)</option>
            <option value="REJECTED">Từ chối (REJECTED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>

          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">Tất cả gói</option>
            <option value="PERSONAL_1M">Cá Nhân (1 Tháng)</option>
            <option value="PERSONAL_3M">Cá Nhân (3 Tháng)</option>
            <option value="TEAM_1M">Team (1 Tháng)</option>
            <option value="PRO">Gói PRO (Cũ)</option>
            <option value="TEAM">Gói TEAM (Cũ)</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Xuất danh sách ra tệp CSV"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={isLoadingRequests}
            title="Làm mới danh sách"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {requests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Không có yêu cầu thanh toán nào
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter !== 'ALL' || planFilter !== 'ALL' || requestSearch
                ? 'Không có kết quả khớp với bộ lọc hiện tại. Thử đổi tiêu chí tìm kiếm.'
                : 'Hiện chưa có khách hàng nào gửi yêu cầu chuyển khoản thanh toán gói SaaS.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4">Gói & Thời hạn</th>
                  <th className="py-3.5 px-4">Số tiền cần chuyển</th>
                  <th className="py-3.5 px-4">Nội dung CK / Mã GD</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Xử lý duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {requests.map((req) => {
                  const isPending = req.status === 'PENDING' || req.status === 'Pending';
                  const isApproved = req.status === 'APPROVED' || req.status === 'Paid';
                  const isRejected = req.status === 'REJECTED';
                  const isCancelled = req.status === 'CANCELLED';

                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors ${
                        isPending
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* User info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={req.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user?.name || req.customerEmail)}`}
                            alt="avatar"
                            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                              {req.user?.name || 'Khách hàng'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                              {req.customerEmail}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Gói hiện tại: {req.user?.plan || 'FREE'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plan requested */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            req.planRequested === 'TEAM'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {req.planRequested}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            ({req.billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'})
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {formatCurrency(req.amount)}
                        </span>
                      </td>

                      {/* Transfer Memo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 select-all text-xs">
                            {req.txReference || req.orderId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.txReference || req.orderId, req.id)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
                            title="Sao chép mã giao dịch"
                          >
                            {copySuccess === req.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {req.note && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[200px] truncate" title={req.note}>
                            Note: {req.note}
                          </p>
                        )}
                      </td>

                      {/* Created at */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Chờ Duyệt</span>
                          </div>
                        )}

                        {isApproved && (
                          <div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã Duyệt</span>
                            </div>
                            {req.approvedBy && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                Bởi: {req.approvedBy.split('@')[0]}
                              </span>
                            )}
                          </div>
                        )}

                        {isRejected && (
                          <div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <X className="w-3 h-3" />
                              <span>Từ Chối</span>
                            </div>
                            {req.rejectedReason && (
                              <span className="block text-[10px] text-rose-600 dark:text-rose-400 italic mt-0.5 max-w-[140px] truncate" title={req.rejectedReason}>
                                {req.rejectedReason}
                              </span>
                            )}
                          </div>
                        )}

                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Đã Hủy
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setApproveConfirmTarget(req)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Duyệt & Nâng cấp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalTarget(req);
                                setRejectReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Từ chối</span>
                            </button>
                          </div>
                        ) : isApproved ? (
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            ✓ Hoàn tất
                          </span>
                        ) : isRejected ? (
                          <span className="text-[11px] text-rose-500 font-semibold">
                            Đã từ chối
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Không khả dụng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: DUYỆT THANH TOÁN */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Xác nhận Duyệt Thanh Toán
              </h3>
              <p className="text-xs text-slate-500">
                Gói bản quyền và thời hạn sử dụng sẽ được tự động kích hoạt cho khách hàng ngay lập tức.
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-slate-900 dark:text-white">{approveConfirmTarget.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gói nâng cấp:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">
                  {approveConfirmTarget.planRequested} ({approveConfirmTarget.billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền:</span>
                <span className="font-black text-slate-900 dark:text-white">{formatCurrency(approveConfirmTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã giao dịch:</span>
                <span className="font-mono font-bold text-blue-600">{approveConfirmTarget.txReference}</span>
              </div>
              {approveConfirmTarget.note && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                  <span className="text-slate-400 block mb-0.5">Ghi chú của khách:</span>
                  <span className="text-slate-700 dark:text-slate-300 italic">{approveConfirmTarget.note}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveConfirmTarget(null)}
                disabled={isApproving}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApprovePayment}
                disabled={isApproving}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isApproving ? 'Đang duyệt...' : 'Xác nhận & Kích hoạt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TỪ CHỐI THANH TOÁN */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Ban className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Từ Chối Yêu Cầu Thanh Toán
              </h3>
              <p className="text-xs text-slate-500">
                Vui lòng cung cấp lý do từ chối để khách hàng nắm rõ và có thể thử lại hoặc bổ sung giao dịch.
              </p>
            </div>

            <form onSubmit={handleRejectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Chưa nhận được tiền trong tài khoản, số tiền chuyển khoản không đủ, hoặc nội dung chuyển khoản không khớp..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Quick Preset Reasons */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Gợi ý lý do nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Chưa nhận được tiền trong tài khoản ngân hàng',
                    'Số tiền chuyển khoản không khớp với đơn hàng',
                    'Nội dung chuyển khoản không đúng cú pháp'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  disabled={isRejecting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isRejecting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
