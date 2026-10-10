import React from 'react';
import { GitCompare } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem } from '../../lib/types';

interface DecisionCompareTabProps {
  currentDecision: DecisionItem;
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
}

export const DecisionCompareTab: React.FC<DecisionCompareTabProps> = ({
  currentDecision,
  decisions,
  selectedDecisionId,
  setSelectedDecisionId
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-blue-600" />
            So sánh Trực tiếp Phương án (Side-by-Side Comparison)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Đặt các phương án cạnh nhau để so sánh toàn diện các chỉ số.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentDecision.options.slice(0, 2).map(opt => (
            <div key={opt.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{opt.name}</h3>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{opt.finalScore}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">{opt.description}</p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span className="text-slate-500 dark:text-slate-400">Chi phí:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(opt.cost)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span className="text-slate-500 dark:text-slate-400">Base Score:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{opt.baseWeightedScore} / 10</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span className="text-slate-500 dark:text-slate-400">Goal Impact:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{opt.goalImpactScore}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span className="text-slate-500 dark:text-slate-400">Financial Impact:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{opt.financialImpactScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
