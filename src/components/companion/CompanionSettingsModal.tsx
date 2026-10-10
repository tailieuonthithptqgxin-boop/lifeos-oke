import React from 'react';
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
  const retentionProfile = retentionEngine.getProfile(userId);
  const userLevel = retentionProfile.level || 1;

  const mascots = Object.values(MASCOT_PROFILES);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Cài Đặt Bạn Đồng Hành (AI Study Companion)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tùy chỉnh nhân vật Bé Sao Nhỏ Lumi, tần suất nhắc nhở và chế độ tập trung
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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">
              Bật nhân vật đồng hành
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hiển thị nhân vật sống động liên tục trong Focus Mode, học từ vựng và toàn bộ hệ thống.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={e => onSave({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {settings.enabled && (
          <div className="space-y-6 text-xs">
            {/* Focus Mode Behavior (Normal, Quiet, Minimal, Off) */}
            <div className="space-y-2.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Chế độ tương tác trong Focus Mode:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'normal',
                    title: 'Tiêu chuẩn (Normal)',
                    desc: 'Động viên khoảng 2–3 phút/lần với câu truyền cảm hứng',
                    icon: <Sparkles className="w-4 h-4 text-amber-500" />
                  },
                  {
                    id: 'quiet',
                    title: 'Yên tĩnh (Quiet)',
                    desc: 'Động viên thưa hơn (6-8p), không âm thanh, giữ tĩnh tâm',
                    icon: <Moon className="w-4 h-4 text-indigo-500" />
                  },
                  {
                    id: 'minimal',
                    title: 'Tối giản (Minimal)',
                    desc: 'Chỉ cử động nền nhẹ, chỉ phản ứng khi có sự kiện quan trọng',
                    icon: <Eye className="w-4 h-4 text-emerald-500" />
                  },
                  {
                    id: 'off',
                    title: 'Tạm ẩn (Off)',
                    desc: 'Ẩn hoàn toàn bạn đồng hành trong phiên làm việc',
                    icon: <EyeOff className="w-4 h-4 text-rose-500" />
                  }
                ].map(item => {
                  const isSelected = (settings.focusCompanionMode || 'normal') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSave({ 
                        focusCompanionMode: item.id as CompanionFocusMode,
                        quietMode: item.id === 'quiet'
                      })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mascot Selection */}
            <div className="space-y-2.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Chọn nhân vật đồng hành yêu thích:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  MASCOT_PROFILES.lumi,
                  MASCOT_PROFILES.bunny,
                  MASCOT_PROFILES.cat,
                  MASCOT_PROFILES.bear,
                  MASCOT_PROFILES.fox,
                  MASCOT_PROFILES.panda
                ].map(m => {
                  const isSelected = settings.mascotId === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSave({ mascotId: m.id as CompanionMascotId })}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl sm:text-3xl">{m.avatar}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-black text-slate-900 dark:text-white block text-xs sm:text-sm">
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 block">
                          {m.title}
                        </span>
                        {m.badge && (
                          <span className="mt-1 inline-block px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-medium truncate max-w-full">
                            {m.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipped Accessory (Level Unlockable) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Phụ kiện trang trí (Mở khóa theo Level):
                </label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  Level hiện tại: {userLevel}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {COMPANION_ACCESSORIES.map(acc => {
                  const isLocked = userLevel < acc.requiredLevel;
                  const isEquipped = (settings.equippedAccessoryId || 'none') === acc.id;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => onSave({ equippedAccessoryId: acc.id })}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEquipped
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          : isLocked
                          ? 'border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{acc.icon}</span>
                      <span>{acc.name}</span>
                      {isLocked && <span className="text-[9px] text-slate-400">(Lv.{acc.requiredLevel})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles: Speech Bubble & Sound */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Bong bóng lời thoại động lực
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hiển thị các câu cổ vũ ngắn gọn, sâu sắc sau mỗi chu kỳ 2–3 phút.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showSpeechBubble}
                  onChange={e => onSave({ showSpeechBubble: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Âm thanh động viên
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mặc định tắt để tránh gây phân tâm. Bật nếu muốn nghe hiệu ứng pop nhẹ khi có lời nhắn.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={e => onSave({ soundEnabled: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Position Choice */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Vị trí hiển thị trên màn hình:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bottom-right', label: 'Góc Dưới Phải (Mặc định)' },
                  { id: 'bottom-left', label: 'Góc Dưới Trái' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onSave({ position: pos.id as any })}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                      settings.position === pos.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
export default CompanionSettingsModal;
