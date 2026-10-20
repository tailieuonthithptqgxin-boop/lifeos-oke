import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { StateHandler } from '../common/StateHandler';

interface FinanceAccountsTabProps {
  financeAccounts: any[];
  getAccountIcon: (type: string) => React.ReactNode;
  formatCurrency: (val: number) => string;
  onEditAccount: (acc: any) => void;
  onDeleteAccount: (id: string) => void;
  onAddAccount: () => void;
  isLoading?: boolean;
}

export const FinanceAccountsTab: React.FC<FinanceAccountsTabProps> = ({
  financeAccounts = [],
  getAccountIcon,
  formatCurrency,
  onEditAccount,
  onDeleteAccount,
  onAddAccount,
  isLoading = false
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? 'Danh sách tài khoản & Ví' : 'Accounts & Wallets'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isVi ? `Quản lý ${financeAccounts.length} nguồn tiền khả dụng` : `Managing ${financeAccounts.length} available accounts`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddAccount}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isVi ? 'Thêm tài khoản' : 'Add Account'}</span>
        </button>
      </div>

      <StateHandler
        isLoading={isLoading}
        isEmpty={financeAccounts.length === 0}
        type="cards"
        skeletonCount={3}
        emptyTitle={isVi ? 'Chưa có tài khoản nào' : 'No accounts added yet'}
        emptyDescription={isVi ? 'Hãy thêm tài khoản ngân hàng, ví tiền điện tử hoặc tiền mặt đầu tiên.' : 'Add your first bank account, e-wallet, or cash wallet.'}
        onEmptyAction={onAddAccount}
        emptyActionLabel={isVi ? 'Thêm tài khoản ngay' : 'Add Account Now'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeAccounts.map((acc: any) => (
            <div 
              key={acc.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-5 group relative flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold" 
                    style={{ backgroundColor: `${acc.color || '#10b981'}15`, color: acc.color || '#10b981' }}
                  >
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditAccount(acc)}
                      className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title={isVi ? 'Chỉnh sửa tài khoản' : 'Edit account'}
                      aria-label="Edit account"
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
                      className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title={isVi ? 'Xóa tài khoản' : 'Delete account'}
                      aria-label="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{acc.type}</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{acc.name}</h4>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
                    {isVi ? 'Số dư hiện tại' : 'Current Balance'}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {formatCurrency(Number(acc.balance) || 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Add Card */}
          <div 
            onClick={onAddAccount} 
            className="bg-slate-50/70 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[180px] group"
          >
            <div className="w-11 h-11 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-xs text-slate-600 dark:text-slate-300 mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {isVi ? 'Thêm tài khoản mới' : 'Add New Account'}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {isVi ? 'Ngân hàng, ví điện tử, tiền mặt...' : 'Bank, e-wallet, savings...'}
            </div>
          </div>
        </div>
      </StateHandler>
    </div>
  );
};

export default FinanceAccountsTab;
