import React from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Activity, 
  Plus, Edit3, PieChart, Landmark, CreditCard, PiggyBank, Wallet 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, formatCompactCurrency } from '../../lib/utils';
import { FinanceStatCard } from './FinanceStatCard';

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
  const getAccountIcon = (type: string) => {
    if (type === 'Ngân hàng') return <Landmark className="w-5 h-5" />;
    if (type === 'Ví điện tử') return <CreditCard className="w-5 h-5" />;
    if (type === 'Tiết kiệm') return <PiggyBank className="w-5 h-5" />;
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FinanceStatCard 
          title="Tổng tài sản" 
          value={formatCurrency(totalBalance)} 
          icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
          bg="bg-blue-50"
        />
        <FinanceStatCard 
          title="Thu nhập tháng" 
          value={formatCurrency(monthlyIncome)} 
          icon={<TrendingUp className="w-5 h-5 text-green-600" />} 
          bg="bg-green-50"
        />
        <FinanceStatCard 
          title="Chi tiêu tháng" 
          value={formatCurrency(monthlyExpense)} 
          icon={<TrendingDown className="w-5 h-5 text-red-600" />} 
          bg="bg-red-50"
        />
        <FinanceStatCard 
          title="Thu nhập ròng" 
          value={formatCurrency(netIncome)} 
          icon={<Activity className="w-5 h-5 text-purple-600" />} 
          bg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Comparison Chart: Đã chi tiêu vs Ngân sách vs Thu nhập */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            {/* Header with Title and Period Filter Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>Theo dõi Chi tiêu & Sử dụng Ngân sách</span>
                  {periodFilteredTx.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {periodFilteredTx.length} giao dịch
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đối chiếu trực quan số tiền đã chi thực tế so với hạn mức ngân sách và thu nhập.
                </p>
              </div>

              {/* Period Switcher Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto shrink-0">
                {(['today', 'week', 'month', 'year', 'all'] as const).map(period => {
                  const labels = {
                    today: 'Hôm nay',
                    week: 'Tuần này',
                    month: 'Tháng này',
                    year: 'Năm nay',
                    all: 'Tất cả'
                  };
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setChartPeriod(period)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

            {/* 4 Essential KPI Badges: Đã chi tiêu, Ngân sách, Còn lại, Tỷ lệ sử dụng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Đã chi tiêu</span>
                <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                  {formatCurrency(periodExpense)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hạn mức ngân sách</span>
                <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                  {totalBudgetLimit > 0 ? formatCurrency(totalBudgetLimit) : 'Chưa thiết lập'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngân sách còn lại</span>
                <div className={`text-base sm:text-lg font-black font-mono ${totalBudgetLimit > 0 ? (budgetRemaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600') : 'text-slate-400'}`}>
                  {totalBudgetLimit > 0 ? formatCurrency(budgetRemaining) : '---'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tỷ lệ sử dụng</span>
                <div className="text-base sm:text-lg font-black font-mono flex items-center gap-1.5">
                  {budgetUtilizationPercent !== null ? (
                    <>
                      <span className={budgetUtilizationPercent > 100 ? 'text-rose-600' : budgetUtilizationPercent >= 80 ? 'text-amber-500' : 'text-blue-600'}>
                        {budgetUtilizationPercent}%
                      </span>
                      {budgetUtilizationPercent > 100 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">Vượt trần</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">Chưa có ngân sách</span>
                  )}
                </div>
              </div>
            </div>

            {/* The Bar Chart Container with Dynamic Y-Axis Scale */}
            <div className="h-[280px] w-full pt-2">
              {periodExpense === 0 && (incomeExpenseData.find(d => d.name === 'Thu nhập')?.amount || 0) === 0 && totalBudgetLimit === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <PieChart className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Chưa có giao dịch thu chi nào trong khoảng thời gian này.</p>
                  <button
                    type="button"
                    onClick={onOpenTxModal}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                  >
                    + Ghi nhận giao dịch đầu tiên
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Cơ cấu Chi tiêu theo Danh mục</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Phân bổ các khoản tiền đã chi trong khoảng thời gian đang chọn.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                Tổng: {formatCurrency(periodExpense)}
              </span>
            </div>

            <div className="h-[280px] w-full">
              {categoryData.length > 0 ? (
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
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col h-full items-center justify-center text-slate-400 space-y-1">
                  <PieChart className="w-8 h-8 opacity-40" />
                  <span className="text-xs">Chưa có giao dịch chi tiêu trong giai đoạn này.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accounts Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Tài khoản & Ví</h3>
            <button
              type="button"
              onClick={() => onOpenAccountModal()}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer"
                    title="Chỉnh sửa tài khoản"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budgets Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Ngân sách tháng này</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget: any) => {
              const spent = monthlyTx.filter(t => t.type === 'Chi tiêu' && t.category === budget.category).reduce((sum, t) => sum + t.amount, 0);
              const progress = Math.min((spent / budget.limit) * 100, 100);
              const isOver = spent > budget.limit;
              const isNear = progress >= 80 && !isOver;
              
              return (
                <div key={budget.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{budget.category}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">Đã tiêu {formatCurrency(spent)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(budget.limit)}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">Còn lại {formatCurrency(Math.max(0, budget.limit - spent))}</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
                    <div 
                      className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-blue-500'}`} 
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
