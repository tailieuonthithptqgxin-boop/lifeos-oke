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
      className={`px-3.5 sm:px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs sm:text-sm btn-squishy whitespace-nowrap shrink-0 cursor-pointer ${
        active 
          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};
