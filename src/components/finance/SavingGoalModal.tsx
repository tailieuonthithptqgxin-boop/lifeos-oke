import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface SavingGoalModalProps {
  goal: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function SavingGoalModal({ goal, onClose, onSave, onDelete }: SavingGoalModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';
  const [formData, setFormData] = useState<any>({
    title: goal?.title || goal?.name || '',
    targetAmount: goal?.targetAmount !== undefined ? goal.targetAmount : 10000000,
    currentAmount: goal?.currentAmount !== undefined ? goal.currentAmount : 0,
    deadline: goal?.deadline || ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? (goal ? 'Chỉnh sửa mục tiêu tiết kiệm' : 'Mục tiêu tiết kiệm mới') : (goal ? 'Edit Savings Goal' : 'New Savings Goal')}
          </h3>
          <div className="flex items-center gap-1">
            {goal && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(goal.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg btn-squishy cursor-pointer"
                title={isVi ? 'Xóa mục tiêu này' : 'Delete this goal'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg btn-squishy cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Tên mục tiêu' : 'Goal Name'}
            </label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder={isVi ? 'Ví dụ: Quỹ khẩn cấp, Mua laptop, Du lịch...' : 'e.g. Emergency Fund, New Laptop, Travel...'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Mục tiêu (VNĐ)' : 'Target (VND)'}
              </label>
              <input 
                type="number" 
                value={formData.targetAmount} 
                onChange={e=>setFormData({...formData, targetAmount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Đã tích lũy (VNĐ)' : 'Current Saved (VND)'}
              </label>
              <input 
                type="number" 
                value={formData.currentAmount} 
                onChange={e=>setFormData({...formData, currentAmount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Hạn chót mục tiêu' : 'Target Deadline'}
            </label>
            <input 
              type="date" 
              value={formData.deadline} 
              onChange={e=>setFormData({...formData, deadline: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-3.5 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm">
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.title.trim()) return;
              onSave(formData);
            }} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
          >
            {isVi ? 'Lưu mục tiêu' : 'Save Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}
