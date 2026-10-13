import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, DollarSign, PieChart as PieChartIcon, 
  BarChart3, Activity, AlertCircle, CheckCircle2, Info, Sparkles, 
  Receipt, Plus, Percent, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Filter, Layers, Award, ArrowRight, ChevronRight, HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, AreaChart, Area
} from 'recharts';
import { formatCurrency, formatCompactCurrency, formatDate } from '../../lib/utils';
import { Transaction, Budget } from '../../lib/types';

interface FinanceMonthlyComparisonTabProps {
  transactions: Transaction[];
  budgets?: Budget[];
  onOpenTxModal: () => void;
}

type MonthRangeOption = 'last_3' | 'last_6' | 'last_12' | 'custom';
type ChartDisplayMode = 'bar' | 'line';

interface MonthMetric {
  year: number;
  month: number; // 1 - 12
  key: string; // YYYY-MM
  label: string; // "Tháng M/YYYY"
  shortLabel: string; // "T.M"
  startDate: Date;
  endDate: Date;
  daysInMonth: number;
  daysAnalyzed: number;
  isCurrentMonth: boolean;
  income: number;
  incomeCount: number;
  expense: number;
  expenseCount: number;
  retained: number;
  retentionRate: number | null;
  avgExpensePerDay: number;
  categoryExpenses: Record<string, number>;
  totalTxCount: number;
}

