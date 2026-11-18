import React, { useState, useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { 
  CompanionSettings, 
  MASCOT_PROFILES, 
  COMPANION_ACCESSORIES, 
  CompanionMascotId,
  CompanionFocusMode
} from '../../lib/companionEngine';
import { retentionEngine } from '../../lib/retentionEngine';
import { 
  X, Sparkles, Volume2, VolumeX, Eye, EyeOff, 
  Award, Sliders, Check, Moon, BellOff, MessageSquare
} from 'lucide-react';
import { LiveMascotCharacter } from './LiveMascotCharacter';

interface CompanionSettingsModalProps {
  settings: CompanionSettings;
  onSave: (updated: Partial<CompanionSettings>) => void;
  onClose: () => void;
  userId?: string;
}

export const CompanionSettingsModal: React.FC<CompanionSettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  userId
}) => {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!(true)) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [true, onClose]);

  const retentionProfile = retentionEngine.getProfile(userId);
  const userLevel = retentionProfile.level || 1;

  // Local state for 0ms tactile responsiveness
  const [localSettings, setLocalSettings] = useState<CompanionSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleUpdate = (updated: Partial<CompanionSettings>) => {
    setLocalSettings(prev => {
      const next = { ...prev, ...updated };
      return next;
    });
    onSave(updated);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeMascot = MASCOT_PROFILES[localSettings.mascotId] || MASCOT_PROFILES.lumi;
  const activeAccessory = COMPANION_ACCESSORIES.find(a => a.id === (localSettings.equippedAccessoryId || 'none'));

  const handleFinish = () => {
    onSave(localSettings);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Cài Đặt Bạn Đồng Hành (AI Companion)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy biến nhân vật, trang bị phụ kiện và chế độ nhắc nhở
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Switch */}
        <div 
          onClick={() => handleUpdate({ enabled: !localSettings.enabled })}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
        >
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">
              Bật nhân vật đồng hành
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hiển thị nhân vật sống động trong Focus Mode, học từ vựng và toàn hệ thống.
            </span>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${localSettings.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${localSettings.enabled ? 'left-5' : 'left-0.5'}`} />
          </div>
        </div>

        {localSettings.enabled && (
          <div className="space-y-5 text-xs">
            
            {/* Real-time Mascot Live Preview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-emerald-50/60 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 border border-amber-200/60 dark:border-slate-700/60 flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
                <LiveMascotCharacter
                  mood="idle"
                  mascotId={localSettings.mascotId}
                  equippedAccessoryId={localSettings.equippedAccessoryId}
                  size="compact"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {activeMascot.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                    {activeMascot.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {activeMascot.description}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Trang bị:</span>
                  <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    <span>{activeAccessory?.icon || '✨'}</span>
                    <span>{activeAccessory?.name || 'Mặc định'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Mascot Selection */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                Chọn nhân vật đồng hành yêu thích:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  MASCOT_PROFILES.lumi,
                  MASCOT_PROFILES.bunny,
                  MASCOT_PROFILES.cat,
                  MASCOT_PROFILES.bear,
                  MASCOT_PROFILES.fox,
                  MASCOT_PROFILES.panda
                ].map(m => {
                  const isSelected = localSettings.mascotId === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleUpdate({ mascotId: m.id as CompanionMascotId })}
                      className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer select-none ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{m.avatar}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="font-black text-slate-900 dark:text-white block text-xs">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 block">
                          {m.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipped Accessory (Level Unlockable) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                  Phụ kiện trang trí (Mở khóa theo Level):
                </label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  Level hiện tại: {userLevel}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {COMPANION_ACCESSORIES.map(acc => {
                  const isLocked = userLevel < acc.requiredLevel;
                  const isEquipped = (localSettings.equippedAccessoryId || 'none') === acc.id;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleUpdate({ equippedAccessoryId: acc.id })}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all select-none ${
                        isEquipped
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30'
                          : isLocked
                          ? 'border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      <span className="text-base">{acc.icon}</span>
                      <span>{acc.name}</span>
                      {isLocked && <span className="text-[9px] text-slate-400">(Lv.{acc.requiredLevel})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focus Mode Behavior (Normal, Quiet, Minimal, Off) */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                Chế độ tương tác trong Focus Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'normal',
                    title: 'Tiêu chuẩn',
                    desc: 'Cổ vũ 2–3 phút/lần',
                    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  },
                  {
                    id: 'quiet',
                    title: 'Yên tĩnh',
                    desc: 'Thưa hơn, không âm thanh',
                    icon: <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  },
                  {
                    id: 'minimal',
                    title: 'Tối giản',
                    desc: 'Chỉ cử động nền nhẹ',
                    icon: <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  },
                  {
                    id: 'off',
                    title: 'Tạm ẩn',
                    desc: 'Ẩn hoàn toàn trong phiên',
                    icon: <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                  }
                ].map(item => {
                  const isSelected = (localSettings.focusCompanionMode || 'normal') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleUpdate({ 
                        focusCompanionMode: item.id as CompanionFocusMode,
                        quietMode: item.id === 'quiet'
                      })}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 select-none ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        {isSelected && (
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles: Speech Bubble & Sound (Entire Row Clickable) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div 
                onClick={() => handleUpdate({ showSpeechBubble: !localSettings.showSpeechBubble })}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors select-none"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                    Bong bóng lời thoại động lực
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hiển thị các câu cổ vũ ngắn gọn, sâu sắc sau mỗi chu kỳ 2–3 phút.
                  </span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${localSettings.showSpeechBubble ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${localSettings.showSpeechBubble ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              <div 
                onClick={() => handleUpdate({ soundEnabled: !localSettings.soundEnabled })}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors select-none"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                    Âm thanh động viên
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mặc định tắt để tránh gây phân tâm. Bật nếu muốn nghe hiệu ứng pop nhẹ khi có lời nhắn.
                  </span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${localSettings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${localSettings.soundEnabled ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>

            {/* Position Choice */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                Vị trí hiển thị trên màn hình:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bottom-right', label: 'Góc Dưới Phải (Mặc định)' },
                  { id: 'bottom-left', label: 'Góc Dưới Trái' }
                ].map(pos => {
                  const isSelected = localSettings.position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handleUpdate({ position: pos.id as any })}
                      className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-semibold text-xs select-none ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleFinish}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
              isSaved 
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-95'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : null}
            <span>{isSaved ? 'Đã lưu cài đặt!' : 'Hoàn tất & Đóng'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanionSettingsModal;
