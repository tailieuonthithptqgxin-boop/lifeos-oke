import React from 'react';
import { TrendingUp } from 'lucide-react';
import { DecisionItem } from '../../lib/types';

interface DecisionImpactTabProps {
  currentDecision: DecisionItem;
  decisions: DecisionItem[];
  selectedDecisionId: string;
  setSelectedDecisionId: (id: string) => void;
}

export const DecisionImpactTab: React.FC<DecisionImpactTabProps> = ({
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
              <TrendingUp className="w-6 h-6 text-purple-600" />
              Impact Analysis & Opportunity Cost (Chi phí cơ hội)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phân tích trade-off đa chiều: Khi chọn Option A, bạn từ bỏ những nguồn lực và lợi ích gì từ các phương án khác?
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

      {currentDecision && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positive vs Negative Impact Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Tác động Tích cực vs Tiêu cực</h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Positive Impact (+):</span>
                <ul className="list-disc pl-4 text-emerald-700 dark:text-emerald-400 space-y-0.5">
                  <li>Tăng 40% hiệu suất làm việc dự án đồ án</li>
                  <li>Tiết kiệm thời gian xử lý tác vụ hàng ngày</li>
                  <li>Thêm động lực hoàn thành mục tiêu sự nghiệp</li>
                </ul>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900 space-y-1">
                <span className="font-bold text-rose-800 dark:text-rose-300 block">Negative Impact (-):</span>
                <ul className="list-disc pl-4 text-rose-700 dark:text-rose-400 space-y-0.5">
                  <li>Giảm 28.9 triệu tiền mặt trong Tài khoản Tiết kiệm</li>
                  <li>Cần dành 5-10 giờ làm quen môi trường làm việc mới</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Opportunity Cost Trade-offs */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Chi phí Cơ hội (Opportunity Cost Trade-Off)</h3>

            <div className="space-y-3">
              {currentDecision.opportunityCosts?.map((oc, i) => (
                <div key={i} className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                  <span className="font-bold text-amber-900 dark:text-amber-300 block">{oc.description}</span>
                  <p className="text-slate-700 dark:text-slate-300">{oc.tradeOffSummary}</p>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded border border-amber-200 dark:border-amber-700 font-semibold text-amber-800 dark:text-amber-300">
                    Ảnh hưởng: {oc.affectedGoalName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
