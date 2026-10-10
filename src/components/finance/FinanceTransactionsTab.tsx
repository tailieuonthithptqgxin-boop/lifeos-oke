import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

interface FinanceTransactionsTabProps {
  transactions: any[];
  formatCurrency: (val: number) => string;
  onDeleteTransaction: (id: string) => void;
}

export const FinanceTransactionsTab: React.FC<FinanceTransactionsTabProps> = ({
  transactions,
  formatCurrency,
  onDeleteTransaction
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-900 dark:text-white">Lịch sử giao dịch</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.length === 0 && (
          <div className="p-8 text-center text-slate-500">Chưa có giao dịch nào.</div>
        )}
        {transactions.map((tx: any) => (
          <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${tx.type === 'Thu nhập' ? 'bg-green-100 dark:bg-green-950/60 text-green-600' : 
                  tx.type === 'Chi tiêu' ? 'bg-red-100 dark:bg-red-950/60 text-red-600' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'}`}
              >
                {tx.type === 'Thu nhập' ? <TrendingUp className="w-5 h-5" /> : 
                 tx.type === 'Chi tiêu' ? <TrendingDown className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{tx.category}</div>
                <div className="text-xs text-slate-500 mt-0.5">{tx.note} • {new Date(tx.date).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-black font-mono ${tx.type === 'Thu nhập' ? 'text-green-600' : tx.type === 'Chi tiêu' ? 'text-slate-900 dark:text-white' : 'text-blue-600'}`}>
                {tx.type === 'Thu nhập' ? '+' : tx.type === 'Chi tiêu' ? '-' : ''}{formatCurrency(tx.amount)}
              </div>
              <button 
                type="button"
                onClick={() => onDeleteTransaction(tx.id)} 
                className="text-red-500 text-xs font-bold hover:underline cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
