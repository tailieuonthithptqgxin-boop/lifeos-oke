import React, { useState } from 'react';
import { Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface AccountModalProps {
  account: any;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

export function AccountModal({ account, onClose, onSave, onDelete }: AccountModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [formData, setFormData] = useState<any>({
    name: account?.name || '',
    type: account?.type || 'Ngân hàng',
    balance: account?.balance !== undefined ? account.balance : 0,
    currency: account?.currency || 'VND',
    color: account?.color || '#3b82f6'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên tài khoản' : 'Please enter account name');
      return;
    }

    const payload = {
      ...formData,
      name: trimmedName,
      balance: Number(formData.balance) || 0
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(payload));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể lưu tài khoản' : 'Failed to save account'));
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!account?.id || !onDelete || isSubmitting) return;
    if (window.confirm(isVi ? `Xác nhận xóa tài khoản "${account.name}"?` : `Are you sure you want to delete "${account.name}"?`)) {
      try {
        setIsSubmitting(true);
        await Promise.resolve(onDelete(account.id));
      } catch (err: any) {
        setErrorMessage(err?.message || (isVi ? 'Không thể xóa tài khoản' : 'Failed to delete account'));
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-modal-enter my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isVi ? (account ? 'Chỉnh sửa tài khoản' : 'Tài khoản mới') : (account ? 'Edit Account' : 'New Account')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Quản lý số dư và nguồn tiền của bạn' : 'Manage your cash and bank accounts'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {account && onDelete && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title={isVi ? 'Xóa tài khoản' : 'Delete account'}
                aria-label="Delete account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Tên tài khoản' : 'Account Name'} <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={formData.name} 
              onChange={e => setFormData((prev: any) => ({ ...prev, name: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder={isVi ? 'Ví dụ: Vietcombank, Momo, Tiền mặt ví...' : 'e.g. Chase Bank, Apple Pay, Cash...'}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Loại tài khoản' : 'Account Type'}
            </label>
            <select 
              value={formData.type} 
              onChange={e => setFormData((prev: any) => ({ ...prev, type: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Ngân hàng">{isVi ? 'Tài khoản ngân hàng' : 'Bank Account'}</option>
              <option value="Ví điện tử">{isVi ? 'Ví điện tử' : 'E-Wallet'}</option>
              <option value="Tiền mặt">{isVi ? 'Tiền mặt' : 'Cash'}</option>
              <option value="Tiết kiệm">{isVi ? 'Sổ tiết kiệm' : 'Savings'}</option>
              <option value="Đầu tư">{isVi ? 'Tài khoản đầu tư' : 'Investment'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {account 
                ? (isVi ? 'Số dư khả dụng (VNĐ)' : 'Available Balance (VND)') 
                : (isVi ? 'Số dư ban đầu (VNĐ)' : 'Initial Balance (VND)')}
            </label>
            <input 
              type="number" 
              value={formData.balance} 
              onChange={e => setFormData((prev: any) => ({ ...prev, balance: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {isVi ? 'Bạn có thể cập nhật số dư này bất kỳ lúc nào để khớp với sao kê thực tế.' : 'You can adjust this balance anytime to match your actual statement.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm disabled:opacity-50"
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-semibold rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isVi ? 'Đang lưu...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{isVi ? 'Lưu tài khoản' : 'Save Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountModal;
