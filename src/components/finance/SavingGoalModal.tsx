import React, { useState, useEffect, useRef } from 'react';
import { Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface SavingGoalModalProps {
  goal: any;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  onDelete?: (id: string, goal?: any) => void | Promise<void>;
}

export function SavingGoalModal({ goal, onClose, onSave, onDelete }: SavingGoalModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialTitle = goal?.title || goal?.name || '';
  const initialTarget = goal?.targetAmount !== undefined ? goal.targetAmount : 10000000;
  const initialCurrent = goal?.currentAmount !== undefined ? goal.currentAmount : 0;
  const initialDeadline = goal?.deadline ? goal.deadline.slice(0, 10) : '';

  const [formData, setFormData] = useState<any>({
    title: initialTitle,
    targetAmount: initialTarget,
    currentAmount: initialCurrent,
    deadline: initialDeadline
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDirty = Boolean(
    (formData.title || '').trim() !== initialTitle ||
    Number(formData.targetAmount) !== Number(initialTarget) ||
    Number(formData.currentAmount) !== Number(initialCurrent) ||
    (formData.deadline || '') !== initialDeadline
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
        handleSafeDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDirty, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const title = (formData.title || '').trim();
    if (!title) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên mục tiêu tích lũy' : 'Please enter goal title');
      return;
    }

    const targetAmount = Number(formData.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setErrorMessage(isVi ? 'Số tiền mục tiêu phải lớn hơn 0' : 'Target amount must be greater than 0');
      return;
    }

    const currentAmount = Number(formData.currentAmount) || 0;

    const payload = {
      ...formData,
      title,
      targetAmount,
      currentAmount,
      deadline: formData.deadline || null
    };

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(payload));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể lưu mục tiêu tích lũy' : 'Failed to save goal'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!goal?.id || !onDelete || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await Promise.resolve(onDelete(goal.id, goal));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Không thể xóa mục tiêu' : 'Failed to delete goal'));
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
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget && !isSubmitting) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-modal-enter ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isVi ? (goal ? 'Chỉnh sửa mục tiêu tiết kiệm' : 'Mục tiêu tiết kiệm mới') : (goal ? 'Edit Savings Goal' : 'New Savings Goal')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isVi ? 'Tích lũy tài chính cho các dự định quan trọng' : 'Build discipline and reach milestone funds'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {goal && onDelete && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title={isVi ? 'Xóa mục tiêu (Có thể hoàn tác 5s)' : 'Delete goal (5s Undo)'}
                aria-label="Delete goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSafeDismiss}
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
              {isVi ? 'Tên mục tiêu' : 'Goal Name'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input 
                type="text" 
                required
                autoFocus
                value={formData.title} 
                onChange={e => setFormData((prev: any) => ({ ...prev, title: e.target.value }))} 
                className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder={isVi ? 'Ví dụ: Quỹ khẩn cấp, Mua laptop, Du lịch...' : 'e.g. Emergency Fund, New Laptop, Travel...'}
              />
              {formData.title && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, title: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Xóa tên"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Mục tiêu (VNĐ)' : 'Target (VND)'} <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number" 
                min="0"
                step="any"
                required
                value={formData.targetAmount} 
                onChange={e => setFormData((prev: any) => ({ ...prev, targetAmount: e.target.value }))} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Đã tích lũy (VNĐ)' : 'Current Saved (VND)'}
              </label>
              <input 
                type="number" 
                min="0"
                step="any"
                value={formData.currentAmount} 
                onChange={e => setFormData((prev: any) => ({ ...prev, currentAmount: e.target.value }))} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Hạn chót mục tiêu' : 'Target Deadline'}
            </label>
            <input 
              type="date" 
              value={formData.deadline} 
              onChange={e => setFormData((prev: any) => ({ ...prev, deadline: e.target.value }))} 
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
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
                <span>{isVi ? 'Lưu mục tiêu' : 'Save Goal'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SavingGoalModal;
