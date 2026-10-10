import React from 'react';
import { Sliders, Scale, CheckCircle2, Check, Play } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem } from '../../lib/types';

interface DecisionMatrixTabProps {
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
  currentDecision: DecisionItem;
  selectDecisionOption: (decisionId: string, optionId: string) => void;
  convertDecisionToExecution: (decisionId: string) => void;
}

export const DecisionMatrixTab: React.FC<DecisionMatrixTabProps> = ({
  decisions,
  selectedDecisionId,
  setSelectedDecisionId,
  currentDecision,
  selectDecisionOption,
  convertDecisionToExecution
}) => {
  return (
    <div className="space-y-8">
      {/* Decision Selector & Status Header */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Đang phân tích Decision:</span>
            <select
              value={selectedDecisionId}
              onChange={e => setSelectedDecisionId(e.target.value)}
              className="text-xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              {decisions.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {currentDecision && (
            <div className="flex items-center gap-3 shrink-0">
              <span className={`px-3 py-1 text-xs font-bold rounded-xl border ${
                currentDecision.status === 'Decided' 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                  : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              }`}>
                Trạng thái: {currentDecision.status}
              </span>
              <span className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700">
                Threshold: {currentDecision.threshold} Analysis
              </span>
            </div>
          )}
        </div>

        {currentDecision && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">Bài toán (Problem):</span>
              <p className="text-slate-600 dark:text-slate-400">{currentDecision.problemStatement}</p>
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">Constraints (Khống chế):</span>
              <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-0.5">
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
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                1. Bộ Tiêu chí Đánh giá (Criteria Engine)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tổng trọng số: <span className="font-bold text-blue-600 dark:text-blue-400">
                  {currentDecision.criteria.reduce((sum, c) => sum + c.weight, 0)}%
                </span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="p-3">Tên Tiêu chí</th>
                    <th className="p-3">Trọng số (%)</th>
                    <th className="p-3">Chiều hướng (Direction)</th>
                    <th className="p-3">Must-have / Deal Breaker Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentDecision.criteria.map(crit => (
                    <tr key={crit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{crit.name}</td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{crit.weight}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          crit.direction === 'higher_is_better' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {crit.direction === 'higher_is_better' ? 'Higher is better ↑' : 'Lower is better ↓'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
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
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 overflow-x-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {currentDecision.criteria.map(crit => (
                  <tr key={crit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{crit.name}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{crit.weight}%</td>
                    {currentDecision.options.map(opt => {
                      const scoreObj = opt.scores?.find(s => s.criterionId === crit.id);
                      return (
                        <td key={opt.id} className="p-3 text-center border-l border-slate-100 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white">{scoreObj?.rawScore || 7}</span> / 10
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Weighted Score Rows */}
                <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                  <td className="p-3.5 text-slate-900 dark:text-white">1. Base Weighted Score (Σ Score × Weight)</td>
                  <td className="p-3.5 font-mono">100%</td>
                  {currentDecision.options.map(opt => (
                    <td key={opt.id} className="p-3.5 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-sm text-blue-700 dark:text-blue-400">
                      {opt.baseWeightedScore || 8.0}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  <td className="p-3">2. Goal Impact Adjustment</td>
                  <td className="p-3">—</td>
                  {currentDecision.options.map(opt => (
                    <td key={opt.id} className="p-3 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-emerald-600 dark:text-emerald-400">
                      +{opt.goalImpactScore || 0.3}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  <td className="p-3">3. Financial Impact Adjustment</td>
                  <td className="p-3">—</td>
                  {currentDecision.options.map(opt => (
                    <td key={opt.id} className="p-3 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-amber-600 dark:text-amber-400">
                      {opt.financialImpactScore || -0.2}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  <td className="p-3">4. Risk & Time Adjustment</td>
                  <td className="p-3">—</td>
                  {currentDecision.options.map(opt => (
                    <td key={opt.id} className="p-3 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-rose-600 dark:text-rose-400">
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
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
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
                      opt.isDisqualified ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900 opacity-80' :
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                          {opt.finalScore} <span className="text-xs font-normal text-slate-400">/ 10</span>
                        </span>

                        {isSelected && (
                          <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đã chọn
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{opt.name}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{opt.description}</p>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Chi phí:</span>
                          <span className="text-slate-900 dark:text-white">{formatCurrency(opt.cost)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Thời gian yêu cầu:</span>
                          <span className="text-slate-900 dark:text-white">{opt.timeHours} giờ</span>
                        </div>
                      </div>

                      {opt.isDisqualified && (
                        <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl text-xs text-red-800 dark:text-red-300 font-semibold space-y-0.5">
                          {opt.disqualificationReason}
                        </div>
                      )}

                      {opt.benefits && opt.benefits.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Ưu điểm nổi bật:</span>
                          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                            {opt.benefits.map((b, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      {opt.isDisqualified ? (
                        <button type="button" disabled className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs rounded-xl cursor-not-allowed">
                          Không đạt Must-Have
                        </button>
                      ) : isSelected ? (
                        <button type="button" 
                          onClick={() => convertDecisionToExecution(currentDecision.id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> Chuyển sang Execution Task
                        </button>
                      ) : (
                        <button type="button" 
                          onClick={() => selectDecisionOption(currentDecision.id, opt.id)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
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
  );
};
