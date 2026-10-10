import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

export function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer
        ${active 
          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
    >
      {icon} 
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${active ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
