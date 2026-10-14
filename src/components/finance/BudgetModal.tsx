import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface BudgetModalProps {
  budget: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function BudgetModal({ budget, onClose, onSave, onDelete }: BudgetModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';
  const [formData, setFormData] = useState<any>({
    category: budget?.category || '',
    limit: budget?.limit !== undefined ? budget.limit : 1000000,
    period: budget?.period || 'Hàng tháng'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? (budget ? 'Chỉnh sửa ngân sách' : 'Ngân sách mới') : (budget ? 'Edit Budget' : 'New Budget')}
          </h3>
          <div className="flex items-center gap-1">
            {budget && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg btn-squishy cursor-pointer"
                title={isVi ? 'Xóa ngân sách này' : 'Delete this budget'}
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
              {isVi ? 'Danh mục chi tiêu' : 'Expense Category'}
            </label>
            <input 
              type="text" 
              value={formData.category} 
              onChange={e=>setFormData({...formData, category: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder={isVi ? 'Ví dụ: Ăn uống, Mua sắm, Du lịch, Tiền nhà...' : 'e.g. Dining, Shopping, Travel, Housing...'}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Hạn mức ngân sách (VNĐ)' : 'Budget Limit (VND)'}
            </label>
            <input 
              type="number" 
              value={formData.limit} 
              onChange={e=>setFormData({...formData, limit: Math.max(0, Number(e.target.value))})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Kỳ hạn' : 'Period'}
            </label>
            <select 
              value={formData.period} 
              onChange={e=>setFormData({...formData, period: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Hàng tháng">{isVi ? 'Hàng tháng' : 'Monthly'}</option>
              <option value="Hàng tuần">{isVi ? 'Hàng tuần' : 'Weekly'}</option>
              <option value="Hàng quý">{isVi ? 'Hàng quý' : 'Quarterly'}</option>
              <option value="Hàng năm">{isVi ? 'Hàng năm' : 'Yearly'}</option>
            </select>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl btn-squishy cursor-pointer">
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.category.trim()) return;
              onSave(formData);
            }} 
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl btn-squishy cursor-pointer shadow-md shadow-emerald-500/20"
          >
            {isVi ? 'Lưu ngân sách' : 'Save Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}
