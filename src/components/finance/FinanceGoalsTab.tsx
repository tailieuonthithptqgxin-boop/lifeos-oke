import React from 'react';
import { Plus, Edit3, Trash2, PiggyBank, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface FinanceGoalsTabProps {
  savingGoals: any[];
  debts: any[];
  formatCurrency: (val: number) => string;
  onEditSavingGoal: (goal: any) => void;
  onDeleteSavingGoal: (id: string) => void;
  onAddSavingGoal: () => void;
  onEditDebt: (debt: any) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebtStatus: (id: string, status: string) => void;
  onAddDebt: () => void;
}

export const FinanceGoalsTab: React.FC<FinanceGoalsTabProps> = ({
  savingGoals,
  debts,
  formatCurrency,
  onEditSavingGoal,
  onDeleteSavingGoal,
  onAddSavingGoal,
  onEditDebt,
  onDeleteDebt,
  onUpdateDebtStatus,
  onAddDebt
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="space-y-8">
      {/* Section 1: Saving Goals */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <PiggyBank className="w-5 h-5 text-emerald-600" /> {isVi ? 'Mục tiêu Tiết kiệm' : 'Saving Goals'} ({savingGoals.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi ? 'Đặt mục tiêu tài chính cụ thể và theo dõi tiến độ tích lũy.' : 'Set clear financial targets and monitor your accumulation progress.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddSavingGoal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> {isVi ? 'Thêm Mục tiêu' : 'Add Goal'}
          </button>
        </div>

        {savingGoals.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            {isVi ? 'Chưa có mục tiêu tiết kiệm nào. Hãy tạo mục tiêu mới để bắt đầu theo dõi.' : 'No saving goals yet. Create a new goal to start tracking.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingGoals.map((goal: any) => {
              const target = goal.targetAmount || 1;
              const current = goal.currentAmount || 0;
              const progress = Math.min(Math.round((current / target) * 100), 100);

              return (
                <div key={goal.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{goal.title || goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isVi ? 'Hạn chót:' : 'Deadline:'} {new Date(goal.deadline).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditSavingGoal(goal)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title={isVi ? 'Chỉnh sửa' : 'Edit'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmMsg = isVi 
                            ? `Xóa mục tiêu "${goal.title || goal.name}"?` 
                            : `Delete goal "${goal.title || goal.name}"?`;
                          if (window.confirm?.(confirmMsg)) {
                            onDeleteSavingGoal(goal.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title={isVi ? 'Xóa' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-emerald-600 font-mono">{formatCurrency(current)}</span>
                      <span className="text-slate-400 font-mono">{formatCurrency(target)} ({progress}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Debts & Lending */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> {isVi ? 'Sổ Nợ & Cho vay' : 'Debts & Lending'} ({debts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi ? 'Theo dõi các khoản tiền đã cho mượn hoặc cần hoàn trả.' : 'Keep track of borrowed funds and lent amounts.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddDebt}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> {isVi ? 'Thêm Khoản nợ / Cho vay' : 'Add Debt / Lending'}
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            {isVi ? 'Chưa có khoản nợ hoặc cho vay nào được ghi nhận.' : 'No debts or lending records recorded.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((debt: any) => {
              const isLending = debt.type === 'Cho vay' || debt.type === 'Lend' || debt.type === 'Lending';
              const isPaid = debt.status === 'Đã trả' || debt.status === 'Paid' || debt.status === 'Settled';

              return (
                <div key={debt.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isLending
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isLending ? (isVi ? 'Cho vay' : 'Lent') : (isVi ? 'Vay nợ' : 'Borrowed')}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPaid ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isPaid ? (isVi ? 'Đã trả' : 'Paid') : (isVi ? 'Chưa trả' : 'Unpaid')}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5 truncate">{debt.title || debt.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {debt.person || debt.counterpart || 'N/A'} {debt.dueDate ? `• ${isVi ? 'Hạn:' : 'Due:'} ${new Date(debt.dueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}` : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-mono font-black text-sm ${isLending ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isLending ? '+' : '-'}{formatCurrency(debt.amount)}
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateDebtStatus(debt.id, isPaid ? (isVi ? 'Chưa trả' : 'Unpaid') : (isVi ? 'Đã trả' : 'Paid'))}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isPaid ? (isVi ? 'Đánh dấu chưa trả' : 'Mark Unpaid') : (isVi ? 'Đã thu/trả ✓' : 'Settled ✓')}
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => onEditDebt(debt)}
                        className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                        title={isVi ? 'Sửa' : 'Edit'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmMsg = isVi 
                            ? `Xóa khoản "${debt.title || debt.name}"?` 
                            : `Delete "${debt.title || debt.name}"?`;
                          if (window.confirm?.(confirmMsg)) {
                            onDeleteDebt(debt.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title={isVi ? 'Xóa' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
