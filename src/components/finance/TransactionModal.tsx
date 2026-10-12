import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { formatCurrency } from '../../lib/utils';

interface TransactionModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  accounts: any[];
}

export function TransactionModal({ onClose, onSave, accounts = [] }: TransactionModalProps) {
  const { projects = [] } = useAppStore();
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const [formData, setFormData] = useState<any>({
    type: 'Chi tiêu',
    amount: '',
    category: '',
    accountId: safeAccounts.length > 0 ? safeAccounts[0].id : '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Giao dịch mới</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['Chi tiêu', 'Thu nhập', 'Chuyển tiền'].map(type => (
              <button 
                type="button"
                key={type}
                onClick={() => setFormData({...formData, type})}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                  formData.type === type 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Số tiền</label>
            <input 
              type="number" 
              value={formData.amount} 
              onChange={e=>setFormData({...formData, amount: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg font-black text-slate-900 dark:text-white" 
              placeholder="0" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
            <input 
              type="text" 
              value={formData.category} 
              onChange={e=>setFormData({...formData, category: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Ăn uống, Lương..." 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {formData.type === 'Chuyển tiền' ? 'Từ tài khoản' : 'Tài khoản'}
            </label>
            <select 
              value={formData.accountId} 
              onChange={e=>setFormData({...formData, accountId: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>

          {formData.type === 'Chuyển tiền' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Đến tài khoản</label>
              <select 
                value={formData.toAccountId} 
                onChange={e=>setFormData({...formData, toAccountId: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">-- Chọn tài khoản --</option>
                {accounts.filter((a:any) => a.id !== formData.accountId).map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e=>setFormData({...formData, date: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Liên kết Dự án (Tùy chọn)</label>
            <select 
              value={formData.projectId || ''} 
              onChange={e=>setFormData({...formData, projectId: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Không --</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Chi phí sẽ được tính thẳng vào Project Budget.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
            <input 
              type="text" 
              value={formData.note} 
              onChange={e=>setFormData({...formData, note: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">Hủy</button>
          <button type="button" onClick={() => onSave({...formData, amount: Number(formData.amount), status: 'Completed'})} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">Lưu</button>
        </div>
      </div>
    </div>
  );
}
