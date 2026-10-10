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
      className={`pb-3 px-1 flex items-center gap-2 font-bold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
        active 
          ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
};
