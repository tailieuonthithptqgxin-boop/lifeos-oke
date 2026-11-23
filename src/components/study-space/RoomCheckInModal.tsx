import React, { useState } from 'react';
import {
  Target,
  Sparkles,
  X,
  CheckCircle2,
  BookOpen,
  Video,
  Code2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface RoomCheckInModalProps {
  isOpen: boolean;
  roomName: string;
  roomTopic: string;
  onClose: () => void;
  onCheckIn: (goal: string) => Promise<void>;
  isSubmitting?: boolean;
}

const PRESET_GOALS = [
  { label: 'Giải bài tập & Làm đề', icon: BookOpen },
  { label: 'Đọc tài liệu & Nghiên cứu', icon: Sparkles },
  { label: 'Học nhóm / Thảo luận Meet', icon: Video },
  { label: 'Luyện 50 từ vựng Ngoại ngữ', icon: Target },
  { label: 'Lập trình & Fix bugs dự án', icon: Code2 },
  { label: 'Tập trung sâu Pomodoro (25m)', icon: Clock }
];

export function RoomCheckInModal({
  isOpen,
  roomName,
  roomTopic,
  onClose,
  onCheckIn,
  isSubmitting = false
}: RoomCheckInModalProps) {
  const [goal, setGoal] = useState('Giải bài tập & Làm đề');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGoal = goal.trim() || 'Học tập tập trung';
    await onCheckIn(cleanGoal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header Banner */}
        <div className="relative overflow-hidden bg-linear-to-r from-emerald-600 to-teal-700 p-6 text-white">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase">
                <Target className="w-3 h-3" />
                <span>Điểm danh ca học</span>
              </div>
              <h3 className="text-lg font-black tracking-tight">{roomName}</h3>
              <p className="text-xs text-emerald-100 line-clamp-1">Chủ đề: {roomTopic}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Mục tiêu ca học hôm nay của bạn là gì? <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Mục tiêu sẽ hiển thị bên cạnh tên của bạn để cả phòng cùng theo dõi và tiếp thêm động lực!
            </p>

            <div className="relative">
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="VD: Hoàn thành 10 câu bài tập Toán / Đọc xong chương 3..."
                maxLength={90}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base sm:text-sm min-h-[44px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <span className="absolute right-3.5 bottom-3 text-[10px] text-slate-400 font-mono">
                {goal.length}/90
              </span>
            </div>
          </div>

          {/* Quick Choice Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Gợi ý mục tiêu nhanh:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_GOALS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = goal === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setGoal(preset.label)}
                    className={`p-2.5 min-h-[40px] sm:min-h-0 rounded-xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !goal.trim()}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang vào phòng...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Điểm danh & Vào phòng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
