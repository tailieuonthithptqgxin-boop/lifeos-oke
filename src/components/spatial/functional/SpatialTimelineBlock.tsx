import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, X, Check } from 'lucide-react';
import { Task } from '../../../lib/types';
import { normalizeTaskStatus } from '../../TasksView';
import { soundEngine } from '../../../lib/soundEngine';

export interface SpatialTimelineBlockProps {
  key?: React.Key;
  hour: string;
  isCurrentHour?: boolean;
  tasks: Task[];
  onDropTask: (taskId: string, hour: string) => Promise<void>;
  onSlotClick: (hour: string) => void;
  onTaskClick: (task: Task) => void;
  onToggleStatus: (task: Task, e: React.MouseEvent) => void;
  onRemoveFromSlot: (taskId: string, e: React.MouseEvent) => void;
}

export function SpatialTimelineBlock({
  hour,
  isCurrentHour = false,
  tasks,
  onDropTask,
  onSlotClick,
  onTaskClick,
  onToggleStatus,
  onRemoveFromSlot,
}: SpatialTimelineBlockProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      soundEngine.playPop();
      await onDropTask(taskId, hour);
    }
  };

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSlotClick(hour);
        }
      }}
      animate={{
        scale: isDragOver ? 1.015 : 1,
      }}
      style={{ perspective: '800px' }}
      className={`group relative flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md select-none ${
        isDragOver
          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/30'
          : isCurrentHour
            ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30 shadow-xs'
            : 'border-slate-200/60 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] bg-white/60 dark:bg-[#0B1120]/60'
      }`}
    >
      {/* Hour Label Coordinate */}
      <div className="w-14 shrink-0 flex items-center gap-1.5 pt-1 select-none pointer-events-none">
        {isCurrentHour && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        )}
        <span className={`text-xs font-mono font-bold tracking-tight ${
          isCurrentHour ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
        }`}>
          {hour}
        </span>
      </div>

      {/* Task Objects Area */}
      <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[38px]">
        {tasks.map(t => {
          const isDone = normalizeTaskStatus(t.status) === 'Hoàn thành';
          const pPriority = (t.priority as string) || 'Bình thường';

          return (
            <motion.div
              key={t.id}
              whileHover={{ scale: 1.03, zIndex: 20 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick(t);
              }}
              style={{
                transformStyle: 'preserve-3d',
              }}
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 cursor-pointer shadow-xs transition-all ${
                isDone
                  ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-400 line-through border-slate-200/50 dark:border-white/[0.04]'
                  : pPriority === 'Cao' || pPriority === 'Khẩn cấp' || pPriority === 'High' || pPriority === 'Urgent'
                    ? 'bg-white dark:bg-[#141E30] border-l-4 border-l-rose-500 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white shadow-rose-500/5'
                    : pPriority === 'Trung bình' || pPriority === 'Medium'
                      ? 'bg-white dark:bg-[#141E30] border-l-4 border-l-amber-500 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-[#141E30] border-l-4 border-l-emerald-500 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(t, e);
                }}
                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  isDone 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                }`}
              >
                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>

              <span className="text-xs font-semibold truncate max-w-[180px] sm:max-w-[280px]">
                {t.title}
              </span>

              {t.estimatedHours ? (
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {t.estimatedHours}h
                </span>
              ) : null}

              <button
                type="button"
                onClick={(e) => onRemoveFromSlot(t.id, e)}
                title="Bỏ xếp giờ (trả về khay)"
                className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}

        {tasks.length === 0 && (
          <span 
            onClick={() => onSlotClick(hour)}
            className="text-[11px] text-slate-400/60 dark:text-slate-500/60 hover:text-emerald-500 dark:hover:text-emerald-400 italic select-none py-1 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Kéo thả hoặc nhấp để lên lịch giờ này
          </span>
        )}
      </div>
    </motion.div>
  );
}
export default SpatialTimelineBlock;
