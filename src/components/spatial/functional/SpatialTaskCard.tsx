import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, Clock, Calendar, AlertCircle, GripVertical, MoreHorizontal, Trash2, Edit3, Sparkles } from 'lucide-react';
import { Task, Priority } from '../../../lib/types';
import { normalizeTaskStatus } from '../../TasksView';
import { soundEngine } from '../../../lib/soundEngine';

export interface SpatialTaskCardProps {
  task: Task;
  onToggleStatus: (task: Task, e: React.MouseEvent) => void;
  onClick?: (task: Task) => void;
  onDelete?: (taskId: string, e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  className?: string;
  compact?: boolean;
}

export function SpatialTaskCard({
  task,
  onToggleStatus,
  onClick,
  onDelete,
  draggable = true,
  onDragStart,
  className = '',
  compact = false
}: SpatialTaskCardProps) {
  const isDone = normalizeTaskStatus(task.status) === 'Hoàn thành';
  const isInProgress = normalizeTaskStatus(task.status) === 'Đang làm';
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Depth by Priority
  const priorityZ = {
    'Cao': 20,
    'Khẩn cấp': 24,
    'Trung bình': 12,
    'Bình thường': 12,
    'Thấp': 6
  }[task.priority || 'Bình thường'] || 10;

  const priorityColor = {
    'Cao': 'border-l-rose-500 text-rose-500 bg-rose-500/10',
    'Khẩn cấp': 'border-l-red-500 text-red-500 bg-red-500/10',
    'Trung bình': 'border-l-amber-500 text-amber-500 bg-amber-500/10',
    'Bình thường': 'border-l-blue-500 text-blue-500 bg-blue-500/10',
    'Thấp': 'border-l-slate-400 text-slate-400 bg-slate-500/10'
  }[task.priority || 'Bình thường'] || 'border-l-slate-400 text-slate-400 bg-slate-500/10';

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 25 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);

  const [isHovered, setIsHovered] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playPop();
    if (!isDone) {
      window.dispatchEvent(new CustomEvent('lifeos:task-completed', { detail: { taskId: task.id } }));
    }
    onToggleStatus(task, e);
  };

  return (
    <div 
      style={{ perspective: '800px' }}
      className={`w-full min-w-0 transition-transform select-none ${className}`}
    >
      <motion.div
        ref={cardRef}
        draggable={draggable}
        onDragStart={(e: any) => {
          if (onDragStart) {
            onDragStart(e, task);
          } else {
            e.dataTransfer.setData('taskId', task.id);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsPressing(true)}
        onMouseUp={() => setIsPressing(false)}
        onClick={() => onClick && onClick(task)}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isPressing ? 0.98 : isHovered ? 1.015 : 1,
          translateZ: isHovered ? priorityZ + 6 : 0,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`group relative rounded-2xl border transition-all cursor-grab active:cursor-grabbing backdrop-blur-md overflow-hidden ${
          isDone
            ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/[0.04] opacity-65'
            : isInProgress
              ? 'bg-white/95 dark:bg-[#0E1726] border-blue-500/40 dark:border-blue-500/30 shadow-md shadow-blue-500/5'
              : 'bg-white/95 dark:bg-[#0B1120] border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5'
        } ${compact ? 'p-2.5' : 'p-3.5 sm:p-4'}`}
      >
        {/* Priority 3D Color Ridge */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            (task.priority as string) === 'Cao' || (task.priority as string) === 'Khẩn cấp' || task.priority === 'High' || task.priority === 'Urgent'
              ? 'bg-rose-500' 
              : (task.priority as string) === 'Trung bình' || task.priority === 'Medium'
                ? 'bg-amber-500' 
                : 'bg-emerald-500'
          }`} 
        />

        {/* Ambient Top Glow Layer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />

        <div 
          className="relative z-10 flex items-start gap-3"
          style={{ transform: `translateZ(${priorityZ}px)`, transformStyle: 'preserve-3d' }}
        >
          {/* 3D Checkbox */}
          <button
            type="button"
            onClick={handleCheckClick}
            aria-label={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
              isDone
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/50 scale-105'
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:scale-110 bg-slate-50/50 dark:bg-slate-800/50'
            }`}
          >
            {isDone && <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-75 duration-150" />}
          </button>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 transition-colors ${
                isDone 
                  ? 'line-through text-slate-400 dark:text-slate-500' 
                  : 'text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              }`}>
                {task.title}
              </h4>

              {/* Priority Pill */}
              {task.priority && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border border-current/20 ${priorityColor}`}>
                  {task.priority}
                </span>
              )}
            </div>

            {/* Badges: Time, Due Date, Est Hours */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {task.timeSlot && (
                <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3" />
                  {task.timeSlot}
                </span>
              )}

              {task.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {task.dueDate}
                </span>
              )}

              {task.estimatedHours ? (
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {task.estimatedHours}h
                </span>
              ) : null}

              {(task as any).category && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">
                  {(task as any).category}
                </span>
              )}
            </div>
          </div>

          {/* Hover Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playPop();
                  onDelete(task.id, e);
                }}
                className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Xóa công việc"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="text-slate-400 p-0.5">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
export default SpatialTaskCard;