export const FinanceMonthlyComparisonTab: React.FC<FinanceMonthlyComparisonTabProps> = ({
  transactions = [],
  budgets = [],
  onOpenTxModal
}) => {
  const [rangeOption, setRangeOption] = useState<MonthRangeOption>('last_3');
  const [customStartMonth, setCustomStartMonth] = useState<string>('');
  const [customEndMonth, setCustomEndMonth] = useState<string>('');
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('bar');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // 1. GENERATE DYNAMIC LIST OF RECENT MONTHS
  const allAvailableMonthKeys = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    // Go back up to 24 months from current month
    for (let i = 0; i < 24; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const k = `${y}-${String(m).padStart(2, '0')}`;
      list.push({ key: k, label: `Tháng ${m}/${y}`, year: y, month: m });
    }
    return list;
  }, [currentYear, currentMonth]);

  // Default custom months if empty
  const defaultStartKey = allAvailableMonthKeys[Math.min(5, allAvailableMonthKeys.length - 1)].key;
  const defaultEndKey = allAvailableMonthKeys[0].key;

  const effectiveCustomStart = customStartMonth || defaultStartKey;
  const effectiveCustomEnd = customEndMonth || defaultEndKey;

  // 2. DETERMINE TARGET MONTH KEYS IN CHRONOLOGICAL ORDER (oldest to newest)
  const targetMonthKeys = useMemo(() => {
    let count = 3;
    if (rangeOption === 'last_3') count = 3;
    else if (rangeOption === 'last_6') count = 6;
    else if (rangeOption === 'last_12') count = 12;

    if (rangeOption !== 'custom') {
      const slice = allAvailableMonthKeys.slice(0, count).reverse();
      return slice.map(m => m.key);
    } else {
      // Custom range: from start to end
      const start = effectiveCustomStart <= effectiveCustomEnd ? effectiveCustomStart : effectiveCustomEnd;
      const end = effectiveCustomStart <= effectiveCustomEnd ? effectiveCustomEnd : effectiveCustomStart;
      
      const filtered = allAvailableMonthKeys
        .filter(m => m.key >= start && m.key <= end)
        .reverse();
      return filtered.map(m => m.key);
    }
  }, [rangeOption, allAvailableMonthKeys, effectiveCustomStart, effectiveCustomEnd]);

  // 3. COMPUTE MONTHLY METRICS FOR EACH MONTH
  const monthlyMetrics: MonthMetric[] = useMemo(() => {
    return targetMonthKeys.map(k => {
      const [yStr, mStr] = k.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);

      const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const daysInMonth = new Date(y, m, 0).getDate();
      const isCur = y === currentYear && m === currentMonth;
      const endDate = isCur 
        ? new Date(y, m - 1, now.getDate(), 23, 59, 59, 999) 
        : new Date(y, m, 0, 23, 59, 59, 999);
      const daysAnalyzed = isCur ? now.getDate() : daysInMonth;

      // Filter transactions belonging to this month
      const monthTx = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return false;
        return d >= startDate && d <= endDate;
      });

      let inc = 0;
      let incCount = 0;
      let exp = 0;
      let expCount = 0;
      const catMap: Record<string, number> = {};

      monthTx.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'Thu nhập') {
          inc += amt;
          incCount += 1;
        } else if (t.type === 'Chi tiêu') {
          exp += amt;
          expCount += 1;
          const cat = t.category || 'Chưa phân loại';
          catMap[cat] = (catMap[cat] || 0) + amt;
        }
      });

      const ret = inc - exp;
      const retRate = inc > 0 ? (ret / inc) * 100 : null;
      const avgDay = daysAnalyzed > 0 ? Math.round(exp / daysAnalyzed) : 0;

      return {
        year: y,
        month: m,
        key: k,
        label: `Tháng ${m}/${y}`,
        shortLabel: `T.${m}`,
        startDate,
        endDate,
        daysInMonth,
        daysAnalyzed,
        isCurrentMonth: isCur,
        income: inc,
        incomeCount: incCount,
        expense: exp,
        expenseCount: expCount,
        retained: ret,
        retentionRate: retRate,
        avgExpensePerDay: avgDay,
        categoryExpenses: catMap,
        totalTxCount: monthTx.length
      };
    });
  }, [targetMonthKeys, transactions, currentYear, currentMonth, now]);

  // Total transactions in evaluated period
  const totalEvaluatedTxCount = useMemo(() => {
    return monthlyMetrics.reduce((sum, m) => sum + m.totalTxCount, 0);
  }, [monthlyMetrics]);

  // 4. PREPARE ALL UNIQUE CATEGORIES
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    monthlyMetrics.forEach(m => {
      Object.keys(m.categoryExpenses).forEach(c => set.add(c));
    });
    return Array.from(set).sort();
  }, [monthlyMetrics]);

  // 5. MoM SPOTLIGHT: CURRENT MONTH VS PREVIOUS MONTH
  const momSpotlight = useMemo(() => {
    // Find current month metric
    const curIdx = monthlyMetrics.findIndex(m => m.isCurrentMonth);
    const curMetric = curIdx >= 0 ? monthlyMetrics[curIdx] : monthlyMetrics[monthlyMetrics.length - 1];

    if (!curMetric) return null;

    // Look for previous calendar month metric
    const prevKey = curMetric.month === 1 
      ? `${curMetric.year - 1}-12` 
      : `${curMetric.year}-${String(curMetric.month - 1).padStart(2, '0')}`;
    
    // Check if previous month is inside our dataset or calculate from transactions
    let prevMetric = monthlyMetrics.find(m => m.key === prevKey);
    if (!prevMetric) {
      // Calculate previous month dynamically from all transactions
      const [pyStr, pmStr] = prevKey.split('-');
      const py = parseInt(pyStr, 10);
      const pm = parseInt(pmStr, 10);
      const pStart = new Date(py, pm - 1, 1, 0, 0, 0, 0);
      const pDays = new Date(py, pm, 0).getDate();
      const pEnd = new Date(py, pm, 0, 23, 59, 59, 999);

      const pTx = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d >= pStart && d <= pEnd;
      });

      let pInc = 0;
      let pExp = 0;
      const pCatMap: Record<string, number> = {};
      pTx.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'Thu nhập') pInc += amt;
        else if (t.type === 'Chi tiêu') {
          pExp += amt;
          const c = t.category || 'Chưa phân loại';
          pCatMap[c] = (pCatMap[c] || 0) + amt;
        }
      });

      prevMetric = {
        year: py,
        month: pm,
        key: prevKey,
        label: `Tháng ${pm}/${py}`,
        shortLabel: `T.${pm}`,
        startDate: pStart,
        endDate: pEnd,
        daysInMonth: pDays,
        daysAnalyzed: pDays,
        isCurrentMonth: false,
        income: pInc,
        incomeCount: pTx.filter(t => t.type === 'Thu nhập').length,
        expense: pExp,
        expenseCount: pTx.filter(t => t.type === 'Chi tiêu').length,
        retained: pInc - pExp,
        retentionRate: pInc > 0 ? ((pInc - pExp) / pInc) * 100 : null,
        avgExpensePerDay: pDays > 0 ? Math.round(pExp / pDays) : 0,
        categoryExpenses: pCatMap,
        totalTxCount: pTx.length
      };
    }

    const hasPrevData = prevMetric && prevMetric.totalTxCount > 0;

    const incDiff = curMetric.income - prevMetric.income;
    const incDiffPct = hasPrevData && prevMetric.income > 0 ? (incDiff / prevMetric.income) * 100 : null;

    const expDiff = curMetric.expense - prevMetric.expense;
    const expDiffPct = hasPrevData && prevMetric.expense > 0 ? (expDiff / prevMetric.expense) * 100 : null;

    const retDiff = curMetric.retained - prevMetric.retained;
    const avgDiff = curMetric.avgExpensePerDay - prevMetric.avgExpensePerDay;

    // Find category with biggest absolute change
    let biggestCatChange: { category: string; cur: number; prev: number; diff: number } | null = null;
    const unionCats = new Set([...Object.keys(curMetric.categoryExpenses), ...Object.keys(prevMetric.categoryExpenses)]);
    unionCats.forEach(c => {
      const curAmt = curMetric.categoryExpenses[c] || 0;
      const prevAmt = prevMetric.categoryExpenses[c] || 0;
      const diff = curAmt - prevAmt;
      if (!biggestCatChange || Math.abs(diff) > Math.abs(biggestCatChange.diff)) {
        biggestCatChange = { category: c, cur: curAmt, prev: prevAmt, diff };
      }
    });

    return {
      curMetric,
      prevMetric,
      hasPrevData,
      incDiff,
      incDiffPct,
      expDiff,
      expDiffPct,
      retDiff,
      avgDiff,
      biggestCatChange
    };
  }, [monthlyMetrics, transactions]);

  // 6. RANKINGS ACROSS SELECTED MONTHS (XẾP HẠNG CÁC THÁNG)
  const rankings = useMemo(() => {
    const activeMonths = monthlyMetrics.filter(m => m.totalTxCount > 0);
    if (activeMonths.length === 0) return null;

    // Tháng chi nhiều nhất
    const highestExpense = [...activeMonths].sort((a, b) => b.expense - a.expense)[0];
    
    // Tháng chi ít nhất (trong các tháng có chi > 0 hoặc active)
    const expenseMonths = activeMonths.filter(m => m.expense > 0);
    const lowestExpense = expenseMonths.length > 0
      ? [...expenseMonths].sort((a, b) => a.expense - b.expense)[0]
      : activeMonths[0];

    // Tháng thu nhiều nhất
    const highestIncome = [...activeMonths].sort((a, b) => b.income - a.income)[0];

    // Tháng giữ lại nhiều nhất (Thu - Chi cao nhất)
    const highestRetained = [...activeMonths].sort((a, b) => b.retained - a.retained)[0];

    // Tháng có tỷ lệ giữ lại tốt nhất (có thu > 0)
    const validRateMonths = activeMonths.filter(m => m.retentionRate !== null);
    const bestRetentionRate = validRateMonths.length > 0 
      ? [...validRateMonths].sort((a, b) => (b.retentionRate ?? -999) - (a.retentionRate ?? -999))[0]
      : null;

    return {
      highestExpense,
      lowestExpense,
      highestIncome,
      highestRetained,
      bestRetentionRate
    };
  }, [monthlyMetrics]);

  // 7. MULTI-MONTH OVERALL SUMMARY STATS
  const overallSummary = useMemo(() => {
    const count = monthlyMetrics.length;
    if (count === 0) return null;

    const totalInc = monthlyMetrics.reduce((s, m) => s + m.income, 0);
    const totalExp = monthlyMetrics.reduce((s, m) => s + m.expense, 0);
    const totalRet = totalInc - totalExp;

    const avgInc = Math.round(totalInc / count);
    const avgExp = Math.round(totalExp / count);
    const avgRet = Math.round(totalRet / count);

    // General trend determination
    let generalTrend = 'Ổn định';
    if (monthlyMetrics.length >= 2) {
      const first = monthlyMetrics[0];
      const last = monthlyMetrics[monthlyMetrics.length - 1];
      if (last.expense > first.expense * 1.15) {
        generalTrend = 'Chi tiêu có xu hướng gia tăng';
      } else if (last.expense < first.expense * 0.85) {
        generalTrend = 'Chi tiêu đang thắt chặt';
      } else if (last.retained > first.retained && last.retained > 0) {
        generalTrend = 'Tích lũy tài chính cải thiện';
      }
    }

    return {
      count,
      totalInc,
      totalExp,
      totalRet,
      avgInc,
      avgExp,
      avgRet,
      generalTrend
    };
  }, [monthlyMetrics]);

  // 8. CATEGORY MATRIX DATA ACROSS MONTHS
  const categoryMatrix = useMemo(() => {
    return allCategories.map(cat => {
      const monthValues = monthlyMetrics.map(m => m.categoryExpenses[cat] || 0);
      const total = monthValues.reduce((s, v) => s + v, 0);
      const avg = Math.round(total / (monthlyMetrics.length || 1));

      // Trend classification
      const first = monthValues[0] || 0;
      const last = monthValues[monthValues.length - 1] || 0;
      let trendType: 'surge' | 'drop' | 'stable' | 'new' | 'inactive' = 'stable';
      let trendLabel = 'Ổn định';

      if (first === 0 && last > 0) {
        trendType = 'new';
        trendLabel = 'Mới phát sinh';
      } else if (first > 0 && last === 0) {
        trendType = 'inactive';
        trendLabel = 'Đã dừng chi';
      } else if (first > 0) {
        const pct = ((last - first) / first) * 100;
        if (pct > 25) {
          trendType = 'surge';
          trendLabel = `Tăng +${pct.toFixed(0)}%`;
        } else if (pct < -25) {
          trendType = 'drop';
          trendLabel = `Giảm ${pct.toFixed(0)}%`;
        }
      }

      return {
        category: cat,
        monthValues,
        total,
        avg,
        trendType,
        trendLabel
      };
    }).sort((a, b) => b.total - a.total);
  }, [allCategories, monthlyMetrics]);

  // 9. DRILL-DOWN DATA FOR SELECTED CATEGORY
  const categoryDrillDownData = useMemo(() => {
    if (selectedCategory === 'all') return null;

    return monthlyMetrics.map(m => ({
      label: m.label,
      shortLabel: m.shortLabel,
      amount: m.categoryExpenses[selectedCategory] || 0
    }));
  }, [selectedCategory, monthlyMetrics]);

  // 10. DETECT SIGNIFICANT MULTI-MONTH FLUCTUATIONS & INSIGHTS
  const multiMonthInsights = useMemo(() => {
    const list: { title: string; desc: string; type: 'warning' | 'success' | 'info' }[] = [];

    if (totalEvaluatedTxCount < 3 || monthlyMetrics.length < 2) {
      return null; // Not enough reliable long-term data
    }

    // Insight 1: Compare latest month with average
    if (overallSummary) {
      const latest = monthlyMetrics[monthlyMetrics.length - 1];
      if (latest.expense > overallSummary.avgExp * 1.25 && overallSummary.avgExp > 0) {
        const excess = latest.expense - overallSummary.avgExp;
        list.push({
          type: 'warning',
          title: `${latest.label} chi cao hơn mức bình quân +${formatCurrency(excess)}`,
          desc: `Mức chi tiêu ${formatCurrency(latest.expense)} vượt ${(((latest.expense - overallSummary.avgExp) / overallSummary.avgExp) * 100).toFixed(0)}% so với mức trung bình ${formatCurrency(overallSummary.avgExp)} của các tháng được chọn.`,
        });
      } else if (latest.expense < overallSummary.avgExp * 0.8 && latest.expense > 0) {
        list.push({
          type: 'success',
          title: `${latest.label} tiết giảm chi tiêu ấn tượng`,
          desc: `Chi tiêu chỉ ở mức ${formatCurrency(latest.expense)}, thấp hơn mức bình quân ${formatCurrency(overallSummary.avgExp)} của cả giai đoạn.`,
        });
      }
    }

    // Insight 2: Category persistent surges
    const surgingCat = categoryMatrix.find(c => c.trendType === 'surge' && c.total > 500000);
    if (surgingCat) {
      list.push({
        type: 'warning',
        title: `Nhóm "${surgingCat.category}" có xu hướng tăng chi mạnh`,
        desc: `Từ mức ${formatCurrency(surgingCat.monthValues[0])} ở đầu kỳ lên ${formatCurrency(surgingCat.monthValues[surgingCat.monthValues.length - 1])} ở cuối kỳ (${surgingCat.trendLabel}). Nên cân nhắc thiết lập ngân sách trần.`,
      });
    }

    // Insight 3: Retention rate trend
    const latestRate = monthlyMetrics[monthlyMetrics.length - 1].retentionRate;
    const prevRate = monthlyMetrics[monthlyMetrics.length - 2]?.retentionRate;
    if (latestRate !== null && prevRate !== null) {
      if (latestRate > prevRate + 10) {
        list.push({
          type: 'success',
          title: `Tỷ lệ giữ lại dòng tiền đang cải thiện (+${(latestRate - prevRate).toFixed(1)}%)`,
          desc: `Tỷ lệ tiền tích lũy tăng từ ${prevRate.toFixed(1)}% lên ${latestRate.toFixed(1)}%, thể hiện kỷ luật chi tiêu đang được nâng cao rõ rệt.`,
        });
      }
    }

    return list.length > 0 ? list : null;
  }, [totalEvaluatedTxCount, monthlyMetrics, overallSummary, categoryMatrix]);

  // CHART DATA FOR OVERALL INCOME / EXPENSE / RETAINED
  const chartData = useMemo(() => {
    return monthlyMetrics.map(m => ({
      name: m.shortLabel,
      fullName: m.label,
      'Thu nhập': m.income,
      'Chi tiêu': m.expense,
      'Tiền giữ lại': m.retained
    }));
  }, [monthlyMetrics]);

  return (
    <div className="space-y-6">
      {/* 1. FILTER & TIME RANGE SELECTOR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Phân tích & So sánh các tháng
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Theo dõi xu hướng đa kỳ, đối soát thu chi và biến động từng nhóm danh mục theo thời gian
          </p>
        </div>

        {/* Range Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs">
            {[
              { id: 'last_3', label: '3 tháng gần nhất' },
              { id: 'last_6', label: '6 tháng' },
              { id: 'last_12', label: '12 tháng' },
              { id: 'custom', label: 'Tùy chọn' },
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeOption(r.id as MonthRangeOption)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  rangeOption === r.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers when 'custom' is active */}
          {rangeOption === 'custom' && (
            <div className="flex items-center gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-850 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <select
                value={effectiveCustomStart}
                onChange={e => setCustomStartMonth(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden cursor-pointer"
              >
                {allAvailableMonthKeys.map(m => (
                  <option key={m.key} value={m.key} className="dark:bg-slate-900">
                    {m.label}
                  </option>
                ))}
              </select>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={effectiveCustomEnd}
                onChange={e => setCustomEndMonth(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden cursor-pointer"
              >
                {allAvailableMonthKeys.map(m => (
                  <option key={m.key} value={m.key} className="dark:bg-slate-900">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. MoM SPOTLIGHT: SO VỚI THÁNG TRƯỚC (SECTION 9) */}
      {momSpotlight && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Đối soát MoM
              </span>
              <h4 className="text-lg sm:text-xl font-black mt-1.5 flex items-center gap-2">
                <span>So sánh {momSpotlight.curMetric.label} với {momSpotlight.prevMetric.label}</span>
              </h4>
            </div>
            {!momSpotlight.hasPrevData && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5" /> Chưa có dữ liệu {momSpotlight.prevMetric.label} để so sánh
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Thu MoM */}
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-bold text-slate-400">Tổng thu</span>
              <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                {formatCurrency(momSpotlight.curMetric.income)}
              </div>
              {momSpotlight.hasPrevData ? (
                <div className="text-[11px] mt-1 flex items-center gap-1">
                  <span className={`font-bold font-mono ${momSpotlight.incDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {momSpotlight.incDiff >= 0 ? '↑ +' : '↓ -'}{formatCurrency(Math.abs(momSpotlight.incDiff))}
                  </span>
                  {momSpotlight.incDiffPct !== null && (
                    <span className="text-slate-400 font-mono">({momSpotlight.incDiffPct > 0 ? '+' : ''}{momSpotlight.incDiffPct.toFixed(1)}%)</span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500">Chưa có kỳ đối chiếu</span>
              )}
            </div>

            {/* Chi MoM */}
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-bold text-slate-400">Tổng chi</span>
              <div className="text-lg font-black font-mono text-rose-400 mt-0.5">
                {formatCurrency(momSpotlight.curMetric.expense)}
              </div>
              {momSpotlight.hasPrevData ? (
                <div className="text-[11px] mt-1 flex items-center gap-1">
                  <span className={`font-bold font-mono ${momSpotlight.expDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {momSpotlight.expDiff > 0 ? '↑ +' : '↓ -'}{formatCurrency(Math.abs(momSpotlight.expDiff))}
                  </span>
                  {momSpotlight.expDiffPct !== null && (
                    <span className="text-slate-400 font-mono">({momSpotlight.expDiffPct > 0 ? '+' : ''}{momSpotlight.expDiffPct.toFixed(1)}%)</span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500">Chưa có kỳ đối chiếu</span>
              )}
            </div>

            {/* Giữ lại MoM */}
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-bold text-slate-400">Tiền giữ lại</span>
              <div className={`text-lg font-black font-mono mt-0.5 ${momSpotlight.curMetric.retained >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                {momSpotlight.curMetric.retained >= 0 ? '+' : ''}{formatCurrency(momSpotlight.curMetric.retained)}
              </div>
              {momSpotlight.hasPrevData ? (
                <div className="text-[11px] mt-1 flex items-center gap-1">
                  <span className={`font-bold font-mono ${momSpotlight.retDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {momSpotlight.retDiff >= 0 ? '↑ +' : '↓ -'}{formatCurrency(Math.abs(momSpotlight.retDiff))}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500">Chưa có kỳ đối chiếu</span>
              )}
            </div>

            {/* Chi TB/ngày MoM */}
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-bold text-slate-400">Chi TB mỗi ngày</span>
              <div className="text-lg font-black font-mono text-slate-200 mt-0.5">
                {formatCurrency(momSpotlight.curMetric.avgExpensePerDay)}
              </div>
              {momSpotlight.hasPrevData ? (
                <div className="text-[11px] mt-1 flex items-center gap-1">
                  <span className={`font-bold font-mono ${momSpotlight.avgDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {momSpotlight.avgDiff > 0 ? '↑ +' : '↓ -'}{formatCurrency(Math.abs(momSpotlight.avgDiff))}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500">Chưa có kỳ đối chiếu</span>
              )}
            </div>
          </div>

          {/* Nhóm chi biến động nhiều nhất */}
          {momSpotlight.biggestCatChange && Math.abs(momSpotlight.biggestCatChange.diff) > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <span>
                Nhóm chi thay đổi nhiều nhất: <strong className="text-white">{momSpotlight.biggestCatChange.category}</strong>
              </span>
              <span className={`font-mono font-bold ${momSpotlight.biggestCatChange.diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {momSpotlight.biggestCatChange.diff > 0 ? 'Tăng +' : 'Giảm -'}{formatCurrency(Math.abs(momSpotlight.biggestCatChange.diff))} so với {momSpotlight.prevMetric.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. MULTI-MONTH OVERALL KPI & RANKINGS (SECTION 8 & 10) */}
      {overallSummary && rankings && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Thu bình quân/tháng</span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(overallSummary.avgInc)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tổng thu: {formatCompactCurrency(overallSummary.totalInc)} ({overallSummary.count} tháng)
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Chi bình quân/tháng</span>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(overallSummary.avgExp)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tổng chi: {formatCompactCurrency(overallSummary.totalExp)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Giữ lại bình quân/tháng</span>
              <div className={`text-xl font-black font-mono mt-1 ${overallSummary.avgRet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                {overallSummary.avgRet >= 0 ? '+' : ''}{formatCurrency(overallSummary.avgRet)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Ròng: {formatCompactCurrency(overallSummary.totalRet)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Xu hướng chung</span>
              <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-2 truncate">
                {overallSummary.generalTrend}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tổng hợp {overallSummary.count} tháng
              </span>
            </div>
          </div>

          {/* Xếp hạng các tháng (Section 8) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
            <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Xếp hạng các tháng trong giai đoạn</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Chi nhiều nhất</span>
                <div className="font-black text-xs text-rose-600 dark:text-rose-400 mt-1 truncate">
                  {rankings.highestExpense ? rankings.highestExpense.label : 'Chưa có'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rankings.highestExpense ? formatCurrency(rankings.highestExpense.expense) : '0 ₫'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Chi ít nhất</span>
                <div className="font-black text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {rankings.lowestExpense ? rankings.lowestExpense.label : 'Chưa có'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rankings.lowestExpense ? formatCurrency(rankings.lowestExpense.expense) : '0 ₫'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Thu nhiều nhất</span>
                <div className="font-black text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {rankings.highestIncome ? rankings.highestIncome.label : 'Chưa có'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rankings.highestIncome ? formatCurrency(rankings.highestIncome.income) : '0 ₫'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Giữ lại nhiều nhất</span>
                <div className="font-black text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                  {rankings.highestRetained ? rankings.highestRetained.label : 'Chưa có'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rankings.highestRetained ? `${rankings.highestRetained.retained >= 0 ? '+' : ''}${formatCurrency(rankings.highestRetained.retained)}` : '0 ₫'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ giữ lại tốt nhất</span>
                <div className="font-black text-xs text-purple-600 dark:text-purple-400 mt-1 truncate">
                  {rankings.bestRetentionRate ? rankings.bestRetentionRate.label : 'Chưa có'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {rankings.bestRetentionRate && rankings.bestRetentionRate.retentionRate !== null ? `${rankings.bestRetentionRate.retentionRate.toFixed(1)}%` : 'Chưa có'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BIỂU ĐỒ SO SÁNH THEO THÁNG (SECTION 5) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>Biểu đồ so sánh Thu - Chi - Tiền giữ lại theo tháng</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              So sánh đối soát trực quan giữa các tháng trong giai đoạn đã chọn
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cột (Bar)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('line')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'line'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đường xu hướng (Line)
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        {monthlyMetrics.length > 0 ? (
          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={val => formatCompactCurrency(val)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tiền giữ lại" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={val => formatCompactCurrency(val)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Line type="monotone" dataKey="Thu nhập" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Chi tiêu" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Tiền giữ lại" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} strokeDasharray="4 4" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Thu nhập</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Chi tiêu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Tiền giữ lại (Thu - Chi)</span>
          </div>
        </div>
      </div>

      {/* 5. BẢNG SO SÁNH CHI TIẾT THEO TỪNG THÁNG (SECTIONS 2, 3, 4) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="font-black text-slate-900 dark:text-white text-base">
            Bảng đối soát dòng tiền đa tháng
          </h4>
          <span className="text-xs font-bold text-slate-400">{monthlyMetrics.length} tháng</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Tháng</th>
                <th className="py-3 px-4 text-right">Tổng thu</th>
                <th className="py-3 px-4 text-right">Thay đổi thu</th>
                <th className="py-3 px-4 text-right">Tổng chi</th>
                <th className="py-3 px-4 text-right">Thay đổi chi</th>
                <th className="py-3 px-4 text-right">Chi TB/ngày</th>
                <th className="py-3 px-4 text-right">Tiền giữ lại</th>
                <th className="py-3 px-4 text-right">Tỷ lệ giữ lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyMetrics.map((m, idx) => {
                const prev = idx > 0 ? monthlyMetrics[idx - 1] : null;

                const incDiff = prev ? m.income - prev.income : 0;
                const incDiffPct = prev && prev.income > 0 ? (incDiff / prev.income) * 100 : null;

                const expDiff = prev ? m.expense - prev.expense : 0;
                const expDiffPct = prev && prev.expense > 0 ? (expDiff / prev.expense) * 100 : null;

                return (
                  <tr key={m.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {m.label} {m.isCurrentMonth && <span className="text-[10px] text-blue-500 font-normal">(Hiện tại)</span>}
                    </td>

                    {/* Thu */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(m.income)}
                    </td>

                    {/* Thay đổi thu */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {prev ? (
                        <span className={incDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                          {incDiff >= 0 ? '+' : ''}{formatCurrency(incDiff)} {incDiffPct !== null && `(${incDiffPct > 0 ? '+' : ''}${incDiffPct.toFixed(1)}%)`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Chi */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(m.expense)}
                    </td>

                    {/* Thay đổi chi */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {prev ? (
                        <span className={expDiff > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>
                          {expDiff > 0 ? '+' : ''}{formatCurrency(expDiff)} {expDiffPct !== null && `(${expDiffPct > 0 ? '+' : ''}${expDiffPct.toFixed(1)}%)`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Chi TB/ngày */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(m.avgExpensePerDay)}
                    </td>

                    {/* Tiền giữ lại */}
                    <td className={`py-3.5 px-4 text-right font-mono font-black ${m.retained >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                      {m.retained >= 0 ? '+' : ''}{formatCurrency(m.retained)}
                    </td>

                    {/* Tỷ lệ giữ lại */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {m.retentionRate !== null ? (
                        <span className={`font-bold ${m.retentionRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {m.retentionRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa có thu</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. SO SÁNH NHÓM CHI GIỮA CÁC THÁNG (SECTION 6 & 11) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              <span>So sánh nhóm chi tiêu giữa các tháng</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phát hiện danh mục tăng mạnh, giảm mạnh hoặc mới phát sinh
            </p>
          </div>

          {/* Category Filter for Drill-down (Section 11) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Xem danh mục:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border-none focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả danh mục (Ma trận tổng hợp)</option>
              {allCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* If single category selected: Drill-down Trend Chart */}
        {selectedCategory !== 'all' && categoryDrillDownData && (
          <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                Xu hướng chi tiêu nhóm: <strong className="text-purple-950 dark:text-purple-200">{selectedCategory}</strong>
              </span>
              <button 
                type="button" 
                onClick={() => setSelectedCategory('all')}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                Quay lại xem tất cả
              </button>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={categoryDrillDownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={val => formatCompactCurrency(val)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(val: any) => [formatCurrency(Number(val)), selectedCategory]} />
                  <Area type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#drillGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category Comparison Matrix Table */}
        {categoryMatrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nhóm chi</th>
                  {monthlyMetrics.map(m => (
                    <th key={m.key} className="py-3 px-4 text-right whitespace-nowrap">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">Tổng kỳ</th>
                  <th className="py-3 px-4 text-center">Biến động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryMatrix.map(row => (
                  <tr 
                    key={row.category} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                      selectedCategory === row.category ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(row.category)}
                        className="hover:text-purple-600 dark:hover:text-purple-400 text-left font-bold cursor-pointer"
                      >
                        {row.category}
                      </button>
                    </td>

                    {row.monthValues.map((val, i) => (
                      <td key={monthlyMetrics[i].key} className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {val > 0 ? formatCurrency(val) : <span className="text-slate-400">0 ₫</span>}
                      </td>
                    ))}

                    <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(row.total)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                        row.trendType === 'surge' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        row.trendType === 'drop' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        row.trendType === 'new' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        row.trendType === 'inactive' ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {row.trendLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Chưa có dữ liệu danh mục chi tiêu trong các tháng đã chọn.
          </div>
        )}
      </div>

      {/* 7. PHÂN TÍCH BIẾN ĐỘNG & GỢI Ý THÔNG MINH DÀI HẠN (SECTIONS 7 & 12) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Phát hiện biến động & Gợi ý tài chính dài hạn</span>
          </h4>
          <span className="text-[11px] font-bold text-slate-400">Dựa trên dữ liệu thực tế</span>
        </div>

        {multiMonthInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {multiMonthInsights.map((insight, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border ${
                  insight.type === 'warning'
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : insight.type === 'success'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {insight.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {insight.desc}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa đủ dữ liệu để phân tích xu hướng dài hạn.
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cần ít nhất 2 tháng có ghi nhận giao dịch để hệ thống phân tích đối soát biến động và tạo nhận định dài hạn.
            </p>
          </div>
        )}
      </div>

      {/* 8. EMPTY STATE KHI KHÔNG CÓ BẤT KỲ GIAO DỊCH NÀO TRONG CẢ GIAI ĐOẠN */}
      {totalEvaluatedTxCount === 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-8 sm:p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Receipt className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Chưa có dữ liệu giao dịch trong giai đoạn này
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Các tháng được chọn hiện chưa ghi nhận giao dịch nào. Hãy thêm giao dịch để bắt đầu theo dõi xu hướng đa tháng.
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
    </div>
  );
};
