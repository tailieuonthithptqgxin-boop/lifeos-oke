import React, { useState, useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface DebtModalProps {
  debt: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string, debt?: any) => void;
}

export function DebtModal({ debt, onClose, onSave, onDelete }: DebtModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialTitle = debt?.title || debt?.name || '';
  const initialPerson = debt?.person || debt?.counterpart || '';
  const initialAmount = debt?.amount !== undefined ? debt.amount : 0;
  const initialType = debt?.type || 'Cho vay';
  const initialDueDate = debt?.dueDate || '';
  const initialStatus = debt?.status || 'Chưa trả';

  const [formData, setFormData] = useState<any>({
    title: initialTitle,
    person: initialPerson,
    amount: initialAmount,
    type: initialType,
    dueDate: initialDueDate,
    status: initialStatus
  });

  const isFormDirty = Boolean(
    (formData.title || '').trim() !== initialTitle ||
    (formData.person || '').trim() !== initialPerson ||
    Number(formData.amount) !== Number(initialAmount) ||
    formData.type !== initialType ||
    (formData.dueDate || '') !== initialDueDate
  );

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDirty]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? (debt ? 'Chỉnh sửa khoản nợ / cho vay' : 'Khoản nợ / Cho vay mới') : (debt ? 'Edit Debt / Loan' : 'New Debt / Loan')}
          </h3>
          <div className="flex items-center gap-1">
            {debt && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(debt.id, debt)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg btn-squishy cursor-pointer"
                title={isVi ? 'Xóa bản ghi này (Có thể hoàn tác 5s)' : 'Delete this record (5s Undo)'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSafeDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg btn-squishy cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Phân loại' : 'Type'}
              </label>
              <select 
                value={formData.type} 
                onChange={e=>setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Cho vay">{isVi ? 'Cho vay (Người khác nợ tôi)' : 'Lent (Others owe me)'}</option>
                <option value="Đi vay">{isVi ? 'Đi vay (Tôi nợ người khác)' : 'Borrowed (I owe others)'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Trạng thái' : 'Status'}
              </label>
              <select 
                value={formData.status} 
                onChange={e=>setFormData({...formData, status: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Chưa trả">{isVi ? 'Chưa thanh toán' : 'Pending'}</option>
                <option value="Đã trả">{isVi ? 'Đã hoàn tất' : 'Settled'}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Mô tả / Tiêu đề' : 'Description / Title'}
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.title} 
                onChange={e=>setFormData({...formData, title: e.target.value})} 
                className="w-full px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
                placeholder={isVi ? 'Ví dụ: Cho bạn mượn tiền học, Chia tiền ăn tối...' : 'e.g. Tuition loan, Dinner bill split...'}
              />
              {formData.title && (
                <button
                  type="button"
                  onClick={() => setFormData({...formData, title: ''})}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Xóa tiêu đề"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Đối tác / Người liên quan' : 'Counterpart'}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  autoFocus
                  value={formData.person} 
                  onChange={e=>setFormData({...formData, person: e.target.value})} 
                  className="w-full px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
                  placeholder={isVi ? 'Ví dụ: Nguyễn Văn A...' : 'e.g. John Doe...'}
                />
                {formData.person && (
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, person: ''})}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Xóa đối tác"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Số tiền (VNĐ)' : 'Amount (VND)'}
              </label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e=>setFormData({...formData, amount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Hạn thanh toán' : 'Due Date'}
            </label>
            <input 
              type="date" 
              value={formData.dueDate} 
              onChange={e=>setFormData({...formData, dueDate: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
          <button 
            type="button" 
            onClick={handleSafeDismiss} 
            disabled={isSubmitting}
            className="px-3.5 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm disabled:opacity-50"
          >
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </button>
          <button 
            type="button" 
            disabled={isSubmitting}
            onClick={() => {
              if (isSubmitting) return;
              const trimmed = (formData.title || '').trim();
              if (!trimmed) {
                triggerShake();
                return;
              }
              setIsSubmitting(true);
              try {
                onSave({
                  ...formData,
                  title: trimmed,
                  person: (formData.person || '').trim(),
                  amount: Math.max(0, Number(formData.amount) || 0)
                });
              } finally {
                setIsSubmitting(false);
              }
            }} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm disabled:opacity-50"
          >
            {isVi ? 'Lưu khoản nợ' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
