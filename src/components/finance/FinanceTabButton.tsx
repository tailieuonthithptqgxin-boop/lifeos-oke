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
      className={`btn-squishy px-3.5 sm:px-4 py-2.5 rounded-2xl flex items-center gap-2 font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer ${
        active 
          ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/80 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};
