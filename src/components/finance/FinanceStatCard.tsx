import React from 'react';

interface FinanceStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
}

export const FinanceStatCard: React.FC<FinanceStatCardProps> = ({
  title,
  value,
  icon,
  bg
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">{title}</h4>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{value}</div>
    </div>
  );
};
