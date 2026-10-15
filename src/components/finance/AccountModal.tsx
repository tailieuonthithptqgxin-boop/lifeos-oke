import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface AccountModalProps {
  account: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function AccountModal({ account, onClose, onSave, onDelete }: AccountModalProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';
  const [formData, setFormData] = useState<any>({
    name: account?.name || '',
    type: account?.type || 'Ngân hàng',
    balance: account?.balance !== undefined ? account.balance : 0,
    currency: account?.currency || 'VND',
    color: account?.color || '#3b82f6'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? (account ? 'Chỉnh sửa tài khoản' : 'Tài khoản mới') : (account ? 'Edit Account' : 'New Account')}
          </h3>
          <div className="flex items-center gap-1">
            {account && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg btn-squishy cursor-pointer"
                title="Delete this account"
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
              {isVi ? 'Tên tài khoản' : 'Account Name'}
            </label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e=>setFormData({...formData, name: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder={isVi ? 'Ví dụ: Vietcombank, Momo, Tiền mặt ví...' : 'e.g. Chase Bank, Apple Pay, Cash...'}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Loại tài khoản' : 'Type'}
            </label>
            <select 
              value={formData.type} 
              onChange={e=>setFormData({...formData, type: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Ngân hàng">{isVi ? 'Tài khoản ngân hàng' : 'Bank Account'}</option>
              <option value="Ví điện tử">{isVi ? 'Ví điện tử' : 'E-Wallet'}</option>
              <option value="Tiền mặt">{isVi ? 'Tiền mặt' : 'Cash'}</option>
              <option value="Tiết kiệm">{isVi ? 'Sổ tiết kiệm' : 'Savings'}</option>
              <option value="Đầu tư">{isVi ? 'Tài khoản đầu tư' : 'Investment'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {account 
                ? (isVi ? 'Số dư khả dụng (VNĐ)' : 'Available Balance (VND)') 
                : (isVi ? 'Số dư ban đầu (VNĐ)' : 'Initial Balance (VND)')}
            </label>
            <input 
              type="number" 
              value={formData.balance} 
              onChange={e=>setFormData({...formData, balance: Number(e.target.value)})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {isVi ? 'Bạn có thể cập nhật số dư này bất kỳ lúc nào để khớp với sao kê thực tế.' : 'You can adjust this balance anytime to match your actual statement.'}
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-3.5 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm">
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </button>
          <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm">
            {isVi ? 'Lưu tài khoản' : 'Save Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
