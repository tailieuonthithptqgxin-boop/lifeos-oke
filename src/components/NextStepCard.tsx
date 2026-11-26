import React, { useState } from 'react';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { soundEngine } from '../lib/soundEngine';

interface NextStepCardProps {
  taskCount: number;
  habitCount: number;
  focusSessionCount: number;
  isVi: boolean;
  onNavigate: (view: string) => void;
}

const DISMISS_KEY = 'lifeos_next_step_dismissed_day';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Shows ONE clear next action for users who have not set up the core loop yet
 * (task -> habit -> focus). Hides itself once all three exist, or for the rest
 * of the day after being dismissed.
 */
export function NextStepCard({ taskCount, habitCount, focusSessionCount, isVi, onNavigate }: NextStepCardProps) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === todayKey(); } catch { return false; }
  });

  let step: { view: string; title: string; desc: string; cta: string; progress: number } | null = null;
  if (taskCount === 0) {
    step = {
      view: 'tasks', progress: 0,
      title: isVi ? 'Bước 1/3 · Thêm việc đầu tiên' : 'Step 1/3 · Add your first task',
      desc: isVi ? 'Chỉ cần một việc nhỏ cho hôm nay — mất chưa tới 10 giây.' : 'Just one small task for today — under 10 seconds.',
      cta: isVi ? 'Thêm việc' : 'Add task',
    };
  } else if (habitCount === 0) {
    step = {
      view: 'habits', progress: 1,
      title: isVi ? 'Bước 2/3 · Tạo một thói quen' : 'Step 2/3 · Create a habit',
      desc: isVi ? 'Chọn một thói quen dễ như "uống nước" để bắt đầu chuỗi ngày.' : 'Pick an easy habit like "drink water" to start a streak.',
      cta: isVi ? 'Tạo thói quen' : 'Create habit',
    };
  } else if (focusSessionCount === 0) {
    step = {
      view: 'focus', progress: 2,
      title: isVi ? 'Bước 3/3 · Tập trung 25 phút' : 'Step 3/3 · Focus for 25 minutes',
      desc: isVi ? 'Một phiên Pomodoro đầu tiên để mở khóa nhịp làm việc của bạn.' : 'Your first Pomodoro session to unlock your rhythm.',
      cta: isVi ? 'Bắt đầu tập trung' : 'Start focus',
    };
  }

  if (!step || dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, todayKey()); } catch {}
    setDismissed(true);
  };

  return (
    <div
      className="relative flex items-center gap-3 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 animate-page-enter"
      role="region"
      aria-label={step.title}
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-slate-900 dark:text-white">{step.title}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.desc}</div>
        <div className="flex gap-1 mt-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 flex-1 max-w-10 rounded-full ${i <= step!.progress ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => { try { soundEngine.playPop(); } catch {} onNavigate(step!.view); }}
        className="shrink-0 px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        {step.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        aria-label={isVi ? 'Ẩn hôm nay' : 'Hide for today'}
        title={isVi ? 'Ẩn hôm nay' : 'Hide for today'}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
