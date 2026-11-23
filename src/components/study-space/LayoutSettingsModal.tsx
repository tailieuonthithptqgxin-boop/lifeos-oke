import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  LayoutGrid,
  Maximize2,
  Columns2,
  Sliders,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import type { MeetLayoutMode } from './useMeetGridLayout';

export interface LayoutSettings {
  mode: MeetLayoutMode;
  maxTiles: number; // 6, 9, 16, 30, 49
  hideSelf: boolean;
}

export interface LayoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: LayoutSettings;
  onSaveSettings: (settings: LayoutSettings) => void;
}

export const TILE_LIMIT_PRESETS = [6, 9, 16, 30, 49] as const;

export const STORAGE_KEYS = {
  MODE: 'lifeos_meet_layout_mode',
  MAX_TILES: 'lifeos_meet_max_tiles',
  HIDE_SELF: 'lifeos_meet_hide_self',
};

export function loadSavedLayoutSettings(): LayoutSettings {
  try {
    const savedMode = (localStorage.getItem(STORAGE_KEYS.MODE) as MeetLayoutMode) || 'auto';
    const savedTiles = parseInt(localStorage.getItem(STORAGE_KEYS.MAX_TILES) || '16', 10);
    const savedHideSelf = localStorage.getItem(STORAGE_KEYS.HIDE_SELF) === 'true';

    const validTiles = TILE_LIMIT_PRESETS.includes(savedTiles as any) ? savedTiles : 16;
    const validMode: MeetLayoutMode = ['auto', 'tiled', 'spotlight', 'sidebar'].includes(savedMode)
      ? savedMode
      : 'auto';

    return {
      mode: validMode,
      maxTiles: validTiles,
      hideSelf: savedHideSelf,
    };
  } catch {
    return { mode: 'auto', maxTiles: 16, hideSelf: false };
  }
}

