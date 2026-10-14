import React, { useState, useEffect } from 'react';
import { 
  QrCode, Search, CheckCircle2, Clock, XCircle, AlertTriangle, 
  ZoomIn, Check, X, RefreshCw, Copy, ExternalLink, ShieldCheck,
  Building2, CreditCard, UserCheck, AlertCircle
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { triggerConfetti } from '../../lib/confetti';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';

export function AdminPaymentQrsTab() {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [paymentQrs, setPaymentQrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');

  // Modals & Actions
  const [zoomedQr, setZoomedQr] = useState<any | null>(null);
  const [selectedForReject, setSelectedForReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadQrs = async () => {
    try {
      setLoading(true);
      const url = filter === 'ALL'
        ? `/api/admin/referrals/payment-qrs${search ? `?search=${encodeURIComponent(search)}` : ''}`
        : `/api/admin/referrals/payment-qrs?status=${filter}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await apiCall(url);
      if (res && res.success) {
        setPaymentQrs(res.paymentQrs || []);
      }
    } catch (err: any) {
      console.error('Error loading payment QRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQrs();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQrs();
  };

  const handleVerify = async (qr: any) => {
    try {
      setProcessingId(qr.id);
      setActionAlert(null);
      const res = await apiCall(`/api/admin/referrals/payment-qr/${qr.id}/verify`, 'POST');
      if (res && res.success) {
        setActionAlert({
          type: 'success',
          text: isVi ? `Đã xác minh mã QR của khách hàng ${qr.user?.name || qr.user?.email} hợp lệ!` : `Successfully verified QR for ${qr.user?.name || qr.user?.email}!`
        });
        triggerConfetti();
        soundEngine.playPop();
        await loadQrs();
      } else {
        setActionAlert({
          type: 'error',
          text: res?.message || (isVi ? 'Không thể xác minh mã QR.' : 'Failed to verify QR.')
        });
      }
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        text: err.message || (isVi ? 'Lỗi kết nối máy chủ.' : 'Connection error.')
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReject) return;
    if (!rejectReason.trim()) {
      setActionAlert({
        type: 'error',
        text: isVi ? 'Vui lòng nhập lý do từ chối hoặc yêu cầu sửa đổi.' : 'Please enter a rejection reason.'
      });
      return;
    }

    try {
      setProcessingId(selectedForReject.id);
      setActionAlert(null);
      const res = await apiCall(`/api/admin/referrals/payment-qr/${selectedForReject.id}/reject`, 'POST', {
        reason: rejectReason.trim()
      });

      if (res && res.success) {
        setActionAlert({
          type: 'success',
          text: isVi ? 'Đã gửi yêu cầu cập nhật lại mã QR cho người dùng.' : 'Update request sent to user successfully.'
        });
        setSelectedForReject(null);
        setRejectReason('');
        await loadQrs();
      } else {
        setActionAlert({
          type: 'error',
          text: res?.message || (isVi ? 'Lỗi khi từ chối mã QR.' : 'Failed to reject QR.')
        });
      }
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        text: err.message || (isVi ? 'Lỗi kết nối máy chủ.' : 'Connection error.')
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundEngine.playPop();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-5">
      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-in fade-in ${
          actionAlert.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-50 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-600" />
            <span>{isVi ? 'Quản Lý QR Nhận Hoa Hồng Của Khách Hàng' : 'Customer Payment QR Management'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isVi 
              ? 'Xác minh tính hợp lệ của mã QR để phục vụ quy trình giải ngân hoa hồng giới thiệu an toàn.' 
              : 'Review and verify customer bank QR codes for secure referral payouts.'}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          {(['ALL', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filter === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st === 'ALL' 
                ? (isVi ? 'Tất cả' : 'All') 
                : st === 'PENDING_VERIFICATION' 
                ? (isVi ? 'Chờ xác minh' : 'Pending') 
                : st === 'VERIFIED' 
                ? (isVi ? 'Đã xác minh' : 'Verified') 
                : (isVi ? 'Cần cập nhật' : 'Needs Update')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVi ? 'Tìm theo tên, email khách hàng...' : 'Search customer name, email...'}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer"
        >
          {isVi ? 'Tìm' : 'Search'}
        </button>
      </form>

      {/* Table of QRs */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
              <th className="pb-3">{isVi ? 'Khách hàng' : 'Customer'}</th>
              <th className="pb-3">{isVi ? 'Mã QR' : 'QR Image'}</th>
              <th className="pb-3">{isVi ? 'Thông tin ngân hàng' : 'Bank Information'}</th>
              <th className="pb-3">{isVi ? 'Trạng thái' : 'Status'}</th>
              <th className="pb-3">{isVi ? 'Cập nhật' : 'Updated'}</th>
              <th className="pb-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin text-purple-600 mb-1" />
                  <span>{isVi ? 'Đang tải danh sách...' : 'Loading payment QRs...'}</span>
                </td>
              </tr>
            ) : paymentQrs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {isVi ? 'Không có mã QR nào trong bộ lọc này' : 'No payment QRs found'}
                </td>
              </tr>
            ) : (
              paymentQrs.map((qr: any) => (
                <tr key={qr.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Customer info */}
                  <td className="py-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{qr.user?.name || (isVi ? 'Người dùng' : 'User')}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{qr.user?.email}</div>
                  </td>

                  {/* QR Image Thumbnail */}
                  <td className="py-3">
                    <div 
                      onClick={() => setZoomedQr(qr)}
                      className="group relative w-12 h-12 rounded-xl bg-white dark:bg-slate-800 p-1 border border-purple-200 dark:border-slate-700 shadow-xs cursor-pointer overflow-hidden flex items-center justify-center hover:border-purple-500 transition-all"
                    >
                      <img src={qr.qrUrl} alt="QR Thumbnail" className="max-h-full max-w-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatSize(qr.fileSize)}
                    </span>
                  </td>

                  {/* Bank info */}
                  <td className="py-3">
                    <div className="font-bold text-purple-700 dark:text-purple-300">
                      {qr.bankName || (isVi ? 'Chưa ghi chú tên NH' : 'Unspecified')}
                    </div>
                    {qr.bankAccount && (
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span>{qr.bankAccount}</span>
                        <button
                          onClick={() => handleCopy(qr.bankAccount, `acc-${qr.id}`)}
                          className="p-0.5 text-slate-400 hover:text-purple-600 cursor-pointer"
                          title="Sao chép STK"
                        >
                          {copiedId === `acc-${qr.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                    {qr.accountHolder && (
                      <div className="text-[10px] uppercase font-bold text-slate-400">{qr.accountHolder}</div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                      qr.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : qr.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {qr.status === 'VERIFIED' ? <CheckCircle2 className="w-3 h-3" /> : qr.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {qr.status === 'VERIFIED' ? (isVi ? 'Đã xác minh' : 'Verified') : qr.status === 'REJECTED' ? (isVi ? 'Cần cập nhật' : 'Needs Update') : (isVi ? 'Chờ duyệt' : 'Pending')}
                    </span>
                    {qr.rejectionReason && (
                      <div className="text-[10px] text-rose-500 mt-1 max-w-xs line-clamp-2">
                        {isVi ? 'Lý do: ' : 'Reason: '}{qr.rejectionReason}
                      </div>
                    )}
                  </td>

                  {/* Updated Time */}
                  <td className="py-3 text-slate-400 text-xs">
                    {new Date(qr.updatedAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                  </td>

                  {/* Actions */}
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {qr.status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleVerify(qr)}
                          disabled={processingId === qr.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs btn-squishy disabled:opacity-50"
                        >
                          {processingId === qr.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>{isVi ? 'Duyệt QR' : 'Verify'}</span>
                        </button>
                      )}

                      {qr.status !== 'REJECTED' && (
                        <button
                          onClick={() => {
                            setSelectedForReject(qr);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>{isVi ? 'Yêu cầu sửa' : 'Reject'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setZoomedQr(qr)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={isVi ? 'Xem ảnh' : 'View full'}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Reason Modal */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">
                    {isVi ? 'Yêu Cầu Cập Nhật Lại QR' : 'Request QR Update'}
                  </h4>
                  <p className="text-xs text-slate-400">{selectedForReject.user?.name} ({selectedForReject.user?.email})</p>
                </div>
              </div>
              <button onClick={() => setSelectedForReject(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Lý do từ chối / cần sửa (khách hàng sẽ nhận thông báo) *' : 'Reason for rejection (sent to customer) *'}
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={isVi ? 'VD: Ảnh QR bị mờ, không quét được hoặc không trùng khớp với tên chủ tài khoản...' : 'e.g., QR is blurry, unscannable, or account holder mismatch...'}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForReject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={processingId === selectedForReject.id}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {processingId === selectedForReject.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isVi ? 'Xác nhận từ chối' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom QR Modal */}
      {zoomedQr && (
        <div 
          onClick={() => setZoomedQr(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col items-center space-y-4 animate-in zoom-in-95 cursor-default"
          >
            <button 
              onClick={() => setZoomedQr(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                {isVi ? 'QR Tài Khoản Khách Hàng' : 'Customer Payment QR'}
              </h4>
              <p className="text-xs text-slate-400">{zoomedQr.user?.name} · {zoomedQr.user?.email}</p>
            </div>
            <div className="p-3 bg-white rounded-2xl shadow-inner max-w-sm w-full aspect-square flex items-center justify-center">
              <img src={zoomedQr.qrUrl} alt="Zoomed QR" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-center text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
              {zoomedQr.bankName && <div className="font-bold">{zoomedQr.bankName}</div>}
              {zoomedQr.bankAccount && <div className="font-mono font-bold">{zoomedQr.bankAccount} - {zoomedQr.accountHolder}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
