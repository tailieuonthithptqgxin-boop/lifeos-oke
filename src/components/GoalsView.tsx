import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Target, Plus, CheckCircle2, AlertTriangle, TrendingUp, Calendar, ArrowRight, Activity, 
  Crosshair, Clock, Zap, ListFilter, Layers, ShieldAlert, FileText, Sparkles, FolderGit2, 
  CheckSquare, History, BarChart3, Sliders, Edit2, Trash2, X, ChevronRight, Link2, Flag, 
  Flame, BookOpen, DollarSign, Award, SlidersHorizontal, Grid, GitBranch, Play, Search,
  Eye, Check, ArrowUpRight, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { Goal, GoalMilestone, GoalReview, GoalPriority, GoalType, GoalTier, GoalRiskStatus } from '../lib/types';
import { formatCurrency } from '../lib/utils';

export function GoalsView() {
  const { 
    goals, projects, tasks, habits, addGoal, updateGoal, deleteGoal, 
    addGoalReview, toggleGoalAction, addGoalMilestone, language 
  } = useAppStore();

  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'my_goals' | 'execution' | 'timeline' | 'action_plan' | 
    'pace_kpis' | 'scenarios' | 'risks' | 'reviews' | 'analytics' | 'templates' | 'archive'
  >('dashboard');

  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<Goal | null>(null);

  // Helper stats
  const activeGoals = goals.filter(g => g.status === 'In Progress');
  const completedGoals = goals.filter(g => g.status === 'Completed');
  const onTrackGoals = goals.filter(g => g.riskStatus === 'on_track' || !g.riskStatus);
  const atRiskGoals = goals.filter(g => g.riskStatus === 'at_risk');
  const criticalGoals = goals.filter(g => g.riskStatus === 'critical');

  const overallProgress = goals.length 
    ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) 
    : 0;

  const avgGoalScore = goals.length
    ? Math.round(goals.reduce((acc, g) => acc + (g.score || g.progress || 0), 0) / goals.length)
    : 0;

  const totalStreak = goals.reduce((acc, g) => acc + (g.streak || 0), 0);

  // Filtered goals
  const filteredGoals = goals.filter(g => {
    if (categoryFilter !== 'All' && g.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && g.status !== statusFilter) return false;
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
    <div className="p-4 sm:p-6 lg:p-8 pb-24 sm:pb-28 max-w-7xl mx-auto w-full min-w-0 max-w-full flex flex-col space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                {isVi ? 'Hệ thống Quản trị Mục tiêu' : 'Goals Management System'}
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
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> {isVi ? '+ Tạo Mục tiêu mới' : '+ Create New Goal'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200 dark:border-slate-800 shrink-0 w-full max-w-full">
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
            onOpenGoalDetail={setSelectedGoalDetail}
            onOpenNewGoal={openNewGoal}
            setActiveTab={setActiveTab}
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
            onOpenDetail={setSelectedGoalDetail}
            onOpenEdit={openEditGoal}
            onOpenNew={openNewGoal}
            projects={projects}
            tasks={tasks}
          />
        )}

        {activeTab === 'execution' && (
          <ExecutionView goals={goals} tasks={tasks} habits={habits} toggleGoalAction={toggleGoalAction} />
        )}

        {activeTab === 'timeline' && (
          <TimelineView goals={goals} onOpenDetail={setSelectedGoalDetail} addGoalMilestone={addGoalMilestone} />
        )}

        {activeTab === 'action_plan' && (
          <ActionPlanView goals={goals} projects={projects} tasks={tasks} habits={habits} onOpenDetail={setSelectedGoalDetail} />
        )}

        {activeTab === 'pace_kpis' && (
          <PaceKPIsView goals={goals} onOpenDetail={setSelectedGoalDetail} />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosView goals={goals} updateGoal={updateGoal} />
        )}

        {activeTab === 'risks' && (
          <RisksConflictsView goals={goals} onOpenDetail={setSelectedGoalDetail} />
        )}

        {activeTab === 'reviews' && (
          <ReviewsView goals={goals} addGoalReview={addGoalReview} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView goals={goals} avgGoalScore={avgGoalScore} />
        )}

        {activeTab === 'templates' && (
          <TemplatesView addGoal={addGoal} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'archive' && (
          <ArchiveView goals={goals} onOpenDetail={setSelectedGoalDetail} />
        )}
      </div>

      {/* Goal Form Modal */}
      {showGoalModal && (
        <GoalModal 
          goal={editingGoal} 
          onClose={() => setShowGoalModal(false)}
          onSave={(g) => {
            const targetId = editingGoal?.id || g?.id;
            if (editingGoal && targetId) updateGoal(targetId, g);
            else addGoal(g);
            setShowGoalModal(false);
          }}
          onDelete={(id) => {
            deleteGoal(id);
            setShowGoalModal(false);
          }}
          goals={goals}
          projects={projects}
          habits={habits}
        />
      )}

      {/* Goal Detail Drawer / Modal */}
      {selectedGoalDetail && (
        <GoalDetailDrawer 
          goal={selectedGoalDetail} 
          onClose={() => setSelectedGoalDetail(null)}
          onEdit={() => {
            const g = selectedGoalDetail;
            setSelectedGoalDetail(null);
            openEditGoal(g);
          }}
          updateGoal={updateGoal}
          addGoalReview={addGoalReview}
          toggleGoalAction={toggleGoalAction}
          addGoalMilestone={addGoalMilestone}
          projects={projects}
          tasks={tasks}
          habits={habits}
        />
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
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
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
  overallProgress, avgGoalScore, totalStreak, onOpenGoalDetail, onOpenNewGoal, setActiveTab 
}: any) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full min-w-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hoạt động</span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{activeGoals.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">{completedGoals.length} hoàn thành / {goals.length} tổng</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tiến độ chung</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{overallProgress}%</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Goal Score</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{avgGoalScore}<span className="text-xs font-normal text-slate-400">/100</span></div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Streak: {totalStreak} ngày</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rủi ro</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {atRiskGoals.length + criticalGoals.length}
            {criticalGoals.length > 0 && <span className="text-xs text-rose-600 font-normal ml-1">({criticalGoals.length} nguy cấp)</span>}
          </div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">{onTrackGoals.length} mục tiêu đúng tiến độ</span>
        </div>
      </div>

      {/* Goal Status Breakdown Banner - Clean White SaaS Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 w-full min-w-0 max-w-full">
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
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Mục tiêu trọng tâm
              <span className="text-xs text-slate-500 font-normal">({activeGoals.length})</span>
            </h3>
            <button type="button" 
              onClick={() => setActiveTab('my_goals')} 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onClick={() => onOpenGoalDetail(goal)} />
            ))}
          </div>
        </div>

        {/* Right Column: Attention Needed & Quick Execution */}
        <div className="space-y-4 sm:space-y-5">
          {/* Risk Alerts */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Cần chú ý ngay
            </h3>
            {atRiskGoals.length === 0 && criticalGoals.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                Tất cả mục tiêu đều đang On Track, không có cảnh báo rủi ro.
              </p>
            ) : (
              <div className="space-y-2.5">
                {[...criticalGoals, ...atRiskGoals].map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => onOpenGoalDetail(g)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{g.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        g.riskStatus === 'Critical' 
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
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
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
  onOpenDetail, onOpenEdit, onOpenNew, projects, tasks
}: any) {
  return (
    <div className="space-y-5">
      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm mục tiêu..."
            className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filters */}
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 px-3 py-2 outline-none"
          >
            <option value="All">Tất cả Lĩnh vực</option>
            <option value="Sự nghiệp">Sự nghiệp</option>
            <option value="Tài chính">Tài chính</option>
            <option value="Sức khoẻ">Sức khoẻ</option>
            <option value="Học tập">Học tập</option>
            <option value="Phát triển bản thân">Phát triển bản thân</option>
          </select>

          <select 
            value={tierFilter} 
            onChange={e => setTierFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 px-3 py-2 outline-none"
          >
            <option value="All">Tất cả Cấp độ</option>
            <option value="long_term">Dài hạn</option>
            <option value="yearly">Năm (Yearly)</option>
            <option value="quarterly">Quý (Quarterly)</option>
            <option value="monthly">Tháng (Monthly)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button type="button" 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              title="Thẻ Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button type="button" 
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-lg text-xs font-bold ${viewMode === 'tree' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              title="Phân cấp Cây (Tree)"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button type="button" 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              title="Danh sách"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering by View Mode */}
      {filteredGoals.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Target className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700">Chưa tìm thấy mục tiêu nào</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Thử thay đổi bộ lọc hoặc thêm một mục tiêu mới để bắt đầu theo dõi hành trình của bạn.</p>
          <button type="button" 
            onClick={onOpenNew} 
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm Mục tiêu
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((g: Goal) => (
            <GoalCard key={g.id} goal={g} onClick={() => onOpenDetail(g)} onEdit={() => onOpenEdit(g)} />
          ))}
        </div>
      ) : viewMode === 'tree' ? (
        <GoalTreeView goals={filteredGoals} projects={projects} tasks={tasks} onOpenDetail={onOpenDetail} />
      ) : (
        <GoalListView goals={filteredGoals} onOpenDetail={onOpenDetail} onOpenEdit={onOpenEdit} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// GOAL CARD COMPONENT
// ----------------------------------------------------------------------
function GoalCard({ goal, onClick, onEdit }: { goal: Goal, onClick: () => void, onEdit?: () => void, key?: any }) {
  const riskColor = 
    goal.riskStatus === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
    goal.riskStatus === 'at_risk' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col relative w-full min-w-0 max-w-full overflow-hidden break-words"
    >
      {/* Top badges */}
      <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: `${goal.color || '#3b82f6'}20`, color: goal.color || '#3b82f6' }}
          >
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">
              {goal.category}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">
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
            goal.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
            goal.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {goal.status}
          </span>
        </div>
      </div>

      {/* Goal Title */}
      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-blue-600 transition-colors line-clamp-2 mb-2 break-words">
        {goal.title}
      </h3>

      {goal.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 break-words">{goal.description}</p>
      )}

      {/* Progress Section */}
      <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-600">
              {goal.unit === 'VNĐ' ? formatCurrency(goal.current) : goal.current} / {goal.unit === 'VNĐ' ? formatCurrency(goal.target) : goal.target} {goal.unit !== 'VNĐ' ? goal.unit : ''}
            </span>
            <span className="text-slate-900 font-extrabold">{goal.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all" 
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color || '#3b82f6' }}
            ></div>
          </div>
        </div>

        {/* Foot Stats */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 pt-1">
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-blue-600" /> Cây Phân cấp Mục tiêu (Goal Tree)
      </h3>
      <p className="text-xs text-slate-500">Hierarchy: Goal → Milestones → Linked Projects & Tasks</p>

      <div className="space-y-6">
        {goals.map((goal: Goal) => {
          const linkedProjects = projects.filter((p: any) => goal.linkedProjectIds?.includes(p.id) || p.goalId === goal.id);

          return (
            <div key={goal.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
              <div 
                onClick={() => onOpenDetail(goal)}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-100/80 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    🎯
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{goal.title}</h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{goal.category} • {goal.tier || 'Yearly'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-blue-600">{goal.progress}%</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Children: Milestones & Projects */}
              <div className="pl-6 border-l-2 border-slate-200 space-y-3 ml-4">
                {/* Milestones */}
                {goal.milestones && goal.milestones.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Milestones</span>
                    {goal.milestones.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5 text-amber-500" /> {m.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                          {m.progress}% • {m.status}
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
                      <div key={p.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FolderGit2 className="w-3.5 h-3.5 text-blue-500" /> {p.title}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{p.status}</span>
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
function GoalListView({ goals, onOpenDetail, onOpenEdit }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Mục tiêu</th>
              <th className="p-4">Lĩnh vực</th>
              <th className="p-4">Loại</th>
              <th className="p-4">Tiến độ</th>
              <th className="p-4">Rủi ro</th>
              <th className="p-4">Hạn chót</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {goals.map((g: Goal) => (
              <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-bold text-slate-900 cursor-pointer" onClick={() => onOpenDetail(g)}>
                  {g.title}
                </td>
                <td className="p-4 text-slate-500">{g.category}</td>
                <td className="p-4 uppercase text-[10px] font-bold">{g.goalType || 'numeric'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${g.progress}%` }}></div>
                    </div>
                    <span className="font-bold text-slate-900">{g.progress}%</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    g.riskStatus === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                    g.riskStatus === 'critical' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {g.riskStatus || 'on_track'}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{new Date(g.deadline).toLocaleDateString('vi-VN')}</td>
                <td className="p-4 text-right">
                  <button type="button" onClick={() => onOpenDetail(g)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => onOpenEdit(g)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
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
function ExecutionView({ goals, tasks, habits, toggleGoalAction }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-black flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" /> Thực thi Mục tiêu hôm nay
        </h3>
        <p className="text-xs text-blue-200 mt-1">
          Hoàn thành các hành động cụ thể để trực tiếp thúc đẩy tiến độ các mục tiêu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g: Goal) => {
          if (!g.actions || g.actions.length === 0) return null;

          return (
            <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase">{g.category}</span>
                  <h4 className="font-bold text-slate-900 text-base">{g.title}</h4>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                  {g.progress}%
                </span>
              </div>

              {/* Actions List */}
              <div className="space-y-2">
                {g.actions.map(action => (
                  <div 
                    key={action.id}
                    onClick={() => toggleGoalAction(g.id, action.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      action.completed 
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-500 line-through' 
                        : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${action.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                        {action.completed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold">{action.title}</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                      {action.type}
                    </span>
                  </div>
                ))}
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
function TimelineView({ goals, onOpenDetail, addGoalMilestone }: any) {
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [selectedGoalForM, setSelectedGoalForM] = useState(goals[0]?.id || '');
  const [milestoneDeadline, setMilestoneDeadline] = useState(new Date().toISOString().split('T')[0]);

  const handleCreateMilestone = () => {
    if (!newMilestoneTitle || !selectedGoalForM) return;
    addGoalMilestone(selectedGoalForM, {
      title: newMilestoneTitle,
      deadline: milestoneDeadline,
      progress: 0,
      status: 'Pending'
    });
    setNewMilestoneTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Milestone Addition Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" /> Thêm Cột mốc (Milestone) mới cho Mục tiêu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select 
            value={selectedGoalForM}
            onChange={e => setSelectedGoalForM(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {goals.map((g: Goal) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          <input 
            type="text"
            placeholder="Tên cột mốc (vd: Đạt 50% khối lượng)..."
            value={newMilestoneTitle}
            onChange={e => setNewMilestoneTitle(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium col-span-1 sm:col-span-2"
          />
          <button type="button" 
            onClick={handleCreateMilestone}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Thêm Milestone
          </button>
        </div>
      </div>

      {/* Milestones List by Goal */}
      <div className="space-y-6">
        {goals.map((g: Goal) => (
          <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-500" /> {g.title}
              </h4>
              <span className="text-xs font-bold text-slate-500">Hạn: {new Date(g.deadline).toLocaleDateString('vi-VN')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {g.milestones && g.milestones.length > 0 ? (
                g.milestones.map(m => (
                  <div key={m.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800">{m.title}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Hạn: {m.deadline}</span>
                      <span className="font-bold text-slate-900">{m.progress}%</span>
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Ma trận Kế hoạch Hành động (Action Matrix)</h3>
        <p className="text-xs text-slate-500">Đảm bảo mỗi mục tiêu đều có dự án, công việc và thói quen tương ứng.</p>
      </div>

      <div className="space-y-4">
        {goals.map((g: Goal) => {
          const linkedProjects = projects.filter((p: any) => g.linkedProjectIds?.includes(p.id) || p.goalId === g.id);

          return (
            <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-base">{g.title}</h4>
                <button type="button" onClick={() => onOpenDetail(g)} className="text-xs text-blue-600 font-bold hover:underline">Chi tiết</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Milestones */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Cột mốc (Milestones)</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {g.milestones?.length || 0} cột mốc được thiết lập
                  </div>
                </div>

                {/* Linked Projects */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Dự án liên kết</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {linkedProjects.length} dự án đang chạy
                  </div>
                </div>

                {/* Action Items */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Hành động cụ thể</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Phân tích Tốc độ (Pace) & Chỉ số KPIs</h3>
        <p className="text-xs text-slate-500">So sánh tốc độ thực tế so với tốc độ cần thiết để hoàn thành đúng hạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g: Goal) => {
          const startDate = new Date(g.startDate || g.deadline);
          const deadlineDate = new Date(g.deadline);
          const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
          const daysPassed = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 3600 * 24)));
          const expectedProgress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
          const paceGap = g.progress - expectedProgress;

          return (
            <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{g.title}</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{g.category}</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  paceGap < -15 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {paceGap < -15 ? 'Chậm tốc độ' : 'Đúng tốc độ'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Tiến độ thực tế: <strong className="text-blue-600">{g.progress}%</strong></span>
                  <span>Tiến độ kỳ vọng: <strong className="text-slate-600">{expectedProgress}%</strong></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${g.progress}%` }}></div>
                </div>
              </div>

              {g.kpis && g.kpis.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">KPIs đo lường</span>
                  {g.kpis.map(k => (
                    <div key={k.id} className="flex justify-between text-xs bg-slate-50 p-2 rounded-lg">
                      <span className="font-bold text-slate-700">{k.title}</span>
                      <span className="font-extrabold text-slate-900">{k.current} / {k.target} {k.unit}</span>
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
  const [selectedGoalId, setSelectedGoalId] = useState(goals?.[0]?.id || '');
  const [multiplier, setMultiplier] = useState(1.5); // 1.5x speed

  const selectedGoal = (goals || []).find((g: Goal) => g.id === selectedGoalId);

  const calculateSimulatedDays = () => {
    if (!selectedGoal) return 0;
    const remainingProgress = 100 - selectedGoal.progress;
    const baseDays = 30; // standard estimation
    return Math.max(1, Math.round(baseDays / multiplier));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <h3 className="font-bold text-slate-900 text-base">Dự báo Tiến độ Hoàn thành Mục tiêu</h3>
        <p className="text-xs text-slate-500">
          Tính toán ngày hoàn thành thực tế dự kiến dựa trên tốc độ thực thi mục tiêu của bạn.
        </p>
      </div>

      {selectedGoal && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">Chọn mục tiêu để dự báo:</label>
            <select 
              value={selectedGoalId} 
              onChange={e => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
            >
              {goals.map((g: Goal) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          {/* Slider for Effort Multiplier */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Hệ số tốc độ thực thi:</span>
              <span className="text-blue-600 text-sm font-black">{multiplier}x nỗ lực</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="3.0" 
              step="0.1" 
              value={multiplier}
              onChange={e => setMultiplier(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.5x (Chậm một nửa)</span>
              <span>1.0x (Tiêu chuẩn)</span>
              <span>3.0x (Tốc lực)</span>
            </div>
          </div>

          {/* Simulation Output */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-extrabold text-blue-700 uppercase">Ước tính thời gian còn lại</span>
              <div className="text-2xl font-black text-blue-900 mt-1">{calculateSimulatedDays()} ngày</div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Dự kiến hoàn thành mới</span>
              <div className="text-xl font-black text-emerald-900 mt-1">
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Rủi ro & Xung đột Tài nguyên</h3>
        <p className="text-xs text-slate-500">Phát hiện tự động các nguy cơ trễ hạn và quá tải thời gian trong ngày.</p>
      </div>

      <div className="space-y-4">
        {atRisk.map((g: Goal) => (
          <div key={g.id} className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold text-[10px] rounded uppercase">
                  {g.riskStatus}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{g.title}</h4>
              </div>
              <p className="text-xs text-slate-500">Tiến độ hiện tại {g.progress}% thấp hơn mức kỳ vọng theo hạn chót {new Date(g.deadline).toLocaleDateString('vi-VN')}.</p>
            </div>
            <button type="button" 
              onClick={() => onOpenDetail(g)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
            >
              Khắc phục
            </button>
          </div>
        ))}
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
    if (!whatWasDone || !selectedGoalId) return;
    addGoalReview(selectedGoalId, {
      date: new Date().toISOString().split('T')[0],
      period: 'weekly',
      whatWasDone,
      lessonsLearned: lessons,
      status
    });
    setWhatWasDone('');
    setLessons('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Viết Nhận xét / Đánh giá Định kỳ</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mục tiêu đánh giá</label>
            <select 
              value={selectedGoalId} 
              onChange={e => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
            >
              {goals.map((g: Goal) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Việc đã làm được trong tuần</label>
            <textarea 
              rows={2}
              value={whatWasDone}
              onChange={e => setWhatWasDone(e.target.value)}
              placeholder="Ghi nhận các kết quả đã đạt được..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bài học & Rút kinh nghiệm</label>
            <textarea 
              rows={2}
              value={lessons}
              onChange={e => setLessons(e.target.value)}
              placeholder="Cần cải thiện điều gì cho tuần tới..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none"
            />
          </div>

          <button type="button" 
            onClick={handleSaveReview}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
          >
            Lưu Nhận xét
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 10. ANALYTICS & GOAL SCORE VIEW
// ----------------------------------------------------------------------
function AnalyticsView({ goals, avgGoalScore }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-2">
        <Award className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-2xl font-black text-slate-900">Goal Score Trung bình: {avgGoalScore}/100</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Chỉ số đo lường tổng hợp sự kỷ luật, tốc độ hoàn thành và mức độ bám sát kế hoạch hành động.
        </p>
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
      title: 'Đạt IELTS 7.0 Quốc tế',
      category: 'Sự nghiệp',
      description: 'Lộ trình chuẩn hóa 4 kỹ năng tiếng Anh trong 90 ngày.',
      target: 100,
      unit: '%',
      color: '#3b82f6'
    },
    {
      title: 'Tiết kiệm 50.000.000 VNĐ Quỹ Khẩn cấp',
      category: 'Tài chính',
      description: 'Quản lý tài chính cá nhân tích lũy dòng tiền dự phòng.',
      target: 50000000,
      unit: 'VNĐ',
      color: '#10b981'
    },
    {
      title: 'Đọc 12 cuốn sách Phát triển bản thân',
      category: 'Phát triển bản thân',
      description: 'Mỗi tháng đọc xong 1 cuốn sách và viết tóm tắt.',
      target: 12,
      unit: 'cuốn',
      color: '#8b5cf6'
    }
  ];

  const handleApply = (t: any) => {
    addGoal({
      id: Math.random().toString(36).substring(2, 9),
      title: t.title,
      category: t.category,
      description: t.description,
      status: 'In Progress',
      priority: 'High',
      progress: 0,
      current: 0,
      target: t.target,
      unit: t.unit,
      deadline: new Date(Date.now() + 90*86400000).toISOString().split('T')[0],
      color: t.color
    });
    setActiveTab('my_goals');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {templates.map((t, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-blue-600 uppercase">{t.category}</span>
          <h4 className="font-bold text-slate-900 text-base">{t.title}</h4>
          <p className="text-xs text-slate-500">{t.description}</p>
          <button type="button" 
            onClick={() => handleApply(t)}
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
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
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          Chưa có mục tiêu nào trong kho lưu trữ.
        </div>
      ) : (
        archived.map((g: Goal) => (
          <div key={g.id} onClick={() => onOpenDetail(g)} className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400">
            <h4 className="font-bold text-slate-900 text-sm">{g.title}</h4>
            <span className="text-xs text-emerald-600 font-bold">{g.status}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// GOAL DETAIL DRAWER
// ----------------------------------------------------------------------
function GoalDetailDrawer({ goal, onClose, onEdit, updateGoal, addGoalReview, toggleGoalAction, addGoalMilestone }: any) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex justify-end bg-slate-900/60 backdrop-blur-xs animate-backdrop-fade cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 animate-modal-enter"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{goal.category}</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
              <Edit2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Progress */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Goal Progress</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-semibold">{goal.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{goal.description}</p>
            </div>
          )}

          {/* Milestones */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Milestones</h4>
            <div className="space-y-2">
              {goal.milestones?.map((m: GoalMilestone) => (
                <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{m.title}</span>
                  <span className="text-slate-500">{m.progress}%</span>
                </div>
              ))}
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
  const [formData, setFormData] = useState({
    id: goal?.id || undefined,
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || 'Personal Growth',
    status: goal?.status || 'In Progress',
    priority: goal?.priority || 'High',
    progress: goal?.progress || 0,
    target: goal?.target || 100,
    current: goal?.current || 0,
    unit: goal?.unit || '%',
    deadline: goal?.deadline || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    color: goal?.color || '#8b5cf6'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const title = (formData.title || '').trim();
    if (!title) {
      setErrorMessage('Please enter goal title');
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave({
        ...formData,
        title,
        current: Number(formData.current) || 0,
        target: Number(formData.target) || 100
      }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save goal');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!goal?.id || !onDelete || isSubmitting) return;
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        setIsSubmitting(true);
        await Promise.resolve(onDelete(goal.id));
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to delete goal');
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 animate-modal-enter my-auto"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{goal ? 'Edit Goal' : 'New Goal'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define your milestones and target metrics</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
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
                Goal Title <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                required
                autoFocus
                value={formData.title} 
                onChange={e=>setFormData({...formData, title: e.target.value})} 
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                placeholder="e.g. Master JLPT N2, Build SaaS MVP"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e=>setFormData({...formData, category: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Sự nghiệp">Career</option>
                  <option value="Tài chính">Finance</option>
                  <option value="Sức khoẻ">Health</option>
                  <option value="Học tập">Education</option>
                  <option value="Phát triển bản thân">Personal Growth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
                <select 
                  value={formData.priority} 
                  onChange={e=>setFormData({...formData, priority: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current Value</label>
                <input 
                  type="number" 
                  step="any"
                  value={formData.current} 
                  onChange={e=>setFormData({...formData, current: Number(e.target.value)})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold" 
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Value</label>
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
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Unit</label>
                <input 
                  type="text" 
                  value={formData.unit} 
                  onChange={e=>setFormData({...formData, unit: e.target.value})} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="%, hours, books, VND..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Deadline</label>
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
                Delete
              </button>
            ) : <div />}
            <div className="flex items-center gap-2.5">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="px-4 py-2.5 min-h-[44px] text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Goal</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
