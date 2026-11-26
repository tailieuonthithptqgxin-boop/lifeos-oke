import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Target, Plus, CheckCircle2, AlertTriangle, TrendingUp, Calendar, ArrowRight, Activity, 
  Crosshair, Clock, Zap, ListFilter, Layers, ShieldAlert, FileText, Sparkles, FolderGit2, 
  CheckSquare, History, BarChart3, Sliders, Edit2, Trash2, X, ChevronRight, Link2, Flag, 
  Flame, BookOpen, DollarSign, Award, SlidersHorizontal, Grid, GitBranch, Play, Search,
  Eye, Check, ArrowUpRight, AlertCircle, RefreshCw, Loader2, RotateCcw
} from 'lucide-react';
import { Goal, GoalMilestone, GoalReview, GoalPriority, GoalType, GoalTier, GoalRiskStatus } from '../lib/types';
import { formatCurrency, formatLocalDateKey } from '../lib/utils';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export function GoalsView() {
  const { 
    goals, projects, tasks, habits, addGoal, updateGoal, deleteGoal, language 
  } = useAppStore();

  const isVi = language === 'vi';

  // F5 Reload Persistence for active tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'my_goals' | 'execution' | 'timeline' | 'action_plan' | 
    'pace_kpis' | 'scenarios' | 'risks' | 'reviews' | 'analytics' | 'templates' | 'archive'
  >(() => {
    try {
      const saved = localStorage.getItem('lifeos_goals_active_tab');
      if (saved) return saved as any;
    } catch (e) {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_goals_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // F5 Reload Persistence for view mode
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('lifeos_goals_view_mode');
      if (saved === 'grid' || saved === 'tree' || saved === 'list') return saved;
    } catch (e) {}
    return 'grid';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_goals_view_mode', viewMode);
    } catch (e) {}
  }, [viewMode]);

  // F5 Persistence for filters
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_goals_category_filter') || 'All';
    } catch (e) {
      return 'All';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_goals_category_filter', categoryFilter);
    } catch (e) {}
  }, [categoryFilter]);

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_goals_status_filter') || 'All';
    } catch (e) {
      return 'All';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_goals_status_filter', statusFilter);
    } catch (e) {}
  }, [statusFilter]);

  const [tierFilter, setTierFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_goals_tier_filter') || 'All';
    } catch (e) {
      return 'All';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_goals_tier_filter', tierFilter);
    } catch (e) {}
  }, [tierFilter]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Detail drawer with F5 ID persistence
  const [selectedGoalDetailId, setSelectedGoalDetailId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lifeos_goals_selected_detail_id') || null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selectedGoalDetailId) {
        localStorage.setItem('lifeos_goals_selected_detail_id', selectedGoalDetailId);
      } else {
        localStorage.removeItem('lifeos_goals_selected_detail_id');
      }
    } catch (e) {}
  }, [selectedGoalDetailId]);

  const selectedGoalDetail = goals.find(g => g.id === selectedGoalDetailId) || null;

  // Real data-flow action handlers for Milestones, Actions & Reviews (backed by updateGoal)
  const handleAddGoalMilestone = async (goalId: string, milestone: Partial<GoalMilestone>) => {
    const target = goals.find(g => g.id === goalId);
    if (!target) return;
    const newMs: GoalMilestone = {
      id: 'ms_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: milestone.title || 'Cột mốc mới',
      targetDate: milestone.targetDate || milestone.deadline || formatLocalDateKey(new Date(Date.now() + 30 * 86400000)),
      deadline: milestone.deadline || milestone.targetDate || formatLocalDateKey(new Date(Date.now() + 30 * 86400000)),
      completed: false,
      progress: 0,
      weight: milestone.weight || 25,
      status: 'Pending'
    };
    const updatedMilestones = [...(target.milestones || []), newMs];
    soundEngine.playPop();
    await updateGoal(goalId, { milestones: updatedMilestones });
  };

  const handleToggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    const target = goals.find(g => g.id === goalId);
    if (!target || !target.milestones) return;
    const updatedMilestones = target.milestones.map(m => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          progress: nextCompleted ? 100 : 0,
          status: nextCompleted ? 'Completed' : 'In Progress'
        };
      }
      return m;
    });

    // Auto-calculate goal progress if milestones exist
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const autoProgress = updatedMilestones.length > 0 
      ? Math.round((completedCount / updatedMilestones.length) * 100) 
      : target.progress;

    soundEngine.playSuccess();
    if (autoProgress === 100) triggerConfetti();

    await updateGoal(goalId, { 
      milestones: updatedMilestones,
      progress: autoProgress,
      status: autoProgress === 100 ? 'Completed' : target.status
    });
  };

  const handleDeleteGoalMilestone = async (goalId: string, milestoneId: string) => {
    const target = goals.find(g => g.id === goalId);
    if (!target || !target.milestones) return;
    const updatedMilestones = target.milestones.filter(m => m.id !== milestoneId);
    soundEngine.playPop();
    await updateGoal(goalId, { milestones: updatedMilestones });
  };

  const handleToggleGoalAction = async (goalId: string, actionId: string) => {
    const target = goals.find(g => g.id === goalId);
    if (!target || !target.actions) return;
    const updatedActions = target.actions.map(a => 
      a.id === actionId ? { ...a, completed: !a.completed } : a
    );
    soundEngine.playSuccess();
    await updateGoal(goalId, { actions: updatedActions });
  };

  const handleAddGoalAction = async (goalId: string, title: string, type: string = 'task') => {
    const target = goals.find(g => g.id === goalId);
    if (!target) return;
    const newAction = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title,
      type,
      completed: false
    };
    const updatedActions = [...(target.actions || []), newAction];
    soundEngine.playPop();
    await updateGoal(goalId, { actions: updatedActions });
  };

  const handleDeleteGoalAction = async (goalId: string, actionId: string) => {
    const target = goals.find(g => g.id === goalId);
    if (!target || !target.actions) return;
    const updatedActions = target.actions.filter(a => a.id !== actionId);
    soundEngine.playPop();
    await updateGoal(goalId, { actions: updatedActions });
  };

  const handleAddGoalReview = async (goalId: string, review: Partial<GoalReview>) => {
    const target = goals.find(g => g.id === goalId);
    if (!target) return;
    const newReview: GoalReview = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      date: review.date || formatLocalDateKey(new Date()),
      period: review.period || 'weekly',
      whatWasDone: review.whatWasDone || '',
      lessonsLearned: review.lessonsLearned || '',
      status: review.status || 'On Track',
      score: review.score || 85
    };
    const updatedReviews = [newReview, ...(target.reviews || [])];
    soundEngine.playSuccess();
    triggerConfetti();
    await updateGoal(goalId, { reviews: updatedReviews });
  };

  // Undo Toast state
  const [undoGoal, setUndoGoal] = useState<Goal | null>(null);
  const undoGoalTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (undoGoalTimerRef.current) clearTimeout(undoGoalTimerRef.current);
    };
  }, []);

  const handleDeleteGoalWithUndo = (g: Goal | string) => {
    soundEngine.playPop();
    const targetGoal = typeof g === 'string' ? goals.find(item => item.id === g) : g;
    if (!targetGoal) return;
    if (undoGoalTimerRef.current) clearTimeout(undoGoalTimerRef.current);
    setUndoGoal(targetGoal);
    if (selectedGoalDetailId === targetGoal.id) {
      setSelectedGoalDetailId(null);
    }
    deleteGoal(targetGoal.id);
    undoGoalTimerRef.current = setTimeout(() => {
      setUndoGoal(null);
    }, 5000);
  };

  const handleRestoreGoal = () => {
    if (undoGoal) {
      soundEngine.playSuccess();
      if (undoGoalTimerRef.current) clearTimeout(undoGoalTimerRef.current);
      addGoal(undoGoal);
      setUndoGoal(null);
    }
  };

  // Quick Goal Omnibar state
  const [quickGoalText, setQuickGoalText] = useState('');

  const handleQuickGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickGoalText.trim();
    if (!text) return;

    soundEngine.playSuccess();
    triggerConfetti();

    // Natural Language Parser
    let target = 100;
    let unit = '%';
    let category = 'Phát triển bản thân';
    const lower = text.toLowerCase();

    // Check financial amounts (e.g. 50 triệu, 50tr, 100k)
    const vndMatch = text.match(/(\d+[\.,]?\d*)\s*(triệu|tr|trieu|m|k|nghìn|ngàn)/i);
    if (vndMatch) {
      const num = parseFloat(vndMatch[1].replace(',', '.'));
      const multiplierStr = vndMatch[2].toLowerCase();
      let mult = 1000000;
      if (multiplierStr === 'k' || multiplierStr.includes('nghìn') || multiplierStr.includes('ngàn')) {
        mult = 1000;
      }
      target = Math.round(num * mult);
      unit = 'VNĐ';
      category = 'Tài chính';
    } else {
      // Check other numerical targets (e.g. 10 kg, 20 cuốn, 8.0 điểm)
      const numMatch = text.match(/(\d+[\.,]?\d*)\s*(kg|cuốn|quyển|bài|giờ|phút|điểm|km)/i);
      if (numMatch) {
        target = parseFloat(numMatch[1].replace(',', '.'));
        unit = numMatch[2];
      }
    }

    if (lower.includes('tiền') || lower.includes('tiết kiệm') || lower.includes('thu nhập') || lower.includes('đầu tư') || lower.includes('doanh thu')) {
      category = 'Tài chính';
    } else if (lower.includes('học') || lower.includes('ielts') || lower.includes('toeic') || lower.includes('sách') || lower.includes('từ vựng') || lower.includes('khóa')) {
      category = 'Học tập';
    } else if (lower.includes('gym') || lower.includes('chạy') || lower.includes('cân') || lower.includes('sức khỏe') || lower.includes('bơi')) {
      category = 'Sức khoẻ';
    } else if (lower.includes('việc') || lower.includes('thăng tiến') || lower.includes('công việc') || lower.includes('dự án') || lower.includes('startup')) {
      category = 'Sự nghiệp';
    }

    const newGoal: Goal = {
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: text,
      description: `Mục tiêu tạo nhanh: ${text}`,
      category: category,
      tier: 'quarterly',
      priority: 'High',
      status: 'In Progress',
      riskStatus: 'on_track',
      progress: 0,
      current: 0,
      target: target,
      unit: unit,
      deadline: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)),
      color: '#10B981',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      streak: 0,
      score: 80,
      milestones: [
        {
          id: 'ms_1_' + Date.now(),
          title: 'Khởi động & chuẩn bị nguồn lực',
          targetDate: formatLocalDateKey(new Date(Date.now() + 14 * 86400000)),
          completed: false,
          progress: 0,
          weight: 30
        },
        {
          id: 'ms_2_' + Date.now(),
          title: 'Tăng tốc & đạt 50% chỉ tiêu',
          targetDate: formatLocalDateKey(new Date(Date.now() + 45 * 86400000)),
          completed: false,
          progress: 0,
          weight: 40
        },
        {
          id: 'ms_3_' + Date.now(),
          title: 'Về đích & nghiệm thu kết quả',
          targetDate: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)),
          completed: false,
          progress: 0,
          weight: 30
        }
      ],
      actions: [
        { id: 'act_1_' + Date.now(), title: 'Lên checklist các đầu việc trọng tâm', type: 'task', completed: false },
        { id: 'act_2_' + Date.now(), title: 'Dành 30 phút mỗi ngày thực thi', type: 'habit', completed: false }
      ],
      reviews: []
    };

    addGoal(newGoal);
    setQuickGoalText('');
    setActiveTab('my_goals');
  };

  // Helper stats
  const activeGoals = goals.filter(g => g.status === 'In Progress' || g.status === 'Đang làm' || g.status === 'Đang thực hiện');
  const completedGoals = goals.filter(g => g.status === 'Completed' || g.status === 'Hoàn thành' || g.status === 'Đã hoàn thành');
  const onTrackGoals = goals.filter(g => g.riskStatus === 'on_track' || !g.riskStatus);
  const atRiskGoals = goals.filter(g => g.riskStatus === 'at_risk');
  const criticalGoals = goals.filter(g => g.riskStatus === 'critical');

  const overallProgress = goals.length 
    ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length) 
    : 0;

  const avgGoalScore = goals.length
    ? Math.round(goals.reduce((acc, g) => acc + (g.score || g.progress || 0), 0) / goals.length)
    : 0;

  const totalStreak = goals.reduce((acc, g) => acc + (g.streak || 0), 0);

  // Filtered goals
  const filteredGoals = goals.filter(g => {
    if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
    if (statusFilter !== 'All') {
      if (statusFilter === 'In Progress' && g.status !== 'In Progress' && g.status !== 'Đang làm' && g.status !== 'Đang thực hiện') return false;
      else if (statusFilter === 'Completed' && g.status !== 'Completed' && g.status !== 'Hoàn thành' && g.status !== 'Đã hoàn thành') return false;
      else if (statusFilter === 'Paused' && g.status !== 'Paused' && g.status !== 'Tạm dừng') return false;
      else if (statusFilter !== 'In Progress' && statusFilter !== 'Completed' && statusFilter !== 'Paused' && g.status !== statusFilter) return false;
    }
    if (tierFilter !== 'All' && g.tier !== tierFilter) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const openNewGoal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const openEditGoal = (g: Goal) => {
    setEditingGoal(g);
    setShowGoalModal(true);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 max-w-7xl mx-auto w-full min-w-0 max-w-full flex flex-col space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs w-full min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                {isVi ? 'Hệ thống Quản trị Mục tiêu & OKRs' : 'Goals & OKRs Management'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-normal truncate">
                {isVi 
                  ? 'Quản trị mục tiêu chiến lược, đo lường tiến độ và thực thi hành động hằng ngày.'
                  : 'Manage strategic goals, measure progress, and execute daily actions.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button type="button"
            onClick={openNewGoal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> {isVi ? '+ Tạo Mục tiêu mới' : '+ Create New Goal'}
          </button>
        </div>
      </div>

      {/* NATURAL LANGUAGE IN-LINE OMNIBAR: 1-SECOND QUICK GOAL CREATION */}
      <form 
        onSubmit={handleQuickGoalSubmit}
        className="p-3 bg-linear-to-r from-emerald-50/70 via-teal-50/40 to-sky-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-sky-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 pointer-events-none">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            type="text"
            placeholder="🎯 Nhập nhanh mục tiêu mới (VD: Tiết kiệm 50 triệu trước cuối năm hoặc Đạt IELTS 7.5)... [Enter]"
            value={quickGoalText}
            onChange={e => setQuickGoalText(e.target.value)}
            className="w-full h-11 pl-10 pr-9 text-base sm:text-sm bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
          />
          {quickGoalText && (
            <button
              type="button"
              onClick={() => setQuickGoalText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Xóa nội dung"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!quickGoalText.trim()}
          className="h-11 min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tạo Mục Tiêu Ngay</span>
        </button>
      </form>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar touch-pan-x overscroll-x-contain border-b border-slate-200 dark:border-slate-800 shrink-0 w-full max-w-full py-1">
        <TabButton id="dashboard" active={activeTab} onClick={setActiveTab} icon={<Activity className="w-4 h-4" />} label={isVi ? 'Tổng quan' : 'Overview'} />
        <TabButton id="my_goals" active={activeTab} onClick={setActiveTab} icon={<Target className="w-4 h-4" />} label={isVi ? 'Mục tiêu của tôi' : 'My Goals'} badge={goals.length} />
        <TabButton id="execution" active={activeTab} onClick={setActiveTab} icon={<Zap className="w-4 h-4" />} label={isVi ? 'Thực thi hôm nay' : 'Today Execution'} />
        <TabButton id="timeline" active={activeTab} onClick={setActiveTab} icon={<Calendar className="w-4 h-4" />} label={isVi ? 'Lịch trình & Milestone' : 'Timeline & Milestones'} />
        <TabButton id="action_plan" active={activeTab} onClick={setActiveTab} icon={<FolderGit2 className="w-4 h-4" />} label={isVi ? 'Kế hoạch hành động' : 'Action Plan'} />
        <TabButton id="pace_kpis" active={activeTab} onClick={setActiveTab} icon={<Clock className="w-4 h-4" />} label={isVi ? 'Tốc độ & KPIs' : 'Pace & KPIs'} />
        <TabButton id="scenarios" active={activeTab} onClick={setActiveTab} icon={<SlidersHorizontal className="w-4 h-4" />} label={isVi ? 'Dự báo Tiến độ' : 'Progress Forecast'} />
        <TabButton id="risks" active={activeTab} onClick={setActiveTab} icon={<ShieldAlert className="w-4 h-4" />} label={isVi ? 'Rủi ro & Xung đột' : 'Risks & Conflicts'} badge={atRiskGoals.length + criticalGoals.length} />
        <TabButton id="reviews" active={activeTab} onClick={setActiveTab} icon={<FileText className="w-4 h-4" />} label={isVi ? 'Đánh giá & Nhật ký' : 'Reviews & Logs'} />
        <TabButton id="analytics" active={activeTab} onClick={setActiveTab} icon={<BarChart3 className="w-4 h-4" />} label="Goal Score" />
        <TabButton id="templates" active={activeTab} onClick={setActiveTab} icon={<Sparkles className="w-4 h-4" />} label={isVi ? 'Thư viện Mẫu' : 'Templates Library'} />
        <TabButton id="archive" active={activeTab} onClick={setActiveTab} icon={<History className="w-4 h-4" />} label={isVi ? 'Lưu trữ' : 'Archive'} />
      </div>

      {/* Content Area according to activeTab */}
      <div key={activeTab} className="animate-page-enter">
        {activeTab === 'dashboard' && (
          <DashboardView 
            goals={goals} 
            activeGoals={activeGoals} 
            completedGoals={completedGoals}
            onTrackGoals={onTrackGoals}
            atRiskGoals={atRiskGoals}
            criticalGoals={criticalGoals}
            overallProgress={overallProgress}
            avgGoalScore={avgGoalScore}
            totalStreak={totalStreak}
            onOpenGoalDetail={(g: Goal) => setSelectedGoalDetailId(g.id)}
            onOpenNewGoal={openNewGoal}
            setActiveTab={setActiveTab}
            setStatusFilter={setStatusFilter}
          />
        )}

        {activeTab === 'my_goals' && (
          <MyGoalsView 
            filteredGoals={filteredGoals}
            viewMode={viewMode}
            setViewMode={setViewMode}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)}
            onOpenEdit={openEditGoal}
            onOpenNew={openNewGoal}
            onDelete={handleDeleteGoalWithUndo}
            projects={projects}
            tasks={tasks}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionView 
            goals={goals} 
            tasks={tasks} 
            habits={habits} 
            toggleGoalAction={handleToggleGoalAction}
            addGoalAction={handleAddGoalAction}
            deleteGoalAction={handleDeleteGoalAction}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView 
            goals={goals} 
            onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)} 
            addGoalMilestone={handleAddGoalMilestone}
            toggleMilestone={handleToggleGoalMilestone}
          />
        )}

        {activeTab === 'action_plan' && (
          <ActionPlanView 
            goals={goals} 
            projects={projects} 
            tasks={tasks} 
            habits={habits} 
            onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)} 
          />
        )}

        {activeTab === 'pace_kpis' && (
          <PaceKPIsView goals={goals} onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)} />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosView goals={goals} updateGoal={updateGoal} />
        )}

        {activeTab === 'risks' && (
          <RisksConflictsView goals={goals} onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)} />
        )}

        {activeTab === 'reviews' && (
          <ReviewsView goals={goals} addGoalReview={handleAddGoalReview} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView goals={goals} avgGoalScore={avgGoalScore} />
        )}

        {activeTab === 'templates' && (
          <TemplatesView addGoal={addGoal} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'archive' && (
          <ArchiveView goals={goals} onOpenDetail={(g: Goal) => setSelectedGoalDetailId(g.id)} />
        )}
      </div>

      {/* Goal Form Modal */}
      {showGoalModal && (
        <GoalModal 
          goal={editingGoal} 
          onClose={() => setShowGoalModal(false)}
          onSave={async (g: any) => {
            const targetId = editingGoal?.id || g?.id;
            if (editingGoal && targetId) await updateGoal(targetId, g);
            else await addGoal(g);
            setShowGoalModal(false);
          }}
          onDelete={(g: Goal) => {
            handleDeleteGoalWithUndo(g);
            setShowGoalModal(false);
          }}
          goals={goals}
          projects={projects}
          habits={habits}
        />
      )}

      {/* Supercharged Goal Detail Drawer */}
      {selectedGoalDetail && (
        <GoalDetailDrawer 
          goal={selectedGoalDetail} 
          onClose={() => setSelectedGoalDetailId(null)}
          onEdit={() => {
            const g = selectedGoalDetail;
            setSelectedGoalDetailId(null);
            openEditGoal(g);
          }}
          onDelete={() => {
            const g = selectedGoalDetail;
            handleDeleteGoalWithUndo(g);
          }}
          updateGoal={updateGoal}
          addGoalMilestone={handleAddGoalMilestone}
          toggleGoalMilestone={handleToggleGoalMilestone}
          deleteGoalMilestone={handleDeleteGoalMilestone}
          toggleGoalAction={handleToggleGoalAction}
          addGoalAction={handleAddGoalAction}
          deleteGoalAction={handleDeleteGoalAction}
          addGoalReview={handleAddGoalReview}
          projects={projects}
          tasks={tasks}
          habits={habits}
        />
      )}

      {/* Floating 5-Second Undo Toast */}
      {undoGoal && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[90] flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl shadow-2xl animate-slide-up border border-slate-700 dark:border-slate-200 backdrop-blur-md max-w-sm sm:max-w-md">
          <span className="text-xs sm:text-sm font-semibold truncate flex-1">
            Đã xóa mục tiêu "{undoGoal.title}"
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRestoreGoal}
              className="px-3.5 py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác (5s)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoGoalTimerRef.current) clearTimeout(undoGoalTimerRef.current);
                setUndoGoal(null);
              }}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
              title="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab Helper Button
