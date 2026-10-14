import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BrainCircuit, Plus, Scale, ShieldAlert, GitCompare, Play, 
  BarChart2, ListOrdered, TrendingUp, Zap, CheckCircle2, 
  BookOpen, SlidersHorizontal 
} from 'lucide-react';
import { 
  DecisionItem, 
  DecisionCategory, 
  DecisionImportance, 
  DecisionThreshold 
} from '../lib/types';

// Tab Subcomponents
import { DecisionDashboardTab } from './decision/DecisionDashboardTab';
import { DecisionListTab } from './decision/DecisionListTab';
import { DecisionCreateTab } from './decision/DecisionCreateTab';
import { DecisionMatrixTab } from './decision/DecisionMatrixTab';
import { DecisionRisksTab } from './decision/DecisionRisksTab';
import { DecisionImpactTab } from './decision/DecisionImpactTab';
import { DecisionSimulatorTab } from './decision/DecisionSimulatorTab';
import { DecisionCompareTab } from './decision/DecisionCompareTab';
import { DecisionExecutionTab } from './decision/DecisionExecutionTab';
import { DecisionReviewTab } from './decision/DecisionReviewTab';
import { DecisionKnowledgeTab } from './decision/DecisionKnowledgeTab';
import { DecisionRulesTab } from './decision/DecisionRulesTab';

