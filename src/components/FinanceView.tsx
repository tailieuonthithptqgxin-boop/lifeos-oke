import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  Wallet, Plus, Target, ArrowRightLeft,
  PieChart, Activity, LayoutDashboard, TrendingUp, Shield,
  Zap, Sparkles, X, RotateCcw
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { soundEngine } from '../lib/soundEngine';

// Subcomponents and Modals
import { FinanceTabButton } from './finance/FinanceTabButton';
import { AccountModal } from './finance/AccountModal';
import { BudgetModal } from './finance/BudgetModal';
import { SavingGoalModal } from './finance/SavingGoalModal';
import { DebtModal } from './finance/DebtModal';
import { TransactionModal } from './finance/TransactionModal';

// Tab Views
import { FinanceOverviewTab } from './finance/FinanceOverviewTab';
import { FinanceAnalyticsTab } from './finance/FinanceAnalyticsTab';
import { FinanceAccountsTab } from './finance/FinanceAccountsTab';
import { FinanceTransactionsTab } from './finance/FinanceTransactionsTab';
import { FinanceBudgetsTab } from './finance/FinanceBudgetsTab';
import { FinanceGoalsTab } from './finance/FinanceGoalsTab';
import { FinanceScenarioTab } from './finance/FinanceScenarioTab';

type Tab = 'overview' | 'analytics' | 'accounts' | 'transactions' | 'budgets' | 'goals' | 'scenario';

// Natural Language Quick Transaction Parser
function parseQuickTransaction(input: string, defaultAccountId: string) {
  let text = input.trim();
  let type: 'Thu nhập' | 'Chi tiêu' = 'Chi tiêu';
  let category = 'Chi tiêu khác';
  let amount = 0;

  // 1. Detect type
  if (/lương|thưởng|thu\s*nhập|income|tiền\s*về/i.test(text)) {
    type = 'Thu nhập';
    category = 'Thu nhập';
  }

  // 2. Extract amount: e.g. 35k, 50.000, 50000, 15tr, 2.5tr, 1.2m
  const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|m|đ|vnd)?\b/i;
  const match = text.match(amountRegex);
  if (match) {
    let num = parseFloat(match[1].replace(',', '.'));
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') {
      num *= 1000;
    } else if (unit === 'tr' || unit === 'triệu' || unit === 'm') {
      num *= 1000000;
    }
    amount = Math.round(num);
    text = text.replace(match[0], '').trim();
  }

  // 3. Category inference
  const lower = text.toLowerCase();
  if (/cà\s*phê|cafe|coffee|ăn|cơm|trưa|tối|sáng|bún|phở|trà|snack|đồ\s*uống/i.test(lower)) {
    category = 'Ăn uống';
  } else if (/xăng|xe|grab|be|taxi|gửi\s*xe|vé\s*xe/i.test(lower)) {
    category = 'Đi lại';
  } else if (/mua|áo|quần|giày|shopee|lazada|tiki|sách/i.test(lower)) {
    category = 'Mua sắm';
  } else if (/tiền\s*nhà|điện|nước|mạng|wifi|gas|hóa\s*đơn/i.test(lower)) {
    category = 'Hóa đơn';
  } else if (/thuốc|khám|bệnh|gym|thể\s*thao/i.test(lower)) {
    category = 'Sức khỏe';
  } else if (/học|khóa\s*học|sách\s*vở/i.test(lower)) {
    category = 'Giáo dục';
  } else if (type === 'Thu nhập') {
    if (/lương/i.test(lower)) category = 'Lương';
    else if (/thưởng/i.test(lower)) category = 'Thưởng';
    else category = 'Thu nhập khác';
  }

  return {
    type,
    amount: amount > 0 ? amount : 50000,
    category,
    note: text || (type === 'Thu nhập' ? 'Thu nhập' : 'Chi tiêu'),
    accountId: defaultAccountId,
    date: formatLocalDateKey(new Date()),
    status: 'Completed'
  };
}

