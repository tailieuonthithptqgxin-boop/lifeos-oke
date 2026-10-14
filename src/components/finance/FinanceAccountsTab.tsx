import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface FinanceAccountsTabProps {
  financeAccounts: any[];
  getAccountIcon: (type: string) => React.ReactNode;
  formatCurrency: (val: number) => string;
  onEditAccount: (acc: any) => void;
  onDeleteAccount: (id: string) => void;
  onAddAccount: () => void;
}

export const FinanceAccountsTab: React.FC<FinanceAccountsTabProps> = ({
  financeAccounts,
  getAccountIcon,
  formatCurrency,
  onEditAccount,
  onDeleteAccount,
  onAddAccount
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {financeAccounts.map((acc: any) => (
        <div key={acc.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 group relative">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6' }}>
              {getAccountIcon(acc.type)}
            </div>
            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onEditAccount(acc)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                title={isVi ? 'Chỉnh sửa tài khoản' : 'Edit account'}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmMsg = isVi 
                    ? `Bạn có chắc muốn xóa tài khoản "${acc.name}" không?` 
                    : `Are you sure you want to delete account "${acc.name}"?`;
                  if (window.confirm?.(confirmMsg)) {
                    onDeleteAccount(acc.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title={isVi ? 'Xóa tài khoản' : 'Delete account'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500">{acc.type}</div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{acc.name}</h3>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">
                {isVi ? 'Số dư hiện tại' : 'Current Balance'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(acc.balance)}</div>
            </div>
          </div>
        </div>
      ))}
      <div 
        onClick={onAddAccount} 
        className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[170px]"
      >
        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm text-slate-600 dark:text-slate-300 mb-3">
          <Plus className="w-5 h-5" />
        </div>
        <div className="font-bold text-slate-900 dark:text-white">
          {isVi ? 'Thêm tài khoản' : 'Add Account'}
        </div>
        <div className="text-sm text-slate-500 mt-1">
          {isVi ? 'Ngân hàng, ví, tiết kiệm...' : 'Bank, wallet, savings...'}
        </div>
      </div>
    </div>
  );
};
