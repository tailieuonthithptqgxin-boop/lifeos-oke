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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {account ? 'Edit Account' : 'New Account'}
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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Account Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e=>setFormData({...formData, name: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="e.g. Chase Bank, Apple Pay, Cash..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select 
              value={formData.type} 
              onChange={e=>setFormData({...formData, type: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Ngân hàng">Bank Account</option>
              <option value="Ví điện tử">E-Wallet</option>
              <option value="Tiền mặt">Cash</option>
              <option value="Tiết kiệm">Savings</option>
              <option value="Đầu tư">Investment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {account ? 'Available Balance (VND)' : 'Initial Balance (VND)'}
            </label>
            <input 
              type="number" 
              value={formData.balance} 
              onChange={e=>setFormData({...formData, balance: Number(e.target.value)})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
            <p className="text-[11px] text-slate-500 mt-1">
              You can adjust this balance anytime to match your actual statement.
            </p>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl btn-squishy cursor-pointer">Cancel</button>
          <button type="button" onClick={() => onSave(formData)} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl btn-squishy cursor-pointer shadow-md shadow-emerald-500/20">Save Account</button>
        </div>
      </div>
    </div>
  );
}
