import React, { useState, useEffect, useRef } from 'react';
import { Check, Upload, Image as ImageIcon, Trash2, QrCode, Power, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { BankConfig } from './types';

interface AdminBankConfigTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminBankConfigTab({ onShowMessage }: AdminBankConfigTabProps) {
  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '888899998888',
    accountHolder: 'CONG TY CONG NGHE LIFEOS',
    transferPrefix: 'DUOTECH',
    bankCode: 'MB',
    qrImageUrl: '',
    isActive: true
  });
  const [isSavingBankConfig, setIsSavingBankConfig] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [previewTab, setPreviewTab] = useState<'vietqr' | 'custom'>('vietqr');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBankConfig = async () => {
    try {
      const res = await apiCall('/api/payments/bank-config');
      if (res && res.success && res.config) {
        setBankConfig({
          ...res.config,
          transferPrefix: res.config.transferPrefix || 'DUOTECH',
          isActive: res.config.isActive ?? true
        });
        if (res.config.qrImageUrl) {
          setPreviewTab('custom');
        }
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải cấu hình ngân hàng:', err);
    }
  };

  useEffect(() => {
    fetchBankConfig();
  }, []);

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowMessage?.({
        text: 'Kích thước ảnh QR không được vượt quá 5MB',
        type: 'error'
      });
      return;
    }

    try {
      setIsUploadingQr(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'qr_codes'
          });
          const url = res.file?.url || base64Data;
          setBankConfig(prev => ({ ...prev, qrImageUrl: url }));
          setPreviewTab('custom');
          onShowMessage?.({
            text: 'Tải ảnh mã QR thành công! Hãy bấm Lưu cấu hình.',
            type: 'success'
          });
        } catch (uploadErr: any) {
          // Fallback to storing raw base64 data directly in config
          setBankConfig(prev => ({ ...prev, qrImageUrl: base64Data }));
          setPreviewTab('custom');
          onShowMessage?.({
            text: 'Đã nạp ảnh mã QR! Hãy bấm Lưu cấu hình.',
            type: 'success'
          });
        } finally {
          setIsUploadingQr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingQr(false);
      onShowMessage?.({
        text: err.message || 'Lỗi khi đọc file ảnh',
        type: 'error'
      });
    }
  };

  const handleRemoveCustomQr = () => {
    setBankConfig(prev => ({ ...prev, qrImageUrl: '' }));
    setPreviewTab('vietqr');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onShowMessage?.({
      text: 'Đã gỡ mã QR tải lên. Hệ thống sẽ tự động tạo mã VietQR theo tài khoản ngân hàng.',
      type: 'success'
    });
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingBankConfig(true);
      const res = await apiCall('/api/admin/payments/bank-config', 'PUT', bankConfig);

      if (res && res.success) {
        onShowMessage?.({
          text: 'Cập nhật cấu hình thông tin ngân hàng & mã QR thành công!',
          type: 'success'
        });
      } else {
        throw new Error(res?.message || 'Không thể lưu cấu hình ngân hàng');
      }
    } catch (err: any) {
      onShowMessage?.({
        text: err.message || 'Lỗi khi lưu cấu hình',
        type: 'error'
      });
    } finally {
      setIsSavingBankConfig(false);
    }
  };

  const sampleMemo = `${bankConfig.transferPrefix || 'DUOTECH'} ORD8899`;
  const dynamicVietQrUrl = `https://img.vietqr.io/image/${bankConfig.bankCode || 'MB'}-${bankConfig.accountNumber}-compact2.png?amount=15000&addInfo=${encodeURIComponent(sampleMemo)}&accountName=${encodeURIComponent(bankConfig.accountHolder)}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            Cấu Hình Ngân Hàng & Mã QR Thanh Toán
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tài khoản thụ hưởng, tải lên ảnh QR ngân hàng và nội dung chuyển khoản duy nhất cho khách hàng.
          </p>
        </div>

        {/* Status Toggle Badge */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phương thức:</span>
          <button
            type="button"
            onClick={() => setBankConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              bankConfig.isActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{bankConfig.isActive ? 'Đang hoạt động' : 'Đang tạm dừng'}</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form configuration */}
        <form onSubmit={handleSaveBankConfig} className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên Ngân Hàng Thụ Hưởng *
            </label>
            <input
              type="text"
              required
              value={bankConfig.bankName}
              onChange={e => setBankConfig({ ...bankConfig, bankName: e.target.value })}
              placeholder="Ví dụ: MBBank (Ngân hàng TMCP Quân Đội)"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mã Ngân Hàng VietQR (Bank Code) *
              </label>
              <input
                type="text"
                required
                value={bankConfig.bankCode}
                onChange={e => setBankConfig({ ...bankConfig, bankCode: e.target.value.toUpperCase().trim() })}
                placeholder="MB, VCB, TCB, ACB, BIDV, VPB..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Mã chuẩn VietQR (MB, VCB, TCB, ACB, BIDV, VPB, TPB, STB, VIB...)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Số Tài Khoản Nhận Tiền *
              </label>
              <input
                type="text"
                required
                value={bankConfig.accountNumber}
                onChange={e => setBankConfig({ ...bankConfig, accountNumber: e.target.value.trim() })}
                placeholder="Số tài khoản ngân hàng..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên Chủ Tài Khoản (In hoa không dấu) *
            </label>
            <input
              type="text"
              required
              value={bankConfig.accountHolder}
              onChange={e => setBankConfig({ ...bankConfig, accountHolder: e.target.value.toUpperCase() })}
              placeholder="CONG TY CONG NGHE LIFEOS"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 uppercase text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tiền Tố Nội Dung Chuyển Khoản *
            </label>
            <input
              type="text"
              required
              value={bankConfig.transferPrefix}
              onChange={e => setBankConfig({ ...bankConfig, transferPrefix: e.target.value.toUpperCase().trim() })}
              placeholder="DUOTECH"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cú pháp nội dung chuyển khoản duy nhất: <code className="text-blue-600 font-bold">{bankConfig.transferPrefix || 'DUOTECH'} [MÃ ĐƠN HÀNG]</code> (Ví dụ: <code className="text-slate-600">{sampleMemo}</code>)
            </span>
          </div>

          {/* QR Upload Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tải Lên Hình Ảnh Mã QR Riêng (Tùy chọn)
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Nếu bạn đã có ảnh QR ngân hàng cố định (hoặc mã QR tài khoản doanh nghiệp), hãy tải lên trực tiếp tại đây. Nếu không tải ảnh, hệ thống sẽ tự động dựng mã VietQR theo số tài khoản ở trên.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingQr}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUploadingQr ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-4 h-4 text-blue-600" />
                )}
                <span>{isUploadingQr ? 'Đang tải ảnh lên...' : 'Tải lên ảnh QR mới'}</span>
              </button>

              {bankConfig.qrImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCustomQr}
                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa ảnh QR riêng</span>
                </button>
              )}
            </div>

            {bankConfig.qrImageUrl && (
              <div className="mt-3 p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Đã có ảnh mã QR tùy chỉnh được tải lên. Trang thanh toán sẽ ưu tiên hiển thị ảnh này cho người dùng.</span>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSavingBankConfig}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSavingBankConfig ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Ngân Hàng'}</span>
            </button>
          </div>
        </form>

        {/* Live Preview Panel */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Xem trước mã QR thanh toán
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewTab('vietqr')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  previewTab === 'vietqr'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                VietQR Động
              </button>
              {bankConfig.qrImageUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewTab('custom')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    previewTab === 'custom'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Ảnh Tùy Chỉnh
                </button>
              )}
            </div>
          </div>

          <div className="w-56 h-56 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center shadow-xs overflow-hidden relative">
            {previewTab === 'custom' && bankConfig.qrImageUrl ? (
              <img
                src={bankConfig.qrImageUrl}
                alt="Custom QR Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={dynamicVietQrUrl}
                alt="VietQR Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 w-full text-left p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div><strong>Ngân hàng:</strong> {bankConfig.bankName}</div>
            <div><strong>Số TK:</strong> <code className="font-mono text-slate-900 dark:text-white font-bold">{bankConfig.accountNumber}</code></div>
            <div><strong>Chủ TK:</strong> {bankConfig.accountHolder}</div>
            <div>
              <strong>Nội dung mẫu:</strong>{' '}
              <code className="text-blue-600 font-mono font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                {sampleMemo}
              </code>
            </div>
            <div>
              <strong>Loại mã:</strong>{' '}
              <span className="text-emerald-600 font-medium">
                {previewTab === 'custom' && bankConfig.qrImageUrl ? 'Ảnh tải lên riêng' : 'VietQR động tự động nhúng số tiền & nội dung'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
