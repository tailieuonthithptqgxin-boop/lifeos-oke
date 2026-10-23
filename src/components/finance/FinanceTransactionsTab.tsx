import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, Search, Filter, Trash2, Edit2, ArrowUpDown } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { StateHandler } from '../common/StateHandler';

interface FinanceTransactionsTabProps {
  transactions: any[];
  formatCurrency: (val: number) => string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: any) => void;
  isLoading?: boolean;
}

export const FinanceTransactionsTab: React.FC<FinanceTransactionsTabProps> = ({
  transactions = [],
  formatCurrency,
  onDeleteTransaction,
  onEditTransaction,
  isLoading = false
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu nhập' | 'Chi tiêu' | 'Chuyển tiền'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        !searchTerm || 
        (tx.category && tx.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(isVi ? 'Bạn có chắc chắn muốn xóa giao dịch này không?' : 'Are you sure you want to delete this transaction?')) {
      setDeletingId(id);
      try {
        onDeleteTransaction(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Header and Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? 'Lịch sử giao dịch' : 'Transaction History'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isVi ? `Hiển thị ${filteredTransactions.length} trên tổng ${transactions.length} giao dịch` : `Showing ${filteredTransactions.length} of ${transactions.length} transactions`}
          </p>
        </div>

        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isVi ? 'Tìm danh mục, ghi chú...' : 'Search category, note...'}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['all', 'Thu nhập', 'Chi tiêu', 'Chuyển tiền'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setTypeFilter(tab)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  typeFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'all' ? (isVi ? 'Tất cả' : 'All') : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List with StateHandler */}
      <StateHandler
        isLoading={isLoading}
        isEmpty={filteredTransactions.length === 0}
        type="list"
        skeletonCount={4}
        emptyTitle={isVi ? 'Chưa có giao dịch phù hợp' : 'No transactions found'}
        emptyDescription={
          searchTerm || typeFilter !== 'all'
            ? (isVi ? 'Không tìm thấy giao dịch nào khớp với bộ lọc hiện tại.' : 'No transactions match your current search or filter criteria.')
            : (isVi ? 'Ghi nhận giao dịch thu chi đầu tiên để bắt đầu theo dõi dòng tiền.' : 'Record your first transaction to start tracking cash flow.')
        }
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTransactions.map((tx: any) => {
            const isIncome = tx.type === 'Thu nhập' || tx.type === 'Income';
            const isExpense = tx.type === 'Chi tiêu' || tx.type === 'Expense';
            const isTransfer = tx.type === 'Chuyển tiền' || tx.type === 'Transfer';

            return (
              <div 
                key={tx.id} 
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 min-w-[40px] rounded-2xl flex items-center justify-center shrink-0 ${
                    isIncome 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                      : isExpense 
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {isIncome ? <TrendingUp className="w-5 h-5 stroke-[2]" /> : 
                     isExpense ? <TrendingDown className="w-5 h-5 stroke-[2]" /> : 
                     <ArrowRightLeft className="w-5 h-5 stroke-[2]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {tx.category || (isVi ? 'Chung' : 'General')}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isIncome
                          ? 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : isExpense
                          ? 'bg-rose-100/60 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                          : 'bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {tx.type}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {tx.note ? `${tx.note} • ` : ''}
                      {tx.date ? new Date(tx.date).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className={`font-black font-mono text-xs sm:text-base text-right ${
                    isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                    isExpense ? 'text-slate-900 dark:text-white' :
                    'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(Number(tx.amount) || 0)}
                  </div>

                  {/* Actions with touch target >= 44px */}
                  <div className="flex items-center gap-1">
                    {onEditTransaction && (
                      <button 
                        type="button"
                        onClick={() => onEditTransaction(tx)} 
                        className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isVi ? 'Chỉnh sửa' : 'Edit'}
                        aria-label="Edit transaction"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="button"
                      disabled={deletingId === tx.id}
                      onClick={(e) => handleDelete(tx.id, e)} 
                      className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      title={isVi ? 'Xóa' : 'Delete'}
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StateHandler>
    </div>
  );
};

export default FinanceTransactionsTab;
