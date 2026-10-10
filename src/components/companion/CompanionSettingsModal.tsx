import React from 'react';
import { 
  CompanionSettings, 
  MASCOT_PROFILES, 
  COMPANION_ACCESSORIES, 
  CompanionMascotId 
} from '../../lib/companionEngine';
import { retentionEngine } from '../../lib/retentionEngine';
import { 
  X, Sparkles, Volume2, VolumeX, Eye, EyeOff, 
  ShieldAlert, Award, Sliders, Check 
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Cài Đặt Bạn Đồng Hành (AI Study Companion)
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh nhân vật mascot, tần suất trò chuyện và phụ kiện mở khóa
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
            <span className="text-xs text-slate-500">
              Hiển thị nhân vật trong Focus Mode, học từ vựng và các góc học tập.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={e => onSave({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.enabled && (
          <div className="space-y-6 text-xs">
            {/* Mascot Selection */}
            <div className="space-y-2.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Chọn nhân vật yêu thích:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mascots.map(m => {
                  const isLocked = userLevel < m.unlockedLevel;
                  const isSelected = settings.mascotId === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => onSave({ mascotId: m.id as CompanionMascotId })}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                          : isLocked
                          ? 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{m.avatar}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        {isLocked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 font-bold">
                            Cấp {m.unlockedLevel}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-black text-slate-900 dark:text-white block text-sm">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-2">
                          {m.title}
                        </span>
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
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
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
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
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

            {/* Interaction Frequency */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Mức độ tương tác & trò chuyện:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'minimal', label: 'Tối thiểu', desc: 'Chỉ chào & chúc mừng' },
                  { id: 'moderate', label: 'Vừa phải', desc: 'Khuyên dùng tiêu chuẩn' },
                  { id: 'chatty', label: 'Tương tác nhiều', desc: 'Thường xuyên khích lệ' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSave({ frequency: item.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.frequency === item.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold block text-xs">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles: Quiet mode, Bubble, Sound */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Chế độ yên lặng tuyệt đối (Zen Quiet Mode)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ẩn toàn bộ bong bóng trò chuyện, chỉ giữ mascot chuyển động nhẹ.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.quietMode}
                  onChange={e => onSave({ quietMode: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Bong bóng lời thoại
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hiển thị các câu cổ vũ ngắn gọn khi học bài.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showSpeechBubble}
                  onChange={e => onSave({ showSpeechBubble: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Âm thanh phản hồi tương tác
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Phát tiếng nhẹ nhàng khi hoàn thành phiên hoặc trả lời đúng.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={e => onSave({ soundEnabled: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
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
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
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
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-blue-500/20"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
