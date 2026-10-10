import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4">
      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{title}</div>
        <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">{value}</div>
      </div>
    </div>
  );
}
