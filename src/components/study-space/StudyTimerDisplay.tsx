import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react';

export interface StudyTimerDisplayProps {
  phase: 'FOCUS' | 'BREAK' | 'PAUSED';
  durationSeconds: number;
  startedAtUTC: number;
  endTimeUTC: number;
  serverTimeNow: number;
  isRunning: boolean;
  cycleCount?: number;
  onToggleRunning: () => void;
  onReset: () => void;
  onSelectPreset: (minutes: number) => void;
  isLight?: boolean;
}

export const StudyTimerDisplay = React.memo(function StudyTimerDisplay({
  phase,
  durationSeconds,
  startedAtUTC,
  endTimeUTC,
  serverTimeNow,
  isRunning,
  cycleCount = 1,
  onToggleRunning,
  onReset,
  onSelectPreset,
  isLight = false,
}: StudyTimerDisplayProps) {
  // Clock skew calculation (difference between server and client clock)
  const clockSkewRef = useRef<number>(0);
  useEffect(() => {
    if (serverTimeNow) {
      clockSkewRef.current = serverTimeNow - Date.now();
    }
  }, [serverTimeNow]);

  // Compute remaining seconds locally from UTC timestamp
  const calculateSecondsLeft = () => {
    if (!isRunning) return durationSeconds;
    const nowWithSkew = Date.now() + clockSkewRef.current;
    const diffMs = endTimeUTC - nowWithSkew;
    return Math.max(0, Math.round(diffMs / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateSecondsLeft);
  const [isPresetPopoverOpen, setIsPresetPopoverOpen] = useState(false);

  // Independent local 1s timer loop: isolates countdown re-renders to THIS component only!
  useEffect(() => {
    setSecondsLeft(calculateSecondsLeft());

    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft(calculateSecondsLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, endTimeUTC, durationSeconds]);

  // Format MM:SS
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // SVG ring stroke offset calculation
  const totalDuration = Math.max(1, durationSeconds);
  const progressRatio = Math.max(0, Math.min(1, secondsLeft / totalDuration));
  const circleCircumference = 50.2; // 2 * PI * r (r=8)
  const strokeDashoffset = circleCircumference * (1 - progressRatio);

  return (
    <div
      className={`flex items-center gap-2 sm:gap-2.5 px-3 py-1 rounded-full shadow-md border transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#11151f]/95 border-white/10 text-white'
      }`}
    >
      {/* Circular Countdown Ring */}
      <div className="relative w-5 h-5 flex items-center justify-center">
        <svg className="w-5 h-5 transform -rotate-90">
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2.5"
            className={isLight ? 'text-slate-200' : 'text-slate-800'}
            fill="transparent"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-emerald-500 transition-all duration-1000 ease-linear"
            fill="transparent"
            strokeDasharray={circleCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Time Clock */}
      <span className="font-mono font-bold text-sm tracking-wider">{timeFormatted}</span>

      {/* Phase Badge */}
      <span
        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border flex items-center gap-1 ${
          phase === 'FOCUS'
            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
            : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
        }`}
      >
        {phase === 'FOCUS' ? '🔥 DEEP FOCUS' : '☕ NGHỈ NGƠI'}
      </span>

      {/* Controls: Play & Reset */}
      <div className={`flex items-center gap-1.5 border-l pl-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={onToggleRunning}
          className="text-emerald-500 hover:scale-110 p-0.5 transition cursor-pointer"
          title={isRunning ? 'Tạm dừng' : 'Bắt đầu'}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 transition cursor-pointer"
          title="Đặt lại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Direct Presets: 25m, 50m, Test 5s (Matching Reference Screenshot) */}
      <div className={`hidden sm:flex items-center gap-1.5 border-l pl-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={() => onSelectPreset(25)}
          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
            durationSeconds === 1500
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Phiên tập trung tiêu chuẩn 25 phút"
        >
          25m
        </button>
        <button
          type="button"
          onClick={() => onSelectPreset(50)}
          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
            durationSeconds === 3000
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Phiên tập trung sâu 50 phút"
        >
          50m
        </button>
        <button
          type="button"
          onClick={() => onSelectPreset(0.0833)}
          className="px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900/80 shadow-xs"
          title="Test nhanh 5 giây"
        >
          <span>⚡ Test 5s</span>
        </button>
      </div>

      {/* Preset Popover Menu Fallback for Mobile */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setIsPresetPopoverOpen((prev) => !prev)}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
          }`}
          title="Cài đặt thời gian"
        >
          <span>{durationSeconds < 60 ? '5s' : `${Math.round(durationSeconds / 60)}m`}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {isPresetPopoverOpen && (
          <div
            className={`absolute top-8 left-1/2 -translate-x-1/2 w-32 p-1.5 rounded-xl shadow-2xl border z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/15 text-white'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                onSelectPreset(25);
                setIsPresetPopoverOpen(false);
              }}
              className={`w-full py-1.5 px-2.5 rounded-lg text-left font-medium transition cursor-pointer ${
                isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              ⚡ 25 phút (Chuẩn)
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectPreset(50);
                setIsPresetPopoverOpen(false);
              }}
              className={`w-full py-1.5 px-2.5 rounded-lg text-left font-medium transition cursor-pointer ${
                isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
              }`}
            >
              🔥 50 phút (Sâu)
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectPreset(0.083); // ~5s
                setIsPresetPopoverOpen(false);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg text-left font-bold text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
            >
              🚀 Test nhanh 5s
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
