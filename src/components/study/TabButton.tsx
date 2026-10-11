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
      className={`btn-squishy flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer
        ${active 
          ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/80 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300'}`}
    >
      {icon} 
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
          active 
            ? 'bg-white/25 text-white' 
            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
