import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, DollarSign, PieChart as PieChartIcon, 
  BarChart3, Activity, AlertCircle, CheckCircle2, Info, Sparkles, 
  Receipt, Plus, Percent, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, PieChart as RePieChart, 
  Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { formatCurrency, formatCompactCurrency, formatDate } from '../../lib/utils';
import { Transaction, Budget, SavingGoal } from '../../lib/types';
import { FinanceMonthlyComparisonTab } from './FinanceMonthlyComparisonTab';

interface FinanceAnalyticsTabProps {
  transactions: Transaction[];
  budgets?: Budget[];
  savingGoals?: SavingGoal[];
  onOpenTxModal: () => void;
}

type PeriodType = 'this_month' | 'last_month' | 'last_30_days' | 'this_quarter' | 'this_year' | 'all';
type GranularityType = 'day' | 'week' | 'month';
type AnalyticsSubView = 'period' | 'monthly_comparison';

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', 
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48'
];

export const FinanceAnalyticsTab: React.FC<FinanceAnalyticsTabProps> = ({
  transactions = [],
  budgets = [],
  savingGoals = [],
  onOpenTxModal
}) => {
  const [subView, setSubView] = useState<AnalyticsSubView>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this_month');
  const [chartGranularity, setChartGranularity] = useState<GranularityType>('day');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Current system date
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDate = now.getDate();

  // 1. DYNAMIC PERIOD DEFINITIONS & BOUNDARIES
  const { 
    startOfCurrent, 
    endOfCurrent, 
    startOfPrev, 
    endOfPrev, 
    daysAnalyzed, 
    totalDaysInPeriod,
    periodSubtitle, 
    canProject,
    prevPeriodLabel
  } = useMemo(() => {
    let startCur = new Date();
    let endCur = new Date();
    let startPrv = new Date();
    let endPrv = new Date();
    let daysCount = 1;
    let totalDays = 30;
    let subtitle = '';
    let projectable = false;
    let prevLabel = 'previous period';

    if (selectedPeriod === 'this_month') {
      startCur = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      endCur = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999);
      daysCount = currentDate;
      totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
      subtitle = `Current Month (Month ${currentMonth + 1}/${currentYear}) · as of today (${currentDate}/${currentMonth + 1})`;
      projectable = true;
      prevLabel = 'same period last month';

      // Previous period: Same days of previous month
      startPrv = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      const prevEndDay = Math.min(currentDate, daysInPrevMonth);
      endPrv = new Date(currentYear, currentMonth - 1, prevEndDay, 23, 59, 59, 999);
    } else if (selectedPeriod === 'last_month') {
      startCur = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      const daysInLastMonth = new Date(currentYear, currentMonth, 0).getDate();
      endCur = new Date(currentYear, currentMonth - 1, daysInLastMonth, 23, 59, 59, 999);
      daysCount = daysInLastMonth;
      totalDays = daysInLastMonth;
      const m = startCur.getMonth() + 1;
      const y = startCur.getFullYear();
      subtitle = `Last Month (Month ${m}/${y}) · full period`;
      projectable = false;
      prevLabel = 'two months ago';

      // Month before last
      startPrv = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
      const daysInPrevPrev = new Date(currentYear, currentMonth - 1, 0).getDate();
      endPrv = new Date(currentYear, currentMonth - 2, daysInPrevPrev, 23, 59, 59, 999);
    } else if (selectedPeriod === 'last_30_days') {
      startCur = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startCur.setHours(0, 0, 0, 0);
      endCur = new Date(now.getTime());
      daysCount = 30;
      totalDays = 30;
      subtitle = `Last 30 days · as of today (${currentDate}/${currentMonth + 1}/${currentYear})`;
      projectable = false;
      prevLabel = 'previous 30 days';

      endPrv = new Date(startCur.getTime() - 1);
      startPrv = new Date(endPrv.getTime() - 29 * 24 * 60 * 60 * 1000);
      startPrv.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'this_quarter') {
      const q = Math.floor(currentMonth / 3);
      startCur = new Date(currentYear, q * 3, 1, 0, 0, 0, 0);
      endCur = new Date(now.getTime());
      daysCount = Math.max(1, Math.ceil((endCur.getTime() - startCur.getTime()) / (24 * 60 * 60 * 1000)));
      const quarterEnd = new Date(currentYear, (q + 1) * 3, 0);
      totalDays = Math.ceil((quarterEnd.getTime() - startCur.getTime()) / (24 * 60 * 60 * 1000));
      subtitle = `Q${q + 1}/${currentYear} · as of today (${currentDate}/${currentMonth + 1})`;
      projectable = true;
      prevLabel = 'same period last quarter';

      startPrv = new Date(currentYear, (q - 1) * 3, 1, 0, 0, 0, 0);
      endPrv = new Date(startPrv.getTime() + (daysCount * 24 * 60 * 60 * 1000) - 1);
    } else if (selectedPeriod === 'this_year') {
      startCur = new Date(currentYear, 0, 1, 0, 0, 0, 0);
      endCur = new Date(now.getTime());
      daysCount = Math.max(1, Math.ceil((endCur.getTime() - startCur.getTime()) / (24 * 60 * 60 * 1000)));
      totalDays = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0 ? 366 : 365;
      subtitle = `Year ${currentYear} · as of today (${currentDate}/${currentMonth + 1})`;
      projectable = true;
      prevLabel = 'same period last year';

      startPrv = new Date(currentYear - 1, 0, 1, 0, 0, 0, 0);
      endPrv = new Date(currentYear - 1, currentMonth, currentDate, 23, 59, 59, 999);
    } else {
      // 'all'
      startCur = new Date(2000, 0, 1);
      endCur = new Date(2099, 11, 31);
      daysCount = 1;
      totalDays = 1;
      subtitle = `All recorded transaction history`;
      projectable = false;
      prevLabel = 'previous period';

      startPrv = new Date(1990, 0, 1);
      endPrv = new Date(1999, 11, 31);
    }

    return {
      startOfCurrent: startCur,
      endOfCurrent: endCur,
      startOfPrev: startPrv,
      endOfPrev: endPrv,
      daysAnalyzed: daysCount,
      totalDaysInPeriod: totalDays,
      periodSubtitle: subtitle,
      canProject: projectable,
      prevPeriodLabel: prevLabel
    };
  }, [selectedPeriod, now, currentYear, currentMonth, currentDate]);

  // 2. FILTER TRANSACTIONS (CURRENT & PREVIOUS PERIOD)
  const currentPeriodTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return d >= startOfCurrent && d <= endOfCurrent;
    });
  }, [transactions, startOfCurrent, endOfCurrent]);

  const prevPeriodTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return d >= startOfPrev && d <= endOfPrev;
    });
  }, [transactions, startOfPrev, endOfPrev]);

  // 3. CORE METRICS COMPUTATION (100% REAL DATA)
  const currentIncome = useMemo(() => {
    return currentPeriodTx
      .filter(t => t.type === 'Thu nhập' || t.type === 'Income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [currentPeriodTx]);

  const currentExpense = useMemo(() => {
    return currentPeriodTx
      .filter(t => t.type === 'Chi tiêu' || t.type === 'Expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [currentPeriodTx]);

  const prevExpense = useMemo(() => {
    return prevPeriodTx
      .filter(t => t.type === 'Chi tiêu' || t.type === 'Expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [prevPeriodTx]);

  const prevIncome = useMemo(() => {
    return prevPeriodTx
      .filter(t => t.type === 'Thu nhập' || t.type === 'Income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [prevPeriodTx]);

  const expenseTxList = useMemo(() => {
    return currentPeriodTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense');
  }, [currentPeriodTx]);

  const incomeTxList = useMemo(() => {
    return currentPeriodTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income');
  }, [currentPeriodTx]);

  const expenseTxCount = expenseTxList.length;
  const incomeTxCount = incomeTxList.length;

  // Card 1: Chi so với kỳ trước
  const hasPrevExpenseData = prevPeriodTx.some(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && Number(t.amount) > 0);
  const expenseDiff = currentExpense - prevExpense;
  const expenseDiffPercent = hasPrevExpenseData && prevExpense > 0
    ? ((expenseDiff / prevExpense) * 100)
    : null;

  // Card 2: Chi trung bình mỗi ngày
  const avgExpensePerDay = daysAnalyzed > 0 ? Math.round(currentExpense / daysAnalyzed) : 0;

  // Card 3: Tỷ lệ giữ lại từ thu
  const hasIncomeData = currentIncome > 0;
  const retainedAmount = currentIncome - currentExpense;
  const retentionRate = hasIncomeData
    ? ((retainedAmount / currentIncome) * 100)
    : null;

  // Card 4: Dự kiến chi cuối kỳ
  const isProjectionPossible = canProject && daysAnalyzed >= 1 && currentExpense > 0;
  const projectedExpense = isProjectionPossible
    ? Math.round((currentExpense / daysAnalyzed) * totalDaysInPeriod)
    : null;

  // Card 5: Nhóm chi lớn nhất
  const { categoryList, topCategory } = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    expenseTxList.forEach(t => {
      const cat = t.category || 'Chưa phân loại';
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += Number(t.amount) || 0;
      map[cat].count += 1;
    });

    const list = Object.entries(map).map(([category, info]) => ({
      category,
      total: info.total,
      count: info.count,
      percentage: currentExpense > 0 ? (info.total / currentExpense) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    return {
      categoryList: list,
      topCategory: list.length > 0 ? list[0] : null
    };
  }, [expenseTxList, currentExpense]);

  // Card 6: Giao dịch chi lớn nhất
  const maxExpenseTx = useMemo(() => {
    if (expenseTxList.length === 0) return null;
    return [...expenseTxList].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];
  }, [expenseTxList]);

  // 4. CHART DATA: INCOME & EXPENSE FLUCTUATION OVER TIME
  const timelineChartData = useMemo(() => {
    if (currentPeriodTx.length === 0) return [];

    // Grouping by granularity
    if (chartGranularity === 'day') {
      const dayMap: Record<string, { dateStr: string; income: number; expense: number; label: string }> = {};
      
      // If scoped period, populate all days in range for continuous visualization
      if (selectedPeriod === 'this_month' || selectedPeriod === 'last_30_days' || selectedPeriod === 'last_month') {
        const iter = new Date(startOfCurrent.getTime());
        while (iter <= endOfCurrent) {
          const key = iter.toISOString().split('T')[0];
          const dLabel = `${iter.getDate()}/${iter.getMonth() + 1}`;
          dayMap[key] = { dateStr: key, income: 0, expense: 0, label: dLabel };
          iter.setDate(iter.getDate() + 1);
        }
      }

      currentPeriodTx.forEach(t => {
        if (!t.date) return;
        const key = t.date.split('T')[0];
        const d = new Date(t.date);
        const dLabel = !isNaN(d.getTime()) ? `${d.getDate()}/${d.getMonth() + 1}` : key;

        if (!dayMap[key]) {
          dayMap[key] = { dateStr: key, income: 0, expense: 0, label: dLabel };
        }
        if (t.type === 'Thu nhập' || t.type === 'Income') {
          dayMap[key].income += Number(t.amount) || 0;
        } else if (t.type === 'Chi tiêu' || t.type === 'Expense') {
          dayMap[key].expense += Number(t.amount) || 0;
        }
      });

      return Object.values(dayMap)
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
        .map(item => ({
          ...item,
          net: item.income - item.expense
        }));
    } else if (chartGranularity === 'week') {
      const weekMap: Record<string, { weekKey: string; label: string; income: number; expense: number }> = {};

      currentPeriodTx.forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return;
        
        // Approximate ISO week label
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
        const weekKey = startOfWeek.toISOString().split('T')[0];
        const label = `Week ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;

        if (!weekMap[weekKey]) {
          weekMap[weekKey] = { weekKey, label, income: 0, expense: 0 };
        }
        if (t.type === 'Thu nhập' || t.type === 'Income') {
          weekMap[weekKey].income += Number(t.amount) || 0;
        } else if (t.type === 'Chi tiêu' || t.type === 'Expense') {
          weekMap[weekKey].expense += Number(t.amount) || 0;
        }
      });

      return Object.values(weekMap)
        .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
        .map(item => ({
          ...item,
          net: item.income - item.expense
        }));
    } else {
      // 'month'
      const monthMap: Record<string, { monthKey: string; label: string; income: number; expense: number }> = {};

      currentPeriodTx.forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `M${d.getMonth() + 1}/${d.getFullYear()}`;

        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { monthKey, label, income: 0, expense: 0 };
        }
        if (t.type === 'Thu nhập' || t.type === 'Income') {
          monthMap[monthKey].income += Number(t.amount) || 0;
        } else if (t.type === 'Chi tiêu' || t.type === 'Expense') {
          monthMap[monthKey].expense += Number(t.amount) || 0;
        }
      });

      return Object.values(monthMap)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .map(item => ({
          ...item,
          net: item.income - item.expense
        }));
    }
  }, [currentPeriodTx, chartGranularity, selectedPeriod, startOfCurrent, endOfCurrent]);

  // 5. SPENDING TRENDS ANALYSIS (STRICTLY FROM REAL DATA)
  const spendingTrends = useMemo(() => {
    const insights: { type: 'neutral' | 'positive' | 'warning'; title: string; desc: string; icon: any }[] = [];

    if (expenseTxCount < 2) {
      return null; // Not enough data for meaningful trend analysis
    }

    // Trend 1: Overall trajectory vs previous period
    if (hasPrevExpenseData && expenseDiffPercent !== null) {
      if (expenseDiffPercent > 15) {
        insights.push({
          type: 'warning',
          title: `Chi tiêu đang tăng +${expenseDiffPercent.toFixed(1)}%`,
          desc: `Mức chi tiêu hiện tại (${formatCurrency(currentExpense)}) cao hơn ${formatCurrency(Math.abs(expenseDiff))} so với ${prevPeriodLabel}. Cần rà soát các khoản chi đột biến.`,
          icon: TrendingUp
        });
      } else if (expenseDiffPercent < -10) {
        insights.push({
          type: 'positive',
          title: `Tiết giảm chi tiêu tốt (${expenseDiffPercent.toFixed(1)}%)`,
          desc: `Bạn đang chi ít hơn ${formatCurrency(Math.abs(expenseDiff))} so với ${prevPeriodLabel}, duy trì mức kiểm soát ngân sách rất hiệu quả.`,
          icon: TrendingDown
        });
      } else {
        insights.push({
          type: 'neutral',
          title: 'Chi tiêu duy trì ổn định',
          desc: `Tốc độ chi tiêu biến động không đáng kể (${expenseDiffPercent > 0 ? '+' : ''}${expenseDiffPercent.toFixed(1)}%) so với ${prevPeriodLabel}.`,
          icon: Activity
        });
      }
    }

    // Trend 2: Category dominance
    if (topCategory && topCategory.percentage > 35) {
      insights.push({
        type: topCategory.percentage > 50 ? 'warning' : 'neutral',
        title: `Nhóm "${topCategory.category}" chiếm tỷ trọng lớn (${topCategory.percentage.toFixed(1)}%)`,
        desc: `Với tổng chi ${formatCurrency(topCategory.total)}, nhóm này đang là động lực chi tiêu chính của bạn trong kỳ phân tích.`,
        icon: PieChartIcon
      });
    }

    // Trend 3: Spending frequency
    const txPerDay = (expenseTxCount / (daysAnalyzed || 1)).toFixed(1);
    insights.push({
      type: 'neutral',
      title: `Tần suất giao dịch: ${txPerDay} lượt chi/ngày`,
      desc: `Đã ghi nhận tổng cộng ${expenseTxCount} giao dịch chi tiêu trên ${daysAnalyzed} ngày phân tích, mức chi bình quân mỗi giao dịch đạt ${formatCurrency(Math.round(currentExpense / expenseTxCount))}.`,
      icon: Clock
    });

    // Trend 4: Outlier large single transaction
    if (maxExpenseTx && currentExpense > 0) {
      const singleTxShare = (Number(maxExpenseTx.amount) / currentExpense) * 100;
      if (singleTxShare > 30) {
        insights.push({
          type: 'warning',
          title: `Khoản chi lớn đột biến: ${formatCurrency(maxExpenseTx.amount)} (${singleTxShare.toFixed(1)}% tổng chi)`,
          desc: `Giao dịch "${maxExpenseTx.note || maxExpenseTx.category}" vào ngày ${formatDate(maxExpenseTx.date)} tạo ra bước nhảy vọt trong biểu đồ chi tiêu của kỳ.`,
          icon: AlertTriangle
        });
      }
    }

    return insights;
  }, [expenseTxCount, hasPrevExpenseData, expenseDiffPercent, currentExpense, expenseDiff, prevPeriodLabel, topCategory, daysAnalyzed, maxExpenseTx]);

  // 6. ACTIONABLE SMART RECOMMENDATIONS / GỢI Ý
  const smartRecommendations = useMemo(() => {
    const list: { title: string; desc: string; tag: string; type: 'success' | 'warning' | 'info' }[] = [];

    if (currentPeriodTx.length < 2) {
      return null; // Not enough reliable data
    }

    // Insight on Retention Rate
    if (hasIncomeData && retentionRate !== null) {
      if (retentionRate < 0) {
        list.push({
          tag: 'Cảnh báo thâm hụt',
          title: 'Chi tiêu đang vượt quá thu nhập trong kỳ',
          desc: `Bạn đang bị thâm hụt ${formatCurrency(Math.abs(retainedAmount))}. Hãy rà soát ngay các khoản chi chưa cấp thiết để cân bằng dòng tiền.`,
          type: 'warning'
        });
      } else if (retentionRate < 20) {
        list.push({
          tag: 'Cần cải thiện',
          title: 'Tỷ lệ tiền giữ lại ở mức thấp (< 20%)',
          desc: `Chỉ giữ lại được ${retentionRate.toFixed(1)}% từ tổng thu (${formatCurrency(retainedAmount)}). Khuyến nghị thiết lập ngân sách trần cho các nhóm chi tiêu hàng ngày.`,
          type: 'warning'
        });
      } else if (retentionRate >= 40) {
        list.push({
          tag: 'Kỷ luật tài chính cao',
          title: `Khả năng tích lũy xuất sắc (${retentionRate.toFixed(1)}%)`,
          desc: `Bạn đang giữ lại ${formatCurrency(retainedAmount)} sau chi tiêu. Đây là thời điểm lý tưởng để trích quỹ chuyển vào Mục tiêu Tiết kiệm hoặc Đầu tư dài hạn.`,
          type: 'success'
        });
      }
    } else if (!hasIncomeData && currentExpense > 0) {
      list.push({
        tag: 'Dữ liệu thu nhập',
        title: 'Chưa có khoản thu nhập nào được ghi nhận',
        desc: 'Hãy thêm các nguồn thu (lương, thưởng, thu nhập phụ) để hệ thống tự động đo lường tỷ lệ giữ lại dòng tiền chính xác.',
        type: 'info'
      });
    }

    // Insight on Top Category & Budgeting
    if (topCategory && topCategory.total > 0) {
      const hasBudgetForTop = budgets.some(b => b.category === topCategory.category);
      if (!hasBudgetForTop) {
        list.push({
          tag: 'Tối ưu ngân sách',
          title: `Thiết lập hạn mức ngân sách cho "${topCategory.category}"`,
          desc: `Nhóm này đang chiếm ${topCategory.percentage.toFixed(1)}% tổng chi (${formatCurrency(topCategory.total)}). Đặt hạn mức chi tiêu sẽ giúp bạn tránh bị bội chi bất ngờ.`,
          type: 'info'
        });
      }
    }

    // Insight on End-of-Period Projection
    if (isProjectionPossible && projectedExpense && hasIncomeData) {
      if (projectedExpense > currentIncome) {
        list.push({
          tag: 'Cảnh báo dự báo',
          title: `Ước tính chi cuối kỳ (${formatCurrency(projectedExpense)}) có nguy cơ vượt tổng thu`,
          desc: `Với tốc độ chi ${formatCurrency(avgExpensePerDay)}/ngày hiện tại, dự kiến cuối kỳ bạn sẽ chi vượt thu ${formatCurrency(projectedExpense - currentIncome)}. Nên cắt giảm tốc độ chi tiêu ngay từ bây giờ.`,
          type: 'warning'
        });
      }
    }

    return list.length > 0 ? list : null;
  }, [currentPeriodTx.length, hasIncomeData, retentionRate, retainedAmount, currentExpense, topCategory, budgets, isProjectionPossible, projectedExpense, currentIncome, avgExpensePerDay]);

  // RENDER CUSTOM TOOLTIP FOR TIMELINE CHART
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{data.label || label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{data.dateStr}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Income:
            </span>
            <span className="font-bold font-mono text-emerald-400">+{formatCurrency(data.income)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-rose-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Expense:
            </span>
            <span className="font-bold font-mono text-rose-400">-{formatCurrency(data.expense)}</span>
          </div>
          <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 font-semibold">
            <span className="text-slate-400">Net Flow:</span>
            <span className={`font-mono ${data.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {data.net >= 0 ? '+' : ''}{formatCurrency(data.net)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Switch between Period Analysis and Multi-Month Comparison */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setSubView('period')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            subView === 'period'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Period Analysis</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('monthly_comparison')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            subView === 'monthly_comparison'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Multi-Month Comparison</span>
        </button>
      </div>

      {subView === 'monthly_comparison' ? (
        <FinanceMonthlyComparisonTab
          transactions={transactions}
          budgets={budgets}
          onOpenTxModal={onOpenTxModal}
        />
      ) : (
        <>
          {/* 1. HEADER SECTION (WITH DYNAMIC CURRENT DATE SUBTITLE) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Income & Expense Analytics
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{periodSubtitle}</span>
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto no-scrollbar shrink-0 self-start md:self-auto">
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'this_quarter', label: 'This Quarter' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPeriod(p.id as PeriodType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedPeriod === p.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CORE KPI CARDS (6 MANDATORY CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: Chi so với kỳ trước */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Expense vs Previous Period
            </span>
            <div className={`p-2 rounded-xl ${expenseDiff > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {expenseDiff > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(currentExpense)}
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1">
              {hasPrevExpenseData ? (
                <>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Prior period ({prevPeriodLabel}):</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(prevExpense)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Difference:</span>
                    <span className={`font-mono font-black ${expenseDiff > 0 ? 'text-rose-500' : expenseDiff < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {expenseDiff > 0 ? '+' : ''}{formatCurrency(expenseDiff)} ({expenseDiffPercent !== null ? `${expenseDiffPercent > 0 ? '+' : ''}${expenseDiffPercent.toFixed(1)}%` : '0%'})
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                    <AlertCircle className="w-3 h-3" /> No prior data
                  </div>
                  <p className="text-[11px] text-slate-400">
                    No expense transactions found in the previous period for comparison.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Chi trung bình mỗi ngày */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily Average Expense
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCurrency(avgExpensePerDay)}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Expense transactions: <strong className="text-slate-800 dark:text-slate-200">{expenseTxCount}</strong></span>
              <span>Days analyzed: <strong className="text-slate-800 dark:text-slate-200">{daysAnalyzed} days</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 3: Tỷ lệ giữ lại từ thu */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Retention Rate
            </span>
            <div className={`p-2 rounded-xl ${hasIncomeData && (retentionRate ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div>
            {hasIncomeData && retentionRate !== null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono tracking-tight ${retentionRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {retentionRate.toFixed(1)}%
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${retentionRate >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                    {retentionRate >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Net Retained:</span>
                  <span className={`font-mono font-bold ${retainedAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {retainedAmount >= 0 ? '+' : ''}{formatCurrency(retainedAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                  <AlertCircle className="w-3 h-3" /> No income to calculate
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  At least one income transaction is required to calculate retention rate.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Dự kiến chi cuối kỳ */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Projected Period-End Expense
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Estimated
            </span>
          </div>

          <div>
            {isProjectionPossible && projectedExpense !== null ? (
              <>
                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  ~{formatCurrency(projectedExpense)}
                </div>
                <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  Based on daily average spending of {formatCurrency(avgExpensePerDay)} over {totalDaysInPeriod} days.
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                  <Info className="w-3 h-3" /> Insufficient data to project
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Requires at least 1 day of expense data in this period to establish a trend.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 5: Nhóm chi lớn nhất */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Expense Category
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <PieChartIcon className="w-4 h-4" />
            </div>
          </div>

          <div>
            {topCategory && topCategory.total > 0 ? (
              <>
                <div className="text-lg font-black text-slate-900 dark:text-white truncate">
                  {topCategory.category}
                </div>
                <div className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatCurrency(topCategory.total)}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Share:</span>
                  <span className="font-mono font-black text-purple-600 dark:text-purple-400">
                    {topCategory.percentage.toFixed(1)}% of total ({topCategory.count} txns)
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm font-bold text-slate-400 py-2">
                No expense recorded
              </div>
            )}
          </div>
        </div>

        {/* CARD 6: Giao dịch chi lớn nhất */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Largest Expense
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div>
            {maxExpenseTx ? (
              <>
                <div className="text-xl font-black font-mono text-rose-500 tracking-tight">
                  -{formatCurrency(maxExpenseTx.amount)}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                  {maxExpenseTx.note || maxExpenseTx.category || 'No description'}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[120px]">{maxExpenseTx.category}</span>
                  <span className="font-mono">{formatDate(maxExpenseTx.date)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm font-bold text-slate-400 py-2">
                No expense transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ BIẾN ĐỘNG THU CHI (INCOME VS EXPENSE TIMELINE) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Income & Expense Flow Over Time</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare cash inflows (Income) and cash outflows (Expense)
            </p>
          </div>

          {/* Granularity & Chart Type Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {(['day', 'week', 'month'] as GranularityType[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setChartGranularity(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    chartGranularity === g
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g === 'day' ? 'Day' : g === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Area Chart"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        {timelineChartData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tickFormatter={val => formatCompactCurrency(val)} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <RechartsTooltip content={<CustomTimelineTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    name="Thu nhập" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#incomeGrad)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    name="Chi tiêu" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#expenseGrad)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tickFormatter={val => formatCompactCurrency(val)} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <RechartsTooltip content={<CustomTimelineTooltip />} />
                  <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
            <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa có dữ liệu biến động</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Chưa ghi nhận giao dịch nào trong khoảng thời gian này để vẽ biểu đồ biến động thu chi.
            </p>
          </div>
        )}

        {/* Legend Indicator */}
        <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Thu nhập ({formatCurrency(currentIncome)})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Chi tiêu ({formatCurrency(currentExpense)})</span>
          </div>
        </div>
      </div>

      {/* 4. PHÂN TÍCH THEO NHÓM CHI (CATEGORY BREAKDOWN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Cơ cấu nhóm chi */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              <span>Cơ cấu nhóm chi tiêu</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phân bổ tỷ trọng các danh mục trong tổng chi
            </p>
          </div>

          {categoryList.length > 0 ? (
            <div className="h-64 my-auto relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryList}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryList.map((entry, index) => (
                      <Cell key={`cell-${entry.category}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Tổng chi']}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng chi</span>
                <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                  {formatCompactCurrency(currentExpense)}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <PieChartIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              Chưa có dữ liệu danh mục chi tiêu
            </div>
          )}

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            Tự động tổng hợp từ {expenseTxCount} giao dịch thực tế
          </div>
        </div>

        {/* Category Table & Progress Bars */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                Chi tiết danh mục chi tiêu
              </h4>
              <span className="text-xs font-bold text-slate-400">
                {categoryList.length} danh mục
              </span>
            </div>

            {categoryList.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
                {categoryList.map((cat, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.category} className="py-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-200">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate max-w-[160px] sm:max-w-[220px]">{cat.category}</span>
                          <span className="text-[11px] font-normal text-slate-400">({cat.count} GD)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(cat.total)}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-500 w-12 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(1, cat.percentage))}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Chưa có dữ liệu giao dịch chi tiêu trong kỳ này.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng cộng:</span>
            <span className="font-mono font-black text-rose-500 text-sm">
              {formatCurrency(currentExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. XU HƯỚNG CHI TIÊU & GỢI Ý THÔNG MINH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Xu hướng chi tiêu (Trends) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Xu hướng chi tiêu</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-400">Phân tích thực tế</span>
          </div>

          {spendingTrends ? (
            <div className="space-y-3">
              {spendingTrends.map((trend, i) => {
                const IconComponent = trend.icon;
                return (
                  <div 
                    key={i} 
                    className={`p-4 rounded-2xl border transition-all ${
                      trend.type === 'positive' 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200' 
                        : trend.type === 'warning'
                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        trend.type === 'positive' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        trend.type === 'warning' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {trend.title}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {trend.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Chưa đủ dữ liệu để phân tích xu hướng
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Cần ghi nhận từ 2 giao dịch chi tiêu trở lên trong kỳ này để thuật toán tổng hợp các mẫu hình chi tiêu.
              </p>
            </div>
          )}
        </div>

        {/* Gợi ý thông minh (Actionable Recommendations) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gợi ý tài chính</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-400">Khuyến nghị dựa trên số liệu</span>
          </div>

          {smartRecommendations ? (
            <div className="space-y-3">
              {smartRecommendations.map((rec, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl border transition-all ${
                    rec.type === 'success'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : rec.type === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      rec.type === 'success' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                      rec.type === 'warning' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                      'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {rec.tag}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {rec.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {rec.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Chưa đủ dữ liệu để đưa ra nhận xét đáng tin cậy.
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Hãy duy trì việc ghi chép các giao dịch thu chi phát sinh để hệ thống đề xuất các giải pháp tối ưu tài chính cá nhân.
              </p>
            </div>
          )}
        </div>
      </div>

          {/* 6. EMPTY STATE (WHEN CURRENT PERIOD HAS NO TRANSACTIONS AT ALL) */}
          {currentPeriodTx.length === 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-8 sm:p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Receipt className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Chưa có dữ liệu thu chi
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hãy thêm giao dịch để bắt đầu phân tích tình hình tài chính theo thời gian thực.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenTxModal}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Thêm Giao dịch ngay
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
