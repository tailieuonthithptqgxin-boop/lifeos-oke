import React from 'react';
import { Crown } from 'lucide-react';

interface ChampionBadgeProps {
  count?: number | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showText?: boolean;
}

export function ChampionBadge({
  count = 0,
  size = 'xs',
  className = '',
  showText = true
}: ChampionBadgeProps) {
  if (!count || count <= 0) return null;

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  return (
    <span
      className={`inline-flex items-center font-black rounded-full bg-linear-to-r from-amber-400/25 via-yellow-400/20 to-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/50 dark:border-amber-500/40 shadow-xs tracking-tight select-none shrink-0 ${sizeStyles[size]} ${className}`}
      title={`👑 Quán Quân Tuần: Đã từng ${count} lần đứng Top 1 Bảng Xếp Hạng`}
    >
      <Crown className={`${iconSizes[size]} text-amber-500 fill-amber-400 shrink-0`} />
      {showText && <span>x{count}</span>}
    </span>
  );
}
