import React from 'react';
import { Users, Clock, Flame, Zap } from 'lucide-react';

export interface CollectiveEnergyBarProps {
  activeCount: number;
  totalAccumulatedMinutes: number;
  kudosCount: number;
  isLight?: boolean;
}

export const CollectiveEnergyBar = React.memo(function CollectiveEnergyBar({
  activeCount,
  totalAccumulatedMinutes,
  kudosCount,
  isLight = false,
}: CollectiveEnergyBarProps) {
  const hours = Math.floor(totalAccumulatedMinutes / 60);
  const remainingMins = totalAccumulatedMinutes % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;

  // Daily collective target: 100 hours (6000 minutes)
  const targetMinutes = 6000;
  const percentage = Math.min(100, Math.round((totalAccumulatedMinutes / targetMinutes) * 100));

  return (
    <div
      className={`w-full px-4 py-2 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs ${
        isLight
          ? 'bg-white/80 border-slate-200/90 text-slate-800'
          : 'bg-[#11151f]/80 border-white/10 text-white'
      }`}
    >
      {/* Left: Metric Chips */}
      <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Users className="w-3.5 h-3.5" />
          <span>{activeCount} người đang học</span>
        </div>

        <div className={`h-3 w-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

        <div className="flex items-center gap-1.5 text-indigo-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeFormatted} tích lũy</span>
        </div>

        <div className={`h-3 w-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

        <div className="flex items-center gap-1.5 text-amber-500">
          <Flame className="w-3.5 h-3.5" />
          <span>{kudosCount} tiếp lửa</span>
        </div>
      </div>

      {/* Right: Collective Progress Bar */}
      <div className="flex items-center gap-2 w-full sm:w-48 text-[11px] font-medium text-slate-400">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.max(5, percentage)}%` }}
          />
        </div>
        <span className="shrink-0 text-emerald-500 font-bold">{percentage}%</span>
      </div>
    </div>
  );
});
