import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface BudgetModalProps {
  budget: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function BudgetModal({ budget, onClose, onSave, onDelete }: BudgetModalProps) {
  const [formData, setFormData] = useState<any>({
    category: budget?.category || '',
    limit: budget?.limit !== undefined ? budget.limit : 1000000,
    period: budget?.period || 'Hàng tháng'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {budget ? 'Chỉnh sửa ngân sách' : 'Ngân sách mới'}
          </h3>
          <div className="flex items-center gap-1">
            {budget && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa ngân sách này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Danh mục chi tiêu</label>
            <input 
              type="text" 
              value={formData.category} 
              onChange={e=>setFormData({...formData, category: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Ăn uống, Mua sắm, Di chuyển, Nhà cửa..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hạn mức ngân sách (VNĐ)
            </label>
            <input 
              type="number" 
              value={formData.limit} 
              onChange={e=>setFormData({...formData, limit: Math.max(0, Number(e.target.value))})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Chu kỳ</label>
            <select 
              value={formData.period} 
              onChange={e=>setFormData({...formData, period: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option>Hàng tháng</option>
              <option>Hàng tuần</option>
              <option>Hàng quý</option>
              <option>Hàng năm</option>
            </select>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.category.trim()) return;
              onSave(formData);
            }} 
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
