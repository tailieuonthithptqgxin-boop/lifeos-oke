import React from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Activity, 
  Plus, Edit3, PieChart, Landmark, CreditCard, PiggyBank, Wallet 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, formatCompactCurrency } from '../../lib/utils';
import { FinanceStatCard } from './FinanceStatCard';
import { useAppStore } from '../../lib/store';

interface FinanceOverviewTabProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netIncome: number;
  chartPeriod: 'today' | 'week' | 'month' | 'year' | 'all';
  setChartPeriod: (period: 'today' | 'week' | 'month' | 'year' | 'all') => void;
  periodFilteredTx: any[];
  periodExpense: number;
  totalBudgetLimit: number;
  budgetRemaining: number;
  budgetUtilizationPercent: number | null;
  incomeExpenseData: { name: string; amount: number; color: string }[];
  categoryData: { name: string; value: number }[];
  COLORS: string[];
  financeAccounts: any[];
  budgets: any[];
  monthlyTx: any[];
  onOpenTxModal: () => void;
  onOpenAccountModal: (acc?: any) => void;
}

export const FinanceOverviewTab: React.FC<FinanceOverviewTabProps> = ({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  netIncome,
  chartPeriod,
  setChartPeriod,
  periodFilteredTx,
  periodExpense,
  totalBudgetLimit,
  budgetRemaining,
  budgetUtilizationPercent,
  incomeExpenseData,
  categoryData,
  COLORS,
  financeAccounts,
  budgets,
  monthlyTx,
  onOpenTxModal,
  onOpenAccountModal
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const getAccountIcon = (type: string) => {
    if (type === 'Ngân hàng' || type === 'Bank') return <Landmark className="w-5 h-5" />;
    if (type === 'Ví điện tử' || type === 'E-wallet') return <CreditCard className="w-5 h-5" />;
    if (type === 'Tiết kiệm' || type === 'Savings') return <PiggyBank className="w-5 h-5" />;
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FinanceStatCard 
          title={isVi ? 'Tổng tài sản ròng' : 'Total Net Worth'} 
          value={formatCurrency(totalBalance)} 
          icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
          bg="bg-blue-50 dark:bg-blue-950/40"
        />
        <FinanceStatCard 
          title={isVi ? 'Thu nhập tháng' : 'Monthly Income'} 
          value={formatCurrency(monthlyIncome)} 
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} 
          bg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <FinanceStatCard 
          title={isVi ? 'Chi tiêu tháng' : 'Monthly Expenses'} 
          value={formatCurrency(monthlyExpense)} 
          icon={<TrendingDown className="w-5 h-5 text-rose-600" />} 
          bg="bg-rose-50 dark:bg-rose-950/40"
        />
        <FinanceStatCard 
          title={isVi ? 'Dòng tiền ròng' : 'Net Income'} 
          value={formatCurrency(netIncome)} 
          icon={<Activity className="w-5 h-5 text-purple-600" />} 
          bg="bg-purple-50 dark:bg-purple-950/40"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Comparison Chart: Đã chi tiêu vs Ngân sách vs Thu nhập */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 interactive-card">
            {/* Header with Title and Period Filter Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>{isVi ? 'Theo dõi Chi tiêu & Ngân sách' : 'Expense & Budget Tracking'}</span>
                  {periodFilteredTx.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {periodFilteredTx.length} {isVi ? 'giao dịch' : 'transactions'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isVi 
                    ? 'Đối sánh trực quan chi tiêu thực tế với định mức ngân sách và tổng thu nhập.' 
                    : 'Visual comparison of actual spending against budget limits and total income.'}
                </p>
              </div>

              {/* Period Switcher Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto shrink-0">
                {(['today', 'week', 'month', 'year', 'all'] as const).map(period => {
                  const labels = {
                    today: isVi ? 'Hôm nay' : 'Today',
                    week: isVi ? 'Tuần này' : 'This Week',
                    month: isVi ? 'Tháng này' : 'This Month',
                    year: isVi ? 'Năm nay' : 'This Year',
                    all: isVi ? 'Tất cả' : 'All Time'
                  };
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setChartPeriod(period)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold btn-squishy cursor-pointer ${
                        chartPeriod === period 
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {labels[period]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Essential KPI Badges: Total Spent, Budget, Remaining, Utilization */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isVi ? 'Tổng chi tiêu' : 'Total Spent'}
                </span>
                <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                  {formatCurrency(periodExpense)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isVi ? 'Định mức ngân sách' : 'Budget Limit'}
                </span>
                <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                  {totalBudgetLimit > 0 ? formatCurrency(totalBudgetLimit) : (isVi ? 'Chưa đặt' : 'Not set')}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isVi ? 'Ngân sách còn lại' : 'Remaining Budget'}
                </span>
                <div className={`text-base sm:text-lg font-black font-mono ${totalBudgetLimit > 0 ? (budgetRemaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600') : 'text-slate-400'}`}>
                  {totalBudgetLimit > 0 ? formatCurrency(budgetRemaining) : '---'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isVi ? 'Tỷ lệ sử dụng' : 'Utilization Rate'}
                </span>
                <div className="text-base sm:text-lg font-black font-mono flex items-center gap-1.5">
                  {budgetUtilizationPercent !== null ? (
                    <>
                      <span className={budgetUtilizationPercent > 100 ? 'text-rose-600' : budgetUtilizationPercent >= 80 ? 'text-amber-500' : 'text-blue-600'}>
                        {budgetUtilizationPercent}%
                      </span>
                      {budgetUtilizationPercent > 100 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                          {isVi ? 'Vượt trần' : 'Over Budget'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">{isVi ? 'Chưa có ngân sách' : 'No budget'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* The Bar Chart Container with Dynamic Y-Axis Scale */}
            <div className="h-[280px] w-full pt-2">
              {periodExpense === 0 && (incomeExpenseData.find(d => d.name === 'Income' || d.name === 'Thu nhập')?.amount || 0) === 0 && totalBudgetLimit === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <PieChart className="w-8 h-8 opacity-40" />
                  <p className="text-xs">{isVi ? 'Không có giao dịch thu/chi nào trong kỳ này.' : 'No income or expense transactions in this period.'}</p>
                  <button
                    type="button"
                    onClick={onOpenTxModal}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 btn-squishy cursor-pointer"
                  >
                    {isVi ? '+ Ghi nhận giao dịch đầu tiên' : '+ Record First Transaction'}
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeExpenseData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      width={65}
                    />
                    <RechartsTooltip 
                      formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), String(name || '')]}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {incomeExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Secondary Breakdown Chart: Cơ cấu Chi tiêu */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 interactive-card">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {isVi ? 'Cơ cấu Chi tiêu theo Danh mục' : 'Expense Breakdown by Category'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isVi ? 'Phân bổ các khoản chi theo từng nhóm trong kỳ đã chọn.' : 'Distribution of funds spent across categories in the selected period.'}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {isVi ? 'Tổng chi:' : 'Total:'} {formatCurrency(periodExpense)}
              </span>
            </div>

            <div className="h-[280px] w-full">
              {categoryData.length > 0 && periodExpense > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie 
                      data={categoryData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={65} 
                      outerRadius={95} 
                      paddingAngle={3}
                      label={({ name, percent }: any) => `${name || (isVi ? 'Danh mục' : 'Category')} (${Math.round((Number(percent) || 0) * 100)}%)`}
                    >
                      {categoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), String(name || '')]} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col h-full items-center justify-center text-slate-400 space-y-1">
                  <PieChart className="w-8 h-8 opacity-40" />
                  <span className="text-xs">{isVi ? 'Chưa ghi nhận khoản chi nào trong kỳ này.' : 'No expense transactions recorded in this period.'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accounts Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 interactive-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isVi ? 'Tài khoản & Ví tiền' : 'Accounts & Wallets'}
            </h3>
            <button
              type="button"
              onClick={() => onOpenAccountModal()}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer btn-squishy"
            >
              <Plus className="w-3.5 h-3.5" /> {isVi ? 'Thêm' : 'Add'}
            </button>
          </div>
          <div className="space-y-4">
            {financeAccounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6' }}>
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{acc.name}</div>
                    <div className="text-xs text-slate-500">{acc.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(acc.balance)}</div>
                  <button
                    type="button"
                    onClick={() => onOpenAccountModal(acc)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition-opacity cursor-pointer"
                    title={isVi ? 'Chỉnh sửa tài khoản' : 'Edit account'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budgets Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 lg:col-span-2 interactive-card">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">
            {isVi ? 'Ngân sách định mức tháng' : 'Monthly Budgets'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget: any) => {
              const spent = monthlyTx.filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.category === budget.category).reduce((sum, t) => sum + t.amount, 0);
              const progress = Math.min((spent / budget.limit) * 100, 100);
              const isOver = spent > budget.limit;
              const isNear = progress >= 80 && !isOver;
              
              return (
                <div key={budget.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{budget.category}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{isVi ? 'Đã chi' : 'Spent'} {formatCurrency(spent)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(budget.limit)}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{isVi ? 'Còn lại' : 'Remaining'} {formatCurrency(Math.max(0, budget.limit - spent))}</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
