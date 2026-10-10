import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface AccountModalProps {
  account: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function AccountModal({ account, onClose, onSave, onDelete }: AccountModalProps) {
  const [formData, setFormData] = useState<any>({
    name: account?.name || '',
    type: account?.type || 'Ngân hàng',
    balance: account?.balance !== undefined ? account.balance : 0,
    currency: account?.currency || 'VND',
    color: account?.color || '#3b82f6'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {account ? 'Chỉnh sửa tài khoản' : 'Tài khoản mới'}
          </h3>
          <div className="flex items-center gap-1">
            {account && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa tài khoản này"
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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên tài khoản</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e=>setFormData({...formData, name: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Vietcombank, Ví MoMo, Tiền mặt..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Loại</label>
            <select 
              value={formData.type} 
              onChange={e=>setFormData({...formData, type: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option>Ngân hàng</option>
              <option>Ví điện tử</option>
              <option>Tiền mặt</option>
              <option>Tiết kiệm</option>
              <option>Đầu tư</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {account ? 'Số dư khả dụng (VNĐ)' : 'Số dư ban đầu (VNĐ)'}
            </label>
            <input 
              type="number" 
              value={formData.balance} 
              onChange={e=>setFormData({...formData, balance: Number(e.target.value)})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Bạn có thể điều chỉnh số dư này về 0 hoặc số thực tế của bạn bất kỳ lúc nào.
            </p>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer">Lưu</button>
        </div>
      </div>
    </div>
  );
}
