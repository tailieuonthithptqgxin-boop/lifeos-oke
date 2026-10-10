import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { DecisionItem } from '../../lib/types';

interface DecisionRisksTabProps {
  currentDecision: DecisionItem;
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
}

export const DecisionRisksTab: React.FC<DecisionRisksTabProps> = ({
  currentDecision,
  decisions,
  selectedDecisionId,
  setSelectedDecisionId
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              Risk Engine — Quản trị & Dự báo Rủi ro
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mô hình đánh giá rủi ro 2 chiều: <span className="font-bold text-slate-800 dark:text-slate-200">Risk Score = Xác suất (Probability 1-5) × Mức độ tác động (Impact 1-5)</span>.
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
      </div>

      {currentDecision ? (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Danh sách Rủi ro cho: <span className="text-blue-600 dark:text-blue-400">{currentDecision.title}</span>
            </h3>

            <div className="space-y-4">
              {currentDecision.options.flatMap(o => o.risks || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa ghi nhận rủi ro nguy hiểm nào.</p>
              ) : (
                currentDecision.options.flatMap(o => o.risks || []).map(risk => {
                  const score = risk.probability * risk.impact;
                  return (
                    <div key={risk.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            risk.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' :
                            risk.severity === 'High' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}>
                            {risk.severity} Severity
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{risk.title}</span>
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          Risk Score: <span className="text-red-600 dark:text-red-400 font-extrabold">{score}</span> / 25
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Nguyên nhân (Cause):</span>
                          <p className="text-slate-600 dark:text-slate-400">{risk.cause || 'N/A'}</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">Biện pháp giảm thiểu (Mitigation):</span>
                          <p className="text-emerald-700 dark:text-emerald-400">{risk.mitigation || 'N/A'}</p>
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
  );
};
