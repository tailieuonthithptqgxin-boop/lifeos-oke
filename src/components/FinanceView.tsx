import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Wallet, Plus, Target, ArrowRightLeft,
  PieChart, Activity, LayoutDashboard
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '../lib/utils';

// Subcomponents and Modals
import { FinanceTabButton } from './finance/FinanceTabButton';
import { AccountModal } from './finance/AccountModal';
import { BudgetModal } from './finance/BudgetModal';
import { SavingGoalModal } from './finance/SavingGoalModal';
import { DebtModal } from './finance/DebtModal';
import { TransactionModal } from './finance/TransactionModal';

// Tab Views
import { FinanceOverviewTab } from './finance/FinanceOverviewTab';
import { FinanceAccountsTab } from './finance/FinanceAccountsTab';
import { FinanceTransactionsTab } from './finance/FinanceTransactionsTab';
import { FinanceBudgetsTab } from './finance/FinanceBudgetsTab';
import { FinanceGoalsTab } from './finance/FinanceGoalsTab';
import { FinanceScenarioTab } from './finance/FinanceScenarioTab';

type Tab = 'overview' | 'accounts' | 'transactions' | 'budgets' | 'goals' | 'scenario';

export function FinanceView() {
  const { 
    financeAccounts = [], 
    transactions = [], 
    budgets = [], 
    savingGoals = [], 
    debts = [], 
    addTransaction, 
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
    deleteDebt
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const [showSavingGoalModal, setShowSavingGoalModal] = useState(false);
  const [editingSavingGoal, setEditingSavingGoal] = useState<any>(null);

  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);

  // Period Filter State for Charts & Analysis
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');

  // Computed Values
  const totalBalance = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
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

  // Keep monthlyTx for backwards-compatible monthly-scoped widgets
  const monthlyTx = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [transactions, currentMonth, currentYear]);

  const periodIncome = useMemo(() => {
    return periodFilteredTx.filter(t => t.type === 'Thu nhập').reduce((sum, t) => sum + t.amount, 0);
  }, [periodFilteredTx]);

  const periodExpense = useMemo(() => {
    return periodFilteredTx.filter(t => t.type === 'Chi tiêu').reduce((sum, t) => sum + t.amount, 0);
  }, [periodFilteredTx]);

  const monthlyIncome = useMemo(() => {
    return monthlyTx.filter(t => t.type === 'Thu nhập').reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTx]);

  const monthlyExpense = useMemo(() => {
    return monthlyTx.filter(t => t.type === 'Chi tiêu').reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTx]);

  const netIncome = monthlyIncome - monthlyExpense;

  // Total allocated budget limit (scaled to period if needed, defaults to monthly budget limit)
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
    const expenses = periodFilteredTx.filter(t => t.type === 'Chi tiêu');
    const categoryMap: any = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  }, [periodFilteredTx]);
  
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  // Comparison Bar Chart Data: Thu nhập vs Chi tiêu vs Ngân sách
  const incomeExpenseData = useMemo(() => {
    const list = [
      { name: 'Thu nhập', amount: periodIncome, color: '#22c55e' },
      { name: 'Chi tiêu', amount: periodExpense, color: '#ef4444' },
    ];
    if (totalBudgetLimit > 0) {
      list.push({ name: 'Ngân sách', amount: totalBudgetLimit, color: '#3b82f6' });
    }
    return list;
  }, [periodIncome, periodExpense, totalBudgetLimit]);

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-28 max-w-7xl mx-auto h-full flex flex-col space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tài chính</h2>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50">
              Finance OS 💸
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Quản lý dòng tiền, ngân sách và mục tiêu tiết kiệm chill chill 🌸</p>
        </div>
        <button type="button" 
          onClick={() => setShowTxModal(true)}
          className="btn-squishy flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white px-5 py-3 rounded-2xl text-sm font-extrabold transition-all shadow-md shadow-purple-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Thêm Giao dịch 💸
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
        <FinanceTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard className="w-4 h-4" />} label="Tổng quan" />
        <FinanceTabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Wallet className="w-4 h-4" />} label="Tài khoản" />
        <FinanceTabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft className="w-4 h-4" />} label="Giao dịch" />
        <FinanceTabButton active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<PieChart className="w-4 h-4" />} label="Ngân sách" />
        <FinanceTabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target className="w-4 h-4" />} label="Mục tiêu" />
        <FinanceTabButton active={activeTab === 'scenario'} onClick={() => setActiveTab('scenario')} icon={<Activity className="w-4 h-4" />} label="Dự báo chi tiêu 🔮" />
      </div>

      {/* Tab Panels */}
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
          onOpenTxModal={() => setShowTxModal(true)}
          onOpenAccountModal={(acc) => {
            setEditingAccount(acc || null);
            setShowAccountModal(true);
          }}
        />
      )}

      {activeTab === 'accounts' && (
        <FinanceAccountsTab
          accounts={financeAccounts}
          onOpenModal={(acc) => {
            setEditingAccount(acc || null);
            setShowAccountModal(true);
          }}
          onDeleteAccount={(id) => deleteFinanceAccount(id)}
        />
      )}

      {activeTab === 'transactions' && (
        <FinanceTransactionsTab
          transactions={transactions}
          accounts={financeAccounts}
          onDeleteTransaction={(id) => deleteTransaction(id)}
          onOpenTxModal={() => setShowTxModal(true)}
        />
      )}

      {activeTab === 'budgets' && (
        <FinanceBudgetsTab
          budgets={budgets}
          monthlyTx={monthlyTx}
          onOpenModal={(budget) => {
            setEditingBudget(budget || null);
            setShowBudgetModal(true);
          }}
          onDeleteBudget={(id) => deleteBudget(id)}
        />
      )}

      {activeTab === 'goals' && (
        <FinanceGoalsTab
          savingGoals={savingGoals}
          debts={debts}
          onOpenSavingGoalModal={(g) => {
            setEditingSavingGoal(g || null);
            setShowSavingGoalModal(true);
          }}
          onOpenDebtModal={(d) => {
            setEditingDebt(d || null);
            setShowDebtModal(true);
          }}
        />
      )}

      {activeTab === 'scenario' && (
        <FinanceScenarioTab
          accounts={financeAccounts}
          budgets={budgets}
          monthlyTx={monthlyTx}
          onAddTransaction={(tx) => addTransaction(tx)}
        />
      )}

      {/* Global Modals */}
      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onSave={(acc: any) => {
            if (editingAccount) {
              updateFinanceAccount(editingAccount.id, acc);
            } else {
              addFinanceAccount(acc);
            }
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onDelete={(id: string) => {
            deleteFinanceAccount(id);
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
        />
      )}

      {showTxModal && (
        <TransactionModal 
          onClose={() => setShowTxModal(false)}
          onSave={(tx: any) => {
            addTransaction({
              ...tx,
              amount: Number(tx.amount)
            });
            setShowTxModal(false);
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
            if (editingBudget) {
              updateBudget(editingBudget.id, b);
            } else {
              addBudget(b);
            }
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onDelete={(id: string) => {
            deleteBudget(id);
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
            if (editingSavingGoal) {
              updateSavingGoal(editingSavingGoal.id, g);
            } else {
              addSavingGoal(g);
            }
            setShowSavingGoalModal(false);
            setEditingSavingGoal(null);
          }}
          onDelete={(id: string) => {
            deleteSavingGoal(id);
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
            if (editingDebt) {
              updateDebt(editingDebt.id, d);
            } else {
              addDebt(d);
            }
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
          onDelete={(id: string) => {
            deleteDebt(id);
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
        />
      )}
    </div>
  );
}
export default FinanceView;
