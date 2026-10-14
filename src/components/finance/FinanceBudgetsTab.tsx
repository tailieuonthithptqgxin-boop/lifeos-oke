import React from 'react';
import { Plus, Edit3, Trash2, PieChart } from 'lucide-react';
import { useAppStore } from '../../lib/store';

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
  const { language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? 'Quản lý Ngân sách định mức' : 'Budget Management'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isVi 
              ? 'Kiểm soát chi tiêu từng danh mục theo tháng để tránh vượt trần ngân sách.' 
              : 'Control monthly category spending to prevent budget overruns.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBudget}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isVi ? 'Thêm Ngân sách mới' : 'Add New Budget'}</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            {isVi ? 'Tổng hạn mức' : 'Total Limit'}
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatCurrency(budgets.reduce((s: number, b: any) => s + (b.limit || 0), 0))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            {isVi ? 'Đã chi tiêu tháng này' : 'Spent This Month'}
          </span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(monthlyExpense)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            {isVi ? 'Danh mục vượt hạn mức' : 'Overbudget Categories'}
          </span>
          <div className="text-xl font-black text-amber-600 font-mono mt-1">
            {budgets.filter((b: any) => {
              const spent = monthlyTx.filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.category === b.category).reduce((s, t) => s + t.amount, 0);
              return spent > b.limit;
            }).length} / {budgets.length}
          </div>
        </div>
      </div>

      {/* Grid of Budgets */}
      {budgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <PieChart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-900 dark:text-white">
            {isVi ? 'Chưa có ngân sách nào' : 'No budgets created yet'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {isVi ? 'Hãy tạo ngân sách định mức đầu tiên để kiểm soát dòng tiền hiệu quả.' : 'Create your first budget to take control of your spending.'}
          </p>
          <button
            type="button"
            onClick={onAddBudget}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {isVi ? '+ Thêm Ngân sách' : '+ Add Budget'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget: any) => {
            const spent = monthlyTx
              .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.category === budget.category)
              .reduce((sum, t) => sum + t.amount, 0);
            const isOver = spent > budget.limit;
            const isNear = (spent / budget.limit) >= 0.8 && !isOver;
            const remaining = budget.limit - spent;

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {budget.period ? (isVi ? budget.period : (budget.period === 'Hàng tháng' ? 'Monthly' : budget.period)) : (isVi ? 'Hàng tháng' : 'Monthly')}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{budget.category}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditBudget(budget)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      title={isVi ? 'Sửa ngân sách' : 'Edit budget'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmMsg = isVi 
                          ? `Bạn có chắc muốn xóa ngân sách "${budget.category}"?` 
                          : `Are you sure you want to delete budget "${budget.category}"?`;
                        if (window.confirm?.(confirmMsg)) {
                          onDeleteBudget(budget.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title={isVi ? 'Xóa ngân sách' : 'Delete budget'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {isVi ? 'Đã chi:' : 'Spent:'} <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(spent)}</strong>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {isVi ? 'Hạn mức:' : 'Limit:'} <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(budget.limit)}</strong>
                    </span>
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
                    {isOver 
                      ? (isVi ? `Vượt hạn mức ${formatCurrency(Math.abs(remaining))}` : `Over budget by ${formatCurrency(Math.abs(remaining))}`) 
                      : (isVi ? `Còn lại: ${formatCurrency(remaining)}` : `Remaining: ${formatCurrency(remaining)}`)}
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