export function DecisionEngineView() {
  const { 
    decisions = [], 
    decisionRules = [], 
    goals = [], 
    projects = [], 
    tasks = [], 
    dailyCapacity = 8, 
    currentUser,
    addDecision,
    updateDecision,
    deleteDecision,
    selectDecisionOption,
    convertDecisionToExecution,
    toggleDecisionRule
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'list' | 'create' | 'matrix' | 'risks' | 'impact' | 'simulator' | 'compare' | 'execution' | 'review' | 'knowledge' | 'rules'
  >('dashboard');

  const [selectedDecisionId, setSelectedDecisionId] = useState<string>(
    decisions[0]?.id || ''
  );

  // Filters for My Decisions List
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Creation State
  const [newTitle, setNewTitle] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newConstraints, setNewConstraints] = useState<string>('');
  const [newCategory, setNewCategory] = useState<DecisionCategory>('Purchases');
  const [newImportance, setNewImportance] = useState<DecisionImportance>('Medium');
  const [newTags, setNewTags] = useState('');
  const [newGoalId, setNewGoalId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');

  // What-if Simulator selected option
  const [simulatedOptionId, setSimulatedOptionId] = useState<string>('');
  const [scenarioApplied, setScenarioApplied] = useState(false);

  // Review state form
  const [revActualCost, setRevActualCost] = useState<number>(0);
  const [revActualBenefit, setRevActualBenefit] = useState<number>(8);
  const [revActualDays, setRevActualDays] = useState<number>(30);
  const [revNotes, setRevNotes] = useState('');
  const [revLessons, setRevLessons] = useState('');
  const [revRating, setRevRating] = useState<number>(5);

  const FALLBACK_DECISION: DecisionItem = {
    id: 'dec_default',
    title: 'Lựa chọn chiến lược',
    problemStatement: 'Chưa có quyết định nào được chọn.',
    whyReason: 'Thiết lập quyết định để tối ưu hóa nguồn lực.',
    deadline: new Date().toISOString().split('T')[0],
    constraints: ['Ngân sách hợp lý'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'Career',
    importance: 'Medium',
    threshold: 'Standard',
    status: 'Draft',
    tags: ['default'],
    owner: 'User',
    goalId: null,
    projectId: null,
    criteria: [
      { id: 'c1', name: 'Chi phí', weight: 30, type: 'numeric', direction: 'lower_is_better' },
      { id: 'c2', name: 'Hiệu quả', weight: 40, type: 'scale', direction: 'higher_is_better' },
      { id: 'c3', name: 'Rủi ro', weight: 30, type: 'scale', direction: 'lower_is_better' }
    ],
    options: [
      {
        id: 'opt_1',
        name: 'Phương án A',
        description: 'Lựa chọn mặc định',
        cost: 0,
        timeHours: 0,
        benefits: ['Dễ thực hiện'],
        risks: [],
        scores: [],
        baseWeightedScore: 7,
        goalImpactScore: 7,
        financialImpactScore: 7,
        riskAdjustmentScore: 0,
        timeImpactScore: 7,
        finalScore: 7
      }
    ],
    history: []
  };

  // Active Decision reference
  const currentDecision = (decisions && decisions.length > 0)
    ? (decisions.find(d => d.id === selectedDecisionId) || decisions[0])
    : FALLBACK_DECISION;

  // Workload calculations
  const totalPlannedHours = (tasks || [])
    .filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy')
    .reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
  const workloadPercentage = Math.round((totalPlannedHours / dailyCapacity) * 100);

  // Metrics
  const activeCount = (decisions || []).filter(d => ['Draft', 'Collecting Information', 'Comparing', 'Ready to Decide'].includes(d.status)).length;
  const highRiskCount = (decisions || []).filter(d => d.importance === 'Critical' || (d.options || []).some(o => o.risks?.some(r => r.severity === 'Critical' || r.severity === 'High'))).length;
  const completedCount = (decisions || []).filter(d => d.status === 'Completed').length;
  const totalCost = (decisions || []).reduce((acc, d) => {
    const selOpt = (d.options || []).find(o => o.id === d.selectedOptionId);
    return acc + (selOpt?.cost || d.options?.[0]?.cost || 0);
  }, 0);

  const reviewsList = (decisions || []).filter(d => d.review).map(d => d.review!);
  const avgSuccessRate = reviewsList.length > 0 
    ? Math.round((reviewsList.reduce((acc, r) => acc + r.successRating, 0) / (reviewsList.length * 5)) * 100)
    : 92;

  const decisionScores = (decisions || []).flatMap(d => (d.options || []).map(o => o.finalScore)).filter(Boolean);
  const avgDecisionScore = decisionScores.length > 0 
    ? (decisionScores.reduce((a, b) => a + b, 0) / decisionScores.length).toFixed(1)
    : '8.4';

  const calculateThreshold = (cost: number, importance: DecisionImportance): DecisionThreshold => {
    if (cost > 5000000 || importance === 'Critical' || importance === 'High') return 'Full';
    if (cost >= 500000) return 'Standard';
    return 'Quick';
  };

  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblem.trim()) return;

    const constraintsArray = newConstraints.split('\n').filter(c => c.trim().length > 0);
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);

    const estCost = constraintsArray.find(c => c.includes('Budget') || c.includes('triệu')) ? 10000000 : 0;
    const threshold = calculateThreshold(estCost, newImportance);

    const newDecItem: DecisionItem = {
      id: `dec_${Math.random().toString(36).substr(2, 9)}`,
      title: newTitle,
      problemStatement: newProblem,
      whyReason: newWhy || 'Giải quyết vấn đề hiệu quả và phát triển bền vững.',
      deadline: newDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      constraints: constraintsArray.length > 0 ? constraintsArray : ['Nguồn lực thời gian & ngân sách hợp lý'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: newCategory,
      importance: newImportance,
      threshold,
      status: 'Collecting Information',
      tags: tagsArray.length > 0 ? tagsArray : ['decision'],
      owner: currentUser?.name || 'User',
      goalId: newGoalId || null,
      projectId: newProjectId || null,
      criteria: [
        { id: 'c1', name: 'Chi phí (VND)', weight: 30, type: 'numeric', direction: 'lower_is_better' },
        { id: 'c2', name: 'Lợi ích & Hiệu năng', weight: 40, type: 'scale', direction: 'higher_is_better' },
        { id: 'c3', name: 'Thời gian & Mức độ rủi ro', weight: 30, type: 'scale', direction: 'higher_is_better' }
      ],
      options: [
        {
          id: `opt_a_${Date.now()}`,
          name: 'Phương án A (Tối ưu nguồn lực)',
          description: 'Giải pháp tiêu chuẩn đảm bảo mục tiêu với chi phí vừa phải.',
          cost: 15000000,
          timeHours: 20,
          benefits: ['Đáp ứng 90% yêu cầu', 'Tiết kiệm chi phí'],
          risks: [],
          scores: [
            { criterionId: 'c1', rawScore: 8, calculatedScore: 8 },
            { criterionId: 'c2', rawScore: 8, calculatedScore: 8 },
            { criterionId: 'c3', rawScore: 9, calculatedScore: 9 }
          ],
          baseWeightedScore: 8.3,
          goalImpactScore: 0.3,
          financialImpactScore: 0.1,
          riskAdjustmentScore: 0,
          timeImpactScore: 0.1,
          finalScore: 8.8
        }
      ],
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Khởi tạo Quyết định mới',
          author: currentUser?.name || 'User',
          details: 'Xác định bài toán và đưa vào hệ thống Decision Engine.'
        }
      ]
    };

    addDecision(newDecItem);
    setSelectedDecisionId(newDecItem.id);
    setActiveSubTab('matrix');

    // Reset form
    setNewTitle('');
    setNewProblem('');
    setNewWhy('');
    setNewDeadline('');
    setNewConstraints('');
    setNewTags('');
  };

  const filteredDecisions = decisions.filter(d => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.problemStatement.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-8 text-slate-800 dark:text-slate-100 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-purple-100/60 dark:border-purple-900/30 pb-4 sm:pb-6 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-violet-500 via-pink-500 to-rose-400 text-white rounded-2xl shadow-md shadow-pink-500/25 shrink-0">
              <BrainCircuit className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Động Cơ Ra Quyết Định ✨
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-black bg-pink-100 text-pink-700 dark:bg-purple-950/60 dark:text-pink-300 rounded-full border border-pink-200 dark:border-purple-800">
                  Decision Pro v2.5
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-medium">
                Hệ thống phân tích bài toán, lập ma trận trọng số, quản trị rủi ro & mô phỏng kịch bản ra quyết định.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button type="button"
            onClick={() => setActiveSubTab('create')}
            className="btn-squishy px-4 py-2.5 bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white font-black rounded-2xl shadow-md shadow-pink-500/25 transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            + Tạo Decision mới ✨
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-purple-100/60 dark:border-purple-900/30">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'list', label: 'My Decisions', icon: ListOrdered },
          { id: 'create', label: 'Tạo Decision', icon: Plus },
          { id: 'matrix', label: 'Decision Matrix', icon: Scale },
          { id: 'risks', label: 'Risk Engine', icon: ShieldAlert },
          { id: 'impact', label: 'Impact & Trade-off', icon: TrendingUp },
          { id: 'simulator', label: 'Dự báo Phương án', icon: Zap },
          { id: 'compare', label: 'So sánh', icon: GitCompare },
          { id: 'execution', label: 'Thực thi Execution', icon: Play },
          { id: 'review', label: 'Review Đánh giá', icon: CheckCircle2 },
          { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
          { id: 'rules', label: 'Rules & Thresholds', icon: SlidersHorizontal },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`btn-squishy px-3.5 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-purple-150/60 dark:border-purple-900/40 hover:bg-violet-50/70 dark:hover:bg-purple-950/30 hover:text-purple-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'dashboard' && (
        <DecisionDashboardTab
          decisions={decisions}
          activeCount={activeCount}
          highRiskCount={highRiskCount}
          completedCount={completedCount}
          avgDecisionScore={avgDecisionScore}
          avgSuccessRate={avgSuccessRate}
          totalCost={totalCost}
          dailyCapacity={dailyCapacity}
          totalPlannedHours={totalPlannedHours}
          workloadPercentage={workloadPercentage}
          decisionRules={decisionRules}
          onSelectDecision={id => {
            setSelectedDecisionId(id);
            setActiveSubTab('matrix');
          }}
          onNavigateTab={tab => setActiveSubTab(tab)}
        />
      )}

      {activeSubTab === 'list' && (
        <DecisionListTab
          filteredDecisions={filteredDecisions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onSelectDecision={id => {
            setSelectedDecisionId(id);
            setActiveSubTab('matrix');
          }}
          onNavigateTab={tab => setActiveSubTab(tab)}
          onDeleteDecision={id => deleteDecision(id)}
        />
      )}

      {activeSubTab === 'create' && (
        <DecisionCreateTab
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newProblem={newProblem}
          setNewProblem={setNewProblem}
          newWhy={newWhy}
          setNewWhy={setNewWhy}
          newDeadline={newDeadline}
          setNewDeadline={setNewDeadline}
          newConstraints={newConstraints}
          setNewConstraints={setNewConstraints}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          newImportance={newImportance}
          setNewImportance={setNewImportance}
          newGoalId={newGoalId}
          setNewGoalId={setNewGoalId}
          newProjectId={newProjectId}
          setNewProjectId={setNewProjectId}
          goals={goals}
          projects={projects}
          onSubmit={handleCreateDecision}
          onCancel={() => setActiveSubTab('list')}
        />
      )}

      {activeSubTab === 'matrix' && (
        <DecisionMatrixTab
          decisions={decisions}
          selectedDecisionId={selectedDecisionId}
          setSelectedDecisionId={setSelectedDecisionId}
          currentDecision={currentDecision}
          selectDecisionOption={(dId, optId) => selectDecisionOption(dId, optId)}
          convertDecisionToExecution={dId => convertDecisionToExecution(dId)}
        />
      )}

      {activeSubTab === 'risks' && (
        <DecisionRisksTab
          currentDecision={currentDecision}
          decisions={decisions}
          selectedDecisionId={selectedDecisionId}
          setSelectedDecisionId={setSelectedDecisionId}
        />
      )}

      {activeSubTab === 'impact' && (
        <DecisionImpactTab
          currentDecision={currentDecision}
          decisions={decisions}
          selectedDecisionId={selectedDecisionId}
          setSelectedDecisionId={setSelectedDecisionId}
        />
      )}

      {activeSubTab === 'simulator' && (
        <DecisionSimulatorTab
          currentDecision={currentDecision}
          simulatedOptionId={simulatedOptionId}
          setSimulatedOptionId={setSimulatedOptionId}
          scenarioApplied={scenarioApplied}
          setScenarioApplied={setScenarioApplied}
          selectDecisionOption={(dId, optId) => selectDecisionOption(dId, optId)}
        />
      )}

      {activeSubTab === 'compare' && (
        <DecisionCompareTab
          currentDecision={currentDecision}
          decisions={decisions}
          selectedDecisionId={selectedDecisionId}
          setSelectedDecisionId={setSelectedDecisionId}
        />
      )}

      {activeSubTab === 'execution' && (
        <DecisionExecutionTab
          decisions={decisions}
          convertDecisionToExecution={dId => convertDecisionToExecution(dId)}
        />
      )}

      {activeSubTab === 'review' && (
        <DecisionReviewTab
          currentDecision={currentDecision}
          decisions={decisions}
          selectedDecisionId={selectedDecisionId}
          setSelectedDecisionId={setSelectedDecisionId}
          revActualCost={revActualCost}
          setRevActualCost={setRevActualCost}
          revActualBenefit={revActualBenefit}
          setRevActualBenefit={setRevActualBenefit}
          revActualDays={revActualDays}
          setRevActualDays={setRevActualDays}
          revNotes={revNotes}
          setRevNotes={setRevNotes}
          revLessons={revLessons}
          setRevLessons={setRevLessons}
          revRating={revRating}
          setRevRating={setRevRating}
          updateDecision={(id, updates) => updateDecision(id, updates)}
        />
      )}

      {activeSubTab === 'knowledge' && (
        <DecisionKnowledgeTab decisions={decisions} />
      )}

      {activeSubTab === 'rules' && (
        <DecisionRulesTab
          decisionRules={decisionRules}
          toggleDecisionRule={rId => toggleDecisionRule(rId)}
        />
      )}
    </div>
  );
}
export default DecisionEngineView;
