import React from 'react';
import { BookOpen } from 'lucide-react';
import { DecisionItem } from '../../lib/types';

interface DecisionKnowledgeTabProps {
  decisions: DecisionItem[];
}

export const DecisionKnowledgeTab: React.FC<DecisionKnowledgeTabProps> = ({ decisions }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Decision Knowledge Base — Kho thư viện Quyết định Cá nhân
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lưu trữ toàn bộ lịch sử các quyết định theo Năm & Category để rút kinh nghiệm cho tương lai.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Purchases', 'Career', 'Finance', 'Study', 'Projects', 'Personal'].map(cat => {
          const catDecs = decisions.filter(d => d.category === cat);
          return (
            <div key={cat} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white text-base">{cat}</span>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-md">
                  {catDecs.length} items
                </span>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                {catDecs.length === 0 ? (
                  <li className="text-slate-400 italic">Chưa có dữ liệu.</li>
                ) : (
                  catDecs.map(d => (
                    <li key={d.id} className="pt-1.5 flex justify-between items-center">
                      <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{d.title}</span>
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
  );
};
