import React from 'react';

interface FinanceStatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bg?: string;
  onClick?: () => void;
  tooltip?: string;
}

export const FinanceStatCard: React.FC<FinanceStatCardProps> = ({
  title,
  value,
  icon,
  onClick,
  tooltip
}) => {
  return (
    <div 
      onClick={onClick}
      title={tooltip}
      className={`bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-md active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-[#64748B] dark:text-slate-400">{title}</h4>
        <div className="text-slate-400 dark:text-slate-500">{icon}</div>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums tracking-tight">{value}</div>
    </div>
  );
};
