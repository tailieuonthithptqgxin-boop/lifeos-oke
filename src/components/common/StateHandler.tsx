import React, { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw, Plus } from 'lucide-react';

interface StateHandlerProps {
  loading?: boolean;
  isLoading?: boolean;
  error?: string | Error | null;
  empty?: boolean;
  isEmpty?: boolean;
  type?: 'cards' | 'list' | 'table' | 'bento';
  onRetry?: () => void;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonType?: 'cards' | 'list' | 'table' | 'bento';
  skeletonCount?: number;
  children: ReactNode;
}

export function StateHandler({
  loading,
  isLoading,
  error,
  empty,
  isEmpty,
  type,
  onRetry,
  onEmptyAction,
  emptyActionLabel,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Bắt đầu khởi tạo bản ghi đầu tiên để trải nghiệm trọn vẹn không gian làm việc.',
  skeletonType = 'cards',
  skeletonCount = 3,
  children
}: StateHandlerProps) {
  const isCurrentlyLoading = loading ?? isLoading ?? false;
  const isCurrentlyEmpty = empty ?? isEmpty ?? false;
  const activeSkeletonType = (type as any) || skeletonType || 'cards';

  // 1. SKELETON LOADING STATE
  if (isCurrentlyLoading) {
    if (activeSkeletonType === 'bento') {
      return (
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="col-span-1 md:col-span-2 h-48 bg-slate-200/80 dark:bg-slate-800/60 rounded-3xl" />
          <div className="col-span-1 h-48 bg-slate-200/80 dark:bg-slate-800/60 rounded-3xl" />
          <div className="col-span-1 h-36 bg-slate-200/80 dark:bg-slate-800/60 rounded-3xl" />
          <div className="col-span-1 md:col-span-2 h-36 bg-slate-200/80 dark:bg-slate-800/60 rounded-3xl" />
        </div>
      );
    }

    if (activeSkeletonType === 'list') {
      return (
        <div className="w-full space-y-3 animate-pulse">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="w-full h-18 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-3/4">
                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-2/5" />
                  <div className="h-3 bg-slate-200/60 dark:bg-slate-700/60 rounded-md w-3/5" />
                </div>
              </div>
              <div className="w-16 h-7 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      );
    }

    if (activeSkeletonType === 'table') {
      return (
        <div className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800" />
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/40 flex items-center px-4 gap-4"
            >
              <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-1/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      );
    }

    // Default: Bento Card Grid Skeleton
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="h-44 bg-slate-100 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="h-4 w-3/5 bg-slate-200/60 dark:bg-slate-700/60 rounded" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800/60">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    const errorMsg = typeof error === 'string' ? error : error?.message || 'Không thể nạp dữ liệu lúc này.';
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          Lỗi kết nối dữ liệu
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
          {errorMsg}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-medium transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử tải lại</span>
          </button>
        )}
      </div>
    );
  }

  // 3. EMPTY STATE
  if (isCurrentlyEmpty) {
    return (
      <div className="w-full py-14 px-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-98 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <Inbox className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
          {emptyTitle}
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          {emptyDescription}
        </p>
        {onEmptyAction && emptyActionLabel && (
          <button
            type="button"
            onClick={onEmptyAction}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{emptyActionLabel}</span>
          </button>
        )}
      </div>
    );
  }

  // 4. SUCCESS / CONTENT STATE
  return <>{children}</>;
}