export function FinanceView() {
  const { 
    financeAccounts = [], 
    transactions = [], 
    budgets = [], 
    savingGoals = [], 
    debts = [], 
    addTransaction, 
    updateTransaction,
    deleteTransaction, 
    addFinanceAccount, 
    updateFinanceAccount, 
    deleteFinanceAccount,
    addBudget,
    updateBudget,
    deleteBudget,
    addSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    addDebt,
    updateDebt,
    deleteDebt,
    language
  } = useAppStore();
  
  const t = useTranslation(language);
  const isVi = language === 'vi';

  // Active Tab with F5 Reload Persistence
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_finance_active_tab') as any;
        if (saved && ['overview', 'analytics', 'accounts', 'transactions', 'budgets', 'goals', 'scenario'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'overview';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_finance_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Modals State
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const [showSavingGoalModal, setShowSavingGoalModal] = useState(false);
  const [editingSavingGoal, setEditingSavingGoal] = useState<any>(null);

  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);

  // Quick In-line Transaction State
  const [quickTxInput, setQuickTxInput] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Unified Optimistic Undo delete state for all finance entities (5-second floating undo)
  interface UndoFinanceItem {
    type: 'transaction' | 'account' | 'budget' | 'goal' | 'debt';
    data: any;
    title: string;
  }
  const [undoItem, setUndoItem] = useState<UndoFinanceItem | null>(null);
  const undoTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const isAnyFinanceModalOpen = !!(showTxModal || showAccountModal || showBudgetModal || showSavingGoalModal || showDebtModal);
  useBodyScrollLock(isAnyFinanceModalOpen);

  const handleDeleteTransaction = (id: string, tx?: any) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const targetTx = tx || transactions.find(t => t.id === id);
    soundEngine.playPop();
    if (targetTx) {
      setUndoItem({ 
        type: 'transaction', 
        data: targetTx, 
        title: targetTx.category || targetTx.note || (isVi ? 'Giao dịch' : 'Transaction') 
      });
      deleteTransaction(id);
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 5000);
    } else {
      deleteTransaction(id);
    }
  };

  const handleDeleteAccount = (id: string, acc?: any) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const target = acc || financeAccounts.find(a => a.id === id);
    soundEngine.playPop();
    if (target) {
      setUndoItem({ 
        type: 'account', 
        data: target, 
        title: target.name || (isVi ? 'Tài khoản' : 'Account') 
      });
      deleteFinanceAccount(id);
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 5000);
    } else {
      deleteFinanceAccount(id);
    }
  };

  const handleDeleteBudget = (id: string, b?: any) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const target = b || budgets.find(x => x.id === id);
    soundEngine.playPop();
    if (target) {
      setUndoItem({ 
        type: 'budget', 
        data: target, 
        title: target.category || (isVi ? 'Ngân sách' : 'Budget') 
      });
      deleteBudget(id);
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 5000);
    } else {
      deleteBudget(id);
    }
  };

  const handleDeleteSavingGoal = (id: string, g?: any) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const target = g || savingGoals.find(x => x.id === id);
    soundEngine.playPop();
    if (target) {
      setUndoItem({ 
        type: 'goal', 
        data: target, 
        title: target.title || target.name || (isVi ? 'Mục tiêu' : 'Goal') 
      });
      deleteSavingGoal(id);
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 5000);
    } else {
      deleteSavingGoal(id);
    }
  };

  const handleDeleteDebt = (id: string, d?: any) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const target = d || debts.find(x => x.id === id);
    soundEngine.playPop();
    if (target) {
      setUndoItem({ 
        type: 'debt', 
        data: target, 
        title: target.title || target.person || (isVi ? 'Khoản nợ' : 'Debt') 
      });
      deleteDebt(id);
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 5000);
    } else {
      deleteDebt(id);
    }
  };

  const handleUndo = async () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoItem) {
      soundEngine.playSuccess();
      try {
        if (undoItem.type === 'transaction') await addTransaction(undoItem.data);
        else if (undoItem.type === 'account') await addFinanceAccount(undoItem.data);
        else if (undoItem.type === 'budget') await addBudget(undoItem.data);
        else if (undoItem.type === 'goal') await addSavingGoal(undoItem.data);
        else if (undoItem.type === 'debt') await addDebt(undoItem.data);
      } catch (err) {
        console.error('Failed to undo delete:', err);
      }
      setUndoItem(null);
    }
  };

  // Quick Natural Language Submit Handler
  const handleQuickAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTxInput.trim();
    if (!trimmed || isQuickSubmitting) return;

    const defaultAcc = financeAccounts.length > 0 ? financeAccounts[0] : null;
    const defaultAccId = defaultAcc ? defaultAcc.id : '';

    try {
      setIsQuickSubmitting(true);
      const parsed = parseQuickTransaction(trimmed, defaultAccId);
      await addTransaction(parsed);
      soundEngine.playSuccess();
      setQuickTxInput('');
    } catch (err) {
      console.error('Failed to quick add transaction:', err);
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Scenario Tab state with F5 Persistence
  const [scenarioAccId, setScenarioAccId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_finance_scenario_acc') || '';
      } catch {}
    }
    return '';
  });

  useEffect(() => {
    try {
      if (scenarioAccId) localStorage.setItem('lifeos_finance_scenario_acc', scenarioAccId);
    } catch {}
  }, [scenarioAccId]);

  const [forecastAmount, setForecastAmount] = useState<number>(0);
  const [forecastCategory, setForecastCategory] = useState<string>('Ăn uống');
  const [forecastNote, setForecastNote] = useState<string>('');

  // Period Filter State with F5 Persistence
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_finance_chart_period') as any;
        if (saved && ['today', 'week', 'month', 'year', 'all'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'month';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_finance_chart_period', chartPeriod);
    } catch {}
  }, [chartPeriod]);

  // Computed Values
  const totalBalance = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  const now = new Date();
  const todayStr = formatLocalDateKey(now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter transactions based on selected period
  const periodFilteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return false;

      if (chartPeriod === 'today') {
        return t.date.startsWith(todayStr);
      }
      if (chartPeriod === 'week') {
        const diffTime = now.getTime() - tDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (chartPeriod === 'month') {
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      }
      if (chartPeriod === 'year') {
        return tDate.getFullYear() === currentYear;
      }
      return true; // 'all'
    });
  }, [transactions, chartPeriod, todayStr, currentMonth, currentYear]);

  // Monthly scoped transactions
  const monthlyTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [transactions, currentMonth, currentYear]);

  const periodIncome = useMemo(() => {
    return periodFilteredTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodFilteredTx]);

  const periodExpense = useMemo(() => {
    return periodFilteredTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodFilteredTx]);

  const monthlyIncome = useMemo(() => {
    return monthlyTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthlyTx]);

  const monthlyExpense = useMemo(() => {
    return monthlyTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthlyTx]);

  const netIncome = monthlyIncome - monthlyExpense;

  // Total allocated budget limit
  const totalBudgetLimit = useMemo(() => {
    const rawMonthlyLimit = budgets.reduce((sum: number, b: any) => sum + (b.limit || 0), 0);
    if (chartPeriod === 'today') return Math.round(rawMonthlyLimit / 30);
    if (chartPeriod === 'week') return Math.round((rawMonthlyLimit / 30) * 7);
    if (chartPeriod === 'year') return rawMonthlyLimit * 12;
    return rawMonthlyLimit;
  }, [budgets, chartPeriod]);

  // Budget remaining and utilization percentage
  const budgetRemaining = Math.max(0, totalBudgetLimit - periodExpense);
  const budgetUtilizationPercent = totalBudgetLimit > 0 
    ? Math.round((periodExpense / totalBudgetLimit) * 100) 
    : null;

  const categoryData = useMemo(() => {
    const expenses = periodFilteredTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense');
    const categoryMap: any = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + (Number(t.amount) || 0);
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  }, [periodFilteredTx]);
  
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  // Comparison Bar Chart Data
  const incomeExpenseData = useMemo(() => {
    const list = [
      { name: isVi ? 'Thu nhập' : 'Income', amount: periodIncome, color: '#22c55e' },
      { name: isVi ? 'Chi tiêu' : 'Expense', amount: periodExpense, color: '#ef4444' },
    ];
    if (totalBudgetLimit > 0) {
      list.push({ name: isVi ? 'Ngân sách' : 'Budget', amount: totalBudgetLimit, color: '#3b82f6' });
    }
    return list;
  }, [periodIncome, periodExpense, totalBudgetLimit, isVi]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* ========================================================= */}
      {/* HEADER BAR                                                */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs shrink-0 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {isVi ? 'Quản lý Tài chính Thông minh' : 'Smart Finance & Cash Flow'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
                  {isVi ? 'Thu Chi Tự Động' : 'Cash Flow'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi ? 'Kiểm soát dòng tiền, ngân sách danh mục, mục tiêu tiết kiệm và các khoản nợ.' : 'Manage cash flow, budgets, savings goals, and debts.'}
              </p>
            </div>
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => {
            soundEngine.playPop();
            setShowTxModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> 
          <span>{isVi ? 'Thêm giao dịch' : 'Add Transaction'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* NATURAL LANGUAGE IN-LINE QUICK EXPENSE/INCOME BAR        */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-[#141E30] p-3 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
        <form onSubmit={handleQuickAddTx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-500/20 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isVi ? 'Ghi nhanh' : 'Quick Entry'}:</span>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={quickTxInput}
              onChange={e => setQuickTxInput(e.target.value)}
              placeholder={isVi ? "Nhập tự nhiên: Cà phê 35k, Xăng 70k, Ăn trưa 45k, Lương 20tr... [Enter]" : "e.g. Coffee 35k, Gas 70k, Lunch 45k, Salary 20m... [Enter]"}
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-8"
            />
            {quickTxInput && (
              <button
                type="button"
                onClick={() => setQuickTxInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!quickTxInput.trim() || isQuickSubmitting}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? 'Ghi sổ' : 'Record'}</span>
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* NAVIGATION TABS                                           */}
      {/* ========================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0 w-full min-w-0 max-w-full">
        <FinanceTabButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); soundEngine.playPop(); }} icon={<LayoutDashboard className="w-4 h-4" />} label={isVi ? 'Tổng quan' : 'Overview'} />
        <FinanceTabButton active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); soundEngine.playPop(); }} icon={<TrendingUp className="w-4 h-4" />} label={isVi ? 'Phân tích Thu Chi' : 'Analytics'} />
        <FinanceTabButton active={activeTab === 'accounts'} onClick={() => { setActiveTab('accounts'); soundEngine.playPop(); }} icon={<Wallet className="w-4 h-4" />} label={isVi ? 'Tài khoản' : 'Accounts'} />
        <FinanceTabButton active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); soundEngine.playPop(); }} icon={<ArrowRightLeft className="w-4 h-4" />} label={isVi ? 'Sổ giao dịch' : 'Transactions'} />
        <FinanceTabButton active={activeTab === 'budgets'} onClick={() => { setActiveTab('budgets'); soundEngine.playPop(); }} icon={<PieChart className="w-4 h-4" />} label={isVi ? 'Ngân sách' : 'Budgets'} />
        <FinanceTabButton active={activeTab === 'goals'} onClick={() => { setActiveTab('goals'); soundEngine.playPop(); }} icon={<Target className="w-4 h-4" />} label={isVi ? 'Mục tiêu & Nợ' : 'Goals & Debts'} />
        <FinanceTabButton active={activeTab === 'scenario'} onClick={() => { setActiveTab('scenario'); soundEngine.playPop(); }} icon={<Activity className="w-4 h-4" />} label={isVi ? 'Mô phỏng Dòng tiền' : 'Simulator'} />
      </div>

      {/* Privacy Notice & Financial Disclaimer (Nghị định 13/2023/NĐ-CP) */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">
            <strong>Bảo vệ dữ liệu tài chính (Nghị định 13):</strong> Dữ liệu thu chi được cô lập theo tài khoản cá nhân, lưu trữ an toàn trong PostgreSQL nội bộ và không chia sẻ cho bên thứ ba.
          </span>
        </div>
        <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 font-medium">
          Miễn trừ tư vấn
        </a>
      </div>

      {/* ========================================================= */}
      {/* TAB CONTENT PANELS                                        */}
      {/* ========================================================= */}
      <div key={activeTab} className="animate-page-enter">
        {activeTab === 'overview' && (
          <FinanceOverviewTab
            totalBalance={totalBalance}
            monthlyIncome={monthlyIncome}
            monthlyExpense={monthlyExpense}
            netIncome={netIncome}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
            periodFilteredTx={periodFilteredTx}
            periodExpense={periodExpense}
            totalBudgetLimit={totalBudgetLimit}
            budgetRemaining={budgetRemaining}
            budgetUtilizationPercent={budgetUtilizationPercent}
            incomeExpenseData={incomeExpenseData}
            categoryData={categoryData}
            COLORS={COLORS}
            financeAccounts={financeAccounts}
            budgets={budgets}
            monthlyTx={monthlyTx}
            onOpenTxModal={() => {
              soundEngine.playPop();
              setShowTxModal(true);
            }}
            onOpenAccountModal={(acc) => {
              soundEngine.playPop();
              setEditingAccount(acc || null);
              setShowAccountModal(true);
            }}
            onSelectTab={(tab) => {
              soundEngine.playPop();
              setActiveTab(tab);
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <FinanceAnalyticsTab
            transactions={transactions}
            budgets={budgets}
            savingGoals={savingGoals}
            onOpenTxModal={() => {
              soundEngine.playPop();
              setShowTxModal(true);
            }}
          />
        )}

        {activeTab === 'accounts' && (
          <FinanceAccountsTab
            financeAccounts={financeAccounts}
            getAccountIcon={(type: string) => {
              if (type === 'Ngân hàng' || type === 'Bank') return <div className="font-bold">🏦</div>;
              if (type === 'Ví điện tử' || type === 'E-wallet') return <div className="font-bold">💳</div>;
              if (type === 'Tiết kiệm' || type === 'Savings') return <div className="font-bold">🐷</div>;
              return <Wallet className="w-5 h-5" />;
            }}
            formatCurrency={formatCurrency}
            onEditAccount={(acc) => {
              soundEngine.playPop();
              setEditingAccount(acc || null);
              setShowAccountModal(true);
            }}
            onDeleteAccount={(id, acc) => handleDeleteAccount(id, acc)}
            onAddAccount={() => {
              soundEngine.playPop();
              setEditingAccount(null);
              setShowAccountModal(true);
            }}
          />
        )}

        {activeTab === 'transactions' && (
          <FinanceTransactionsTab
            transactions={transactions}
            formatCurrency={formatCurrency}
            onDeleteTransaction={(id, tx) => handleDeleteTransaction(id, tx)}
            onEditTransaction={(tx) => {
              soundEngine.playPop();
              setEditingTransaction(tx);
              setShowTxModal(true);
            }}
          />
        )}

        {activeTab === 'budgets' && (
          <FinanceBudgetsTab
            budgets={budgets}
            monthlyTx={monthlyTx}
            monthlyExpense={monthlyExpense}
            formatCurrency={formatCurrency}
            onEditBudget={(budget) => {
              soundEngine.playPop();
              setEditingBudget(budget || null);
              setShowBudgetModal(true);
            }}
            onDeleteBudget={(id, b) => handleDeleteBudget(id, b)}
            onAddBudget={() => {
              soundEngine.playPop();
              setEditingBudget(null);
              setShowBudgetModal(true);
            }}
          />
        )}

        {activeTab === 'goals' && (
          <FinanceGoalsTab
            savingGoals={savingGoals}
            debts={debts}
            formatCurrency={formatCurrency}
            onEditSavingGoal={(g) => {
              soundEngine.playPop();
              setEditingSavingGoal(g || null);
              setShowSavingGoalModal(true);
            }}
            onDeleteSavingGoal={(id, g) => handleDeleteSavingGoal(id, g)}
            onAddSavingGoal={() => {
              soundEngine.playPop();
              setEditingSavingGoal(null);
              setShowSavingGoalModal(true);
            }}
            onEditDebt={(d) => {
              soundEngine.playPop();
              setEditingDebt(d || null);
              setShowDebtModal(true);
            }}
            onDeleteDebt={(id, d) => handleDeleteDebt(id, d)}
            onUpdateDebtStatus={(id, status) => {
              soundEngine.playPop();
              updateDebt(id, { status });
            }}
            onAddDebt={() => {
              soundEngine.playPop();
              setEditingDebt(null);
              setShowDebtModal(true);
            }}
          />
        )}

        {activeTab === 'scenario' && (
          <FinanceScenarioTab
            financeAccounts={financeAccounts}
            budgets={budgets}
            monthlyTx={monthlyTx}
            selectedAccId={scenarioAccId}
            setSelectedAccId={setScenarioAccId}
            forecastAmount={forecastAmount}
            setForecastAmount={setForecastAmount}
            forecastCategory={forecastCategory}
            setForecastCategory={setForecastCategory}
            forecastNote={forecastNote}
            setForecastNote={setForecastNote}
            formatCurrency={formatCurrency}
            onExecuteRealTransaction={() => {
              const acc = (financeAccounts || []).find((a: any) => a.id === scenarioAccId) || (financeAccounts && financeAccounts.length > 0 ? financeAccounts[0] : null);
              if (!acc || forecastAmount <= 0) return;
              addTransaction({
                type: 'Chi tiêu',
                amount: forecastAmount,
                category: forecastCategory || 'Chi tiêu khác',
                accountId: acc.id,
                date: todayStr,
                note: forecastNote || (isVi ? 'Ghi nhận từ Mô phỏng chi tiêu' : 'Recorded from Expense Forecast'),
                status: 'Completed'
              });
              soundEngine.playSuccess();
              setForecastAmount(0);
              setForecastNote('');
            }}
            onOpenAccountModal={() => {
              soundEngine.playPop();
              setEditingAccount(null);
              setShowAccountModal(true);
            }}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* GLOBAL MODALS                                             */}
      {/* ========================================================= */}
      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onSave={(acc: any) => {
            if (editingAccount?.id) {
              updateFinanceAccount(editingAccount.id, acc);
            } else {
              addFinanceAccount(acc);
            }
            soundEngine.playSuccess();
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onDelete={(id: string, acc?: any) => {
            handleDeleteAccount(id, acc);
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
        />
      )}

      {showTxModal && (
        <TransactionModal 
          initialData={editingTransaction}
          onClose={() => {
            setShowTxModal(false);
            setEditingTransaction(null);
          }}
          onSave={(tx: any) => {
            const formattedTx = {
              ...tx,
              amount: Number(tx.amount)
            };
            if (editingTransaction?.id) {
              updateTransaction(editingTransaction.id, formattedTx);
            } else {
              addTransaction(formattedTx);
            }
            soundEngine.playSuccess();
            setShowTxModal(false);
            setEditingTransaction(null);
          }}
          accounts={financeAccounts}
        />
      )}

      {showBudgetModal && (
        <BudgetModal
          budget={editingBudget}
          onClose={() => {
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onSave={(b: any) => {
            if (editingBudget?.id) {
              updateBudget(editingBudget.id, b);
            } else {
              addBudget(b);
            }
            soundEngine.playSuccess();
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onDelete={(id: string, b?: any) => {
            handleDeleteBudget(id, b);
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
        />
      )}

      {showSavingGoalModal && (
        <SavingGoalModal
          goal={editingSavingGoal}
          onClose={() => {
            setShowSavingGoalModal(false);
            setEditingSavingGoal(null);
          }}
          onSave={(g: any) => {
            if (editingSavingGoal?.id) {
              updateSavingGoal(editingSavingGoal.id, g);
            } else {
              addSavingGoal(g);
            }
            soundEngine.playSuccess();
            setShowSavingGoalModal(false);
            setEditingSavingGoal(null);
          }}
          onDelete={(id: string, g?: any) => {
            handleDeleteSavingGoal(id, g);
            setShowSavingGoalModal(false);
            setEditingSavingGoal(null);
          }}
        />
      )}

      {showDebtModal && (
        <DebtModal
          debt={editingDebt}
          onClose={() => {
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
          onSave={(d: any) => {
            if (editingDebt?.id) {
              updateDebt(editingDebt.id, d);
            } else {
              addDebt(d);
            }
            soundEngine.playSuccess();
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
          onDelete={(id: string, d?: any) => {
            handleDeleteDebt(id, d);
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 5-SECOND FLOATING UNDO NOTIFICATION (UNIVERSAL FOR FINANCE)*/}
      {/* ========================================================= */}
      {undoItem && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-300 text-xs font-semibold backdrop-blur-md animate-slide-up">
          <span className="truncate max-w-[200px] sm:max-w-xs">
            {isVi ? `Đã xóa "${undoItem.title}"` : `Deleted "${undoItem.title}"`}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác' : 'Undo'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              setUndoItem(null);
            }}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default FinanceView;
