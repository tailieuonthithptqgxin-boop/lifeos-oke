import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, Plus, 
  CreditCard, Landmark, PiggyBank, Target, ArrowRightLeft,
  PieChart, Activity, AlertTriangle, Building, LayoutDashboard,
  Edit3, Trash2, X
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';


type Tab = 'overview' | 'accounts' | 'transactions' | 'budgets' | 'goals';

function AccountModal({ account, onClose, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>({
    name: account?.name || '',
    type: account?.type || 'Ngân hàng',
    balance: account?.balance !== undefined ? account.balance : 0,
    currency: account?.currency || 'VND',
    color: account?.color || '#3b82f6'
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {account ? 'Chỉnh sửa tài khoản' : 'Tài khoản mới'}
          </h3>
          <div className="flex items-center gap-1">
            {account && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa tài khoản này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên tài khoản</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e=>setFormData({...formData, name: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Vietcombank, Ví MoMo, Tiền mặt..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Loại</label>
            <select 
              value={formData.type} 
              onChange={e=>setFormData({...formData, type: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option>Ngân hàng</option>
              <option>Ví điện tử</option>
              <option>Tiền mặt</option>
              <option>Tiết kiệm</option>
              <option>Đầu tư</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {account ? 'Số dư khả dụng (VNĐ)' : 'Số dư ban đầu (VNĐ)'}
            </label>
            <input 
              type="number" 
              value={formData.balance} 
              onChange={e=>setFormData({...formData, balance: Number(e.target.value)})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Bạn có thể điều chỉnh số dư này về 0 hoặc số thực tế của bạn bất kỳ lúc nào.
            </p>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer">Lưu</button>
        </div>
      </div>
    </div>
  );
}

function BudgetModal({ budget, onClose, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>({
    category: budget?.category || '',
    limit: budget?.limit !== undefined ? budget.limit : 1000000,
    period: budget?.period || 'Hàng tháng'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {budget ? 'Chỉnh sửa ngân sách' : 'Ngân sách mới'}
          </h3>
          <div className="flex items-center gap-1">
            {budget && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa ngân sách này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Danh mục chi tiêu</label>
            <input 
              type="text" 
              value={formData.category} 
              onChange={e=>setFormData({...formData, category: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Ăn uống, Mua sắm, Di chuyển, Nhà cửa..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hạn mức ngân sách (VNĐ)
            </label>
            <input 
              type="number" 
              value={formData.limit} 
              onChange={e=>setFormData({...formData, limit: Math.max(0, Number(e.target.value))})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Chu kỳ</label>
            <select 
              value={formData.period} 
              onChange={e=>setFormData({...formData, period: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option>Hàng tháng</option>
              <option>Hàng tuần</option>
              <option>Hàng quý</option>
              <option>Hàng năm</option>
            </select>
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.category.trim()) return;
              onSave(formData);
            }} 
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function SavingGoalModal({ goal, onClose, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>({
    title: goal?.title || goal?.name || '',
    targetAmount: goal?.targetAmount !== undefined ? goal.targetAmount : 10000000,
    currentAmount: goal?.currentAmount !== undefined ? goal.currentAmount : 0,
    deadline: goal?.deadline || ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {goal ? 'Chỉnh sửa mục tiêu tiết kiệm' : 'Mục tiêu tiết kiệm mới'}
          </h3>
          <div className="flex items-center gap-1">
            {goal && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(goal.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa mục tiêu này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên mục tiêu</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Quỹ khẩn cấp, Mua xe mới, Du lịch..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mục tiêu (VNĐ)</label>
              <input 
                type="number" 
                value={formData.targetAmount} 
                onChange={e=>setFormData({...formData, targetAmount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Đã tích lũy (VNĐ)</label>
              <input 
                type="number" 
                value={formData.currentAmount} 
                onChange={e=>setFormData({...formData, currentAmount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn chót (Deadline)</label>
            <input 
              type="date" 
              value={formData.deadline} 
              onChange={e=>setFormData({...formData, deadline: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.title.trim()) return;
              onSave(formData);
            }} 
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function DebtModal({ debt, onClose, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>({
    title: debt?.title || debt?.name || '',
    person: debt?.person || debt?.counterpart || '',
    amount: debt?.amount !== undefined ? debt.amount : 0,
    type: debt?.type || 'Cho vay',
    dueDate: debt?.dueDate || '',
    status: debt?.status || 'Chưa trả'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {debt ? 'Chỉnh sửa khoản nợ/cho vay' : 'Khoản nợ/cho vay mới'}
          </h3>
          <div className="flex items-center gap-1">
            {debt && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(debt.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Xóa khoản này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Loại khoản</label>
              <select 
                value={formData.type} 
                onChange={e=>setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Cho vay">Cho vay (Người khác nợ tôi)</option>
                <option value="Đi vay">Đi vay (Tôi nợ người khác)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
              <select 
                value={formData.status} 
                onChange={e=>setFormData({...formData, status: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Chưa trả">Chưa trả</option>
                <option value="Đã trả">Đã hoàn thành</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả / Tiêu đề</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="VD: Mượn tiền đóng học phí, Tiền ăn tối..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Người liên quan</label>
              <input 
                type="text" 
                value={formData.person} 
                onChange={e=>setFormData({...formData, person: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
                placeholder="VD: Nguyễn Văn A..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Số tiền (VNĐ)</label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e=>setFormData({...formData, amount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn thanh toán</label>
            <input 
              type="date" 
              value={formData.dueDate} 
              onChange={e=>setFormData({...formData, dueDate: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">Hủy</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.title.trim()) return;
              onSave(formData);
            }} 
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Real Cashflow Forecast States
  const [selectedAccId, setSelectedAccId] = useState<string>('');
  const [forecastAmount, setForecastAmount] = useState<number>(2000000);
  const [forecastCategory, setForecastCategory] = useState<string>('Mua sắm');
  const [forecastNote, setForecastNote] = useState<string>('Chi tiêu theo kế hoạch');

  // Computed Values
  const totalBalance = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTx.filter(t => t.type === 'Thu nhập').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'Chi tiêu').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = monthlyIncome - monthlyExpense;

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'Chi tiêu');
    const categoryMap: any = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  }, [transactions]);
  
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  const incomeExpenseData = useMemo(() => {
    return [
      { name: 'Thu nhập', amount: monthlyIncome },
      { name: 'Chi tiêu', amount: monthlyExpense },
    ];
  }, [monthlyIncome, monthlyExpense]);


  const getAccountIcon = (type: string) => {
    if (type === 'Ngân hàng') return <Landmark className="w-5 h-5" />;
    if (type === 'Ví điện tử') return <CreditCard className="w-5 h-5" />;
    if (type === 'Tiết kiệm') return <PiggyBank className="w-5 h-5" />;
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto h-full flex flex-col space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tài chính</h2>
          <p className="text-slate-500 mt-1">Quản lý dòng tiền, ngân sách và mục tiêu.</p>
        </div>
        <button type="button" 
          onClick={() => setShowTxModal(true)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm Giao dịch
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 sm:gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard className="w-4 h-4" />} label="Tổng quan" />
        <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Wallet className="w-4 h-4" />} label="Tài khoản" />
        <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft className="w-4 h-4" />} label="Giao dịch" />
        <TabButton active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={<PieChart className="w-4 h-4" />} label="Ngân sách" />
        <TabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target className="w-4 h-4" />} label="Mục tiêu" />
        <TabButton active={activeTab === 'scenario' as Tab} onClick={() => setActiveTab('scenario' as Tab)} icon={<Activity className="w-4 h-4" />} label="Dự báo chi tiêu" />
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              title="Tổng tài sản" 
              value={formatCurrency(totalBalance)} 
              icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
              bg="bg-blue-50"
            />
            <StatCard 
              title="Thu nhập tháng" 
              value={formatCurrency(monthlyIncome)} 
              icon={<TrendingUp className="w-5 h-5 text-green-600" />} 
              bg="bg-green-50"
            />
            <StatCard 
              title="Chi tiêu tháng" 
              value={formatCurrency(monthlyExpense)} 
              icon={<TrendingDown className="w-5 h-5 text-red-600" />} 
              bg="bg-red-50"
            />
            <StatCard 
              title="Thu nhập ròng" 
              value={formatCurrency(netIncome)} 
              icon={<Activity className="w-5 h-5 text-purple-600" />} 
              bg="bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Charts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 h-[350px]">
                <h3 className="font-bold text-slate-900 mb-4">Thu nhập vs Chi tiêu (Tháng này)</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={incomeExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => (value / 1000000) + 'tr'} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {incomeExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Thu nhập' ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 h-[350px]">
                <h3 className="font-bold text-slate-900 mb-4">Cơ cấu Chi tiêu</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <RePieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">Chưa có giao dịch chi tiêu</div>
                )}
              </div>
            </div>

            {/* Accounts Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Tài khoản & Ví</h3>
                <button
                  type="button"
                  onClick={() => { setEditingAccount(null); setShowAccountModal(true); }}
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
                        onClick={() => { setEditingAccount(acc); setShowAccountModal(true); }}
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
              <h3 className="font-bold text-slate-900 mb-4">Ngân sách tháng này</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgets.map((budget: any) => {
                  const spent = monthlyTx.filter(t => t.type === 'Chi tiêu' && t.category === budget.category).reduce((sum, t) => sum + t.amount, 0);
                  const progress = Math.min((spent / budget.limit) * 100, 100);
                  const isOver = spent > budget.limit;
                  const isNear = progress >= 80 && !isOver;
                  
                  return (
                    <div key={budget.id} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{budget.category}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">Đã tiêu {formatCurrency(spent)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 text-sm">{formatCurrency(budget.limit)}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">Còn lại {formatCurrency(Math.max(0, budget.limit - spent))}</div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
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
      )}

      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeAccounts.map((acc: any) => (
            <div key={acc.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6' }}>
                  {getAccountIcon(acc.type)}
                </div>
                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setEditingAccount(acc); setShowAccountModal(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Chỉnh sửa tài khoản"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm?.(`Bạn có chắc muốn xóa tài khoản "${acc.name}" không?`)) {
                        deleteFinanceAccount(acc.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Xóa tài khoản"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-500">{acc.type}</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{acc.name}</h3>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Số dư hiện tại</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(acc.balance)}</div>
                </div>
              </div>
            </div>
          ))}
          <div 
            onClick={() => { setEditingAccount(null); setShowAccountModal(true); }} 
            className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[170px]"
          >
            <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm text-slate-600 dark:text-slate-300 mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-900 dark:text-white">Thêm tài khoản</div>
            <div className="text-sm text-slate-500 mt-1">Ngân hàng, ví, tiết kiệm...</div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Lịch sử giao dịch</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.length === 0 && (
              <div className="p-8 text-center text-slate-500">Chưa có giao dịch nào.</div>
            )}
            {transactions.map((tx: any) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${tx.type === 'Thu nhập' ? 'bg-green-100 text-green-600' : 
                      tx.type === 'Chi tiêu' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}
                  >
                    {tx.type === 'Thu nhập' ? <TrendingUp className="w-5 h-5" /> : 
                     tx.type === 'Chi tiêu' ? <TrendingDown className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{tx.category}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{tx.note} • {new Date(tx.date).toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`font-black ${tx.type === 'Thu nhập' ? 'text-green-600' : tx.type === 'Chi tiêu' ? 'text-slate-900' : 'text-blue-600'}`}>
                    {tx.type === 'Thu nhập' ? '+' : tx.type === 'Chi tiêu' ? '-' : ''}{formatCurrency(tx.amount)}
                  </div>
                  <button onClick={() => deleteTransaction(tx.id)} className="text-red-500 text-xs font-bold hover:underline">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
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
              onClick={() => {
                setEditingBudget(null);
                setShowBudgetModal(true);
              }}
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
                onClick={() => {
                  setEditingBudget(null);
                  setShowBudgetModal(true);
                }}
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
                          onClick={() => {
                            setEditingBudget(budget);
                            setShowBudgetModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Sửa ngân sách"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm?.(`Bạn có chắc muốn xóa ngân sách "${budget.category}"?`)) {
                              deleteBudget(budget.id);
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
      )}

      {activeTab === 'goals' && (
        <div className="space-y-8">
          {/* Section 1: Saving Goals */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                  <PiggyBank className="w-5 h-5 text-emerald-600" /> Mục tiêu Tiết kiệm ({savingGoals.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Đặt mục tiêu tài chính cụ thể và theo dõi tiến độ tích lũy.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSavingGoal(null);
                  setShowSavingGoalModal(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Thêm Mục tiêu
              </button>
            </div>

            {savingGoals.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Chưa có mục tiêu tiết kiệm nào. Hãy tạo mục tiêu mới để bắt đầu theo dõi.
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
                            <p className="text-[11px] text-slate-400 mt-0.5">Hạn chót: {new Date(goal.deadline).toLocaleDateString('vi-VN')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSavingGoal(goal);
                              setShowSavingGoalModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm?.(`Xóa mục tiêu "${goal.title || goal.name}"?`)) {
                                deleteSavingGoal(goal.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Xóa"
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
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> Sổ Nợ & Cho vay ({debts.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Theo dõi các khoản tiền đã cho mượn hoặc cần hoàn trả.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDebt(null);
                  setShowDebtModal(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Thêm Khoản nợ / Cho vay
              </button>
            </div>

            {debts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Chưa có khoản nợ hoặc cho vay nào được ghi nhận.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debts.map((debt: any) => {
                  const isLending = debt.type === 'Cho vay';
                  const isPaid = debt.status === 'Đã trả';

                  return (
                    <div key={debt.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isLending
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {debt.type || 'Cho vay'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isPaid ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {debt.status || 'Chưa trả'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5 truncate">{debt.title || debt.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {debt.person || debt.counterpart || 'N/A'} {debt.dueDate ? `• Hạn: ${new Date(debt.dueDate).toLocaleDateString('vi-VN')}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-black text-sm ${isLending ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isLending ? '+' : '-'}{formatCurrency(debt.amount)}
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateDebt(debt.id, { status: isPaid ? 'Chưa trả' : 'Đã trả' });
                            }}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {isPaid ? 'Đánh dấu chưa trả' : 'Đã thu/trả ✓'}
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDebt(debt);
                              setShowDebtModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm?.(`Xóa khoản "${debt.title || debt.name}"?`)) {
                                deleteDebt(debt.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Xóa"
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
      )}

      
      {activeTab === 'scenario' as Tab && (() => {
        const currentAccount = (financeAccounts || []).find((a: any) => a.id === selectedAccId) || financeAccounts[0];
        const accountBalance = currentAccount ? (currentAccount.balance || 0) : 0;
        const newBalance = accountBalance - forecastAmount;
        const targetBudget = (budgets || []).find((b: any) => b.category === forecastCategory);
        const spentInBudget = monthlyTx
          .filter(t => t.type === 'Chi tiêu' && t.category === forecastCategory)
          .reduce((sum, t) => sum + t.amount, 0);
        const projectedBudgetSpent = spentInBudget + forecastAmount;
        const isBudgetExceeded = targetBudget && projectedBudgetSpent > targetBudget.limit;

        const handleExecuteRealTransaction = () => {
          const targetAcc = currentAccount || (financeAccounts && financeAccounts[0]);
          if (!targetAcc) {
            setShowAccountModal(true);
            return;
          }
          addTransaction({
            accountId: targetAcc.id,
            amount: Number(forecastAmount),
            type: 'Chi tiêu',
            category: forecastCategory,
            description: forecastNote || 'Chi tiêu thực tế',
            date: new Date().toISOString()
          });
          setActiveTab('transactions');
        };

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Dự báo Dòng tiền & Tác động Chi tiêu Thực tế</h3>
              <p className="text-slate-500 max-w-lg mb-6 text-sm">
                Tính toán chính xác số dư thực tế sau khi chi tiêu, kiểm tra hạn mức ngân sách tháng và ghi nhận trực tiếp vào tài khoản của bạn.
              </p>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 w-full max-w-xl text-left space-y-4">
                {financeAccounts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-600 mb-3">Bạn chưa có tài khoản nào để dự báo dòng tiền.</p>
                    <button 
                      onClick={() => setShowAccountModal(true)} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      + Thêm tài khoản thực tế
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Chọn tài khoản chi trả:</label>
                        <select
                          value={currentAccount?.id || ''}
                          onChange={e => setSelectedAccId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                        >
                          {financeAccounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.balance)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục ngân sách:</label>
                        <input 
                          type="text" 
                          value={forecastCategory} 
                          onChange={e => setForecastCategory(e.target.value)} 
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền chi dự kiến (VNĐ):</label>
                        <input 
                          type="number" 
                          value={forecastAmount} 
                          onChange={e => setForecastAmount(Math.max(0, Number(e.target.value)))} 
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-black text-lg text-red-600" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mục đích:</label>
                        <input 
                          type="text" 
                          value={forecastNote} 
                          onChange={e => setForecastNote(e.target.value)} 
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" 
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm">Tính toán thực tế:</h4>
                      
                      <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-600">Số dư hiện tại của tài khoản:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(accountBalance)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-600">Số dư sau khi thực hiện:</span>
                        <span className={`font-black ${newBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatCurrency(newBalance)} {newBalance < 0 && '(Thấu chi / Âm)'}
                        </span>
                      </div>

                      {targetBudget && (
                        <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-600">Ngân sách {forecastCategory} ({formatCurrency(targetBudget.limit)}):</span>
                          <span className={`font-bold ${isBudgetExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {Math.round((projectedBudgetSpent / targetBudget.limit) * 100)}% hạn mức {isBudgetExceeded ? '(Vượt hạn mức)' : '(An toàn)'}
                          </span>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleExecuteRealTransaction}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Ghi nhận giao dịch thực tế vào tài khoản ngay
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
          onSave={(tx) => {
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

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button type="button" 
      onClick={onClick}
      className={`pb-3 px-1 flex items-center gap-2 font-bold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap shrink-0
        ${active ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
        <h4 className="text-sm font-bold text-slate-600">{title}</h4>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function TransactionModal({ onClose, onSave, accounts }: any) {
  const { projects = [] } = useAppStore();
  const [formData, setFormData] = useState<any>({
    type: 'Chi tiêu',
    amount: '',
    category: '',
    accountId: accounts[0]?.id || '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Giao dịch mới</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Chi tiêu', 'Thu nhập', 'Chuyển tiền'].map(type => (
              <button type="button"
                key={type}
                onClick={() => setFormData({...formData, type})}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.type === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Số tiền</label>
            <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-lg font-black" placeholder="0" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Danh mục</label>
            <input type="text" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="VD: Ăn uống, Lương..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{formData.type === 'Chuyển tiền' ? 'Từ tài khoản' : 'Tài khoản'}</label>
            <select value={formData.accountId} onChange={e=>setFormData({...formData, accountId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>

          {formData.type === 'Chuyển tiền' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Đến tài khoản</label>
              <select value={formData.toAccountId} onChange={e=>setFormData({...formData, toAccountId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <option value="">-- Chọn tài khoản --</option>
                {accounts.filter((a:any) => a.id !== formData.accountId).map((a:any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Ngày</label>
              <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>

          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Liên kết Dự án (Tùy chọn)</label>
            <select value={formData.projectId || ''} onChange={e=>setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="">-- Không --</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Chi phí sẽ được tính thẳng vào Project Budget.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
            <input type="text" value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
          <button type="button" onClick={() => onSave({...formData, amount: Number(formData.amount), status: 'Completed'})} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Lưu</button>
        </div>
      </div>
    </div>
  );
}
