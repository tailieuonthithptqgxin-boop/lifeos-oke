import React from 'react';
import { Activity, Plus } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface FinanceScenarioTabProps {
  financeAccounts: any[];
  budgets: any[];
  monthlyTx: any[];
  selectedAccId: string;
  setSelectedAccId: (id: string) => void;
  forecastAmount: number;
  setForecastAmount: (val: number) => void;
  forecastCategory: string;
  setForecastCategory: (val: string) => void;
  forecastNote: string;
  setForecastNote: (val: string) => void;
  formatCurrency: (val: number) => string;
  onExecuteRealTransaction: () => void;
  onOpenAccountModal: () => void;
}

export const FinanceScenarioTab: React.FC<FinanceScenarioTabProps> = ({
  financeAccounts,
  budgets,
  monthlyTx,
  selectedAccId,
  setSelectedAccId,
  forecastAmount,
  setForecastAmount,
  forecastCategory,
  setForecastCategory,
  forecastNote,
  setForecastNote,
  formatCurrency,
  onExecuteRealTransaction,
  onOpenAccountModal
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const currentAccount = (financeAccounts || []).find((a: any) => a.id === selectedAccId) || (financeAccounts && financeAccounts.length > 0 ? financeAccounts[0] : null);
  const accountBalance = currentAccount ? (currentAccount.balance || 0) : 0;
  const newBalance = accountBalance - forecastAmount;
  const targetBudget = (budgets || []).find((b: any) => b.category === forecastCategory);
  const spentInBudget = (monthlyTx || [])
    .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.category === forecastCategory)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const projectedBudgetSpent = spentInBudget + forecastAmount;
  const isBudgetExceeded = targetBudget && targetBudget.limit > 0 && projectedBudgetSpent > targetBudget.limit;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isVi ? 'Dự báo Dòng tiền & Tác động Chi tiêu Thực tế' : 'Cash Flow Simulator & Real Expense Impact'}
        </h3>
        <p className="text-slate-500 max-w-lg mb-6 text-sm">
          {isVi 
            ? 'Tính toán chính xác số dư thực tế sau khi chi tiêu, kiểm tra hạn mức ngân sách tháng và ghi nhận trực tiếp vào tài khoản của bạn.' 
            : 'Simulate exact ending balance post-spending, verify against monthly budget caps, and execute directly into your live account.'}
        </p>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl text-left space-y-4">
          {financeAccounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {isVi ? 'Bạn chưa có tài khoản nào để dự báo dòng tiền.' : 'You have no accounts yet to simulate cash flow.'}
              </p>
              <button 
                type="button"
                onClick={onOpenAccountModal} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isVi ? '+ Thêm tài khoản thực tế' : '+ Add Real Account'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Chọn tài khoản chi trả:' : 'Select paying account:'}
                  </label>
                  <select
                    value={currentAccount?.id || ''}
                    onChange={e => setSelectedAccId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    {financeAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Danh mục ngân sách:' : 'Budget category:'}
                  </label>
                  <input 
                    type="text" 
                    value={forecastCategory} 
                    onChange={e => setForecastCategory(e.target.value)} 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Số tiền chi dự kiến:' : 'Projected spending amount:'}
                  </label>
                  <input 
                    type="number" 
                    value={forecastAmount} 
                    onChange={e => setForecastAmount(Math.max(0, Number(e.target.value)))} 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-black text-lg text-red-600 font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Ghi chú mục đích:' : 'Purpose note:'}
                  </label>
                  <input 
                    type="text" 
                    value={forecastNote} 
                    onChange={e => setForecastNote(e.target.value)} 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white" 
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isVi ? 'Tính toán thực tế:' : 'Live Calculation:'}
                </h4>
                
                <div className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    {isVi ? 'Số dư hiện tại của tài khoản:' : 'Current account balance:'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(accountBalance)}</span>
                </div>

                <div className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">
                    {isVi ? 'Số dư sau khi thực hiện:' : 'Projected balance post-expense:'}
                  </span>
                  <span className={`font-black font-mono ${newBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatCurrency(newBalance)} {newBalance < 0 && (isVi ? '(Thấu chi / Âm)' : '(Overdraft / Negative)')}
                  </span>
                </div>

                {targetBudget && (
                  <div className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">
                      {isVi ? `Ngân sách ${forecastCategory} (${formatCurrency(targetBudget.limit)}):` : `${forecastCategory} Budget (${formatCurrency(targetBudget.limit)}):`}
                    </span>
                    <span className={`font-bold font-mono ${isBudgetExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {Math.round((projectedBudgetSpent / targetBudget.limit) * 100)}% {isVi ? 'hạn mức' : 'limit'} {isBudgetExceeded ? (isVi ? '(Vượt hạn mức)' : '(Over budget)') : (isVi ? '(An toàn)' : '(Within limit)')}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onExecuteRealTransaction}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {isVi ? 'Ghi nhận giao dịch thực tế vào tài khoản ngay' : 'Record Real Transaction into Account Now'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
