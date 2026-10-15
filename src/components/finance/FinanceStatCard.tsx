import React from 'react';

interface FinanceStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg?: string;
}

export const FinanceStatCard: React.FC<FinanceStatCardProps> = ({
  title,
  value,
  icon
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xs transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-[#64748B] dark:text-slate-400">{title}</h4>
        <div className="text-slate-400 dark:text-slate-500">{icon}</div>
      </div>
      <div className="text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-white tabular-nums tracking-tight">{value}</div>
    </div>
  );
};
