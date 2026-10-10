import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem } from '../../lib/types';

interface DecisionReviewTabProps {
  currentDecision: DecisionItem;
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
  revActualCost: number;
  setRevActualCost: (val: number) => void;
  revActualBenefit: number;
  setRevActualBenefit: (val: number) => void;
  revActualDays: number;
  setRevActualDays: (val: number) => void;
  revNotes: string;
  setRevNotes: (val: string) => void;
  revLessons: string;
  setRevLessons: (val: string) => void;
  revRating: number;
  setRevRating: (val: number) => void;
  updateDecision: (id: string, updates: any) => void;
}

export const DecisionReviewTab: React.FC<DecisionReviewTabProps> = ({
  currentDecision,
  decisions,
  selectedDecisionId,
  setSelectedDecisionId,
  revActualCost,
  setRevActualCost,
  revActualBenefit,
  revActualDays,
  revNotes,
  revLessons,
  revRating,
  setRevRating,
  updateDecision
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-purple-600" />
            Decision Review — Đánh giá Dự kiến vs Thực tế (Expected vs Actual)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sau khi quyết định được thực hiện, ghi nhận sai lệch chi phí, lợi ích thực tế để đo lường Decision Accuracy.
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Chọn Decision:</span>
          <select
            value={selectedDecisionId}
            onChange={e => setSelectedDecisionId(e.target.value)}
            className="text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none"
          >
            {decisions.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>
      </div>

      {currentDecision && (
        <div className="space-y-6">
          {currentDecision.review ? (
            <div className="p-6 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-4 text-xs">
              <h3 className="font-bold text-purple-900 dark:text-purple-300 text-base">Kết quả Review đã lưu:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900">
                  <span className="text-slate-500 dark:text-slate-400 block">Expected Cost vs Actual Cost</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(currentDecision.review.expectedCost)} vs <span className="text-purple-700 dark:text-purple-400">{formatCurrency(currentDecision.review.actualCost)}</span>
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900">
                  <span className="text-slate-500 dark:text-slate-400 block">Success Rating</span>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mt-1">{currentDecision.review.successRating} / 5 ⭐</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900">
                  <span className="text-slate-500 dark:text-slate-400 block">Ghi chú Sai lệch (Variance)</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{currentDecision.review.varianceNotes}</p>
                </div>
              </div>
            </div>
          ) : (
            <form 
              onSubmit={e => {
                e.preventDefault();
                updateDecision(currentDecision.id, { 
                  review: { 
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
                  } 
                });
              }}
              className="space-y-4 max-w-xl"
            >
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Actual Cost (Chi phí thực tế VND)</label>
                  <input 
                    type="number"
                    placeholder="28000000"
                    value={revActualCost || ''}
                    onChange={e => setRevActualCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rating Thành công (1-5 ⭐)</label>
                  <input 
                    type="number"
                    min={1}
                    max={5}
                    value={revRating}
                    onChange={e => setRevRating(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>

              <button type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Lưu Review Đánh giá Thực tế
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
