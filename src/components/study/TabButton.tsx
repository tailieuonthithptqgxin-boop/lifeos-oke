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
          ? 'bg-emerald-500 text-slate-950 font-black shadow-2xs' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
    >
      {icon} 
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
          active 
            ? 'bg-slate-950/20 text-slate-950' 
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
