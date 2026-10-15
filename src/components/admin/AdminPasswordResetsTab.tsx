import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  User, 
  ShieldCheck, 
  Lock, 
  X,
  Send,
  Timer
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import type { PasswordResetRequestItem } from './types';

interface AdminPasswordResetsTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminPasswordResetsTab({ onShowMessage }: AdminPasswordResetsTabProps) {
  const [requests, setRequests] = useState<PasswordResetRequestItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approvedToday: 0, completed: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Action Modals & States
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<PasswordResetRequestItem | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectModalTarget, setRejectModalTarget] = useState<PasswordResetRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Success Modal showing the newly generated PIN
  const [newlyApprovedPin, setNewlyApprovedPin] = useState<{ ticketCode: string; pin: string; email: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiCall(`/api/admin/reset-requests?${params.toString()}`);
      if (res && res.success) {
        setRequests(res.requests || []);
        if (res.counts) {
          setCounts(res.counts);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách yêu cầu khôi phục mật khẩu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRequests();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const handleApprove = async () => {
    if (!approveConfirmTarget) return;
    try {
      setIsApproving(true);
      const res = await apiCall(`/api/admin/reset-requests/${approveConfirmTarget.id}/action`, 'POST', {
        action: 'APPROVE'
      });

      if (res && res.success) {
        onShowMessage?.({
          text: `Đã phê duyệt yêu cầu ${approveConfirmTarget.ticketCode} thành công!`,
          type: 'success'
        });
        setNewlyApprovedPin({
          ticketCode: approveConfirmTarget.ticketCode,
          pin: res.backupPin,
          email: approveConfirmTarget.email
        });
        setApproveConfirmTarget(null);
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể phê duyệt yêu cầu.');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi phê duyệt yêu cầu', type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTarget) return;
    try {
      setIsRejecting(true);
      const res = await apiCall(`/api/admin/reset-requests/${rejectModalTarget.id}/action`, 'POST', {
        action: 'REJECT',
        rejectionReason: rejectReason.trim() || undefined
      });

      if (res && res.success) {
        onShowMessage?.({
          text: `Đã từ chối yêu cầu ${rejectModalTarget.ticketCode}.`,
          type: 'success'
        });
        setRejectModalTarget(null);
        setRejectReason('');
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể từ chối yêu cầu.');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi từ chối yêu cầu', type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRevoke = async (item: PasswordResetRequestItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn thu hồi hiệu lực đặt lại mật khẩu của yêu cầu "${item.ticketCode}" (${item.email})?`)) {
      return;
    }

    try {
      const res = await apiCall(`/api/admin/reset-requests/${item.id}/action`, 'POST', {
        action: 'REVOKE'
      });
      if (res && res.success) {
        onShowMessage?.({ text: `Đã thu hồi quyền đặt lại mật khẩu của ${item.ticketCode}`, type: 'success' });
        await fetchRequests();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi thu hồi yêu cầu', type: 'error' });
    }
  };

  const calculateMinutesRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Đã hết hạn';
    const mins = Math.floor(diff / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${mins}p ${secs}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ Duyệt</span>
            <div className={`w-2.5 h-2.5 rounded-full ${counts.pending > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2 tabular-nums">
            {counts.pending}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cần Admin phê duyệt</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Duyệt Hôm Nay</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2 tabular-nums text-emerald-600 dark:text-emerald-400">
            {counts.approvedToday}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đã cấp quyền & mã PIN</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Hoàn Tất</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2 tabular-nums text-blue-600 dark:text-blue-400">
            {counts.completed}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đổi mật khẩu thành công</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Số Yêu Cầu</span>
            <KeyRound className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2 tabular-nums">
            {counts.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lịch sử toàn thời gian</p>
        </div>
      </div>

      {/* Security Protocol Banner */}
      <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
          <p className="font-bold">
            Quy trình Khôi phục Mật khẩu Bảo mật cao (Admin-Approved Session-Bound Flow)
          </p>
          <p className="text-emerald-700 dark:text-emerald-300">
            Hệ thống không phụ thuộc vào email SMTP. Khi duyệt yêu cầu, một <strong>Mã PIN dự phòng 6 chữ số</strong> được sinh ngẫu nhiên có hiệu lực trong 30 phút. Bạn có thể gửi mã PIN này qua Zalo, Telegram hoặc gọi trực tiếp cho người dùng nếu họ đổi thiết bị duyệt.
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã vé (#RST-XXXX), email hoặc tên..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ duyệt', count: counts.pending },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'COMPLETED', label: 'Hoàn tất' },
            { id: 'REJECTED', label: 'Từ chối' },
            { id: 'EXPIRED', label: 'Hết hạn' }
          ].map(pill => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                statusFilter === pill.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{pill.label}</span>
              {typeof pill.count === 'number' && pill.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pill.count}
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchRequests}
            title="Làm mới"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Mã Vé</th>
                <th className="py-3 px-4">Người Dùng</th>
                <th className="py-3 px-4">Ghi Chú Xác Minh</th>
                <th className="py-3 px-4">Mã PIN 6 Số</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Không có yêu cầu khôi phục mật khẩu nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const isApproved = req.status === 'APPROVED';
                  const isPending = req.status === 'PENDING';
                  const isCompleted = req.status === 'COMPLETED';
                  const isRejected = req.status === 'REJECTED';
                  const isExpired = req.status === 'EXPIRED';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Ticket Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                            {req.ticketCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.ticketCode, req.id + '_code')}
                            title="Sao chép mã vé"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                          >
                            {copiedId === req.id + '_code' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                            {req.user?.name ? req.user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">
                              {req.user?.name || 'Người dùng'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {req.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Verification Note */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {req.verificationNote ? (
                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 break-words line-clamp-2">
                            "{req.verificationNote}"
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có ghi chú</span>
                        )}
                      </td>

                      {/* Backup PIN */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {req.backupPin ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
                            <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300 tracking-wider">
                              {req.backupPin}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(req.backupPin!, req.id + '_pin')}
                              title="Sao chép PIN để gửi qua Zalo/Phone"
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer p-0.5"
                            >
                              {copiedId === req.id + '_pin' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Đã duyệt ({calculateMinutesRemaining(req.expiresAt)})
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                            Đã hoàn tất
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            Đã từ chối
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3.5 h-3.5" />
                            Đã hết hạn
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        <div>Tạo: {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(req.createdAt).toLocaleDateString('vi-VN')}</div>
                        {req.approvedAt && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            Duyệt: {new Date(req.approvedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveConfirmTarget(req)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Phê duyệt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRejectModalTarget(req); setRejectReason(''); }}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(req)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Thu hồi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CONFIRM APPROVAL */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Xác nhận phê duyệt khôi phục mật khẩu?
            </h3>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Bạn đang phê duyệt yêu cầu <strong className="font-mono text-slate-900 dark:text-white">#{approveConfirmTarget.ticketCode}</strong> cho tài khoản:
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 font-mono">
                {approveConfirmTarget.email}
              </div>
              <p>
                Hệ thống sẽ cấp quyền cho thiết bị của người dùng đặt lại mật khẩu trong vòng <strong>30 phút</strong> và tự động sinh <strong>Mã PIN dự phòng 6 số</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setApproveConfirmTarget(null)}
                disabled={isApproving}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isApproving ? 'Đang duyệt...' : 'Xác nhận Phê duyệt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT REQUEST */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReject} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Từ chối yêu cầu khôi phục mật khẩu
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Yêu cầu <strong className="font-mono">#{rejectModalTarget.ticketCode}</strong> của <strong className="font-mono">{rejectModalTarget.email}</strong> sẽ bị hủy.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lý do từ chối (Tùy chọn)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="VD: Không xác minh được danh tính, thông tin không khớp..."
                rows={3}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setRejectModalTarget(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{isRejecting ? 'Đang từ chối...' : 'Từ chối yêu cầu'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: NEWLY APPROVED BACKUP PIN DISPLAY */}
      {newlyApprovedPin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Phê Duyệt Thành Công!</span>
              </div>
              <button
                type="button"
                onClick={() => setNewlyApprovedPin(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Mã PIN dự phòng cho yêu cầu <strong className="font-mono text-slate-900 dark:text-white">#{newlyApprovedPin.ticketCode}</strong> ({newlyApprovedPin.email}):
              </p>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                  MÃ PIN 6 SỐ
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest">
                  {newlyApprovedPin.pin}
                </span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Hiệu lực trong 30 phút
                </span>
              </div>

              <p className="text-xs text-slate-500 text-left leading-relaxed">
                Nếu người dùng giữ nguyên tab khôi phục, hệ thống của họ sẽ tự động nhận diện trong 5 giây. Nếu họ đổi máy hoặc mở trình duyệt khác, hãy cung cấp mã PIN này cho họ.
              </p>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(newlyApprovedPin.pin, 'modal_pin')}
                  className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedId === 'modal_pin' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === 'modal_pin' ? 'Đã sao chép mã PIN!' : 'Sao chép Mã PIN'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewlyApprovedPin(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