export const LayoutSettingsModal = React.memo(function LayoutSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
}: LayoutSettingsModalProps) {
  const [mode, setMode] = useState<MeetLayoutMode>(currentSettings.mode);
  const [maxTiles, setMaxTiles] = useState<number>(currentSettings.maxTiles);
  const [hideSelf, setHideSelf] = useState<boolean>(currentSettings.hideSelf);

  useEffect(() => {
    if (isOpen) {
      setMode(currentSettings.mode);
      setMaxTiles(currentSettings.maxTiles);
      setHideSelf(currentSettings.hideSelf);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const applyModeChange = (newMode: MeetLayoutMode) => {
    setMode(newMode);
    const updated: LayoutSettings = { mode: newMode, maxTiles, hideSelf };
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, newMode);
      localStorage.setItem(STORAGE_KEYS.MAX_TILES, maxTiles.toString());
      localStorage.setItem(STORAGE_KEYS.HIDE_SELF, hideSelf.toString());
    } catch {}
    onSaveSettings(updated);
  };

  const applyMaxTilesChange = (newMax: number) => {
    setMaxTiles(newMax);
    const updated: LayoutSettings = { mode, maxTiles: newMax, hideSelf };
    try {
      localStorage.setItem(STORAGE_KEYS.MAX_TILES, newMax.toString());
    } catch {}
    onSaveSettings(updated);
  };

  const applyHideSelfChange = (newHide: boolean) => {
    setHideSelf(newHide);
    const updated: LayoutSettings = { mode, maxTiles, hideSelf: newHide };
    try {
      localStorage.setItem(STORAGE_KEYS.HIDE_SELF, newHide.toString());
    } catch {}
    onSaveSettings(updated);
  };

  const handleApply = () => {
    const updated: LayoutSettings = { mode, maxTiles, hideSelf };
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
      localStorage.setItem(STORAGE_KEYS.MAX_TILES, maxTiles.toString());
      localStorage.setItem(STORAGE_KEYS.HIDE_SELF, hideSelf.toString());
    } catch {}
    onSaveSettings(updated);
    onClose();
  };

  const layoutCards: Array<{
    id: MeetLayoutMode;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'auto',
      title: 'Tự động (Auto)',
      description: 'Tự động tính toán số cột và hàng tối ưu theo kích thước màn hình.',
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'tiled',
      title: 'Xếp kề (Tiled)',
      description: 'Lưới đều nhau, giới hạn số ô trên màn hình theo thanh trượt.',
      icon: <LayoutGrid className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'spotlight',
      title: 'Tiêu điểm (Spotlight)',
      description: 'Phóng to đồng hồ Pomodoro hoặc học viên được ghim lên toàn khung.',
      icon: <Maximize2 className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'sidebar',
      title: 'Thanh bên (Sidebar)',
      description: 'Nội dung chính chiếm 75% bên trái, thành viên xếp cột dọc 25% bên phải.',
      icon: <Columns2 className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col gap-5 text-white"
        style={{ backgroundColor: '#202124' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Thay đổi bố cục (Change Layout)</h3>
              <p className="text-xs text-slate-400">Chuẩn bố cục thông minh phong cách Google Meet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Layout Mode 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {layoutCards.map((card) => {
            const isSelected = mode === card.id;
            return (
              <div
                key={card.id}
                onClick={() => applyModeChange(card.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                    : 'bg-[#3c4043]/60 border-white/5 hover:border-white/20 hover:bg-[#3c4043]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {card.icon}
                    <span className="font-bold text-xs">{card.title}</span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* 2. Slider: Max Tiles limit (6, 9, 16, 30, 49) */}
        {(mode === 'tiled' || mode === 'auto') && (
          <div className="p-4 rounded-2xl bg-[#3c4043]/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Số ô tối đa hiển thị cùng lúc:</span>
              <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/40">
                {maxTiles} ô
              </span>
            </div>

            {/* Range Slider Snap Points */}
            <div className="relative pt-1 pb-4">
              <input
                type="range"
                min="0"
                max={TILE_LIMIT_PRESETS.length - 1}
                step="1"
                value={TILE_LIMIT_PRESETS.indexOf(maxTiles as any) >= 0 ? TILE_LIMIT_PRESETS.indexOf(maxTiles as any) : 2}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  applyMaxTilesChange(TILE_LIMIT_PRESETS[idx]);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
              />

              {/* Tick Marks */}
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1 px-1">
                {TILE_LIMIT_PRESETS.map((count) => (
                  <span
                    key={count}
                    onClick={() => applyMaxTilesChange(count)}
                    className={`cursor-pointer transition-colors ${
                      maxTiles === count ? 'text-cyan-400 font-extrabold scale-110' : 'hover:text-white'
                    }`}
                  >
                    {count}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              {maxTiles <= 9
                ? '• Khung hình lớn, quan sát chi tiết mục tiêu của nhóm nhỏ.'
                : maxTiles <= 16
                ? '• Cấu hình chuẩn cân bằng tốt nhất giữa độ rõ nét và số lượng học viên.'
                : '• Xem toàn cảnh thư viện đông học viên (100+ người).'
              }
            </p>
          </div>
        )}

        {/* 3. Hide Self Video Toggle */}
        <div
          onClick={() => applyHideSelfChange(!hideSelf)}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#3c4043]/30 border border-white/5 hover:border-white/10 cursor-pointer transition"
        >
          <div className="flex items-center gap-2.5">
            {hideSelf ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
            <div>
              <span className="text-xs font-bold block">Ẩn ô của bản thân</span>
              <span className="text-[11px] text-slate-400">Giảm xao nhãng và mỏi mắt khi học thời gian dài</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={hideSelf}
            onChange={(e) => applyHideSelfChange(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition cursor-pointer active:scale-95"
          >
            Áp dụng bố cục
          </button>
        </div>
      </div>
    </div>
  );
});
