import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DebtModalProps {
  debt: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function DebtModal({ debt, onClose, onSave, onDelete }: DebtModalProps) {
  const [formData, setFormData] = useState<any>({
    title: debt?.title || debt?.name || '',
    person: debt?.person || debt?.counterpart || '',
    amount: debt?.amount !== undefined ? debt.amount : 0,
    type: debt?.type || 'Cho vay',
    dueDate: debt?.dueDate || '',
    status: debt?.status || 'Chưa trả'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {debt ? 'Chỉnh sửa khoản nợ/cho vay' : 'Khoản nợ/cho vay mới'}
          </h3>
          <div className="flex items-center gap-1">
            {debt && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(debt.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa khoản này"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Loại khoản</label>
              <select 
                value={formData.type} 
                onChange={e=>setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Cho vay">Cho vay (Người khác nợ tôi)</option>
                <option value="Đi vay">Đi vay (Tôi nợ người khác)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
              <select 
                value={formData.status} 
                onChange={e=>setFormData({...formData, status: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Chưa trả">Chưa trả</option>
                <option value="Đã trả">Đã hoàn thành</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả / Tiêu đề</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Mượn tiền đóng học phí, Tiền ăn tối..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Người liên quan</label>
              <input 
                type="text" 
                value={formData.person} 
                onChange={e=>setFormData({...formData, person: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
                placeholder="VD: Nguyễn Văn A..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Số tiền (VNĐ)</label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e=>setFormData({...formData, amount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn thanh toán</label>
            <input 
              type="date" 
              value={formData.dueDate} 
              onChange={e=>setFormData({...formData, dueDate: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.title.trim()) return;
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
