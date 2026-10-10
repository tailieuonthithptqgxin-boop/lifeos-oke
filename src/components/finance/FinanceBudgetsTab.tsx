import React from 'react';
import { Plus, Edit3, Trash2, PieChart } from 'lucide-react';

interface FinanceBudgetsTabProps {
  budgets: any[];
  monthlyTx: any[];
  monthlyExpense: number;
  formatCurrency: (val: number) => string;
  onEditBudget: (budget: any) => void;
  onDeleteBudget: (id: string) => void;
  onAddBudget: () => void;
}

export const FinanceBudgetsTab: React.FC<FinanceBudgetsTabProps> = ({
  budgets,
  monthlyTx,
  monthlyExpense,
  formatCurrency,
  onEditBudget,
  onDeleteBudget,
  onAddBudget
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quản lý Ngân sách định mức</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kiểm soát chi tiêu từng danh mục theo tháng để tránh vượt trần ngân sách.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBudget}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Ngân sách mới</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tổng hạn mức</span>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatCurrency(budgets.reduce((s: number, b: any) => s + (b.limit || 0), 0))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Đã chi tiêu tháng này</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(monthlyExpense)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Danh mục vượt hạn mức</span>
          <div className="text-xl font-black text-amber-600 font-mono mt-1">
            {budgets.filter((b: any) => {
              const spent = monthlyTx.filter(t => t.type === 'Chi tiêu' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
              return spent > b.limit;
            }).length} / {budgets.length}
          </div>
        </div>
      </div>

      {/* Grid of Budgets */}
      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <PieChart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-900 dark:text-white">Chưa có ngân sách nào</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">Hãy tạo ngân sách định mức đầu tiên để kiểm soát dòng tiền hiệu quả.</p>
          <button
            type="button"
            onClick={onAddBudget}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            + Thêm Ngân sách
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget: any) => {
            const spent = monthlyTx
              .filter(t => t.type === 'Chi tiêu' && t.category === budget.category)
              .reduce((sum, t) => sum + t.amount, 0);
            const progress = Math.min(Math.round((spent / budget.limit) * 100), 100);
            const isOver = spent > budget.limit;
            const isNear = progress >= 80 && !isOver;
            const remaining = budget.limit - spent;

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {budget.period || 'Hàng tháng'}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{budget.category}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditBudget(budget)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Sửa ngân sách"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm?.(`Bạn có chắc muốn xóa ngân sách "${budget.category}"?`)) {
                          onDeleteBudget(budget.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Xóa ngân sách"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Đã chi: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(spent)}</strong></span>
                    <span className="text-slate-500 font-medium">Hạn mức: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(budget.limit)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((spent / budget.limit) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className={`font-bold ${isOver ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isOver ? `Vượt hạn mức ${formatCurrency(Math.abs(remaining))}` : `Còn lại: ${formatCurrency(remaining)}`}
                  </span>
                  <span className="text-slate-400 font-semibold">{Math.round((spent / budget.limit) * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
