import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { DecisionRule } from '../../lib/types';

interface DecisionRulesTabProps {
  decisionRules: DecisionRule[];
  toggleDecisionRule: (ruleId: string) => void;
}

export const DecisionRulesTab: React.FC<DecisionRulesTabProps> = ({
  decisionRules,
  toggleDecisionRule
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-indigo-600" />
          Decision Rules & Cost Threshold Configuration
        </h2>

        {/* Threshold Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">1. Quick Decision</span>
            <p className="text-slate-500 dark:text-slate-400">Chi phí &lt; 500,000 VND</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Quyết định nhanh dưới 5 phút</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">2. Standard Decision</span>
            <p className="text-slate-500 dark:text-slate-400">Chi phí 500k – 5,000,000 VND</p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Phân tích 2-3 tiêu chí cơ bản</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">3. Full Decision Analysis</span>
            <p className="text-slate-500 dark:text-slate-400">Chi phí &gt; 5,000,000 VND</p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Lập ma trận đầy đủ & Risk Engine</span>
          </div>
        </div>

        {/* Active Rules List */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Danh sách Decision Rules đang kích hoạt</h3>
          {decisionRules.map(rule => (
            <div key={rule.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">{rule.title}</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">IF {rule.condition} → THEN {rule.action}</span>
              </div>

              <button type="button"
                onClick={() => toggleDecisionRule(rule.id)}
                className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all cursor-pointer ${
                  rule.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