function TabButton({ id, active, onClick, icon, label, badge }: any) {
  const isSelected = active === id;
  return (
    <button type="button"
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
        isSelected 
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
          isSelected 
            ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' 
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------
// 1. DASHBOARD VIEW
// ----------------------------------------------------------------------
function DashboardView({ 
  goals, activeGoals, completedGoals, onTrackGoals, atRiskGoals, criticalGoals, 
  overallProgress, avgGoalScore, totalStreak, onOpenGoalDetail, onOpenNewGoal, setActiveTab, setStatusFilter 
}: any) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* 4 Interactive Bento KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full min-w-0">
        <div 
          onClick={() => {
            soundEngine.playPop();
            setStatusFilter('In Progress');
            setActiveTab('my_goals');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Hoạt động</span>
            <Target className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{activeGoals.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">{completedGoals.length} hoàn thành / {goals.length} tổng</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveTab('pace_kpis');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Tiến độ chung</span>
            <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{overallProgress}%</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
          </div>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveTab('analytics');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Goal Score</span>
            <Award className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{avgGoalScore}<span className="text-xs font-normal text-slate-400">/100</span></div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Streak: {totalStreak} ngày</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveTab('risks');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 cursor-pointer hover:border-rose-400 dark:hover:border-rose-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Rủi ro</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {atRiskGoals.length + criticalGoals.length}
            {criticalGoals.length > 0 && <span className="text-xs text-rose-600 font-normal ml-1">({criticalGoals.length} nguy cấp)</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">{onTrackGoals.length} mục tiêu đúng tiến độ</span>
        </div>
      </div>

      {/* Goal Status Breakdown Banner - Clean White SaaS Card */}
      <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 w-full min-w-0 max-w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Trạng thái Thực thi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi thời gian thực kết quả đạt được & kiểm soát rủi ro.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> {activeGoals.length} Đang thực hiện
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {onTrackGoals.length} On Track
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> {atRiskGoals.length} At Risk
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> {criticalGoals.length} Critical
          </span>
        </div>
      </div>

      {/* Main Grid: Goals List + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Active Goal Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              Mục tiêu trọng tâm
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({activeGoals.length})</span>
            </h3>
            <button type="button" 
              onClick={() => setActiveTab('my_goals')} 
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal: Goal) => (
              <GoalCard key={goal.id} goal={goal} onClick={() => onOpenGoalDetail(goal)} />
            ))}
          </div>
        </div>

        {/* Right Column: Attention Needed & Quick Execution */}
        <div className="space-y-4 sm:space-y-5">
          {/* Risk Alerts */}
          <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Cần chú ý ngay
            </h3>
            {atRiskGoals.length === 0 && criticalGoals.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                Tất cả mục tiêu đều đang On Track, không có cảnh báo rủi ro.
              </p>
            ) : (
              <div className="space-y-2.5">
                {[...criticalGoals, ...atRiskGoals].map((g: Goal) => (
                  <div 
                    key={g.id} 
                    onClick={() => onOpenGoalDetail(g)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{g.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        g.riskStatus === 'critical' 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {g.riskStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Tiến độ: {g.progress}% · Hạn: {new Date(g.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Thao tác nhanh</h3>
            <button type="button" 
              onClick={() => setActiveTab('execution')} 
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Thực thi danh sách hôm nay
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button type="button" 
              onClick={() => setActiveTab('scenarios')} 
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Giả lập kịch bản tiến độ
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button type="button" 
              onClick={() => setActiveTab('templates')} 
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Thư viện Mẫu Mục tiêu chuẩn
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. MY GOALS VIEW (Grid, Hierarchy Tree, List)
// ----------------------------------------------------------------------
function MyGoalsView({ 
  filteredGoals, viewMode, setViewMode, categoryFilter, setCategoryFilter,
  statusFilter, setStatusFilter, tierFilter, setTierFilter, searchQuery, setSearchQuery,
  onOpenDetail, onOpenEdit, onOpenNew, onDelete, projects, tasks
}: any) {
  return (
    <div className="space-y-5">
      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm mục tiêu..."
            className="w-full bg-transparent text-xs text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filters */}
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 px-3 py-2 outline-none cursor-pointer"
          >
            <option value="All">Tất cả Lĩnh vực</option>
            <option value="Sự nghiệp">Sự nghiệp</option>
            <option value="Tài chính">Tài chính</option>
            <option value="Sức khoẻ">Sức khoẻ</option>
            <option value="Học tập">Học tập</option>
            <option value="Phát triển bản thân">Phát triển bản thân</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 px-3 py-2 outline-none cursor-pointer"
          >
            <option value="All">Tất cả Trạng thái</option>
            <option value="In Progress">Đang thực hiện</option>
            <option value="Completed">Đã hoàn thành</option>
            <option value="Paused">Tạm dừng</option>
          </select>

          <select 
            value={tierFilter} 
            onChange={e => setTierFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 px-3 py-2 outline-none cursor-pointer"
          >
            <option value="All">Tất cả Cấp độ</option>
            <option value="long_term">Dài hạn</option>
            <option value="yearly">Năm (Yearly)</option>
            <option value="quarterly">Quý (Quarterly)</option>
            <option value="monthly">Tháng (Monthly)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button type="button" 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
              title="Thẻ Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button type="button" 
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${viewMode === 'tree' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
              title="Phân cấp Cây (Tree)"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button type="button" 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
              title="Danh sách"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering by View Mode */}
      {filteredGoals.length === 0 ? (
        <div className="bg-white dark:bg-[#141E30] p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-200">Chưa tìm thấy mục tiêu nào</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Thử thay đổi bộ lọc hoặc thêm một mục tiêu mới để bắt đầu theo dõi hành trình của bạn.</p>
          <button type="button" 
            onClick={onOpenNew} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Thêm Mục tiêu
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((g: Goal) => (
            <GoalCard 
              key={g.id} 
              goal={g} 
              onClick={() => onOpenDetail(g)} 
              onEdit={() => onOpenEdit(g)}
              onDelete={() => onDelete(g)}
            />
          ))}
        </div>
      ) : viewMode === 'tree' ? (
        <GoalTreeView goals={filteredGoals} projects={projects} tasks={tasks} onOpenDetail={onOpenDetail} />
      ) : (
        <GoalListView 
          goals={filteredGoals} 
          onOpenDetail={onOpenDetail} 
          onOpenEdit={onOpenEdit} 
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// GOAL CARD COMPONENT
// ----------------------------------------------------------------------
function GoalCard({ goal, onClick, onEdit, onDelete }: { goal: Goal, onClick: () => void, onEdit?: () => void, onDelete?: () => void, key?: any }) {
  const riskColor = 
    goal.riskStatus === 'critical' ? 'bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300 border-red-200 dark:border-rose-900/50' :
    goal.riskStatus === 'at_risk' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' :
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col relative w-full min-w-0 max-w-full overflow-hidden break-words"
    >
      {/* Top badges */}
      <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: `${goal.color || '#10B981'}20`, color: goal.color || '#10B981' }}
          >
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">
              {goal.category}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate block">
              {goal.tier || 'Yearly'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {goal.riskStatus && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${riskColor}`}>
              {goal.riskStatus === 'on_track' ? '🟢 On Track' : goal.riskStatus === 'at_risk' ? '🟡 At Risk' : '🔴 Critical'}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
            goal.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
            goal.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {goal.status}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              title="Sửa mục tiêu"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              title="Xóa mục tiêu (có hoàn tác)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Goal Title */}
      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2 break-words">
        {goal.title}
      </h3>

      {goal.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 break-words">{goal.description}</p>
      )}

      {/* Progress Section */}
      <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-600 dark:text-slate-400">
              {goal.unit === 'VNĐ' ? formatCurrency(goal.current) : goal.current} / {goal.unit === 'VNĐ' ? formatCurrency(goal.target) : goal.target} {goal.unit !== 'VNĐ' ? goal.unit : ''}
            </span>
            <span className="text-slate-900 dark:text-white font-extrabold">{goal.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all" 
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color || '#10B981' }}
            ></div>
          </div>
        </div>

        {/* Foot Stats */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            {goal.milestones?.length || 0} Milestones
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(goal.deadline).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Goal Tree View Component
function GoalTreeView({ goals, projects, tasks, onOpenDetail }: any) {
  return (
    <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Cây Phân cấp Mục tiêu (Goal Tree)
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">Hierarchy: Goal → Milestones → Linked Projects & Tasks</p>

      <div className="space-y-6">
        {goals.map((goal: Goal) => {
          const linkedProjects = projects.filter((p: any) => goal.linkedProjectIds?.includes(p.id) || p.goalId === goal.id);

          return (
            <div key={goal.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
              <div 
                onClick={() => onOpenDetail(goal)}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    🎯
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{goal.title}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{goal.category} • {goal.tier || 'Yearly'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{goal.progress}%</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Children: Milestones & Projects */}
              <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-3 ml-4">
                {/* Milestones */}
                {goal.milestones && goal.milestones.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Milestones</span>
                    {goal.milestones.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5 text-amber-500" /> {m.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          {m.progress}% • {m.status || (m.completed ? 'Completed' : 'Pending')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Linked Projects */}
                {linkedProjects.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Dự án liên kết</span>
                    {linkedProjects.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FolderGit2 className="w-3.5 h-3.5 text-blue-500" /> {p.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Goal List View
function GoalListView({ goals, onOpenDetail, onOpenEdit, onDelete }: any) {
  return (
    <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Mục tiêu</th>
              <th className="p-4">Lĩnh vực</th>
              <th className="p-4">Cấp độ</th>
              <th className="p-4">Tiến độ</th>
              <th className="p-4">Rủi ro</th>
              <th className="p-4">Hạn chót</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
            {goals.map((g: Goal) => (
              <tr key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-bold text-slate-900 dark:text-white cursor-pointer" onClick={() => onOpenDetail(g)}>
                  {g.title}
                </td>
                <td className="p-4 text-slate-500 dark:text-slate-400">{g.category}</td>
                <td className="p-4 uppercase text-[10px] font-bold">{g.tier || 'Quarterly'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${g.progress}%` }}></div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{g.progress}%</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    g.riskStatus === 'at_risk' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                    g.riskStatus === 'critical' ? 'bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300' : 
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {g.riskStatus || 'on_track'}
                  </span>
                </td>
                <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(g.deadline).toLocaleDateString('vi-VN')}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onOpenDetail(g)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer" title="Xem chi tiết">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => onOpenEdit(g)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer" title="Chỉnh sửa">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(g)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. EXECUTION VIEW (Thực thi hôm nay)
// ----------------------------------------------------------------------
function ExecutionView({ goals, tasks, habits, toggleGoalAction, addGoalAction, deleteGoalAction }: any) {
  const [newActionTitle, setNewActionTitle] = useState<{ [goalId: string]: string }>({});

  const handleCreateAction = (goalId: string) => {
    const text = (newActionTitle[goalId] || '').trim();
    if (!text) return;
    addGoalAction(goalId, text, 'task');
    setNewActionTitle(prev => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 rounded-2xl shadow-sm border border-emerald-800/40">
        <h3 className="text-xl font-black flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" /> Thực thi Mục tiêu hôm nay
        </h3>
        <p className="text-xs text-emerald-100 mt-1">
          Hoàn thành các hành động cụ thể để trực tiếp thúc đẩy tiến độ các mục tiêu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g: Goal) => {
          return (
            <div key={g.id} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">{g.category}</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{g.title}</h4>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  {g.progress}%
                </span>
              </div>

              {/* Actions List */}
              <div className="space-y-2">
                {(g.actions && g.actions.length > 0) ? (
                  g.actions.map(action => (
                    <div 
                      key={action.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        action.completed 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-slate-400 dark:text-slate-500 line-through' 
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div 
                        onClick={() => toggleGoalAction(g.id, action.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${action.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                          {action.completed && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-bold truncate">{action.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400">
                          {action.type}
                        </span>
                        {deleteGoalAction && (
                          <button
                            type="button"
                            onClick={() => deleteGoalAction(g.id, action.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                            title="Xóa hành động"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có hành động cụ thể nào.</p>
                )}
              </div>

              {/* Inline Add Action */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="+ Thêm hành động nhanh..."
                  value={newActionTitle[g.id] || ''}
                  onChange={e => setNewActionTitle({ ...newActionTitle, [g.id]: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAction(g.id);
                    }
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleCreateAction(g.id)}
                  disabled={!(newActionTitle[g.id] || '').trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Thêm
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. TIMELINE & MILESTONES VIEW
// ----------------------------------------------------------------------
function TimelineView({ goals, onOpenDetail, addGoalMilestone, toggleMilestone }: any) {
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [selectedGoalForM, setSelectedGoalForM] = useState(goals[0]?.id || '');
  const [milestoneDeadline, setMilestoneDeadline] = useState(formatLocalDateKey(new Date(Date.now() + 30 * 86400000)));

  const handleCreateMilestone = () => {
    if (!newMilestoneTitle.trim() || !selectedGoalForM) return;
    addGoalMilestone(selectedGoalForM, {
      title: newMilestoneTitle.trim(),
      deadline: milestoneDeadline,
      targetDate: milestoneDeadline,
      progress: 0,
      status: 'Pending'
    });
    setNewMilestoneTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Milestone Addition Bar */}
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Thêm Cột mốc (Milestone) mới cho Mục tiêu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select 
            value={selectedGoalForM}
            onChange={e => setSelectedGoalForM(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
          >
            {goals.map((g: Goal) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          <div className="relative col-span-1 sm:col-span-2">
            <input 
              type="text"
              placeholder="Tên cột mốc (vd: Đạt 50% khối lượng)..."
              value={newMilestoneTitle}
              onChange={e => setNewMilestoneTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-900 dark:text-white"
            />
            {newMilestoneTitle && (
              <button
                type="button"
                onClick={() => setNewMilestoneTitle('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Xóa tên"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="button" 
            onClick={handleCreateMilestone}
            disabled={!newMilestoneTitle.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-xs"
          >
            Thêm Milestone
          </button>
        </div>
      </div>

      {/* Milestones List by Goal */}
      <div className="space-y-6">
        {goals.map((g: Goal) => (
          <div key={g.id} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 
                onClick={() => onOpenDetail(g)}
                className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 cursor-pointer hover:text-emerald-500 transition-colors"
              >
                <Flag className="w-4 h-4 text-amber-500" /> {g.title}
              </h4>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Hạn: {new Date(g.deadline).toLocaleDateString('vi-VN')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {g.milestones && g.milestones.length > 0 ? (
                g.milestones.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => toggleMilestone && toggleMilestone(g.id, m.id)}
                    className={`p-3 rounded-xl border space-y-2 cursor-pointer transition-all ${
                      m.completed 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${m.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                          {m.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span className={`text-xs font-bold ${m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{m.title}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        m.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {m.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>Hạn: {m.targetDate || m.deadline}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{m.completed ? '100%' : `${m.progress || 0}%`}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-xs text-slate-400 italic">Chưa có cột mốc nào cho mục tiêu này.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. ACTION PLAN VIEW
// ----------------------------------------------------------------------
function ActionPlanView({ goals, projects, tasks, habits, onOpenDetail }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Ma trận Kế hoạch Hành động (Action Matrix)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Đảm bảo mỗi mục tiêu đều có dự án, công việc và thói quen tương ứng.</p>
      </div>

      <div className="space-y-4">
        {goals.map((g: Goal) => {
          const linkedProjects = projects.filter((p: any) => g.linkedProjectIds?.includes(p.id) || p.goalId === g.id);

          return (
            <div key={g.id} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{g.title}</h4>
                <button type="button" onClick={() => onOpenDetail(g)} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">Chi tiết</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Milestones */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Cột mốc (Milestones)</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {g.milestones?.length || 0} cột mốc được thiết lập
                  </div>
                </div>

                {/* Linked Projects */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Dự án liên kết</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {linkedProjects.length} dự án đang chạy
                  </div>
                </div>

                {/* Action Items */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Hành động cụ thể</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {g.actions?.length || 0} hành động được thiết lập
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. PACE & KPIS VIEW
// ----------------------------------------------------------------------
function PaceKPIsView({ goals, onOpenDetail }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Phân tích Tốc độ (Pace) & Chỉ số KPIs</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">So sánh tốc độ thực tế so với tốc độ cần thiết để hoàn thành đúng hạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g: Goal) => {
          const rawStart = new Date(g.startDate || g.deadline);
          const rawDeadline = new Date(g.deadline);
          const validStart = isNaN(rawStart.getTime()) ? new Date() : rawStart;
          const validDeadline = isNaN(rawDeadline.getTime()) ? new Date(validStart.getTime() + 30 * 86400000) : rawDeadline;
          const startMs = validStart.getTime();
          const deadlineMs = validDeadline.getTime();
          const totalDays = Math.max(1, Math.ceil((deadlineMs - startMs) / (1000 * 3600 * 24)));
          const daysPassed = Math.max(0, Math.ceil((Date.now() - startMs) / (1000 * 3600 * 24)));
          const expectedProgress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
          const paceGap = (Number(g.progress) || 0) - expectedProgress;

          return (
            <div key={g.id} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 
                    onClick={() => onOpenDetail(g)}
                    className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-emerald-500 transition-colors"
                  >
                    {g.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{g.category}</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  paceGap < -15 
                    ? 'bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300' 
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {paceGap < -15 ? 'Chậm tốc độ' : 'Đúng tốc độ'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">Tiến độ thực tế: <strong className="text-emerald-600 dark:text-emerald-400">{g.progress}%</strong></span>
                  <span className="text-slate-700 dark:text-slate-300">Tiến độ kỳ vọng: <strong className="text-slate-500">{expectedProgress}%</strong></span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${g.progress}%` }}></div>
                </div>
              </div>

              {g.kpis && g.kpis.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">KPIs đo lường</span>
                  {g.kpis.map((k: any) => (
                    <div key={k.id} className="flex justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{k.title}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{k.current} / {k.target} {k.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 7. WHAT-IF SCENARIOS VIEW
// ----------------------------------------------------------------------
function ScenariosView({ goals = [], updateGoal }: any) {
  const [selectedGoalId, setSelectedGoalId] = useState(() => {
    try {
      return localStorage.getItem('lifeos_goals_scenario_id') || goals?.[0]?.id || '';
    } catch (e) {
      return goals?.[0]?.id || '';
    }
  });

  useEffect(() => {
    try {
      if (selectedGoalId) localStorage.setItem('lifeos_goals_scenario_id', selectedGoalId);
    } catch (e) {}
  }, [selectedGoalId]);

  const [multiplier, setMultiplier] = useState(1.5); // 1.5x speed

  const selectedGoal = (goals || []).find((g: Goal) => g.id === selectedGoalId) || goals?.[0];

  const calculateSimulatedDays = () => {
    if (!selectedGoal) return 0;
    const remainingProgress = Math.max(0, 100 - (Number(selectedGoal.progress) || 0));
    const baseDays = Math.max(7, Math.round((remainingProgress / 100) * 60));
    const validMultiplier = (typeof multiplier === 'number' && multiplier > 0) ? multiplier : 1;
    return Math.max(1, Math.round(baseDays / validMultiplier));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Dự báo Tiến độ Hoàn thành Mục tiêu</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tính toán ngày hoàn thành thực tế dự kiến dựa trên tốc độ thực thi mục tiêu của bạn.
        </p>
      </div>

      {selectedGoal && (
        <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Chọn mục tiêu để dự báo:</label>
            <select 
              value={selectedGoalId} 
              onChange={e => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
            >
              {goals.map((g: Goal) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          {/* Slider for Effort Multiplier */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Hệ số tốc độ thực thi:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{multiplier}x nỗ lực</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="3.0" 
              step="0.1" 
              value={multiplier}
              onChange={e => setMultiplier(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.5x (Chậm một nửa)</span>
              <span>1.0x (Tiêu chuẩn)</span>
              <span>3.0x (Tốc lực)</span>
            </div>
          </div>

          {/* Simulation Output */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase">Ước tính thời gian còn lại</span>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{calculateSimulatedDays()} ngày</div>
            </div>

            <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-xl">
              <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 uppercase">Dự kiến hoàn thành mới</span>
              <div className="text-xl font-black text-teal-900 dark:text-teal-200 mt-1">
                {new Date(Date.now() + calculateSimulatedDays() * 86400000).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 8. RISKS & CONFLICTS VIEW
// ----------------------------------------------------------------------
function RisksConflictsView({ goals, onOpenDetail }: any) {
  const atRisk = goals.filter((g: Goal) => g.riskStatus === 'at_risk' || g.riskStatus === 'critical');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Rủi ro & Xung đột Tài nguyên</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Phát hiện tự động các nguy cơ trễ hạn và quá tải thời gian trong ngày.</p>
      </div>

      <div className="space-y-4">
        {atRisk.length === 0 ? (
          <div className="bg-white dark:bg-[#141E30] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            Không có mục tiêu nào đang gặp rủi ro trễ hạn. Tuyệt vời!
          </div>
        ) : (
          atRisk.map((g: Goal) => (
            <div key={g.id} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-red-200 dark:border-rose-900/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-[10px] rounded uppercase">
                    {g.riskStatus}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{g.title}</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tiến độ hiện tại {g.progress}% thấp hơn mức kỳ vọng theo hạn chót {new Date(g.deadline).toLocaleDateString('vi-VN')}.</p>
              </div>
              <button type="button" 
                onClick={() => onOpenDetail(g)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
              >
                Khắc phục
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 9. REVIEWS VIEW
// ----------------------------------------------------------------------
function ReviewsView({ goals, addGoalReview }: any) {
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.id || '');
  const [whatWasDone, setWhatWasDone] = useState('');
  const [lessons, setLessons] = useState('');
  const [status, setStatus] = useState<'On Track' | 'Needs Adjustment'>('On Track');

  const handleSaveReview = () => {
    if (!whatWasDone.trim() || !selectedGoalId) return;
    addGoalReview(selectedGoalId, {
      date: formatLocalDateKey(new Date()),
      period: 'weekly',
      whatWasDone: whatWasDone.trim(),
      lessonsLearned: lessons.trim(),
      status
    });
    setWhatWasDone('');
    setLessons('');
  };

  const allReviews = goals.flatMap((g: Goal) => 
    (g.reviews || []).map(r => ({ ...r, goalTitle: g.title, goalId: g.id }))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Viết Nhận xét / Đánh giá Định kỳ</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mục tiêu đánh giá</label>
            <select 
              value={selectedGoalId} 
              onChange={e => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
            >
              {goals.map((g: Goal) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Việc đã làm được trong tuần</label>
            <textarea 
              rows={2}
              value={whatWasDone}
              onChange={e => setWhatWasDone(e.target.value)}
              placeholder="Ghi nhận các kết quả đã đạt được..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bài học & Rút kinh nghiệm</label>
            <textarea 
              rows={2}
              value={lessons}
              onChange={e => setLessons(e.target.value)}
              placeholder="Cần cải thiện điều gì cho tuần tới..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button type="button" 
            onClick={handleSaveReview}
            disabled={!whatWasDone.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
          >
            Lưu Nhận xét
          </button>
        </div>
      </div>

      {/* Review History */}
      {allReviews.length > 0 && (
        <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lịch sử đánh giá</h4>
          <div className="space-y-3">
            {allReviews.map((r: any) => (
              <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.goalTitle}</span>
                  <span className="text-slate-400 text-[11px]">{r.date}</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200">{r.whatWasDone}</p>
                {r.lessonsLearned && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">Bài học: {r.lessonsLearned}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 10. ANALYTICS & GOAL SCORE VIEW
// ----------------------------------------------------------------------
function AnalyticsView({ goals, avgGoalScore }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
        <Award className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Goal Score Trung bình: {avgGoalScore}/100</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Chỉ số đo lường tổng hợp sự kỷ luật, tốc độ hoàn thành và mức độ bám sát kế hoạch hành động.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Tổng mục tiêu</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{goals.length}</div>
        </div>
        <div className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Hoàn thành</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{goals.filter((g: any) => g.status === 'Completed').length}</div>
        </div>
        <div className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ On Track</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {goals.length ? Math.round((goals.filter((g: any) => g.riskStatus === 'on_track' || !g.riskStatus).length / goals.length) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 11. TEMPLATES VIEW
// ----------------------------------------------------------------------
function TemplatesView({ addGoal, setActiveTab }: any) {
  const templates = [
    {
      title: 'Đạt IELTS 7.5 Quốc tế',
      category: 'Học tập',
      description: 'Lộ trình chuẩn hóa 4 kỹ năng tiếng Anh trong 90 ngày với các mốc thi thử và kiểm tra từ vựng.',
      target: 7.5,
      unit: 'điểm',
      color: '#3b82f6',
      milestones: [
        { id: 'ms1', title: 'Hoàn thành 3000 từ vựng cốt lõi', deadline: formatLocalDateKey(new Date(Date.now() + 30 * 86400000)), completed: false, progress: 0 },
        { id: 'ms2', title: 'Thi thử IELTS đạt 6.5', deadline: formatLocalDateKey(new Date(Date.now() + 60 * 86400000)), completed: false, progress: 0 },
        { id: 'ms3', title: 'Thi chính thức đạt 7.5', deadline: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)), completed: false, progress: 0 }
      ]
    },
    {
      title: 'Tích lũy 100.000.000 VNĐ Quỹ Khẩn cấp',
      category: 'Tài chính',
      description: 'Xây dựng vùng an toàn tài chính cá nhân đủ chi trả chi phí sinh hoạt 6 tháng.',
      target: 100000000,
      unit: 'VNĐ',
      color: '#10b981',
      milestones: [
        { id: 'ms1', title: 'Đạt 30.000.000 VNĐ (Tháng 1-2)', deadline: formatLocalDateKey(new Date(Date.now() + 60 * 86400000)), completed: false, progress: 0 },
        { id: 'ms2', title: 'Đạt 70.000.000 VNĐ (Tháng 3-4)', deadline: formatLocalDateKey(new Date(Date.now() + 120 * 86400000)), completed: false, progress: 0 },
        { id: 'ms3', title: 'Cán mốc 100.000.000 VNĐ', deadline: formatLocalDateKey(new Date(Date.now() + 180 * 86400000)), completed: false, progress: 0 }
      ]
    },
    {
      title: 'Chinh phục Half-Marathon 21KM',
      category: 'Sức khoẻ',
      description: 'Kế hoạch rèn luyện thể lực, chạy bộ nâng cự ly đều đặn 4 buổi mỗi tuần.',
      target: 21,
      unit: 'km',
      color: '#f59e0b',
      milestones: [
        { id: 'ms1', title: 'Chạy liên tục 5km dưới 35 phút', deadline: formatLocalDateKey(new Date(Date.now() + 20 * 86400000)), completed: false, progress: 0 },
        { id: 'ms2', title: 'Chạy cự ly 10km an toàn', deadline: formatLocalDateKey(new Date(Date.now() + 45 * 86400000)), completed: false, progress: 0 },
        { id: 'ms3', title: 'Chinh phục cự ly 21km chính thức', deadline: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)), completed: false, progress: 0 }
      ]
    },
    {
      title: 'Đọc 12 cuốn sách Phát triển bản thân',
      category: 'Phát triển bản thân',
      description: 'Mỗi tháng đọc xong 1 cuốn sách, ghi chú mindmap và ứng dụng vào cuộc sống.',
      target: 12,
      unit: 'cuốn',
      color: '#8b5cf6',
      milestones: [
        { id: 'ms1', title: 'Hoàn thành 3 cuốn Quý 1', deadline: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)), completed: false, progress: 0 },
        { id: 'ms2', title: 'Hoàn thành 6 cuốn nửa đầu năm', deadline: formatLocalDateKey(new Date(Date.now() + 180 * 86400000)), completed: false, progress: 0 },
        { id: 'ms3', title: 'Cán mốc 12 cuốn trọn vẹn cả năm', deadline: formatLocalDateKey(new Date(Date.now() + 365 * 86400000)), completed: false, progress: 0 }
      ]
    }
  ];

  const handleApply = (t: any) => {
    soundEngine.playSuccess();
    triggerConfetti();
    addGoal({
      id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: t.title,
      category: t.category,
      description: t.description,
      status: 'In Progress',
      priority: 'High',
      progress: 0,
      current: 0,
      target: t.target,
      unit: t.unit,
      deadline: formatLocalDateKey(new Date(Date.now() + 90 * 86400000)),
      color: t.color,
      milestones: t.milestones || []
    });
    setActiveTab('my_goals');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {templates.map((t, idx) => (
        <div key={idx} className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t.category}</span>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">{t.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
          </div>
          <button type="button" 
            onClick={() => handleApply(t)}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-xs"
          >
            Sử dụng Template này
          </button>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// 12. ARCHIVE VIEW
// ----------------------------------------------------------------------
function ArchiveView({ goals, onOpenDetail }: any) {
  const archived = goals.filter((g: Goal) => g.status === 'Archived' || g.status === 'Completed');

  return (
    <div className="space-y-4">
      {archived.length === 0 ? (
        <div className="bg-white dark:bg-[#141E30] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa có mục tiêu nào trong kho lưu trữ hoặc hoàn thành.
        </div>
      ) : (
        archived.map((g: Goal) => (
          <div key={g.id} onClick={() => onOpenDetail(g)} className="bg-white dark:bg-[#141E30] p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-400 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{g.title}</h4>
              <span className="text-xs text-slate-400">{g.category} · Tiến độ: {g.progress}%</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">{g.status}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUPERCHARGED GOAL DETAIL DRAWER
// ----------------------------------------------------------------------
function GoalDetailDrawer({ 
  goal, onClose, onEdit, onDelete, updateGoal, addGoalMilestone, toggleGoalMilestone, deleteGoalMilestone,
  toggleGoalAction, addGoalAction, deleteGoalAction, addGoalReview, projects, tasks, habits 
}: any) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = React.useRef<EventTarget | null>(null);

  const [newMsTitle, setNewMsTitle] = useState('');
  const [newActTitle, setNewActTitle] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddMs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsTitle.trim()) return;
    addGoalMilestone(goal.id, {
      title: newMsTitle.trim(),
      deadline: formatLocalDateKey(new Date(Date.now() + 30 * 86400000)),
      progress: 0,
      completed: false
    });
    setNewMsTitle('');
  };

  const handleAddAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;
    addGoalAction(goal.id, newActTitle.trim(), 'task');
    setNewActTitle('');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNote.trim()) return;
    addGoalReview(goal.id, {
      whatWasDone: reviewNote.trim(),
      date: formatLocalDateKey(new Date())
    });
    setReviewNote('');
  };

  const linkedProjects = (projects || []).filter((p: any) => goal.linkedProjectIds?.includes(p.id) || p.goalId === goal.id);

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex justify-end bg-slate-900/60 backdrop-blur-xs animate-backdrop-fade cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#141E30] w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 animate-modal-enter"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{goal.category} · {goal.tier || 'Quarterly'}</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={onEdit} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" aria-label="Edit Goal" title="Sửa mục tiêu">
              <Edit2 className="w-4 h-4" />
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer" aria-label="Delete Goal" title="Xóa mục tiêu">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Progress Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Tiến độ thực tế</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-sm font-extrabold">
                {goal.unit === 'VNĐ' ? formatCurrency(goal.current) : goal.current} / {goal.unit === 'VNĐ' ? formatCurrency(goal.target) : goal.target} {goal.unit !== 'VNĐ' ? goal.unit : ''} ({Math.min(100, Math.max(0, goal.progress || 0))}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, goal.progress || 0))}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Hạn chót: <strong>{new Date(goal.deadline).toLocaleDateString('vi-VN')}</strong></span>
              <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                goal.riskStatus === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                goal.riskStatus === 'at_risk' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {goal.riskStatus || 'On Track'}
              </span>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Mô tả</h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">{goal.description}</p>
            </div>
          )}

          {/* Interactive Milestones Checklist */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Cột mốc chiến lược ({goal.milestones?.length || 0})
              </h4>
            </div>

            <div className="space-y-2">
              {goal.milestones?.map((m: GoalMilestone) => (
                <div 
                  key={m.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    m.completed 
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div 
                    onClick={() => toggleGoalMilestone(goal.id, m.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${m.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                      {m.completed && <Check className="w-3 h-3" />}
                    </div>
                    <span className={`font-bold truncate ${m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {m.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-400">{m.targetDate || m.deadline}</span>
                    <button
                      type="button"
                      onClick={() => deleteGoalMilestone(goal.id, m.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title="Xóa milestone"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Inline Add Milestone */}
              <form onSubmit={handleAddMs} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="+ Thêm cột mốc mới..."
                  value={newMsTitle}
                  onChange={e => setNewMsTitle(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newMsTitle.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Thêm
                </button>
              </form>
            </div>
          </div>

          {/* Interactive Actions Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Hành động cụ thể ({goal.actions?.length || 0})
            </h4>

            <div className="space-y-2">
              {goal.actions?.map((act: any) => (
                <div 
                  key={act.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    act.completed 
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 line-through text-slate-400' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div 
                    onClick={() => toggleGoalAction(goal.id, act.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${act.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
                      {act.completed && <Check className="w-3 h-3" />}
                    </div>
                    <span className="font-bold truncate">{act.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteGoalAction(goal.id, act.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer shrink-0 ml-2"
                    title="Xóa hành động"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Inline Add Action */}
              <form onSubmit={handleAddAct} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="+ Thêm hành động..."
                  value={newActTitle}
                  onChange={e => setNewActTitle(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newActTitle.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Thêm
                </button>
              </form>
            </div>
          </div>

          {/* Linked Projects */}
          {linkedProjects.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Dự án liên kết ({linkedProjects.length})
              </h4>
              <div className="space-y-2">
                {linkedProjects.map((p: any) => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-blue-500" /> {p.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Review Note Log */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Nhật ký tiến độ ({goal.reviews?.length || 0})
            </h4>
            <div className="space-y-2">
              {goal.reviews?.slice(0, 3).map((r: any) => (
                <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{r.date}</span>
                    <span className="text-emerald-500 font-bold">{r.status || 'On Track'}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200">{r.whatWasDone}</p>
                </div>
              ))}

              <form onSubmit={handleAddReview} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="+ Viết nhật ký kết quả..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!reviewNote.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Ghi lại
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// GOAL FORM MODAL
// ----------------------------------------------------------------------
function GoalModal({ goal, onClose, onSave, onDelete }: any) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = React.useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialTitle = goal?.title || '';
  const initialCategory = goal?.category || 'Phát triển bản thân';

  const initialDataRef = useRef({
    title: initialTitle,
    description: goal?.description || '',
    category: initialCategory,
    tier: goal?.tier || 'quarterly',
    status: goal?.status || 'In Progress',
    priority: goal?.priority || 'High',
    progress: goal?.progress || 0,
    target: goal?.target || 100,
    current: goal?.current || 0,
    unit: goal?.unit || '%',
    deadline: goal?.deadline || formatLocalDateKey(new Date(Date.now() + 30 * 86400000)),
    color: goal?.color || '#10B981'
  });

  const [formData, setFormData] = useState({
    id: goal?.id || undefined,
    title: initialTitle,
    description: goal?.description || '',
    category: initialCategory,
    tier: goal?.tier || 'quarterly',
    status: goal?.status || 'In Progress',
    priority: goal?.priority || 'High',
    progress: goal?.progress || 0,
    target: goal?.target || 100,
    current: goal?.current || 0,
    unit: goal?.unit || '%',
    deadline: goal?.deadline || formatLocalDateKey(new Date(Date.now() + 30 * 86400000)),
    color: goal?.color || '#10B981'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDirty = Boolean(
    (formData.title || '').trim() !== (initialDataRef.current.title || '').trim() ||
    (formData.description || '').trim() !== (initialDataRef.current.description || '').trim() ||
    formData.category !== initialDataRef.current.category ||
    formData.tier !== initialDataRef.current.tier ||
    formData.status !== initialDataRef.current.status ||
    formData.priority !== initialDataRef.current.priority ||
    Number(formData.current) !== Number(initialDataRef.current.current) ||
    Number(formData.target) !== Number(initialDataRef.current.target) ||
    (formData.unit || '').trim() !== (initialDataRef.current.unit || '').trim() ||
    formData.deadline !== initialDataRef.current.deadline
  );

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const title = (formData.title || '').trim();
    if (!title) {
      setErrorMessage('Vui lòng nhập tiêu đề mục tiêu');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentVal = Math.max(0, Number(formData.current) || 0);
      const targetVal = Math.max(1, Number(formData.target) || 100);
      const calculatedProgress = Math.min(100, Math.round((currentVal / targetVal) * 100));

      await Promise.resolve(onSave({
        ...formData,
        title,
        current: currentVal,
        target: targetVal,
        progress: calculatedProgress
      }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể lưu mục tiêu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!goal?.id || !onDelete || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await Promise.resolve(onDelete(goal));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể xóa mục tiêu');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isFormDirty) triggerShake();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting, isFormDirty]);

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget && !isSubmitting) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#141E30] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-modal-enter transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{goal ? 'Chỉnh sửa Mục tiêu' : 'Mục tiêu Mới'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Xác định các chỉ số đo lường và cột mốc kết quả</p>
          </div>
          <button 
            type="button" 
            onClick={handleSafeDismiss} 
            disabled={isSubmitting}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tiêu đề Mục tiêu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={formData.title} 
                  onChange={e=>setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  placeholder="VD: Đạt IELTS 7.5, Tiết kiệm 50 triệu..."
                />
                {formData.title && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, title: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Xóa tiêu đề"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mô tả / Kế hoạch chi tiết
              </label>
              <textarea 
                rows={3}
                value={formData.description} 
                onChange={e=>setFormData({...formData, description: e.target.value})} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none" 
                placeholder="Ghi chú chi tiết về mục tiêu này, tại sao nó quan trọng..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lĩnh vực</label>
                <select 
                  value={formData.category} 
                  onChange={e=>setFormData({...formData, category: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Sự nghiệp">Sự nghiệp</option>
                  <option value="Tài chính">Tài chính</option>
                  <option value="Sức khoẻ">Sức khoẻ</option>
                  <option value="Học tập">Học tập</option>
                  <option value="Phát triển bản thân">Phát triển bản thân</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mức độ ưu tiên</label>
                <select 
                  value={formData.priority} 
                  onChange={e=>setFormData({...formData, priority: e.target.value as any})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Critical">Nguy cấp (Critical)</option>
                  <option value="High">Cao (High)</option>
                  <option value="Medium">Trung bình (Medium)</option>
                  <option value="Low">Thấp (Low)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cấp độ Thời gian</label>
                <select 
                  value={formData.tier} 
                  onChange={e=>setFormData({...formData, tier: e.target.value as any})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="quarterly">Quý (Quarterly)</option>
                  <option value="monthly">Tháng (Monthly)</option>
                  <option value="yearly">Năm (Yearly)</option>
                  <option value="long_term">Dài hạn (Long-term)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Trạng thái</label>
                <select 
                  value={formData.status} 
                  onChange={e=>setFormData({...formData, status: e.target.value as any})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="In Progress">Đang thực hiện</option>
                  <option value="Completed">Đã hoàn thành</option>
                  <option value="Paused">Tạm dừng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Giá trị Hiện tại</label>
                <input 
                  type="number" 
                  step="any"
                  value={formData.current} 
                  onChange={e=>setFormData({...formData, current: Number(e.target.value)})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold" 
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Chỉ tiêu Mục tiêu (Target)</label>
                <input 
                  type="number" 
                  step="any"
                  value={formData.target} 
                  onChange={e=>setFormData({...formData, target: Number(e.target.value)})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Đơn vị đo</label>
                <input 
                  type="text" 
                  value={formData.unit} 
                  onChange={e=>setFormData({...formData, unit: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="%, VNĐ, km, cuốn..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Hạn chót (Deadline)</label>
                <input 
                  type="date" 
                  value={formData.deadline} 
                  onChange={e=>setFormData({...formData, deadline: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            {goal ? (
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={handleDelete} 
                className="px-4 py-2.5 min-h-[44px] text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Xóa Mục tiêu
              </button>
            ) : <div />}
            <div className="flex items-center gap-2.5">
              <button 
                type="button" 
                onClick={handleSafeDismiss} 
                disabled={isSubmitting}
                className="px-4 py-2.5 min-h-[44px] text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu Mục tiêu</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
