import React from 'react';
import { Wallet, X, ArrowRight, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Transaction, FinanceAccount } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface TodayFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: FinanceAccount[];
  todayStr: string;
  language?: string;
  onGoToFinance: () => void;
}

export function TodayFinanceModal({
  isOpen,
  onClose,
  transactions,
  accounts,
  todayStr,
  language = 'vi',
  onGoToFinance
}: TodayFinanceModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = React.useRef<EventTarget | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayTxs = transactions.filter(t => t.date && t.date.startsWith(todayStr));
  const todayExpense = todayTxs.filter(t => t.type === 'Chi tiêu' || (t.type as any) === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const todayIncome = todayTxs.filter(t => t.type === 'Thu nhập' || (t.type as any) === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div
      onMouseDown={e => { mouseDownTargetRef.current = e.target; }}
      onClick={e => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88dvh] sm:max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">Sổ Chi Tiêu Hôm Nay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Tổng số dư ví: {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Đã chi hôm nay</span>
            </div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1">
              {formatCurrency(todayExpense)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Thu vào hôm nay</span>
            </div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {formatCurrency(todayIncome)}
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Giao dịch hôm nay ({todayTxs.length})
          </div>
          {todayTxs.length > 0 ? (
            todayTxs.map(t => {
              const isExpense = t.type === 'Chi tiêu' || (t.type as any) === 'expense';
              return (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {t.note || t.category || 'Giao dịch'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t.category || 'Chung'}
                    </div>
                  </div>
                  <div className={`font-mono font-bold shrink-0 ${
                    isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Hôm nay bạn chưa có giao dịch chi tiêu nào.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">Quản lý ngân sách & quỹ tiết kiệm</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToFinance();
            }}
            className="min-h-[44px] px-2 font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Đến trang Tài Chính</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
