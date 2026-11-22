import React, { useState } from 'react';
import { X, Crown, Settings, Clock, Sparkles, MessageSquare, Shield, Check } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface RoomSettingsData {
  name: string;
  topic: string;
  focusDuration: number; // in seconds
  breakDuration: number; // in seconds
  chatMode?: 'break_only' | 'open' | 'disabled';
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: RoomSettingsData;
  onSave: (newSettings: RoomSettingsData) => void;
  isLight?: boolean;
}

const FOCUS_PRESETS = [
  { label: '15 phút', value: 15 * 60 },
  { label: '25 phút (Chuẩn)', value: 25 * 60 },
  { label: '45 phút', value: 45 * 60 },
  { label: '50 phút (Sâu)', value: 50 * 60 },
  { label: '60 phút', value: 60 * 60 },
];

const BREAK_PRESETS = [
  { label: '5 phút', value: 5 * 60 },
  { label: '10 phút', value: 10 * 60 },
  { label: '15 phút', value: 15 * 60 },
];

export const RoomSettingsModal = React.memo(function RoomSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  isLight = false,
}: RoomSettingsModalProps) {
  useBodyScrollLock(isOpen);

  const [name, setName] = useState(currentSettings.name || '');
  const [topic, setTopic] = useState(currentSettings.topic || '');
  const [focusDuration, setFocusDuration] = useState(currentSettings.focusDuration || 25 * 60);
  const [breakDuration, setBreakDuration] = useState(currentSettings.breakDuration || 5 * 60);
  const [chatMode, setChatMode] = useState<'break_only' | 'open' | 'disabled'>(
    currentSettings.chatMode || 'break_only'
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      topic: topic.trim(),
      focusDuration,
      breakDuration,
      chatMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 relative flex flex-col gap-5 animate-in zoom-in-95 duration-150 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#202124] border-white/10 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Crown className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>Cài Đặt Phòng Học</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  CHỦ PHÒNG
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Thay đổi thiết lập chu kỳ Pomodoro và quản lý phòng học
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Tên phòng */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Tên phòng học:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-amber-400 transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white/5 border-white/10 text-white'
              }`}
              placeholder="VD: 🦉 Hội Cú Đêm Cày Deadline"
              required
            />
          </div>

          {/* Chủ đề */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Chủ đề học tập:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-amber-400 transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-white/5 border-white/10 text-white'
              }`}
              placeholder="VD: Cú Đêm & Kỷ Luật"
            />
          </div>

          {/* Pomodoro Focus Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Thời gian Tập trung (Focus Duration):</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {FOCUS_PRESETS.map((p) => {
                const isSelected = focusDuration === p.value;
                return (
                  <button
                    key={`focus-${p.value}`}
                    type="button"
                    onClick={() => setFocusDuration(p.value)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Break Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Thời gian Nghỉ ngơi (Break Duration):</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BREAK_PRESETS.map((p) => {
                const isSelected = breakDuration === p.value;
                return (
                  <button
                    key={`break-${p.value}`}
                    type="button"
                    onClick={() => setBreakDuration(p.value)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-xs'
                        : isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chế độ Chat & Chống phá phòng */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chế độ Trò chuyện & Bảo vệ phòng:</span>
            </label>
            <div className="space-y-1.5">
              <label
                className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                  chatMode === 'break_only'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="chatMode"
                  value="break_only"
                  checked={chatMode === 'break_only'}
                  onChange={() => setChatMode('break_only')}
                  className="accent-cyan-500"
                />
                <span>Chỉ cho phép trò chuyện trong giờ nghỉ (Tập trung tối đa)</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                  chatMode === 'open'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="chatMode"
                  value="open"
                  checked={chatMode === 'open'}
                  onChange={() => setChatMode('open')}
                  className="accent-cyan-500"
                />
                <span>Cho phép trò chuyện bất kỳ lúc nào</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                  chatMode === 'disabled'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="chatMode"
                  value="disabled"
                  checked={chatMode === 'disabled'}
                  onChange={() => setChatMode('disabled')}
                  className="accent-cyan-500"
                />
                <span>Khóa khung chat hoàn toàn (Tuyệt đối im lặng, chống spam)</span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'
              }`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Thiết Lập ⚡</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
