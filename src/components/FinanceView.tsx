import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  Wallet, Plus, Target, ArrowRightLeft,
  PieChart, Activity, LayoutDashboard, TrendingUp
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
import { FinanceAnalyticsTab } from './finance/FinanceAnalyticsTab';
import { FinanceAccountsTab } from './finance/FinanceAccountsTab';
import { FinanceTransactionsTab } from './finance/FinanceTransactionsTab';
import { FinanceBudgetsTab } from './finance/FinanceBudgetsTab';
import { FinanceGoalsTab } from './finance/FinanceGoalsTab';
import { FinanceScenarioTab } from './finance/FinanceScenarioTab';

type Tab = 'overview' | 'analytics' | 'accounts' | 'transactions' | 'budgets' | 'goals' | 'scenario';

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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

  // Scenario Tab state
  const [scenarioAccId, setScenarioAccId] = useState<string>('');
  const [forecastAmount, setForecastAmount] = useState<number>(0);
  const [forecastCategory, setForecastCategory] = useState<string>('Ăn uống');
  const [forecastNote, setForecastNote] = useState<string>('');

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

  // Comparison Bar Chart Data: Income vs Expense vs Budget
  const incomeExpenseData = useMemo(() => {
    const list = [
      { name: 'Income', amount: periodIncome, color: '#22c55e' },
      { name: 'Expense', amount: periodExpense, color: '#ef4444' },
    ];
    if (totalBudgetLimit > 0) {
      list.push({ name: 'Budget', amount: totalBudgetLimit, color: '#3b82f6' });
    }
    return list;
  }, [periodIncome, periodExpense, totalBudgetLimit]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shrink-0 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">{t('Finance')}</h2>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {t('Money')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium break-words">{t('Manage cash flow, budgets, and disciplined savings')}</p>
        </div>
        <button type="button" 
          onClick={() => setShowTxModal(true)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black btn-squishy shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> {t('Add Transaction')}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0 w-full min-w-0 max-w-full">
        <FinanceTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard className="w-4 h-4" />} label={t('Overview')} />
        <FinanceTabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<TrendingUp className="w-4 h-4" />} label={t('Income & Expense Analytics')} />
        <FinanceTabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Wallet className="w-4 h-4" />} label={t('Accounts')} />
        <FinanceTabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft className="w-4 h-4" />} label={t('Transactions')} />
        <FinanceTabButton active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<PieChart className="w-4 h-4" />} label={t('Budgets')} />
        <FinanceTabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target className="w-4 h-4" />} label={t('Goals')} />
        <FinanceTabButton active={activeTab === 'scenario'} onClick={() => setActiveTab('scenario')} icon={<Activity className="w-4 h-4" />} label={t('Financial Simulator')} />
      </div>

      {/* Tab Panels */}
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
            onOpenTxModal={() => setShowTxModal(true)}
            onOpenAccountModal={(acc) => {
              setEditingAccount(acc || null);
              setShowAccountModal(true);
            }}
          />
        )}

      {activeTab === 'analytics' && (
        <FinanceAnalyticsTab
          transactions={transactions}
          budgets={budgets}
          savingGoals={savingGoals}
          onOpenTxModal={() => setShowTxModal(true)}
        />
      )}

      {activeTab === 'accounts' && (
        <FinanceAccountsTab
          financeAccounts={financeAccounts}
          getAccountIcon={(type: string) => {
            if (type === 'Ngân hàng') return <div className="font-bold">🏦</div>;
            if (type === 'Ví điện tử') return <div className="font-bold">💳</div>;
            if (type === 'Tiết kiệm') return <div className="font-bold">🐷</div>;
            return <Wallet className="w-5 h-5" />;
          }}
          formatCurrency={formatCurrency}
          onEditAccount={(acc) => {
            setEditingAccount(acc || null);
            setShowAccountModal(true);
          }}
          onDeleteAccount={(id) => deleteFinanceAccount(id)}
          onAddAccount={() => {
            setEditingAccount(null);
            setShowAccountModal(true);
          }}
        />
      )}

      {activeTab === 'transactions' && (
        <FinanceTransactionsTab
          transactions={transactions}
          formatCurrency={formatCurrency}
          onDeleteTransaction={(id) => deleteTransaction(id)}
          onEditTransaction={(tx) => {
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
            setEditingBudget(budget || null);
            setShowBudgetModal(true);
          }}
          onDeleteBudget={(id) => deleteBudget(id)}
          onAddBudget={() => {
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
            setEditingSavingGoal(g || null);
            setShowSavingGoalModal(true);
          }}
          onDeleteSavingGoal={(id) => deleteSavingGoal(id)}
          onAddSavingGoal={() => {
            setEditingSavingGoal(null);
            setShowSavingGoalModal(true);
          }}
          onEditDebt={(d) => {
            setEditingDebt(d || null);
            setShowDebtModal(true);
          }}
          onDeleteDebt={(id) => deleteDebt(id)}
          onUpdateDebtStatus={(id, status) => updateDebt(id, { status })}
          onAddDebt={() => {
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
            if (!acc) {
              alert('Please create or select an account first.');
              return;
            }
            if (forecastAmount <= 0) {
              alert('Please enter an expense amount greater than 0.');
              return;
            }
            addTransaction({
              type: 'Chi tiêu',
              amount: forecastAmount,
              category: forecastCategory || 'Expense',
              accountId: acc.id,
              date: todayStr,
              note: forecastNote || 'Recorded from Expense Forecast',
              status: 'Completed'
            });
            alert('Transaction successfully recorded to your account!');
            setForecastAmount(0);
            setForecastNote('');
          }}
          onOpenAccountModal={() => {
            setEditingAccount(null);
            setShowAccountModal(true);
          }}
        />
      )}
      </div>

      {/* Global Modals */}
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
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onDelete={(id: string) => {
            if (id) deleteFinanceAccount(id);
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
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onDelete={(id: string) => {
            if (id) deleteBudget(id);
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
            setShowSavingGoalModal(false);
            setEditingSavingGoal(null);
          }}
          onDelete={(id: string) => {
            if (id) deleteSavingGoal(id);
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
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
          onDelete={(id: string) => {
            if (id) deleteDebt(id);
            setShowDebtModal(false);
            setEditingDebt(null);
          }}
        />
      )}
    </div>
  );
}
export default FinanceView;
