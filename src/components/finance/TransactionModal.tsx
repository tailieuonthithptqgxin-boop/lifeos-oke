import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../lib/store';
import { formatCurrency, formatLocalDateKey } from '../../lib/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';
import { X, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import { CategoryGridPicker } from './CategoryGridPicker';

interface TransactionModalProps {
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  accounts: any[];
  initialData?: any;
}

export function TransactionModal({ onClose, onSave, accounts = [], initialData }: TransactionModalProps) {
  const { projects = [], language } = useAppStore();
  const isVi = language === 'vi';
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialAmount = initialData?.amount !== undefined ? initialData.amount : '';
  const initialCategory = initialData?.category || '';
  const initialNote = initialData?.note || '';

  const [formData, setFormData] = useState<any>(() => ({
    type: initialData?.type || 'Chi tiêu',
    amount: initialAmount,
    category: initialCategory,
    accountId: initialData?.accountId || (safeAccounts.length > 0 ? safeAccounts[0].id : ''),
    toAccountId: initialData?.toAccountId || '',
    date: initialData?.date ? initialData.date.slice(0, 10) : formatLocalDateKey(new Date()),
    note: initialNote,
    projectId: initialData?.projectId || ''
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualInput, setIsManualInput] = useState(false);

  const isFormDirty = Boolean(
    formData.amount !== initialAmount ||
    formData.category !== initialCategory ||
    formData.note !== initialNote
  );

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isFormDirty) {
          triggerShake();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDirty, isSubmitting, onClose]);

  const addAmountQuick = (increment: number) => {
    const curr = Number(formData.amount) || 0;
    setFormData((prev: any) => ({ ...prev, amount: curr + increment }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const amt = Number(formData.amount);
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      setErrorMessage(isVi ? 'Vui lòng nhập số tiền hợp lệ lớn hơn 0' : 'Please enter a valid amount greater than 0');
      return;
    }

    if (!formData.accountId) {
      setErrorMessage(isVi ? 'Vui lòng chọn tài khoản thanh toán' : 'Please select an account');
      return;
    }

    if (formData.type === 'Chuyển tiền' && !formData.toAccountId) {
      setErrorMessage(isVi ? 'Vui lòng chọn tài khoản thụ hưởng' : 'Please select a destination account');
      return;
    }

    if (formData.type === 'Chuyển tiền' && formData.accountId === formData.toAccountId) {
      setErrorMessage(isVi ? 'Tài khoản nguồn và đích không được trùng nhau' : 'Source and destination accounts cannot be identical');
      return;
    }

    let finalNote = (formData.note || '').trim();
    if (formData.projectId) {
      const proj = projects.find(p => p.id === formData.projectId);
      const projName = proj ? proj.name : formData.projectId;
      const tag = `[Project: ${projName}]`;
      if (!finalNote.includes(projName)) {
        finalNote = finalNote ? `${finalNote} · ${tag}` : tag;
      }
    }

    const cleanPayload = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      type: formData.type || 'Chi tiêu',
      amount: amt,
      category: (formData.category || '').trim() || (isVi ? 'Chung' : 'General'),
      accountId: formData.accountId,
      toAccountId: formData.type === 'Chuyển tiền' ? (formData.toAccountId || null) : null,
      date: formData.date || formatLocalDateKey(new Date()),
      note: finalNote || null
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(cleanPayload));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Có lỗi xảy ra khi lưu giao dịch' : 'Failed to save transaction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-modal-enter my-auto transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isVi ? (initialData ? 'Chỉnh sửa giao dịch' : 'Giao dịch mới') : (initialData ? 'Edit Transaction' : 'New Transaction')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Ghi nhận chi tiêu, thu nhập hoặc chuyển khoản' : 'Track expenses, income, or transfers'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSafeDismiss}
            disabled={isSubmitting}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transaction Type Segmented Control */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl gap-1">
            {[
              { id: 'Chi tiêu', label: isVi ? 'Chi tiêu' : 'Expense' },
              { id: 'Thu nhập', label: isVi ? 'Thu nhập' : 'Income' },
              { id: 'Chuyển tiền', label: isVi ? 'Chuyển tiền' : 'Transfer' }
            ].map(item => (
              <button 
                type="button"
                key={item.id}
                onClick={() => {
                  soundEngine.playPop();
                  setFormData((prev: any) => ({ ...prev, type: item.id, category: '' }));
                }}
                className={`flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  formData.type === item.id 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Amount Input & Quick Increment Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? 'Số tiền (VNĐ)' : 'Amount'} <span className="text-rose-500">*</span>
              </label>
              {Number(formData.amount) > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(Number(formData.amount))}
                </span>
              )}
            </div>
            <input 
              type="number" 
              step="any"
              min="0"
              required
              autoFocus
              value={formData.amount} 
              onChange={e => setFormData((prev: any) => ({ ...prev, amount: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" 
              placeholder="0" 
            />
            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {[
                { label: '+20K', val: 20000 },
                { label: '+50K', val: 50000 },
                { label: '+100K', val: 100000 },
                { label: '+200K', val: 200000 },
                { label: '+500K', val: 500000 },
                { label: '+1M', val: 1000000 }
              ].map(pill => (
                <button
                  type="button"
                  key={pill.label}
                  onClick={() => addAmountQuick(pill.val)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Category Grid Picker */}
          <div className="space-y-2">
            {!isManualInput ? (
              <>
                <CategoryGridPicker
                  type={formData.type}
                  selectedCategory={formData.category}
                  onSelectCategory={(catName) => setFormData((prev: any) => ({ ...prev, category: catName }))}
                />
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsManualInput(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isVi ? 'Hoặc tự nhập tên khác...' : 'Or enter custom name...'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isVi ? 'Tự nhập danh mục' : 'Custom Category'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualInput(false)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isVi ? '← Chọn từ danh sách có sẵn' : '← Pick from list'}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={e => setFormData((prev: any) => ({ ...prev, category: e.target.value }))} 
                    className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder={isVi ? 'Ví dụ: Ăn uống, Tiền lương, Mua sắm...' : 'e.g. Dining, Salary, Groceries...'} 
                  />
                  {formData.category && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, category: '' }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Xóa danh mục"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Primary Account Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {formData.type === 'Chuyển tiền' 
                ? (isVi ? 'Từ tài khoản nguồn' : 'From Account') 
                : (isVi ? 'Tài khoản' : 'Account')} <span className="text-rose-500">*</span>
            </label>
            <select 
              value={formData.accountId} 
              onChange={e => setFormData((prev: any) => ({ ...prev, accountId: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{isVi ? '-- Chọn tài khoản --' : '-- Select Account --'}</option>
              {safeAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.balance || 0)})
                </option>
              ))}
            </select>
          </div>

          {/* To Account Selection for Transfer */}
          {formData.type === 'Chuyển tiền' && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Đến tài khoản nhận' : 'To Account'} <span className="text-rose-500">*</span>
              </label>
              <select 
                value={formData.toAccountId} 
                onChange={e => setFormData((prev: any) => ({ ...prev, toAccountId: e.target.value }))} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{isVi ? '-- Chọn tài khoản --' : '-- Select Account --'}</option>
                {safeAccounts
                  .filter((a: any) => a.id !== formData.accountId)
                  .map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance || 0)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date and Project Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Ngày giao dịch' : 'Date'}
              </label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData((prev: any) => ({ ...prev, date: e.target.value }))} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Dự án liên kết' : 'Linked Project'}
              </label>
              <select 
                value={formData.projectId || ''} 
                onChange={e => setFormData((prev: any) => ({ ...prev, projectId: e.target.value }))} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{isVi ? '-- Không liên kết --' : '-- None --'}</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Ghi chú' : 'Note'}
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.note} 
                onChange={e => setFormData((prev: any) => ({ ...prev, note: e.target.value }))} 
                className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder={isVi ? 'Ví dụ: Ăn trưa cùng nhóm, Tiền thưởng...' : 'e.g. Lunch with team'}
              />
              {formData.note && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, note: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Xóa ghi chú"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button 
              type="button" 
              onClick={handleSafeDismiss} 
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
                <span>{isVi ? 'Lưu giao dịch' : 'Save Transaction'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionModal;
