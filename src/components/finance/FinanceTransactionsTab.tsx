import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface FinanceTransactionsTabProps {
  transactions: any[];
  formatCurrency: (val: number) => string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: any) => void;
}

export const FinanceTransactionsTab: React.FC<FinanceTransactionsTabProps> = ({
  transactions,
  formatCurrency,
  onDeleteTransaction,
  onEditTransaction
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-900 dark:text-white">
          {isVi ? 'Lịch sử giao dịch' : 'Transaction History'}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            {isVi ? 'Chưa có giao dịch nào.' : 'No transactions recorded yet.'}
          </div>
        )}
        {transactions.map((tx: any) => (
          <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${tx.type === 'Thu nhập' || tx.type === 'Income' ? 'bg-green-100 dark:bg-green-950/60 text-green-600' : 
                  tx.type === 'Chi tiêu' || tx.type === 'Expense' ? 'bg-red-100 dark:bg-red-950/60 text-red-600' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'}`}
              >
                {tx.type === 'Thu nhập' || tx.type === 'Income' ? <TrendingUp className="w-5 h-5" /> : 
                  tx.type === 'Chi tiêu' || tx.type === 'Expense' ? <TrendingDown className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{tx.category}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tx.note ? `${tx.note} • ` : ''}{new Date(tx.date).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`font-black font-mono ${tx.type === 'Thu nhập' || tx.type === 'Income' ? 'text-green-600' : tx.type === 'Chi tiêu' || tx.type === 'Expense' ? 'text-slate-900 dark:text-white' : 'text-blue-600'}`}>
                {tx.type === 'Thu nhập' || tx.type === 'Income' ? '+' : tx.type === 'Chi tiêu' || tx.type === 'Expense' ? '-' : ''}{formatCurrency(tx.amount)}
              </div>
              {onEditTransaction && (
                <button 
                  type="button"
                  onClick={() => onEditTransaction(tx)} 
                  className="text-purple-600 dark:text-purple-400 text-xs font-bold hover:underline cursor-pointer"
                >
                  {isVi ? 'Sửa' : 'Edit'}
                </button>
              )}
              <button 
                type="button"
                onClick={() => onDeleteTransaction(tx.id)} 
                className="text-red-500 text-xs font-bold hover:underline cursor-pointer"
              >
                {isVi ? 'Xóa' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
