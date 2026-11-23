import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Target,
  Video,
  Clock,
  Crown,
  Sparkles,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export const STUDY_ONBOARDING_STORAGE_KEY = 'study_lobby_onboarding_seen_v1';

interface StudyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudyOnboardingModal({ isOpen, onClose }: StudyOnboardingModalProps) {
  useBodyScrollLock(isOpen);

  // ESC key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STUDY_ONBOARDING_STORAGE_KEY, 'true');
    } catch {}
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glows */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title="Đóng hướng dẫn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Modal Header */}
        <div className="space-y-2 text-center sm:text-left pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hướng Dẫn Cho Thành Viên Mới</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Chào mừng đến với Không Gian Học Tập Chung!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            4 quy tắc nhỏ giúp bạn tập trung hiệu quả và ghi nhận thành tích chuẩn xác:
          </p>
        </div>

        {/* 2. Main Content: Bento Grid 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Điểm danh Mục tiêu (Blue) */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-blue-500/10 via-sky-500/5 to-transparent border border-blue-200/80 dark:border-blue-900/50 space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>1. Điểm danh Mục tiêu</span>
                <span className="text-blue-500 text-xs select-none">🎯</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Đặt mục tiêu ngắn gọn khi bước vào phòng để tạo cam kết tập trung cùng mọi người.
              </p>
            </div>
          </div>

          {/* Card 2: Học cùng Google Meet (Green) */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-900/50 space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>2. Học cùng Google Meet</span>
                <span className="text-emerald-500 text-xs select-none">🎥</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Mở cửa sổ nổi Google Meet để bật cam/mic học nhóm. Khi đóng cửa sổ Meet, trạng thái của bạn sẽ tự chuyển về Tự học.
              </p>
            </div>
          </div>

          {/* Card 3: Quy tắc Tính giờ (Purple) */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200/80 dark:border-purple-900/50 space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>3. Quy tắc Tính giờ (Tối thiểu 5 phút)</span>
                <span className="text-purple-500 text-xs select-none">⏱️</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Thời gian học được tự động cộng dồn vào hồ sơ ngay khi bạn rời phòng (áp dụng cho ca học từ 5 phút trở lên, tối đa 6 tiếng/ca).
              </p>
            </div>
          </div>

          {/* Card 4: Đua Top & Săn Vương Miện (Amber/Gold) */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-300/80 dark:border-amber-700/50 space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Crown className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>4. Đua Top & Săn Vương Miện</span>
                <span className="text-amber-500 text-xs select-none">👑</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Bảng xếp hạng tuần làm mới vào 00:00 sáng Thứ Hai. Top 1 mỗi tuần sẽ nhận huy hiệu Vương miện (👑) vĩnh viễn bên cạnh tên!
              </p>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer: Full-Width Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Đã hiểu, Bắt đầu học ngay!</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
