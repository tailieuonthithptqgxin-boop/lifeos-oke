import React, { useState, useEffect } from 'react';
import { 
  Target, Sparkles, Check, Plus, Zap, Star, 
  Trophy, Gift, ArrowRight, Play, Flame, CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { apiCall } from '../../lib/apiClient';

interface DailyTrifectaWidgetProps {
  onStartZenFocus?: (taskId: string) => void;
  onOpenQuickTask?: () => void;
}

export function DailyTrifectaWidget({ onStartZenFocus, onOpenQuickTask }: DailyTrifectaWidgetProps) {
  const { tasks = [], updateTask, addTask } = useAppStore();

  const todayStr = new Date().toISOString().split('T')[0];

  // Persistent slots for the 3 task IDs
  const [slotTaskIds, setSlotTaskIds] = useState<[string, string, string]>(() => {
    try {
      const saved = localStorage.getItem(`lifeos_trifecta_${todayStr}`);
      return saved ? JSON.parse(saved) : ['', '', ''];
    } catch {
      return ['', '', ''];
    }
  });

  const [hasClaimedBonus, setHasClaimedBonus] = useState(() => {
    try {
      return localStorage.getItem(`lifeos_trifecta_claimed_${todayStr}`) === 'true';
    } catch {
      return false;
    }
  });

  const [inlineInputSlot, setInlineInputSlot] = useState<number | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');

  // Auto-fill empty slots with top priority tasks of today if available
  useEffect(() => {
    if (tasks.length === 0) return;

    setSlotTaskIds(prev => {
      const current = [...prev] as [string, string, string];
      let hasChange = false;

      const availableTasks = tasks.filter(t => 
        t.status !== 'Hoàn thành' && 
        t.status !== 'Hủy' && 
        !current.includes(t.id)
      );

      for (let i = 0; i < 3; i++) {
        // If current slot task no longer exists, clear it
        if (current[i] && !tasks.some(t => t.id === current[i])) {
          current[i] = '';
          hasChange = true;
        }

        // If slot empty and we have high priority tasks
        if (!current[i] && availableTasks.length > 0) {
          const nextTask = availableTasks.shift();
          if (nextTask) {
            current[i] = nextTask.id;
            hasChange = true;
          }
        }
      }

      if (hasChange) {
        try {
          localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(current));
        } catch {}
      }
      return current;
    });
  }, [tasks, todayStr]);

  const updateSlot = (index: number, taskId: string) => {
    const updated = [...slotTaskIds] as [string, string, string];
    updated[index] = taskId;
    setSlotTaskIds(updated);
    try {
      localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(updated));
    } catch {}
  };

  const handleCreateInlineTask = async (slotIdx: number) => {
    if (!inlineTitle.trim()) {
      setInlineInputSlot(null);
      return;
    }

    try {
      const created = await addTask({
        title: inlineTitle.trim(),
        priority: slotIdx === 0 ? 'Cao' : slotIdx === 1 ? 'Trung bình' : 'Thấp',
        status: 'Chưa làm',
        dueDate: todayStr
      });
      soundEngine.playPop();
      if (created?.id) {
        updateSlot(slotIdx, created.id);
      }
    } catch (e) {}

    setInlineTitle('');
    setInlineInputSlot(null);
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const isDone = currentStatus === 'Hoàn thành';
    const nextStatus = isDone ? 'Chưa làm' : 'Hoàn thành';

    soundEngine.playSuccess();
    if (!isDone) {
      triggerConfetti();
    }

    await updateTask(taskId, {
      status: nextStatus,
      completedAt: !isDone ? new Date().toISOString() : null
    });
  };

  // Resolve tasks in the 3 slots
  const slotTasks = slotTaskIds.map(id => tasks.find(t => t.id === id) || null);
  const completedCount = slotTasks.filter(t => t && t.status === 'Hoàn thành').length;
  const isAllComplete = completedCount === 3;

  const handleClaimTrifectaReward = async () => {
    if (hasClaimedBonus || !isAllComplete) return;

    soundEngine.playSuccess();
    triggerConfetti();
    setHasClaimedBonus(true);
    try {
      localStorage.setItem(`lifeos_trifecta_claimed_${todayStr}`, 'true');
      // Award extra coins/XP via quest or progression API
      await apiCall('/api/progression/quest/claim', 'POST', { questKey: 'daily_3_tasks' }).catch(() => {});
    } catch (e) {}
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-xl p-5 sm:p-6 text-white space-y-5">
      
      {/* Subtle ambient gradient mesh */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              THE RULE OF 3 · QUY TẮC TAM HỢP
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {completedCount} / 3 Hoàn thành
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span>Top 3 Việc Cốt Lõi Hôm Nay</span>
            {isAllComplete && <span>🏆</span>}
          </h3>
          <p className="text-xs text-slate-400">
            Chỉ cần hoàn thành 3 việc này, bạn đã chiến thắng 90% áp lực trong ngày.
          </p>
        </div>

        {/* Progress Badge / Victory Claim */}
        <div className="shrink-0 flex items-center gap-2">
          {isAllComplete ? (
            <button
              onClick={handleClaimTrifectaReward}
              disabled={hasClaimedBonus}
              className={`px-4 py-2 rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-2 cursor-pointer ${
                hasClaimedBonus
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 opacity-80 cursor-default'
                  : 'bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 hover:scale-105 active:scale-95 animate-pulse'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>{hasClaimedBonus ? '✓ Đã nhận rương Tam Hợp' : 'MỞ RƯƠNG THƯỞNG TAM HỢP (+50 XP, +25 🪙)'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Còn {3 - completedCount} việc</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 VIP Slots Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((slotIdx) => {
          const task = slotTasks[slotIdx];
          const isDone = task?.status === 'Hoàn thành';
          const isWriting = inlineInputSlot === slotIdx;

          const slotLabels = [
            { rank: 'VIỆC #1 QUAN TRỌNG NHẤT', color: 'text-amber-400', stars: '⭐⭐⭐' },
            { rank: 'VIỆC #2 ĐÒI HỎI TẬP TRUNG', color: 'text-emerald-400', stars: '⭐⭐' },
            { rank: 'VIỆC #3 GIẢI QUYẾT DỨT ĐIỂM', color: 'text-teal-400', stars: '⭐' }
          ];

          return (
            <div
              key={slotIdx}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-xs'
                  : task
                  ? 'bg-slate-800/90 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-800/40 border-dashed border-slate-700 hover:border-slate-600'
              }`}
            >
              <div>
                {/* Slot Rank Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${slotLabels[slotIdx].color}`}>
                    {slotLabels[slotIdx].rank}
                  </span>
                  <span className="text-[10px]">{slotLabels[slotIdx].stars}</span>
                </div>

                {/* Content */}
                {task ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                          isDone 
                            ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                            : 'border-2 border-slate-600 hover:border-emerald-400 text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-bold leading-snug line-clamp-2 ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.priority && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-slate-400">
                            Độ ưu tiên: {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isWriting ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      autoFocus
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateInlineTask(slotIdx);
                        if (e.key === 'Escape') setInlineInputSlot(null);
                      }}
                      placeholder="Nhập tên việc cần làm hôm nay..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-emerald-500 text-white focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setInlineInputSlot(null)}
                        className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-white"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleCreateInlineTask(slotIdx)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px]"
                      >
                        Lưu Slot
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Slot trống cho hôm nay</p>
                    <button
                      onClick={() => setInlineInputSlot(slotIdx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm việc</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom quick actions for this slot */}
              {task && !isDone && (
                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => onStartZenFocus?.(task.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Zen Focus ngay</span>
                  </button>

                  <select
                    value={task.id}
                    onChange={(e) => updateSlot(slotIdx, e.target.value)}
                    className="text-[10px] bg-transparent text-slate-500 hover:text-slate-400 cursor-pointer focus:outline-none"
                  >
                    <option value={task.id} className="bg-slate-900 text-white">Đổi việc khác</option>
                    {tasks
                      .filter(t => t.id !== task.id && t.status !== 'Hoàn thành')
                      .map(t => (
                        <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                          {t.title.slice(0, 30)}...
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
