import React from 'react';

interface FinanceTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const FinanceTabButton: React.FC<FinanceTabButtonProps> = ({
  active,
  onClick,
  icon,
  label
}) => {
  return (
    <button 
      type="button" 
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
        active 
          ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 shadow-2xs' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};
