import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';

import { 
  BrainCircuit, 
  AlertTriangle, 
  Clock, 
  Target, 
  DollarSign, 
  Layers, 
  Filter, 
  Plus, 
  ChevronRight, 
  Scale, 
  ShieldAlert, 
  GitCompare, 
  Play, 
  Check, 
  X, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  FileText, 
  Sliders, 
  TrendingUp, 
  BarChart2, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User, 
  Tag, 
  FolderSymlink, 
  Award, 
  Trash2, 
  Edit3, 
  Eye, 
  ArrowUpRight, 
  Activity, 
  Zap, 
  ListOrdered,
  Briefcase,
  HelpCircle,
  History,
  FolderTree,
  SlidersHorizontal,
  ThumbsUp,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  DecisionItem, 
  DecisionCategory, 
  DecisionImportance, 
  DecisionStatus, 
  DecisionThreshold, 
  DecisionCriterion, 
  DecisionOption, 
  DecisionRiskItem, 
  DecisionOpportunityCost, 
  DecisionReviewData, 
  DecisionRule 
} from '../lib/types';

export function DecisionEngineView() {
  const { 
    decisions, 
    decisionRules, 
    goals, 
    projects, 
    tasks, 
    dailyCapacity, 
    currentUser,
    addDecision,
    updateDecision,
    deleteDecision,
    selectDecisionOption,
    convertDecisionToExecution,
    
    addDecisionRule,
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

  // Classifier helper
  const calculateThreshold = (cost: number, importance: DecisionImportance): DecisionThreshold => {
    if (cost > 5000000 || importance === 'Critical' || importance === 'High') return 'Full';
    if (cost >= 500000) return 'Standard';
    return 'Quick';
  };

  // Create Decision Handler
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

  // Filtered decisions list
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-24 text-slate-800">
      
      {/* ---------------------------------------------------------------------- */}
      {/* HEADER & MAIN ENGINE TITLE */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Decision Engine
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                  Core Logic v2.5
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                Hệ thống phân tích bài toán, lập ma trận trọng số, quản trị rủi ro & mô phỏng kịch bản ra quyết định.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button type="button"
            onClick={() => setActiveSubTab('create')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo Decision mới
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SUB-TAB NAVIGATION BAR */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ====================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Executive Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Đang chờ & Đánh giá
              </span>
              <p className="text-2xl font-black text-slate-900">{activeCount}</p>
              <span className="text-[11px] text-amber-600 font-medium">Cần xử lý gần nhất</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Rủi ro cao / Quan trọng
              </span>
              <p className="text-2xl font-black text-slate-900">{highRiskCount}</p>
              <span className="text-[11px] text-red-600 font-medium">Critical & High</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Đã ra quyết định / Review
              </span>
              <p className="text-2xl font-black text-slate-900">{completedCount}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Hoàn thành theo dõi</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-500" />
                Avg Decision Score
              </span>
              <p className="text-2xl font-black text-slate-900">{avgDecisionScore} <span className="text-xs font-normal text-slate-400">/ 10</span></p>
              <span className="text-[11px] text-blue-600 font-medium">Chất lượng ma trận</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                Success Rate
              </span>
              <p className="text-2xl font-black text-slate-900">{avgSuccessRate}%</p>
              <span className="text-[11px] text-purple-600 font-medium">Theo kết quả thực tế</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Tổng Chi phí Dự kiến
              </span>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalCost)}</p>
              <span className="text-[11px] text-slate-500 font-medium">Các phương án chọn</span>
            </div>
          </div>

          {/* Decision Pipeline Status Breakdown */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Quy trình ra Quyết định (Decision Lifecycle Pipeline)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {[
                { status: 'Draft', label: 'Bản thảo', color: 'bg-slate-100 text-slate-700' },
                { status: 'Collecting Information', label: 'Thu thập tin', color: 'bg-blue-50 text-blue-700' },
                { status: 'Comparing', label: 'Ma trận So sánh', color: 'bg-indigo-50 text-indigo-700' },
                { status: 'Ready to Decide', label: 'Sẵn sàng chọn', color: 'bg-amber-50 text-amber-700' },
                { status: 'Decided', label: 'Đã chọn', color: 'bg-emerald-50 text-emerald-700' },
                { status: 'Implementing', label: 'Thực thi', color: 'bg-cyan-50 text-cyan-700' },
                { status: 'Reviewing', label: 'Review Thực tế', color: 'bg-purple-50 text-purple-700' },
                { status: 'Completed', label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
                { status: 'Cancelled', label: 'Hủy bỏ', color: 'bg-rose-50 text-rose-700' },
              ].map(st => {
                const count = decisions.filter(d => d.status === st.status).length;
                return (
                  <div key={st.status} className={`p-3 rounded-xl border border-slate-100 ${st.color} text-center`}>
                    <p className="text-xs font-semibold">{st.label}</p>
                    <p className="text-lg font-black mt-1">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Dashboard Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Urgent & Important Decisions */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Quyết định Quan trọng & Sắp đến hạn
                  </h3>
                  <button type="button" 
                    onClick={() => setActiveSubTab('list')} 
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Xem tất cả ({decisions.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {(decisions || []).slice(0, 3).map(dec => {
                    const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
                    return (
                      <div 
                        key={dec.id}
                        className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              dec.importance === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' :
                              dec.importance === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {dec.importance} Importance
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-md">
                              {dec.category}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Hạn ra QĐ: {dec.deadline}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-base">{dec.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-1">{dec.problemStatement}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-medium block">Best Score</span>
                            <span className="text-base font-extrabold text-blue-600">
                              {selOpt?.finalScore || 8.0}/10
                            </span>
                          </div>
                          <button type="button"
                            onClick={() => {
                              setSelectedDecisionId(dec.id);
                              setActiveSubTab('matrix');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1"
                          >
                            Phân tích Matrix <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cross-module Impact Center */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <FolderSymlink className="w-5 h-5 text-purple-600" />
                  Ảnh hưởng Liên liên kết (Cross-Module Impacts)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Finance Impact
                    </span>
                    <p className="text-sm font-bold text-slate-900">Chi phí đầu tư</p>
                    <p className="text-xs text-emerald-700">Ảnh hưởng trực tiếp ngân sách tháng & Quỹ tiết kiệm</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                    <span className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                      <Target className="w-4 h-4 text-blue-600" /> Goal Alignment
                    </span>
                    <p className="text-sm font-bold text-slate-900">Liên kết Mục tiêu</p>
                    <p className="text-xs text-blue-700">Tác động tiến độ Goals học tập & sự nghiệp</p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-1">
                    <span className="text-xs font-semibold text-indigo-800 flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-indigo-600" /> Project Execution
                    </span>
                    <p className="text-sm font-bold text-slate-900">Đầu ra Dự án</p>
                    <p className="text-xs text-indigo-700">Sinh ra các Task và Project thực thi trực tiếp</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                    <span className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-purple-600" /> Capacity Impact
                    </span>
                    <p className="text-sm font-bold text-slate-900">Thời gian & Quỹ sức</p>
                    <p className="text-xs text-purple-700">Ảnh hưởng dung lượng làm việc 20-30h/tháng</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity & System Monitor Sidebar */}
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Resource Workload Monitor
                </h3>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Daily Capacity</span>
                    <span className="font-bold text-slate-900">{dailyCapacity}h / ngày</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Total Planned Tasks</span>
                    <span className="font-bold text-slate-900">{totalPlannedHours}h</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Tải công việc hiện tại</span>
                    <span className={`font-bold ${workloadPercentage > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {workloadPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${workloadPercentage > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {workloadPercentage > 100 && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>Hệ thống cảnh báo quá tải thời gian. Xem xét trì hoãn quyết định chưa khẩn cấp!</span>
                  </div>
                )}
              </div>

              {/* Quick Decision Rules List */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                    Quy tắc Ra quyết định
                  </h3>
                  <button type="button" onClick={() => setActiveSubTab('rules')} className="text-xs text-blue-600 font-semibold hover:underline">
                    Quản lý Rules
                  </button>
                </div>

                <div className="space-y-2.5">
                  {decisionRules.map(rule => (
                    <div key={rule.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{rule.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${rule.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {rule.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-slate-500 font-mono text-[11px]">{rule.condition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 2: MY DECISIONS LIST */}
      {/* ====================================================================== */}
      {activeSubTab === 'list' && (
        <div className="space-y-6">
          
          {/* Controls & Search */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input 
                type="text"
                placeholder="Tìm kiếm quyết định, vấn đề, tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Tất cả Category</option>
                <option value="Purchases">Purchases (Sắm sửa)</option>
                <option value="Career">Career (Sự nghiệp)</option>
                <option value="Finance">Finance (Tài chính)</option>
                <option value="Study">Study (Học tập)</option>
                <option value="Projects">Projects (Dự án)</option>
                <option value="Personal">Personal (Cá nhân)</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="Collecting Information">Collecting Info</option>
                <option value="Comparing">Comparing</option>
                <option value="Decided">Decided</option>
                <option value="Implementing">Implementing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-900">{filteredDecisions.length}</span> quyết định
            </div>
          </div>

          {/* Decisions List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(filteredDecisions || []).map(dec => {
              const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
              return (
                <div 
                  key={dec.id}
                  className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                        {dec.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          dec.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          dec.status === 'Decided' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dec.status}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                          {dec.threshold} Analysis
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-snug">{dec.title}</h3>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                      <span className="font-bold text-slate-700 block">Bài toán (Problem):</span>
                      <p className="text-slate-600 line-clamp-2">{dec.problemStatement}</p>
                    </div>

                    {dec.constraints && dec.constraints.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Constraints:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {dec.constraints.map((c, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-md">
                              • {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Selected / Best Option:</span>
                      <span className="text-sm font-bold text-slate-800 line-clamp-1">{selOpt?.name || 'Chưa chọn'}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button"
                        onClick={() => {
                          setSelectedDecisionId(dec.id);
                          setActiveSubTab('matrix');
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
                      >
                        Mở Matrix
                      </button>

                      <button type="button"
                        onClick={() => deleteDecision(dec.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Xóa Quyết định"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 3: CREATE NEW DECISION WIZARD */}
      {/* ====================================================================== */}
      {activeSubTab === 'create' && (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-600" />
              Khởi tạo Quyết định Mới (Problem Definition)
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Xác định rõ bản chất bài toán, lý do, hạn chót và rào cản khống chế trước khi xây dựng ma trận phương án.
            </p>
          </div>

          <form onSubmit={handleCreateDecision} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên Quyết định (Decision Title) *
              </label>
              <input 
                type="text"
                required
                placeholder="Ví dụ: Chọn Mua Laptop mới phục vụ Học tập & Lập trình"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What? — Vấn đề cần giải quyết (Problem Statement) *
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Tôi đang cần quyết định điều gì? Chi tiết thực trạng khó khăn..."
                  value={newProblem}
                  onChange={e => setNewProblem(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Why? — Tại sao phải quyết định? (Context & Purpose)
                </label>
                <textarea 
                  rows={3}
                  placeholder="Lý do động lực thúc đẩy? Nếu không quyết định thì sao?"
                  value={newWhy}
                  onChange={e => setNewWhy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deadline ra Quyết định
                </label>
                <input 
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category (Lĩnh vực)
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as DecisionCategory)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Purchases">Purchases (Mua sắm)</option>
                  <option value="Career">Career (Sự nghiệp)</option>
                  <option value="Finance">Finance (Tài chính)</option>
                  <option value="Study">Study (Học tập)</option>
                  <option value="Projects">Projects (Dự án)</option>
                  <option value="Personal">Personal (Cá nhân)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mức độ Quan trọng (Importance)
                </label>
                <select
                  value={newImportance}
                  onChange={e => setNewImportance(e.target.value as DecisionImportance)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Low">Low (Thấp)</option>
                  <option value="Medium">Medium (Trung bình)</option>
                  <option value="High">High (Cao)</option>
                  <option value="Critical">Critical (Nghiêm trọng)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Constraints? — Các điều kiện khống chế (Mỗi dòng 1 điều kiện)
              </label>
              <textarea 
                rows={3}
                placeholder={"Ví dụ:\nBudget <= 30 triệu\nKhông ảnh hưởng Quỹ Tiết kiệm\nDùng ổn định ít nhất 4 năm"}
                value={newConstraints}
                onChange={e => setNewConstraints(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Goal Liên quan (Optional)
                </label>
                <select
                  value={newGoalId}
                  onChange={e => setNewGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">-- Không chọn --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Liên quan (Optional)
                </label>
                <select
                  value={newProjectId}
                  onChange={e => setNewProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">-- Không chọn --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-all"
              >
                Hủy bỏ
              </button>
              <button type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                Tạo Decision & Xây Ma trận <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 4: WEIGHTED DECISION MATRIX & OPTIONS */}
      {/* ====================================================================== */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-8">
          
          {/* Decision Selector & Status Header */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Đang phân tích Decision:</span>
                <select
                  value={selectedDecisionId}
                  onChange={e => setSelectedDecisionId(e.target.value)}
                  className="text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  {decisions.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              {currentDecision && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 text-xs font-bold rounded-xl border ${
                    currentDecision.status === 'Decided' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    Trạng thái: {currentDecision.status}
                  </span>
                  <span className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                    Threshold: {currentDecision.threshold} Analysis
                  </span>
                </div>
              )}
            </div>

            {currentDecision && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Bài toán (Problem):</span>
                  <p className="text-slate-600">{currentDecision.problemStatement}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Constraints (Khống chế):</span>
                  <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                    {currentDecision.constraints?.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {currentDecision && (
            <div className="space-y-8">
              
              {/* Criteria Engine Section */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    1. Bộ Tiêu chí Đánh giá (Criteria Engine)
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Tổng trọng số: <span className="font-bold text-blue-600">
                      {currentDecision.criteria.reduce((sum, c) => sum + c.weight, 0)}%
                    </span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Tên Tiêu chí</th>
                        <th className="p-3">Trọng số (%)</th>
                        <th className="p-3">Chiều hướng (Direction)</th>
                        <th className="p-3">Must-have / Deal Breaker Limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDecision.criteria.map(crit => (
                        <tr key={crit.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{crit.name}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">{crit.weight}%</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              crit.direction === 'higher_is_better' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {crit.direction === 'higher_is_better' ? 'Higher is better ↑' : 'Lower is better ↓'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {crit.maxAcceptableValue && `Max limit: ${formatCurrency(crit.maxAcceptableValue)}`}
                            {crit.minAcceptableValue && `Min limit: ${crit.minAcceptableValue} ${crit.unit || ''}`}
                            {!crit.maxAcceptableValue && !crit.minAcceptableValue && '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weighted Decision Matrix Table */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 overflow-x-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    2. Ma trận So sánh Trọng số (Weighted Decision Matrix)
                  </h3>
                  <span className="text-xs text-slate-400">Scores calculated on 10-point scale</span>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3.5 rounded-tl-xl">Tiêu chí (Criteria)</th>
                      <th className="p-3.5">Weight</th>
                      {currentDecision.options.map(opt => (
                        <th key={opt.id} className="p-3.5 text-center border-l border-slate-800">
                          <div>{opt.name}</div>
                          {opt.isDisqualified && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded block mt-1">
                              DISQUALIFIED
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentDecision.criteria.map(crit => (
                      <tr key={crit.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{crit.name}</td>
                        <td className="p-3 font-mono text-slate-500">{crit.weight}%</td>
                        {currentDecision.options.map(opt => {
                          const scoreObj = opt.scores?.find(s => s.criterionId === crit.id);
                          return (
                            <td key={opt.id} className="p-3 text-center border-l border-slate-100 font-mono text-slate-700">
                              <span className="font-bold text-slate-900">{scoreObj?.rawScore || 7}</span> / 10
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Total Weighted Score Rows */}
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                      <td className="p-3.5 text-slate-900">1. Base Weighted Score (Σ Score × Weight)</td>
                      <td className="p-3.5 font-mono">100%</td>
                      {currentDecision.options.map(opt => (
                        <td key={opt.id} className="p-3.5 text-center border-l border-slate-200 font-mono text-sm text-blue-700">
                          {opt.baseWeightedScore || 8.0}
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-slate-50 text-slate-600 font-medium">
                      <td className="p-3">2. Goal Impact Adjustment</td>
                      <td className="p-3">—</td>
                      {currentDecision.options.map(opt => (
                        <td key={opt.id} className="p-3 text-center border-l border-slate-200 font-mono text-emerald-600">
                          +{opt.goalImpactScore || 0.3}
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-slate-50 text-slate-600 font-medium">
                      <td className="p-3">3. Financial Impact Adjustment</td>
                      <td className="p-3">—</td>
                      {currentDecision.options.map(opt => (
                        <td key={opt.id} className="p-3 text-center border-l border-slate-200 font-mono text-amber-600">
                          {opt.financialImpactScore || -0.2}
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-slate-50 text-slate-600 font-medium">
                      <td className="p-3">4. Risk & Time Adjustment</td>
                      <td className="p-3">—</td>
                      {currentDecision.options.map(opt => (
                        <td key={opt.id} className="p-3 text-center border-l border-slate-200 font-mono text-rose-600">
                          {opt.riskAdjustmentScore || -0.1}
                        </td>
                      ))}
                    </tr>

                    {/* Final Decision Score Header Row */}
                    <tr className="bg-blue-600 text-white font-extrabold text-sm">
                      <td className="p-4 rounded-bl-xl">FINAL DECISION SCORE</td>
                      <td className="p-4 font-mono">TOTAL</td>
                      {currentDecision.options.map(opt => (
                        <td key={opt.id} className="p-4 text-center border-l border-blue-500 font-mono text-base">
                          {opt.finalScore} / 10
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed Option Cards & Action Picker */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  3. Lựa chọn Phương án (Option Selection)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {currentDecision.options.map(opt => {
                    const isSelected = currentDecision.selectedOptionId === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                          opt.isDisqualified ? 'bg-red-50/30 border-red-200 opacity-80' :
                          isSelected ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                              {opt.finalScore} <span className="text-xs font-normal text-slate-400">/ 10</span>
                            </span>

                            {isSelected && (
                              <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Đã chọn
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-900 text-base">{opt.name}</h4>
                          <p className="text-xs text-slate-600">{opt.description}</p>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-500">Chi phí:</span>
                              <span className="text-slate-900">{formatCurrency(opt.cost)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-500">Thời gian yêu cầu:</span>
                              <span className="text-slate-900">{opt.timeHours} giờ</span>
                            </div>
                          </div>

                          {opt.isDisqualified && (
                            <div className="p-3 bg-red-100 rounded-xl text-xs text-red-800 font-semibold space-y-0.5">
                              {opt.disqualificationReason}
                            </div>
                          )}

                          {opt.benefits && opt.benefits.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-slate-400 uppercase">Ưu điểm nổi bật:</span>
                              <ul className="text-xs text-slate-700 space-y-0.5">
                                {opt.benefits.map((b, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          {opt.isDisqualified ? (
                            <button type="button" disabled className="w-full py-2 bg-slate-200 text-slate-500 font-medium text-xs rounded-xl cursor-not-allowed">
                              Không đạt Must-Have
                            </button>
                          ) : isSelected ? (
                            <button type="button" 
                              onClick={() => convertDecisionToExecution(currentDecision.id)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5" /> Chuyển sang Execution Task
                            </button>
                          ) : (
                            <button type="button" 
                              onClick={() => selectDecisionOption(currentDecision.id, opt.id)}
                              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-all"
                            >
                              Chấp nhận Phương án này
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 5: RISK ENGINE */}
      {/* ====================================================================== */}
      {activeSubTab === 'risks' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              Risk Engine — Quản trị & Dự báo Rủi ro
            </h2>
            <p className="text-xs text-slate-500">
              Mô hình đánh giá rủi ro 2 chiều: <span className="font-bold text-slate-800">Risk Score = Xác suất (Probability 1-5) × Mức độ tác động (Impact 1-5)</span>.
            </p>
          </div>

          {currentDecision ? (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">
                  Danh sách Rủi ro cho: <span className="text-blue-600">{currentDecision.title}</span>
                </h3>

                <div className="space-y-4">
                  {currentDecision.options.flatMap(o => o.risks || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa ghi nhận rủi ro nguy hiểm nào.</p>
                  ) : (
                    currentDecision.options.flatMap(o => o.risks || []).map(risk => {
                      const score = risk.probability * risk.impact;
                      return (
                        <div key={risk.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                risk.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                risk.severity === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {risk.severity} Severity
                              </span>
                              <span className="text-xs font-bold text-slate-800">{risk.title}</span>
                            </div>

                            <span className="text-xs font-mono font-bold text-slate-700">
                              Risk Score: <span className="text-red-600 font-extrabold">{score}</span> / 25
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                              <span className="font-bold text-slate-700 block mb-0.5">Nguyên nhân (Cause):</span>
                              <p className="text-slate-600">{risk.cause || 'N/A'}</p>
                            </div>
                            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="font-bold text-emerald-800 block mb-0.5">Biện pháp giảm thiểu (Mitigation):</span>
                              <p className="text-emerald-700">{risk.mitigation || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Chưa chọn Decision.</p>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 6: IMPACT & OPPORTUNITY COST */}
      {/* ====================================================================== */}
      {activeSubTab === 'impact' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              Impact Analysis & Opportunity Cost (Chi phí cơ hội)
            </h2>
            <p className="text-xs text-slate-500">
              Phân tích trade-off đa chiều: Khi chọn Option A, bạn từ bỏ những nguồn lực và lợi ích gì từ các phương án khác?
            </p>
          </div>

          {currentDecision && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Positive vs Negative Impact Card */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Tác động Tích cực vs Tiêu cực</h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                    <span className="font-bold text-emerald-800 block">Positive Impact (+):</span>
                    <ul className="list-disc pl-4 text-emerald-700 space-y-0.5">
                      <li>Tăng 40% hiệu suất làm việc dự án đồ án</li>
                      <li>Tiết kiệm thời gian xử lý tác vụ hàng ngày</li>
                      <li>Thêm động lực hoàn thành mục tiêu sự nghiệp</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                    <span className="font-bold text-rose-800 block">Negative Impact (-):</span>
                    <ul className="list-disc pl-4 text-rose-700 space-y-0.5">
                      <li>Giảm 28.9 triệu tiền mặt trong Tài khoản Tiết kiệm</li>
                      <li>Cần dành 5-10 giờ làm quen môi trường làm việc mới</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Opportunity Cost Trade-offs */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Chi phí Cơ hội (Opportunity Cost Trade-Off)</h3>

                <div className="space-y-3">
                  {currentDecision.opportunityCosts?.map((oc, i) => (
                    <div key={i} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-2">
                      <span className="font-bold text-amber-900 block">{oc.description}</span>
                      <p className="text-slate-700">{oc.tradeOffSummary}</p>
                      <div className="p-2 bg-white rounded border border-amber-200 font-semibold text-amber-800">
                        Ảnh hưởng: {oc.affectedGoalName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 7: WHAT-IF SIMULATOR */}
      {/* ====================================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              Dự báo & Đánh giá Tác động Phương án
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tích tác động thực tế của từng phương án lên ngân sách, thời lượng và rủi ro trước khi thực thi.
            </p>
          </div>

          {currentDecision && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                <span className="text-xs font-bold text-slate-700 shrink-0">Chọn Phương án Đánh giá:</span>
                <select
                  value={simulatedOptionId}
                  onChange={e => {
                    setSimulatedOptionId(e.target.value);
                    setScenarioApplied(false);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">-- Chọn Option để đánh giá tác động --</option>
                  {currentDecision.options.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.cost)})</option>
                  ))}
                </select>
              </div>

              {simulatedOptionId && (
                <div className="space-y-6">
                  <div className="p-6 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-4">
                    <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      Kết quả Phân tích Tác động Thực tế
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {(() => {
                        const opt = (currentDecision?.options || []).find(o => o.id === simulatedOptionId);
                        const cost = opt?.cost || 0;
                        const score = Math.round(opt?.score || 0);
                        const prosCount = opt?.pros?.length || 0;
                        const consCount = opt?.cons?.length || 0;
                        return (
                          <>
                            <div className="p-3 bg-white rounded-xl border border-amber-200">
                              <span className="text-slate-500 block mb-1">Tài chính (Finance)</span>
                              <p className={`text-lg font-bold ${cost > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {cost > 0 ? `-${formatCurrency(cost)}` : '0 ₫ (Không tốn chi phí)'}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {cost > 0 ? 'Ảnh hưởng dòng tiền thực tế' : 'Tối ưu ngân sách hiện có'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-amber-200">
                              <span className="text-slate-500 block mb-1">Mục tiêu & Đánh giá (Criteria)</span>
                              <p className="text-lg font-bold text-emerald-600">
                                {score > 0 ? `Điểm số: ${score}/100` : `${prosCount} ưu điểm / ${consCount} nhược điểm`}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {prosCount > 0 ? `${prosCount} tiêu chí thuận lợi` : 'Đánh giá đa tiêu chí'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-amber-200">
                              <span className="text-slate-500 block mb-1">Thời lượng & Thực thi</span>
                              <p className="text-lg font-bold text-blue-600">
                                {opt?.timelineWeeks ? `${opt.timelineWeeks} tuần` : 'Linh hoạt'}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                Mức độ nỗ lực: {opt?.executionEffort || 'Tiêu chuẩn'}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {scenarioApplied ? '✅ Đã áp dụng kịch bản vào hệ thống!' : 'Chưa áp dụng vào dữ liệu thực.'}
                      </span>
                      <button type="button"
                        onClick={() => {
                          selectDecisionOption(currentDecision.id, simulatedOptionId);
                          setScenarioApplied(true);
                        }}
                        disabled={scenarioApplied}
                        className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                          scenarioApplied ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {scenarioApplied ? 'Scenario Applied' : 'Apply Scenario (Áp dụng Thay đổi Thực tế)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 8: COMPARE DECISIONS & OPTIONS */}
      {/* ====================================================================== */}
      {activeSubTab === 'compare' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-blue-600" />
              So sánh Trực tiếp Phương án (Side-by-Side Comparison)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Đặt các phương án cạnh nhau để so sánh toàn diện các chỉ số.</p>
          </div>

          {currentDecision && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentDecision.options.slice(0, 2).map(opt => (
                <div key={opt.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-lg">{opt.name}</h3>
                    <span className="text-2xl font-black text-blue-600 font-mono">{opt.finalScore}</span>
                  </div>

                  <p className="text-xs text-slate-600">{opt.description}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Chi phí:</span>
                      <span className="font-bold">{formatCurrency(opt.cost)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Base Score:</span>
                      <span className="font-bold">{opt.baseWeightedScore} / 10</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Goal Impact:</span>
                      <span className="font-bold text-emerald-600">+{opt.goalImpactScore}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Financial Impact:</span>
                      <span className="font-bold text-amber-600">{opt.financialImpactScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 9: EXECUTION & TRACKING */}
      {/* ====================================================================== */}
      {activeSubTab === 'execution' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-6 h-6 text-emerald-600" />
              Chuyển đổi Quyết định sang Thực thi (Decision → Execution Pipeline)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Một quyết định không kết thúc ở "đã chọn". Nó tự động chuyển đổi sang Công việc (Task), Dự án (Project) và Lịch trình.
            </p>
          </div>

          <div className="space-y-4">
            {(decisions || []).filter(d => ['Decided', 'Implementing'].includes(d.status)).map(dec => {
              const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
              return (
                <div key={dec.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      {dec.status}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{dec.title}</h3>
                    <p className="text-xs text-slate-600">Phương án thực thi: <span className="font-bold">{selOpt?.name}</span></p>
                  </div>

                  <div className="flex items-center gap-3">
                    {dec.createdTaskId ? (
                      <span className="px-3 py-1.5 bg-green-100 text-green-800 font-bold text-xs rounded-xl flex items-center gap-1">
                        <Check className="w-4 h-4" /> Đã sinh Execution Task
                      </span>
                    ) : (
                      <button type="button"
                        onClick={() => convertDecisionToExecution(dec.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" /> Tạo Task Thực thi ngay
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 10: DECISION REVIEW (EXPECTED VS ACTUAL) */}
      {/* ====================================================================== */}
      {activeSubTab === 'review' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
              Decision Review — Đánh giá Dự kiến vs Thực tế (Expected vs Actual)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sau khi quyết định được thực hiện, ghi nhận sai lệch chi phí, lợi ích thực tế để đo lường Decision Accuracy.
            </p>
          </div>

          {currentDecision && (
            <div className="space-y-6">
              {currentDecision.review ? (
                <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 text-xs">
                  <h3 className="font-bold text-purple-900 text-base">Kết quả Review đã lưu:</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-xl border border-purple-200">
                      <span className="text-slate-500 block">Expected Cost vs Actual Cost</span>
                      <p className="font-bold text-slate-900 mt-1">
                        {formatCurrency(currentDecision.review.expectedCost)} vs <span className="text-purple-700">{formatCurrency(currentDecision.review.actualCost)}</span>
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-purple-200">
                      <span className="text-slate-500 block">Success Rating</span>
                      <p className="font-bold text-amber-600 mt-1">{currentDecision.review.successRating} / 5 ⭐</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-purple-200">
                      <span className="text-slate-500 block">Ghi chú Sai lệch (Variance)</span>
                      <p className="text-slate-700 mt-1">{currentDecision.review.varianceNotes}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={e => {
                    e.preventDefault();
                    updateDecision(currentDecision.id, { review: { 
                      expectedCost: currentDecision.options[0]?.cost || 0,
                      actualCost: revActualCost || currentDecision.options[0]?.cost || 0,
                      expectedBenefitScore: 8,
                      actualBenefitScore: revActualBenefit,
                      expectedTimeDays: 30,
                      actualTimeDays: revActualDays,
                      varianceNotes: revNotes || 'Không có sai lệch đáng kể.',
                      lessonsLearned: revLessons || 'Nên chuẩn bị thêm ngân sách dự phòng.',
                      successRating: revRating,
                      reviewedAt: new Date().toISOString()
                     } });
                  }}
                  className="space-y-4 max-w-xl"
                >
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Actual Cost (Chi phí thực tế VND)</label>
                      <input 
                        type="number"
                        placeholder="28000000"
                        value={revActualCost || ''}
                        onChange={e => setRevActualCost(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Rating Thành công (1-5 ⭐)</label>
                      <input 
                        type="number"
                        min={1}
                        max={5}
                        value={revRating}
                        onChange={e => setRevRating(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-600"
                      />
                    </div>
                  </div>

                  <button type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Lưu Review Đánh giá Thực tế
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 11: KNOWLEDGE BASE & ANALYTICS */}
      {/* ====================================================================== */}
      {activeSubTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Decision Knowledge Base — Kho thư viện Quyết định Cá nhân
            </h2>
            <p className="text-xs text-slate-500">
              Lưu trữ toàn bộ lịch sử các quyết định theo Năm & Category để rút kinh nghiệm cho tương lai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Purchases', 'Career', 'Finance', 'Study', 'Projects', 'Personal'].map(cat => {
              const catDecs = decisions.filter(d => d.category === cat);
              return (
                <div key={cat} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-base">{cat}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-md">
                      {catDecs.length} items
                    </span>
                  </div>

                  <ul className="text-xs text-slate-600 space-y-1.5 divide-y divide-slate-100">
                    {catDecs.length === 0 ? (
                      <li className="text-slate-400 italic">Chưa có dữ liệu.</li>
                    ) : (
                      catDecs.map(d => (
                        <li key={d.id} className="pt-1.5 flex justify-between items-center">
                          <span className="font-medium text-slate-800 line-clamp-1">{d.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{d.status}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 12: RULES & THRESHOLDS */}
      {/* ====================================================================== */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-indigo-600" />
              Decision Rules & Cost Threshold Configuration
            </h2>

            {/* Threshold Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">1. Quick Decision</span>
                <p className="text-slate-500">Chi phí &lt; 500,000 VND</p>
                <span className="text-[11px] text-emerald-600 font-medium">Quyết định nhanh dưới 5 phút</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">2. Standard Decision</span>
                <p className="text-slate-500">Chi phí 500k – 5,000,000 VND</p>
                <span className="text-[11px] text-blue-600 font-medium">Phân tích 2-3 tiêu chí cơ bản</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">3. Full Decision Analysis</span>
                <p className="text-slate-500">Chi phí &gt; 5,000,000 VND</p>
                <span className="text-[11px] text-purple-600 font-medium">Lập ma trận đầy đủ & Risk Engine</span>
              </div>
            </div>

            {/* Active Rules List */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Danh sách Decision Rules đang kích hoạt</h3>
              {decisionRules.map(rule => (
                <div key={rule.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{rule.title}</span>
                    <span className="font-mono text-slate-500">IF {rule.condition} → THEN {rule.action}</span>
                  </div>

                  <button type="button"
                    onClick={() => toggleDecisionRule(rule.id)}
                    className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all ${
                      rule.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
