import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, RotateCcw, X, Eye, Sparkles } from 'lucide-react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface DevicePreviewDockProps {
  deviceMode: DeviceMode;
  onSelectMode: (mode: DeviceMode) => void;
  orientation: 'portrait' | 'landscape';
  onToggleOrientation: () => void;
}

export function DevicePreviewDock({
  deviceMode,
  onSelectMode,
  orientation,
  onToggleOrientation
}: DevicePreviewDockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      aria-label="Thanh xem trước thiết bị"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end pointer-events-auto select-none"
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer group"
          title="Mở thanh xem trước 3 thiết bị (Mobile/Tablet/PC)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Xem Trước 3 Thiết Bị</span>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase">
            {deviceMode === 'mobile' ? 'Mobile' : deviceMode === 'tablet' ? 'Tablet' : 'PC'}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-2xl border border-white/15 shadow-2xl ring-1 ring-black/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-2 py-1 flex items-center gap-1.5 text-slate-400 border-r border-white/10 text-[11px] font-bold">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Khung nhìn:</span>
          </div>

          {/* 1. Mobile (390px) */}
          <button
            type="button"
            onClick={() => onSelectMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deviceMode === 'mobile'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Chuyển sang khung xem Điện thoại (390px - iPhone)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Điện thoại</span>
            <span className="text-[10px] opacity-75 font-mono">(390px)</span>
          </button>

          {/* 2. Tablet (820px) */}
          <button
            type="button"
            onClick={() => onSelectMode('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deviceMode === 'tablet'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Chuyển sang khung xem Máy tính bảng (820px - iPad)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
            <span className="text-[10px] opacity-75 font-mono">(820px)</span>
          </button>

          {/* 3. Desktop / Laptop (100%) */}
          <button
            type="button"
            onClick={() => onSelectMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deviceMode === 'desktop'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Xem giao diện toàn màn hình Laptop & PC (100% chuẩn)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Laptop</span>
            <span className="text-[10px] opacity-75 font-mono">(Chuẩn)</span>
          </button>

          {/* Orientation switch for simulated mobile/tablet */}
          {deviceMode !== 'desktop' && (
            <button
              type="button"
              onClick={onToggleOrientation}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-l border-white/10"
              title={`Xoay màn hình: Hiện tại ${orientation === 'portrait' ? 'Dọc (Portrait)' : 'Ngang (Landscape)'}`}
            >
              <RotateCcw className={`w-3.5 h-3.5 transition-transform ${orientation === 'landscape' ? 'rotate-90 text-amber-400' : ''}`} />
            </button>
          )}

          {/* Minimize / Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
            title="Thu nhỏ thanh công cụ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
