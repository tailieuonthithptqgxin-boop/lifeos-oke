import React from 'react';
import { Play, Check } from 'lucide-react';
import { DecisionItem } from '../../lib/types';

interface DecisionExecutionTabProps {
  decisions: DecisionItem[];
  convertDecisionToExecution: (decisionId: string) => void;
}

export const DecisionExecutionTab: React.FC<DecisionExecutionTabProps> = ({
  decisions,
  convertDecisionToExecution
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Play className="w-6 h-6 text-emerald-600" />
          Chuyển đổi Quyết định sang Thực thi (Decision → Execution Pipeline)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Một quyết định không kết thúc ở "đã chọn". Nó tự động chuyển đổi sang Công việc (Task), Dự án (Project) và Lịch trình.
        </p>
      </div>

      <div className="space-y-4">
        {(decisions || []).filter(d => ['Decided', 'Implementing'].includes(d.status)).map(dec => {
          const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
          return (
            <div key={dec.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded">
                  {dec.status}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{dec.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Phương án thực thi: <span className="font-bold">{selOpt?.name}</span></p>
              </div>

              <div className="flex items-center gap-3">
                {dec.createdTaskId ? (
                  <span className="px-3 py-1.5 bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 font-bold text-xs rounded-xl flex items-center gap-1">
                    <Check className="w-4 h-4" /> Đã sinh Execution Task
                  </span>
                ) : (
                  <button type="button"
                    onClick={() => convertDecisionToExecution(dec.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
  );
};
