import React, { useState, useRef, useEffect } from 'react';
import { 
  Sliders, Scale, CheckCircle2, Check, Play, Plus, 
  Trash2, Sparkles, ChevronUp, ChevronDown, RotateCcw, 
  AlertCircle, HelpCircle, X, DollarSign, Clock, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem, DecisionCriterion, DecisionOption, DecisionScore } from '../../lib/types';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface DecisionMatrixTabProps {
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
  currentDecision: DecisionItem;
  selectDecisionOption: (decisionId: string, optionId: string) => void;
  convertDecisionToExecution: (decisionId: string) => void;
  updateDecision?: (id: string, updates: any) => Promise<any>;
}

export const DecisionMatrixTab: React.FC<DecisionMatrixTabProps> = ({
  decisions,
  selectedDecisionId,
  setSelectedDecisionId,
  currentDecision,
  selectDecisionOption,
  convertDecisionToExecution,
  updateDecision
}) => {
  const safeCriteria = currentDecision?.criteria || [];
  const safeOptions = currentDecision?.options || [];

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Add Option Modal
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [newOptName, setNewOptName] = useState('');
  const [newOptDesc, setNewOptDesc] = useState('');
  const [newOptCost, setNewOptCost] = useState<number>(0);
  const [newOptHours, setNewOptHours] = useState<number>(5);
  const [newOptBenefits, setNewOptBenefits] = useState<string>('');
  const [isOptShaking, setIsOptShaking] = useState(false);
  const optBackdropRef = useRef<HTMLDivElement | null>(null);
  const optMouseDownTarget = useRef<EventTarget | null>(null);

  // Add Criterion Modal
  const [showAddCritModal, setShowAddCritModal] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritWeight, setNewCritWeight] = useState<number>(20);
  const [newCritDirection, setNewCritDirection] = useState<'higher_is_better' | 'lower_is_better'>('higher_is_better');
  const [isCritShaking, setIsCritShaking] = useState(false);
  const critBackdropRef = useRef<HTMLDivElement | null>(null);
  const critMouseDownTarget = useRef<EventTarget | null>(null);

  useBodyScrollLock(showAddOptionModal || showAddCritModal);

  const isOptDirty = newOptName.trim().length > 0 || newOptDesc.trim().length > 0 || newOptBenefits.trim().length > 0;
  const isCritDirty = newCritName.trim().length > 0;

  const triggerOptShake = () => {
    soundEngine.playPop();
    setIsOptShaking(true);
    setTimeout(() => setIsOptShaking(false), 500);
  };

  const triggerCritShake = () => {
    soundEngine.playPop();
    setIsCritShaking(true);
    setTimeout(() => setIsCritShaking(false), 500);
  };

  const handleSafeDismissOpt = () => {
    if (isOptDirty) {
      triggerOptShake();
      return;
    }
    setShowAddOptionModal(false);
  };

  const handleSafeDismissCrit = () => {
    if (isCritDirty) {
      triggerCritShake();
      return;
    }
    setShowAddCritModal(false);
  };

  // Handle ESC to close modals safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddOptionModal) {
          handleSafeDismissOpt();
        } else if (showAddCritModal) {
          handleSafeDismissCrit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddOptionModal, showAddCritModal, isOptDirty, isCritDirty]);

  // Compute Total Weight
  const totalWeight = safeCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  // Auto-balance Criteria Weights to 100%
  const handleAutoBalanceWeights = () => {
    if (!updateDecision || safeCriteria.length === 0) return;
    soundEngine.playPop();
    const count = safeCriteria.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - (baseWeight * count);

    const balancedCriteria = safeCriteria.map((c, idx) => ({
      ...c,
      weight: idx === 0 ? baseWeight + remainder : baseWeight
    }));

    // Recalculate options
    const updatedOptions = recalculateAllOptions(safeOptions, balancedCriteria);

    updateDecision(currentDecision.id, {
      criteria: balancedCriteria,
      options: updatedOptions,
      updatedAt: new Date().toISOString()
    });

    showToast('Đã tự động cân bằng tổng trọng số các tiêu chí về đúng 100%!');
  };

  // Helper to recalculate all options scores
  const recalculateAllOptions = (options: DecisionOption[], criteria: DecisionCriterion[]): DecisionOption[] => {
    return options.map(opt => {
      const baseWeighted = criteria.reduce((sum, c) => {
        const sc = (opt.scores || []).find(s => s.criterionId === c.id)?.rawScore ?? 7;
        return sum + (sc * (c.weight || 0) / 100);
      }, 0);
      const roundedBase = Math.round(baseWeighted * 10) / 10;
      const final = Math.round((
        roundedBase + 
        (opt.goalImpactScore || 0) + 
        (opt.financialImpactScore || 0) + 
        (opt.riskAdjustmentScore || 0) + 
        (opt.timeImpactScore || 0)
      ) * 10) / 10;

      return {
        ...opt,
        baseWeightedScore: roundedBase,
        finalScore: Math.min(10, Math.max(0, final))
      };
    });
  };

  // Update a single score
  const handleScoreChange = (optId: string, critId: string, delta: number) => {
    if (!updateDecision) return;
    soundEngine.playPop();

    const targetOpt = safeOptions.find(o => o.id === optId);
    if (!targetOpt) return;

    const currentScoreObj = targetOpt.scores?.find(s => s.criterionId === critId);
    const currentScore = currentScoreObj?.rawScore ?? 7;
    const nextScore = Math.min(10, Math.max(1, currentScore + delta));

    if (nextScore === currentScore) return;

    const updatedOptions = safeOptions.map(opt => {
      if (opt.id !== optId) return opt;

      const existingScores = opt.scores || [];
      const scoreIdx = existingScores.findIndex(s => s.criterionId === critId);
      let newScores: DecisionScore[];

      if (scoreIdx >= 0) {
        newScores = existingScores.map(s => s.criterionId === critId ? { ...s, rawScore: nextScore, calculatedScore: nextScore } : s);
      } else {
        newScores = [...existingScores, { criterionId: critId, rawScore: nextScore, calculatedScore: nextScore }];
      }

      const baseWeighted = safeCriteria.reduce((sum, c) => {
        const sc = newScores.find(s => s.criterionId === c.id)?.rawScore ?? 7;
        return sum + (sc * (c.weight || 0) / 100);
      }, 0);
      const roundedBase = Math.round(baseWeighted * 10) / 10;
      const final = Math.round((
        roundedBase + 
        (opt.goalImpactScore || 0) + 
        (opt.financialImpactScore || 0) + 
        (opt.riskAdjustmentScore || 0) + 
        (opt.timeImpactScore || 0)
      ) * 10) / 10;

      return {
        ...opt,
        scores: newScores,
        baseWeightedScore: roundedBase,
        finalScore: Math.min(10, Math.max(0, final))
      };
    });

    updateDecision(currentDecision.id, {
      options: updatedOptions,
      updatedAt: new Date().toISOString()
    });
  };

  // Update criterion weight
  const handleWeightChange = (critId: string, newWeight: number) => {
    if (!updateDecision) return;
    const weightClamped = Math.min(100, Math.max(0, newWeight));

    const updatedCriteria = safeCriteria.map(c => c.id === critId ? { ...c, weight: weightClamped } : c);
    const updatedOptions = recalculateAllOptions(safeOptions, updatedCriteria);

    updateDecision(currentDecision.id, {
      criteria: updatedCriteria,
      options: updatedOptions,
      updatedAt: new Date().toISOString()
    });
  };

  // Delete criterion
  const handleDeleteCriterion = (critId: string) => {
    if (!updateDecision || safeCriteria.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 tiêu chí đánh giá!');
      return;
    }
    soundEngine.playPop();
    const updatedCriteria = safeCriteria.filter(c => c.id !== critId);
    const updatedOptions = recalculateAllOptions(safeOptions, updatedCriteria);

    updateDecision(currentDecision.id, {
      criteria: updatedCriteria,
      options: updatedOptions,
      updatedAt: new Date().toISOString()
    });
    showToast('Đã xóa tiêu chí khỏi ma trận!');
  };

  // Add criterion submit
  const handleAddCriterionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCritName.trim() || !updateDecision) return;

    soundEngine.playPop();
    const newCrit: DecisionCriterion = {
      id: `crit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newCritName.trim(),
      weight: newCritWeight,
      type: 'scale',
      direction: newCritDirection
    };

    const updatedCriteria = [...safeCriteria, newCrit];
    const updatedOptions = safeOptions.map(opt => {
      const existingScores = opt.scores || [];
      const newScores = [...existingScores, { criterionId: newCrit.id, rawScore: 7, calculatedScore: 7 }];
      return { ...opt, scores: newScores };
    });

    const finalOptions = recalculateAllOptions(updatedOptions, updatedCriteria);

    updateDecision(currentDecision.id, {
      criteria: updatedCriteria,
      options: finalOptions,
      updatedAt: new Date().toISOString()
    });

    setNewCritName('');
    setNewCritWeight(20);
    setShowAddCritModal(false);
    showToast(`Đã thêm tiêu chí mới: "${newCrit.name}"`);
  };

  // Delete option
  const handleDeleteOption = (optId: string) => {
    if (!updateDecision || safeOptions.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 phương án để so sánh!');
      return;
    }
    soundEngine.playPop();
    const updatedOptions = safeOptions.filter(o => o.id !== optId);
    updateDecision(currentDecision.id, {
      options: updatedOptions,
      selectedOptionId: currentDecision.selectedOptionId === optId ? undefined : currentDecision.selectedOptionId,
      status: currentDecision.selectedOptionId === optId ? 'Comparing' : currentDecision.status,
      updatedAt: new Date().toISOString()
    });
    showToast('Đã xóa phương án khỏi ma trận!');
  };

  // Add option submit
  const handleAddOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptName.trim() || !updateDecision) return;

    soundEngine.playPop();
    const benefitsArr = newOptBenefits
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const defaultScores: DecisionScore[] = safeCriteria.map(c => ({
      criterionId: c.id,
      rawScore: 7,
      calculatedScore: 7
    }));

    const baseWeighted = safeCriteria.reduce((sum, c) => sum + (7 * (c.weight || 0) / 100), 0);
    const roundedBase = Math.round(baseWeighted * 10) / 10;

    const newOpt: DecisionOption = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newOptName.trim(),
      description: newOptDesc.trim() || 'Phương án bổ sung trong quá trình phân tích.',
      cost: newOptCost || 0,
      timeHours: newOptHours || 0,
      benefits: benefitsArr.length > 0 ? benefitsArr : ['Đáp ứng yêu cầu bài toán'],
      risks: [],
      scores: defaultScores,
      baseWeightedScore: roundedBase,
      goalImpactScore: 0,
      financialImpactScore: 0,
      riskAdjustmentScore: 0,
      timeImpactScore: 0,
      finalScore: roundedBase
    };

    const updatedOptions = [...safeOptions, newOpt];

    updateDecision(currentDecision.id, {
      options: updatedOptions,
      updatedAt: new Date().toISOString()
    });

    setNewOptName('');
    setNewOptDesc('');
    setNewOptCost(0);
    setNewOptHours(5);
    setNewOptBenefits('');
    setShowAddOptionModal(false);
    showToast(`Đã thêm phương án mới: "${newOpt.name}"`);
  };

  // Select Option with Sound & Confetti
  const handleSelectOption = (opt: DecisionOption) => {
    soundEngine.playSuccess();
    triggerConfetti();
    selectDecisionOption(currentDecision.id, opt.id);
    showToast(`✓ Đã chốt lựa chọn: "${opt.name}"!`);
  };

  // Convert to Task with Sound
  const handleConvertToTask = () => {
    soundEngine.playSuccess();
    convertDecisionToExecution(currentDecision.id);
    showToast(`🚀 Đã tạo Nhiệm vụ thực thi trong Danh sách Việc cần làm!`);
  };

  return (
    <div className="space-y-8">
      {/* 1. Decision Selector & Status Header */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Đang phân tích bài toán:
            </span>
            <div className="flex items-center gap-3">
              <select
                value={selectedDecisionId}
                onChange={e => setSelectedDecisionId(e.target.value)}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-xl truncate cursor-pointer"
              >
                {decisions.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>

          {currentDecision && (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <span className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 ${
                currentDecision.status === 'Decided' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                  : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
              }`}>
                {currentDecision.status === 'Decided' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Đã chốt lựa chọn</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Đang so sánh</span>
                  </>
                )}
              </span>

              <span className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700">
                Lĩnh vực: {currentDecision.category}
              </span>
            </div>
          )}
        </div>

        {currentDecision && (
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Bài toán & Lý do:
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {currentDecision.problemStatement}
              </p>
              {currentDecision.whyReason && (
                <p className="text-slate-500 dark:text-slate-400 mt-1 italic text-[11px]">
                  Mục đích: {currentDecision.whyReason}
                </p>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Điều kiện khống chế (Constraints):
              </span>
              <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
                {currentDecision.constraints && currentDecision.constraints.length > 0 ? (
                  currentDecision.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))
                ) : (
                  <li className="text-slate-400">Không có điều kiện khống chế ngặt nghèo</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {currentDecision && (
        <div className="space-y-8">
          {/* 2. Criteria Engine Section */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  1. Bộ Tiêu chí Đánh giá & Phân bổ Trọng số
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thiết lập trọng số cho từng tiêu chí để phản ánh đúng mức độ ưu tiên của bạn
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  totalWeight === 100 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                }`}>
                  {totalWeight !== 100 && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                  <span>Tổng trọng số: {totalWeight}%</span>
                </div>

                {totalWeight !== 100 && (
                  <button
                    type="button"
                    onClick={handleAutoBalanceWeights}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    title="Tự động chia đều trọng số về 100%"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cân bằng 100%</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddCritModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tiêu chí</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    <th className="p-3.5">Tên Tiêu chí</th>
                    <th className="p-3.5 text-center">Trọng số (%)</th>
                    <th className="p-3.5">Chiều hướng ưu tiên</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {safeCriteria.map(crit => (
                    <tr key={crit.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {crit.name}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={crit.weight || 0}
                            onChange={(e) => handleWeightChange(crit.id, parseInt(e.target.value) || 0)}
                            className="w-12 text-center font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 ${
                          crit.direction === 'higher_is_better' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {crit.direction === 'higher_is_better' ? 'Càng cao càng tốt ↑' : 'Càng thấp càng tốt ↓'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteCriterion(crit.id)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Xóa tiêu chí này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Weighted Decision Matrix Table (Interactive Click-to-Score) */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  2. Ma trận Chấm điểm Trực quan (Thang điểm 1 - 10)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chạm vào nút [-] hoặc [+] ở từng ô để điều chỉnh điểm. Điểm tổng hợp sẽ tự động nhảy số theo thời gian thực!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddOptionModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm phương án</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3.5">Tiêu chí (Criteria)</th>
                    <th className="p-3.5 text-center">Trọng số</th>
                    {safeOptions.map(opt => (
                      <th key={opt.id} className="p-3.5 text-center border-l border-slate-800 min-w-[160px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate">{opt.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(opt.id)}
                            className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                            title="Xóa phương án này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {opt.cost > 0 && (
                          <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                            {formatCurrency(opt.cost)}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {safeCriteria.map(crit => (
                    <tr key={crit.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {crit.name}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {crit.weight}%
                      </td>
                      {safeOptions.map(opt => {
                        const scoreObj = opt.scores?.find(s => s.criterionId === crit.id);
                        const rawScore = scoreObj?.rawScore ?? 7;

                        return (
                          <td key={opt.id} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-mono">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleScoreChange(opt.id, crit.id, -1)}
                                disabled={rawScore <= 1}
                                className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer"
                                title="Giảm 1 điểm"
                              >
                                -
                              </button>

                              <span className={`w-6 text-center font-bold text-xs ${
                                rawScore >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-black' :
                                rawScore >= 6 ? 'text-indigo-600 dark:text-indigo-400' :
                                rawScore >= 4 ? 'text-amber-600 dark:text-amber-400' :
                                'text-rose-600 dark:text-rose-400'
                              }`}>
                                {rawScore}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleScoreChange(opt.id, crit.id, 1)}
                                disabled={rawScore >= 10}
                                className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer"
                                title="Tăng 1 điểm"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Total Weighted Score Row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                    <td className="p-3.5 text-slate-900 dark:text-white">
                      Điểm Trọng số Cơ bản (Σ Điểm × Trọng số)
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {totalWeight}%
                    </td>
                    {safeOptions.map(opt => (
                      <td key={opt.id} className="p-3.5 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-sm text-indigo-700 dark:text-indigo-400 font-black">
                        {opt.baseWeightedScore ?? 7.5}
                      </td>
                    ))}
                  </tr>

                  {/* Final Decision Score Header Row */}
                  <tr className="bg-emerald-600 text-white font-extrabold text-sm">
                    <td className="p-4">
                      ĐIỂM TỔNG HỢP CUỐI CÙNG
                    </td>
                    <td className="p-4 text-center font-mono">
                      10.0
                    </td>
                    {safeOptions.map(opt => (
                      <td key={opt.id} className="p-4 text-center border-l border-emerald-500 font-mono text-base">
                        <span className="text-lg font-black">{opt.finalScore ?? 7.5}</span>
                        <span className="text-xs font-normal opacity-80"> / 10</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Detailed Option Cards & Action Picker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                3. Lựa chọn & Thực thi Phương án
              </h3>
              <span className="text-xs text-slate-400">
                Chốt phương án tốt nhất hoặc chuyển thẳng sang Nhiệm vụ công việc
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeOptions.map(opt => {
                const isSelected = currentDecision.selectedOptionId === opt.id;
                const isBest = safeOptions.every(other => (opt.finalScore || 0) >= (other.finalScore || 0));

                return (
                  <div 
                    key={opt.id}
                    className={`p-6 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                        : isBest
                        ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                            {opt.finalScore ?? 7.5} <span className="text-xs font-normal text-slate-400">/ 10</span>
                          </span>
                          {isBest && !isSelected && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold rounded-md">
                              ★ Điểm cao nhất
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Đã chọn
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {opt.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {opt.description}
                      </p>

                      <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        {opt.cost > 0 && (
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-500 dark:text-slate-400">Chi phí:</span>
                            <span className="text-slate-900 dark:text-white font-mono">{formatCurrency(opt.cost)}</span>
                          </div>
                        )}
                        {opt.timeHours > 0 && (
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-500 dark:text-slate-400">Thời gian yêu cầu:</span>
                            <span className="text-slate-900 dark:text-white font-mono">{opt.timeHours} giờ</span>
                          </div>
                        )}
                      </div>

                      {opt.benefits && opt.benefits.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase block">
                            Ưu điểm nổi bật:
                          </span>
                          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                            {opt.benefits.map((b, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      {isSelected ? (
                        <button 
                          type="button" 
                          onClick={handleConvertToTask}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Chuyển sang Nhiệm vụ Thực thi</span>
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => handleSelectOption(opt)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
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

      {/* MODAL 1: THÊM PHƯƠNG ÁN MỚI */}
      {showAddOptionModal && (
        <div 
          ref={optBackdropRef}
          onMouseDown={(e) => { optMouseDownTarget.current = e.target; }}
          onClick={(e) => {
            if (e.target === optBackdropRef.current && optMouseDownTarget.current === optBackdropRef.current) {
              handleSafeDismissOpt();
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in cursor-default"
        >
          <div 
            className={`w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scale-up transition-transform ${
              isOptShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Thêm Phương Án So Sánh Mới
                  </h3>
                  <p className="text-xs text-slate-400">Nhập thông tin phương án vào bài toán hiện tại</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSafeDismissOpt}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOptionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Phương án *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Mua xe máy điện VinFast Feliz S"
                  value={newOptName}
                  onChange={e => setNewOptName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả ngắn gọn
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tóm tắt đặc tính phương án..."
                  value={newOptDesc}
                  onChange={e => setNewOptDesc(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chi phí ước tính (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    placeholder="20000000"
                    value={newOptCost || ''}
                    onChange={e => setNewOptCost(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian yêu cầu (giờ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={newOptHours || ''}
                    onChange={e => setNewOptHours(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ưu điểm nổi bật (Mỗi dòng 1 ý)
                </label>
                <textarea
                  rows={2}
                  placeholder={"Tiết kiệm tiền xăng hàng tháng\nKhông gây ồn khi di chuyển"}
                  value={newOptBenefits}
                  onChange={e => setNewOptBenefits(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSafeDismissOpt}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Thêm Phương Án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM TIÊU CHÍ MỚI */}
      {showAddCritModal && (
        <div 
          ref={critBackdropRef}
          onMouseDown={(e) => { critMouseDownTarget.current = e.target; }}
          onClick={(e) => {
            if (e.target === critBackdropRef.current && critMouseDownTarget.current === critBackdropRef.current) {
              handleSafeDismissCrit();
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in cursor-default"
        >
          <div 
            className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scale-up transition-transform ${
              isCritShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Thêm Tiêu Chí Đánh Giá
                  </h3>
                  <p className="text-xs text-slate-400">Đưa thêm thước đo vào ma trận so sánh</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSafeDismissCrit}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCriterionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Tiêu chí *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Độ bền & Khả năng giữ giá"
                  value={newCritName}
                  onChange={e => setNewCritName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trọng số mặc định (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={newCritWeight}
                  onChange={e => setNewCritWeight(parseInt(e.target.value) || 10)}
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chiều hướng ưu tiên
                </label>
                <select
                  value={newCritDirection}
                  onChange={e => setNewCritDirection(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none"
                >
                  <option value="higher_is_better">Điểm càng cao càng tốt (Higher is better ↑)</option>
                  <option value="lower_is_better">Điểm càng thấp càng tốt (Lower is better ↓)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSafeDismissCrit}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Thêm Tiêu Chí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-200 animate-slide-up">
          <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
