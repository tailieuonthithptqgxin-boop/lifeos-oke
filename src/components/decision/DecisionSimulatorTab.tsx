import React from 'react';
import { Zap, Sparkles, Check } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem } from '../../lib/types';

interface DecisionSimulatorTabProps {
  currentDecision: DecisionItem;
  simulatedOptionId: string;
  setSimulatedOptionId: (id: string) => void;
  scenarioApplied: boolean;
  setScenarioApplied: (app: boolean) => void;
  selectDecisionOption: (decisionId: string, optionId: string) => void;
}

export const DecisionSimulatorTab: React.FC<DecisionSimulatorTabProps> = ({
  currentDecision,
  simulatedOptionId,
  setSimulatedOptionId,
  scenarioApplied,
  setScenarioApplied,
  selectDecisionOption
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          Dự báo & Đánh giá Tác động Phương án
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Phân tích tác động thực tế của từng phương án lên ngân sách, thời lượng và rủi ro trước khi thực thi.
        </p>
      </div>

      {currentDecision && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Chọn Phương án Đánh giá:</span>
            <select
              value={simulatedOptionId}
              onChange={e => {
                setSimulatedOptionId(e.target.value);
                setScenarioApplied(false);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Chọn Option để đánh giá tác động --</option>
              {currentDecision.options.map(o => (
                <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.cost)})</option>
              ))}
            </select>
          </div>

          {simulatedOptionId && (
            <div className="space-y-6">
              <div className="p-6 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-4">
                <h3 className="font-bold text-amber-900 dark:text-amber-300 text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Kết quả Phân tích Tác động Thực tế
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {(() => {
                    const opt = (currentDecision?.options || []).find(o => o.id === simulatedOptionId);
                    const cost = opt?.cost || 0;
                    const score = Math.round(Number((opt as any)?.score || opt?.finalScore || 0));
                    const prosCount = (opt as any)?.pros?.length || opt?.benefits?.length || 0;
                    const consCount = (opt as any)?.cons?.length || opt?.risks?.length || 0;
                    return (
                      <>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          <span className="text-slate-500 dark:text-slate-400 block mb-1">Tài chính (Finance)</span>
                          <p className={`text-lg font-bold ${cost > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {cost > 0 ? `-${formatCurrency(cost)}` : '0 ₫ (Không tốn chi phí)'}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {cost > 0 ? 'Ảnh hưởng dòng tiền thực tế' : 'Tối ưu ngân sách hiện có'}
                          </span>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          <span className="text-slate-500 dark:text-slate-400 block mb-1">Mục tiêu & Đánh giá (Criteria)</span>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {score > 0 ? `Điểm số: ${score}/10` : `${prosCount} ưu điểm / ${consCount} rủi ro`}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {prosCount > 0 ? `${prosCount} tiêu chí thuận lợi` : 'Đánh giá đa tiêu chí'}
                          </span>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          <span className="text-slate-500 dark:text-slate-400 block mb-1">Thời lượng & Thực thi</span>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {(opt as any)?.timelineWeeks ? `${(opt as any).timelineWeeks} tuần` : opt?.timeHours ? `${opt.timeHours} giờ` : 'Linh hoạt'}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            Mức độ nỗ lực: {(opt as any)?.executionEffort || 'Tiêu chuẩn'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {scenarioApplied ? '✅ Đã áp dụng kịch bản vào hệ thống!' : 'Chưa áp dụng vào dữ liệu thực.'}
                  </span>
                  <button type="button"
                    onClick={() => {
                      selectDecisionOption(currentDecision.id, simulatedOptionId);
                      setScenarioApplied(true);
                    }}
                    disabled={scenarioApplied}
                    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
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
  );
};
