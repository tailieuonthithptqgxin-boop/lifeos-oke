import React, { useState, useRef } from 'react';
import { 
  QrCode, Upload, Check, AlertCircle, Trash2, ZoomIn, X, 
  Clock, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Building2, CreditCard, UserCheck
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { triggerConfetti } from '../../lib/confetti';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';

export interface PaymentQRData {
  id: string;
  qrUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bankName?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | string;
  rejectionReason?: string | null;
  uploadedAt: string;
  updatedAt: string;
}

interface PaymentQrSectionProps {
  paymentQr: PaymentQRData | null;
  onQrUpdated: (qr: PaymentQRData | null) => void;
}

export function PaymentQrSection({ paymentQr, onQrUpdated }: PaymentQrSectionProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [isReplacing, setIsReplacing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [bankName, setBankName] = useState(paymentQr?.bankName || 'MB Bank (Quân Đội)');
  const [bankAccount, setBankAccount] = useState(paymentQr?.bankAccount || '');
  const [accountHolder, setAccountHolder] = useState(paymentQr?.accountHolder || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndProcessFile = (file: File) => {
    setFeedback(null);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setFeedback({
        type: 'error',
        message: isVi 
          ? 'Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc WEBP.' 
          : 'Unsupported file format. Please select a PNG, JPG, or WEBP image.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: isVi 
          ? 'Kích thước tập tin vượt quá 5MB. Vui lòng nén ảnh hoặc chọn ảnh nhỏ hơn.' 
          : 'File size exceeds 5MB limit. Please choose a smaller image.'
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl || !selectedFile) {
      setFeedback({
        type: 'error',
        message: isVi ? 'Vui lòng chọn ảnh mã QR ngân hàng.' : 'Please select a bank QR image.'
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await apiCall('/api/referrals/payment-qr', 'POST', {
        base64Data: previewUrl,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'image/png',
        bankName,
        bankAccount: bankAccount.trim(),
        accountHolder: accountHolder.trim().toUpperCase()
      });

      if (res && res.success) {
        onQrUpdated(res.paymentQr);
        setIsReplacing(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setFeedback({
          type: 'success',
          message: isVi ? 'Lưu mã QR nhận tiền thành công!' : 'Bank Payment QR saved successfully!'
        });
        triggerConfetti();
        soundEngine.playPop();
      } else {
        setFeedback({
          type: 'error',
          message: res?.message || (isVi ? 'Không thể lưu mã QR.' : 'Failed to save QR.')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isVi ? 'Lỗi kết nối máy chủ.' : 'Server connection error.')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setFeedback(null);
      const res = await apiCall('/api/referrals/payment-qr', 'DELETE');
      if (res && res.success) {
        onQrUpdated(null);
        setShowDeleteConfirm(false);
        setIsReplacing(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setFeedback({
          type: 'success',
          message: isVi ? 'Đã xóa mã QR thành công.' : 'Payment QR removed successfully.'
        });
      } else {
        setFeedback({
          type: 'error',
          message: res?.message || (isVi ? 'Không thể xóa mã QR.' : 'Failed to delete QR.')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isVi ? 'Lỗi hệ thống.' : 'System error.')
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-in fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Case 1: Active QR Exists and Not in Replace Mode */}
      {paymentQr && !isReplacing ? (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-emerald-500/5 border border-purple-200/70 dark:border-purple-900/40 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{isVi ? 'QR Tài Khoản Nhận Hoa Hồng' : 'Referral Commission Payout QR'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVi 
                    ? 'Admin sẽ quét mã QR này để thanh toán hoa hồng trực tiếp vào tài khoản ngân hàng của bạn.' 
                    : 'Admin will scan this QR to transfer commission payouts directly to your bank account.'}
                </p>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div>
              {paymentQr.status === 'VERIFIED' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isVi ? 'Đã xác minh hợp lệ' : 'Verified by Admin'}</span>
                </span>
              )}
              {paymentQr.status === 'PENDING_VERIFICATION' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center gap-1.5 shadow-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{isVi ? 'Chờ Admin xác minh' : 'Pending Verification'}</span>
                </span>
              )}
              {paymentQr.status === 'REJECTED' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 flex items-center gap-1.5 shadow-xs">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>{isVi ? 'Cần cập nhật lại QR' : 'Needs Update'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Rejection Alert */}
          {paymentQr.status === 'REJECTED' && paymentQr.rejectionReason && (
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs sm:text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">{isVi ? 'Yêu cầu cập nhật từ Admin:' : 'Admin update request:'}</p>
                <p className="mt-0.5 font-medium">{paymentQr.rejectionReason}</p>
                <button
                  onClick={() => setIsReplacing(true)}
                  className="mt-2.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  {isVi ? 'Tải lên ảnh mới ngay' : 'Upload new image now'}
                </button>
              </div>
            </div>
          )}

          {/* QR Display Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* QR Image Box */}
            <div className="flex flex-col items-center">
              <div 
                onClick={() => setShowZoomModal(true)}
                className="relative group rounded-3xl overflow-hidden p-3 bg-white dark:bg-slate-800 border-2 border-dashed border-purple-200 dark:border-purple-800/60 shadow-md cursor-pointer hover:border-purple-500 transition-all max-w-[240px] w-full aspect-square flex items-center justify-center"
              >
                <img 
                  src={paymentQr.qrUrl} 
                  alt="Payment QR" 
                  className="max-h-full max-w-full object-contain rounded-2xl group-hover:scale-105 transition-transform" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-xs">
                  <ZoomIn className="w-4 h-4" />
                  <span>{isVi ? 'Phóng to' : 'Zoom in'}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                {isVi ? 'Nhấp vào ảnh để xem kích thước lớn' : 'Click image to view full size'}
              </span>
            </div>

            {/* Metadata and Bank Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100/60 dark:border-slate-800">
                  <span className="text-slate-400 block">{isVi ? 'Ngân hàng thụ hưởng' : 'Bank Name'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    {paymentQr.bankName || (isVi ? 'Theo thông tin trong mã QR' : 'As embedded in QR')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100/60 dark:border-slate-800">
                  <span className="text-slate-400 block">{isVi ? 'Số tài khoản' : 'Account Number'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    {paymentQr.bankAccount || (isVi ? 'Theo thông tin trong mã QR' : 'As embedded in QR')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100/60 dark:border-slate-800">
                  <span className="text-slate-400 block">{isVi ? 'Chủ tài khoản' : 'Account Holder'}</span>
                  <span className="font-bold uppercase text-slate-800 dark:text-slate-200 text-sm mt-0.5 block flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    {paymentQr.accountHolder || (isVi ? 'Theo thông tin trong mã QR' : 'As embedded in QR')}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-100/60 dark:border-slate-800">
                  <span className="text-slate-400 block">{isVi ? 'Thời gian cập nhật' : 'Updated At'}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs mt-0.5 block">
                    {new Date(paymentQr.updatedAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isVi 
                    ? 'Bảo mật tuyệt đối: Mã QR chỉ được hiển thị cho bạn và Admin phụ trách giải ngân.' 
                    : 'End-to-end Isolation: Your QR is strictly accessible by you and the payout Admin.'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setIsReplacing(true);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer btn-squishy"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Thay Đổi QR Mới' : 'Replace QR'}</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Xóa QR' : 'Remove QR'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: No QR or in Upload / Replace Mode */
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-purple-50 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {paymentQr 
                    ? (isVi ? 'Thay Đổi QR Nhận Tiền Mới' : 'Replace Bank Payment QR') 
                    : (isVi ? 'Tải Lên QR Nhận Hoa Hồng Giới Thiệu' : 'Upload Referral Commission Payment QR')}
                </h3>
                <p className="text-xs text-slate-500">
                  {isVi 
                    ? 'Cung cấp mã VietQR hoặc QR ngân hàng để Admin giải ngân hoa hồng nhanh nhất.' 
                    : 'Provide your VietQR or Bank QR for seamless, instant commission payouts.'}
                </p>
              </div>
            </div>

            {paymentQr && (
              <button
                onClick={() => {
                  setIsReplacing(false);
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                {isVi ? 'Quay lại' : 'Cancel'}
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30' 
                  : previewUrl 
                    ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-purple-100 max-w-[200px] aspect-square flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-xl" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {selectedFile?.name} ({formatSize(selectedFile?.size || 0)})
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {isVi ? 'Bấm để chọn ảnh khác' : 'Click to select a different image'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isVi ? 'Kéo thả ảnh QR vào đây hoặc bấm để tải lên' : 'Drag & drop your QR image here or click to browse'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isVi ? 'Hỗ trợ PNG, JPG, WEBP · Tối đa 5MB' : 'Supports PNG, JPG, WEBP · Max 5MB'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Bank Info inputs to auto-sync with withdrawals */}
            <div className="p-5 rounded-2xl bg-purple-50/40 dark:bg-slate-800/50 border border-purple-100/60 dark:border-purple-900/30 space-y-3">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                {isVi ? 'Thông tin tài khoản đi kèm (Tùy chọn)' : 'Optional Accompanying Bank Info'}
              </span>
              <p className="text-[11px] text-slate-500">
                {isVi 
                  ? 'Điền thông tin này sẽ giúp hệ thống tự động điền sẵn khi bạn tạo lệnh rút tiền.' 
                  : 'Filling this will automatically pre-fill your future withdrawal requests.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isVi ? 'Ngân hàng' : 'Bank Name'}
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isVi ? 'Số tài khoản / STK' : 'Account Number'}
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="VD: 0987654321"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isVi ? 'Tên chủ tài khoản' : 'Account Holder'}
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="NGUYEN VAN A"
                    className="w-full px-3 py-2 text-xs uppercase font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {paymentQr && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplacing(false);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </button>
              )}

              <button
                type="submit"
                disabled={saving || !previewUrl}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer btn-squishy disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu Mã QR Nhận Tiền' : 'Save Payment QR')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 dark:border-rose-950/40 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isVi ? 'Xóa mã QR nhận tiền?' : 'Remove Payment QR?'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isVi 
                ? 'Bạn có chắc chắn muốn xóa mã QR này không? Sau khi xóa, Admin sẽ không thể quét QR để giải ngân hoa hồng cho đến khi bạn tải lên mã mới.' 
                : 'Are you sure you want to remove this QR? Admin will not be able to scan for payouts until a new QR is uploaded.'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleting ? (isVi ? 'Đang xóa...' : 'Removing...') : (isVi ? 'Xác nhận xóa' : 'Confirm Remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Zoom Modal */}
      {showZoomModal && paymentQr && (
        <div 
          onClick={() => setShowZoomModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col items-center space-y-4 animate-in zoom-in-95 cursor-default"
          >
            <button 
              onClick={() => setShowZoomModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              {isVi ? 'Mã QR Nhận Tiền Ngân Hàng' : 'Bank Payout QR Code'}
            </h4>
            <div className="p-3 bg-white rounded-2xl shadow-inner max-w-sm w-full aspect-square flex items-center justify-center">
              <img src={paymentQr.qrUrl} alt="Zoomed QR" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-center text-xs text-slate-500">
              {paymentQr.bankName && <div className="font-bold text-slate-700 dark:text-slate-300">{paymentQr.bankName}</div>}
              {paymentQr.bankAccount && <div className="font-mono font-bold">{paymentQr.bankAccount} - {paymentQr.accountHolder}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
