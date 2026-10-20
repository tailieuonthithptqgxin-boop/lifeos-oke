import React, { useState } from 'react';
import { Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface BudgetModalProps {
  budget: any;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

export function BudgetModal({ budget, onClose, onSave, onDelete }: BudgetModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [formData, setFormData] = useState<any>({
    category: budget?.category || '',
    limit: budget?.limit !== undefined ? budget.limit : 1000000,
    period: budget?.period || 'Hàng tháng'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const cat = (formData.category || '').trim();
    if (!cat) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên danh mục chi tiêu' : 'Please enter category name');
      return;
    }

    const limit = Number(formData.limit);
    if (isNaN(limit) || limit < 0) {
      setErrorMessage(isVi ? 'Hạn mức ngân sách không hợp lệ' : 'Invalid budget limit');
      return;
    }

    const payload = {
      ...formData,
      category: cat,
      limit
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(payload));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể lưu ngân sách' : 'Failed to save budget'));
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!budget?.id || !onDelete || isSubmitting) return;
    if (window.confirm(isVi ? `Xác nhận xóa ngân sách cho "${budget.category}"?` : `Are you sure you want to delete budget for "${budget.category}"?`)) {
      try {
        setIsSubmitting(true);
        await Promise.resolve(onDelete(budget.id));
      } catch (err: any) {
        setErrorMessage(err?.message || (isVi ? 'Không thể xóa ngân sách' : 'Failed to delete budget'));
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
              {isVi ? (budget ? 'Chỉnh sửa ngân sách' : 'Ngân sách mới') : (budget ? 'Edit Budget' : 'New Budget')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Thiết lập hạn mức chi tiêu theo danh mục' : 'Set spending limits by category'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {budget && onDelete && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title={isVi ? 'Xóa ngân sách' : 'Delete budget'}
                aria-label="Delete budget"
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
              {isVi ? 'Danh mục chi tiêu' : 'Expense Category'} <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={formData.category} 
              onChange={e => setFormData((prev: any) => ({ ...prev, category: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder={isVi ? 'Ví dụ: Ăn uống, Mua sắm, Du lịch, Tiền nhà...' : 'e.g. Dining, Shopping, Travel, Housing...'}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Hạn mức ngân sách (VNĐ)' : 'Budget Limit (VND)'} <span className="text-rose-500">*</span>
            </label>
            <input 
              type="number" 
              min="0"
              step="any"
              required
              value={formData.limit} 
              onChange={e => setFormData((prev: any) => ({ ...prev, limit: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Kỳ hạn áp dụng' : 'Period'}
            </label>
            <select 
              value={formData.period} 
              onChange={e => setFormData((prev: any) => ({ ...prev, period: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Hàng tháng">{isVi ? 'Hàng tháng' : 'Monthly'}</option>
              <option value="Hàng tuần">{isVi ? 'Hàng tuần' : 'Weekly'}</option>
              <option value="Hàng quý">{isVi ? 'Hàng quý' : 'Quarterly'}</option>
              <option value="Hàng năm">{isVi ? 'Hàng năm' : 'Yearly'}</option>
            </select>
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
                <span>{isVi ? 'Lưu ngân sách' : 'Save Budget'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BudgetModal;
