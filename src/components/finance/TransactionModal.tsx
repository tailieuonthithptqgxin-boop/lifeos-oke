import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { formatCurrency } from '../../lib/utils';

interface TransactionModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  accounts: any[];
  initialData?: any;
}

export function TransactionModal({ onClose, onSave, accounts = [], initialData }: TransactionModalProps) {
  const { projects = [], language } = useAppStore();
  const isVi = language === 'vi';
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const [formData, setFormData] = useState<any>(() => ({
    type: initialData?.type || 'Chi tiêu',
    amount: initialData?.amount !== undefined ? initialData.amount : '',
    category: initialData?.category || '',
    accountId: initialData?.accountId || (safeAccounts.length > 0 ? safeAccounts[0].id : ''),
    toAccountId: initialData?.toAccountId || '',
    date: initialData?.date ? initialData.date.slice(0, 10) : new Date().toISOString().split('T')[0],
    note: initialData?.note || ''
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? (initialData ? 'Chỉnh sửa giao dịch' : 'Giao dịch mới') : (initialData ? 'Edit Transaction' : 'New Transaction')}
          </h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'Chi tiêu', label: isVi ? 'Chi tiêu' : 'Expense' },
              { id: 'Thu nhập', label: isVi ? 'Thu nhập' : 'Income' },
              { id: 'Chuyển tiền', label: isVi ? 'Chuyển tiền' : 'Transfer' }
            ].map(item => (
              <button 
                type="button"
                key={item.id}
                onClick={() => setFormData({...formData, type: item.id})}
                className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  formData.type === item.id 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Số tiền' : 'Amount'}
            </label>
            <input 
              type="number" 
              value={formData.amount} 
              onChange={e=>setFormData({...formData, amount: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg font-black text-slate-900 dark:text-white" 
              placeholder="0" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Danh mục' : 'Category'}
            </label>
            <input 
              type="text" 
              value={formData.category} 
              onChange={e=>setFormData({...formData, category: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder={isVi ? 'Ví dụ: Ăn uống, Tiền lương, Mua sắm...' : 'e.g. Dining, Salary, Groceries...'} 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {formData.type === 'Chuyển tiền' 
                ? (isVi ? 'Từ tài khoản' : 'From Account') 
                : (isVi ? 'Tài khoản' : 'Account')}
            </label>
            <select 
              value={formData.accountId} 
              onChange={e=>setFormData({...formData, accountId: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isVi ? '-- Chọn tài khoản --' : '-- Select Account --'}</option>
              {accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>

          {formData.type === 'Chuyển tiền' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Đến tài khoản' : 'To Account'}
              </label>
              <select 
                value={formData.toAccountId} 
                onChange={e=>setFormData({...formData, toAccountId: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">{isVi ? '-- Chọn tài khoản --' : '-- Select Account --'}</option>
                {accounts.filter((a:any) => a.id !== formData.accountId).map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Ngày' : 'Date'}
              </label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e=>setFormData({...formData, date: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Liên kết dự án (Không bắt buộc)' : 'Linked Project (Optional)'}
            </label>
            <select 
              value={formData.projectId || ''} 
              onChange={e=>setFormData({...formData, projectId: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isVi ? '-- Không liên kết --' : '-- None --'}</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {isVi ? 'Chi phí sẽ tự động được ghi nhận vào ngân sách dự án.' : 'Expenses will be automatically tracked towards project budget.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Ghi chú' : 'Note'}
            </label>
            <input 
              type="text" 
              value={formData.note} 
              onChange={e=>setFormData({...formData, note: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder={isVi ? 'Ví dụ: Ăn trưa cùng nhóm, Tiền thưởng...' : 'e.g. Lunch with team'}
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-3.5 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm">
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              const amt = Number(formData.amount) || 0;
              if (amt <= 0) {
                alert(isVi ? 'Vui lòng nhập số tiền lớn hơn 0' : 'Please enter an amount greater than 0');
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
                accountId: formData.accountId || (safeAccounts[0]?.id || ''),
                toAccountId: formData.type === 'Chuyển tiền' ? (formData.toAccountId || null) : null,
                date: formData.date || new Date().toISOString().split('T')[0],
                note: finalNote || null
              };

              onSave(cleanPayload);
            }} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
          >
            {isVi ? 'Lưu giao dịch' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
